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
    let finishLoop = null;
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
      finishLoop?.();
      index = Math.max(0, Math.min(limit, index + direction));
      delta = 0;
      paint();
      track.dispatchEvent(new Event("carouselchange"));
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
    track.carousel = {
      async advanceLoop() {
        finishLoop?.();
        const cards = visibleCards();
        if (cards.length < 2) return;
        function rotate(count) {
          track.style.transition = "none";
          for (let i = 0; i < count; i++) track.append(visibleCards()[0]);
          index = 0;
          delta = 0;
          paint();
          void track.offsetWidth;
          track.style.removeProperty("transition");
        }
        if (index) rotate(index);
        index = 1;
        paint();
        await new Promise((resolve) => {
          let timer;
          finishLoop = () => {
            clearTimeout(timer);
            rotate(1);
            finishLoop = null;
            resolve();
          };
          timer = setTimeout(() => finishLoop?.(), 700);
        });
      },
      currentCard() {
        return visibleCards()[index] || visibleCards()[0];
      },
    };
    controllers.set(track.id, {
      reset() {
        finishLoop?.();
        index = 0;
        delta = 0;
        measure();
        track.dispatchEvent(new Event("carouselchange"));
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
    const x = Math.max(0, Math.min(r.width - 72, e.clientX - r.left - 36));
    const y = Math.max(0, Math.min(r.height - 72, e.clientY - r.top - 36));
    cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
    gallery.classList.toggle(
      "has-pointer",
      Boolean(e.target.closest(".object-card")),
    );
  });
  // An invisible translated cursor still contributes to scrollable overflow.
  // Clear stale desktop coordinates both on leave and when the gallery shrinks.
  function resetCursor() {
    gallery.classList.remove("has-pointer");
    cursor.style.transform = "translate3d(0,0,0)";
  }
  gallery.addEventListener("pointerleave", resetCursor);
  new ResizeObserver(resetCursor).observe(gallery);
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

/** One sequential clock: current project's photos, next project, repeat. */
(() => {
  const track = document.querySelector("#project-track");
  const pictures = [...track.querySelectorAll(".project-picture")];
  let current = null,
    visible = false,
    paused = false,
    busy = false,
    timer = null;
  const frames = (p) => [...p.querySelectorAll(".project-frame")];
  function photo(p, index) {
    p.dataset.activePhoto = String(index);
    frames(p).forEach((f, i) => f.classList.toggle("is-active", i === index));
    p.querySelectorAll("[data-photo-index]").forEach((b, i) =>
      b.setAttribute("aria-pressed", String(i === index)),
    );
  }
  function choose(p) {
    current = p;
    pictures.forEach((other) => {
      photo(other, 0);
      other
        .closest(".project-card")
        .classList.toggle("is-autoplay-project", other === p);
    });
    track.dataset.autoplayProject = p
      ? p.closest(".project-card").querySelector("h3")?.dataset.figmaText || ""
      : "";
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(step, 1800);
  }
  async function step() {
    if (
      !visible ||
      paused ||
      document.hidden ||
      window.siteMotion?.enabled === false ||
      busy
    ) {
      schedule();
      return;
    }
    if (!current || current.closest(".project-card").hidden)
      choose(track.carousel.currentCard()?.querySelector(".project-picture"));
    if (!current) {
      schedule();
      return;
    }
    const index = Number(current.dataset.activePhoto);
    if (index < frames(current).length - 1) photo(current, index + 1);
    else {
      busy = true;
      await track.carousel.advanceLoop();
      choose(track.carousel.currentCard()?.querySelector(".project-picture"));
      busy = false;
    }
    schedule();
  }
  pictures.forEach((p) =>
    p.querySelectorAll("[data-photo-index]").forEach((b) =>
      b.addEventListener("click", () => {
        choose(p);
        photo(p, Number(b.dataset.photoIndex));
        schedule();
      }),
    ),
  );
  track.addEventListener("carouselchange", () => {
    choose(track.carousel.currentCard()?.querySelector(".project-picture"));
    schedule();
  });
  // Hover does not stall the sequence; pause only during dragging or keyboard focus.
  track.addEventListener("pointerdown", () => (paused = true));
  window.addEventListener("pointerup", () => {
    paused = false;
  });
  window.addEventListener("pointercancel", () => {
    paused = false;
  });
  track.addEventListener("focusin", (e) => {
    if (e.target.matches(":focus-visible")) paused = true;
  });
  track.addEventListener("focusout", () => {
    paused = false;
  });
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
    },
    { threshold: 0.1 },
  ).observe(track);
  choose(track.carousel.currentCard()?.querySelector(".project-picture"));
  schedule();
})();
