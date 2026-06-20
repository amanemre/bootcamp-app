# Example: Building the Flaky Test Tracker

## Prompt I typed

> Before writing any code, switch to Plan Mode and create a detailed implementation plan for the final project feature: Flaky Test Tracker
>
> The feature must satisfy all grading requirements and include four required pieces:
> 1. Plan Mode — evidence that planning occurred before implementation
> 2. Discord MCP — use .mcp.json, DISCORD_BOT_TOKEN, alert when new flaky test detected
> 3. Flake Analyzer Subagent — create `.claude/agents/flake-analyzer.md` for root-cause hypothesis generation
> 4. PostToolUse Hook — trigger after test_run_results writes, recompute metrics, detect new flakes, send Discord alerts
>
> Do NOT start implementing yet. I want a Plan Mode architecture proposal first. After presenting the plan:
> 1. Wait for my feedback.
> 2. Revise the plan if I request changes.
> 3. Only after I approve the plan should you click Implement and allow execution.

## What Claude did

1. Launched three parallel Explore subagents to survey the codebase simultaneously: one mapped the server database schema and routes, one analyzed frontend page patterns and component conventions, one inventoried existing Claude assets (agents, hooks, MCP config).
2. Discovered that `test_run_results` held raw pass/fail data but no flakiness columns existed anywhere — no computed scores, no history, no leaderboard.
3. Designed a flakiness formula: `score = 4 × pass_rate × (1 − pass_rate)`, which peaks at 1.0 for a 50% pass rate and falls to 0 for always-pass or always-fail tests.
4. Wrote a full architecture plan to `.claude/plans/greedy-strolling-hoare.md` covering: `test_case_stats` table schema, seed data strategy (5 new test cases × 12 runs each with pre-defined result patterns), three new API endpoints, flake-analyzer subagent prompt design with pattern-matching rules, PostToolUse hook flow, frontend two-tab page layout, and plugin packaging.
5. Presented the plan and waited for approval before writing a single line of code.
6. After approval, implemented all 11 steps in order: DB schema → seed → routes → server wiring → subagent → hook → frontend page → nav → plugin bundle.
7. Ran the dev server and verified the API returned 10 leaderboard entries and 36 total tests before marking the task complete.

## Result

| File | What it does |
|------|-------------|
| `server/db.js` | Added `test_case_stats` table (idempotent `CREATE TABLE IF NOT EXISTS`) |
| `server/routes/flaky-tests.js` | `GET /api/flaky-tests`, `POST /api/flaky-tests/refresh`, `PATCH /api/flaky-tests/:id/hypothesis` |
| `server/seed.js` | `seedFlaky()` — 5 new test cases + 120 seeded results with realistic flaky/stable/unstable patterns |
| `.claude/agents/flake-analyzer.md` | Pattern-matching subagent: alternating → race condition, clustered → environment degradation, isolated → intermittent precondition |
| `.claude/hooks/flaky-test-detector.sh` | Shell hook that calls the refresh endpoint then posts a Discord alert via the REST API |
| `client/src/pages/FlakyTests.jsx` | Two-tab page: ranked leaderboard with hypothesis text + full history with sparkline dots and trend arrows |

Live result: 36 test cases tracked, 6 Flaky / 4 Unstable / 26 Stable, leaderboard fully populated at `http://localhost:3001/flaky-tests`.
