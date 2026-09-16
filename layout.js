"use strict";
// Measure real content edges, excluding a classic vertical scrollbar.
// Geometry only: no page scaling or global overflow masking.
(() => {
  const root = document.documentElement;
  const bleeds = [...document.querySelectorAll(".carousel-bleed")];
  const footer = document.querySelector(".footer-grid");
  const cta = document.querySelector(".footer-cta");
  let frame = 0;
  const set = (element, name, value) => {
    if (element.style.getPropertyValue(name) !== value)
      element.style.setProperty(name, value);
  };
  function measure() {
    frame = 0;
    const width = root.clientWidth;
    const rightGaps = bleeds.map((el) =>
      Math.max(
        0,
        width - (el.closest(".container").getBoundingClientRect().right + window.scrollX),
      ),
    );
    const footerGap = Math.max(0, width - (footer.getBoundingClientRect().right + window.scrollX));
    set(root, "--layout-width", width + "px");
    bleeds.forEach((el, i) => set(el, "--bleed", rightGaps[i] + "px"));
    set(cta, "--footer-bleed", footerGap + "px");
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure);
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(root);
  observer.observe(footer);
  bleeds.forEach((el) => observer.observe(el.closest(".container")));
  window.addEventListener("resize", schedule);
  document.fonts.ready.then(schedule);
  schedule();
})();
