"use strict";

// Аккордеон технологий строительства: раскрыт один блок за раз.
// Цены/сроки показываем только там, где значение есть в макете (газобетон),
// для остальных материалов числа не выдумываются.
(() => {
  const items = [...document.querySelectorAll(".home-tech-item")];
  if (!items.length) return;

  function open(item) {
    items.forEach((it) => {
      const isTarget = it === item;
      it.classList.toggle("is-open", isTarget);
      const toggle = it.querySelector(".home-tech-item__toggle");
      if (toggle) toggle.setAttribute("aria-expanded", String(isTarget));
    });
  }

  items.forEach((item) => {
    const toggle = item.querySelector(".home-tech-item__toggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => open(item));
  });
})();

// Шаги строительства: ползунок листает 6 шагов из Figma 491:641.
// Тексты лежат в разметке (без JS видны все шаги), JS показывает активный.
(() => {
  const list = document.querySelector(".home-page #steps .process-list");
  const range = document.querySelector(".home-page #steps .process-range input");
  if (!list || !range) return;
  const items = [...list.children];
  if (items.length < 2) return;

  function show(index) {
    const current = Math.max(0, Math.min(items.length - 1, index));
    items.forEach((item, position) => {
      item.hidden = position !== current;
    });
    list.dataset.step = String(current);
  }

  function fromRange() {
    const min = Number(range.min) || 0;
    const max = Number(range.max) || 100;
    const ratio = max > min ? (Number(range.value) - min) / (max - min) : 0;
    show(Math.round(ratio * (items.length - 1)));
  }

  range.addEventListener("input", fromRange);
  fromRange();
})();

// Карточки защиты: мобильный рельс-«рендж» (кадр 540:662, узел 540:956).
// Пилюля со стрелками идёт по свободному прогрессу карусели, range-input
// перетаскивается пальцем/мышью и листает ряд.
(() => {
  const rail = document.querySelector("[data-safety-range]");
  const track = document.getElementById("safety-track");
  const input = rail?.querySelector('input[type="range"]');
  const thumb = rail?.querySelector(".home-safety__range-ctrl");
  if (!rail || !track?.carousel || !input || !thumb) return;
  const api = track.carousel;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function paint() {
    const pages = Math.max(1, api.pages);
    const last = pages - 1;
    const position = clamp(api.position, 0, last);
    input.max = String(last);
    input.step = last > 0 ? "any" : "1";
    input.value = position.toFixed(3);
    input.disabled = last < 1;
    input.setAttribute(
      "aria-valuetext",
      `Карточка ${Math.round(position) + 1} из ${pages}`,
    );
    const travel = Math.max(0, rail.clientWidth - thumb.offsetWidth);
    const x = last > 0 ? (travel * position) / last : 0;
    rail.style.setProperty("--safety-thumb-x", `${x}px`);
    rail.hidden = last < 1;
  }

  let scrubbing = false;
  function stopScrubbing() {
    if (!scrubbing) return;
    scrubbing = false;
    document.documentElement.classList.remove("is-scrubbing");
  }
  input.addEventListener("pointerdown", () => {
    scrubbing = true;
    document.documentElement.classList.add("is-scrubbing");
  });
  window.addEventListener("pointerup", stopScrubbing);
  window.addEventListener("pointercancel", stopScrubbing);
  input.addEventListener("blur", stopScrubbing);
  input.addEventListener("input", () => {
    api.position = Number(input.value);
    paint();
  });
  track.addEventListener("carouselchange", paint);
  new ResizeObserver(paint).observe(rail);
  document.fonts.ready.then(paint);
  paint();
})();
