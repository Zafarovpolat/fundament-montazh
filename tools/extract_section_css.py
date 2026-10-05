"""Собирает CSS секции в отдельный файл, чтобы секцию можно было перенести
на другую страницу (например, «Готовые проекты» — на вторую страницу).

Режимы:

  --mode bundle (по умолчанию) — НИЧЕГО не удаляет из основных стилей, а
      копирует в sections/<name>.css все правила, которые действительно
      действуют на узлы секции. Главная остаётся бит-в-бит той же, а вторая
      страница получает самодостаточный файл: base-CSS + sections/<name>.css.
      Правило включается, если хотя бы один его селектор матчится внутри
      секции, либо если это правило для самой секции/глобальных селекторов
      (:root, html, body). Именно поэтому переносить правила нельзя: у
      .heading-description цвет переопределяется правилом, которое лежит в
      основном файле ПОЗЖЕ, и после переезда порядок каскада переворачивается.

  --mode move — вырезает правила из основных файлов (нужно, когда секцию с
      главной УДАЛЯЮТ и старые правила становятся мёртвым весом). Перед
      применением обязательно сверять геометрию и запускать npm test +
      test:fidelity: они ловят переворот каскада.

Принадлежность селектора секции проверяется в реальном браузере
(tools/section_selectors.mjs), а не по именам классов: общие обёртки
.section-heading, .container, .carousel-controls, .button относятся ко всем
секциям, и для bundle они включаются в бандл, но из основных стилей не
вырезаются.

    python3 tools/extract_section_css.py --section projects
    python3 tools/extract_section_css.py --section projects --mode move --apply

"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS_FILES = [
    "styles.css",
    "figma-type.css",
    "fidelity.css",
    "compact.css",
    "compact-type.css",
    "interactions.css",
]
ATOMIC = ("@font-face", "@page", "@viewport", "@property")


def match_css_comment(text, i):
    return text.startswith("/*", i)


def skip_comment(text, i):
    j = text.find("*/", i + 2)
    return len(text) if j < 0 else j + 2


def find_block_end(text, open_brace):
    """Индекс за закрывающей скобкой блока, открывающейся в open_brace."""
    depth = 0
    i = open_brace
    while i < len(text):
        c = text[i]
        if c == "/" and text.startswith("/*", i):
            i = skip_comment(text, i)
            continue
        if c in "\"'":
            quote = c
            i += 1
            while i < len(text) and text[i] != quote:
                i += 2 if text[i] == "\\" else 1
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return len(text)


def parse(text, media=None, off=0):
    """Разбор на правила с сохранением spans. Возвращает плоский список.

    off — сдвиг текста относительно начала ФАЙЛА: вложенные в @media правила
    режутся из подстроки, и без сдвига их координаты указывали бы внутрь
    родительского блока (удаление задело бы чужие правила).
    """
    rules = []
    i, n = 0, len(text)
    while i < n:
        if text.startswith("/*", i):
            i = skip_comment(text, i)
            continue
        if text[i] in " \t\n\r;":
            i += 1
            continue
        # читаем преквью до '{' или ';'
        j = i
        while j < n and text[j] not in "{;":
            if text.startswith("/*", j):
                j = skip_comment(text, j)
                continue
            j += 1
        if j >= n:
            break
        if text[j] == ";":  # @import и прочее без блока
            i = j + 1
            continue
        prelude = text[i:j].strip()
        end = find_block_end(text, j)
        body = text[j + 1 : end - 1]
        nested = None
        for at in ("@media", "@supports", "@layer", "@container"):
            if prelude.startswith(at):
                nested = re.sub(rf"^{at}\s*", "", prelude).strip()
                break
        if nested is not None:
            rules.extend(
                parse(
                    body,
                    media=(nested if not media else f"{media} and {nested}"),
                    off=off + j + 1,
                )
            )
        elif prelude.startswith("@keyframes") or prelude.startswith("@-webkit-keyframes"):
            rules.append(
                {
                    "kind": "keyframes",
                    "name": re.sub(r"^@(?:-webkit-)?keyframes\s+", "", prelude).strip(),
                    "media": media,
                    "start": off + i,
                    "end": off + end,
                    "text": text[i:end],
                }
            )
        elif prelude.startswith("@"):
            rules.append({"kind": "at", "prelude": prelude, "media": media, "start": off + i, "end": off + end, "text": text[i:end]})
        else:
            rules.append({"kind": "rule", "selector": prelude, "media": media, "start": off + i, "end": off + end, "text": text[i:end]})
        i = end
    return rules


def split_selectors(sel):
    """Запятые верхнего уровня: скобки и кавычки (в [data-figma-text="a, b"])
    не режем."""
    out, buf, depth, quote = [], "", 0, None
    for c in sel:
        if quote:
            buf += c
            if c == quote:
                quote = None
            continue
        if c in "\"'":
            quote = c
            buf += c
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        if c == "," and depth == 0:
            out.append(buf.strip())
            buf = ""
        else:
            buf += c
    if buf.strip():
        out.append(buf.strip())
    return out


FIGMA_ID = re.compile(r'data-figma-text="([^"]+)"')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--section", required=True, help="id секции в index.html, например projects")
    ap.add_argument("--url", default="http://127.0.0.1:5173/index.html")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--mode", choices=["bundle", "move"], default="bundle",
                    help="bundle — копия для второй страницы (не трогает главную), "
                         "move — вырезание из основных стилей")
    args = ap.parse_args()

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    start = re.search(rf'<section[^>]*id="{re.escape(args.section)}"[^>]*>', html)
    if not start:
        sys.exit(f"секция #{args.section} не найдена в index.html")
    depth, end = 0, None
    for m in re.finditer(r"<section\b|</section>", html[start.start():]):
        depth += 1 if m.group(0).startswith("<section") else -1
        if depth == 0:
            end = start.start() + m.end()
            break
    fragment = html[start.start() : end]
    print(f"секция #{args.section}: {fragment.count(chr(10)) + 1} строк, {len(fragment)} байт")

    # 1. Разбор CSS и сбор уникальных селекторов
    all_rules = {}
    for name in CSS_FILES:
        path = ROOT / name
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        all_rules[name] = (text, parse(text))
    selectors = sorted({s for _, (_, rules) in all_rules.items() for r in rules if r["kind"] == "rule" for s in split_selectors(r["selector"])})
    print(f"файлов: {len(all_rules)}, правил: {sum(len(rr) for _, rr in all_rules.values())}, уникальных селекторов: {len(selectors)}")

    # 2. Проверка в браузере: где матчится каждый селектор
    probe = ROOT / "tools" / "section_selectors.mjs"
    tmp = Path("/tmp/selectors-in.json")
    tmp.write_text(json.dumps({"selectors": selectors, "section": args.section}), encoding="utf-8")
    subprocess.run(["node", str(probe), str(tmp)], check=True, cwd=ROOT)
    stats = json.loads(Path("/tmp/selectors-out.json").read_text(encoding="utf-8"))

    own_ids = set(FIGMA_ID.findall(fragment))

    def inside_any(sel):
        st = stats.get(sel)
        return bool(st) and st["inside"] > 0 and not st.get("error")

    def only_inside(sel):
        st = stats.get(sel)
        return bool(st) and st["inside"] > 0 and st["outside"] == 0 and not st.get("error")

    def is_global(sel):
        return sel.strip() in {":root", "*", "html", "body", "html, body", ":where(html)"}

    def only_section_typography(sel):
        ids = FIGMA_ID.findall(sel)
        return bool(ids) and all(i in own_ids for i in ids)

    # 3. Кандидаты на переезд
    moved, kept = [], []
    for name, (text, rules) in all_rules.items():
        for r in rules:
            if r["kind"] == "rule":
                sels = split_selectors(r["selector"])
                if args.mode == "bundle":
                    ok = any(inside_any(s) or is_global(s) for s in sels) or all(
                        only_section_typography(s) for s in sels
                    ) and bool(any(only_section_typography(s) for s in sels))
                else:
                    ok = all(only_inside(s) or only_section_typography(s) for s in sels)
                (moved if ok else kept).append((name, r))
            else:
                kept.append((name, r))

    # @keyframes переезжают, если на них ссылается переезжающее правило и
    # после удаления на них не остаётся ссылок в основных файлах
    moved_text = "\n".join(r["text"] for _, r in moved)
    def anim_names(blob):
        return set(re.findall(r"animation(?:-name)?\s*:\s*([^;}]+)", blob))

    moved_anim = set()
    for frag in anim_names(moved_text):
        for tok in re.split(r"[,\s]+", frag.strip()):
            if tok and not tok.startswith(("var(", "none", "infinite", "forwards", "linear", "ease")) and re.fullmatch(r"[A-Za-z_][\w-]*", tok):
                moved_anim.add(tok)

    keyframes = []
    for name, (text, rules) in all_rules.items():
        for r in rules:
            if r["kind"] == "keyframes" and r["name"] in moved_anim:
                rest = "\n".join(
                    rr["text"]
                    for fn, (tt, rrules) in all_rules.items()
                    for rr in rrules
                    if not (fn == name and rr is r) and not any(rr is m[1] for m in moved)
                )
                if r["name"] not in rest:
                    keyframes.append((name, r))

    print(f"переезжает правил: {len(moved) + len(keyframes)} (в т.ч. @keyframes: {len(keyframes)}), остаётся: {len(kept)}")
    for name, r in moved[:8]:
        print("   →", name, "|", r["selector"].replace("\n", " ")[:88])
    if not moved:
        sys.exit("нечего выносить — проверьте id секции")

    if not args.apply:
        print("\nчерновик: файлы не изменены (добавьте --apply)")
        return

    if args.mode == "bundle":
        out = [f"/* Бандл стилей секции #{args.section} для второй страницы.\n"
               f"   Правила скопированы из {', '.join(sorted({n for n, _ in moved}))}\n"
               f"   инструментов tools/extract_section_css.py (--mode bundle).\n"
               f"   Основные стили не изменены: на главной эта секция живёт на них.\n"
               f"   Подключение второй страницы: fonts.css, styles.css,\n"
               f"   figma-type.css, fidelity.css, compact.css, compact-type.css,\n"
               f"   interactions.css и этот файл. */\n"]
        for name, r in moved + keyframes:
            body = f"/* {name} */\n{r['text']}\n"
            out.append(f"@media {r['media']} {{\n{r['text']}\n}}\n" if r["media"] else body)
        sections = ROOT / "sections"
        sections.mkdir(exist_ok=True)
        (sections / f"{args.section}.css").write_text("\n".join(out), encoding="utf-8")
        (sections / f"{args.section}.html").write_text(fragment + "\n", encoding="utf-8")
        print(f"   + sections/{args.section}.css ({sum(len(r['text']) for _, r in moved)} байт), "
              f"sections/{args.section}.html — главные файлы не тронуты")
        return

    # 4. Удаление из исходников (спаны — с конца)
    by_file = {}
    for name, r in moved + keyframes:
        by_file.setdefault(name, []).append((r["start"], r["end"]))
    for name, spans in by_file.items():
        text = all_rules[name][0]
        for a, b in sorted(spans, reverse=True):
            text = text[:a] + text[b:]
        # схлопываем опустевшие @media/@supports
        prev = None
        while prev != text:
            prev = text
            text = re.sub(r"@[\w-]+[^{}]*\{\s*\}\s*", "", text)
        (ROOT / name).write_text(text, encoding="utf-8")
        print(f"   − {name}: удалено {len(spans)} блоков")

    # 5. Сборка sections/<name>.css в исходном порядке файлов
    out = [f"/* Стили секции #{args.section}: извлечены из {', '.join(sorted({n for n, _ in moved + keyframes}))}.\n   Инструмент: tools/extract_section_css.py. Повторный запуск безопасен. */\n"]
    for name, r in moved + keyframes:
        block = f"/* {name} */\n{r['text']}\n"
        out.append(f"@media {r['media']} {{\n{r['text']}\n}}\n" if r["media"] else block)
    sections = ROOT / "sections"
    sections.mkdir(exist_ok=True)
    (sections / f"{args.section}.css").write_text("\n".join(out), encoding="utf-8")
    (sections / f"{args.section}.html").write_text(fragment + "\n", encoding="utf-8")
    print(f"   + sections/{args.section}.css, sections/{args.section}.html")

    # 6. Подключение в index.html сразу после последнего <link rel="stylesheet">
    link = f'<link href="sections/{args.section}.css?v={json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]}" rel="stylesheet" />'
    # после ПОСЛЕДНЕГО <link> в <head> — значит новый файл окажется в конце
    # цепочки стилей и порядок каскада не пострадает
    idx = html.rindex("<link", 0, html.index("</head>"))
    line_end = html.index("\n", idx) + 1
    html = html[:line_end] + "    " + link + "\n" + html[line_end:]
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print("   + <link> в <head> index.html")


if __name__ == "__main__":
    main()
