# Example: Creating the Severity Enum Hook

## Prompt I typed

> Add a PostToolUse hook that warns me whenever I accidentally write a severity value like 'high', 'medium', or 'low' in a JavaScript file. The project only allows Critical, Major, Minor, and Trivial — I keep forgetting and writing the wrong ones.

## What Claude did

1. Read `.claude/settings.json` to understand the existing hook structure — the project already had two PostToolUse hooks on the `Edit|Write` matcher for response shape and JS build checks.
2. Created `.claude/hooks/check-severity-enum.sh` — a Python-backed bash script that: reads the tool-use JSON payload from stdin, extracts the file path, skips non-JS/JSX/TS/TSX files, scans each line for the pattern `['"\`](high|medium|low|blocker|cosmetic)['"\`]` as a quoted string literal, and outputs a JSON `systemMessage` warning for each match with line number and context.
3. Added the new hook to `.claude/settings.json` alongside the existing two hooks under the same `Edit|Write` matcher — merging the arrays rather than replacing them.
4. Tested the hook by piping a synthetic stdin payload with a file path pointing to a React component that contained `severity: 'high'` — confirmed the warning fired correctly with the line number highlighted.
5. Confirmed the hook exits with code 0 even on warnings so it never blocks Claude Code from completing the write.

## Result

| File | What it does |
|------|-------------|
| `.claude/hooks/check-severity-enum.sh` | PostToolUse hook that scans JS/JSX files for non-standard severity literals |
| `.claude/settings.json` | Updated to include the new hook in the `Edit|Write` PostToolUse array |

**Warning output example** when the hook fires:

```
⚠️  SEVERITY ENUM WARNING: client/src/pages/Bugs.jsx
   CLAUDE.md only allows: Critical | Major | Minor | Trivial
   Found non-standard severity string(s):
   Line 47: 'high'        →  severity: 'high', // TODO: fix this
```

The hook fires silently on clean files. It only surfaces output when a non-standard value is detected, keeping the normal workflow noise-free.
