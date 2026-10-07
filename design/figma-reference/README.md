# Figma reference snapshots

These are sanitized Figma REST JSON snapshots committed to help future implementation work. They are node-tree/design-property exports, **not CSS and not an editable `.fig` source file**.

Snapshot metadata: file `ФундаментМонтаж`, last modified `2026-10-05T12:13:43Z` in the captured responses.

## Files

- `figma-315-160.json` — canonical `Фундамент` frame, node `315:160`, 1920 × 12839. Use this as the source for the foundation landing page.
- `figma-main-tree.json` — `Главная`, node `1:2`, 1920 × 15969. This is an alternate home-page variant, **not** the source frame for the foundation page; do not use its photos/layout as replacements for `315:160`.
- `figma-sec2-3.json` — groups `106:1530` and `193:240`, named `2` and `3`.
- `figma-tree.json` — document-level tree snapshot.

## How to use

The node data includes bounds, child/layer structure, fills, strokes, effects, text and style properties, and layout-related fields where present. Inspect the node IDs and properties in context; values describe the design, not the browser's final CSS cascade or all responsive behavior.

Image-fill references remain in the node data. Local site imagery and icons are in `../../assets/` (notably `figma-*.webp` and `icons/`). The temporary signed thumbnail URLs were removed from these snapshots. The separate image-URL manifest was intentionally not committed because its signed URLs expire; use the local assets or export fresh assets from Figma instead.

For faithful implementation, compare the target frame with the existing page at the relevant desktop/mobile widths. Do not assume `1:2` is authoritative for the foundation page; `315:160` is the selected source frame.
