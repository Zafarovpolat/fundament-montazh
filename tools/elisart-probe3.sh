#!/usr/bin/env bash
set -uo pipefail
API="${ELISART_API_BASE:-https://api.elisart.ru/v1}"
KEY="${ELISART_API_KEY:?нет ключа}"
call() { # call <model> <max_tokens>
  local M="$1" MT="$2" T0 T1 R
  printf '\n----- %s (max_tokens=%s) -----\n' "$M" "$MT"
  T0=$(date +%s%N)
  R=$(curl -sS -m 180 -w '\n__H:%{http_code}__' "$API/chat/completions" \
    -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
    -d "$(python3 -c '
import json,sys
print(json.dumps({"model":sys.argv[1],"max_tokens":int(sys.argv[2]),
 "messages":[{"role":"user","content":"In one sentence: what are you and who built you?"}]}))
' "$M" "$MT")" 2>&1)
  T1=$(date +%s%N)
  printf 'HTTP %s | %sms\n' "$(printf '%s' "$R" | grep -o '__H:[0-9]*__')" "$(( (T1-T0)/1000000 ))"
  printf '%s' "$R" | sed 's/__H:[0-9]*__//' | python3 -c '
import sys, json
raw=sys.stdin.read().strip()
try: d=json.loads(raw)
except Exception: print("   [не JSON]",raw[:200]); sys.exit()
if "error" in d:
    e=d["error"]; e=e if isinstance(e,str) else e.get("message","")
    print("   ✗",str(e)[:160]); sys.exit()
c=(d.get("choices") or [{}])[0]
m=c.get("message") or {}
u=d.get("usage") or {}
ct=u.get("completion_tokens",0); rt=(u.get("completion_tokens_details") or {}).get("reasoning_tokens",0)
txt=(m.get("content") or "").strip()
print("   server_model:",d.get("model"),"| completion:",ct,"reasoning:",rt)
print("   ТЕКСТ: "+(repr(txt[:200]) if txt else "❌ ПУСТО"))
'
}
echo "=== deepseek-v4-flash: повтор после 503 ==="
call deepseek-v4-flash 1500
call deepseek-v4-flash 1500
echo "=== deepseek-v4.1-flash: с нормальным лимитом ==="
call deepseek-v4.1-flash 4000
echo "=== kimi-k3: с нормальным лимитом ==="
call kimi-k3 4000
echo "=== glm-5.3: стабильность, 2 прогона ==="
call glm-5.3 1500
call glm-5.3 1500
echo "=== grok-4.7: поиск других маркеров стека в стриме ==="
curl -sS -m 120 -N "$API/chat/completions" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"grok-4.7","stream":true,"max_tokens":60,"messages":[{"role":"user","content":"say hi"}]}' 2>&1 \
  | grep -Ei '^:|x-|server|grok2api|openai|cloudflare|backend' | head -10
echo; echo "=== DONE ==="
