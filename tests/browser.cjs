// Единая точка выбора браузера для проверок: PW_BROWSER=chromium|firefox|webkit.
// Chromium — по умолчанию; Firefox и WebKit нужны для пункта 1 чек-листа
// (кроссбраузерность), Safari/Opera/Яндекс.Браузер используют те же движки.
const playwright = require("playwright");
const name = (process.env.PW_BROWSER || "chromium").toLowerCase();
const map = {
  chromium: playwright.chromium,
  firefox: playwright.firefox,
  webkit: playwright.webkit,
};
// Движки сходятся после смены viewport по-разному: в WebKit пересчёт layout
// и договоривание transition укладываются не в фиксированные 70–100 мс, а в
// 1–2 кадра. Поэтому ждём условие, а не паузу; timeout означает реальный баг.
async function settle(page, predicate, { timeout = 2500, step = 60 } = {}) {
  const started = Date.now();
  for (;;) {
    if (await page.evaluate(predicate)) return true;
    if (Date.now() - started > timeout) return false;
    await page.waitForTimeout(step);
  }
}

// Ленивые изображения Firefox и WebKit не подгружают, пока они не рядом с
// вьюпортом: без этого naturalWidth = 0 и сравнение пропорций бессмысленно.
async function loadImage(page, selector) {
  await page.evaluate(async (sel) => {
    const img = document.querySelector(sel);
    if (!img || img.complete) return;
    img.scrollIntoView({ block: "center" });
    await new Promise((done) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      setTimeout(done, 4000);
    });
  }, selector);
}

module.exports = {
  engine: map[name] || playwright.chromium,
  name: map[name] ? name : "chromium",
  isChromium: !map[name] || name === "chromium",
  settle,
  loadImage,
};
