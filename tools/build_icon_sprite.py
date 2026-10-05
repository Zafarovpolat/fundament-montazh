#!/usr/bin/env python3
"""Перенос SVG-иконок в один спрайт (чек-лист п.6) + растеризация 2ГИС-карты.

Делает:
  1. assets/icons/sprite.svg — набор <symbol id="i-<имя>"> из 20 мелких SVG.
  2. Каждый <img src="assets/icons/<name>.svg"> в index.html заменяется на
     <svg class="… icon-sprite"><use href="assets/icons/sprite.svg#i-<name>"/></svg>
     с сохранением исходных классов и добавочных атрибутов.
  3. review-map.svg (89 KB, внутри — встроенный PNG 600×156) вырезается в
     assets/gis-map.webp: карта — растр, её в спрайт класть нельзя.
  4. В CSS дополняются селекторы, которые сейчас нацелены на `img` иконок,
     чтобы `<svg>` наследовал ровно те же правила (специфичность сохраняется:
     к селектору добавляется вариант с `svg`, а не с классом).

Запуск из корня репозитория:  python3 tools/build_icon_sprite.py
Инструмент идемпотентен: повторный запуск пересоздаёт спрайт и не трогает
уже перенесённые <svg>.
"""

from __future__ import annotations

import base64
import io
import os
import re
import xml.etree.ElementTree as ET

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "assets", "icons")
HTML = os.path.join(ROOT, "index.html")
SPRITE = os.path.join(ICONS, "sprite.svg")
GIS_SVG = os.path.join(ICONS, "review-map.svg")
GIS_WEBP = os.path.join(ROOT, "assets", "gis-map.webp")
RASTER_ICON_SIZES = (105, 156)  # видимый crop паттерна review-map.svg

CSS_FILES = [
    "fonts.css",
    "styles.css",
    "interactions.css",
    "figma-type.css",
    "fidelity.css",
    "compact-type.css",
    "compact.css",
]
# Стоящий отдельно токен img (не .img-block, не image, не background-image).
IMG_TOKEN = re.compile(r"(?<![-\w.])img(?![-\w])")

IMG_RE = re.compile(r"<img\b[^>]*?/?>", re.S)
ATTR_RE = re.compile(r'([a-zA-Z][\w:-]*)="([^"]*)"')
SVG_NS = "{http://www.w3.org/2000/svg}"


def symbolize(name: str, path: str) -> str:
    """Корневой <svg> -> <symbol> с исходными presentation-атрибутами."""
    root = ET.fromstring(open(path, encoding="utf-8").read())
    view_box = root.attrib.get("viewBox")
    if not view_box:
        w = root.attrib.get("width", "").rstrip("px")
        h = root.attrib.get("height", "").rstrip("px")
        view_box = f"0 0 {w} {h}"
    keep = {k: v for k, v in root.attrib.items() if k in {"fill", "fill-rule", "clip-rule", "stroke"}}
    inner = "".join(ET.tostring(child, encoding="unicode") for child in root)
    inner = inner.replace("ns0:", "").replace(":nbsp", "")
    attrs = f' id="i-{name}" viewBox="{view_box}"' + "".join(
        f' {k}="{v}"' for k, v in keep.items()
    )
    return f"  <symbol{attrs}>{inner}</symbol>"


def build_sprite() -> int:
    names = sorted(
        f[:-4]
        for f in os.listdir(ICONS)
        if f.endswith(".svg") and f not in {"review-map.svg", "sprite.svg"}
    )
    body = "\n".join(symbolize(n, os.path.join(ICONS, f"{n}.svg")) for n in names)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<!-- Собранное: python3 tools/build_icon_sprite.py. Не редактировать вручную. -->\n"
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
        f"\n{body}\n</svg>\n"
    )
    open(SPRITE, "w", encoding="utf-8").write(xml)
    return len(names)


def extract_gis_map() -> tuple[int, int]:
    """review-map.svg — это PNG 600×156 внутри паттерна; берём видимую часть."""
    src = open(GIS_SVG, encoding="utf-8").read()
    b64 = re.search(r'href="data:image/png;base64,([^"]+)"', src)
    if not b64:
        return (0, 0)
    im = Image.open(io.BytesIO(base64.b64decode(b64.group(1)))).convert("RGBA")
    crop = im.crop((0, 0, *RASTER_ICON_SIZES))
    crop.save(GIS_WEBP, "WEBP", quality=76, method=6)
    return crop.size


def rewrite_html() -> tuple[int, int]:
    html = open(HTML, encoding="utf-8").read()
    converted = raster_fixed = 0

    def sub(match: re.Match) -> str:
        nonlocal converted, raster_fixed
        tag = match.group(0)
        attrs = dict(ATTR_RE.findall(tag))
        src = attrs.get("src", "")
        if "assets/icons/" not in src:
            return tag
        name = os.path.basename(src)[:-4]
        if name == "review-map":
            # Растровая карта 2ГИС остаётся <img>, но перестаёт быть SVG с PNG внутри.
            width, height = RASTER_ICON_SIZES
            attrs.pop("decoding", None)
            order = ["alt", "class", "src", "srcset", "sizes", "width", "height", "loading", "decoding"]
            attrs.update({"src": "assets/gis-map.webp", "width": width, "height": height})
            keys = [k for k in order if k in attrs] + [k for k in attrs if k not in order]
            body = "\n".join(f'{" " * 12}{k}="{attrs[k]}"' for k in keys)
            raster_fixed += 1
            return f"<img\n{body}\n{' ' * 10}/>"
        classes = " ".join(
            dict.fromkeys((attrs.get("class", "") + " icon-sprite").split())
        )
        svg_attrs = {
            "class": classes,
            "aria-hidden": "true",
            "focusable": "false",
        }
        for key, value in attrs.items():
            if key.startswith("data-") or key == "id":
                svg_attrs[key] = value
        body = "\n".join(f'{" " * 12}{k}="{v}"' for k, v in svg_attrs.items())
        converted += 1
        href = f"assets/icons/sprite.svg#i-{name}"
        return (
            f"<svg\n{body}\n{' ' * 10}>"
            f'\n{" " * 12}<use href="{href}" xlink:href="{href}" />'
            f"\n{' ' * 10}</svg>"
        )

    open(HTML, "w", encoding="utf-8").write(IMG_RE.sub(sub, html))
    return converted, raster_fixed


def transform_css_text(text: str) -> tuple[str, int]:
    """Проход по CSS: патчим только селекторы, комментарии остаются на месте."""
    out: list[str] = []
    buf: list[str] = []
    changed = 0
    i = 0
    n = len(text)
    in_comment = False

    def flush(replace_with: str | None = None) -> None:
        nonlocal changed
        if replace_with is not None:
            out.append(replace_with)
            changed += 1
        else:
            out.append("".join(buf))

    while i < n:
        ch = text[i]
        if in_comment:
            buf.append(ch)
            if ch == "*" and text[i + 1 : i + 2] == "/":
                buf.append("/")
                i += 2
                in_comment = False
                continue
            i += 1
            continue
        if ch == "/" and text[i + 1 : i + 2] == "*":
            buf.append("/*")
            i += 2
            in_comment = True
            continue
        if ch == "{":
            flush(patched_prelude("".join(buf)))
            out.append("{")
            buf = []
            i += 1
            continue
        if ch in ";}":
            flush()
            out.append(ch)
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    flush()
    return "".join(out), changed


def patched_prelude(prelude: str) -> str | None:
    """Возвращает новый prelude (или None, если правка не нужна)."""
    idx = prelude.rfind("*/")
    head, selector = (prelude[: idx + 2], prelude[idx + 2 :]) if idx >= 0 else ("", prelude)
    if not IMG_TOKEN.search(selector) or selector.lstrip().startswith("@"):
        return None
    lead = selector[: len(selector) - len(selector.lstrip())]
    body = selector.strip()
    if not body:
        return None
    parts = [p.strip() for p in body.split(",")]
    clones = []
    for part in parts:
        if not IMG_TOKEN.search(part):
            continue
        clone = IMG_TOKEN.sub("svg", part)
        if clone not in parts and clone not in clones:
            clones.append(clone)
    if not clones:
        return None
    all_parts = parts + clones
    indent = "\n" + (lead.rsplit("\n", 1)[-1] if "\n" in lead else "")
    joined = ", ".join(all_parts)
    if len(joined) > 66 or not joined.startswith("."):
        joined = ("," + indent).join(all_parts)
    return head + lead + joined + " "


def patch_css() -> int:
    """Каждому правилу про img добавляет близнеца про svg — паритет каскада после
    переноса иконок в спрайт. Специфичность сохраняется: svg тоже тип элемента."""
    patched = 0
    for name in CSS_FILES:
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8").read()
        new_text, changed = transform_css_text(text)
        if changed:
            open(path, "w", encoding="utf-8").write(new_text)
            patched += changed
    return patched


def main() -> int:
    count = build_sprite()
    extract_gis_map()
    converted, raster_fixed = rewrite_html()
    patched = patch_css()
    print(
        f"спрайт: {count} символов; иконок перенесено: {converted}; "
        f"gis-карта заменена: {raster_fixed}; селекторов CSS дополнено: {patched}"
    )
    print(f"размер спрайта: {os.path.getsize(SPRITE) // 1024} KB, gis-map.webp: {os.path.getsize(GIS_WEBP) // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
