"use strict";
// Shared carousel engine; independent clocks for advantages and reviews.
for (const id of ["advantage-track", "review-track"]) {
  const track = document.getElementById(id);
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
      await track.carousel.advanceLoop();
      busy = false;
    },
    id === "advantage-track" ? 3200 : 5000,
  );
}
// Extra steps are illustrative copy requested by the owner, not source Figma data.
(() => {
  const input = document.querySelector(".process-range input");
  const list = document.querySelector(".process-list"),
    item = list.querySelector("li");
  const steps = [
    ["Звонок и консультация", "Бесплатно, без обязательств"],
    [
      "Участок и проект",
      "Изучаем участок, проводим геологию и согласовываем проект дома.",
    ],
    [
      "Смета и договор",
      "Обсуждаем комплектацию, фиксируем стоимость, сроки и порядок работ.",
    ],
    [
      "Устройство фундамента",
      "Готовим площадку и выполняем фундамент по согласованному проекту.",
    ],
    [
      "Строительство дома",
      "Возводим стены и кровлю, выполняем инженерные и отделочные работы.",
    ],
    [
      "Приёмка и новоселье",
      "Проверяем выполненные работы, передаём документы и ключи от дома.",
    ],
  ];
  let active = 0,
    revision = 0,
    animation = null;
  input.setAttribute("aria-valuetext", "Шаг 1 из 6: " + steps[0][0]);
  input.addEventListener("input", async () => {
    const next = Math.min(5, Math.round(Number(input.value) / 20));
    input.setAttribute(
      "aria-valuetext",
      `Шаг ${next + 1} из 6: ${steps[next][0]}`,
    );
    if (next === active) return;
    active = next;
    const token = ++revision;
    animation?.cancel();
    const motion = window.siteMotion?.enabled !== false;
    if (motion) {
      animation = item.animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(-8px)" },
        ],
        { duration: 120, fill: "forwards" },
      );
      await animation.finished.catch(() => {});
    }
    if (token !== revision) return;
    item.querySelector(".process-number").textContent = String(
      next + 1,
    ).padStart(2, "0");
    item.querySelector("h3").textContent = steps[next][0];
    item.querySelector("p").textContent = steps[next][1];
    list.dataset.step = String(next);
    animation?.cancel();
    if (motion)
      animation = item.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 300, easing: "ease-out" },
      );
  });
})();
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
