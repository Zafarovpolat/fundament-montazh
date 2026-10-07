"use strict";

// Progressive enhancement: desktop keeps its two-column grid. At <=1024px the
// existing price and copy nodes become two swipeable slides, without clones.
(() => {
  const hero = document.querySelector("#hero");
  const track = hero?.querySelector("[data-hero-carousel]");
  const pager = hero?.querySelector(".hero-pagination");
  if (!hero || !track || !pager) return;

  const slides = [...track.querySelectorAll("[data-hero-slide]")];
  const dots = [...pager.querySelectorAll("[data-hero-target]")];
  const slidesByKey = new Map(
    slides.map((slide) => [slide.dataset.heroSlide, slide]),
  );
  if (slides.length < 2 || dots.length !== slides.length) return;

  const mobile = window.matchMedia("(max-width: 1024px)");
  const interval = 5000;
  let activeKey = "copy";
  let timer = 0;
  let scrollTimer = 0;
  let inView = !("IntersectionObserver" in window);
  let pointerOver = false;
  let wasMobile = false;

  const stopAutoplay = () => {
    window.clearTimeout(timer);
    timer = 0;
  };

  const motionEnabled = () => window.siteMotion?.enabled !== false;

  const canAutoplay = () =>
    mobile.matches &&
    motionEnabled() &&
    inView &&
    !document.hidden &&
    !pointerOver &&
    !hero.contains(document.activeElement);

  const visualSlides = () =>
    [...slides].sort((a, b) => {
      const orderA = Number.parseInt(getComputedStyle(a).order, 10) || 0;
      const orderB = Number.parseInt(getComputedStyle(b).order, 10) || 0;
      return orderA - orderB || slides.indexOf(a) - slides.indexOf(b);
    });

  const setActive = (key, { scroll = true, schedule = true } = {}) => {
    const nextSlide = slidesByKey.get(key);
    if (!nextSlide) return;

    const previousKey = activeKey;
    const previousSlide = slidesByKey.get(previousKey);
    const moveFocus =
      mobile.matches &&
      previousKey !== key &&
      previousSlide?.contains(document.activeElement);

    activeKey = key;
    track.dataset.activeSlide = key;

    for (const dot of dots) {
      if (dot.dataset.heroTarget === key) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    }

    if (mobile.matches) {
      for (const slide of slides) {
        const isActive = slide === nextSlide;
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "слайд");
        slide.setAttribute(
          "aria-label",
          slide.dataset.heroSlide === "price"
            ? "Ориентировочная стоимость"
            : "Описание и преимущества",
        );
        slide.inert = !isActive;
        slide.setAttribute("aria-hidden", String(!isActive));
      }

      if (scroll) {
        const trackLeft = track.getBoundingClientRect().left;
        const slideLeft = nextSlide.getBoundingClientRect().left;
        const left = Math.max(0, track.scrollLeft + slideLeft - trackLeft);
        track.scrollTo({
          left,
          behavior: motionEnabled() ? "smooth" : "instant",
        });
      }
      if (moveFocus) nextSlide.focus({ preventScroll: true });
    }

    if (schedule) scheduleAutoplay();
  };

  function scheduleAutoplay() {
    stopAutoplay();
    if (!canAutoplay()) return;
    timer = window.setTimeout(() => {
      const order = visualSlides().map((slide) => slide.dataset.heroSlide);
      const index = order.indexOf(activeKey);
      const nextKey = order[(index + 1 + order.length) % order.length];
      setActive(nextKey, { scroll: true, schedule: false });
      scheduleAutoplay();
    }, interval);
  }

  const syncMode = () => {
    stopAutoplay();

    if (mobile.matches) {
      if (!wasMobile) {
        activeKey = "copy";
        track.scrollLeft = 0;
      }
      pager.hidden = false;
      track.setAttribute("role", "region");
      track.setAttribute("aria-label", "Главный экран сайта");
      setActive(activeKey, { scroll: false, schedule: false });
    } else {
      pager.hidden = true;
      track.removeAttribute("role");
      track.removeAttribute("aria-label");
      track.removeAttribute("data-active-slide");
      track.scrollTo({ left: 0, behavior: "instant" });
      for (const slide of slides) {
        slide.inert = false;
        slide.removeAttribute("aria-hidden");
        slide.removeAttribute("aria-roledescription");
        slide.removeAttribute("aria-label");
        slide.removeAttribute("role");
      }
    }

    wasMobile = mobile.matches;
    scheduleAutoplay();
  };

  const closestSlideToTrackCenter = () => {
    const center =
      track.getBoundingClientRect().left + track.clientWidth / 2;
    let closest = activeKey;
    let distance = Number.POSITIVE_INFINITY;
    for (const slide of slides) {
      const box = slide.getBoundingClientRect();
      const nextDistance = Math.abs(box.left + box.width / 2 - center);
      if (nextDistance < distance) {
        closest = slide.dataset.heroSlide;
        distance = nextDistance;
      }
    }
    return closest;
  };

  for (const dot of dots) {
    dot.addEventListener("click", () => {
      if (mobile.matches) setActive(dot.dataset.heroTarget);
    });
  }

  track.addEventListener(
    "scroll",
    () => {
      if (!mobile.matches) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        setActive(closestSlideToTrackCenter(), {
          scroll: false,
          schedule: true,
        });
      }, 120);
    },
    { passive: true },
  );

  hero.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href="#foundation-prices"]');
    if (mobile.matches && link) {
      event.preventDefault();
      setActive("price");
    }
  });

  hero.addEventListener("keydown", (event) => {
    if (!mobile.matches || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
      return;
    }
    const order = visualSlides().map((slide) => slide.dataset.heroSlide);
    const index = order.indexOf(activeKey);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextKey = order[(index + direction + order.length) % order.length];
    event.preventDefault();
    setActive(nextKey);
  });

  hero.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") {
      pointerOver = true;
      stopAutoplay();
    }
  });
  hero.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "touch") {
      pointerOver = false;
      scheduleAutoplay();
    }
  });
  hero.addEventListener("focusin", stopAutoplay);
  hero.addEventListener("focusout", () => {
    window.setTimeout(scheduleAutoplay, 0);
  });
  document.addEventListener("visibilitychange", scheduleAutoplay);
  mobile.addEventListener?.("change", syncMode);
  if (!mobile.addEventListener) mobile.addListener(syncMode);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.12;
        scheduleAutoplay();
      },
      { threshold: [0, 0.12] },
    );
    observer.observe(hero);
  }

  const motionObserver = new MutationObserver(scheduleAutoplay);
  motionObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });

  syncMode();
})();
