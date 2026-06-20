#!/usr/bin/env bash
# PostToolUse hook — warns when a JS/JSX/TS/TSX file contains a wrong
# severity word as a string literal. Valid values per CLAUDE.md:
#   Critical | Major | Minor | Trivial

TMP=$(mktemp)
cat > "$TMP"

python3 - "$TMP" <<'PYEOF'
import sys, json, re, os

tmp = sys.argv[1]
try:
    with open(tmp) as f:
        data = json.load(f)
    os.unlink(tmp)
except Exception:
    sys.exit(0)

file_path = data.get('tool_input', {}).get('file_path', '')

if not re.search(r'\.(jsx?|tsx?)$', file_path):
    sys.exit(0)

try:
    with open(file_path) as f:
        lines = f.readlines()
except Exception:
    sys.exit(0)

# Match wrong severity words that appear as quoted string literals:
# 'high', "medium", `low`, etc. — case-insensitive.
WRONG = re.compile(r'''['"`](high|medium|low|blocker|cosmetic)['"`]''', re.IGNORECASE)

hits = []
for i, line in enumerate(lines, 1):
    for m in WRONG.finditer(line):
        hits.append((i, m.group(0), line.rstrip()))

if hits:
    out = [f'⚠️  SEVERITY ENUM WARNING: {file_path}',
           '   CLAUDE.md only allows: Critical | Major | Minor | Trivial',
           '   Found non-standard severity string(s):']
    for lineno, match, text in hits:
        out.append(f'   Line {lineno}: {match!r:12s}  →  {text.strip()[:80]}')
    print(json.dumps({"systemMessage": "\n".join(out)}))
PYEOF

exit 0
