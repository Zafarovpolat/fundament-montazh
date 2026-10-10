const { engine: chromium, isChromium } = require("./browser.cjs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  // Карусель проектов вынесена со второй ревизии главной страницы
  // (sections/projects.html) — проверяем её на стенде второй страницы.
  const { foundationUrl, routeUrl } = require("./site-url.cjs");
  await p.goto(routeUrl("tests/fixtures/projects-page2.html"));
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
  assert.equal(
    await p.locator('.project-picture[data-active-photo="0"]').count(),
    4,
  );
  const currentProject = await p.evaluate(
    () =>
      document
        .querySelector("#project-track")
        .carousel.currentCard()
        .querySelector("h3").dataset.figmaText,
  );
  await p.waitForTimeout(2300);
  assert.equal(
    await p.evaluate(
      () =>
        document
          .querySelector("#project-track")
          .carousel.currentCard()
          .querySelector("h3").dataset.figmaText,
    ),
    currentProject,
    "the project carousel does not advance without input",
  );
  assert.equal(
    await p.locator("#project-track").getAttribute("data-autoplay-project"),
    null,
  );

  const firstPhoto = track
    .locator(".project-picture")
    .first()
    .locator('[data-photo-index="1"]');
  await firstPhoto.click();
  assert.equal(
    await p.locator('.project-picture[data-active-photo="1"]').count(),
    1,
  );
  assert.equal(
    await p.locator('.project-picture[data-active-photo="0"]').count(),
    3,
  );
  await track
    .locator(".project-picture")
    .first()
    .locator('[data-photo-index="2"]')
    .click();
  assert.equal(
    await p.locator('.project-picture[data-active-photo="2"]').count(),
    1,
  );
  await p.waitForTimeout(2100);
  assert.equal(
    await p.locator('.project-picture[data-active-photo="2"]').count(),
    1,
    "project photos remain on the manually selected frame",
  );

  await p.locator('[data-target="project-track"][data-scroll="1"]').click();
  assert.equal(
    await p.evaluate(
      () =>
        document
          .querySelector("#project-track")
          .carousel.currentCard()
          .querySelector("h3").dataset.figmaText,
    ),
    ids[1],
  );
  await p.locator('[data-target="project-track"][data-scroll="-1"]').click();
  assert.equal(
    await p.evaluate(
      () =>
        document
          .querySelector("#project-track")
          .carousel.currentCard()
          .querySelector("h3").dataset.figmaText,
    ),
    ids[0],
    "project arrows still navigate on demand",
  );
  // После fixture — регрессионные проверки сохранённой страницы «Фундамент».
  await p.goto(foundationUrl);
  assert.equal(await p.locator(".object-card figcaption").count(), 5);
  assert.equal(
    await p.locator(".warning h3").evaluate((e) => e.clientHeight),
    30,
  );
  // Число строк подводок берётся из высоты узла макета: 478:1234 — 44 px
  // (2 строки по 22), 315:770 — 66 px (3 строки при ширине 430 px).
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
    "PASS: fixture фильтров/карусели и сохранённая страница «Фундамент» — подписи, предупреждение, строки описаний и тёмная подложка.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
