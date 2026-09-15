const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.evaluate(() => document.fonts.ready);
  const metrics = () =>
    p.evaluate(() => ({
      h1: parseFloat(getComputedStyle(document.querySelector("h1")).fontSize),
      button: document
        .querySelector("#hero .button[data-motion-button]")
        .getBoundingClientRect().height,
      arrow: document
        .querySelector(".carousel-controls button")
        .getBoundingClientRect().width,
    }));
  const desktop = await metrics();
  const c = await p.context().newCDPSession(p);
  await c.send("DOM.enable");
  await c.send("CSS.enable");
  const { root } = await c.send("DOM.getDocument");
  const { nodeId } = await c.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: '[data-figma-text="375:396"]',
  });
  const { fonts } = await c.send("CSS.getPlatformFontsForNode", { nodeId });
  assert.ok(
    fonts.some(
      (f) => f.familyName === "Euclid Circular A" && f.glyphCount === 1,
    ),
  );
  assert.ok(
    fonts.some((f) => f.familyName.includes("CoFo") && f.glyphCount > 10),
  );
  for (const width of [1440, 1280, 1025, 1024, 768, 640, 390, 320]) {
    await p.setViewportSize({ width, height: 900 });
    await p.evaluate(() => new Promise(requestAnimationFrame));
    assert.equal(await p.locator(".topbar").isVisible(), width > 1024);
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    const m = await metrics();
    assert.ok(m.h1 < desktop.h1);
    assert.ok(m.button < desktop.button);
    assert.ok(m.arrow < desktop.arrow);
    const portrait = await p.locator(".director-photo").evaluate((e) => {
      const r = e.getBoundingClientRect(),
        parent = e.closest("#director").getBoundingClientRect();
      return {
        fit: getComputedStyle(e).objectFit,
        ratio: r.width / r.height,
        natural: e.naturalWidth / e.naturalHeight,
        top: r.top,
        bottom: r.bottom,
        sectionTop: parent.top,
        sectionBottom: parent.bottom,
      };
    });
    assert.equal(portrait.fit, "contain");
    assert.ok(Math.abs(portrait.ratio - portrait.natural) < 0.002);
    assert.ok(
      portrait.top >= portrait.sectionTop - 1 &&
        portrait.bottom <= portrait.sectionBottom + 1,
    );
    assert.equal(
      await p
        .locator(".warning p")
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
      17,
    );
    assert.equal(
      await p
        .locator("#hero .button-label")
        .first()
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
      14,
    );
  }
  await b.close();
  console.log(
    "PASS: topbar <=1024 hidden; compact typography/buttons/arrows at 1440 and below; small copy unchanged; full portrait at 8 widths; verified Phi fallback in actual browser glyph rendering.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
