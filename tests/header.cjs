const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.evaluate(() => document.fonts.ready);
  for (const width of [
    1920, 1551, 1550, 1441, 1440, 1281, 1280, 1024, 769, 768, 390, 320,
  ]) {
    await p.setViewportSize({ width, height: 900 });
    await p.evaluate(() => new Promise(requestAnimationFrame));
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth),
      width,
      `overflow ${width}`,
    );
    assert.equal(
      await p.locator(".header-callback .header-action-icon").isVisible(),
      width <= 1550,
    );
    assert.equal(
      await p.locator(".header-quote>.header-action-icon").isVisible(),
      width <= 1440,
    );
    assert.equal(await p.locator(".menu-toggle").isVisible(), width <= 1280);
    assert.equal(
      await p.locator(".header-inner>.header-social").count(),
      width > 768 ? 1 : 0,
    );
    assert.equal(
      await p.locator(".header-inner>#main-navigation").count(),
      width > 1280 ? 1 : 0,
    );
    if (width <= 1440) {
      const r = await p.locator(".header-quote").boundingBox();
      assert.ok(Math.abs(r.width - r.height) < 1);
      const icon = await p
        .locator(".header-quote>.header-action-icon")
        .boundingBox();
      assert.ok(
        Math.abs(icon.x + icon.width / 2 - r.x - r.width / 2) < 1,
        "centered calculator icon",
      );
    }
  }
  await p.locator(".menu-toggle").click();
  assert.equal(await p.locator("#header-menu").evaluate((e) => e.open), true);
  await p.waitForFunction(
    () => document.querySelector("#header-menu").getAnimations().length === 0,
  );
  let r = await p.locator("#header-menu").boundingBox();
  assert.equal(r.width, 320);
  assert.equal(r.height, 900);
  assert.ok(await p.locator("#header-menu .header-social").isVisible());
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => !document.querySelector("#header-menu").open);
  assert.equal(
    await p
      .locator(".menu-toggle")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  assert.equal(await p.locator(".header-callback").getAttribute("href"), "tel:+78452323553");
  assert.equal(await p.locator(".header-callback").getAttribute("data-action"), null);
  await p.locator(".header-quote").click();
  assert.ok(await p.locator("#contact-dialog").evaluate((e) => e.open));
  await p.keyboard.press("Escape");
  await p.locator(".menu-toggle").click();
  await p.locator('#header-menu [data-action="vk"]').click();
  await p.waitForFunction(
    () =>
      document.querySelector("#contact-dialog").open &&
      !document.querySelector("#header-menu").open,
  );
  await p.keyboard.press("Escape");
  await p.locator(".menu-toggle").click();
  await p.locator('#header-menu a[href="#projects"]').click();
  await p.waitForFunction(
    () =>
      !document.querySelector("#header-menu").open &&
      location.hash === "#projects",
  );
  await p.locator(".menu-toggle").click();
  await p.setViewportSize({ width: 1920, height: 1080 });
  await p.waitForFunction(() => !document.querySelector("#header-menu").open);
  assert.equal(await p.locator(".header-inner>#main-navigation").count(), 1);
  assert.equal(await p.evaluate(() => document.body.style.overflow), "");
  assert.ok(
    (
      await p
        .locator(".carousel-bleed")
        .first()
        .evaluate((e) => getComputedStyle(e).clipPath)
    ).endsWith("0px)"),
  );
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: 12 breakpoint widths, phone/calculator/burger actions, full-screen menu, social relocation, Escape/focus, menu-to-form and anchor navigation, resize cleanup, left-only carousel clipping.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
