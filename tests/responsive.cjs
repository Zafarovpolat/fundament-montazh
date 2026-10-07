const { engine: chromium } = require("./browser.cjs");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await page.evaluate(() => document.fonts.ready);

  for (const width of [1441, 1440, 1281, 1280, 1201, 1200, 1051, 1050, 1025, 1024, 390, 241]) {
    await page.setViewportSize({ width, height: width === 241 ? 460 : 900 });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const state = await page.evaluate(() => {
      const q = (selector) => document.querySelector(selector);
      const box = (element) => element.getBoundingClientRect();
      const descriptionColor = (selector) =>
        getComputedStyle(q(selector)).color;
      const article = q(".social-list article");
      const socialButton = article.querySelector(".button");
      const banner = q("#visit .visit-banner");
      const visitCopy = q("#visit .visit-copy");
      const requestDialog = q("dialog.request-dialog");
      const wasOpen = requestDialog.open;
      if (!wasOpen) requestDialog.showModal();
      const dialogWidth = requestDialog.getBoundingClientRect().width;
      if (!wasOpen) requestDialog.close();
      const track = q("#hero .hero-grid");
      const copySlide = q(".hero-slide--copy");
      const priceSlide = q(".hero-slide--price");
      return {
        width: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        projectColor: descriptionColor(
          "#projects .heading-description.with-yellow-rule",
        ),
        includedColor: descriptionColor("#included .heading-description"),
        objectButton: q('#objects [data-action="objects"] .button-label')
          .textContent.trim(),
        dialogWidth,
        social: {
          rows: getComputedStyle(article).gridTemplateRows.trim().split(/\s+/).length,
          labelDisplay: getComputedStyle(
            socialButton.querySelector(".button-label"),
          ).display,
          buttonColumn: getComputedStyle(socialButton).gridColumnStart,
          textColumn: getComputedStyle(article.querySelector(":scope > div"))
            .gridColumnStart,
          buttonBox: box(socialButton).toJSON(),
          articleBox: box(article).toJSON(),
        },
        designEyebrow: getComputedStyle(q("#design .eyebrow")).display,
        designButton: getComputedStyle(
          q("#design .button.button--yellow.button--soft-icon"),
        ).display,
        visitOffset: box(visitCopy).left - box(banner).left,
        faqButton: getComputedStyle(q("#faq .section-heading > .button")).display,
        menu: {
          background: getComputedStyle(q(".menu-toggle")).backgroundColor,
          display: getComputedStyle(q(".menu-toggle")).display,
          icon: box(q(".menu-toggle svg")).toJSON(),
        },
        hero: {
          pagerHidden: q(".hero-pagination").hidden,
          pagerTop: box(q(".hero-pagination")).top,
          trackWidth: track.clientWidth,
          trackScrollWidth: track.scrollWidth,
          active: track.dataset.activeSlide || null,
          copyX: box(copySlide).x,
          priceX: box(priceSlide).x,
        },
      };
    });

    assert.equal(state.pageWidth, width, `${width}px: document overflow`);
    assert.equal(state.projectColor, "rgb(0, 0, 0)");
    assert.equal(state.includedColor, "rgb(0, 0, 0)");
    assert.equal(state.objectButton, "Все объекты на Youtube");

    if (width <= 1440) {
      assert.ok(state.dialogWidth <= 520);
      assert.equal(state.social.labelDisplay, "none");
      assert.equal(state.social.buttonColumn, "3");
      assert.equal(state.social.textColumn, "2");
      assert.equal(state.social.rows, 1, "social article should stay on one row");
      assert.ok(
        state.social.buttonBox.right <= state.social.articleBox.right + 1,
      );
    } else {
      assert.ok(state.dialogWidth > 520);
    }
    if (width <= 1280) {
      assert.equal(state.designButton, "none");
    }
    if (width <= 1200) {
      assert.equal(state.designEyebrow, "none");
    }
    if (width <= 1050) {
      assert.ok(state.visitOffset <= 24, `${width}px: visit copy has an oversized left gutter`);
      assert.equal(state.faqButton, "none");
    }
    if (width <= 1024) {
      assert.equal(state.hero.pagerHidden, false);
      assert.ok(state.hero.trackScrollWidth > state.hero.trackWidth);
      assert.ok(
        Math.abs(
          Math.abs(state.hero.copyX - state.hero.priceX) - state.hero.trackWidth,
        ) < 1,
      );
      assert.equal(state.hero.active, "price");
      if (width === 241) {
        assert.ok(state.hero.pagerTop < 460, "241px: hero pager should peek into view");
      }
    } else {
      assert.equal(state.hero.pagerHidden, true);
    }
    if (width === 390) {
      assert.equal(state.menu.background, "rgb(0, 0, 0)");
      assert.notEqual(state.menu.display, "none");
      assert.equal(state.menu.icon.width, 16);
      assert.equal(state.menu.icon.height, 12);
    }
  }

  // The pager changes slides on demand, then advances automatically when idle.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-hero-target="copy"]').click();
  await page.waitForFunction(
    () => document.querySelector("#hero .hero-grid").dataset.activeSlide === "copy",
  );
  assert.equal(
    await page
      .locator('.hero-pagination [aria-current="true"]')
      .getAttribute("data-hero-target"),
    "copy",
  );
  await page
    .locator('[data-hero-target="copy"]')
    .evaluate((button) => button.blur());
  await page.mouse.move(1, 1);
  await page.waitForFunction(
    () => document.querySelector("#hero .hero-grid").dataset.activeSlide === "price",
    null,
    { timeout: 7000 },
  );
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: requested breakpoints, text/color, dialog, social row, visit/FAQ, burger and the keyboard-operable autoplay hero carousel.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
