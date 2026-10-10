const { engine: chromium, isChromium } = require("./browser.cjs");
const assert = require("node:assert/strict");
const { foundationUrl } = require("./site-url.cjs");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "reduce",
  });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(foundationUrl);
  await p.evaluate(() => document.fonts.ready);
  // В новой ревизии макета «эйброу» с точкой вернулся в секции «Что входит»
  // (узел 478:1233) и вернётся в «7 шагов»; в остальных секциях его нет.
  assert.deepEqual(
    await p
      .locator("main .eyebrow")
      .evaluateAll((es) => es.map((e) => e.dataset.figmaText)),
    ["478:1233", "315:354", "315:547"],
  );
  const label = p.locator(".price-panel .button-label"),
    button = p.locator(".price-panel>.button");
  let l = await label.boundingBox(),
    r = await button.boundingBox();
  assert.ok(Math.abs(l.x + l.width / 2 - r.x - r.width / 2) < 2);
  assert.equal(
    await p
      .locator(".warning")
      .evaluate((e) => getComputedStyle(e).borderLeftWidth),
    "0px",
  );
  assert.equal(
    await p
      .locator(".warning h3")
      .evaluate((e) => getComputedStyle(e).textTransform),
    "uppercase",
  );
  assert.equal(
    await p
      .locator(".number-list li")
      .first()
      .evaluate((e) => getComputedStyle(e, "::before").color),
    "rgb(255, 255, 255)",
  );
  assert.ok(
    (
      await p
        .locator(".path-line")
        .evaluate((e) => getComputedStyle(e, "::before").backgroundImage)
    ).includes("255, 255, 255"),
  );
  // Смена фото внутри карусели проектов проверяется на стенде второй страницы
  // (tests/sequential.cjs) — на главной секция заменена статичной сеткой.
  const card = p.locator(".foundation-card__media").first();
  await card.scrollIntoViewIfNeeded();
  assert.equal(await p.locator(".foundation-card__img[srcset]").count(), 6);
  assert.ok(
    await card
      .locator("img")
      .evaluate((e) => e.currentSrc.includes("assets/figma-476-")),
  );
  const gallery = p.locator(".objects-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await p.mouse.move(0, 0);
  const source = p.locator(".source-object"),
    side = p.locator('[data-object-index="0"]');
  const oldWidth = (await side.boundingBox()).width;
  await side.hover();
  await p.waitForFunction(
    () =>
      document.querySelector(".objects-gallery").dataset.activeObject === "0",
  );
  await p.waitForFunction(
    (w) =>
      document.querySelector('[data-object-index="0"]').getBoundingClientRect()
        .width >
      w + 150,
    oldWidth,
  );
  await p.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".source-object figcaption"))
        .opacity === "0",
  );
  assert.equal(
    await source
      .locator("figcaption")
      .evaluate((e) => getComputedStyle(e).opacity),
    "0",
  );
  assert.equal(await p.locator("dialog[open]").count(), 0);
  await source.hover();
  await p.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".source-object figcaption"))
        .opacity === "1",
  );
  await p.waitForFunction(
    () =>
      document.querySelector(".source-object").getBoundingClientRect().width >
      530,
  );
  assert.ok(
    await source
      .locator("h3")
      .evaluate((e) => e.scrollWidth <= e.parentElement.clientWidth + 1),
    "Full title must not be clipped",
  );
  const dr = await p.locator("#director").boundingBox();
  const portrait = p.locator("#director .director-portrait");
  const photo = await p.locator(".director-photo").boundingBox();
  assert.equal(await portrait.evaluate((e) => getComputedStyle(e).marginTop), "100px");
  assert.ok(photo.y < dr.y, "portrait still protrudes slightly above the section");
  assert.deepEqual(errors, []);
  await b.close();
  console.log(
    "PASS: centered CTA, eyebrow only where the new mockup has it, warning, white list numbers, themed path, project autoplay/dots, expanding hover gallery, unclipped title, protruding portrait.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
