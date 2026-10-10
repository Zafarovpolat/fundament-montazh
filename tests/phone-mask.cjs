"use strict";

const assert = require("node:assert/strict");
const { engine } = require("./browser.cjs");
const { homeUrl, foundationUrl } = require("./site-url.cjs");

(async () => {
  const browser = await engine.launch();
  try {
    for (const url of [homeUrl, foundationUrl]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const response = await page.goto(url, { waitUntil: "networkidle" });
      assert(response?.ok(), `page should load: ${url}`);

      await page.locator('[data-action="quote"]').first().click();
      const phone = page.locator('#contact-form input[name="phone"]');
      await phone.fill("9991234567");
      assert.equal(await phone.inputValue(), "+7 (999) 123-45-67");
      assert.equal(await phone.evaluate((input) => input.checkValidity()), true);

      await phone.fill("8 (999) 123-45-67");
      assert.equal(await phone.inputValue(), "+7 (999) 123-45-67");

      await phone.fill("+7 (999) abc-45-67");
      assert.doesNotMatch(await phone.inputValue(), /[A-Za-z]/);
      await phone.fill("");
      await phone.press("a");
      assert.equal(await phone.inputValue(), "", "letters are blocked or removed");
      assert.deepEqual(pageErrors, [], `no page errors: ${url}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log("Phone mask passes on the home and foundation pages.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
