const { engine: chromium, isChromium } = require("./browser.cjs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  // Карусель проектов вынесена со второй ревизии главной страницы
  // (sections/projects.html) — проверяем её на стенде второй страницы.
  const base = (process.env.TEST_URL || "http://127.0.0.1:5173").replace(
    /\/$/,
    "",
  );
  await p.goto(`${base}/tests/fixtures/projects-page2.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.locator('[data-filter="5"]').click();
  assert.equal(await p.locator("[data-project]:visible").count(), 0);
  assert.ok(await p.locator(".empty-projects").isVisible());
  await p.locator('[data-filter="0"]').click();
  assert.equal(await p.locator("[data-project]:visible").count(), 4);
  const ids = await p
    .locator("#project-track .project-card h3")
    .evaluateAll((es) => es.map((e) => e.dataset.figmaText));
  const track = p.locator("#project-track");
  await track.scrollIntoViewIfNeeded();
  await p.mouse.move(0, 0);
  await p.waitForFunction(
    () =>
      document.querySelector("#project-track .project-picture").dataset
        .activePhoto === "1",
    null,
    { timeout: 8000 },
  );
  assert.equal(
    await p.locator('.project-picture[data-active-photo="1"]').count(),
    1,
  );
  assert.equal(
    await p.locator('.project-picture[data-active-photo="0"]').count(),
    3,
  );
  await p.waitForFunction(
    () =>
      document.querySelector("#project-track .project-picture").dataset
        .activePhoto === "2",
    null,
    { timeout: 8000 },
  );
  await p.waitForFunction(
    (id) =>
      document.querySelector("#project-track").dataset.autoplayProject === id,
    ids[1],
    { timeout: 8000 },
  );
  assert.equal(
    await p
      .locator("#project-track .project-card h3")
      .first()
      .getAttribute("data-figma-text"),
    ids[1],
  );
  assert.equal(
    await p.locator('.project-picture[data-active-photo="0"]').count(),
    4,
  );
  await p.waitForFunction(
    () =>
      document.querySelector("#project-track .project-picture").dataset
        .activePhoto === "1",
    null,
    { timeout: 8000 },
  );
  assert.equal(
    await p.locator('.project-picture[data-active-photo="1"]').count(),
    1,
  );
  // Дальше — проверки главной страницы, на неё и возвращаемся.
  await p.goto(base);
  assert.equal(await p.locator(".object-card figcaption").count(), 5);
  assert.equal(
    await p.locator(".warning h3").evaluate((e) => e.clientHeight),
    30,
  );
  // Число строк подводок берётся из высоты узла макета: 478:1234 — 44 px
  // (2 строки по 22), 315:770 — 66 px (3 строки по 22).
  for (const [selector, lines] of [
    ["#projects .with-yellow-rule", 2],
    ["#advantages .with-yellow-rule", 3],
  ]) {
    assert.ok(
      await p
        .locator(selector)
        .evaluate(
          (e, n) =>
            Math.abs(
              e.clientHeight -
                n * parseFloat(getComputedStyle(e).lineHeight),
            ) < 2,
          lines,
        ),
      selector + " " + lines + " lines",
    );
  }
  assert.equal(
    await p
      .locator("#objects .heading-description")
      .evaluate((e) => getComputedStyle(e, "::before").content),
    "none",
  );
  assert.equal(
    await p
      .locator("#director .parallax-surface")
      .evaluate((e) => getComputedStyle(e, "::after").content),
    '""',
  );
  await browser.close();
  console.log(
    "PASS: стенд второй страницы (фильтры, 0→1→2, поворот карусели), главной — пять подписей, одна строка warning, описания в 2 и 3 строки по высоте узлов макета, тёмная подложка.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
