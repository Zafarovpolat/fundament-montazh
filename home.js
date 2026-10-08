"use strict";

// Accessible single-panel selector. Prices are displayed only where the Figma
// frame actually provides a value; no numbers are inferred for other systems.
(() => {
  const tabs = [...document.querySelectorAll("[data-home-tech]")];
  const panel = document.getElementById("home-tech-panel");
  const title = document.getElementById("home-tech-title");
  const facts = document.getElementById("home-tech-facts");
  if (!tabs.length || !panel || !title || !facts) return;

  function activate(tab, moveFocus = false) {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    title.textContent = tab.textContent.trim();
    panel.setAttribute("aria-labelledby", tab.id);
    facts.hidden = tab.dataset.homeTech !== "gas";
    if (moveFocus) tab.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (event) => {
      const direction =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? -1
            : 0;
      if (!direction && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + direction + tabs.length) % tabs.length;
      activate(tabs[next], true);
    });
  });
})();
