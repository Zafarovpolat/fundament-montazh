#!/usr/bin/env python3
"""Сверка текстов внутренних страниц с кадрами макета.

Берёт четыре страницы, для каждой — свой кадр Figma из снимка
design/figma-reference/figma-pages-bundle.json, и проверяет:

1. Каждый текстовый узел кадра (кроме служебной строки статуса и вставленных
   из готовых страниц шапки/футера) присутствует на странице дословно —
   с учётом textCase макета, переносов (\\u2028 и <br>) и мягких дефисов.
2. Каждый элемент с data-figma-text совпадает с узлом макета посимвольно
   (в том же нормализованном виде).

Запуск из корня репозитория: python3 tools/check_subpages_text.py
"""

from __future__ import annotations

import html as htmllib
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / "design" / "figma-reference" / "figma-pages-bundle.json"

PAGES = {
    "privacy.html": ("430:365", "606:1834"),
    "personal-data.html": ("440:1643",),
    "404.html": ("434:1410", "606:1087"),
    "thanks.html": ("440:1769", "606:1750"),
}

# Строка статуса телефона и поддеревья, взятые из готовых страниц: их тексты
# сверяет тест шапки/футера, а не этот скрипт.
SKIP_SUBTREES = ("Status Bar",)
SKIP_NODE_IDS = {"I609:1439;609:1048", "I609:1492;609:1048", "I609:1386;609:1048",
                 "I609:1279;609:976"}


def fold_hyphen(text: str) -> str:
    """Перенос в макете набран дефисом («КОНФИДЕН-ЦИАЛЬНОСТИ»), а на странице
    стоит мягкий дефис: при сверке разрешаем перенос на месте дефиса."""
    return re.sub(r"(?<=\w)-\s*(?=\w)", "", text)


def norm(text: str, text_case: str | None) -> str:
    """Единый вид для сравнения: переносы → пробел, регистр — как в макете."""
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u2028", " ").replace("\u2029", " ").replace("\u00ad", "")
    text = text.replace("\xa0", " ").replace("\u2011", "-")
    if text_case == "UPPER":
        text = text.upper()
    elif text_case == "LOWER":
        text = text.lower()
    return re.sub(r"\s+", " ", text).strip()


def node_index(bundle: dict) -> dict[str, tuple[dict, bool]]:
    index: dict[str, tuple[dict, bool]] = {}

    def go(node: dict, skip: bool = False) -> None:
        skip = skip or node.get("name") in SKIP_SUBTREES
        index[node["id"]] = (node, skip)
        for child in node.get("children") or []:
            go(child, skip)

    for value in bundle["nodes"].values():
        go(value["document"])
    return index


def frame_texts(index, frame_id: str) -> list[tuple[str, str, str]]:
    out: list[tuple[str, str, str]] = []

    def go(node: dict, skip: bool = False) -> None:
        skip = skip or node.get("name") in SKIP_SUBTREES
        characters = node.get("characters") or ""
        if (not skip and node.get("type") == "TEXT" and characters.strip()
                and node["id"] not in SKIP_NODE_IDS):
            out.append((node["id"], node.get("name") or "", characters))
        for child in node.get("children") or []:
            go(child, skip)

    go(index[frame_id][0])
    return out


def page_text(body: str) -> str:
    """Весь видимый текст страницы без разметки."""
    body = re.sub(r"<script\b.*?</script>", " ", body, flags=re.S | re.I)
    body = re.sub(r"<svg\b.*?</svg>", " ", body, flags=re.S | re.I)
    body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)
    body = re.sub(r"<[^>]+>", " ", body)
    return norm(htmllib.unescape(body), None)


def tagged_texts(body: str) -> dict[str, list[str]]:
    """{id узла: тексты элементов с data-figma-text}."""
    out: dict[str, list[str]] = {}
    for match in re.finditer(
        r"<(\w+)\b([^>]*?data-figma-text=\"([^\"]+)\"[^>]*)>(.*?)</\1>", body, re.S
    ):
        fid, inner = match.group(3), match.group(4)
        inner = re.sub(r"<svg\b.*?</svg>", " ", inner, flags=re.S | re.I)
        inner = re.sub(r"<br\s*/?>", " ", inner, flags=re.I)
        inner = re.sub(r"<[^>]+>", "", inner)
        out.setdefault(fid, []).append(norm(htmllib.unescape(inner), None))
    return out


def main() -> int:
    bundle = json.loads(BUNDLE.read_text(encoding="utf-8"))
    index = node_index(bundle)
    problems = 0
    for page, frames in PAGES.items():
        raw = (ROOT / page).read_text(encoding="utf-8")
        body = raw.split("<body", 1)[1]
        whole = page_text(body).upper()  # регистр страницы задаёт CSS text-transform
        tagged = tagged_texts(body)
        print(f"\n===== {page}")
        for frame in frames:
            missing = []
            for fid, name, characters in frame_texts(index, frame):
                want = norm(characters, (index[fid][0].get("style") or {}).get("textCase"))
                if not want:
                    continue
                if want.upper() in whole or fold_hyphen(want).upper() in whole:
                    continue
                missing.append((fid, name, want))
            print(f"  кадр {frame}: текстов {len(frame_texts(index, frame))}, "
                  f"нет на странице {len(missing)}")
            for fid, name, want in missing:
                problems += 1
                print(f"    ⚠ {fid} {name!r}: макет → {want[:110]!r}")
        diff = 0
        for fid, values in tagged.items():
            node = index.get(fid)
            if not node:
                continue
            want = norm(node[0].get("characters") or "",
                        (node[0].get("style") or {}).get("textCase"))
            if not want:
                continue
            for value in values:
                same = (value.upper() == want.upper()
                        or fold_hyphen(value).upper() == fold_hyphen(want).upper())
                if same:
                    continue
                diff += 1
                problems += 1
                print(f"    ⚠ элемент {fid}: макет → {want[:90]!r} | "
                      f"страница → {value[:90]!r}")
        if not diff:
            print("  элементы с data-figma-text: все совпадают")
    print(f"\nрасхождений: {problems}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
