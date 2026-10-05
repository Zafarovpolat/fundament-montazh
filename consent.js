"use strict";
/**
 * Согласие на использование cookie (макет 440:1632) + точка подключения аналитики.
 *
 * Решение хранится в localStorage (не в cookie — иначе сам факт отслеживания
 * появлялся бы до согласия). VERSION меняется при правке текста политики:
 * при новой версии плашка показывается снова.
 *
 * Счётчики подключаются только при analytics === true: слушают событие
 * `site:consent` или читают window.siteConsent перед вставкой скрипта.
 */
(() => {
  const KEY = "fm:cookie-consent";
  const VERSION = "1";
  const banner = document.querySelector("[data-consent-banner]");

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      return saved && saved.version === VERSION ? saved : null;
    } catch (_) {
      return null;
    }
  }

  function state() {
    const saved = read();
    return saved || { version: VERSION, analytics: null, decidedAt: null };
  }

  function publish(next) {
    window.siteConsent = next;
    document.dispatchEvent(new CustomEvent("site:consent", { detail: next }));
  }

  function save(patch) {
    const next = Object.assign(state(), patch, {
      version: VERSION,
      decidedAt: new Date().toISOString(),
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (_) {
      /* приватный режим: решение живёт до перезагрузки страницы */
    }
    publish(next);
    hide();
  }

  function hide() {
    document.documentElement.classList.remove("cookie-shown");
    window.setTimeout(() => {
      if (!document.documentElement.classList.contains("cookie-shown")) {
        banner.hidden = true;
      }
    }, 320);
  }

  function show() {
    banner.hidden = false;
    // Кадр ожидания нужен, чтобы transition-состояние успело примениться.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.documentElement.classList.add("cookie-shown"),
      ),
    );
  }

  const current = state();
  publish(current);

  banner.addEventListener("click", (event) => {
    const action = event.target.closest(
      "[data-consent-accept],[data-consent-decline],[data-consent-dismiss]",
    );
    if (!action) return;
    if (action.hasAttribute("data-consent-accept")) save({ analytics: true });
    else if (action.hasAttribute("data-consent-decline"))
      save({ analytics: false });
    else
      save({
        analytics: current.analytics === null ? false : current.analytics,
      });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !banner.hidden)
      save({
        analytics: current.analytics === null ? false : current.analytics,
      });
  });

  // Отложенный показ: не перекрываем hero в момент первой отрисовки.
  if (current.analytics === null) {
    window.setTimeout(() => {
      if (!banner.hidden) return;
      show();
    }, 1200);
  }

  /** Явный сброс для будущих настроек приватности: window.siteConsent.reset(). */
  window.siteConsentReset = () => {
    try {
      localStorage.removeItem(KEY);
    } catch (_) {}
    show();
  };
})();
