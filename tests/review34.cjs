const { engine: chromium, isChromium } = require("./browser.cjs");
const assert = require("node:assert/strict");
const { foundationUrl } = require("./site-url.cjs");
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(foundationUrl);
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
  for (const [id, expectedLines] of [
    ["calculator", 2],
    ["reviews", 3],
  ]) {
    const d = p.locator(`#${id} .heading-description`);
    assert.equal(
      await d.evaluate((e) => getComputedStyle(e, "::before").content),
      "none",
    );
    assert.ok(
      await d.evaluate(
        (e, lines) =>
          Math.abs(
            e.clientHeight / parseFloat(getComputedStyle(e).lineHeight) - lines,
          ) < 0.1,
        expectedLines,
      ),
      `${id} ${expectedLines} lines`,
    );
  }
  const overrides = await p.evaluate(() => {
    const q = (selector) => document.querySelector(selector);
    const actions = q("#director .director-actions");
    const buttons = [...actions.querySelectorAll(":scope > .button")];
    const lines = (element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    };
    return {
      reviewsMaxWidth: getComputedStyle(
        q("#reviews .heading-description[data-figma-text]")
      ).maxWidth,
      reviewsColor: getComputedStyle(
        q("#reviews .heading-description[data-figma-text]")
      ).color,
      includedMaxWidth: getComputedStyle(
        q("#included .heading-description")
      ).maxWidth,
      advantagesWidth: getComputedStyle(
        q("#advantages .heading-description.with-yellow-rule[data-figma-text]")
      ).width,
      advantagesColor: getComputedStyle(
        q("#advantages .heading-description.with-yellow-rule[data-figma-text]")
      ).color,
      priceTitleLines: [
        ...document.querySelectorAll(
          '#hero .hero-slide--price .price-list h3[data-figma-text="360:582"]',
        ),
      ].map(lines),
      actionDisplay: getComputedStyle(actions).display,
      actionDirection: getComputedStyle(actions).flexDirection,
      actionWrap: getComputedStyle(actions).flexWrap,
      actionAlign: getComputedStyle(actions).alignItems,
      actionRects: buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        const icon = button.querySelector(".button-icon .figma-icon");
        const iconRect = icon.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          iconWidth: iconRect.width,
          iconHeight: iconRect.height,
          iconOpacity: getComputedStyle(icon).opacity,
          iconFilter: getComputedStyle(icon).filter,
        };
      }),
    };
  });
  assert.equal(overrides.reviewsMaxWidth, "400px");
  assert.equal(overrides.reviewsColor, "rgba(0, 0, 0, 0.4)");
  assert.equal(overrides.includedMaxWidth, "324px");
  assert.equal(overrides.advantagesWidth, "400px");
  assert.equal(overrides.advantagesColor, "rgb(0, 0, 0)");
  assert(
    overrides.priceTitleLines.length > 0 &&
      overrides.priceTitleLines.every((lineCount) => lineCount === 2),
    "desktop price-list titles wrap onto two lines",
  );
  assert.equal(overrides.actionDisplay, "flex");
  assert.equal(overrides.actionDirection, "row");
  assert.equal(overrides.actionWrap, "nowrap");
  assert.equal(overrides.actionAlign, "center");
  assert.equal(overrides.actionRects.length, 2);
  assert(overrides.actionRects[0].right <= overrides.actionRects[1].left + 1);
  assert(
    Math.abs(
      (overrides.actionRects[0].top + overrides.actionRects[0].bottom) / 2 -
        (overrides.actionRects[1].top + overrides.actionRects[1].bottom) / 2,
    ) < 1,
    "director buttons share a vertical center",
  );
  assert(
    overrides.actionRects.every(
      ({ iconWidth, iconHeight, iconOpacity }) =>
        iconWidth > 0 && iconHeight > 0 && iconOpacity !== "0",
    ),
    "both director arrows are visible",
  );
  assert(overrides.actionRects[1].iconFilter.includes("invert(1)"));

  for (const id of ["advantage-track", "review-track"]) {
    const track = p.locator("#" + id);
    await track.scrollIntoViewIfNeeded();
    await p.mouse.move(0, 0);
    const first = await track.evaluate(
      (element) => element.carousel.currentCard().querySelector("img").src,
    );
    await p.waitForTimeout(id === "advantage-track" ? 3600 : 5400);
    assert.equal(
      await track.evaluate(
        (element) => element.carousel.currentCard().querySelector("img").src,
      ),
      first,
      `${id} remains stationary until user input`,
    );

    await p.locator(`[data-target="${id}"][data-scroll="1"]`).click();
    await p.waitForFunction(
      ({ id, first }) =>
        document
          .querySelector("#" + id)
          .carousel.currentCard()
          .querySelector("img").src !== first,
      { id, first },
    );
    await p.locator(`[data-target="${id}"][data-scroll="-1"]`).click();
    await p.waitForFunction(
      ({ id, first }) => {
        const element = document.querySelector("#" + id);
        return (
          element.dataset.slideIndex === "0" &&
          element.carousel.currentCard().querySelector("img").src === first
        );
      },
      { id, first },
    );

    if (id === "review-track") {
      const last = await track.evaluate(
        (element) => element.lastElementChild.querySelector("img").src,
      );
      await p.locator(`[data-target="${id}"][data-scroll="-1"]`).click();
      await p.waitForFunction(
        (last) =>
          document
            .querySelector("#review-track")
            .carousel.currentCard()
            .querySelector("img").src === last,
        last,
      );
    }
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
    "PASS: heading overrides, manual/stationary carousels, director actions, original visit kicker, FAQ placement/animation, social cards, footer rail boundary and RUSO link.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
