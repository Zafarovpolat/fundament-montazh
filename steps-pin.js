"use strict";
/**
 * Пин секции «7 шагов» (макет 315:324): когда ряд карточок доходит до верха
 * экрана, он останавливается, а вертикальный скролл превращается в
 * горизонтальный — карточки едут влево ровно на длину рельса 491:667, и за
 * это же время бегунок рельса доходит до его конца.
 *
 * Работает только при включённых анимациях (window.siteMotion) и от 1441 px:
 * ниже карусель остаётся листальной, а DOM без JS просто показывает ряд
 * карточек с обычным рельсом.
 */
(() => {
  const section = document.getElementById("design");
  const pin = section && section.querySelector("[data-steps-pin]");
  const track = document.getElementById("steps-track");
  const rail = section && section.querySelector("[data-steps-range]");
  if (!pin || !track || !rail) return;

  const stage = pin.querySelector(".steps-pin__stage");
  const bleed = pin.querySelector(".carousel-bleed");
  const input = rail.querySelector('input[type="range"]');
  const prev = rail.querySelector('[data-scroll="-1"]');
  const next = rail.querySelector('[data-scroll="1"]');
  const wide = window.matchMedia("(min-width: 1441px)");
  let travel = 0,
    from = 0,
    step = 0,
    on = false,
    queued = 0;

  const motionOn = () => document.documentElement.dataset.motion !== "off";

  function off() {
    on = false;
    pin.classList.remove("is-on");
    rail.classList.remove("is-pinned");
    pin.style.removeProperty("--pin-travel");
    pin.style.removeProperty("--pin-block-h");
    stage.style.removeProperty("--pin-top");
    track.style.removeProperty("--pin-x");
    track.style.removeProperty("--slide-x");
    if (input) input.removeAttribute("readonly");
    window.removeEventListener("scroll", schedule);
  }

  function measure() {
    off();
    const api = track.carousel;
    if (!wide.matches || !motionOn() || !api || api.pages < 2) return;
    // длина пробега = правый край последней карточки минус правый край окна
    // карусели; меряем при обнулённых сдвигах, иначе возьмём уже смещённую
    // геометрию.
    track.style.setProperty("--pin-x", "0px");
    track.style.setProperty("--slide-x", "0px");
    const max = Math.round(
      track.lastElementChild.getBoundingClientRect().right -
        bleed.getBoundingClientRect().right,
    );
    track.style.removeProperty("--pin-x");
    track.style.removeProperty("--slide-x");
    if (!(max > 8)) return;
    travel = max;
    step = travel / (api.pages - 1);
    const stageH = Math.round(stage.getBoundingClientRect().height);
    const top = Math.max(0, Math.round((window.innerHeight - stageH) / 2));
    pin.style.setProperty("--pin-travel", `${travel}px`);
    pin.style.setProperty("--pin-block-h", `${stageH + travel + 2 * top}px`);
    pin.classList.add("is-on");
    stage.style.setProperty("--pin-top", `${top}px`);
    from = pin.getBoundingClientRect().top + window.scrollY + top;
    rail.classList.add("is-pinned");
    if (input) input.setAttribute("readonly", "");
    on = true;
    window.addEventListener("scroll", schedule, { passive: true });
    update();
  }

  const progress = () =>
    travel ? Math.min(1, Math.max(0, (window.scrollY - from) / travel)) : 0;

  function update() {
    queued = 0;
    if (!on) return;
    const p = progress();
    track.style.setProperty("--slide-x", "0px");
    track.style.setProperty("--pin-x", `${(-p * travel).toFixed(2)}px`);
    rail.style.setProperty("--steps-progress", Math.max(p, 0.06).toFixed(4));
    const api = track.carousel;
    if (input) {
      input.max = String(api.pages - 1);
      input.value = String(Math.round(p * (api.pages - 1)));
    }
    if (prev) prev.disabled = p <= 0.001;
    if (next) next.disabled = p >= 0.999;
  }

  function schedule() {
    if (!queued) queued = window.requestAnimationFrame(update);
  }

  // Пока секция прижата, рельс не листает карусель, а прокручивает страницу:
  // иначе два независимых сдвига сложились бы в двойное движение.
  rail.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-scroll]");
      if (!on || !button) return;
      event.preventDefault();
      event.stopPropagation();
      window.scrollBy({
        top: step * Number(button.dataset.scroll),
        behavior: "smooth",
      });
    },
    true,
  );
  rail.addEventListener(
    "input",
    (event) => {
      if (!on || event.target !== input) return;
      event.stopPropagation();
      const api = track.carousel;
      window.scrollTo({
        top: from + (Number(input.value) / (api.pages - 1)) * travel,
        behavior: "instant",
      });
    },
    true,
  );

  track.addEventListener("carouselchange", schedule);
  wide.addEventListener("change", measure);
  window.addEventListener("resize", measure);
  new MutationObserver(() => measure()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  document.fonts.ready.then(measure);
  window.addEventListener("load", measure);
  measure();
})();
