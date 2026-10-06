"use strict";
/**
 * Пин секции «7 шагов» (#design, макет 315:324).
 *
 * Когда верхний край секции доходит до кромки вьюпорта, страница замирает, а
 * вертикальный скролл начинает листать ряд карточек — тот же рельс 491:667,
 * которым управляют стрелки и range, поэтому прогресс, disabled у стрелок и
 * подпись шага синхронизируются сами (MutationObserver в sliders.js).
 * Как только ряд дошёл до последнего листа, блокировка снимается и страница
 * едет дальше; на обратном ходу симметрично: сначала первый лист, потом вверх.
 *
 * Пин не меняет высоту секции и не добавляет обёрток в разметку. Ловятся
 * только wheel/touch, поэтому якорные ссылки, programmatic scroll и тесты
 * (там нет колеса) работают как раньше. Выключен при data-motion="off" и при
 * ширине ≤1441px: ниже ряд остаётся обычным листальным.
 */
(() => {
  const section = document.getElementById("design");
  const track = document.getElementById("steps-track");
  const rail = section && section.querySelector("[data-steps-range]");
  if (!section || !track || !rail) return;
  // Карусель навешивает sliders.js; ждём её, если он ещё не дошёл.
  let api = track.carousel;
  if (!api) {
    let frames = 120;
    const wait = () => {
      api = track.carousel;
      if (api) init();
      else if (frames--) requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
    return;
  }
  init();

  function init() {
    const wide = window.matchMedia("(min-width: 1441px)");
    const motionOn = () => document.documentElement.dataset.motion !== "off";
    // Сколько колеса стоит один лист ряда: ~три щелчка мыши.
    const PAGE_DELTA = 260;
    // Верх секции считается «у кромки» в этом диапазоне — вход в пин.
    const ENTER_SLACK = 320;
    // html { scroll-padding-top }: секция пристыкуется не к 0, а к этой метке,
    // поэтому «у кромки» мерим по ней, иначе пин не наступал бы после якорей.
    const park = () =>
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0;

    let anchor = null; // pageY, на котором держим страницу
    let acc = 0; // накопленный delta внутри текущего листа
    let touchY = null;

    const enabled = () => wide.matches && motionOn() && api.pages > 1;
    const atStart = () => api.page <= 0;
    const atEnd = () => api.page >= api.pages - 1;
    const pinned = () => anchor !== null;

    function hold() {
      // Держим позицию, в которой колесо застало секцию, а не доводим её до
      // нуля: snap назад конфликтовал бы с html { scroll-behavior: smooth } и
      // собственный скролл сбрасывал бы пин на первом же кадре анимации.
      anchor = Math.round(window.scrollY);
      document.documentElement.classList.add("is-steps-pinned");
      window.addEventListener("scroll", reassert, { passive: true });
    }

    function release() {
      anchor = null;
      acc = 0;
      document.documentElement.classList.remove("is-steps-pinned");
      window.removeEventListener("scroll", reassert);
    }

    /**
     * Держим позицию только пока это «наше» смещение (единицы пикселей):
     * фокус, якорь или инерция пальца уводят страницу дальше — отпускаем,
     * иначе секция заперла бы скролл намертво.
     */
    function reassert() {
      if (anchor === null) return;
      const drift = window.scrollY - anchor;
      if (Math.abs(drift) <= 4) {
        if (drift) window.scrollTo(0, anchor);
      } else {
        release();
      }
    }

    // Вход: секция верхом у кромки, ряд ещё не доскроллен в нужную сторону.
    function enter(dir) {
      if (!enabled()) return false;
      const r = section.getBoundingClientRect();
      if (r.top > park() + 2 || r.top < -ENTER_SLACK) return false;
      if (r.bottom < window.innerHeight * 0.6) return false;
      if (dir > 0 ? atEnd() : atStart()) return false;
      hold();
      return true;
    }

    /** Превращает вертикальный delta в один лист ряда. true — событие съедено. */
    function consume(dy) {
      const dir = dy > 0 ? 1 : -1;
      if (dir > 0 ? atEnd() : atStart()) {
        release();
        return false;
      }
      acc += dy;
      if (Math.abs(acc) < PAGE_DELTA) return true;
      api.goTo(Math.max(0, Math.min(api.pages - 1, api.page + dir)));
      acc = 0;
      return true;
    }

    function onWheel(event) {
      if (event.ctrlKey || !enabled()) return;
      const dy =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1);
      if (!dy) return;
      if (!pinned() && !enter(dy > 0 ? 1 : -1)) return;
      if (pinned() && consume(dy)) event.preventDefault();
    }

    function onTouchStart(event) {
      if (event.touches.length !== 1) return;
      touchY = event.touches[0].clientY;
    }

    function onTouchMove(event) {
      if (event.touches.length !== 1 || touchY === null) return;
      const y = event.touches[0].clientY;
      const dy = touchY - y;
      touchY = y;
      if (!dy) return;
      if (!pinned() && !enter(dy > 0 ? 1 : -1)) return;
      if (pinned() && consume(dy)) event.preventDefault();
    }

    function onTouchEnd() {
      touchY = null;
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    // Смена ширины: не держать страницу, если пин стал недоступен.
    wide.addEventListener("change", () => {
      if (pinned() && !enabled()) release();
    });
  }
})();
