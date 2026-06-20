# QA Command Center Plugin

Claude Code assets for structured QA workflows and flaky test detection.

## What's included

| Type | Name | What it does |
|------|------|-------------|
| Agent | `test-writer` | Generates ISTQB-style test cases from feature descriptions |
| Agent | `bug-reporter` | Creates structured bug reports with Steps / Expected / Actual |
| Agent | `qa-reviewer` | Reviews code or features and surfaces QA risks |
| Agent | `flake-analyzer` | Given a test's pass/fail history, returns a root-cause hypothesis |
| Command | `/new-test` | Interactive test case creation |
| Command | `/bug-report` | Interactive bug report creation |
| Command | `/new-method` | Documents a new API method |
| Skill | `test-generator` | ISTQB boundary-value analysis skill used by test-writer |
| Skill | `qa-review` | QA review skill used by qa-reviewer |
| Skill | `bug-report-generator` | Bug report formatting skill used by bug-reporter |
| Hook | `check-response-shape.sh` | PostToolUse: validates API envelope shape after writes |
| Hook | `check-severity-enum.sh` | PostToolUse: catches severity typos after writes |
| Hook | `check-js-build.sh` | PostToolUse: runs lint/build check on JS config changes |
| Hook | `flaky-test-detector.sh` | PostToolUse: detects new flaky tests after run writes, sends Discord alert |
| MCP | `discord` | Discord bot integration via `@pasympa/discord-mcp` |

## Prerequisites

- Claude Code CLI
- Node.js 22+
- A Discord bot token (for flaky test alerts)
- A Discord channel ID to receive alerts

## Installation

**Step 1 — Copy assets**

```bash
cp -r plugin/agents   .claude/
cp -r plugin/commands .claude/
cp -r plugin/skills   .claude/
cp -r plugin/hooks    .claude/
chmod +x .claude/hooks/*.sh
```

**Step 2 — Merge hooks into `.claude/settings.json`**

Add these entries to the `"PostToolUse"` array in your `.claude/settings.json`:

```json
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
```

**Step 3 — Configure Discord**

Copy `plugin/mcp/mcp-template.json` to `.mcp.json` at your project root. Edit the path to point to your `.env` file.

Add to your `.env`:
```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_FLAKY_CHANNEL_ID=your_channel_id_here
```

Add `.mcp.json` to your Claude Code enabled MCP servers:
```json
{ "enabledMcpjsonServers": ["discord"] }
```
in `.claude/settings.local.json`.

## Usage examples

### Generate test cases
```
Use the test-writer agent to generate test cases for the login feature
```

### File a bug
```
/bug-report
```

### Analyze a flaky test
Invoke the flake-analyzer agent with:
```
test_case_id: 6
title: Concurrent login fails under load
pass_rate: 50%
flakiness_score: 1.00
decisive_runs: 12
history (newest first): passed, failed, passed, failed, passed, failed
failure_notes: Connection pool exhausted under concurrent load.
```

### Automatic flake detection
The `flaky-test-detector.sh` hook fires automatically after test run writes. It calls `/api/flaky-tests/refresh` and sends a Discord alert if new flaky tests are detected.
