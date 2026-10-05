#!/usr/bin/env python3
"""Генерация responsive-вариантов тяжёлых изображений и обвязка <img>.

Что делает:
  1. Для каждого <img> из index.html берёт натуральный размер файла и CSS-бокс
     из tools/img-boxes.json (его снимает tools/measure-images.mjs).
  2. Для файлов шире MIN_WIDTH пишет варианты 480w/960w в webp (только если
     экономия >= 15%), имя вида  figma-360-462@480.webp.
  3. Прописывает srcset + sizes по реальным боксам, width/height (страховка от
     CLS), а также loading/fetchpriority: изображения выше первого экрана —
     eager + fetchpriority=high, остальные — lazy.
  4. Добавляет класс img-reveal (плавное появление, см. interactions.css).

Запуск из корня репозитория:  python3 tools/optimize_images.py [--dry-run]
Требования: Pillow. Идемпотентно: варианты пересоздаются, атрибуты перезаписываются.
"""

from __future__ import annotations

import json
import os
import re
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "index.html")
BOXES = os.path.join(ROOT, "tools", "img-boxes.json")
MIN_WIDTH = 560  # файлы уже этого размера не дробим
VARIANTS = (480, 960)
QUALITY = 74
KEEP_IF_SAVES = 0.15  # вариант нужен, только если экономит >= 15%

# Изображения первого экрана: их нельзя грузить лениво, иначе LCP деградирует.
EAGER_SRC = {
    "assets/figma-360-462.webp",  # фон hero
    "assets/figma-360-436.webp",  # логотип в шапке
}

IMG_RE = re.compile(r"<img\b[^>]*?/?>", re.S)
ATTR_RE = re.compile(r'([a-zA-Z][\w:-]*)="([^"]*)"')


def natural(path: str):
    """Нативный размер файла. SVG не растер: берём width/height или viewBox."""
    full = os.path.join(ROOT, path)
    if path.lower().endswith(".svg"):
        head = open(full, encoding="utf-8").read(600)
        w = re.search(r'\bwidth="([\d.]+)"', head)
        h = re.search(r'\bheight="([\d.]+)"', head)
        if w and h:
            return round(float(w.group(1))), round(float(h.group(1)))
        vb = re.search(r'viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"', head)
        if vb:
            return round(float(vb.group(1))), round(float(vb.group(2)))
        return None
    with Image.open(full) as im:
        return im.size


def sizes_attr(box: dict) -> str:
    """(min-width) из реальных CSS-боксов; полноширинные — через vw."""

    def part(vp: str, query: str) -> str | None:
        w = (box.get(vp) or [0, 0])[0]
        if not w:
            return None
        full = {
            "desktop": 1900,
            "laptop": 1270,
            "tablet": 758,
            "mobile": 380,
        }[vp]
        value = "100vw" if w >= full else f"{w}px"
        return f"{query} {value}" if query else value

    parts = [
        part("desktop", "(min-width: 1441px)"),
        part("laptop", "(min-width: 1025px)"),
        part("tablet", "(min-width: 641px)"),
        part("mobile", ""),
    ]
    return ", ".join(p for p in parts if p)


def make_variants(src: str, dry: bool) -> list[tuple[int, str]]:
    """Возвращает [(descriptor_width, path), ...] от меньшего к большему."""
    path = os.path.join(ROOT, src)
    if not os.path.exists(path):
        return []
    width, height = natural(src)
    if width < MIN_WIDTH:
        return []
    base, ext = os.path.splitext(src)
    accepted: list[tuple[int, str]] = []
    # От большего к меньшему: вариант нужен, только если он хотя бы на
    # KEEP_IF_SAVES легче предыдущего принятого (более тяжёлого) кандидата.
    prev_size = os.path.getsize(path)
    for target in sorted(VARIANTS, reverse=True):
        if target >= width:
            continue
        out_path = f"{base}@{target}{ext}"
        full_out = os.path.join(ROOT, out_path)
        if not dry:
            im = Image.open(path)
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA")
            scale = target / width
            resized = im.resize((target, max(1, round(height * scale))), Image.LANCZOS)
            if resized.mode == "RGB":
                resized = resized.filter(ImageFilter.UnsharpMask(radius=0.7, percent=55, threshold=3))
            resized.save(full_out, "WEBP", quality=QUALITY, method=6)
        size = prev_size if dry else os.path.getsize(full_out)
        if size > prev_size * (1 - KEEP_IF_SAVES):
            if os.path.exists(full_out):
                os.remove(full_out)
            continue
        accepted.append((target, out_path))
        prev_size = size
    accepted.sort()
    accepted.append((width, src))
    return accepted


def rewrite_tag(tag: str, boxes: dict, dry: bool, stats: dict) -> str:
    attrs = dict(ATTR_RE.findall(tag))
    src = attrs.get("src", "")
    if not src.startswith("assets/"):
        return tag
    box = (boxes.get(src) or {}).get("box", {})
    size = natural(src)
    if size is None:
        return tag
    width, height = size
    eager = src in EAGER_SRC
    if src.lower().endswith(".svg") or width < MIN_WIDTH:
        # Вектор уже retina-ready, мелкие растры дробить нечего: только размеры.
        attrs["width"] = str(width)
        attrs["height"] = str(height)
        attrs["decoding"] = "async"
        stats["sizes_only"] += 1
        return tag

    srcset = make_variants(src, dry)

    if srcset:
        attrs["srcset"] = ", ".join(f"{p} {w}w" for w, p in srcset)
        attrs["sizes"] = sizes_attr(box) or f"{width}px"
        stats["with_srcset"] += 1
        original = os.path.getsize(os.path.join(ROOT, src))
        # На мобильном брейкпоинте браузер возьмёт самый маленький вариант:
        # считаем экономию относительно него, а не суммы всех файлов.
        smallest = os.path.getsize(os.path.join(ROOT, srcset[0][1]))
        stats["mobile_savings"] += original - smallest
    attrs["width"] = str(width)
    attrs["height"] = str(height)
    attrs["loading"] = "eager" if eager else "lazy"
    attrs["decoding"] = "async"
    if eager:
        # Изображения первого экрана не прячем: fade задержал бы LCP.
        attrs["fetchpriority"] = "high"
    else:
        attrs.pop("fetchpriority", None)
        classes = (attrs.get("class", "") + " img-reveal").split()
        attrs["class"] = " ".join(dict.fromkeys(c for c in classes if c))

    order = [
        "alt",
        "class",
        "id",
        "data-parallax",
        "data-object-photo",
        "data-photo-index",
        "src",
        "srcset",
        "sizes",
        "width",
        "height",
        "loading",
        "decoding",
        "fetchpriority",
    ]
    keys = [k for k in order if k in attrs] + [k for k in attrs if k not in order]
    body = "\n".join(f'{" " * 12}{k}="{attrs[k]}"' for k in keys)
    return f"<img\n{body}\n{' ' * 10}/>"


def main() -> int:
    dry = "--dry-run" in sys.argv
    if not os.path.exists(BOXES):
        print(
            "Нет tools/img-boxes.json — сначала: node tools/measure-images.mjs "
            "(нужен запущенный сервер на 5173)",
            file=sys.stderr,
        )
        return 1
    boxes = json.load(open(BOXES, encoding="utf-8"))
    html = open(HTML, encoding="utf-8").read()
    stats = {"with_srcset": 0, "mobile_savings": 0, "sizes_only": 0}
    new_html = IMG_RE.sub(lambda m: rewrite_tag(m.group(0), boxes, dry, stats), html)

    # Удалённые ранее варианты, которые больше не нужны (например после правок макета).
    stale = 0
    for name in os.listdir(os.path.join(ROOT, "assets")):
        if "@480." not in name and "@960." not in name:
            continue
        stem = re.sub(r"@\d+(?=\.\w+$)", "", name)
        if f"assets/{stem}" not in new_html:
            os.remove(os.path.join(ROOT, "assets", name))
            stale += 1

    if not dry:
        open(HTML, "w", encoding="utf-8").write(new_html)
    print(
        f"srcset получил {stats['with_srcset']} тег(ов); экономия на мобильном "
        f"брейкпоинте (самый маленький вариант против оригинала): "
        f"{stats['mobile_savings'] // 1024} KB; только width/height получили "
        f"{stats['sizes_only']} тег(ов); устаревших вариантов удалено: {stale}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
