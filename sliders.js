"use strict";
/** Source-sized carousels. The viewport gutter remains visible; no native scrollbar. */
(() => {
  const controllers = new Map();
  document.querySelectorAll("[data-carousel]").forEach((track) => {
    const content = track.closest(".container");
    const controls = [
      ...document.querySelectorAll(`[data-target="${track.id}"]`),
    ];
    let index = 0,
      size = 1,
      limit = 0,
      start = 0,
      delta = 0,
      dragging = false,
      suppressClick = false;
    let pointer = null;
    const visibleCards = () =>
      [...track.children].filter((card) => !card.hidden);
    function measure() {
      const cards = visibleCards();
      if (!cards.length) return;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      size = cards[0].getBoundingClientRect().width + gap;
      const shown = Math.max(
        1,
        Math.floor((content.clientWidth + gap + 2) / size),
      );
      limit = Math.max(0, cards.length - shown);
      index = Math.min(index, limit);
      paint();
    }
    function paint() {
      track.style.setProperty("--slide-x", `${-index * size + delta}px`);
      track.dataset.slideIndex = String(index);
      controls.forEach((button) => {
        button.disabled =
          Number(button.dataset.scroll) < 0 ? index === 0 : index === limit;
      });
    }
    function go(direction) {
      index = Math.max(0, Math.min(limit, index + direction));
      delta = 0;
      paint();
    }
    controls.forEach((button) =>
      button.addEventListener("click", () => go(Number(button.dataset.scroll))),
    );
    track.tabIndex = 0;
    track.setAttribute("aria-roledescription", "карусель");
    track.addEventListener("keydown", (event) => {
      if (event.target !== track) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        go(event.key === "ArrowRight" ? 1 : -1);
      }
    });
    track.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button,a,input")) return;
      pointer = event.pointerId;
      start = event.clientX;
      delta = 0;
      dragging = true;
      suppressClick = false;
      track.setPointerCapture(pointer);
      track.classList.add("is-dragging");
    });
    track.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointer) return;
      const distance = event.clientX - start;
      if (Math.abs(distance) > 7) suppressClick = true;
      delta =
        (index === 0 && distance > 0) || (index === limit && distance < 0)
          ? distance * 0.18
          : distance;
      paint();
    });
    function release(event) {
      if (!dragging || event.pointerId !== pointer) return;
      dragging = false;
      track.classList.remove("is-dragging");
      if (track.hasPointerCapture(pointer))
        track.releasePointerCapture(pointer);
      const shift = delta;
      delta = 0;
      if (
        event.type === "pointerup" &&
        Math.abs(shift) > Math.min(80, size * 0.18)
      )
        go(shift < 0 ? 1 : -1);
      else paint();
      pointer = null;
    }
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
    track.addEventListener(
      "click",
      (event) => {
        if (suppressClick) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick = false;
        }
      },
      true,
    );
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    controllers.set(track.id, {
      reset() {
        index = 0;
        delta = 0;
        measure();
      },
      go,
    });
    document.fonts.ready.then(measure);
    measure();
  });
  document
    .querySelectorAll("[data-filter]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        requestAnimationFrame(() => controllers.get("project-track")?.reset()),
      ),
    );
})();

/** Expand the photo under the pointer; photos never swap between slots. */
(() => {
  const gallery = document.querySelector(".objects-gallery");
  const cards = [...gallery.querySelectorAll(":scope > .object-card")];
  const cursor = gallery.querySelector(".object-hover-cursor");
  let active = 2,
    start = 0,
    drag = false,
    pointer = null;
  function activate(index) {
    active = (index + cards.length) % cards.length;
    cards.forEach((card, i) =>
      card.classList.toggle("is-active", i === active),
    );
    gallery.style.gridTemplateColumns = cards
      .map((_, i) => (i === active ? "1.9673fr" : "1fr"))
      .join(" ");
    gallery.dataset.activeObject = String(active);
  }
  activate(2);
  cards.forEach((card, i) => {
    card.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "touch" && !drag) activate(i);
    });
    card.addEventListener("click", () => {
      if (!drag) activate(i);
    });
  });
  gallery.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = gallery.getBoundingClientRect();
    cursor.style.transform = `translate3d(${e.clientX - r.left - 36}px,${e.clientY - r.top - 36}px,0)`;
    gallery.classList.toggle(
      "has-pointer",
      Boolean(e.target.closest(".object-card")),
    );
  });
  gallery.addEventListener("pointerleave", () =>
    gallery.classList.remove("has-pointer"),
  );
  gallery.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || innerWidth <= 760) return;
    start = e.clientX;
    pointer = e.pointerId;
    drag = true;
    gallery.setPointerCapture(pointer);
  });
  function release(e) {
    if (!drag || e.pointerId !== pointer) return;
    const dx = e.clientX - start;
    drag = false;
    if (gallery.hasPointerCapture(pointer))
      gallery.releasePointerCapture(pointer);
    if (e.type === "pointerup" && Math.abs(dx) > 45)
      activate(active + (dx < 0 ? 1 : -1));
    pointer = null;
  }
  gallery.addEventListener("pointerup", release);
  gallery.addEventListener("pointercancel", release);
  gallery.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      activate(active + (e.key === "ArrowRight" ? 1 : -1));
      if (innerWidth <= 760)
        cards[active].scrollIntoView({
          block: "nearest",
          inline: "center",
          behavior: "smooth",
        });
    }
  });
})();

/** Three crops of the supplied project photograph; no unrelated house imagery. */
(() => {
  document.querySelectorAll(".project-picture").forEach((picture) => {
    const frames = [...picture.querySelectorAll(".project-frame")];
    const dots = [...picture.querySelectorAll("[data-photo-index]")];
    let active = 0,
      visible = false,
      paused = false;
    function select(index) {
      active = index;
      picture.dataset.activePhoto = String(index);
      frames.forEach((f, i) => f.classList.toggle("is-active", i === index));
      dots.forEach((b, i) =>
        b.setAttribute("aria-pressed", String(i === index)),
      );
    }
    dots.forEach((b, i) => b.addEventListener("click", () => select(i)));
    picture.addEventListener("pointerenter", () => (paused = true));
    picture.addEventListener("pointerleave", () => (paused = false));
    picture.addEventListener("focusin", () => (paused = true));
    picture.addEventListener("focusout", () => (paused = false));
    new IntersectionObserver(
      (entries) => (visible = entries[0].isIntersecting),
      { threshold: 0.1 },
    ).observe(picture);
    setInterval(() => {
      if (
        visible &&
        !paused &&
        !document.hidden &&
        window.siteMotion?.enabled !== false
      )
        select((active + 1) % frames.length);
    }, 4800);
    select(0);
  });
})();
