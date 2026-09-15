"use strict";
/** Progressive enhancement only: native scrolling and CSS reflow stay intact. */
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const main = document.querySelector("main");
  const rail = document.querySelector(".page-path");
  const fill = rail.querySelector(".path-progress");
  const links = [...rail.querySelectorAll(".path-link")];
  const sections = links.map((link) =>
    document.getElementById(link.dataset.section),
  );
  const media = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
    el,
    surface: el.closest(".parallax-surface") || el,
    speed: Number(el.dataset.parallax),
    value: 0,
    target: 0,
    visible: false,
  }));
  let railStart = 0,
    railHeight = 1,
    anchors = [],
    current = -1;
  let frame = 0,
    measurePending = true,
    previousTime = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function measurePath() {
    const y = window.scrollY;
    const mainTop = main.getBoundingClientRect().top + y;
    const first = sections[0].getBoundingClientRect();
    railStart = first.top + y + 18;
    const last = sections[sections.length - 1].getBoundingClientRect();
    railHeight = Math.max(1, last.bottom + y - railStart - 20);
    rail.style.top = `${railStart - mainTop}px`;
    rail.style.height = `${railHeight}px`;
    anchors = sections.map((section, index) => {
      const heading =
        section.querySelector(".section-heading") ||
        section.querySelector(".eyebrow") ||
        section;
      const transform = getComputedStyle(heading).transform;
      const translateY =
        transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
      const anchor = heading.getBoundingClientRect().top + y - translateY + 12;
      links[index].parentElement.style.top =
        `${Math.max(0, anchor - railStart)}px`;
      links[index].classList.toggle(
        "is-dark",
        section.classList.contains("dark"),
      );
      return anchor;
    });
    rail.hidden = false;
    measurePending = false;
  }

  function render(time) {
    frame = 0;
    if (measurePending) measurePath();
    const viewport = window.innerHeight;
    const point = window.scrollY + viewport * 0.42;
    const progress = clamp((point - railStart) / railHeight, 0, 1);
    fill.style.transform = `scaleY(${progress})`;
    let active = -1;
    anchors.forEach((anchor, index) => {
      if (anchor <= point) active = index;
    });
    if (current !== active) {
      links.forEach((link, index) => {
        if (index === active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      current = active;
    }
    let moving = false;
    const elapsed = previousTime ? Math.min(64, time - previousTime) : 16;
    const ease = 1 - Math.exp(-elapsed / 90);
    previousTime = time;
    // Read all positions before writing transforms to avoid alternating layout reads/writes.
    media.forEach((item) => {
      if (!item.visible || reducedMotion.matches) return;
      const rect = item.surface.getBoundingClientRect();
      item.target = clamp(
        (viewport / 2 - (rect.top + rect.height / 2)) * item.speed,
        -28,
        28,
      );
    });
    media.forEach((item) => {
      if (reducedMotion.matches) {
        item.el.style.removeProperty("transform");
        item.value = 0;
        return;
      }
      if (!item.visible) return;
      item.value += (item.target - item.value) * ease;
      if (Math.abs(item.target - item.value) < 0.08) item.value = item.target;
      else moving = true;
      item.el.style.transform = `translate3d(0,${item.value.toFixed(2)}px,0)`;
    });
    if (moving) frame = requestAnimationFrame(render);
    else previousTime = 0;
  }
  function schedule(measure = false) {
    if (measure) measurePending = true;
    if (!frame) frame = requestAnimationFrame(render);
  }
  window.addEventListener("scroll", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(true), { passive: true });
  const geometry = new ResizeObserver(() => schedule(true));
  geometry.observe(main);
  sections.forEach((section) => geometry.observe(section));
  const visibility = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        media
          .filter((item) => item.surface === entry.target)
          .forEach((item) => {
            item.visible = entry.isIntersecting;
            if (entry.isIntersecting && !reducedMotion.matches)
              item.el.style.willChange = "transform";
            else item.el.style.removeProperty("will-change");
          });
      });
      schedule();
    },
    { rootMargin: "120px 0px" },
  );
  media.forEach((item) => visibility.observe(item.surface));

  // Reveal once. Content above the fold never starts hidden.
  const candidates = [
    ...document.querySelectorAll(
      ".section-heading, .number-list, .warning, .stats-grid, .advantage-grid article, .mortgage-grid article, .visit-banner, .social-list article",
    ),
  ];
  let revealObserver;
  function configureMotion() {
    document.documentElement.classList.toggle(
      "motion-enabled",
      !reducedMotion.matches,
    );
    revealObserver?.disconnect();
    if (reducedMotion.matches) {
      candidates.forEach((el) => el.classList.remove("is-pending"));
      media.forEach((item) => {
        item.value = 0;
        item.el.style.removeProperty("transform");
        item.el.style.removeProperty("will-change");
      });
      schedule();
      return;
    }
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("is-pending");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px 45px 0px" },
    );
    candidates.forEach((el) => {
      el.classList.add("reveal");
      if (
        !el.dataset.revealRegistered &&
        el.getBoundingClientRect().top > innerHeight + 30
      )
        el.classList.add("is-pending");
      el.dataset.revealRegistered = "true";
      if (el.classList.contains("is-pending")) revealObserver.observe(el);
    });
    schedule();
  }
  configureMotion();
  reducedMotion.addEventListener("change", configureMotion);
  document.fonts.ready.then(() => schedule(true));
  schedule(true);
})();

/** Keep the existing form usable with a short window or the on-screen keyboard. */
(() => {
  const dialog = document.querySelector("#contact-dialog");
  const scroller = dialog.querySelector(".dialog-scroll");
  function fitDialog() {
    if (!dialog.open) return;
    const height = Math.min(
      window.innerHeight,
      window.visualViewport?.height || innerHeight,
    );
    dialog.style.setProperty("--dialog-viewport", `${height}px`);
  }
  new MutationObserver(() => {
    if (dialog.open) {
      fitDialog();
      scroller.scrollTop = 0;
    } else dialog.style.removeProperty("--dialog-viewport");
  }).observe(dialog, { attributes: true, attributeFilter: ["open"] });
  window.visualViewport?.addEventListener("resize", fitDialog, {
    passive: true,
  });
  window.addEventListener("resize", fitDialog, { passive: true });
  scroller.addEventListener("focusin", (event) => {
    if (event.target.matches("input, textarea, button, a")) {
      requestAnimationFrame(() =>
        event.target.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        }),
      );
    }
  });
})();
