#!/usr/bin/env python3
"""Сборка четырёх внутренних страниц: политика конфиденциальности, правила
обработки персональных данных, 404 и «Спасибо за заявку!».

Почему генератор, а не разметка руками: шапка, футер, плашка cookie, диалог
связи и мобильное меню должны быть буквально теми же блоками, что на готовых
страницах, поэтому они вырезаются из foundation.html; тексты и подписи берутся
из снимка макета design/figma-reference/figma-pages-bundle.json по id узлов.

Запуск из корня репозитория:  python3 tools/build_subpages.py [--check]
    --check  ничего не пишет, только проверяет, что файлы совпадают с генератором.

Кадры макета: 430:365 (политика, 1920), 606:1834 (политика, 375), 440:1643
(правила, 1920), 434:1410 (404, 1920), 606:1087 (404, 375), 440:1769
(«спасибо», 1920), 606:1750 («спасибо», 375).
"""

from __future__ import annotations

import html as htmllib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / "design" / "figma-reference" / "figma-pages-bundle.json"
FOUNDATION = ROOT / "foundation.html"

# --------------------------------------------------------------------- Figma
_bundle = json.loads(BUNDLE.read_text(encoding="utf-8"))
_NODES: dict[str, dict] = {}


def _index(node: dict) -> None:
    _NODES[node["id"]] = node
    for child in node.get("children") or []:
        _index(child)


for _value in _bundle["nodes"].values():
    _index(_value["document"])


def figma(node_id: str) -> str:
    """Текст узла макета, экранированный для HTML."""
    node = _NODES.get(node_id)
    if node is None:
        raise SystemExit(f"в снимке макета нет узла {node_id}")
    characters = node.get("characters")
    if characters is None:
        raise SystemExit(f"узел {node_id} не текстовый")
    return htmllib.escape(characters.replace("\u2028", " "), quote=False)


# ------------------------------------------------------- общие блоки страниц
src = FOUNDATION.read_text(encoding="utf-8")


def cut(start_marker: str, end_marker: str) -> str:
    i = src.index(start_marker)
    j = src.index(end_marker, i) + len(end_marker)
    return src[i:j]


HEADER = cut('    <header class="site-header">', "    </header>")
FOOTER = cut('    <footer class="site-footer" id="contacts">', "    </footer>")
COOKIE = cut(
    '    <aside\n      aria-label="Уведомление об использовании файлов cookie"',
    "    </aside>",
)
CONTACT_DIALOG = cut('    <dialog\n      aria-labelledby="dialog-title"', "    </dialog>")
TOAST = '    <div aria-live="polite" class="toast" role="status"></div>'
MENU_DIALOG = cut('    <dialog\n      aria-label="Навигация по сайту"', "    </dialog>")


def to_home(block: str) -> str:
    """Внутри страниц якоря главной ведут на index.html."""
    return re.sub(
        r'href="#(materials|projects|objects|steps|design|geology|contacts|hero)"',
        r'href="index.html#\1"',
        block,
    )


HEADER = to_home(HEADER)


def footer_with_links(block: str) -> str:
    """«Политика конфиденциальности» — готовая страница: ведём ссылкой.
    «Оферта» остаётся кнопкой: отдельной страницы в макете нет."""
    def repl(match: re.Match[str]) -> str:
        node = match.group(1)
        text = " ".join(match.group(2).split())
        if text != "Политика конфиденциальности":
            return match.group(0)
        return (
            f'<a data-figma-text="{node}" href="privacy.html">\n'
            f"                {text}\n"
            f"              </a>"
        )

    return re.sub(
        r'<button data-action="legal" data-figma-text="([^"]+)">\s*([^<]+?)\s*</button\s*>',
        repl,
        block,
        flags=re.S,
    )


FOOTER = footer_with_links(to_home(FOOTER))

HEAD_TPL = '''<!doctype html>

<html data-motion="on" lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <meta
      content="{description}"
      name="description"
    />
    <meta content="#101323" name="theme-color" />
    <title>{title}</title>
    <link href="https://fundament-montazh.vercel.app/{file}" rel="canonical" />
    <meta content="{robots}" name="robots" />
    <meta content="ru_RU" property="og:locale" />
    <meta content="ФундаментМонтаж" property="og:site_name" />
    <meta content="website" property="og:type" />
    <meta content="{og_title}" property="og:title" />
    <meta content="{og_description}" property="og:description" />
    <meta content="https://fundament-montazh.vercel.app/{file}" property="og:url" />
    <meta
      content="https://fundament-montazh.vercel.app/assets/brand/og-cover.webp"
      property="og:image"
    />
    <meta content="1200" property="og:image:width" />
    <meta content="630" property="og:image:height" />
    <meta content="{og_image_alt}" property="og:image:alt" />
    <meta content="summary_large_image" name="twitter:card" />
    <link href="assets/brand/favicon.svg" rel="icon" type="image/svg+xml" />
    <link
      href="assets/brand/favicon-32.png"
      rel="icon"
      sizes="32x32"
      type="image/png"
    />
    <link href="assets/brand/apple-touch-icon.png" rel="apple-touch-icon" />
    <link href="site.webmanifest" rel="manifest" />
    <link
      as="font"
      crossorigin=""
      href="assets/fonts/web/euclid-circular-a-400-normal.woff2"
      rel="preload"
      type="font/woff2"
    />
    <link
      as="font"
      crossorigin=""
      href="assets/fonts/web/cofo-sans-400-normal.woff2"
      rel="preload"
      type="font/woff2"
    />
    <link href="fonts.css?v=3.6.4" rel="stylesheet" />
    <link href="styles.css?v=3.6.4" rel="stylesheet" />
    <script defer="" src="app.js?v=3.6.6"></script>
    <link href="interactions.css?v=3.6.5" rel="stylesheet" />
    <link href="figma-type.css?v=3.6.4" rel="stylesheet" />
    <link href="fidelity.css?v=3.6.6" rel="stylesheet" />
    <script defer="" src="header.js?v=3.6.4"></script>
    <link href="compact-type.css?v=3.6.4" rel="stylesheet" />
    <link href="compact.css?v=3.11.1" rel="stylesheet" />
    <script defer="" src="layout.js?v=3.6.4"></script>
    <link href="subpages.css?v=1.0.0" rel="stylesheet" />
    <script defer="" src="subpages.js?v=1.0.0"></script>
  </head>
  <body>
    <a class="skip-link" href="#main">Перейти к содержимому</a>
'''


def page(head: dict, main: str) -> str:
    body = HEAD_TPL.format(**head)
    body += HEADER + "\n"
    body += main
    body += FOOTER + "\n"
    body += COOKIE + "\n"
    body += '    <script src="consent.js?v=3.6.4" defer=""></script>\n'
    body += CONTACT_DIALOG + "\n"
    body += TOAST + "\n"
    body += MENU_DIALOG + "\n"
    body += "  </body>\n</html>\n"
    return body


# ------------------------------------------------------------ юридические
def crumbs(node_id: str) -> str:
    return f'''      <nav aria-label="Вы здесь" class="subpage-crumbs">
        <a href="index.html">Главная</a
        ><span aria-hidden="true" class="subpage-crumbs__sep"></span
        ><span data-figma-text="{node_id}">{figma(node_id)}</span>
      </nav>'''


def head_block(title_node: str, title_html: str, crumb_node: str,
               date_node: str) -> str:
    return f'''      <div class="container subpage-head">
        <div class="subpage-head__main">
{crumbs(crumb_node)}
          <h1 class="subpage-title" data-figma-text="{title_node}">
            {title_html}
          </h1>
        </div>
        <p class="subpage-date" data-figma-text="{date_node}">
          {figma(date_node)}
        </p>
      </div>'''


PENDING = (
    '<p class="legal-pending" data-copy-pending>Юридический текст этого '
    "раздела в макете не передан: вёрстка раздела готова, текст "
    "добавляется без правок разметки и стилей.</p>"
)

# Разделы документов: (якорь, id узла подписи в карточке, id узла заголовка
# в тексте, id абзацев). Абзацы с id из макета попадают на страницу дословно;
# у разделов без текста стоит плашка ожидания.
PRIVACY = [
    ("operator", "430:1315", None, ()),
    ("s1", "433:1350", "433:1346", ("433:1347", "433:1352", "433:1354")),
    ("s2", "430:1319", None, ()),
    ("s3", "430:1322", None, ()),
    ("s4", "430:1325", None, ()),
    ("s5", "430:1328", None, ()),
    ("s6", "430:1331", None, ()),
    ("s7", "430:1334", None, ()),
    ("s8", "430:1337", None, ()),
    ("s9", "430:1340", None, ()),
    ("s10", "430:1343", None, ()),
]

PD = [
    (
        "s1",
        "440:1670",
        "440:1690",
        (
            "440:1692",
            ("raw", "1.1. Настоящая Политика определяет порядок сбора, использования, хранения и защиты информации, предоставляемой пользователями при посещении и использовании сайта."),
            ("raw", "1.2. Используя сайт, пользователь подтверждает, что ознакомился с настоящей Политикой конфиденциальности."),
            ("raw", "1.3. Если пользователь не согласен с условиями настоящей Политики, ему следует прекратить использование сайта."),
        ),
    ),
    ("s2", "440:1672", None, ()),
    ("s3", "440:1674", None, ()),
    ("s4", "440:1676", None, ()),
    ("s5", "440:1678", None, ()),
    ("s6", "440:1680", None, ()),
]


def legal_nav(items, current: str) -> str:
    rows = []
    for anchor, node, _heading, _paragraphs in items:
        active = ' class="is-current" aria-current="true"' if anchor == current else ""
        rows.append(
            f'          <a{active} data-figma-text="{node}" '
            f'href="#{anchor}">{figma(node)}</a>'
        )
    return (
        '        <nav aria-label="Разделы документа" class="legal-nav">\n'
        + "\n".join(rows)
        + "\n        </nav>"
    )


def legal_body(items) -> str:
    out = []
    for anchor, _node, heading_node, paragraphs in items:
        out.append(f'          <section id="{anchor}">')
        if heading_node:
            out.append(
                f'            <h2 data-figma-text="{heading_node}">'
                f"{figma(heading_node)}</h2>"
            )
        else:
            # Заголовок раздела берём из подписи в карточке: того же текста
            # требует порядок документа, отдельного узла в макете нет.
            out.append(f'            <h2>{figma(_node)}</h2>')
        if paragraphs:
            for node in paragraphs:
                if isinstance(node, tuple):
                    # Текст, которого нет в снимке макета (добавлен заказчиком).
                    out.append(f"            <p>{node[1]}</p>")
                else:
                    out.append(f'            <p data-figma-text="{node}">{figma(node)}</p>')
        else:
            out.append("            " + PENDING)
        out.append("          </section>")
    return (
        '        <article class="legal-body">\n'
        + "\n".join(out)
        + "\n        </article>"
    )


def legal_main(head_html: str, nav_html: str, body_html: str) -> str:
    return f'''    <main class="subpage" id="main">
{head_html}
      <div class="container subpage-layout">
{nav_html}
{body_html}
      </div>
    </main>
'''


# --------------------------------------------------------------- статусные
def status_main(modifier: str, art_node: str, art_w: int, art_h: int, art_alt: str,
                title_node: str | None, text_node: str | None,
                button_node: str) -> str:
    """404 и «спасибо»: артворк из макета, заголовок/текст и кнопка возврата.

    Артворк выгружается из Figma отдельно (в снимке макета сохранены только
    ссылки imageRef, без файлов). Пока файла нет, блок держит ту же пропорцию
    и показывает плашку, а не битую картинку.
    """
    slug = art_node.replace(":", "-")
    asset = f"assets/figma-{slug}.webp"
    title = (
        f'        <h1 class="status-title" data-figma-text="{title_node}">'
        f"{figma(title_node)}</h1>\n"
        if title_node
        else ""
    )
    text = (
        f'        <p class="status-text" data-figma-text="{text_node}">'
        f"{figma(text_node)}</p>\n"
        if text_node
        else ""
    )
    if (ROOT / asset).exists():
        art_inner = f'''          <img
            alt="{art_alt}"
            data-figma-text="{art_node}"
            decoding="async"
            height="{art_h}"
            src="{asset}"
            width="{art_w}"
          />'''
        art_class = "status-art"
        comment = ""
    else:
        art_inner = f'''          <span class="status-art__pending"
            >Артворк {art_w}×{art_h} из макета (узел {art_node}) ещё не выгружен
            в {asset}</span
          >'''
        art_class = "status-art is-missing"
        comment = (
            f"        <!-- Артворк {art_w}×{art_h} (узел {art_node}) выгружается из\n"
            f"             Figma в {asset}; после этого блок собирается заново\n"
            f"             командой python3 tools/build_subpages.py. -->\n"
        )
    return f'''    <main class="subpage status status--{modifier}" id="main">
      <div class="container status-inner">
{comment}        <div class="{art_class}" data-artwork-pending="">
{art_inner}
        </div>
{title}{text}        <div class="status-actions">
          <a class="button button--yellow" data-motion-button="" href="index.html">
            <span class="button-label" data-figma-text="{button_node}">{figma(button_node)}</span
            ><span aria-hidden="true" class="button-icon"><svg
                class="figma-icon icon-sprite"
                aria-hidden="true"
                focusable="false"
              >
                <use
                  href="assets/icons/sprite.svg#i-arrow-dark"
                  xlink:href="assets/icons/sprite.svg#i-arrow-dark"
                /></svg></span>
          </a>
        </div>
      </div>
    </main>
'''


privacy_main = legal_main(
    head_block("430:1306", "Политика<br /> конфиден\u00adциальности", "430:1311",
               "440:1767"),
    # Статичный is-current — состояние из макета («1. Общие положения»);
    # дальше его пересчитывает scrollspy в subpages.js.
    legal_nav(PRIVACY, "s1"),
    # В тексте оставлен только первый раздел; пункты навигации перечисляют все.
    legal_body([i for i in PRIVACY if i[0] == "s1"]),
)
pd_main = legal_main(
    head_block("440:1664", "Правила обработки персональных данных", "440:1663",
               "440:1766"),
    legal_nav(PD, "s1"),
    legal_body([i for i in PD if i[0] == "s1"]),
)

PAGES = {
    "privacy.html": page(
        dict(
            file="privacy.html",
            title="Политика конфиденциальности — ФундаментМонтаж",
            description="Как сайт ФундаментМонтаж обрабатывает персональные данные и использует файлы cookie.",
            robots="index, follow",
            og_title="Политика конфиденциальности — ФундаментМонтаж",
            og_description="Порядок сбора, использования, хранения и защиты информации на сайте ФундаментМонтаж.",
            og_image_alt="Политика конфиденциальности ФундаментМонтаж",
        ),
        privacy_main,
    ),
    "personal-data.html": page(
        dict(
            file="personal-data.html",
            title="Правила обработки персональных данных — ФундаментМонтаж",
            description="Правила обработки персональных данных на сайте ФундаментМонтаж.",
            robots="index, follow",
            og_title="Правила обработки персональных данных — ФундаментМонтаж",
            og_description="Условия обработки, хранения и защиты персональных данных на сайте ФундаментМонтаж.",
            og_image_alt="Правила обработки персональных данных ФундаментМонтаж",
        ),
        pd_main,
    ),
    "404.html": page(
        dict(
            file="404.html",
            title="Страница не найдена — ФундаментМонтаж",
            description="Такой страницы нет. Вернитесь на главную или напишите нам — подскажем нужный раздел.",
            robots="noindex, follow",
            og_title="Страница не найдена — ФундаментМонтаж",
            og_description="Такой страницы нет. Вернитесь на главную страницу сайта ФундаментМонтаж.",
            og_image_alt="Страница не найдена",
        ),
        status_main("404", "439:1533", 1270, 644, "Страница не найдена",
                    None, None, "439:1537"),
    ),
    "thanks.html": page(
        dict(
            file="thanks.html",
            title="Спасибо за заявку! — ФундаментМонтаж",
            description="Заявка получена: свяжемся с вами в ближайшее время.",
            robots="noindex, follow",
            og_title="Спасибо за заявку! — ФундаментМонтаж",
            og_description="Мы получили ваше обращение и свяжемся с вами в ближайшее время.",
            og_image_alt="Спасибо за заявку",
        ),
        status_main("thanks", "443:1872", 684, 503, "Заявка принята",
                    "440:1860", "440:1862", "440:1866"),
    ),
}


def main() -> int:
    check = "--check" in sys.argv[1:]
    stale = 0
    for name, html in PAGES.items():
        path = ROOT / name
        current = path.read_text(encoding="utf-8") if path.exists() else ""
        if current == html:
            print(f"{name}: без изменений")
            continue
        if check:
            stale += 1
            print(f"{name}: файл отличается от генератора — запустите без --check")
            continue
        path.write_text(html, encoding="utf-8")
        print(f"{name}: записано, {len(html)} символов")
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
