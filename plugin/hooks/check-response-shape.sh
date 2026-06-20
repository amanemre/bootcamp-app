#!/usr/bin/env bash
# PostToolUse hook — warns when a server/routes/ file may violate the
# {success, data, error} response envelope required by CLAUDE.md.

# Capture stdin (the tool-use JSON) before the heredoc takes over
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

if 'server/routes/' not in file_path or not file_path.endswith('.js'):
    sys.exit(0)

try:
    with open(file_path) as f:
        lines = f.readlines()
except Exception:
    sys.exit(0)

# Find every res.json() call and check that success, data, AND error
# all appear within the same call block (this line + up to 4 following lines).
violations = []
for i, line in enumerate(lines):
    if re.search(r'res(?:\.status\([^)]*\))?\.json\(', line):
        block = ''.join(lines[i:min(len(lines), i + 5)])
        missing = [k for k in ('success', 'data', 'error') if k not in block]
        if missing:
            violations.append((i + 1, line.rstrip(), missing))

if violations:
    out = [f'⚠️  RESPONSE SHAPE WARNING: {file_path}',
           '   CLAUDE.md requires every endpoint to return {success, data, error}.',
           '   Possible violations:']
    for lineno, text, missing in violations:
        out.append(f'   Line {lineno}: {text.strip()[:100]}')
        out.append(f'            missing: {", ".join(missing)}')
    print(json.dumps({"systemMessage": "\n".join(out)}))
PYEOF

exit 0
