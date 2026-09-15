const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "reduce",
  });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.evaluate(() => document.fonts.ready);
  assert.equal(await p.locator("main .eyebrow").count(), 0);
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
  const pic = p.locator(".project-picture").first();
  await pic.scrollIntoViewIfNeeded();
  await p.mouse.move(0, 0);
  await p.waitForFunction(
    () =>
      document.querySelector(".project-picture").dataset.activePhoto !== "0",
    {},
    { timeout: 8000 },
  );
  await pic.locator('[data-photo-index="2"]').click();
  assert.equal(await pic.getAttribute("data-active-photo"), "2");
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
  const dr = await p.locator("#director").boundingBox(),
    photo = await p.locator(".director-photo").boundingBox();
  assert.ok(photo.y < dr.y - 50);
  assert.deepEqual(errors, []);
  await b.close();
  console.log(
    "PASS: centered CTA, source labels without eyebrows, warning, white list numbers, themed path, project autoplay/dots, expanding hover gallery, unclipped title, protruding portrait.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
