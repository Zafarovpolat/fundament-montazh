#!/usr/bin/env python3
"""Секция «7 шагов от первого звонка до готового фундамента» (макет 315:324).

Разметка и ожидания test:fidelity собираются из снятого дерева узлов
(/tmp/fig-flat.json): тексты, размеры, интервалы и цвета берутся оттуда,
в скрипте только идентификаторы узлов и их порядок.
"""
import json
import re
import sys
from pathlib import Path

CARDS = [
    ("315:332", "315:334", "315:335", 396),
    ("315:342", "315:344", "315:345", 407),
    ("315:337", "315:339", "315:340", 391),
    ("315:347", "315:349", "315:350", 328),
    ("491:631", "491:633", "491:634", 391),
]
HEAD_ID = "315:329"
EYEBROW_ID = "315:354"
CTA_ID = "491:680"
TRACK_WIDTH = 2104  # сумма карточек 1913 + 4 шага по 48 — как в макете

flat = json.load(open("/tmp/fig-flat.json", encoding="utf-8"))
nodes = flat if isinstance(flat, list) else flat.get("nodes", flat)
by_id = {n["id"]: n for n in nodes if n.get("id")}

exp = []


def style_of(nid):
    for k, v in re.findall(r"(\w+)=([^;]+?)(?= \w+=|$)", by_id[nid].get("style") or ""):
        yield k, v


def note(nid):
    st = dict(style_of(nid))
    exp.append(
        {
            "id": nid,
            "fontSize": float(st["fontSize"]),
            "lineHeight": float(st["lineHeightPx"]),
            "color": [
                round(float(x)) if i < 3 else round(float(x), 3)
                for i, x in enumerate(re.findall(r"[\d.]+", st.get("color", "0,0,0,1"))[:4])
            ],
            "text": by_id[nid]["text"],
        }
    )
    return f'data-figma-text="{nid}"'


def text_of(nid):
    t = by_id[nid]["text"] or ""
    # U+2028 (разрыв строки в макете) в HTML превращаем в <br />
    return t


L = []
L.append('      <section class="section dark" id="design">')
L.append('        <div aria-hidden="true" class="parallax-surface">')
L.append("          <img")
L.append('            alt=""')
L.append('            class="section-background img-reveal"')
L.append('            data-parallax="0.065"')
L.append('            decoding="async"')
L.append('            height="596"')
L.append('            loading="lazy"')
L.append(
    '            sizes="100vw"\n'
    '            src="assets/figma-315-327.webp"\n'
    '            srcset="assets/figma-315-327@480.webp 480w, assets/figma-315-327@960.webp 960w, assets/figma-315-327.webp 1440w"\n'
    '            width="1440"'
)
L.append("          />")
L.append("        </div>")
L.append('        <span aria-hidden="true" class="steps-rail"></span>')
L.append('        <div class="container">')
L.append('          <div class="section-heading">')
L.append("            <div>")
L.append(
    f'              <p class="eyebrow" {note(EYEBROW_ID)}>'
    f'{text_of(EYEBROW_ID)}</p>'
)
heading = text_of(HEAD_ID).split("\u2028")
L.append(f'              <h2 {note(HEAD_ID)}>')
if len(heading) > 1:
    L.append("                " + "<br />".join(x.strip() for x in heading))
else:
    L.append("                " + heading[0].strip())
L.append("              </h2>")
L.append("            </div>")
L.append(
    '            <button class="button button--yellow button--soft-icon" data-action="quote" data-motion-button type="button">'
)
L.append(
    f'              <span class="button-label" {note(CTA_ID)}>{text_of(CTA_ID)}</span>'
)
L.append(
    '              <span aria-hidden="true" class="button-icon"'
    ' ><svg class="figma-icon icon-sprite" aria-hidden="true" focusable="false">'
    '<use href="assets/icons/sprite.svg#i-project-arrow"'
    ' xlink:href="assets/icons/sprite.svg#i-project-arrow" /></svg></span>'
)
L.append("            </button>")
L.append("          </div>")
L.append('          <div class="carousel-bleed">')
L.append(
    '            <ol class="steps-track fidelity-track" data-carousel id="steps-track">'
)
for num, title, desc, width in CARDS:
    L.append("              <li class=\"step-card\">")  # ширина — по :nth-child в fidelity.css
    L.append(f'                <p class="step-card__num" {note(num)}>{text_of(num)}</p>')
    L.append(
        f'                <h3 class="step-card__title" {note(title)}>{text_of(title)}</h3>'
    )
    L.append(
        f'                <p class="step-card__text" {note(desc)}>{text_of(desc)}</p>'
    )
    L.append("              </li>")
L.append("            </ol>")
L.append("          </div>")
L.append('          <div class="steps-range" data-steps-range="steps-track">')
L.append(
    '            <input\n'
    '              aria-label="Переключение шагов работы"\n'
    '              max="1"\n'
    '              min="0"\n'
    '              step="1"\n'
    '              type="range"\n'
    '              value="0"\n'
    '            />'
)
L.append("          </div>")
L.append("        </div>")
L.append("      </section>")

Path("/tmp/steps.html").write_text("\n".join(L) + "\n", encoding="utf-8")
Path("/tmp/steps-exp.json").write_text(
    json.dumps(exp, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(f"разметка: {len(L)} строк, узлов в ожиданиях: {len(exp)}")
