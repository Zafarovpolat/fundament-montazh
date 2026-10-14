#!/usr/bin/env bash
# Зонд №2: прогон всех моделей каталога + самопроверка личности.
set -uo pipefail
API="${ELISART_API_BASE:-https://api.elisart.ru/v1}"
KEY="${ELISART_API_KEY:?нет ключа}"

hr() { printf '\n===== %s =====\n' "$*"; }

ASK='Answer in exactly 3 short lines, no preamble.
1) MODEL: the exact model name and the company that made you, as you actually are.
2) CUTOFF: your training knowledge cutoff.
3) SIGNATURE: one word that you feel describes you; then write UNSURE if you are not certain about line 1.'

hr "A. RAW /v1/models"
curl -sS -m 60 "$API/models" -H "Authorization: Bearer $KEY"
echo

hr "B. ПРОГОН ВСЕХ МОДЕЛЕЙ КАТАЛОГА + ПЛАТНЫХ"
for M in deepseek-v4-flash deepseek-v4.1-flash qwen-3.8-max grok-4.7 kimi-k3 glm-5.3 gpt-6-sol gpt-6.1-sol; do
  printf '\n----- %s -----\n' "$M"
  T0=$(date +%s%N)
  R=$(curl -sS -m 120 -w '\n__H:%{http_code}__' "$API/chat/completions" \
    -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
    -d "$(python3 -c '
import json,sys
print(json.dumps({"model":sys.argv[1],"max_tokens":220,
 "messages":[{"role":"user","content":sys.argv[2]}]}))
' "$M" "$ASK")" 2>&1)
  T1=$(date +%s%N)
  printf 'HTTP %s | %sms\n' "$(printf '%s' "$R" | grep -o '__H:[0-9]*__')" "$(( (T1-T0)/1000000 ))"
  printf '%s' "$R" | sed 's/__H:[0-9]*__//' | python3 -c '
import sys, json
raw = sys.stdin.read().strip()
try: d = json.loads(raw)
except Exception: print("   [не JSON]", raw[:300]); sys.exit()
if "error" in d:
    e = d["error"]; e = e if isinstance(e,str) else e.get("message","")
    print("   ✗", str(e)[:180]); sys.exit()
c = (d.get("choices") or [{}])[0]
print("   server_model:", d.get("model"))
print("   provider    :", d.get("provider","—"), "| fp:", d.get("system_fingerprint","—"))
print("   usage       :", json.dumps(d.get("usage")))
print("   --- ответ ---")
for line in ((c.get("message") or {}).get("content","") or "").splitlines():
    print("   ", line[:200])
'
done

hr "C. СТРИМИНГ на grok-4.7 (первые чанки)"
curl -sS -m 60 -N "$API/chat/completions" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"grok-4.7","stream":true,"max_tokens":40,"messages":[{"role":"user","content":"count 1 2 3"}]}' \
  2>&1 | head -c 500
echo

hr "D. ТУЛ-КОЛЛИНГ на glm-5.3 (поддерживается ли функции)"
curl -sS -m 90 "$API/chat/completions" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"glm-5.3","max_tokens":120,"messages":[{"role":"user","content":"What is the weather in Tashkent?"}],"tools":[{"type":"function","function":{"name":"get_weather","description":"Get weather","parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}]}' \
  2>&1 | head -c 700
echo

hr "ГОТОВО"
