// Вспомогательный прогон для tools/extract_section_css.py: для каждого
// селектора считает, сколько узлов он находит внутри секции и сколько снаружи.
// Вход:  /tmp/selectors-in.json  {selectors: [...], section: "projects"}
// Выход: /tmp/selectors-out.json {selector: {inside, outside, error?}}
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const cfg = JSON.parse(readFileSync(process.argv[2], "utf8"));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
await page.goto(process.env.PROBE_URL || "http://127.0.0.1:5173/index.html", {
  waitUntil: "load",
});

const stats = await page.evaluate(
  async ({ selectors, section }) => {
    const scope = document.getElementById(section);
    // Псевдоэлементы и псевдоклассы состояния не меняют набор узлов, но
    // querySelectorAll на ::before бросает исключение, а на :hover вернул бы
    // пустой список. :is/:where/:not/:has оставляем — движок их понимает.
    const clean = (x) =>
      x
        .replace(/::[-\w]+(\([^)]*\))?/g, "")
        .replace(
          /:(?:hover|focus-visible|focus-within|focus|active|visited|any-link|link|target)/g,
          " ",
        )
        .replace(/\s+/g, " ")
        .trim();
    const count = (q) => {
      const all = [...document.querySelectorAll(q)];
      return {
        inside: all.filter((e) => scope && scope.contains(e)).length,
        outside: all.filter((e) => !scope || !scope.contains(e)).length,
      };
    };
    const out = {};
    for (const sel of selectors) {
      // зачищенный вариант важнее исходного: :hover в querySelectorAll не матчится
      // никогда, а сравнивать надо структурный набор узлов
      const variants = [...new Set([clean(sel), sel])].filter(Boolean);
      let done = false;
      for (const q of variants) {
        try {
          out[sel] = count(q);
          done = true;
          break;
        } catch (e) {
          /* пробуем зачищенный вариант */
        }
      }
      if (!done) out[sel] = { inside: 0, outside: 0, error: "не разобран" };
    }
    return out;
  },
  cfg,
);

await browser.close();
writeFileSync("/tmp/selectors-out.json", JSON.stringify(stats, null, 1));
const errs = Object.entries(stats).filter(([, v]) => v.error);
console.log(
  `проверено селекторов: ${Object.keys(stats).length}, неразобранных: ${errs.length}`,
);
if (errs.length) console.log("пример:", JSON.stringify(errs[0]));
