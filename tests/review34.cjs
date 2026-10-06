const { engine: chromium, isChromium } = require("./browser.cjs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.evaluate(() => document.fonts.ready);
  for (const button of await p.locator(".filters button").all())
    assert.equal(
      await button.evaluate((e) => getComputedStyle(e).paddingLeft),
      "20px",
    );
  assert.equal(
    await p
      .locator(".carousel-bleed")
      .first()
      .evaluate((e) => getComputedStyle(e).overflowX),
    "visible",
  );
  for (const id of ["calculator", "reviews"]) {
    const d = p.locator(`#${id} .heading-description`);
    assert.equal(
      await d.evaluate((e) => getComputedStyle(e, "::before").content),
      "none",
    );
    assert.ok(
      await d.evaluate(
        (e) =>
          Math.abs(
            e.clientHeight / parseFloat(getComputedStyle(e).lineHeight) - 2,
          ) < 0.1,
      ),
      id + " two lines",
    );
  }
  for (const id of ["advantage-track", "review-track"]) {
    const track = p.locator("#" + id);
    await track.scrollIntoViewIfNeeded();
    await p.mouse.move(0, 0);
    const first = await track
      .locator(":scope > *")
      .first()
      .evaluate((e) => e.querySelector("img").src);
    await p.waitForFunction(
      ({ id, first }) =>
        document.querySelector("#" + id + " > * img").src !== first,
      { id, first },
      { timeout: 8000 },
    );
  }
  assert.equal(
    await p.locator(".visit-kicker").innerText(),
    "ХОТИТЕ СНАЧАЛА УВИДЕТЬ НАШУ РАБОТУ?",
  );
  assert.equal(
    await p.locator('#faq .section-heading > [data-action="question"]').count(),
    1,
  );
  const summary = p.locator(".faq-grid summary").first();
  await summary.click();
  assert.ok(
    await p
      .locator(".faq-grid details")
      .first()
      .evaluate((e) => e.getAnimations().length > 0),
  );
  await p.waitForFunction(
    () =>
      document.querySelector(".faq-grid details").getAnimations().length === 0,
  );
  await summary.click();
  await p.waitForFunction(
    () => !document.querySelector(".faq-grid details").open,
  );
  assert.equal(
    await p
      .locator(".social-list article")
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgb(255, 255, 255)",
  );
  assert.equal(
    await p.locator(".footer-credit a").getAttribute("href"),
    "https://ruso.ru",
  );
  await p.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await p.waitForFunction(
    () =>
      Math.abs(
        document.querySelector(".page-path").getBoundingClientRect().bottom -
          document.querySelector("footer").getBoundingClientRect().top,
      ) < 2,
  );
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: bleed, consistent filter padding, two-line descriptions, both autoplays, original visit kicker, FAQ placement/animation, social cards, footer rail boundary and RUSO link.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
