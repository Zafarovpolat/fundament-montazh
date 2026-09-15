"use strict";
/** Responsive artboard scaling; no runtime libraries or network dependencies. */
const canvas = document.querySelector(".site-canvas");
function resizeCanvas() {
  document.documentElement.style.setProperty(
    "--canvas-scale",
    Math.min(window.innerWidth / 1920, 1.25),
  );
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas, { passive: true });
const dialog = document.querySelector("#contact-dialog");
const title = document.querySelector("#dialog-title");
const description = document.querySelector("#dialog-description");
const form = document.querySelector("#contact-form");
const info = document.querySelector("#info-content");
const status = document.querySelector(".form-status");
let lastFocus;
function openDialog(heading, text, information = false) {
  lastFocus = document.activeElement;
  title.textContent = heading;
  description.textContent = text;
  form.hidden = information;
  form.style.display = information ? "none" : "grid";
  info.hidden = !information;
  info.replaceChildren();
  status.replaceChildren();
  dialog.showModal();
}
function closeDialog() {
  dialog.close();
  lastFocus?.focus();
}
document.querySelector(".dialog-close").addEventListener("click", closeDialog);
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeDialog();
  }
});
let timer;
function notify(message) {
  const el = document.querySelector(".toast");
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("is-visible"), 4500);
}
const headings = {
  quote: "Рассчитать стоимость",
  mortgage: "Условия ипотеки",
  visit: "Записаться на экскурсию",
  question: "Задать вопрос",
  project: "Проект «Уют» — 100 м²",
};
document.querySelectorAll("[data-action]").forEach((button) =>
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "prices") {
      document
        .querySelector('[data-node="360:613"]')
        .scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (action === "catalog") {
      document.querySelector("#projects").scrollIntoView();
      notify("Показаны все проекты, представленные в макете.");
      return;
    }
    if (action === "objects") {
      document.querySelector("#objects").scrollIntoView();
      notify(
        "Показаны объекты из макета. Полный каталог пока не предоставлен.",
      );
      return;
    }
    if (action === "quiz-next") {
      nextQuiz();
      return;
    }
    if (action === "legal") {
      openDialog(
        button.textContent.trim(),
        "Юридический документ не приложен к макету. Его необходимо добавить до публикации рабочего сайта.",
        true,
      );
      return;
    }
    if (action === "social") {
      openDialog(
        "Социальные сети",
        "Точные ссылки на аккаунты не приложены к макету. Они будут подключены после подтверждения владельцем.",
        true,
      );
      return;
    }
    openDialog(
      headings[action] || "Связаться с нами",
      action === "project"
        ? "Каркасный дом, 100 м², 1 этаж, 3 комнаты. Цена из макета — от 2 100 000 ₽. Уточните комплектацию и актуальную стоимость."
        : "Демонстрационная форма. Можно подготовить и скачать заявку; автоматическая отправка не подключена.",
    );
  }),
);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const text = `${title.textContent}\nИмя: ${data.get("name")}\nТелефон: ${data.get("phone")}\nО проекте: ${data.get("message")}\n${quizAnswers.length ? "Расчёт: " + quizAnswers.join("; ") : ""}`;
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "Заявка-ФундаментМонтаж.txt";
  link.textContent = "Скачать заявку";
  status.replaceChildren(
    document.createTextNode("Заявка подготовлена, но не отправлена. "),
    link,
  );
  link.addEventListener(
    "click",
    () => setTimeout(() => URL.revokeObjectURL(url), 1000),
    { once: true },
  );
});
const faqAnswers = [
  "В макете проект «Уют» 100 м² указан от 2 100 000 ₽. Окончательная стоимость зависит от проекта, участка и комплектации и фиксируется в договоре.",
  "В макете указано: при заключении договора на строительство проект — в подарок. Подробные условия необходимо уточнить у компании.",
  "Состав работ и комплектация согласовываются до начала строительства и фиксируются в договоре. Запросите подробную смету для вашего проекта.",
  "До начала работ составляется график строительства, сроки закрепляются в договоре.",
  "В макете указана аккредитация в ДОМ.РФ и Сбербанке. Актуальные ставки и условия уточняются в банке; условия макета не являются офертой.",
  "Регион работы, указанный в макете: Новосибирск и Новосибирская область. Доступность конкретного района уточните у компании.",
  "Да, в макете предусмотрена запись на экскурсию. Нажмите «Записаться на экскурсию» и подготовьте заявку.",
  "Согласно описанию в макете, при неизменных проекте и объёме работ согласованная стоимость остаётся прежней. Все условия закрепляются в договоре.",
];
document.querySelectorAll("[data-faq]").forEach((button) =>
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") === "true";
    document.querySelectorAll("[data-faq]").forEach((b) => {
      b.classList.remove("is-open");
      b.setAttribute("aria-expanded", "false");
      b.querySelector(".faq-answer")?.remove();
    });
    if (!open) {
      button.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      const answer = document.createElement("span");
      answer.className = "faq-answer";
      answer.textContent = faqAnswers[Number(button.dataset.faq)];
      button.append(answer);
    }
  }),
);
const filterButtons = [...document.querySelectorAll("[data-filter]")];
filterButtons.forEach((button) =>
  button.addEventListener("click", () => {
    const filter = Number(button.dataset.filter);
    filterButtons.forEach((b) =>
      b.setAttribute("aria-pressed", String(b === button)),
    );
    const show = [0, 1, 2, 7].includes(filter);
    document
      .querySelectorAll("[data-project]")
      .forEach((card) => (card.hidden = !show));
    document.querySelector(".empty-projects")?.remove();
    if (!show) {
      const text = document.createElement("p");
      text.className = "empty-projects";
      text.textContent = "В макете нет проектов по этому фильтру.";
      document.querySelector("#projects").append(text);
    }
  }),
);
// The source contains only the first screen. Subsequent questions are a functional demo.
const quizScreens = [
  [
    "Газобетон (тепло, доступно)",
    "Кирпич (надёжность, статус)",
    "Клееный брус (натуральность, премиум)",
    "Каркас (быстро, бюджетно)",
  ],
  ["До 100 м²", "100–150 м²", "150–200 м²", "Более 200 м²"],
  ["Один этаж", "Два этажа", "С мансардой", "Нужна консультация"],
  [
    "Участок уже есть",
    "Подбираю участок",
    "Нужна помощь с участком",
    "Пока планирую",
  ],
];
const quizTitles = [
  "Узнайте стоимость вашего\nдома за 2 минуты",
  "Какая площадь дома\nвам нужна?",
  "Сколько этажей\nвы планируете?",
  "У вас уже есть\nучасток?",
];
let quizStep = 0,
  quizSelected = 0;
const quizAnswers = [];
const options = [...document.querySelectorAll("[data-quiz-option]")];
options.forEach((button) =>
  button.addEventListener("click", () => {
    quizSelected = Number(button.dataset.quizOption);
    options.forEach((b) =>
      b.setAttribute("aria-pressed", String(b === button)),
    );
  }),
);
function nextQuiz() {
  quizAnswers[quizStep] = quizScreens[quizStep][quizSelected];
  if (quizStep === 3) {
    openDialog(
      "Ваш расчёт почти готов",
      "Вы выбрали: " +
        quizAnswers.join(" · ") +
        ". Подготовьте заявку для индивидуального расчёта. Данные не отправляются автоматически.",
    );
    return;
  }
  quizStep++;
  quizSelected = 0;
  options.forEach((b, i) => {
    b.querySelector(".copy").textContent = quizScreens[quizStep][i];
    b.setAttribute("aria-pressed", String(i === 0));
  });
  document.querySelector('[data-node="315:361"]').innerText =
    quizTitles[quizStep];
  document.querySelector('[data-node="315:368"]').textContent = quizStep + 1;
  document.querySelector('[data-node="315:371"]').textContent =
    (quizStep + 1) * 25 + "%";
}
// Keep single-line labels inside their Figma boxes when a local font is unavailable.
function fitLabels() {
  document.querySelectorAll(".copy").forEach((el) => {
    if (getComputedStyle(el).whiteSpace === "nowrap") {
      el.style.transform = "";
      const width = el.clientWidth;
      if (el.scrollWidth > width && width > 0)
        el.style.transform = `scaleX(${width / el.scrollWidth})`;
    }
  });
}
fitLabels();
document.fonts.ready.then(fitLabels);
// Accessible carousel controls sit over the exported arrow artwork.
[
  { art: ".n-315-668", track: "315:673", step: 560 },
  { art: ".n-315-450", track: "315:445", step: 557 },
  { art: ".n-315-738", track: "315:743", step: 554 },
].forEach(({ art, track, step }) => {
  const image = document.querySelector(art),
    strip = document.querySelector(`[data-node="${track}"]`);
  if (!image || !strip) return;
  strip.classList.add("slider-track");
  let index = 0;
  const controls = document.createElement("div");
  controls.className = "slider-controls";
  const style = getComputedStyle(image);
  ["left", "top", "width", "height"].forEach(
    (k) => (controls.style[k] = style[k]),
  );
  [-1, 1].forEach((direction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      direction < 0 ? "Предыдущие карточки" : "Следующие карточки",
    );
    button.addEventListener("click", () => {
      index = Math.max(0, Math.min(1, index + direction));
      strip.style.transform = `translateX(${-step * index}px)`;
    });
    controls.append(button);
  });
  image.after(controls);
});
