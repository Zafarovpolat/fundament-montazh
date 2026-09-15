const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const overrides = require("./review-overrides.json");
const expected = require("./figma-expectations.json").map((e) => ({
  ...e,
  ...overrides[e.id],
}));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => siteMotion.enabled), true);
  const actual = await page.locator("[data-figma-text]").evaluateAll((es) =>
    es.map((e) => {
      const s = getComputedStyle(e);
      return {
        id: e.dataset.figmaText,
        size: parseFloat(s.fontSize),
        line: parseFloat(s.lineHeight),
        color: s.color,
      };
    }),
  );
  for (const a of actual) {
    const e = expected.find((x) => x.id === a.id);
    assert.ok(e, a.id);
    assert.ok(Math.abs(a.size - e.fontSize) < 0.05, `font ${a.id}`);
    assert.ok(Math.abs(a.line - e.lineHeight) < 0.2, `line ${a.id}`);
    if (e.color) {
      const nums = a.color.match(/[\d.]+/g).map(Number);
      if (nums.length === 3) nums.push(1);
      assert.ok(
        nums.every((n, i) => Math.abs(n - e.color[i]) < 0.005),
        `color ${a.id}`,
      );
    }
  }
  assert.equal(await page.locator(".page-path a").count(), 10);
  assert.equal(
    await page
      .locator(".warning")
      .evaluate((e) => getComputedStyle(e).borderRadius),
    "15px",
  );
  assert.equal(
    await page
      .locator("#advantages .fidelity-track")
      .evaluate((e) => getComputedStyle(e).columnGap),
    "0px",
  );
  for (const section of ["projects", "advantages", "reviews"]) {
    const next = page.locator(`#${section} [data-scroll="1"]`);
    await next.click();
    assert.equal(
      await page
        .locator(`#${section} .fidelity-track`)
        .getAttribute("data-slide-index"),
      "1",
    );
    await page.locator(`#${section} [data-scroll="-1"]`).click();
    assert.equal(
      await page
        .locator(`#${section} .fidelity-track`)
        .getAttribute("data-slide-index"),
      "0",
    );
  }
  const gallery = page.locator(".objects-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await gallery.click();
  assert.equal(await page.locator("dialog[open]").count(), 0);
  await gallery.press("ArrowRight");
  assert.equal(await gallery.getAttribute("data-active-object"), "3");
  await gallery.press("ArrowLeft");
  assert.equal(await gallery.getAttribute("data-active-object"), "2");
  await page.locator(".process-range input").press("End");
  assert.equal(await page.locator(".process-range input").inputValue(), "100");
  await page.locator('[data-action="reviews"]').click();
  assert.equal(await page.locator("dialog[open] form:visible").count(), 0);
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    `PASS: ${actual.length} Figma text metrics/colors with explicit review overrides, 10 source markers, rounded notice, 3 carousels, object gallery without form trigger, process range, 2GIS action, motion despite OS reduced-motion.`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
