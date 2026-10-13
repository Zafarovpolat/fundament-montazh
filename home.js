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
