# CLAUDE.md

## Stack
Express (Node.js) API server in `server/` + React (Vite) frontend in `client/` — run together with `npm run dev` from the root.

## Severity Levels
- **Critical** — System crash, data loss, security breach, or complete feature failure with no workaround.
- **Major** — Core functionality is significantly impaired and no acceptable workaround exists.
- **Minor** — Functionality is partially impaired but a workaround exists.
- **Trivial** — Cosmetic issue, typo, or low-impact UI inconsistency with no functional effect.

## Test Case Fields
| Field | Description |
|---|---|
| **Title** | Short, action-oriented description of what is being tested |
| **Preconditions** | State or data that must exist before the test is executed |
| **Steps** | Numbered, sequential actions the tester performs |
| **Expected Result** | The correct outcome if the feature works as intended — must be specific and observable; never use vague language like "works correctly" or "displays properly" |
| **Severity** | Critical / Major / Minor / Trivial |
| **Status** | Draft / Ready / Passed / Failed / Skipped |

## Bug Report Fields
| Field | Description |
|---|---|
| **Title** | Concise description of the defect |
| **Steps to Reproduce** | Numbered steps that reliably trigger the bug |
| **Expected** | What should have happened |
| **Actual** | What actually happened |
| **Severity** | Critical / Major / Minor / Trivial |
| **Status** | Open / In Progress / Resolved / Closed / Reopened |

## API Response Shape
Every endpoint returns the same envelope:
```json
{
  "success": true,
  "data": {},
  "error": null
}
```
- `success` — boolean, always present.
- `data` — the response payload on success; `null` on error.
- `error` — human-readable error message on failure; `null` on success.

## File Naming
- **Files and folders** — kebab-case: `user-profile.js`, `auth-helpers.js`
- **React components** — PascalCase: `UserCard.jsx`, `LoginForm.jsx`
- **API route handlers** — `handleVerbNoun`: `handleGetUser`, `handleCreateOrder`

## Voice
All generated test cases and bug reports must be written in clear, direct English. State facts. Use short sentences. No buzzwords, no filler phrases, no passive voice where active works better.
