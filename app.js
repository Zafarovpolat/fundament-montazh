"use strict";
// Layout is CSS-driven; JavaScript only handles interaction.
const dialog = document.querySelector("#contact-dialog");
const title = document.querySelector("#dialog-title");
const description = document.querySelector("#dialog-description");
const form = document.querySelector("#contact-form");
const phoneInput = form.querySelector('input[name="phone"]');
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
    if (action === "reviews") {
      openDialog(
        "Отзывы на 2ГИС",
        "Рейтинг и оформление перенесены из макета. Точная ссылка на карточку компании пока не предоставлена.",
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
    if (action === "video") {
      openDialog(
        "Видео о строительстве",
        "Ссылка на видеоролик в макете не указана. Когда появится подтверждённый адрес, видео можно будет открыть здесь.",
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
function formatRussianPhone(value) {
  let digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits[0] === "8") digits = `7${digits.slice(1)}`;
  else if (digits[0] !== "7") digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const local = digits.slice(1);
  let formatted = "+7";
  if (local.length) formatted += ` (${local.slice(0, 3)}`;
  if (local.length >= 3) formatted += ")";
  if (local.length > 3) formatted += ` ${local.slice(3, 6)}`;
  if (local.length > 6) formatted += `-${local.slice(6, 8)}`;
  if (local.length > 8) formatted += `-${local.slice(8, 10)}`;
  return formatted;
}

function phoneCaretForDigitCount(value, count) {
  if (count <= 0) return value.length ? Math.min(2, value.length) : 0;
  let seen = 0;
  for (let index = 0; index < value.length; index++) {
    if (/\d/.test(value[index]) && ++seen >= count) return index + 1;
  }
  return value.length;
}

function applyPhoneMask(input) {
  const previous = input.value;
  const selection = input.selectionStart ?? previous.length;
  const digitsBefore = (previous.slice(0, selection).match(/\d/g) || []).length;
  const digitsTotal = (previous.match(/\d/g) || []).length;
  const hasCountryPrefix = /^\s*(?:\+|7|8)/.test(previous);
  const caretDigits = Math.min(
    11,
    digitsBefore + (digitsTotal && !hasCountryPrefix ? 1 : 0),
  );
  input.value = formatRussianPhone(previous);
  const caret = phoneCaretForDigitCount(input.value, caretDigits);
  input.setSelectionRange(caret, caret);
}

phoneInput.addEventListener("beforeinput", (event) => {
  if (event.isComposing || event.inputType.startsWith("delete") || !event.data)
    return;
  if (/[^\d+()\s-]/u.test(event.data)) event.preventDefault();
});
phoneInput.addEventListener("paste", (event) => {
  const pasted = event.clipboardData?.getData("text") || "";
  if (/[^\d+()\s-]/u.test(pasted)) event.preventDefault();
});
phoneInput.addEventListener("input", () => applyPhoneMask(phoneInput));
if (phoneInput.value) applyPhoneMask(phoneInput);

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
// Responsive full-screen navigation is managed in header.js.
// The source-aligned carousels are implemented in sliders.js.
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
    // Свойство, а не атрибут: [hidden] совпадает и с hidden="false".
    const empty = document.querySelector(".empty-projects");
    if (empty) empty.hidden = count > 0;
    const track = document.querySelector("#project-track");
    if (track) {
      track.hidden = count === 0;
      track.scrollLeft = 0;
    }
  }),
);
// Four-question demo. No invented price or simulated server submission.
const isHomePage = document.body.dataset.page === "home";
const foundationQuizScreens = [
  [
    "Ленточный фундамент",
    "Монолитная плита",
    "Свайный фундамент",
    "Не знаю — помогите выбрать",
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
const homeQuizScreens = [
  [
    "Кирпич (надёжность, статус)",
    "Газобетон (тепло, доступно)",
    "Клеёный брус (натуральность, премиум)",
    "Каркас (быстро, бюджетно)",
  ],
  ["До 100 м²", "100–150 м²", "150–200 м²", "200+ м²"],
  ["Один этаж", "Два этажа", "С мансардой", "Нужна консультация"],
  [
    "Участок уже есть",
    "Подбираю участок",
    "Нужна помощь с участком",
    "Пока планирую",
  ],
];
const quizScreens = isHomePage ? homeQuizScreens : foundationQuizScreens;
// Вопросы квиза соответствуют странице; сами ответы не конвертируются в цену.
const foundationQuizQuestions = [
  "Какой тип фундамента вас интересует?",
  "Какая площадь дома вам нужна?",
  "Сколько этажей вы планируете?",
  "У вас уже есть участок?",
];
const homeQuizQuestions = [
  "Какую технологию строительства вы рассматриваете?",
  "Какая площадь дома вам нужна?",
  "Сколько этажей вы планируете?",
  "У вас уже есть участок?",
];
const quizQuestions = isHomePage ? homeQuizQuestions : foundationQuizQuestions;
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
  document.querySelector("#quiz-question").textContent =
    quizQuestions[quizStep];
  document.querySelector("#quiz-step").textContent = String(quizStep + 1);
  document.querySelector("#quiz-percent").textContent =
    (quizStep + 1) * 25 + "%";
  document.querySelector("#quiz-progress").value = quizStep + 1;
}
