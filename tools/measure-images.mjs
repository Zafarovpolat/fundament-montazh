// Измеряет реальные CSS-боксы каждого <img> на 4 брейкпоинтах и сохраняет
// tools/img-boxes.json. Нужен, чтобы srcset/sizes соответствовали вёрстке,
// а не оценка «на глаз». Требуется запущенный http://127.0.0.1:5173.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const VIEWPORTS = { mobile: 390, tablet: 768, laptop: 1280, desktop: 1920 };
const OUT = path.join(dirname, "img-boxes.json");

(async () => {
  const base = process.env.BASE_URL || "http://127.0.0.1:5173/index.html";
  const browser = await chromium.launch();
  const result = {};
  for (const [name, width] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto(base, { waitUntil: "load" });
    // Прокручиваем, чтобы lazy-изображения успели загрузиться и получить box.
    await page.evaluate(async () => {
      const height = document.body.scrollHeight;
      for (let y = 0; y < height; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    result[name] = await page.evaluate(() =>
      [...document.images].map((im, index) => {
        const rect = im.getBoundingClientRect();
        return {
          index,
          src: (im.getAttribute("src") || "").replace(/^\.\//, ""),
          box: [Math.round(rect.width), Math.round(rect.height)],
        };
      }),
    );
    await page.close();
  }
  await browser.close();

  // Максимальный бокс по всем вхождениям одного и того же файла.
  const merged = {};
  for (const [vp, list] of Object.entries(result)) {
    for (const item of list) {
      const entry = (merged[item.src] ||= { box: {} });
      const current = entry.box[vp] || [0, 0];
      entry.box[vp] = [
        Math.max(current[0], item.box[0]),
        Math.max(current[1], item.box[1]),
      ];
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(merged, null, 2) + "\n");
  console.log(
    `измерено ${Object.keys(merged).length} уникальных src -> ${OUT}`,
  );
})();
