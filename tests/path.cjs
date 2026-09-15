const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(
    () => document.querySelector(".page-path").dataset.progress,
  );
  assert.equal(
    await p.locator(".path-dot .path-label").count(),
    0,
    "labels must be siblings, not inside dots",
  );
  for (const label of await p.locator(".path-label").all())
    assert.equal(
      await label.evaluate((e) => getComputedStyle(e).display),
      "block",
    );
  const first = p.locator(".path-dot").first();
  assert.equal(
    await first.evaluate((e) => getComputedStyle(e).opacity),
    "0.25",
  );
  assert.ok(
    await p.locator(".hero-badge").evaluate((e) => {
      const tops = [...e.children].map((e) => e.getBoundingClientRect().top);
      return tops.every((n) => Math.abs(n - tops[0]) < 1);
    }),
  );
  const progress = await p.locator(".page-path").getAttribute("data-progress");
  await p.evaluate(() =>
    window.scrollTo({
      top: document.querySelector("#projects").offsetTop + 150,
      behavior: "instant",
    }),
  );
  await p.waitForFunction(
    () => getComputedStyle(document.querySelector(".path-dot")).opacity === "1",
  );
  assert.ok(
    Number(await p.locator(".page-path").getAttribute("data-progress")) >
      Number(progress),
  );
  const rect = await first.boundingBox();
  assert.equal(rect.width, 9);
  assert.equal(rect.height, 9);
  assert.equal(
    await p
      .locator(".path-dot")
      .last()
      .evaluate((e) => getComputedStyle(e).opacity),
    "0.25",
  );
  await p.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await p.waitForFunction(
    () => document.querySelector(".page-path").dataset.progress === "1.0000",
  );
  assert.equal(await p.locator("[data-demo-caption]").count(), 4);
  for (const card of await p.locator(".object-card").all()) {
    assert.equal(await card.locator("figcaption h3").count(), 1);
    assert.equal(await card.locator("figcaption .object-meta").count(), 1);
    assert.equal(await card.locator("figcaption .object-price").count(), 1);
  }
  await b.close();
  console.log(
    "PASS: visible sibling labels, round 9px dots, dim-to-solid scroll fill to 100%, single-line desktop proof text, complete demo captions.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
