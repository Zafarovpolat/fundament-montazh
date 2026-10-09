"use strict";

const assert = require("node:assert/strict");
const { engine } = require("./browser.cjs");
const { foundationUrl } = require("./site-url.cjs");

(async () => {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 375, height: 850 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const response = await page.goto(foundationUrl, { waitUntil: "networkidle" });
    assert(response?.ok(), "foundation page should load");
    await page.evaluate(() => document.fonts.ready);

    const initial = await page.evaluate(() => {
      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          right: box.right,
          bottom: box.bottom,
        };
      };
      const badge = document.querySelector("#hero .hero-badge");
      const copySlide = document.querySelector("#hero .hero-slide--copy");
      const track = document.querySelector("#projects .foundation-cards");
      const first = track.children[0].getBoundingClientRect();
      const second = track.children[1].getBoundingClientRect();
      const progressFill = document.querySelector(
        "#projects .foundation-progress__fill",
      );
      const objects = document.querySelector("#objects .objects-gallery");
      const active = objects.querySelector(".object-card.is-active");
      const activeBox = active.getBoundingClientRect();
      const galleryBox = objects.getBoundingClientRect();
      const advantageRail = document.querySelector(
        "[data-advantage-progress]",
      );
      const advantageInput = advantageRail.querySelector('input[type="range"]');
      const advantageTrack = document.getElementById("advantage-track");
      const finalQuestion = document.querySelector(
        '#faq .faq-grid summary[data-figma-text="315:825"]',
      );
      const footerCta = document.querySelector("#contacts .footer-cta");
      const footerHouse = document.querySelector("#contacts .footer-house");
      const lines = (element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].length;
      };
      return {
        badgeSlide: badge.closest("[data-hero-slide]").dataset.heroSlide,
        priceHasBadge: Boolean(
          document.querySelector("#hero .hero-slide--price .hero-badge"),
        ),
        badgeItems: badge.querySelectorAll(".hero-proof-item").length,
        copyOverflow: getComputedStyle(copySlide).overflow,
        priceTitleFont: getComputedStyle(
          document.querySelector("#hero .hero-slide--price .panel-title"),
        ).fontSize,
        priceItemFont: getComputedStyle(
          document.querySelector("#hero .hero-slide--price .price-list h3"),
        ).fontSize,
        projectTrack: rect(track),
        projectFirst: {
          x: first.x,
          width: first.width,
        },
        projectSecond: {
          x: second.x,
          right: second.right,
        },
        projectSnap: getComputedStyle(track).scrollSnapType,
        projectScrollBehavior: getComputedStyle(track).scrollBehavior,
        projectFill: getComputedStyle(progressFill).backgroundColor,
        projectButtonPaddingLeft: getComputedStyle(
          document.querySelector("#projects .foundation-card .button[data-motion-button]"),
        ).paddingLeft,
        projectProgressThumb: {
          background: getComputedStyle(
            document.querySelector("#projects .foundation-progress__thumb"),
          ).backgroundColor,
          arrowWidth: document.querySelector(
            "#projects .foundation-progress__thumb .figma-icon",
          ).getBoundingClientRect().width,
          arrowHeight: document.querySelector(
            "#projects .foundation-progress__thumb .figma-icon",
          ).getBoundingClientRect().height,
        },
        projectMaxScroll: track.scrollWidth - track.clientWidth,
        directorFirstLines: lines(
          document.querySelector(
            "#director .director-actions > .button:first-child .button-label",
          ),
        ),
        directorSecondArrowFilter: getComputedStyle(
          document.querySelector(
            "#director .director-actions > .button:nth-child(2) .button-icon .figma-icon",
          ),
        ).filter,
        objectActiveIndex: Number(objects.dataset.activeObject),
        objectActiveCenter:
          activeBox.left + activeBox.width / 2 -
          (galleryBox.left + objects.clientWidth / 2),
        objectButtonLines: lines(
          document.querySelector(
            "#objects .section-actions > .button:nth-child(2) .button-label",
          ),
        ),
        advantageDisplay: getComputedStyle(advantageRail).display,
        advantageButtonsDisplay: getComputedStyle(
          document.querySelector("#advantages .advantage-controls"),
        ).display,
        advantagePages: advantageTrack.carousel.pages,
        advantageMax: Number(advantageInput.max),
        faqIconWidth: finalQuestion.querySelector(".figma-icon").getBoundingClientRect()
          .width,
        faqIconOpacity: getComputedStyle(
          finalQuestion.querySelector(".figma-icon"),
        ).opacity,
        faqSummary: rect(finalQuestion),
        faqDetails: rect(finalQuestion.closest("details")),
        footerCta: rect(footerCta),
        footerButton: rect(footerCta.querySelector(".button")),
        footerHouse: rect(footerHouse),
        footerHouseZIndex: getComputedStyle(footerHouse).zIndex,
        footerButtonZIndex: getComputedStyle(
          footerCta.querySelector(".button"),
        ).zIndex,
        footerLegalAlign: getComputedStyle(
          document.querySelector("#contacts .footer-legal > div"),
        ).alignItems,
        footerColumns: rect(document.querySelector("#contacts .footer-columns")),
        footerLegal: rect(document.querySelector("#contacts .footer-legal")),
        viewportWidth: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
      };
    });

    assert.equal(initial.badgeSlide, "copy");
    assert.equal(initial.priceHasBadge, false);
    assert.equal(initial.badgeItems, 3, "proof remains one composed badge");
    assert.equal(initial.copyOverflow, "clip", "badge tail is clipped at slide edge");
    assert.equal(initial.priceTitleFont, "18px");
    assert.equal(initial.priceItemFont, "14px");
    assert.equal(initial.projectTrack.x, 0);
    assert.equal(initial.projectTrack.width, 375);
    assert.equal(initial.projectFirst.x, 20);
    assert.equal(initial.projectFirst.width, 335);
    assert(initial.projectSecond.x < 375 && initial.projectSecond.right > 375);
    assert.equal(initial.projectSnap, "none");
    assert.equal(initial.projectScrollBehavior, "auto");
    assert.equal(initial.projectFill, "rgba(0, 0, 0, 0)");
    assert.equal(initial.projectButtonPaddingLeft, "20px");
    assert.equal(initial.projectProgressThumb.background, "rgb(255, 255, 255)");
    assert.equal(initial.projectProgressThumb.arrowWidth, 7);
    assert.equal(initial.projectProgressThumb.arrowHeight, 14);
    assert.equal(initial.directorFirstLines, 2);
    assert(initial.directorSecondArrowFilter.includes("invert(1)"));
    assert.equal(initial.objectActiveIndex, 2);
    assert(Math.abs(initial.objectActiveCenter) < 1);
    assert(initial.objectButtonLines >= 2);
    assert.equal(initial.advantageDisplay, "block");
    assert.equal(initial.advantageButtonsDisplay, "none");
    assert.equal(initial.advantagePages, 2);
    assert.equal(initial.advantageMax, 1);
    assert.equal(initial.faqIconWidth, 14);
    assert.equal(initial.faqIconOpacity, "0.62");
    assert.equal(initial.faqSummary.width, 335);
    assert.equal(initial.faqDetails.width, 335);
    assert.equal(initial.footerCta.x, 0);
    assert.equal(initial.footerCta.width, 375);
    assert.equal(initial.footerCta.height >= 300, true);
    assert(Math.abs(initial.footerHouse.x - initial.footerCta.x + 20) < 0.5);
    assert(initial.footerHouse.right < initial.footerCta.right);
    assert(initial.footerHouse.bottom <= initial.footerCta.bottom + 0.5);
    assert(
      initial.footerHouse.y < initial.footerButton.bottom &&
        initial.footerHouse.bottom > initial.footerButton.y,
    );
    assert.equal(initial.footerHouseZIndex, "0");
    assert.equal(initial.footerButtonZIndex, "2");
    assert.equal(initial.footerLegalAlign, "flex-start");
    assert(initial.footerColumns.x >= 0 && initial.footerColumns.right <= 375);
    assert(initial.footerLegal.x >= 0 && initial.footerLegal.right <= 375);
    assert.equal(initial.pageWidth, initial.viewportWidth);

    // The mobile hero's price slide keeps its own copy and stays within the viewport.
    await page.evaluate(() =>
      document.querySelector('#hero [data-hero-target="price"]').click(),
    );
    await page.waitForFunction(
      () => document.querySelector("#hero .hero-grid").scrollLeft > 0,
      null,
      { timeout: 2000 },
    );
    const priceSlide = await page.evaluate(() => {
      const list = document.querySelector("#hero .price-list");
      const items = [...list.children];
      return {
        viewportWidth: document.querySelector("#hero .hero-grid").clientWidth,
        listWidth: list.clientWidth,
        listScrollWidth: list.scrollWidth,
        itemCount: items.length,
        itemWidths: items.map((item) => [item.clientWidth, item.scrollWidth]),
      };
    });
    assert.equal(priceSlide.viewportWidth, 335);
    assert.equal(priceSlide.itemCount, 4);
    assert(priceSlide.listWidth <= priceSlide.viewportWidth);
    assert(priceSlide.listScrollWidth <= priceSlide.listWidth + 1);
    assert(priceSlide.itemWidths.every(([width, scrollWidth]) => scrollWidth <= width + 1));

    // Range input follows the cards directly, without snap or smooth-scroll lag.
    await page.evaluate(() => {
      const track = document.querySelector("#projects .foundation-cards");
      const input = document.querySelector("#projects .foundation-progress input");
      input.value = "70";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const projectProgress = await page.evaluate(() => {
      const track = document.querySelector("#projects .foundation-cards");
      return {
        actual: track.scrollLeft,
        expected: (track.scrollWidth - track.clientWidth) * 0.7,
      };
    });
    assert(Math.abs(projectProgress.actual - projectProgress.expected) < 1);

    // The advantages range is accessible and drives the existing carousel API.
    await page.evaluate(() => {
      const input = document.querySelector(
        "[data-advantage-progress] input",
      );
      input.value = "1";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const advantagePosition = await page.evaluate(
      () => document.getElementById("advantage-track").carousel.position,
    );
    assert.equal(advantagePosition, 1);
    await page.evaluate(() => {
      const input = document.querySelector("[data-advantage-progress] input");
      input.value = "0";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#advantages").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => Number(document.querySelector("[data-advantage-progress] input").value) > 0.5,
      null,
      { timeout: 5000 },
    );
    await page.waitForFunction(
      () => Number(document.querySelector("[data-advantage-progress] input").value) < 0.1,
      null,
      { timeout: 2500 },
    );

    // A swipe/scroll selects the nearest card, centers it, and autoplay advances it.
    await page.evaluate(() => {
      const gallery = document.querySelector("#objects .objects-gallery");
      const next = gallery.querySelectorAll(".object-card")[3];
      gallery.scrollLeft = next.offsetLeft - 20;
    });
    await page.waitForFunction(
      () => document.querySelector("#objects .objects-gallery").dataset.activeObject === "3",
      null,
      { timeout: 2500 },
    );
    await page.waitForFunction(() => {
      const gallery = document.querySelector("#objects .objects-gallery");
      const active = gallery.querySelector(".object-card.is-active");
      const card = active.getBoundingClientRect();
      const viewport = gallery.getBoundingClientRect();
      return Math.abs(
        card.left + card.width / 2 -
          (viewport.left + gallery.clientWidth / 2),
      ) < 1;
    });
    await page.locator("#objects .objects-gallery").scrollIntoViewIfNeeded();
    const beforeAutoplay = await page.evaluate(
      () => document.querySelector("#objects .objects-gallery").dataset.activeObject,
    );
    await page.waitForFunction(
      (before) =>
        document.querySelector("#objects .objects-gallery").dataset.activeObject !==
        before,
      beforeAutoplay,
      { timeout: 7000 },
    );

    // The viewport gutter/footer breakout remain safe at narrow and wider phones.
    for (const width of [320, 430]) {
      await page.setViewportSize({ width, height: 850 });
      const responsive = await page.evaluate(() => {
        const cta = document.querySelector("#contacts .footer-cta").getBoundingClientRect();
        const grid = document.querySelector("#contacts .footer-grid").getBoundingClientRect();
        return {
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
          ctaLeft: cta.left,
          ctaWidth: cta.width,
          ctaRight: cta.right,
          gridLeft: grid.left,
          gridWidth: grid.width,
          gridRight: grid.right,
        };
      });
      assert.equal(responsive.page, responsive.viewport);
      assert(Math.abs(responsive.ctaLeft - responsive.gridLeft) < 1);
      assert(Math.abs(responsive.ctaWidth - responsive.gridWidth) < 1);
      assert(Math.abs(responsive.ctaRight - responsive.gridRight) < 1);
    }

    assert.deepEqual(pageErrors, [], "mobile page should not raise script errors");
    console.log("Foundation mobile checks passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
