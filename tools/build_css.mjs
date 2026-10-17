#!/usr/bin/env node
// Сборка CSS для главной и страницы «Фундамент».
//
// Берём таблицы стилей в том порядке, в котором их подключает HTML (порядок
// каскада сохраняется), склеиваем и минифицируем clean-css уровня 1 (комментарии
// и пробелы убираются, правила не переписываются по смыслу). Результат кладём в
// корень сайта: относительные url() в CSS (assets/...) остаются рабочими.
// В HTML одна ссылка на сборку с хешем содержимого в ?v= — кеш обновляется сам.
//
// Использование:
//   node tools/build_css.mjs          собрать и переписать <link> в HTML
//   node tools/build_css.mjs --check  проверить, что сборка актуальна (для CI)
//
// Исходники *.css остаются редактируемыми; после правок запускать сборку.
import CleanCSS from "clean-css";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

// Порядок файлов = порядок <link> в HTML до сборки (каскад не меняется).
// Новую таблицу стилей нужно добавить сюда и в HTML до сборки.
const bundles = [
  {
    page: "index.html",
    out: "site-home.css",
    sources: [
      "fonts.css",
      "styles.css",
      "interactions.css",
      "figma-type.css",
      "fidelity.css",
      "compact-type.css",
      "compact.css",
      "home.css",
    ],
  },
  {
    page: "foundation.html",
    out: "site-foundation.css",
    sources: [
      "fonts.css",
      "styles.css",
      "interactions.css",
      "figma-type.css",
      "fidelity.css",
      "compact-type.css",
      "compact.css",
    ],
  },
];

const minifier = new CleanCSS({ level: 1 });
let failed = false;

for (const { page, out, sources } of bundles) {
  const htmlPath = path.join(root, page);
  const html = fs.readFileSync(htmlPath, "utf8");

  // Тег в HTML: либо исходные <link> (до сборки), либо уже сборка.
  const srcLinkRe = new RegExp(
    `^[ \\t]*<link href="(?:${sources.map((f) => f.replace(/[.]/g, "\\.")).join("|")})(?:\\?v=[^"]*)?" rel="stylesheet" />\\r?\\n`,
    "gm",
  );
  const srcLines = html.match(srcLinkRe) || [];
  if (srcLines.length && srcLines.length !== sources.length) {
    throw new Error(`${page}: в HTML ${srcLines.length} из ${sources.length} ожидаемых <link>`);
  }

  const source = sources
    .map((f) => fs.readFileSync(path.join(root, f), "utf8"))
    .join("\n");
  const result = minifier.minify(source);
  if (result.errors.length) throw new Error(`${out}: ${result.errors.join("; ")}`);
  if (result.warnings.length) console.warn(`${out}: ${result.warnings.join("; ")}`);
  const css = result.styles;
  const hash = crypto.createHash("sha256").update(css).digest("hex").slice(0, 10);

  // Сборка занимает место первого исходного <link>, остальные удаляем.
  const link = `<link href="${out}?v=${hash}" rel="stylesheet" />\n`;
  let first = true;
  let nextHtml = html.replace(srcLinkRe, () => {
    if (!first) return "";
    first = false;
    return link;
  });
  if (!srcLines.length) {
    // Уже собрано: обновляем только ?v=, если содержимое изменилось.
    nextHtml = html.replace(
      new RegExp(`<link href="${out.replace(/[.]/g, "\\.")}(?:\\?v=[^"]*)?" rel="stylesheet" />\\r?\\n`),
      link,
    );
    if (nextHtml === html && !html.includes(link)) {
      throw new Error(`${page}: не найдена ссылка на ${out}`);
    }
  }

  const outPath = path.join(root, out);
  const currentCss = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  const stale = currentCss !== css || nextHtml !== html;

  if (check) {
    if (stale) {
      console.error(`${out}: сборка устарела — запустите node tools/build_css.mjs`);
      failed = true;
    } else {
      console.log(`${out}: актуально (${sources.length} исходных файлов, ${css.length} байт)`);
    }
    continue;
  }
  fs.writeFileSync(outPath, css);
  fs.writeFileSync(htmlPath, nextHtml);
  const before = sources.reduce((n, f) => n + fs.statSync(path.join(root, f)).size, 0);
  console.log(
    `${out}: ${sources.length} файлов, ${before} → ${css.length} байт (${Math.round(
      (1 - css.length / before) * 100,
    )}% меньше), ?v=${hash}`,
  );
}

if (failed) process.exit(1);
