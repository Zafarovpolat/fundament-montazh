const { engine: chromium } = require("./browser.cjs");
const assert = require("node:assert/strict");
const { foundationUrl } = require("./site-url.cjs");

(async () => {
  const b = await chromium.launch();
  const context = await b.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    const vv = new EventTarget();
    vv.height = 844;
    vv.offsetTop = 0;
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: vv,
    });
  });
  await p.goto(foundationUrl);
  await p.locator('#hero [data-action="quote"]').first().click();
  await p.waitForFunction(
    () => document.querySelector("#contact-dialog").open,
  );
  assert.equal(
    await p.evaluate(
      () =>
        document
          .querySelector("#contact-dialog")
          .classList.contains("is-keyboard"),
    ),
    false,
  );
  await p.locator("[name=name]").focus();
  await p.evaluate(() => {
    visualViewport.height = 500;
    visualViewport.dispatchEvent(new Event("resize"));
  });
  await p.waitForFunction(() =>
    document
      .querySelector("#contact-dialog")
      .classList.contains("is-keyboard"),
  );
  await p.locator("[name=message]").focus();
  await p.waitForFunction(() => {
    const transform = getComputedStyle(
      document.querySelector("#contact-dialog"),
    ).transform;
    return transform !== "none" && new DOMMatrixReadOnly(transform).m42 < -1;
  });
  const state = await p.evaluate(() => {
    const dialog = document.querySelector("#contact-dialog");
    const scroller = dialog.querySelector(".dialog-scroll");
    const field = document.activeElement;
    return {
      overflowY: getComputedStyle(scroller).overflowY,
      maxHeight: getComputedStyle(dialog).maxHeight,
      scrollTop: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      transform: new DOMMatrixReadOnly(getComputedStyle(dialog).transform).m42,
      fieldBottom: field.getBoundingClientRect().bottom,
      visualBottom: visualViewport.offsetTop + visualViewport.height,
    };
  });
  assert.equal(state.overflowY, "hidden");
  assert.equal(state.maxHeight, "none");
  assert.equal(state.scrollTop, 0);
  assert.equal(state.scrollHeight, state.clientHeight);
  assert.ok(state.transform < -1);
  assert.ok(state.fieldBottom <= state.visualBottom - 15);
  await p.screenshot({
    path: "tests/artifacts/dialog-keyboard.png",
  });
  await p.evaluate(() => {
    visualViewport.height = 844;
    visualViewport.dispatchEvent(new Event("resize"));
  });
  await p.waitForFunction(
    () =>
      !document
        .querySelector("#contact-dialog")
        .classList.contains("is-keyboard"),
  );
  const restored = await p.evaluate(() => {
    const dialog = document.querySelector("#contact-dialog");
    return {
      overflowY: getComputedStyle(
        dialog.querySelector(".dialog-scroll"),
      ).overflowY,
      transform: getComputedStyle(dialog).transform,
    };
  });
  assert.equal(restored.overflowY, "auto");
  assert.equal(restored.transform, "none");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: the mobile keyboard lifts the whole dialog and disables its inner scroll.",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
