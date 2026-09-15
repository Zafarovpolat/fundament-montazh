const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
fs.mkdirSync("tests/artifacts", { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [],
    failed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  const base = process.env.TEST_URL || "http://127.0.0.1:5173";
  // 960/640px also cover the layout viewport of a 1920px window at 200/300% zoom.
  const widths = [
    320, 375, 390, 480, 640, 768, 960, 1024, 1100, 1280, 1440, 1920, 2560, 3840,
  ];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
      const box = document
        .querySelector(".hero .container")
        .getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
        box: box.toJSON(),
        overflow: getComputedStyle(document.body).overflowX,
      };
    });
    assert.equal(metrics.scroll, width, `Document overflows at ${width}px`);
    assert.ok(
      Math.abs(metrics.box.left - (width - metrics.box.right)) <= 1,
      `Container not centered at ${width}px`,
    );
    assert.ok(metrics.box.width <= 1661, "Container exceeds max-width");
    assert.notEqual(
      metrics.overflow,
      "hidden",
      "Must not conceal document overflow",
    );
    if (width === 390 || width === 1920) {
      await page.locator("img").evaluateAll((es) =>
        Promise.all(
          es
            .filter((e) => {
              const b = e.getBoundingClientRect();
              return b.width && b.top < 1000;
            })
            .map((e) => e.decode().catch(() => {})),
        ),
      );
      await page.screenshot({ path: `tests/artifacts/viewport-${width}.png` });
    }
  }
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(await page.locator(".site-canvas").count(), 0);
  const fontStates = await page.evaluate(async () => {
    const faces = [...document.fonts];
    await Promise.all(faces.map((f) => f.load()));
    return faces.map((f) => f.status);
  });
  assert.equal(fontStates.length, 18);
  assert.ok(fontStates.every((s) => s === "loaded"));
  const borders = await page.locator(".footer-legal").evaluate((e) => {
    const s = getComputedStyle(e);
    return [
      s.borderTopWidth,
      s.borderRightWidth,
      s.borderBottomWidth,
      s.borderLeftWidth,
    ];
  });
  assert.deepEqual(borders, ["1px", "0px", "0px", "0px"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.locator(".menu-toggle").click();
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "true",
  );
  await page.locator('#main-navigation a[href="#projects"]').click();
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  await page.locator('#hero [data-action="quote"]').first().click();
  assert.ok(await page.locator("dialog").evaluate((e) => e.open));
  await page.locator('[name="name"]').fill("Тест");
  await page.locator('[name="phone"]').fill("+7 (999) 123-45-67");
  await page.locator(".consent input").check();
  await page.locator('[type="submit"]').click();
  assert.match(await page.locator(".form-status").innerText(), /не отправлена/);
  await page.keyboard.press("Escape");
  await page.locator('[data-filter="5"]').click();
  assert.equal(await page.locator("[data-project]:visible").count(), 0);
  assert.ok(await page.locator(".empty-projects").isVisible());
  await page.locator('[data-filter="0"]').click();
  assert.equal(await page.locator("[data-project]:visible").count(), 4);
  await page.locator('[data-target="project-track"][data-scroll="1"]').click();
  await page.waitForFunction(
    () => document.querySelector("#project-track").scrollLeft > 50,
  );
  const initialHeight = await page
    .locator(".faq-grid")
    .evaluate((e) => e.getBoundingClientRect().height);
  await page.locator(".faq-grid summary").first().click();
  assert.ok(
    await page
      .locator(".faq-grid details")
      .first()
      .evaluate((e) => e.open),
  );
  assert.ok(
    (await page
      .locator(".faq-grid")
      .evaluate((e) => e.getBoundingClientRect().height)) > initialHeight,
    "FAQ must expand in document flow",
  );
  for (let i = 0; i < 4; i++)
    await page.locator('[data-action="quiz-next"]').click();
  assert.ok(await page.locator("dialog").evaluate((e) => e.open));
  await page.keyboard.press("Escape");
  // Stress-test content reflow without concealing overflow or reducing fonts.
  await page
    .locator("#hero h1")
    .evaluate(
      (e) =>
        (e.textContent =
          "Фундамент под ключ в Новосибирске и Новосибирской области — проектирование и строительство для вашего участка"),
    );
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  console.log(
    "PASS: 14 viewport widths, centered max-width container, no page overflow, 18 fonts, footer border, mobile menu, form, filters, carousel, flowing FAQ, quiz, long-title reflow.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
