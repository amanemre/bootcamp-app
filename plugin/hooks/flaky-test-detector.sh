#!/usr/bin/env bash
# PostToolUse hook: detects writes to test run results, refreshes flakiness stats,
# and sends a Discord alert when new flaky tests are found.
set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" \
  2>/dev/null || true)

# Only act when the command involved test run data
if ! echo "$CMD" | grep -qE '(curl.*PATCH.*api/runs|seed|migrate|node server/index)'; then
  exit 0
fi

BASE="${SERVER_BASE_URL:-http://localhost:3001}"

REFRESH=$(curl -s -m 5 -X POST "$BASE/api/flaky-tests/refresh" 2>/dev/null || true)
if [ -z "$REFRESH" ]; then
  echo "flaky-test-detector: server not reachable, skipping" >&2
  exit 0
fi

NEWLY=$(echo "$REFRESH" | python3 -c \
  "import sys,json; items=json.load(sys.stdin).get('data',{}).get('newly_flaky',[]); print('\n'.join(items))" \
  2>/dev/null || true)

[ -z "$NEWLY" ] && exit 0

# Load .env for Discord credentials
ENV_FILE="$(cd "$(dirname "$0")/../.." && pwd)/.env"
if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
fi

BOT_TOKEN="${DISCORD_BOT_TOKEN:-}"
CHANNEL_ID="${DISCORD_FLAKY_CHANNEL_ID:-}"

if [ -z "$BOT_TOKEN" ] || [ -z "$CHANNEL_ID" ]; then
  echo "flaky-test-detector: DISCORD_BOT_TOKEN or DISCORD_FLAKY_CHANNEL_ID not set" >&2
  exit 0
fi

STATS=$(curl -s -m 5 "$BASE/api/flaky-tests" 2>/dev/null || true)

while IFS= read -r TITLE; do
  [ -z "$TITLE" ] && continue

  INFO=$(echo "$STATS" | python3 -c "
import sys, json, os
title = os.environ.get('_TITLE','')
d = json.load(sys.stdin)
for t in d.get('data',{}).get('all_tests',[]):
    if t.get('title') == title:
        print(json.dumps({
            'score': t.get('flakiness_score','?'),
            'pass_rate': t.get('pass_rate','?'),
            'decisive': t.get('decisive','?'),
            'hypothesis': t.get('ai_hypothesis','') or '—'
        }))
        break
" 2>/dev/null <<< "$STATS" || echo '{}')

  SCORE=$(echo "$INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('score','?'))" 2>/dev/null || echo '?')
  PR=$(echo "$INFO"    | python3 -c "import sys,json; print(json.load(sys.stdin).get('pass_rate','?'))" 2>/dev/null || echo '?')
  DEC=$(echo "$INFO"   | python3 -c "import sys,json; print(json.load(sys.stdin).get('decisive','?'))" 2>/dev/null || echo '?')
  HYP=$(echo "$INFO"   | python3 -c "import sys,json; print(json.load(sys.stdin).get('hypothesis','—'))" 2>/dev/null || echo '—')

  PAYLOAD=$(python3 -c "
import json, sys
msg = '🚨 New Flaky Test Detected\nTest: {}\nScore: {} | Pass Rate: {}% | Runs: {}\nHypothesis: {}'.format(*sys.argv[1:])
print(json.dumps({'content': msg}))
" "$TITLE" "$SCORE" "$PR" "$DEC" "$HYP")

  curl -s -m 10 \
    -X POST "https://discord.com/api/v10/channels/$CHANNEL_ID/messages" \
    -H "Authorization: Bot $BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" > /dev/null 2>&1 \
    || echo "flaky-test-detector: Discord send failed" >&2

done <<< "$NEWLY"

exit 0
