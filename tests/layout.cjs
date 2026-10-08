const { engine: chromium, isChromium, settle } = require("./browser.cjs");
const assert = require("node:assert/strict");
const { foundationUrl } = require("./site-url.cjs");
(async () => {
  const browser = await chromium.launch({
    ignoreDefaultArgs: ["--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.goto(foundationUrl);
  await page.evaluate(() => document.fonts.ready);
  for (const stable of [false, true]) {
    await page.evaluate(
      (s) =>
        (document.documentElement.style.scrollbarGutter = s
          ? "stable"
          : "auto"),
      stable,
    );
    for (const width of [
      320, 360, 390, 480, 760, 768, 1024, 1025, 1080, 1120, 1139, 1140, 1141,
      1180, 1200, 1280, 1440, 1799, 1800, 1920,
    ]) {
      await page.setViewportSize({ width, height: 900 });
      if (
        !(await settle(page, () => {
          const de = document.documentElement;
          const edge = de
            .querySelector(".footer-cta")
            .getBoundingClientRect().right;
          const footerGridRight = de
            .querySelector(".footer-grid")
            .getBoundingClientRect().right;
          // The compact layout is centered to the 375px mobile Figma frame;
          // its CTA aligns to that frame, while wider layouts bleed to viewport.
          const expectedEdge = matchMedia("(max-width: 768px)").matches
            ? footerGridRight
            : de.clientWidth;
          return (
            Math.abs(edge - expectedEdge) < 1 &&
            de.scrollWidth <= de.clientWidth + 1
          );
        }))
      )
        throw new Error(`${width}: геометрия не сошлась за 2.5 с`);
      const m = await page.evaluate(() => {
        const r = (e) => e.getBoundingClientRect();
        const cards = [...document.querySelectorAll(".price-list li")];
        return {
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          edge: r(document.querySelector(".footer-cta")).right,
          expectedEdge: matchMedia("(max-width: 768px)").matches
            ? r(document.querySelector(".footer-grid")).right
            : document.documentElement.clientWidth,
          track: (() => {
            const e = document.querySelector("#hero .hero-grid");
            return {
              clientWidth: e.clientWidth,
              scrollWidth: e.scrollWidth,
              copyX: r(document.querySelector(".hero-slide--copy")).x,
              priceX: r(document.querySelector(".hero-slide--price")).x,
            };
          })(),
          cards: cards.map((e) => ({
            x: r(e).x,
            y: r(e).y,
            width: r(e).width,
          })),
          prices: cards.map((e) => {
            const p = e.querySelector("div>p"),
              range = document.createRange();
            range.selectNodeContents(p);
            const t = range.getBoundingClientRect();
            return {
              text: p.textContent.trim(),
              left: t.left,
              right: t.right,
              cardLeft: r(e).left,
              cardRight: r(e).right,
              visible:
                getComputedStyle(p).visibility === "visible" && t.height > 0,
            };
          }),
        };
      });
      assert(
        m.scroll <= m.client + 1,
        `${width}: overflow ${JSON.stringify(m)}`,
      );
      assert(
        Math.abs(m.edge - m.expectedEdge) < 1,
        `${width}: footer frame edge`,
      );
      for (const p of m.prices)
        assert(
          p.visible && p.text && p.left >= p.cardLeft && p.right <= p.cardRight,
          `${width}: price ${JSON.stringify(p)}`,
        );
      if (width <= 1024) {
        assert(m.track.scrollWidth > m.track.clientWidth);
        assert(
          Math.abs(Math.abs(m.track.copyX - m.track.priceX) - m.track.clientWidth) < 1,
          `${width}: hero panels should occupy adjacent horizontal slides`,
        );
        assert(
          m.cards.every((card) => Math.abs(card.width - m.cards[0].width) < 1) &&
            m.cards.slice(1).every((card, i) => card.y > m.cards[i].y),
          `${width}: price cards should remain in one column within their slide`,
        );
      }
    }
  }
  await page.setViewportSize({ width: 1140, height: 900 });
  const gallery = page.locator(".objects-gallery");
  await gallery.scrollIntoViewIfNeeded();
  const box = await gallery.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  for (const x of [1139, 0, 1139, 20]) {
    await page.mouse.move(x, box.y + 10, { steps: 12 });
    assert(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
      "drag overflow",
    );
  }
  await page.mouse.up();
  for (let i = 0; i < 25; i++) {
    await page.evaluate(
      (i) =>
        window.scrollTo(
          0,
          (i * (document.documentElement.scrollHeight - innerHeight)) / 24,
        ),
      i,
    );
    await page.waitForTimeout(80);
    assert(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
      "scroll animation overflow",
    );
  }
  await browser.close();
  console.log(
    "PASS: 40 width/scrollbar combinations, footer edge, all price text bounds, two-column cards, gallery drag and scroll animation overflow.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
