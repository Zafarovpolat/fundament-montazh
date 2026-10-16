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
      `Карточка ${Math.round(position) + 1} из ${Math.ceil(pages)}`,
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

// «Этапы»: тот же мобильный рельс-«рендж», что у карточек защиты
// (кадр 540:662, узел 540:988). Пилюля идёт по свободной позиции ряда,
// range-input листает слайдер пальцем/мышью.
(() => {
  const rail = document.querySelector("[data-stage-range]");
  const track = document.getElementById("process-track");
  const input = rail?.querySelector('input[type="range"]');
  const thumb = rail?.querySelector(".home-stage-range-ctrl");
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
      `Этап ${Math.round(position) + 1} из ${Math.ceil(pages)}`,
    );
    const travel = Math.max(0, rail.clientWidth - thumb.offsetWidth);
    const x = last > 0 ? (travel * position) / last : 0;
    rail.style.setProperty("--stage-thumb-x", `${x}px`);
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

// Видео в герое: настоящий <video> с кнопками «назад / пауза / вперёд» и
// скоростью. Файл — assets/hero-video.mp4 (без него кнопки просто не играют).
(() => {
  const root = document.querySelector("[data-hero-video]");
  const video = root?.querySelector("[data-hero-video-el]");
  if (!root || !video) return;
  const playBtn = root.querySelector('[data-hv="play"]');
  const rateBtn = root.querySelector('[data-hv="rate"]');
  const bar = root.querySelector(".home-hero__video-progress > span");
  const rates = [1, 1.5, 2];
  let rateIndex = 0;

  const toggle = () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };
  playBtn.addEventListener("click", toggle);
  video.addEventListener("click", toggle);
  root.querySelector('[data-hv="back"]').addEventListener("click", () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
  });
  root.querySelector('[data-hv="forward"]').addEventListener("click", () => {
    const end = Number.isFinite(video.duration) ? video.duration : Infinity;
    video.currentTime = Math.min(end, video.currentTime + 10);
  });
  rateBtn.addEventListener("click", () => {
    rateIndex = (rateIndex + 1) % rates.length;
    video.playbackRate = rates[rateIndex];
    rateBtn.textContent = `${rates[rateIndex]}x`;
  });
  const paint = () => {
    const playing = !video.paused && !video.ended;
    root.classList.toggle("is-playing", playing);
    playBtn.setAttribute("aria-label", playing ? "Пауза" : "Воспроизвести");
  };
  video.addEventListener("play", paint);
  video.addEventListener("pause", paint);
  video.addEventListener("ended", paint);
  video.addEventListener("timeupdate", () => {
    if (!video.duration) return;
    bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
  });
})();
