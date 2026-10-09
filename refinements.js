"use strict";
// Advantage and review carousels advance only through explicit user input.
// Native details semantics, with reversible height animation in normal document flow.
document.querySelectorAll(".faq-grid details").forEach((details) => {
  const summary = details.querySelector("summary");
  let animation = null,
    expanded = details.open;
  summary.addEventListener("click", (event) => {
    event.preventDefault();
    expanded = !expanded;
    details.dataset.expanded = String(expanded);
    const start = details.getBoundingClientRect().height;
    animation?.cancel();
    details.style.height = "";
    details.open = true;
    const end = expanded
      ? details.getBoundingClientRect().height
      : summary.getBoundingClientRect().height;
    if (window.siteMotion?.enabled === false) {
      details.open = expanded;
      return;
    }
    animation = details.animate(
      [{ height: start + "px" }, { height: end + "px" }],
      { duration: 420, easing: "cubic-bezier(.22,.8,.25,1)" },
    );
    animation.onfinish = () => {
      details.open = expanded;
      details.style.height = "";
      animation = null;
    };
  });
});
