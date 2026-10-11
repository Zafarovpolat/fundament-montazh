const { engine: chromium } = require("./browser.cjs");
const assert = require("node:assert/strict");
const { homeUrl } = require("./site-url.cjs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  const errors = [];
  const failed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });

  const widths = [
    320, 375, 390, 480, 540, 640, 768, 880, 1024, 1200, 1280, 1440, 1600, 1920, 2560,
  ];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(homeUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      title: document.title,
      h1: document.querySelectorAll("h1").length,
      page: document.body.dataset.page,
      sectionIds: [...document.querySelectorAll("main > section")].map(
        (section) => section.id,
      ),
      project: (() => {
        const viewport = document.querySelector("#projects");
        const card = document.querySelector("#projects .project-card:not([hidden])");
        if (!viewport || !card) return null;
        const viewportRect = viewport.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        return {
          left: cardRect.left,
          right: cardRect.right,
          viewportLeft: viewportRect.left,
          viewportRight: viewportRect.right,
        };
      })(),
    }));
    assert.equal(metrics.scrollWidth, width, `Homepage overflow at ${width}px`);
    assert.ok(metrics.project, `Project card missing at ${width}px`);
    assert.ok(
      metrics.project.left >= metrics.project.viewportLeft - 1,
      `Project card starts outside its viewport at ${width}px`,
    );
    assert.ok(
      metrics.project.right <= metrics.project.viewportRight + 1,
      `Project card is clipped at ${width}px (card right ${metrics.project.right}, viewport right ${metrics.project.viewportRight})`,
    );
    assert.equal(metrics.h1, 1, "Homepage must have one H1");
    assert.equal(metrics.page, "home");
    assert.equal(metrics.sectionIds.length, 16);
    assert.ok(metrics.sectionIds.includes("social"));
    assert.ok(metrics.sectionIds.includes("hero"));
    assert.ok(metrics.sectionIds.includes("principle"));
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(homeUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // Load and verify all local image assets, including lazy-loaded sections.
  await page.locator("img").evaluateAll((images) =>
    Promise.all(
      images.map((image) => {
        image.loading = "eager";
        return image.decode().catch(() => {});
      }),
    ),
  );
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
  );
  assert.deepEqual(brokenImages, [], "All homepage images must load");

  // The header menu works at mobile size and its section link closes it.
  await page.locator(".menu-toggle").click();
  assert.equal(await page.locator(".menu-toggle").getAttribute("aria-expanded"), "true");
  await page.locator('#header-menu a[href="#projects"]').click();
  assert.equal(await page.locator(".menu-toggle").getAttribute("aria-expanded"), "false");

  // Video and the four-question flow remain usable without fake destinations or
  // an automatic submission/price calculation.
  await page.locator('[data-action="video"]').first().click();
  assert.equal(await page.locator("#contact-dialog").evaluate((dialog) => dialog.open), true);
  await page.keyboard.press("Escape");
  for (let step = 0; step < 4; step++)
    await page.locator('[data-action="quiz-next"]').click();
  assert.equal(await page.locator("#contact-dialog").evaluate((dialog) => dialog.open), true);
  await page.keyboard.press("Escape");

  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  await browser.close();
  console.log(
    "PASS: homepage routing, 15 responsive widths (including all 8 requested), no horizontal overflow or clipped project card, 16 sections, local images, mobile navigation, technology tabs, project empty state, video information and quiz.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
