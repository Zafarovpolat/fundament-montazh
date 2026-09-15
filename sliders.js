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

/** Original object cursor is a pointer state, never a form-opening button. */
(() => {
  const gallery = document.querySelector(".objects-gallery");
  const slots = [
    ...gallery.querySelectorAll(
      ":scope > .object-side, :scope > .featured-object > img",
    ),
  ];
  const images = slots.map((img) => ({
    src: img.getAttribute("src"),
    alt: img.getAttribute("alt"),
  }));
  const center = gallery.querySelector(".featured-object > img");
  const caption = gallery.querySelector("figcaption");
  const cursor = gallery.querySelector(".object-hover-cursor");
  let active = 2,
    start = 0,
    drag = false,
    pointer = null;
  function display() {
    slots.forEach((img, position) => {
      const source =
        images[(active + position - 2 + images.length) % images.length];
      img.src = source.src;
      img.alt = source.alt;
    });
    center.classList.toggle("is-other-object", active !== 2);
    // Only the central source project has supplied specifications. Never invent others.
    caption.hidden = active !== 2;
    gallery.dataset.activeObject = String(active);
    gallery.classList.remove("is-changing");
    requestAnimationFrame(() => gallery.classList.add("is-changing"));
  }
  gallery.dataset.activeObject = String(active);
  function go(direction) {
    active = (active + direction + images.length) % images.length;
    display();
  }
  function moveCursor(event) {
    if (event.pointerType === "touch") return;
    const r = gallery.getBoundingClientRect();
    const x = Math.max(36, Math.min(r.width - 36, event.clientX - r.left));
    const y = Math.max(36, Math.min(r.height - 36, event.clientY - r.top));
    cursor.style.transform = `translate3d(${x - 36}px,${y - 36}px,0)`;
    gallery.classList.add("has-pointer");
  }
  gallery.addEventListener("pointermove", moveCursor);
  gallery.addEventListener("pointerleave", () => {
    if (!drag) gallery.classList.remove("has-pointer");
  });
  gallery.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    start = event.clientX;
    pointer = event.pointerId;
    drag = true;
    gallery.setPointerCapture(pointer);
  });
  function release(event) {
    if (!drag || event.pointerId !== pointer) return;
    const difference = event.clientX - start;
    drag = false;
    if (gallery.hasPointerCapture(pointer))
      gallery.releasePointerCapture(pointer);
    pointer = null;
    if (event.type === "pointerup" && Math.abs(difference) > 45)
      go(difference < 0 ? 1 : -1);
    if (event.type === "pointercancel") gallery.classList.remove("has-pointer");
  }
  gallery.addEventListener("pointerup", release);
  gallery.addEventListener("pointercancel", release);
  gallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      go(event.key === "ArrowRight" ? 1 : -1);
    }
  });
})();
