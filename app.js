"use strict";
// Layout is CSS-driven; JavaScript only handles interaction.
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
  object: "Дом «Классик» — 130 м²",
};
document.querySelectorAll("[data-action]").forEach((button) =>
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "prices") {
      document
        .querySelector("#foundation-prices")
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
    if (action === "video") {
      openDialog(
        "Видео о строительстве",
        "Ссылки на видеоролики не предоставлены. Их необходимо добавить перед публикацией.",
        true,
      );
      return;
    }
    if (action === "vk" || action === "whatsapp") {
      openDialog(
        action === "vk" ? "ВКонтакте" : "WhatsApp",
        "Иконка восстановлена из макета. Точный адрес аккаунта не предоставлен — добавим ссылку после подтверждения владельцем.",
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
      action === "object"
        ? "Газобетонный дом в Академгородке, 130 м². Срок строительства из макета — 5 месяцев, стоимость — 2 800 000 ₽. Заявку можно подготовить ниже."
        : action === "project"
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
  requestAnimationFrame(() =>
    status.scrollIntoView({ block: "nearest", behavior: "instant" }),
  );
  link.addEventListener(
    "click",
    () => setTimeout(() => URL.revokeObjectURL(url), 1000),
    { once: true },
  );
});
// Collapsible navigation uses normal document flow, so text enlargement cannot clip it.
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#main-navigation");
function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
}
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  navigation.classList.toggle("is-open", open);
});
navigation
  .querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && navigation.classList.contains("is-open")) {
    closeMenu();
    menuToggle.focus();
  }
});
// Native scrolling adapts to the actual card size; no hard-coded translation values.
document.querySelectorAll("[data-scroll]").forEach((button) =>
  button.addEventListener("click", () => {
    const track = document.getElementById(button.dataset.target);
    const card = [...track.children].find((el) => !el.hidden);
    if (!card) return;
    const distance =
      card.getBoundingClientRect().width +
      parseFloat(getComputedStyle(track).columnGap);
    track.scrollBy({
      left: distance * Number(button.dataset.scroll),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }),
);
const filters = [...document.querySelectorAll("[data-filter]")];
filters.forEach((button) =>
  button.addEventListener("click", () => {
    const filter = Number(button.dataset.filter);
    filters.forEach((b) =>
      b.setAttribute("aria-pressed", String(b === button)),
    );
    let count = 0;
    document.querySelectorAll("[data-project]").forEach((card) => {
      const area = Number(card.dataset.area),
        material = card.dataset.material;
      const matches = [
        true,
        area <= 100,
        area >= 100 && area <= 150,
        area > 150 && area <= 200,
        area > 200,
        material === "Газобетон",
        material === "Кирпич",
        material === "Каркас",
      ][filter];
      card.hidden = !matches;
      if (matches) count++;
    });
    document.querySelector(".empty-projects").hidden = count > 0;
    document.querySelector("#project-track").hidden = count === 0;
    document.querySelector("#project-track").scrollLeft = 0;
  }),
);
// Four-question demo. No invented price or simulated server submission.
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
  "Узнайте стоимость вашего дома за 2 минуты",
  "Какая площадь дома вам нужна?",
  "Сколько этажей вы планируете?",
  "У вас уже есть участок?",
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
    b.textContent = quizScreens[quizStep][i];
    b.setAttribute("aria-pressed", String(i === 0));
  });
  document.querySelector("#quiz-title").textContent = quizTitles[quizStep];
  document.querySelector("#quiz-step").textContent = `${quizStep + 1} / 4`;
  document.querySelector("#quiz-percent").textContent =
    (quizStep + 1) * 25 + "%";
  document.querySelector("#quiz-progress").value = quizStep + 1;
}
