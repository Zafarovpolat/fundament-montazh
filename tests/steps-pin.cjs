const { engine: chromium } = require("./browser.cjs");
const assert = require("node:assert/strict");

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(
    () => document.querySelector("#steps-track")?.carousel?.pages > 1,
  );

  // До пересечения центра секция продолжает обычную вертикальную прокрутку.
  await p.evaluate(() => {
    const section = document.querySelector("#design");
    const r = section.getBoundingClientRect();
    const offset = r.top + r.height / 2 - innerHeight / 2;
    window.scrollTo({ top: scrollY + offset - 150, behavior: "instant" });
  });
  await p.mouse.wheel(0, 50);
  await p.waitForTimeout(40);
  const beforeCenter = await p.evaluate(() => {
    const r = document.querySelector("#design").getBoundingClientRect();
    return {
      offset: r.top + r.height / 2 - innerHeight / 2,
      pinned: document.documentElement.classList.contains("is-steps-pinned"),
      position: document.querySelector("#steps-track").carousel.position,
    };
  });
  assert.ok(beforeCenter.offset > 70 && beforeCenter.offset < 130);
  assert.equal(beforeCenter.pinned, false);
  assert.equal(beforeCenter.position, 0);

  // Пересекающий event центрирует секцию и передаёт остаток карусели.
  await p.mouse.wheel(0, 150);
  await p.waitForFunction(() =>
    document.documentElement.classList.contains("is-steps-pinned"),
  );
  const centered = await p.evaluate(() => {
    const r = document.querySelector("#design").getBoundingClientRect();
    return {
      offset: r.top + r.height / 2 - innerHeight / 2,
      position: document.querySelector("#steps-track").carousel.position,
      scrollY,
    };
  });
  assert.ok(Math.abs(centered.offset) <= 2);
  assert.ok(centered.position > 0);

  // While the range is pinned, wheel input advances the row, not the page.
  await p.mouse.wheel(0, 50);
  await p.waitForTimeout(40);
  const advanced = await p.evaluate(() => ({
    scrollY,
    position: document.querySelector("#steps-track").carousel.position,
  }));
  assert.ok(Math.abs(advanced.scrollY - centered.scrollY) <= 1);
  assert.ok(advanced.position > centered.position);

  // Reaching the forward rail edge releases the pin; the next wheel scrolls the page.
  await p.evaluate(() => {
    const carousel = document.querySelector("#steps-track").carousel;
    carousel.position = carousel.pages - 1;
  });
  const edgeScrollY = await p.evaluate(() => scrollY);
  await p.mouse.wheel(0, 70);
  await p.waitForFunction(
    () => !document.documentElement.classList.contains("is-steps-pinned"),
  );
  assert.equal(await p.evaluate(() => scrollY), edgeScrollY);
  await p.mouse.wheel(0, 70);
  await p.waitForFunction((start) => scrollY > start, edgeScrollY);
  assert.ok((await p.evaluate(() => scrollY)) > edgeScrollY);

  // A small momentum overshoot past the center still gets caught and centered;
  // the page must use instant scrolling while the pin is active.
  await p.evaluate(() => {
    const section = document.querySelector("#design");
    const carousel = document.querySelector("#steps-track").carousel;
    carousel.position = 0;
    const r = section.getBoundingClientRect();
    const offset = r.top + r.height / 2 - innerHeight / 2;
    window.scrollTo({ top: scrollY + offset + 12, behavior: "instant" });
  });
  await p.waitForFunction(() => {
    const r = document.querySelector("#design").getBoundingClientRect();
    return Math.abs(r.top + r.height / 2 - innerHeight / 2 + 12) < 2;
  });
  await p.mouse.wheel(0, 30);
  await p.waitForFunction(() =>
    document.documentElement.classList.contains("is-steps-pinned"),
  );
  const caughtOvershoot = await p.evaluate(() => {
    const r = document.querySelector("#design").getBoundingClientRect();
    return {
      offset: r.top + r.height / 2 - innerHeight / 2,
      position: document.querySelector("#steps-track").carousel.position,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
  assert.ok(Math.abs(caughtOvershoot.offset) <= 2);
  assert.ok(caughtOvershoot.position > 0);
  assert.equal(caughtOvershoot.scrollBehavior, "auto");

  await b.close();
  console.log("PASS: #design pins at viewport center, scrolls the rail, and releases at its edge.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
