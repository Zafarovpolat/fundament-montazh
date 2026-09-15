const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
fs.mkdirSync("tests/artifacts", { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.evaluate(() => document.fonts.ready);
  await p.locator("img").evaluateAll((es) =>
    Promise.all(
      es
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width && r.top < 1080;
        })
        .map((e) => e.decode().catch(() => {})),
    ),
  );
  assert.equal(await p.locator(".header-social button:visible").count(), 2);
  assert.equal(await p.locator(".topbar-divider:visible").count(), 2);
  await p.screenshot({ path: "tests/artifacts/ui-header.png" });
  const cta = p.locator("#hero .button--yellow");
  const icon = cta.locator(".button-icon");
  const start = await icon.evaluate((e) => e.getBoundingClientRect().width);
  await cta.hover();
  await p.waitForFunction(() => {
    const b = document.querySelector("#hero .button--yellow");
    return (
      b.querySelector(".button-icon").getBoundingClientRect().width >=
      b.getBoundingClientRect().width - 21
    );
  });
  const dims = await cta.evaluate((b) => {
    const r = b.getBoundingClientRect(),
      i = b.querySelector(".button-icon").getBoundingClientRect(),
      g = b.querySelector(".figma-icon").getBoundingClientRect();
    return {
      button: r.width,
      icon: i.width,
      glyphCenter: g.left + g.width / 2,
      center: r.left + r.width / 2,
    };
  });
  assert.ok(dims.icon > start);
  assert.ok(Math.abs(dims.center - dims.glyphCenter) < 1);
  await p.screenshot({ path: "tests/artifacts/ui-hover.png" });
  await p.mouse.move(1900, 1);
  await p.evaluate(() => window.scrollTo({ top: 2400, behavior: "instant" }));
  await p.waitForFunction(() =>
    document.querySelector('.path-link[aria-current="location"]'),
  );
  const path = await p
    .locator(".path-progress")
    .evaluate((e) => getComputedStyle(e).transform);
  assert.notEqual(path, "matrix(1, 0, 0, 0, 0, 0)");
  console.log("Path progress", path);
  await p.locator("#geology").scrollIntoViewIfNeeded();
  await p.waitForFunction(
    () =>
      !document
        .querySelector("#geology .section-heading")
        .classList.contains("is-pending"),
  );
  await p.screenshot({ path: "tests/artifacts/ui-path.png" });
  // Every focus target and form result can be reached in short viewports.
  for (const v of [
    { width: 320, height: 480 },
    { width: 640, height: 360 },
    { width: 390, height: 640 },
  ]) {
    await p.setViewportSize(v);
    await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
    await p.locator('#hero [data-action="quote"]').first().click();
    await p.locator("[name=name]").fill("Тест");
    await p.locator("[name=phone]").fill("+7 (999) 123-45-67");
    await p
      .locator("[name=message]")
      .fill(
        "Проверка полной видимости полей формы и результата при небольшой высоте экрана.",
      );
    await p.locator(".consent input").check();
    await p.locator("[type=submit]").click();
    await p.locator(".form-status a").scrollIntoViewIfNeeded();
    const rects = await p.evaluate(() => {
      const d = document.querySelector("dialog").getBoundingClientRect(),
        a = document.querySelector(".form-status a").getBoundingClientRect(),
        s = document.querySelector(".dialog-scroll");
      return {
        d: d.toJSON(),
        a: a.toJSON(),
        scrollWidth: s.scrollWidth,
        width: s.clientWidth,
        height: innerHeight,
      };
    });
    assert.ok(rects.d.top >= 0 && rects.d.bottom <= v.height + 1);
    assert.ok(rects.a.top >= rects.d.top && rects.a.bottom <= rects.d.bottom);
    assert.equal(rects.scrollWidth, rects.width);
    assert.match(await p.locator(".form-status").innerText(), /не отправлена/);
    if (v.width === 320)
      await p.screenshot({ path: "tests/artifacts/ui-form-small.png" });
    await p.keyboard.press("Escape");
  }
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  assert.equal(await p.evaluate(() => window.siteMotion.enabled), true);
  assert.equal(
    await p.evaluate(() => document.documentElement.dataset.motion),
    "on",
  );
  assert.ok(
    parseFloat(
      await p
        .locator("#hero .button--yellow .button-icon")
        .evaluate((e) => getComputedStyle(e).transitionDuration),
    ) > 1,
  );
  await p.evaluate(() => window.siteMotion.setEnabled(false));
  assert.equal(await p.locator(".is-pending").count(), 0);
  const transforms = await p
    .locator("[data-parallax]")
    .evaluateAll((es) => es.map((e) => getComputedStyle(e).transform));
  assert.ok(transforms.every((t) => t === "none"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: SVG icons, header dividers, expanding button, centered glyph, section progress, 3 short form viewports, always-on motion and manual off.",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
