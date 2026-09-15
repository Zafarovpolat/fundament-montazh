const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.evaluate(() => document.fonts.ready);
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
  assert.equal(await p.locator(".object-card figcaption").count(), 5);
  assert.equal(
    await p.locator(".warning h3").evaluate((e) => e.clientHeight),
    30,
  );
  for (const selector of [
    "#projects .with-yellow-rule",
    "#advantages .with-yellow-rule",
  ]) {
    assert.ok(
      await p
        .locator(selector)
        .evaluate(
          (e) =>
            Math.abs(
              e.clientHeight - 2 * parseFloat(getComputedStyle(e).lineHeight),
            ) < 2,
        ),
      selector + " two lines",
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
    "PASS: exclusive photo autoplay 0→1→2, carousel rotation to project 2, second photo sequence, five captions, one-line warning, two-line descriptions, dark overlay.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
