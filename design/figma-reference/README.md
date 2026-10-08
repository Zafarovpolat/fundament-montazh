# Figma reference snapshots

Sanitized Figma REST API JSON snapshots for future implementation work. These describe design nodes and properties; they are not CSS or an editable `.fig` file.

Captured source file: `ФундаментМонтаж`, last modified `2026-10-05T12:13:43Z` in the API responses.

## Priority / page map

- `figma-pages-bundle.json` — one API response for the requested pages and variants, fetched with `geometry=paths` so vector path data is included. Its `nodes` map contains:
  - `540:662` — **main mobile** frame, 375 × 14233. Its opening copy begins “10 лет строим дома / Строим дома, за которые отвечаем своим именем”.
  - `597:663` — **mobile version of the second page**, 375 × 11906; its copy matches the desktop foundation page below.
  - `430:365` — privacy policy, desktop, 1920 × 2220.
  - `440:1643` — personal-data processing rules, desktop, 1920 × 1720.
  - `434:1410` — 404, desktop, 1920 × 1668.
  - `440:1769` — request-success page, desktop, 1920 × 1668.
  - `440:1632` — cookie banner, 1663 × 167.
  - `42:2` — form, 682 × 777.
  - `606:1834` — mobile privacy policy, 375 × 2547; `606:1087` — mobile adaptive frame with return-to-home/contact content, 375 × 1578; `606:1750` — mobile request-success page, 375 × 1730.
  - `563:563` — additional mobile home-page variant, 375 × 1980; `597:1627` — compact calculator/estimate frame, 375 × 812; `540:856` — video block, 338 × 374; `491:641` — “6 шагов от звонка до новоселья”, 275 × 1128.
- `figma-315-160.json` — desktop second page `Фундамент`, node `315:160`, 1920 × 12839. This was already captured as the canonical desktop foundation page; `597:663` is its matching mobile version.
- `figma-main-tree.json` — pre-existing desktop `Главная` frame `1:2`, 1920 × 15969. It is an alternate variant, **not** part of the new API bundle and not the authoritative source for replacing foundation-page assets.
- `figma-sec2-3.json` — groups `106:1530` and `193:240`.
- `figma-tree.json` — document-level tree snapshot.

The desktop main frame `1:2` was intentionally excluded from the new bundle, as requested.

## Reading the JSON

Inspect each node's bounds, child/layer structure, fills, strokes, effects, text/style properties, layout fields, and vector geometry. These are Figma design values, not a browser CSS cascade or a complete responsive specification; use the desktop/mobile frames together when implementing.

Image-fill references are preserved as `imageRef` values. The short-lived signed thumbnail URLs were removed, and the separate image-URL manifest was not committed because its signed URLs expire. Use the local site assets under `../../assets/` or export fresh images from Figma. Do not add personal access tokens or signed download URLs to this directory.
