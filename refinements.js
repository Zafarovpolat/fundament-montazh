"use strict";
// Shared carousel engine; independent clocks for advantages and reviews.
for (const id of ["advantage-track", "review-track"]) {
  const track = document.getElementById(id);
  if (!track) continue; // карусели преимуществ/отзывов есть не на каждой странице
  let visible = false,
    busy = false,
    interacting = false;
  new IntersectionObserver((es) => (visible = es[0].isIntersecting), {
    threshold: 0.1,
  }).observe(track);
  track.addEventListener("pointerdown", () => (interacting = true));
  window.addEventListener("pointerup", () => (interacting = false));
  window.addEventListener("pointercancel", () => (interacting = false));
  setInterval(
    async () => {
      if (
        !visible ||
        busy ||
        interacting ||
        document.hidden ||
        window.siteMotion?.enabled === false ||
        track.matches(":focus-within")
      )
        return;
      busy = true;
      const loop = track.carousel.advanceLoop();
      if (id === "advantage-track")
        track.dispatchEvent(new Event("carouselchange"));
      await loop;
      if (id === "advantage-track")
        track.dispatchEvent(new Event("carouselchange"));
      busy = false;
    },
    id === "advantage-track" ? 3200 : 5000,
  );
}
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
