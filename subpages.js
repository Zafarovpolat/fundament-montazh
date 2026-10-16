"use strict";
/**
 * Внутренние страницы: активный раздел документа в боковой карточке и
 * аккуратная заглушка, пока артворк из макета не выгружен в assets/.
 */
(() => {
  // 1. Активный раздел документа: карточка разделов подсвечивает тот, что
  //    сейчас в кадре (в макете 430:365 подсвечен «1. Общие положения»).
  const nav = document.querySelector(".legal-nav");
  const body = document.querySelector(".legal-body");
  if (nav && body) {
    const links = [...nav.querySelectorAll("a[href^='#']")];
    const sections = links
      .map((link) => document.getElementById(link.hash.slice(1)))
      .filter(Boolean);
    if (sections.length) {
      let frame = 0;
      const setCurrent = (id) => {
        links.forEach((link) => {
          const isCurrent = link.hash === `#${id}`;
          link.classList.toggle("is-current", isCurrent);
          if (isCurrent) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      };
      const measure = () => {
        frame = 0;
        const line = window.innerHeight * 0.35;
        let current = sections[0].id;
        sections.forEach((section) => {
          if (section.getBoundingClientRect().top <= line) current = section.id;
        });
        setCurrent(current);
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(measure);
      };
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      document.fonts.ready.then(schedule);
      schedule();
    }
  }

  // 2. Артворк 404/«спасибо» выгружается заказчиком: до этого держим
  //    плашку той же пропорции, чтобы геометрия страницы не менялась.
  document.querySelectorAll("[data-artwork-pending] img").forEach((img) => {
    img.addEventListener(
      "error",
      () => img.closest(".status-art")?.classList.add("is-missing"),
      { once: true },
    );
    if (img.complete && img.naturalWidth === 0)
      img.closest(".status-art")?.classList.add("is-missing");
  });
})();
