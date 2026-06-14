#!/usr/bin/env bash
# PostToolUse hook — lightweight JS/TS validation after writes/edits.
#
# Trigger conditions (checked inside the script, not by matcher):
#   *.js, *.jsx, *.ts, *.tsx
#   package.json, tsconfig*.json
#   vite.config.*, webpack.config.*, next.config.*
#
# Validation order — stops on first failure:
#   1. npx tsc --noEmit   if tsconfig.json exists in the nearest package root
#   2. npm run lint        if a lint script exists in the nearest package.json
#   3. npm run build       if a build script exists AND the changed file is a
#                          config file (skipped for regular source edits — too slow)
#
# Output: JSON systemMessage on failure; silent on success.
# Blocking: never — always exits 0.

TMP=$(mktemp)
cat > "$TMP"

python3 - "$TMP" <<'PYEOF'
import sys, json, re, os, subprocess

tmp = sys.argv[1]
try:
    with open(tmp) as f:
        data = json.load(f)
    os.unlink(tmp)
except Exception:
    sys.exit(0)

file_path = data.get('tool_input', {}).get('file_path', '')

# Only proceed for JS/TS source files and build config files.
TRIGGER = re.compile(
    r'\.(jsx?|tsx?)$'
    r'|package\.json$'
    r'|tsconfig[^/]*\.json$'
    r'|vite\.config\.'
    r'|webpack\.config\.'
    r'|next\.config\.'
)
if not TRIGGER.search(file_path):
    sys.exit(0)

# Build/config files may affect bundling; regular source edits skip the
# expensive build step and only run tsc + lint.
IS_CONFIG = re.compile(
    r'package\.json$'
    r'|tsconfig[^/]*\.json$'
    r'|vite\.config\.'
    r'|webpack\.config\.'
    r'|next\.config\.'
)
is_config = bool(IS_CONFIG.search(file_path))

# Walk up from the edited file to find the nearest package.json root.
def find_root(path):
    d = os.path.dirname(os.path.abspath(path)) if os.path.isfile(path) else os.path.abspath(path)
    while True:
        if os.path.exists(os.path.join(d, 'package.json')):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent

root = find_root(file_path)
if not root:
    sys.exit(0)

try:
    with open(os.path.join(root, 'package.json')) as f:
        scripts = json.load(f).get('scripts', {})
except Exception:
    scripts = {}

def run(cmd, timeout=30):
    try:
        r = subprocess.run(
            cmd, shell=True, cwd=root,
            capture_output=True, text=True, timeout=timeout
        )
        return r.returncode, (r.stderr or r.stdout).strip()
    except subprocess.TimeoutExpired:
        return 1, f'Command timed out after {timeout}s'
    except Exception as e:
        return 1, str(e)

def warn(cmd, error, suggestion):
    lines = [
        '⚠️  JS BUILD CHECK FAILED',
        f'   Triggered by: {file_path}',
        f'   Failed:       {cmd}',
        '',
    ]
    for line in error.splitlines()[:25]:
        lines.append(f'   {line}')
    if suggestion:
        lines += ['', f'   Fix: {suggestion}']
    print(json.dumps({'systemMessage': '\n'.join(lines)}))
    sys.exit(0)

# 1. TypeScript — run if tsconfig.json exists at the package root.
if os.path.exists(os.path.join(root, 'tsconfig.json')):
    code, out = run('npx tsc --noEmit', timeout=60)
    if code != 0:
        warn('npx tsc --noEmit', out, 'Fix the type errors shown above.')

# 2. Lint — run if a lint script is defined.
if 'lint' in scripts:
    code, out = run('npm run lint --silent', timeout=60)
    if code != 0:
        warn('npm run lint', out, 'Run "npm run lint -- --fix" to auto-fix.')

# 3. Build — config file changes only; source edits skip this (too slow).
if is_config and 'build' in scripts:
    code, out = run('npm run build', timeout=90)
    if code != 0:
        warn('npm run build', out, 'Check import paths, exports, or config syntax.')

PYEOF

exit 0
