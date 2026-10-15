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
