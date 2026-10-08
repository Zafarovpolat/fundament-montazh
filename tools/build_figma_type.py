#!/usr/bin/env python3
"""Дополняет figma-type.css (и compact-type.css) правилами для новых узлов.

В репозитории типографика каждого текстового узла макета живёт в figma-type.css
одним правилом `html [data-figma-text="ID"][data-figma-text]`. Генератор берёт
узлы из /tmp/fig-flat.json (снимок Figma REST API) и добавляет правила только
для тех id, которых там ещё нет; существующие записи не переписывает.

Заголовки крупнее 40 px получают clamp() и адаптивные override'ы с теми же
значениями, что уже применены ко всем остальным заголовкам сайта.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

CLAMP_FLOOR = 32  # нижняя граница для 40..79 px
CLAMP_FLOOR_BIG = 42  # и для 80 px и выше

TABLET = "  html [data-figma-text=\u0022{}\u0022][data-figma-text] {{\n    font-size: clamp(28px, 2.65625vw, 51px);\n  }}"
MOBILE = "  html [data-figma-text=\u0022{}\u0022][data-figma-text] {{\n    font-size: 28px;\n  }}"


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


flat = load("/tmp/fig-flat.json")
nodes = flat if isinstance(flat, list) else flat.get("nodes", flat)
by_id = {n["id"]: n for n in nodes if n.get("id")}

html = Path("index.html").read_text(encoding="utf-8")
used = list(dict.fromkeys(re.findall(r'data-figma-text="([^"]+)"', html)))

type_path = Path("figma-type.css")
known = set(
    re.findall(r'^html \[data-figma-text="([^"]+)"\]', type_path.read_text(encoding="utf-8"), re.M)
)

FONTS = {
    "CoFo Sans": "var(--font-body)",
    "CoFo": "var(--font-body)",
    "Euclid Circular A": "var(--font-heading)",
}


def parse_style(text):
    out = {}
    for k, v in re.findall(r"(\w+)=([^;]+?)(?= \w+=|$)", text or ""):
        out[k] = v.strip()
    return out


def num(x):
    return str(int(float(x))) if float(x) == int(float(x)) else f"{float(x):g}"


entries, big_ids, missing = [], [], []
REFRESH = "--refresh" in sys.argv
changed = []
for nid in used:
    node = by_id.get(nid)
    if not node:
        # узлы других секций в этот снимок не входили — их не трогаем
        if nid not in known:
            missing.append(nid)
        continue
    st = parse_style(node.get("style"))
    fs = float(st.get("fontSize", 0) or 0)
    lh = float(st.get("lineHeightPx", 0) or 0)
    ls = float(st.get("letterSpacing", 0) or 0)
    fw = st.get("fontWeight", "400")
    family = FONTS.get(st.get("fontFamily", ""), "var(--font-body)")
    case = "uppercase" if st.get("textCase") == "UPPER" else "none"
    color = "rgba(0, 0, 0, 1)"
    m = re.search(r"rgba\(([^)]*)\)", st.get("color", ""))
    if m:
        v = [float(x) for x in m.group(1).split(",")]
        while len(v) < 4:
            v.append(1.0)
        color = f"rgba({round(v[0])}, {round(v[1])}, {round(v[2])}, {round(v[3], 3)})"
    size = f"{num(fs)}px"
    if fs >= 40:
        floor = CLAMP_FLOOR_BIG if fs >= 80 else CLAMP_FLOOR
        size = f"clamp({floor}px, {num(fs / 1920 * 100)}vw, {num(fs)}px)"
    lines = [
        f"  font-family: {family};",
        f"  font-size: {size};",
        (
            f"  line-height: {round(lh / fs, 6):g};"
            if fs and lh
            else "  line-height: 1.2;"
        ),
        f"  font-weight: {num(fw)};",
        f"  letter-spacing: {num(ls)}px;",
        f"  text-transform: {case};",
    ]
    if node.get("w"):
        lines.append(f"  --text-width: {num(node['w'])}px;")
    lines.append(f"  color: {color};")
    rule = (
        f'html [data-figma-text="{nid}"][data-figma-text] {{\n'
        + "\n".join(lines)
        + "\n}"
    )
    if nid in known:
        if REFRESH:
            changed.append((nid, rule))
        continue
    # Адаптивные переопределения в compact-type.css есть только для 60-пиксельных
    # заголовков секций; для прочих крупных размеров хватает clamp() в базовом правиле.
    if fs == 60:
        big_ids.append(nid)
    entries.append(rule)

if missing:
    sys.exit("узлов нет в снятом дереве: " + ", ".join(missing[:8]))

text = type_path.read_text(encoding="utf-8")
if entries:
    text = text.rstrip("\n") + "\n" + "\n".join(entries) + "\n"
for nid, rule in changed:
    m = re.search(
        r'html \[data-figma-text="' + re.escape(nid) + r'"\]\[data-figma-text\] \{[^}]*\}',
        text,
    )
    if m and m.group(0) != rule:
        text = text[: m.start()] + rule + text[m.end() :]
if entries or changed:
    type_path.write_text(text, encoding="utf-8")
print(
    f"figma-type.css: добавлено {len(entries)}, обновлено по новой ревизии {len([1 for n, r in changed if r])}"
)

if big_ids:
    ct = Path("compact-type.css")
    text = ct.read_text(encoding="utf-8")
    cut = text.index("@media (max-width: 768px) {")
    pos = text.rindex("\n}\n", 0, cut)
    text = text[:pos] + "\n" + "\n".join(TABLET.format(n) for n in big_ids) + text[pos:]
    cut = text.index("@media (max-width: 768px) {")
    pos = text.rindex("\n}\n", cut)
    text = text[:pos] + "\n" + "\n".join(MOBILE.format(n) for n in big_ids) + text[pos:]
    ct.write_text(text, encoding="utf-8")
    print(f"compact-type.css: адаптив для {len(big_ids)} крупных заголовков")
else:
    print("compact-type.css: новых крупных заголовков нет")

subprocess.run(
    ["npx", "--yes", "prettier@3", "--write", "figma-type.css", "compact-type.css"],
    check=False,
)
