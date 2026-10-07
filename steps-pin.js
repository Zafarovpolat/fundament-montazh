"use strict";
/**
 * Пин секции «7 шагов» (#design, макет 315:324) со свободным диапазоном.
 *
 * Когда центр секции приходит к центру экрана, страница замирает, а
 * вертикальный скролл двигает ряд карточек в том же направлении. Чувствительность
 * снижена до 65%, чтобы ряд не пролетал слишком быстро; шаг одного листа
 * = ширина карточки + gap, его отдаёт carousel.step. Рельс 491:667, жёлтая
 * полоса и пилюля со стрелками наследуют эту же дробную позицию, поэтому
 * стрелки, перетаскивание ползунка, drag самого ряда и колесо — один и тот же
 * диапазон без притягивания к целому шагу.
 *
 * На краях диапазона блокировка снимается: довели ряд до конца — дальше едет
 * страница; на обратном ходу симметрично. Пин не меняет высоту секции и не
 * добавляет обёрток в разметку; ловятся только wheel/touch, поэтому якорные
 * ссылки, programmatic scroll и тесты (там нет колеса) работают как раньше.
 * Работает от 761 px (включая компактный десктоп и планшет), выключен при
 * data-motion="off" и на узких телефонах.
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
    const pinViewport = window.matchMedia("(min-width: 761px)");
    // Скорость относительно физической прокрутки колеса/пальца. Меньше единицы
    // означает, что для того же сдвига ряда нужно прокрутить страницу дальше.
    const SCROLL_RATE = 0.65;
    const motionOn = () => document.documentElement.dataset.motion !== "off";
    const span = () => Math.max(0, api.pages - 1);
    const atStart = () => api.position <= 0.001;
    const atEnd = () => api.position >= span() - 0.001;

    let anchor = null; // pageY, на котором держим страницу
    let touchY = null;

    const enabled = () => pinViewport.matches && motionOn() && span() > 0;
    const pinned = () => anchor !== null;

    function hold(pageY = window.scrollY) {
      // Ставим режим мгновенной прокрутки до выравнивания #design. Иначе
      // браузер мог продолжить smooth-scroll уже после захвата wheel-события.
      document.documentElement.classList.add("is-steps-pinned");
      anchor = Math.round(pageY);
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
     * Включаем пин, когда центр секции #design пересекает центр окна. Если
     * крупный wheel/touch event пересёк эту точку, сначала ровно центрируем
     * секцию, затем передаём остаток ввода горизонтальному ряду.
     * @returns {number|null} оставшаяся дельта для ряда; null — пусть скроллит страница.
     */
    function enter(dy) {
      if (!enabled()) return null;
      const dir = dy > 0 ? 1 : -1;
      if (dir > 0 ? atEnd() : atStart()) return null;

      const r = section.getBoundingClientRect();
      const centerOffset = r.top + r.height / 2 - window.innerHeight / 2;
      const tolerance = 4;
      const overshootTolerance = 24;
      let pageShift = 0;

      if (Math.abs(centerOffset) > tolerance) {
        if (dy > 0) {
          // Вниз: захватываем до точки пересечения, а также небольшой промах
          // за центр от инерции/редких wheel-событий.
          if (centerOffset < -overshootTolerance || centerOffset > dy) return null;
        } else {
          // Вверх — симметрично; крупный промах не притягивает страницу назад.
          if (centerOffset > overshootTolerance || centerOffset < dy) return null;
        }
        pageShift = centerOffset;
      }

      let remaining = dy;
      if (pageShift) {
        const maxY = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        const targetY = Math.max(
          0,
          Math.min(maxY, window.scrollY + pageShift),
        );
        const actualShift = targetY - window.scrollY;
        // Захватываем позицию до scrollTo: CSS root scroll-behavior уже станет
        // auto, а небольшая коррекция промаха против направления wheel не
        // вычитается из дельты, передаваемой карточкам.
        hold(targetY);
        window.scrollTo(0, targetY);
        if (actualShift * dy > 0) remaining -= actualShift;
      } else {
        hold();
      }
      return remaining;
    }

    /**
     * Переводит 65% дельты колеса/пальца в сдвиг ряда. Даже когда событие
     * доводит ряд до края, оно съедается целиком: иначе остаток огромного wheel
     * event сразу прокручивал бы страницу на несколько экранов.
     */
    function consume(dy) {
      const step = api.step || 1;
      const target = api.position + (dy * SCROLL_RATE) / step;
      const next = Math.max(0, Math.min(span(), target));
      api.position = next;
      if ((dy > 0 && next >= span() - 0.001) || (dy < 0 && next <= 0.001)) {
        // Этот event уже съели; следующие свободно прокрутят страницу.
        release();
      }
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
      if (!pinned()) {
        const remaining = enter(dy);
        if (remaining === null) return;
        event.preventDefault();
        consume(remaining);
        return;
      }
      event.preventDefault();
      consume(dy);
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
      if (!pinned()) {
        const remaining = enter(dy);
        if (remaining === null) return;
        event.preventDefault();
        consume(remaining);
        return;
      }
      event.preventDefault();
      consume(dy);
    }

    function onTouchEnd() {
      touchY = null;
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    // Смена ширины: не держать страницу, если пин стал недоступен.
    pinViewport.addEventListener("change", () => {
      if (pinned() && !enabled()) release();
    });
  }
})();
