"use strict";
/**
 * Пин секции «7 шагов» (#design, макет 315:324) со свободным диапазоном.
 *
 * Пока ряд карточек стоит в средней полосе экрана, страница замирает, а
 * вертикальный скролл двигает ряд — не по листам, а 1:1:
 * на сколько пикселей проехалось колесо, настолько и сдвинулся трек (шаг
 * = ширина карточки + gap, его отдаёт carousel.step). Рельс 491:667, жёлтая
 * полоса и пилюля со стрелками наследуют эту же дробную позицию, поэтому
 * стрелки, перетаскивание ползунка, drag самого ряда и колесо — один и тот же
 * диапазон без притягивания к целому шагу.
 *
 * На краях диапазона блокировка снимается: довели ряд до конца — дальше едет
 * страница; на обратном ходу симметрично. Пин не меняет высоту секции и не
 * добавляет обёрток в разметку; ловятся только wheel/touch, поэтому якорные
 * ссылки, programmatic scroll и тесты (там нет колеса) работают как раньше.
 * Выключен при data-motion="off" и при ширине ≤1441px.
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
    // html { scroll-padding-top }: секция пристыкуется не к 0, а к этой метке,
    // поэтому «у кромки» мерим по ней, иначе пин не наступал бы после якорей.
    const park = () =>
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0;
    const span = () => Math.max(0, api.pages - 1);
    const atStart = () => api.position <= 0.001;
    const atEnd = () => api.position >= span() - 0.001;

    let anchor = null; // pageY, на котором держим страницу
    let touchY = null;

    const enabled = () => wide.matches && motionOn() && span() > 0;
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

    /**
     * Вход: ряд с карточками стоит в средней полосе экрана — тогда колесо
     * (и палец) двигает ряд, а не страницу. Раньше пин цеплялся только когда
     * верх секции доехал ровно до кромки вьюпорта: если дойти до ряда руками,
     * колесо прокручивало всю остальную страницу вместо ряда.
     */
    function enter(dir) {
      if (!enabled()) return false;
      const r = track.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top > vh * 0.78 || r.bottom < park() + vh * 0.22) return false;
      if (dir > 0 ? atEnd() : atStart()) return false;
      hold();
      return true;
    }

    /** Превращает delta колеса в сдвиг ряда 1:1. true — событие съедено. */
    function consume(dy) {
      const step = api.step || 1;
      const next = Math.max(0, Math.min(span(), api.position + dy / step));
      if (next <= 0.001 || next >= span() - 0.001) {
        // До края доводим и отпускаем страницу: дальше скролл обычный.
        api.position = next;
        release();
        return false;
      }
      api.position = next;
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
