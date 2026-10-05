#!/usr/bin/env python3
"""Генерирует секцию «Что входит» (макет 491:625) и ожидания test:fidelity.

Тексты, стили и идентификаторы узлов берутся из /tmp/spec.json и
/tmp/fig-flat.json, снятых с Figma REST API. Ничего не дописывается от себя;
если текст узла не найден в дереве — генератор падает, а не выдумывает id.
"""
import json
import re
import sys

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

flat = load("/tmp/fig-flat.json")
nodes = flat if isinstance(flat, list) else flat.get("nodes", flat)
spec = load("/tmp/spec.json")["included"]

def norm(t):
    return re.sub(r"\s+", " ", (t or "").replace("\n", " ").replace("- ", "-")).strip()

index = {}
for n in nodes:
    if n.get("type") == "TEXT" and n.get("text"):
        index.setdefault(norm(n["text"]), []).append(n)

# Правки только против артефактов вёрстки макета, не против содержания:
# «Прозрачное ценообразование» лежит в рамке 90 px и перенесено через дефис.
FIXES = {"Прозрачное ценообра-зование": "Прозрачное ценообразование"}

def dom(t):
    return FIXES.get(norm(t), FIXES.get(t, t))

missing = []

def find_node(text):
    key = norm(text)
    cands = index.get(key) or []
    if not cands:
        missing.append(text)
    return cands[0] if cands else None

def esc(t):
    return (t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

exp = []

def tag(text, force_id=None):
    """Возвращает data-figma-text для текста и дополняет ожидания."""
    n = find_node(text) if force_id is None else next(
        (x for x in nodes if x.get("id") == force_id), None
    )
    if not n:
        missing.append(text)
        return ""
    st = n.get("style", "")

    def num(name, default=None):
        m = re.search(rf"{name}=([\d.]+)", st)
        return float(m.group(1)) if m else default

    def color():
        m = re.search(r"rgba\(([^)]*)\)", st)
        if not m:
            return [0, 0, 0, 1]
        v = [float(x) for x in m.group(1).split(",")]
        while len(v) < 4:
            v.append(1.0)
        return [round(v[0]), round(v[1]), round(v[2]), round(v[3], 3)]

    exp.append(
        {
            "id": n["id"],
            "fontSize": num("fontSize"),
            "lineHeight": num("lineHeightPx"),
            "color": color(),
            "text": n["text"],
        }
    )
    return f' data-figma-text="{n["id"]}"'

L = []
L.append('      <section class="section" id="included">')
L.append('        <div class="container">')
L.append('          <div class="section-heading">')
L.append("            <div>")
L.append(
    '              <p class="eyebrow"'
    + tag(spec["eyebrow"]["text"])
    + f">{esc(dom(spec["eyebrow"]["text"]))}</p>"""
)
L.append("              <h2>")
for i, t in enumerate(spec["title"]):
    cls = "heading-line heading-line--inset" if i else "heading-line"
    L.append(
        f'                <span class="{cls}"'
        + tag(t["text"])
        + f">{esc(t['text'])}</span>"
    )
L.append("              </h2>")
L.append("            </div>")
note = spec["note"][0]
L.append(
    '            <p class="heading-description"'
    + tag(note["text"])
    + f'>{esc(note["text"])}</p>'
)
L.append("          </div>")
L.append('          <div class="included-panels">')

for idx, col in enumerate(spec["columns"]):
    extra = idx == 1
    L.append(
        f'            <div class="included-panel included-panel--'
        + ("extra" if extra else "full")
        + '">'
    )
    L.append(
        '              <p class="included-panel__tab"'
        + tag(col["tab"][0])
        + f'>{esc(col["tab"][0])}</p>'
    )
    L.append(
        f'              <{"ol" if not extra else "ul"} class="included-tiles">'
    )
    for cell in col["cells"]:
        t0, t1 = cell["texts"][0], cell["texts"][1]
        if extra:
            L.append('                <li class="included-tile included-tile--price">')
            L.append(
                '                  <span class="included-tile__name"'
                + tag(t0["text"])
                + f'>{esc(t0["text"])}</span>'
            )
            L.append(
                '                  <span class="included-tile__price"'
                + tag(t1["text"])
                + f'>{esc(t1["text"])}</span>'
            )
        else:
            muted = " is-muted" if not (cell["bg"] is None) else ""
            L.append(f'                <li class="included-tile{muted}">')
            L.append(
                '                  <span class="included-tile__num"'
                + tag(t0["text"])
                + f">{esc(t0['text'])}</span>"
            )
            L.append(
                '                  <span class="included-tile__text"'
                + tag(t1["text"].replace("\n", " ").strip())
                + f">{esc(t1['text'])}</span>"
            )
        L.append("                </li>")
    L.append(f"              </{'ol' if not extra else 'ul'}>")
    if extra:
        head, para = col["heading"][0], col["para"][0]
        L.append('              <div class="included-saving">')
        L.append(
            '                <p class="included-saving__title"'
            + tag(head["text"])
            + f">{esc(head['text'])}</p>"
        )
        L.append(
            '                <p class="included-saving__text"'
            + tag(para["text"])
            + f">{esc(para['text'])}</p>"
        )
        L.append("              </div>")
    L.append("            </div>")
L.append("          </div>")
L.append("        </div>")
L.append("      </section>")

if missing:
    sys.exit("не найдены в дереве Figma: " + "; ".join(map(str, missing[:6])))

with open("/tmp/included.html", "w", encoding="utf-8") as f:
    f.write("\n".join(L) + "\n")
with open("/tmp/included-exp.json", "w", encoding="utf-8") as f:
    json.dump(exp, f, ensure_ascii=False, indent=2)
print(f"готово: {len(L)} строк разметки, {len(exp)} узлов в ожиданиях")
