const { engine, settle } = require("./browser.cjs");
const assert = require("node:assert/strict");
const { homeUrl, foundationUrl } = require("./site-url.cjs");

const pages = [
  { name: "home", url: homeUrl },
  { name: "foundation", url: foundationUrl },
];
const viewports = [
  { width: 375, height: 812 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const footerVisible = () => {
  const legal = document.querySelector(".footer-legal");
  if (!legal) return false;
  const opacity = (el) => {
    let value = 1;
    for (let node = el; node; node = node.parentElement)
      value *= Number(getComputedStyle(node).opacity);
    return value;
  };
  return [
    legal.querySelector(":scope > p:first-child"),
    legal.querySelector(":scope > div > button"),
    legal.querySelector(":scope > div > a"),
    legal.querySelector(":scope > .footer-credit"),
  ].every((el) => el && opacity(el) >= 0.999);
};

(async () => {
  const browser = await engine.launch({ headless: true });
  const page = await browser.newPage();
  for (const entry of pages) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(entry.url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      const visible = await settle(page, footerVisible, { timeout: 4000 });
      assert.ok(
        visible,
        `${entry.name} at ${viewport.width}x${viewport.height}: footer-legal items stay hidden at page end`,
      );
    }
  }
  await browser.close();
  console.log(
    "PASS: footer-legal (Оферта, политика, копирайт, «Сделано в») stays visible at page end on both pages and every checked viewport.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
