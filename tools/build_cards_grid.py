#!/usr/bin/env python3
"""Генерирует разметку сетки карточек и ожидания для test:fidelity из
спецификации, снятой с Figma REST API (/tmp/spec.json).

Тексты, размеры шрифтов, межстрочные интервалы и цвета берутся только из
дерева узлов — ничего не дописывается «от себя».
"""
import json
import re

def rgba(text):
    nums = [float(x) for x in re.findall(r"[\d.]+", text or "rgba(0,0,0,1)")]
    while len(nums) < 4:
        nums.append(1.0)
    return [round(nums[0]), round(nums[1]), round(nums[2]), round(nums[3], 3)]

def esc(t):
    return (t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

spec = json.load(open("/tmp/spec.json", encoding="utf-8"))
exp = []

def note(t):
    st = t["style"]
    exp.append({
        "id": t["id"],
        "fontSize": st["fontSize"],
        "lineHeight": st["lineHeightPx"],
        "color": rgba(st.get("color")),
        "text": t["text"],
    })
    return f'data-figma-text="{t["id"]}"'

cards = []
for c in spec["cards"]:
    T = {"chips": []}
    for t in c["texts"]:
        fs = t["style"].get("fontSize", 0)
        y = t["y"] - c["y"]   # в спеке координаты от корня группы — приводим к карточке
        if fs == 13:
            T["badge"] = t
        elif fs == 25:
            T["title"] = t
        elif fs == 17 and y < 500:
            T["desc"] = t
        elif fs == 18:
            T["label"] = t
        elif fs == 30:
            T["price"] = t
        elif fs == 16 and 600 < y < 680:
            T["note"] = t
        elif fs == 14:
            T["cta"] = t
        elif fs == 16:
            T["chips"].append(t)
    T["chips"] = sorted(T["chips"], key=lambda x: x["x"])

    nid = c["image"]["id"].replace(":", "-")
    w, h = int(c["image"]["w"]), int(c["image"]["h"])
    yellow = c["button"]["bg"] == "rgba(255,201,36,1)"
    bcls = "button button--yellow" if yellow else "button button--dark"

    L = ["            <article class=\"foundation-card\">",
         "              <div class=\"foundation-card__media\">",
         "                <img",
         '                  alt=""',
         '                  class="foundation-card__img"',
         '                  decoding="async"',
         f'                  height="{h}"',
         '                  loading="lazy"',
         '                  sizes="(min-width: 1281px) 511px, (min-width: 641px) calc((100vw - 40px) / 2), calc(100vw - 32px)"',
         f'                  src="assets/figma-{nid}.webp"',
         f'                  srcset="assets/figma-{nid}@480.webp 480w, assets/figma-{nid}@960.webp 960w, assets/figma-{nid}.webp {w}w"',
         f'                  width="{w}"',
         "                />"]
    if T.get("badge"):
        L.append(f"                <p class=\"foundation-card__badge\" {note(T['badge'])}>{esc(T['badge']['text'])}</p>")
    L += ["              </div>",
          "              <div class=\"foundation-card__body\">",
          f"                <h3 class=\"foundation-card__title\" {note(T['title'])}>{esc(T['title']['text'])}</h3>",
          f"                <p class=\"foundation-card__desc\" {note(T['desc'])}>{esc(T['desc']['text'])}</p>",
          f"                <p class=\"foundation-card__suites\" {note(T['label'])}>{esc(T['label']['text'])}</p>",
          "                <ul class=\"foundation-card__chips\">"]
    for ch in T["chips"]:
        L.append(f"                  <li>{esc(ch['text'])}</li>")
    L += ["                </ul>",
          f"                <p class=\"foundation-card__price\" {note(T['price'])}>{esc(T['price']['text'])}</p>",
          f"                <p class=\"foundation-card__note\" {note(T['note'])}>{esc(T['note']['text'])}</p>",
          f'                <button class="{bcls} button--soft-icon" data-action="quote" data-motion-button type="button">',
          f'                  <span class="button-label" {note(T["cta"])}>{esc(T["cta"]["text"])}</span>',
          '                  <span aria-hidden="true" class="button-icon">',
          '                    <svg class="figma-icon icon-sprite" aria-hidden="true" focusable="false">',
          '                      <use href="assets/icons/sprite.svg#i-project-arrow" xlink:href="assets/icons/sprite.svg#i-project-arrow" />',
          '                    </svg>',
          '                  </span>',
          "                </button>",

          "              </div>",
          "            </article>"]
    cards.append("\n".join(L))

grid = "          <div class=\"foundation-cards\" data-figma-grid=\"476:1119\">\n" + "\n".join(cards) + "\n          </div>\n"
open("/tmp/grid.html", "w", encoding="utf-8").write(grid)
json.dump(exp, open("/tmp/exp.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"карточек: {len(cards)}, узлов в ожиданиях: {len(exp)}")
print(grid[:700])
print("…")
