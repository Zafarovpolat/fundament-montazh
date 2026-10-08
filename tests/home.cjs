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

  const widths = [320, 375, 390, 480, 640, 768, 1024, 1280, 1440, 1920, 2560];
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
    }));
    assert.equal(metrics.scrollWidth, width, `Homepage overflow at ${width}px`);
    assert.equal(metrics.h1, 1, "Homepage must have one H1");
    assert.equal(metrics.page, "home");
    assert.equal(metrics.sectionIds.length, 17);
    assert.ok(metrics.sectionIds.includes("home-social"));
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

  // Materials are selectable with both pointer and keyboard; unsupported facts
  // are not carried over to the other technologies.
  const brickTab = page.locator('[data-home-tech="brick"]');
  await brickTab.click();
  assert.equal(
    (await page.locator("#home-tech-title").textContent()).trim(),
    "Кирпич",
  );
  assert.equal(await page.locator("#home-tech-facts").isHidden(), true);
  await brickTab.press("ArrowRight");
  assert.equal(
    (await page.locator("#home-tech-title").textContent()).trim(),
    "Клеёный брус",
  );
  assert.equal(
    await page.locator('[data-home-tech="timber"]').getAttribute("aria-selected"),
    "true",
  );

  // The project filter reports the empty state instead of inventing cards.
  await page.locator('[data-filter="5"]').click();
  assert.equal(await page.locator("[data-project]:visible").count(), 0);
  assert.equal(await page.locator(".empty-projects").isVisible(), true);
  await page.locator('[data-filter="0"]').click();
  assert.equal(await page.locator("[data-project]:visible").count(), 1);

  // Video and the four-question flow remain usable without fake destinations or
  // an automatic submission/price calculation.
  await page.locator('[data-action="video"]').click();
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
    "PASS: homepage routing, 11 responsive widths, no horizontal overflow, 17 sections, local images, mobile navigation, technology tabs, project empty state, video information and quiz.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
