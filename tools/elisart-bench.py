#!/usr/bin/env python3
"""Бенчмарк доступных моделей ElisArt/DuoRoute. Ключ из ELISART_API_KEY."""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error, secrets, textwrap

API = os.environ.get("ELISART_API_BASE", "https://api.elisart.ru/v1")
KEY = os.environ["ELISART_API_KEY"]
MODELS = ["glm-5.3", "qwen-3.8-max", "kimi-k3", "deepseek-v4.1-flash", "grok-4.7"]

def call(model, messages, max_tokens=3000, tools=None, timeout=240):
    body = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if tools:
        body["tools"] = tools
    req = urllib.request.Request(
        API + "/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read().decode())
        dt = time.time() - t0
        u = d.get("usage") or {}
        c = (d.get("choices") or [{}])[0]
        m = c.get("message") or {}
        return {
            "ok": True, "dt": dt,
            "content": (m.get("content") or "") if isinstance(m.get("content"), str) else "",
            "tool_calls": m.get("tool_calls") or [],
            "completion": u.get("completion_tokens", 0),
            "reasoning": (u.get("completion_tokens_details") or {}).get("reasoning_tokens", 0),
            "err": None,
        }
    except urllib.error.HTTPError as e:
        return {"ok": False, "dt": time.time() - t0, "content": "", "tool_calls": [],
                "completion": 0, "reasoning": 0,
                "err": "HTTP %s %s" % (e.code, e.read().decode()[:160])}
    except Exception as e:
        return {"ok": False, "dt": time.time() - t0, "content": "", "tool_calls": [],
                "completion": 0, "reasoning": 0, "err": type(e).__name__ + " " + str(e)[:160]}

NONCE = lambda: secrets.token_hex(3)

# ---------------------------------------------------------------- задачи
def task_math1(model):
    p = ("Поезд отправляется в 14:20 и прибывает в 17:05. Сколько минут длится поездка? "
         "Ответь одной строкой, только итоговое число минут и краткий расчёт. ref=%s" % NONCE())
    r = call(model, [{"role": "user", "content": p}])
    c = r["content"]
    ok = bool(re.search(r"\b165\b", c) or re.search(r"2\s*(ч|hours?)\.?\s*45", c, re.I))
    return ok, c, r

def task_math2(model):
    p = ("Посчитай: 17% от 350 минус 12. Ответь одной строкой: само выражение и результат. ref=%s" % NONCE())
    r = call(model, [{"role": "user", "content": p}])
    c = r["content"]
    ok = bool(re.search(r"47[.,]5", c))
    return ok, c, r

def task_code(model):
    p = textwrap.dedent("""
        Write a Python function with EXACTLY this signature:

        def solve(xs):
            \"\"\"Return the second largest DISTINCT value in xs, or None if it does not exist.\"\"\"

        Output ONLY a python code block, no explanation. ref=%s
    """).strip() % NONCE()
    r = call(model, [{"role": "user", "content": p}], max_tokens=3000)
    c = r["content"]
    m = re.search(r"```(?:python)?\s*(.*?)```", c, re.S)
    code = m.group(1) if m else c
    if not r["ok"] or "def solve" not in code:
        return False, c, r
    harness = code + textwrap.dedent("""

        cases = [([1,2,3],2), ([5,5,3],3), ([9,8,8],None), ([4,4,4],None), ([1],None), ([2,1,2,0],1)]
        fails = []
        for xs, exp in cases:
            try:
                got = solve(list(xs))
            except Exception as e:
                got = "EXC:" + type(e).__name__
            if got != exp:
                fails.append((xs, exp, got))
        print("FAILS:", fails)
    """)
    try:
        out = subprocess.run([sys.executable, "-c", harness], capture_output=True, text=True, timeout=30)
        ok = "FAILS: []" in out.stdout
        detail = out.stdout.strip()[:200] or out.stderr.strip()[:200]
    except Exception as e:
        ok, detail = False, "harness " + str(e)[:120]
    return ok, detail, r

def task_json(model):
    p = ("How many letters 'r' are in the word 'strawberry'? "
         "Reply with ONLY minified valid JSON, exactly this shape: {\"n\": <count>}. ref=%s" % NONCE())
    r = call(model, [{"role": "user", "content": p}])
    c = r["content"]
    m = re.search(r"\{.*\}", c, re.S)
    if not m:
        return False, c, r
    try:
        d = json.loads(m.group(0))
        ok = isinstance(d, dict) and d.get("n") == 3
    except Exception:
        ok = False
    return ok, c, r

def task_instr(model):
    p = "Output exactly this and nothing else: OK-DONE. ref=%s" % NONCE()
    r = call(model, [{"role": "user", "content": p}])
    c = (r["content"] or "").strip()
    return c == "OK-DONE", c, r

def task_ru(model):
    p = ("Переведи на русский идиому: \"It's raining cats and dogs.\" "
         "Ответь строго одной строкой, без пояснений. ref=%s" % NONCE())
    r = call(model, [{"role": "user", "content": p}])
    c = (r["content"] or "").strip()
    ok = bool(re.search(r"дожд|льёт|льет|ливень", c, re.I)) and "cats" not in c
    return ok, c, r

def task_tools(model):
    tools = [{"type": "function", "function": {"name": "get_weather", "description": "Get weather",
              "parameters": {"type": "object", "properties": {"city": {"type": "string"}},
                             "required": ["city"]}}}]
    r = call(model, [{"role": "user", "content": "What is the weather in Tashkent? ref=%s" % NONCE()}],
             max_tokens=1200, tools=tools)
    tc = r["tool_calls"]
    if not tc:
        return False, r["content"][:120], r
    f = (tc[0] or {}).get("function") or {}
    try:
        args = json.loads(f.get("arguments") or "{}")
    except Exception:
        args = {}
    ok = f.get("name") == "get_weather" and "tashkent" in json.dumps(args).lower()
    return ok, "%s(%s)" % (f.get("name"), args), r

def task_needle(model):
    code = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(6))
    words = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt "
             "ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco "
             "laboris nisi aliquip ex ea commodo consequat duis aute irure reprehenderit voluptate velit").split()
    filler = []
    for i in range(6000):
        filler.append(words[(i * 7 + 3) % len(words)])
        if (i + 1) % 12 == 0:
            filler.append("\n")
    filler.insert(3000, "\nSECRET CODE: %s\n" % code)
    text = " ".join(filler)
    p = ("The text below contains a secret code of the form of 6 uppercase letters/digits. "
         "Reply with ONLY that code, nothing else.\n\n----- BEGIN -----\n%s\n----- END -----" % text)
    r = call(model, [{"role": "user", "content": p}], max_tokens=1500, timeout=300)
    c = (r["content"] or "").strip()
    ok = code.lower() in c.lower()
    return ok, ("НАЙДЕН" if ok else "НЕ НАЙДЕН (ждали %s) → %r" % (code, c[:80])), r

TESTS = [
    ("math-165min", task_math1),
    ("math-47.5",   task_math2),
    ("code-exec",   task_code),
    ("json-strict", task_json),
    ("instr-exact", task_instr),
    ("ru-idiom",    task_ru),
    ("tool-call",   task_tools),
    ("needle-ctx",  task_needle),
]

print("=" * 78)
print("БЕНЧМАРК МОДЕЛЕЙ DUOROUTE / ELISART   модели:", ", ".join(MODELS))
print("=" * 78)

summary = {}
raw_ru = {}
for model in MODELS:
    print("\n" + "#" * 78)
    print("### МОДЕЛЬ:", model)
    print("#" * 78)
    passed, lat, comp = 0, [], 0
    for name, fn in TESTS:
        try:
            ok, detail, r = fn(model)
        except Exception as e:
            ok, detail, r = False, "test-crash " + str(e)[:120], {"dt": 0, "completion": 0,
                                                                 "reasoning": 0, "err": str(e)[:120]}
        if not r.get("ok") and r.get("err"):
            detail = "%s | %s" % (r["err"], detail)
        passed += 1 if ok else 0
        lat.append(r.get("dt", 0))
        comp += r.get("completion") or 0
        flag = "PASS" if ok else "FAIL"
        print("  [%s] %-13s %6.1fs  out=%4d reas=%4d" %
              (flag, name, r.get("dt", 0), r.get("completion") or 0, r.get("reasoning") or 0))
        print("        → %s" % str(detail).replace("\n", " ")[:220])
        if name == "ru-idiom":
            raw_ru[model] = r.get("content", "")[:200]
    n = len(TESTS)
    ln = len(lat)
    summary[model] = {"passed": passed, "total": n,
                      "avg_lat": sum(lat) / ln if ln else 0,
                      "max_lat": max(lat) if lat else 0,
                      "completion": comp}
    print("\n  ИТОГ: %d/%d | средняя задержка %.1fs | макс %.1fs | completion-токенов %d" %
          (passed, n, summary[model]["avg_lat"], summary[model]["max_lat"], comp))

print("\n" + "=" * 78)
print("СВОДНАЯ ТАБЛИЦА (сортировка по числу пройденных тестов)")
print("=" * 78)
print("%-20s %6s %10s %10s %10s" % ("модель", "балл", "ср.сек", "макс.сек", "токенов"))
for m, s in sorted(summary.items(), key=lambda kv: (-kv[1]["passed"], kv[1]["avg_lat"])):
    print("%-20s %6s %10.1f %10.1f %10d" %
          (m, "%d/%d" % (s["passed"], s["total"]), s["avg_lat"], s["max_lat"], s["completion"]))

print("\nПЕРЕВОДЫ ИДИОМЫ (для ручной оценки):")
for m, v in raw_ru.items():
    print("  %-20s %r" % (m, v))

# перезапись кода для контроля: скрипт не хранит ключ
print("\nDONE")
