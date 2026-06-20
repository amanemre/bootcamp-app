# Example: Creating the Bug Report Slash Command

## Prompt I typed

> Create a slash command that helps me write bug reports. It should ask me questions one at a time and then generate a properly formatted bug report file. Follow the bug report fields defined in CLAUDE.md.

## What Claude did

1. Read `CLAUDE.md` to extract the canonical bug report field definitions (Title, Steps to Reproduce, Expected, Actual, Severity, Status) and the project's severity scale (Critical / Major / Minor / Trivial).
2. Created `.claude/commands/bug-report.md` — a six-question ISTQB-aligned interview flow: location/component, reproduction steps, expected behavior, actual behavior, severity selection with definitions, and environment details.
3. Defined the exact output template in the command file: a Summary table, Preconditions, Steps to Reproduce, Expected Result, Actual Result, Impact Assessment, and Attachments — all formatted as a `.md` file at `tests/bugs/YYYY-MM-DD-<slug>.md`.
4. Created `.claude/agents/bug-reporter.md` to wire the command into a standalone agent — the agent reads the command file as its single source of truth, pre-fills answers from any details already given, and picks up the interview from the first unanswered question.
5. Created `.claude/skills/bug-report-generator/SKILL.md` to handle the complementary flow: converting unstructured tester notes, logs, or screenshots into a fully formatted report without needing to conduct an interview.

## Result

| File | What it does |
|------|-------------|
| `.claude/commands/bug-report.md` | The `/bug-report` slash command — defines the interview and report template |
| `.claude/agents/bug-reporter.md` | Agent that drives the interview; delegates formatting entirely to the command file |
| `.claude/skills/bug-report-generator/SKILL.md` | Skill for generating reports from raw notes; surfaces missing information at the end |

**Usage example** — after running `/bug-report`, Claude asks:

> "Where did this defect occur? Please provide the URL, screen name, or component where the issue was observed."

After all six questions, it writes a complete report to `tests/bugs/2026-06-20-login-page.md`.

**Output format excerpt:**
```markdown
# Bug Report: Login page crashes on empty password submission

## Summary
| Field        | Details                          |
|--------------|----------------------------------|
| Severity     | Critical                         |
| Status       | New                              |
| Location     | /login                           |
| Environment  | Chrome 125 / macOS 15 / v1.0.0  |

## Steps to Reproduce
1. Navigate to /login.
2. Leave the password field empty.
3. Click Submit.
```
