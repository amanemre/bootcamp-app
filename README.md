# QA Command Center

A full-stack test management app (Express + React + SQLite) with a built-in Claude Code plugin for QA teams. Track test cases, suites, runs, bugs, reports, and flaky tests — and let Claude help you generate, review, and document all of it.

---

## What this plugin does

This plugin gives Claude Code a full QA toolkit. Install it into any project and Claude can:

- **Generate test cases** using ISTQB boundary-value analysis and equivalence partitioning. Ask for test cases and Claude applies the technique automatically — covering happy path, boundary values, equivalence partitions, and negative cases.
- **Create structured bug reports** via an interactive six-question interview. Claude asks one question at a time, infers missing fields, and writes a formatted report to `tests/bugs/`.
- **Review code and features from a QA perspective.** The qa-reviewer agent examines six categories: missing validation, missing error handling, unclear user messages, missing confirmation dialogs, accessibility barriers, and edge cases.
- **Diagnose flaky tests.** The flake-analyzer agent reads a test's pass/fail history, applies pattern-matching rules (alternating → race condition, clustered → environment degradation, isolated → intermittent precondition), and returns a one-sentence hypothesis.
- **Enforce quality standards automatically** via four PostToolUse hooks that fire whenever Claude writes code: API envelope shape validation, severity enum enforcement, JS/TS lint and type checks, and flaky test detection with Discord alerts.

---

## Install

### 1. Copy the Claude assets

```bash
# From the repo root
cp -r .claude/commands  /your-project/.claude/
cp -r .claude/skills    /your-project/.claude/
cp -r .claude/agents    /your-project/.claude/
cp -r .claude/hooks     /your-project/.claude/
chmod +x /your-project/.claude/hooks/*.sh
```

### 2. Activate the hooks

Merge the following into your project's `.claude/settings.json`. If the file does not exist, create it.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/check-response-shape.sh" },
          { "type": "command", "command": ".claude/hooks/check-severity-enum.sh" },
          { "type": "command", "command": ".claude/hooks/check-js-build.sh" }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/flaky-test-detector.sh" }
        ]
      }
    ]
  }
}
```

### 3. Configure Discord alerts (optional)

Add to your `.env`:

```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_FLAKY_CHANNEL_ID=your_channel_id_here
```

Copy `.mcp.json` to your project root (edit the path to match your `.env` location) to enable the Discord MCP server for interactive use.

### 4. Confirm the manifest

All assets and their paths are documented in `.claude-plugin/plugin.json`. Verify that every referenced file exists before using the plugin in a new project.

---

## Examples

See the `examples/` folder for three end-to-end worked examples from this project's build history:

| File | What it demonstrates |
|------|---------------------|
| [`examples/01-flaky-test-tracker.md`](examples/01-flaky-test-tracker.md) | Using Plan Mode + Explore subagents to build the Flaky Test Tracker feature end-to-end |
| [`examples/02-bug-report-command.md`](examples/02-bug-report-command.md) | Creating the `/bug-report` slash command, agent, and skill from a single prompt |
| [`examples/03-severity-hook.md`](examples/03-severity-hook.md) | Creating a PostToolUse hook to enforce severity enum values in JS files |

**Quick usage examples:**

```
# Generate test cases for a feature
Use the test-writer agent to generate test cases for the login feature

# File a bug report interactively
/bug-report

# Review a code change from a QA perspective
Do a QA review of the changes in server/routes/runs.js

# Analyze a flaky test
Use the flake-analyzer agent with:
  title: Concurrent login attempts fail under load
  pass_rate: 50%
  history: passed, failed, passed, failed, passed, failed
  failure_notes: Connection pool exhausted under concurrent load.
```

---

## What's inside

### Commands (slash commands)

| Command | File | What it does |
|---------|------|-------------|
| `/bug-report` | `.claude/commands/bug-report.md` | Six-question interview → formatted bug report in `tests/bugs/` |
| `/new-test` | `.claude/commands/new-test.md` | Three-question interview → test case in `tests/manual/` |
| `/new-method` | `.claude/commands/new-method.md` | Ten-question interview → utility method + optional unit tests in `tests/utils/` |

### Skills

| Skill | File | What it does |
|-------|------|-------------|
| `test-generator` | `.claude/skills/test-generator/SKILL.md` | ISTQB boundary-value analysis technique; auto-triggers on test generation requests |
| `qa-review` | `.claude/skills/qa-review/SKILL.md` | Six-category structured review template; auto-triggers on QA review requests |
| `bug-report-generator` | `.claude/skills/bug-report-generator/SKILL.md` | Converts unstructured tester notes into professional submission-ready reports |

### Agents

| Agent | File | What it does |
|-------|------|-------------|
| `test-writer` | `.claude/agents/test-writer.md` | Generates coverage-complete test suites; uses the test-generator skill |
| `bug-reporter` | `.claude/agents/bug-reporter.md` | Conversational defect interview; delegates formatting to the bug-report command |
| `qa-reviewer` | `.claude/agents/qa-reviewer.md` | Code/feature QA review; outputs findings grouped by severity |
| `flake-analyzer` | `.claude/agents/flake-analyzer.md` | Root-cause hypothesis from pass/fail history; pattern rules for race conditions, environment degradation, and intermittent preconditions |

### Hooks

| Hook | Trigger | File | What it does |
|------|---------|------|-------------|
| `check-response-shape` | PostToolUse Edit\|Write | `.claude/hooks/check-response-shape.sh` | Warns when a server route response may violate `{success, data, error}` |
| `check-severity-enum` | PostToolUse Edit\|Write | `.claude/hooks/check-severity-enum.sh` | Warns when non-standard severity strings appear in JS/JSX files |
| `check-js-build` | PostToolUse Edit\|Write | `.claude/hooks/check-js-build.sh` | Runs `tsc --noEmit` + `npm run lint`; runs `npm run build` on config changes |
| `flaky-test-detector` | PostToolUse Bash | `.claude/hooks/flaky-test-detector.sh` | Refreshes flakiness stats; sends Discord alerts for newly flaky tests |

### Manifest

`.claude-plugin/plugin.json` — machine-readable inventory of every asset with descriptions, file paths, and required environment variables.

### Environment variables

| Variable | Required | Used by |
|----------|----------|---------|
| `DISCORD_BOT_TOKEN` | No | Discord MCP server, flaky-test-detector hook |
| `DISCORD_FLAKY_CHANNEL_ID` | No | flaky-test-detector hook alerts |
| `GITHUB_TOKEN` | No | GitHub issue creation from failing test runs |
| `GITHUB_REPO` | No | GitHub issue creation (`owner/repo` format) |

---

## Local development

```bash
npm install
npm run dev
```

- React app: http://localhost:5173
- API server: http://localhost:3001

Copy `.env.example` to `.env` and fill in any optional values you need.

## DEPLOY

### Provider: Render (free tier)

Render runs the Express server as a long-running Node.js process, which is required for the SQLite database. Vercel and Netlify use serverless functions and are not suitable for this app.

**Free-tier caveats:**
- The service sleeps after 15 minutes of inactivity. The first request after a sleep takes ~30–50 seconds to respond.
- The disk is ephemeral — the SQLite database is reset on every redeploy. Sample data is re-seeded automatically on startup.
- 750 free instance hours per month (enough for one service running around the clock).

### One-time setup (do this once)

1. Push the code to GitHub.

2. Go to https://render.com, sign in, and click **New → Web Service**.

3. Connect your GitHub repository. Render detects `render.yaml` and pre-fills all settings.

4. Click **Deploy**. Render runs `npm install && npm run build`, then starts the server with `npm start`.

5. Your public URL appears at the top of the service page (e.g. `https://bootcamp-app.onrender.com`).

### After the first deploy

Every `git push` to `main` triggers an automatic redeploy.

### Environment variables (optional)

Set these in the Render dashboard under **Environment** if you want GitHub issue creation to work:

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Personal access token with `repo` scope |
| `GITHUB_REPO` | Target repository in `owner/repo` format |

### Deploy command

```bash
git push origin main
```
