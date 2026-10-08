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
      pos = 0, // дробная позиция ряда: рельс 491:667 работает свободным диапазоном
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
      pos = Math.max(0, Math.min(pos, limit));
      paint();
    }
    function paint() {
      track.style.setProperty("--slide-x", `${-pos * size + delta}px`);
      track.dataset.slideIndex = String(index);
      track.dataset.slidePos = pos.toFixed(3);
      controls.forEach((button) => {
        button.disabled =
          Number(button.dataset.scroll) < 0 ? index === 0 : index === limit;
      });
    }
    function go(direction) {
      finishLoop?.();
      index = Math.max(0, Math.min(limit, index + direction));
      pos = index;
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
        (pos <= 0 && distance > 0) || (pos >= limit && distance < 0)
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
      /* Свободный рендж: ряд остаётся там, где его отпустили — к целому листу
         не притягиваем. Состояние листа (стрелки, подпись) — по ближайшему. */
      pos = Math.max(0, Math.min(limit, pos + shift / size));
      index = Math.round(pos);
      paint();
      track.dispatchEvent(new Event("carouselchange"));
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
      /** Страниц для карусели и текущая — нужно рельсу-слайдеру в макете 315:324. */
      get pages() {
        return limit + 1;
      },
      get page() {
        return index;
      },
      goTo(to) {
        go(to - index);
      },
      /** Дробная позиция ряда в листах — «свободный рендж» рельса. */
      get position() {
        return pos;
      },
      set position(value) {
        finishLoop?.();
        pos = Math.max(0, Math.min(limit, Number(value) || 0));
        index = Math.round(pos);
        delta = 0;
        paint();
        track.dispatchEvent(new Event("carouselchange"));
      },
      /** Сколько пикселей прокрутки стоит один лист (нужно пину #design). */
      get step() {
        return size;
      },
      async advanceLoop() {
        finishLoop?.();
        const cards = visibleCards();
        if (cards.length < 2) return;
        function rotate(count) {
          track.style.transition = "none";
          for (let i = 0; i < count; i++) track.append(visibleCards()[0]);
          index = 0;
          pos = 0;
          delta = 0;
          paint();
          void track.offsetWidth;
          track.style.removeProperty("transition");
        }
        if (index) rotate(index);
        index = 1;
        pos = 1;
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
        pos = 0;
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
  if (!gallery) return; // галереи объектов нет на всех страницах сайта
  const cards = [...gallery.querySelectorAll(":scope > .object-card")];
  const cursor = gallery.querySelector(".object-hover-cursor");
  let active = 2,
    start = 0,
    drag = false,
    pointer = null;
  function centerActiveCard() {
    if (innerWidth > 768) return;
    const card = cards[active];
    if (!card) return;
    const left =
      card.offsetLeft + card.offsetWidth / 2 - gallery.clientWidth / 2;
    gallery.scrollLeft = Math.max(
      0,
      Math.min(gallery.scrollWidth - gallery.clientWidth, left),
    );
  }
  function activate(index) {
    active = (index + cards.length) % cards.length;
    cards.forEach((card, i) =>
      card.classList.toggle("is-active", i === active),
    );
    gallery.style.gridTemplateColumns = cards
      .map((_, i) => (i === active ? "1.9673fr" : "1fr"))
      .join(" ");
    gallery.dataset.activeObject = String(active);
    if (innerWidth <= 768) requestAnimationFrame(centerActiveCard);
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
  new ResizeObserver(() => {
    resetCursor();
    centerActiveCard();
  }).observe(gallery);
  window.addEventListener("resize", () => {
    if (innerWidth <= 768) requestAnimationFrame(centerActiveCard);
    else gallery.scrollLeft = 0;
  });
  gallery.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || innerWidth <= 768) return;
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
    }
  });
})();

/** Рельс под рядом шагов (491:667): range листает трек и наоборот. */
(() => {
  const rail = document.querySelector("[data-steps-range]");
  if (!rail) return;
  const track = document.getElementById(rail.dataset.stepsRange);
  const input = rail.querySelector('input[type="range"]');
  if (!track?.carousel || !input) return;
  const api = track.carousel;
  const sync = () => {
    const pages = Math.max(1, api.pages);
    const last = pages - 1;
    const free = Math.max(0, Math.min(api.position, last));
    input.max = String(last);
    // «any» даёт плавное перетаскивание; шаг листают обработчиком клавиш ниже
    input.step = pages > 1 ? "any" : "1";
    input.value = free.toFixed(3);
    rail.hidden = pages < 2;
    // жёлтая полоса и пилюля со стрелками идут по свободному прогрессу ряда
    const done = pages > 1 ? (free + 1) / pages : 1;
    rail.style.setProperty("--steps-progress", done.toFixed(4));
    input.setAttribute(
      "aria-valuetext",
      `Шаг ${Math.round(free) + 1} из ${pages}`,
    );
  };
  input.addEventListener("input", () => {
    api.position = Number(input.value);
  });
  /* Пилюля-рукоятка 491:672: тянуть можно за любую её точку, ряд и прогресс
     идут 1:1 за курсором. Ход считаем от той же ширины, что задаёт left пилюли
     в CSS (100% - 62px), поэтому рукоятка не отстаёт и не «притягивается» к
     целому листу на середине — фиксация только на краях, как у рельса. */
  const handle = rail.querySelector(".steps-range__ctrl");
  if (handle) {
    let grabId = null;
    let grabX = 0;
    let grabPos = 0;
    const travel = () => Math.max(1, rail.clientWidth - handle.offsetWidth);
    handle.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      grabId = event.pointerId;
      grabX = event.clientX;
      grabPos = api.position;
      handle.setPointerCapture(grabId);
      document.documentElement.classList.add("is-scrubbing");
    });
    handle.addEventListener("pointermove", (event) => {
      if (grabId !== event.pointerId) return;
      api.position = grabPos + ((event.clientX - grabX) * api.pages) / travel();
    });
    const drop = (event) => {
      if (grabId !== event.pointerId) return;
      grabId = null;
      document.documentElement.classList.remove("is-scrubbing");
    };
    handle.addEventListener("pointerup", drop);
    handle.addEventListener("pointercancel", drop);
  }
  // Пока ползунок ведут мышью/пальцем, трек и пилюля идут без инерции перехода
  input.addEventListener("pointerdown", () =>
    document.documentElement.classList.add("is-scrubbing"),
  );
  window.addEventListener("pointerup", () =>
    document.documentElement.classList.remove("is-scrubbing"),
  );
  window.addEventListener("pointercancel", () =>
    document.documentElement.classList.remove("is-scrubbing"),
  );
  input.addEventListener("keydown", (event) => {
    const step = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    }[event.key];
    if (step) {
      event.preventDefault();
      api.goTo(Math.round(api.position) + step);
    } else if (event.key === "Home") {
      event.preventDefault();
      api.goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      api.goTo(api.pages - 1);
    }
  });
  new MutationObserver(sync).observe(track, {
    attributes: true,
    attributeFilter: ["data-slide-index", "data-slide-pos"],
  });
  window.addEventListener("resize", sync);
  document.fonts.ready.then(sync);
  sync();
})();

/** One sequential clock: current project's photos, next project, repeat. */
(() => {
  const track = document.querySelector("#project-track");
  if (!track) return; // на главной карточки — статичная сетка, карусели нет
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

/** Mobile progress control for the foundation-card carousel. */
(() => {
  const track = document.querySelector("#projects .foundation-cards");
  const rail = document.querySelector("[data-foundation-progress]");
  const input = rail?.querySelector('input[type="range"]');
  const thumb = rail?.querySelector(".foundation-progress__thumb");
  if (!track || !rail || !input || !thumb) return;

  function paint(value) {
    const progress = Math.max(0, Math.min(100, Number(value) || 0)) / 100;
    const travel = Math.max(0, rail.clientWidth - thumb.offsetWidth);
    const x = travel * progress;
    rail.style.setProperty("--foundation-thumb-x", `${x}px`);
    rail.style.setProperty("--foundation-fill-width", `${x + 9}px`);
  }

  function syncFromScroll() {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const progress = maxScroll ? (track.scrollLeft / maxScroll) * 100 : 0;
    input.value = progress.toFixed(2);
    paint(progress);
  }

  input.addEventListener("input", () => {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const progress = Math.max(0, Math.min(100, Number(input.value) || 0));
    paint(progress);
    track.scrollTo({
      left: (maxScroll * progress) / 100,
      behavior: "smooth",
    });
  });
  track.addEventListener("scroll", syncFromScroll, { passive: true });
  new ResizeObserver(() => {
    if (track.scrollLeft > 0) syncFromScroll();
    else paint(input.value);
  }).observe(rail);
  paint(input.value);
})();
