#!/usr/bin/env bash
# Зонд ElisArt / DuoRoute API. Ключ читается из ELISART_API_KEY.
# Запуск: ELISART_API_KEY='sk-...' bash tools/elisart-probe.sh
set -uo pipefail

API="${ELISART_API_BASE:-https://api.elisart.ru/v1}"
KEY="${ELISART_API_KEY:?ELISART_API_KEY не задан}"
MASK="${KEY:0:8}…${KEY: -4}"

hr() { printf '\n===== %s =====\n' "$*"; }

req() { # req <path> <json>
  curl -sS -m 90 -w '\n__HTTP:%{http_code}__' \
    "$API$1" \
    -H "Authorization: Bearer $KEY" \
    -H 'Content-Type: application/json' \
    -d "$2" || printf '\n__HTTP:000 curl-error__'
}

hr "0. КЛЮЧ / ЭНДПОИНТ"
printf 'endpoint = %s\nkey      = %s\n' "$API" "$MASK"

# ---------------------------------------------------------------- 1. /models
hr "1. GET /v1/models — что реально в каталоге"
MODELS_RAW="$(curl -sS -m 60 "$API/models" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' 2>&1)"
ID_LIST="$(printf '%s' "$MODELS_RAW" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception as e:
    print("PARSE_ERROR", e); sys.exit()
rows = d.get("data") or d.get("models") or d
if isinstance(rows, dict): rows = [rows]
for m in rows:
    if isinstance(m, dict):
        print(m.get("id") or m.get("name") or "?")
    else:
        print(m)
' 2>&1)"
printf '%s\n' "$ID_LIST" | sed 's/^/   • /'
printf '\n   ВСЕГО МОДЕЛЕЙ: %s\n' "$(printf '%s\n' "$ID_LIST" | grep -c . )"
if printf '%s\n' "$ID_LIST" | grep -qi 'haiku'; then
  echo '   → claude-haiku-5.5 В КАТАЛОГЕ ЕСТЬ'
else
  echo '   → claude-haiku-5.5 В КАТАЛОГЕ НЕТ'
fi

# --------------------------------------------------- 2. вызов нужной модели
hr "2. POST /v1/chat/completions — claude-haiku-5.5 (реальный вызов)"
OUT="$(req /chat/completions '{"model":"claude-haiku-5.5","max_tokens":120,"messages":[{"role":"user","content":"Reply in English, exactly two short lines. Line 1: your model family name and version as you know it. Line 2: the word PONG."}]}')"
printf 'HTTP: %s\n' "$(printf '%s' "$OUT" | grep -o '__HTTP:[0-9]*__')"
printf '%s\n' "$OUT" | sed 's/__HTTP:[0-9]*__//' | python3 -c '
import sys, json
raw = sys.stdin.read().strip()
try:
    d = json.loads(raw)
except Exception:
    print("   [не JSON] " + raw[:500]); sys.exit()
if "error" in d:
    print("   ✗ ОШИБКА:", json.dumps(d["error"], ensure_ascii=False)[:400]); sys.exit()
c = (d.get("choices") or [{}])[0]
print("   requested model : claude-haiku-5.5")
print("   server  model   :", d.get("model"))
print("   provider        :", d.get("provider", d.get("system_fingerprint", "—")))
print("   content         :", repr((c.get("message") or {}).get("content", "")[:300]))
print("   finish_reason   :", c.get("finish_reason"))
print("   usage           :", json.dumps(d.get("usage"), ensure_ascii=False))
'

# ------------------------------------------- 3. контроль: рабочая модель
hr "3. POST /v1/chat/completions — glm-5.3 (контроль, модель есть в каталоге)"
OUT2="$(req /chat/completions '{"model":"glm-5.3","max_tokens":60,"messages":[{"role":"user","content":"Say ONE word: OK"}]}')"
printf 'HTTP: %s\n' "$(printf '%s' "$OUT2" | grep -o '__HTTP:[0-9]*__')"
printf '%s\n' "$OUT2" | sed 's/__HTTP:[0-9]*__//' | python3 -c '
import sys, json
raw = sys.stdin.read().strip()
try: d = json.loads(raw)
except Exception: print("   [не JSON] " + raw[:300]); sys.exit()
if "error" in d: print("   ✗", json.dumps(d["error"], ensure_ascii=False)[:300]); sys.exit()
c = (d.get("choices") or [{}])[0]
print("   server model:", d.get("model"), "| content:", repr((c.get("message") or {}).get("content","")[:120]))
'

# --------------------------------- 4. ТЕСТ НА ФАЛЬШИВЫЙ ЯРЛЫК (ключевой)
hr "4. ТЕСТ: выдуманная модель 'totally-fake-model-xyz-123'"
OUT3="$(req /chat/completions '{"model":"totally-fake-model-xyz-123","max_tokens":40,"messages":[{"role":"user","content":"Say ONE word: OK"}]}')"
printf 'HTTP: %s\n' "$(printf '%s' "$OUT3" | grep -o '__HTTP:[0-9]*__')"
printf '%s\n' "$OUT3" | sed 's/__HTTP:[0-9]*__//' | python3 -c '
import sys, json
raw = sys.stdin.read().strip()
try: d = json.loads(raw)
except Exception: print("   [не JSON] " + raw[:300]); sys.exit()
if "error" in d:
    print("   ответил ошибкой → ярлыки валидируются:", json.dumps(d["error"], ensure_ascii=False)[:250])
else:
    c = (d.get("choices") or [{}])[0]
    print("   ⚠️ ВЫДУМАННОЕ ИМЯ ПРИНЯТО! server model:", d.get("model"))
    print("   content:", repr((c.get("message") or {}).get("content","")[:200]))
    print("   → имена моделей на этом шлюзе ничего не гарантируют")
'

# ------------------------------------------------------------- 5. /responses
hr "5. POST /v1/responses — claude-haiku-5.5"
OUT4="$(req /responses '{"model":"claude-haiku-5.5","input":"say PONG"}')"
printf 'HTTP: %s\n' "$(printf '%s' "$OUT4" | grep -o '__HTTP:[0-9]*__')"
printf '%s\n' "$OUT4" | sed 's/__HTTP:[0-9]*__//' | head -c 700
echo

# ------------------------------------------------------------- 6. стриминг
hr "6. СТРИМИНГ claude-haiku-5.5 (первые байты)"
curl -sS -m 60 -N "$API/chat/completions" \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"model":"claude-haiku-5.5","stream":true,"max_tokens":30,"messages":[{"role":"user","content":"count 1 2 3"}]}' \
  2>&1 | head -c 600
echo

hr "ГОТОВО"
