const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
fs.mkdirSync("tests/artifacts", { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const failed = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await page
    .locator("img")
    .evaluateAll((es) =>
      Promise.all(
        es
          .filter((e) => e.getBoundingClientRect().top < 1080)
          .map((e) => e.decode().catch(() => {})),
      ),
    );
  await page.screenshot({ path: "tests/artifacts/desktop.png" });
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(
    await page.locator(".site-canvas").evaluate((e) => e.offsetHeight),
    15963,
  );
  await page.locator('[data-action="quote"]').first().click();
  assert.equal(await page.locator("dialog").evaluate((e) => e.open), true);
  await page.locator("[name=name]").fill("Тест");
  await page.locator("[name=phone]").fill("+7 (999) 123-45-67");
  await page.locator(".consent input").check();
  await page.locator("[type=submit]").click();
  assert.match(await page.locator(".form-status").innerText(), /не отправлена/);
  await page.keyboard.press("Escape");
  await page.locator('[data-filter="5"]').click();
  assert.equal(await page.locator("[data-project]:visible").count(), 0);
  await page.locator('[data-filter="0"]').click();
  assert.equal(await page.locator("[data-project]:visible").count(), 4);
  await page.locator('[data-faq="0"]').click();
  assert.equal(
    await page.locator('[data-faq="0"]').getAttribute("aria-expanded"),
    "true",
  );
  await page.locator('[data-faq="0"]').click();
  for (let i = 0; i < 4; i++)
    await page.locator('[data-action="quiz-next"]').click();
  assert.equal(await page.locator("dialog").evaluate((e) => e.open), true);
  await page.keyboard.press("Escape");
  await page.locator("#projects .slider-controls button").last().click();
  assert.match(
    await page.locator('[data-node="315:673"]').getAttribute("style"),
    /-560/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.screenshot({ path: "tests/artifacts/mobile.png" });
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  console.log(
    "PASS: page height, h1, contact dialog, form, filters, FAQ, quiz, carousel, mobile overflow, no JS errors or HTTP errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
