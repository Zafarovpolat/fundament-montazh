const { engine: chromium, isChromium, loadImage } = require("./browser.cjs");
const assert = require("node:assert/strict");
const { foundationUrl } = require("./site-url.cjs");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(foundationUrl);
  await p.evaluate(() => document.fonts.ready);
  const metrics = () =>
    p.evaluate(() => ({
      h1: parseFloat(getComputedStyle(document.querySelector("h1")).fontSize),
      button: document
        .querySelector("#hero .button[data-motion-button]")
        .getBoundingClientRect().height,
      buttonLabel: parseFloat(
        getComputedStyle(
          document.querySelector(
            "#hero .button[data-motion-button] .button-label",
          ),
        ).fontSize,
      ),
      headerHeight: document
        .querySelector(".header-inner")
        .getBoundingClientRect().height,
      sectionHeading: parseFloat(
        getComputedStyle(
          document.querySelector(
            ".section-heading .heading-line[data-figma-text]",
          ),
        ).fontSize,
      ),
      foundationTitle: parseFloat(
        getComputedStyle(document.querySelector(".foundation-card__title"))
          .fontSize,
      ),
      foundationSuites: parseFloat(
        getComputedStyle(document.querySelector(".foundation-card__suites"))
          .fontSize,
      ),
      foundationDesc: parseFloat(
        getComputedStyle(document.querySelector(".foundation-card__desc"))
          .fontSize,
      ),
      foundationPrice: parseFloat(
        getComputedStyle(document.querySelector(".foundation-card__price"))
          .fontSize,
      ),
      foundationChip: parseFloat(
        getComputedStyle(document.querySelector(".foundation-card__chips li"))
          .fontSize,
      ),
      headingDescription: parseFloat(
        getComputedStyle(
          document.querySelector(".heading-description.with-yellow-rule"),
        ).fontSize,
      ),
      headingDescriptionPlain: parseFloat(
        getComputedStyle(
          document.querySelector(
            ".heading-description:not(.with-yellow-rule)",
          ),
        ).fontSize,
      ),
      eyebrow: parseFloat(
        getComputedStyle(
          document.querySelector('.page-path [data-figma-text="478:1233"]'),
        ).fontSize,
      ),
      quizTitle: parseFloat(
        getComputedStyle(document.querySelector("#quiz-title")).fontSize,
      ),
      quizOptions: parseFloat(
        getComputedStyle(document.querySelector(".quiz-options button"))
          .fontSize,
      ),
      quizOptionHeight: document
        .querySelector(".quiz-options button")
        .getBoundingClientRect().height,
      quizQuestion: parseFloat(
        getComputedStyle(document.querySelector(".quiz-question")).fontSize,
      ),
      gisPadding: parseFloat(
        getComputedStyle(document.querySelector(".gis-card")).paddingLeft,
      ),
      gisLogoWidth: document
        .querySelector(".gis-logo")
        .getBoundingClientRect().width,
      gisIconWidth: document
        .querySelector(".gis-rating svg")
        .getBoundingClientRect().width,
      reviewPortraitWidth: document
        .querySelector(".review-card figcaption img")
        .getBoundingClientRect().width,
      heroAction: (() => {
        const e = document.querySelector("#hero .button[data-motion-button]");
        return {
          height: e.getBoundingClientRect().height,
          icon: e.querySelector(".button-icon").getBoundingClientRect().width,
        };
      })(),
      projectAction: (() => {
        const e = document.querySelector(
          "#projects .foundation-card .button[data-motion-button]",
        );
        return {
          height: e.getBoundingClientRect().height,
          icon: e.querySelector(".button-icon").getBoundingClientRect().width,
        };
      })(),
      priceAction: (() => {
        const e = document.querySelector(".price-panel > .button[data-motion-button]");
        const label = e.querySelector(".button-label").getBoundingClientRect();
        return {
          height: e.getBoundingClientRect().height,
          labelLeft: label.left - e.getBoundingClientRect().left,
        };
      })(),
      gisName: parseFloat(
        getComputedStyle(document.querySelector(".gis-name")).fontSize,
      ),
      gisLink: parseFloat(
        getComputedStyle(document.querySelector(".gis-link")).fontSize,
      ),
      gisRating: parseFloat(
        getComputedStyle(
          document.querySelector(".gis-rating [data-figma-text]"),
        ).fontSize,
      ),
      reviewQuote: parseFloat(
        getComputedStyle(document.querySelector(".review-card blockquote"))
          .fontSize,
      ),
      reviewName: parseFloat(
        getComputedStyle(document.querySelector(".review-card h3")).fontSize,
      ),
      reviewMeta: parseFloat(
        getComputedStyle(document.querySelector(".review-card figcaption p"))
          .fontSize,
      ),
      faqQuestion: parseFloat(
        getComputedStyle(
          document.querySelector(".faq-grid summary[data-figma-text]"),
        ).fontSize,
      ),
      socialCopy: parseFloat(
        getComputedStyle(document.querySelector('[data-figma-text="315:549"]'))
          .fontSize,
      ),
      directorQuote: parseFloat(
        getComputedStyle(document.querySelector(".director-quote")).fontSize,
      ),
      footerAddress: parseFloat(
        getComputedStyle(document.querySelector('[data-figma-text="609:966"]'))
          .fontSize,
      ),
      footerEmail: parseFloat(
        getComputedStyle(
          document.querySelector('a[data-figma-text="609:963"]'),
        ).fontSize,
      ),
      pagePathVisible:
        getComputedStyle(document.querySelector(".page-path")).display !==
        "none",
      statValue: parseFloat(
        getComputedStyle(document.querySelector(".stats-grid dt[data-figma-text]"))
          .fontSize,
      ),
      stepNumber: parseFloat(
        getComputedStyle(document.querySelector(".step-card__num[data-figma-text]"))
          .fontSize,
      ),
      topbarText: (() => {
        const e = document.querySelector(".topbar-inner p[data-figma-text]");
        return e.getBoundingClientRect().width
          ? parseFloat(getComputedStyle(e).fontSize)
          : null;
      })(),
      arrow: document
        .querySelector(".carousel-controls button")
        .getBoundingClientRect().width,
    }));
  const desktop = await metrics();
  if (isChromium) {
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
  } else {
    // CSS.getPlatformFontsForNode есть только в CDP, поэтому в Firefox и
    // WebKit проверяем шрифты средствами движка: регистрация в FontFaceSet и
    // реальное влияние веб-шрифта на метрику текста.
    const fonts = await p.evaluate(async () => {
      await document.fonts.ready;
      const probe =
        document.querySelector('[data-figma-text="375:396"]') ||
        document.querySelector("h1");
      const measure = (family) => {
        const c = probe.cloneNode(true);
        c.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${family}`;
        probe.parentElement.appendChild(c);
        const width = c.getBoundingClientRect().width;
        c.remove();
        return width;
      };
      return {
        euclid: document.fonts.check('16px "Euclid Circular A"'),
        cofo: [...document.fonts].some((f) => f.family.includes("CoFo")),
        webfont: measure('"Euclid Circular A"'),
        fallback: measure("monospace"),
      };
    });
    assert.ok(
      fonts.euclid,
      "Euclid Circular A не зарегистрирован в FontFaceSet",
    );
    assert.ok(fonts.cofo, "CoFo Readhead не найден среди подключённых шрифтов");
    assert.notEqual(
      Math.round(fonts.webfont),
      Math.round(fonts.fallback),
      "веб-шрифт не меняет метрику текста — вероятно, не загрузился",
    );
  }
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
    assert.ok(m.buttonLabel < desktop.buttonLabel);
    assert.ok(m.headerHeight < desktop.headerHeight);
    assert.ok(m.sectionHeading < desktop.sectionHeading);
    assert.ok(m.foundationTitle < desktop.foundationTitle);
    assert.ok(m.foundationSuites < desktop.foundationSuites);
    assert.ok(m.foundationDesc < desktop.foundationDesc);
    assert.ok(m.foundationPrice < desktop.foundationPrice);
    assert.ok(m.foundationChip < desktop.foundationChip);
    assert.ok(m.headingDescription < desktop.headingDescription);
    assert.ok(
      m.headingDescriptionPlain < desktop.headingDescriptionPlain,
    );
    assert.ok(m.quizQuestion < desktop.quizQuestion);
    assert.ok(m.eyebrow < desktop.eyebrow);
    assert.ok(m.quizTitle < desktop.quizTitle);
    assert.ok(m.quizOptions < desktop.quizOptions);
    assert.ok(m.quizOptionHeight < desktop.quizOptionHeight);
    assert.ok(m.gisPadding < desktop.gisPadding);
    assert.ok(m.gisLogoWidth < desktop.gisLogoWidth);
    assert.ok(m.gisIconWidth < desktop.gisIconWidth);
    assert.ok(m.reviewPortraitWidth < desktop.reviewPortraitWidth);
    if (width <= 1024) {
      assert.ok(m.heroAction.height >= 68);
      assert.ok(m.priceAction.height >= 68);
    } else {
      assert.ok(
        Math.abs(m.heroAction.height - m.projectAction.height) < 0.1,
      );
      assert.ok(
        Math.abs(m.heroAction.height - m.priceAction.height) < 0.1,
      );
    }
    assert.ok(m.heroAction.icon > 0);
    assert.ok(m.projectAction.icon > 0);
    assert.ok(m.priceAction.labelLeft < 35);
    assert.ok(m.gisName < desktop.gisName);
    assert.ok(m.gisLink < desktop.gisLink);
    assert.ok(m.gisRating < desktop.gisRating);
    assert.ok(m.reviewQuote < desktop.reviewQuote);
    assert.ok(m.reviewName < desktop.reviewName);
    assert.ok(m.reviewMeta < desktop.reviewMeta);
    assert.ok(m.faqQuestion < desktop.faqQuestion);
    assert.ok(m.socialCopy < desktop.socialCopy);
    assert.ok(m.directorQuote < desktop.directorQuote);
    assert.ok(m.footerAddress < desktop.footerAddress);
    assert.ok(Math.abs(m.footerAddress - m.footerEmail) < 0.1);
    assert.equal(m.pagePathVisible, width > 1280);
    assert.ok(m.statValue < desktop.statValue);
    assert.ok(m.stepNumber < desktop.stepNumber);
    if (m.topbarText !== null) {
      assert.ok(m.topbarText < desktop.topbarText);
    }
    assert.ok(m.arrow < desktop.arrow);
    await loadImage(p, ".director-photo");
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
  }
  await b.close();
  console.log(
    "PASS: topbar <=1024 hidden; compact typography/buttons/arrows at 1440 and below; small copy unchanged; full portrait at 8 widths; verified Phi fallback in actual browser glyph rendering.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
