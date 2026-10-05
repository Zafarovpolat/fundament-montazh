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
for nid in used:
    if nid in known:
        continue
    node = by_id.get(nid)
    if not node:
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
        big_ids.append(nid)
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
    entries.append(
        f'html [data-figma-text="{nid}"][data-figma-text] {{\n' + "\n".join(lines) + "\n}"
    )

if missing:
    sys.exit("узлов нет в снятом дереве: " + ", ".join(missing[:8]))

if entries:
    with type_path.open("a", encoding="utf-8") as f:
        f.write("\n" + "\n".join(entries) + "\n")
print(f"figma-type.css: добавлено правил {len(entries)}")

if big_ids:
    ct = Path("compact-type.css")
    text = ct.read_text(encoding="utf-8")
    cut = text.index("@media (max-width: 760px) {")
    pos = text.rindex("\n}\n", 0, cut)
    text = text[:pos] + "\n" + "\n".join(TABLET.format(n) for n in big_ids) + text[pos:]
    cut = text.index("@media (max-width: 760px) {")
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
