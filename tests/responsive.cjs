const { engine: chromium } = require("./browser.cjs");
const assert = require("node:assert/strict");
const { foundationUrl } = require("./site-url.cjs");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(foundationUrl);
  await page.evaluate(() => document.fonts.ready);

  for (const width of [1441, 1440, 1281, 1280, 1201, 1200, 1051, 1050, 1025, 1024, 880, 879, 768, 390, 241]) {
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
          iconBox: box(socialButton.querySelector(".button-icon")).toJSON(),
          iconBackground: getComputedStyle(
            socialButton.querySelector(".button-icon"),
          ).backgroundColor,
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
        footerLegal: {
          display: getComputedStyle(q(".footer-legal")).display,
          copy: box(
            q('.footer-legal > [data-figma-text="609:976"][data-figma-text]'),
          ).toJSON(),
          links: box(q(".footer-legal > div")).toJSON(),
          credit: box(q(".footer-legal > .footer-credit")).toJSON(),
        },
        hero: {
          badge: box(q(".hero-badge")).toJSON(),
          badgeBackground: getComputedStyle(q(".hero-badge")).backgroundColor,
          badgeRadius: Number.parseFloat(
            getComputedStyle(q(".hero-badge")).borderTopLeftRadius,
          ),
          badgeClientWidth: q(".hero-badge").clientWidth,
          badgeScrollWidth: q(".hero-badge").scrollWidth,
          proofCount: q(".hero-badge").querySelectorAll(".hero-proof-item").length,
          proofBackgrounds: [...q(".hero-badge").querySelectorAll(".hero-proof-item")].map(
            (proof) => getComputedStyle(proof).backgroundColor,
          ),
          separatorDisplay: getComputedStyle(
            q(".hero-badge .hero-proof-separator"),
          ).display,
          benefitsColumns: getComputedStyle(
            q(".hero-benefits"),
          ).gridTemplateColumns.trim().split(/\s+/).length,
          firstBenefit: box(q(".hero-benefits li[data-figma-text]")).toJSON(),
          benefitIcon: box(q(".hero-benefits .benefit-icon")).toJSON(),
          copyButtonMinHeight: Number.parseFloat(
            getComputedStyle(q(".hero-slide--copy .button[data-motion-button]")).minHeight,
          ),
          calculatorButtonMinHeight: Number.parseFloat(
            getComputedStyle(q("#calculator .button[data-motion-button]")).minHeight,
          ),
          pagerHidden: q(".hero-pagination").hidden,
          pagerTop: box(q(".hero-pagination")).top,
          pagerButtons: [...q(".hero-pagination").children].map((e) =>
            box(e).toJSON(),
          ),
          trackWidth: track.clientWidth,
          trackScrollWidth: track.scrollWidth,
          slideOrder: [...track.querySelectorAll("[data-hero-slide]")].map(
            (slide) => slide.dataset.heroSlide,
          ),
          pricePanel: box(q(".price-panel")).toJSON(),
          priceTitle: box(q(".price-panel .panel-title")).toJSON(),
          firstPriceCard: box(q(".price-list > li")).toJSON(),
          priceNoteDisplay: getComputedStyle(q(".price-note")).display,
          priceButton: box(q(".price-panel > .button")).toJSON(),
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
      assert.ok(
        Math.abs(
          state.social.iconBox.x + state.social.iconBox.width / 2 -
            (state.social.buttonBox.x + state.social.buttonBox.width / 2),
        ) < 1,
        "social arrow should be centered inside its dark button",
      );
      assert.ok(
        Math.abs(
          state.social.iconBox.y + state.social.iconBox.height / 2 -
            (state.social.buttonBox.y + state.social.buttonBox.height / 2),
        ) < 1,
        "social arrow panel should be vertically centered in the exact motion button",
      );
      assert.equal(state.social.iconBackground, "rgb(7, 11, 31)");
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
      if (width >= 769) assert.equal(state.faqButton, "none");
      else assert.notEqual(state.faqButton, "none");
    }
    if (width <= 1024) {
      assert.equal(state.footerLegal.display, "grid");
      assert.ok(
        state.footerLegal.copy.y + state.footerLegal.copy.height <=
          Math.min(state.footerLegal.links.y, state.footerLegal.credit.y) + 1,
        "legal note should remain above links and credit",
      );
      assert.ok(
        state.footerLegal.links.y < state.footerLegal.credit.y + state.footerLegal.credit.height &&
          state.footerLegal.credit.y < state.footerLegal.links.y + state.footerLegal.links.height,
        "legal links and footer credit should share the lower row",
      );
      assert.ok(state.hero.badge.width <= state.hero.trackWidth + 1);
      assert.notEqual(state.hero.badgeBackground, "rgba(0, 0, 0, 0)");
      assert.ok(state.hero.badgeRadius >= 50);
      assert.equal(state.hero.separatorDisplay, "inline");
      assert.equal(state.hero.proofCount, 3);
      assert.ok(
        state.hero.proofBackgrounds.every((background) => background === "rgba(0, 0, 0, 0)"),
        "proof text must remain inside one continuous badge, not separate pills",
      );
      assert.ok(
        state.hero.badgeScrollWidth <= state.hero.badgeClientWidth + 1,
        "hero badge text should wrap inside the single pill without horizontal clipping",
      );
      assert.ok(state.hero.copyButtonMinHeight >= 68);
      assert.ok(
        Math.abs(state.hero.benefitIcon.y - state.hero.firstBenefit.y) < 1,
        "benefit icon should align with the first text line",
      );
      if (width >= 769) {
        assert.ok(state.hero.calculatorButtonMinHeight >= 70);
        assert.ok(state.hero.badge.width < state.hero.trackWidth);
      }
      if (width >= 880) {
        assert.equal(state.hero.benefitsColumns, 4);
      }
      assert.equal(state.hero.pagerHidden, false);
      assert.ok(state.hero.trackScrollWidth > state.hero.trackWidth);
      assert.ok(
        Math.abs(
          Math.abs(state.hero.copyX - state.hero.priceX) - state.hero.trackWidth,
        ) < 1,
      );
      assert.equal(state.hero.active, "copy");
      assert.deepEqual(state.hero.slideOrder, ["copy", "price"]);
      assert.equal(state.hero.priceNoteDisplay, "none");
      assert.ok(
        state.hero.firstPriceCard.y -
          (state.hero.priceTitle.y + state.hero.priceTitle.height) >=
          10,
        "price title needs breathing room before the cards",
      );
      assert.ok(
        state.hero.pagerButtons.every(
          (dot) =>
            Math.abs(dot.width - dot.height) < 0.1 && dot.width <= 6.1,
        ),
        "both mobile pager states should be small circles",
      );
      assert.ok(state.hero.priceButton.width < state.hero.trackWidth);
      assert.ok(
        Math.abs(state.hero.priceButton.x - state.hero.pricePanel.x) < 1,
        "price CTA should align to the left edge of its panel",
      );
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

  // The close control in the opened mobile/tablet menu matches the burger slot.
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const alignment = await page.evaluate(() => {
      const menu = document.querySelector(".header-menu");
      const toggle = document
        .querySelector(".menu-toggle")
        .getBoundingClientRect()
        .toJSON();
      if (!menu.open) menu.showModal();
      const close = document
        .querySelector(".menu-close")
        .getBoundingClientRect()
        .toJSON();
      const result = {
        toggle,
        close,
        gutter: document
          .querySelector(".header-inner")
          .getBoundingClientRect().left,
        menuPadding: Number.parseFloat(getComputedStyle(menu).paddingLeft),
        gap: Number.parseFloat(getComputedStyle(menu).gap),
      };
      menu.close();
      return result;
    });
    assert.ok(Math.abs(alignment.close.x - alignment.toggle.x) < 1);
    assert.ok(Math.abs(alignment.close.y - alignment.toggle.y) < 1);
    assert.ok(Math.abs(alignment.close.right - alignment.toggle.right) < 1);
    assert.ok(Math.abs(alignment.menuPadding - alignment.gutter) < 1);
    assert.ok(alignment.gap <= 20);
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
  await page.waitForFunction(
    () => document.querySelector("#hero .hero-grid").dataset.activeSlide === "copy",
    null,
    { timeout: 7000 },
  );
  assert.equal(
    await page
      .locator('.hero-pagination [aria-current="true"]')
      .getAttribute("data-hero-target"),
    "copy",
    "autoplay should loop back to the first hero slide",
  );
  const cookiePage = await browser.newPage({
    viewport: { width: 1920, height: 900 },
  });
  await cookiePage.goto(foundationUrl);
  await cookiePage.evaluate(() => document.fonts.ready);
  await cookiePage.evaluate(() => {
    const banner = document.querySelector(".cookie-bar");
    banner.hidden = false;
    banner.querySelector(".cookie-bar__inner").style.transition = "none";
    document.documentElement.classList.add("cookie-shown");
  });
  const cookieMetrics = async (width) => {
    await cookiePage.setViewportSize({ width, height: 900 });
    return cookiePage.evaluate(() => {
      const q = (selector) => document.querySelector(selector);
      const inner = q(".cookie-bar__inner");
      const button = q(".cookie-bar__accept");
      const title = q(".cookie-bar__title");
      const note = q(".cookie-bar__note");
      const innerStyle = getComputedStyle(inner);
      const innerBox = inner.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      return {
        width: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        titleFont: parseFloat(getComputedStyle(title).fontSize),
        noteFont: parseFloat(getComputedStyle(note).fontSize),
        paddingTop: parseFloat(innerStyle.paddingTop),
        paddingBottom: parseFloat(innerStyle.paddingBottom),
        alignSelf: getComputedStyle(button).alignSelf,
        textBottom: note.getBoundingClientRect().bottom,
        buttonTop: buttonBox.top,
        bottomGap:
          innerBox.bottom -
          buttonBox.bottom -
          parseFloat(innerStyle.paddingBottom),
      };
    });
  };
  const cookieDesktop = await cookieMetrics(1920);
  const cookieTabletDesktop = await cookieMetrics(1440);
  assert.ok(cookieTabletDesktop.titleFont < cookieDesktop.titleFont);
  assert.ok(cookieTabletDesktop.noteFont < cookieDesktop.noteFont);
  assert.ok(cookieTabletDesktop.paddingTop < cookieDesktop.paddingTop);
  for (const width of [1440, 1024, 768, 390]) {
    const metrics = width === 1440 ? cookieTabletDesktop : await cookieMetrics(width);
    assert.equal(metrics.pageWidth, width, `${width}px: cookie bar causes page overflow`);
    assert.equal(metrics.alignSelf, "end", `${width}px: consent button should sit at the bottom`);
    assert.ok(Math.abs(metrics.bottomGap) < 1, `${width}px: consent button bottom padding`);
    if (width <= 1024) {
      assert.ok(metrics.buttonTop >= metrics.textBottom, `${width}px: button follows cookie text`);
    }
  }
  await cookiePage.close();

  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: responsive layout, cookie button anchoring, menu alignment, and keyboard-operable hero carousel.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
