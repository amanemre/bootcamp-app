---
name: test-generator
description: Triggers automatically whenever the user asks for test cases, test scenarios, or requests ISTQB-compliant boundary-value analysis.
---

When generating test cases, apply the following guidelines without exception.

## Core Technique

Use **ISTQB boundary-value analysis** combined with **equivalence partitioning** as the primary design technique. Do not generate test cases based on intuition alone. Every case must be traceable to one of the coverage categories below.

## Required Coverage Categories

For every feature or input field under test, produce cases across all four categories:

**1. Happy Path**
Cover the standard valid user scenario. The input is correct, preconditions are met, and the system behaves as expected.

**2. Boundary Values**
Test exactly at the edges of valid ranges and one step beyond each edge. Every boundary analysis must include all of the following where applicable:
- Minimum valid value
- Maximum valid value
- Minimum − 1 (one below the lower boundary)
- Maximum + 1 (one above the upper boundary)
- Empty input
- Whitespace-only input
- Very long input (exceeds the maximum expected length)

**3. Equivalence Partitions**
Group inputs into valid and invalid classes. Write at least one test case per partition. Do not write multiple cases for the same partition unless they cover different boundaries.

**4. Negative Cases**
Cover at least the following:
- Wrong data type (e.g. text where a number is expected)
- Missing required fields
- Duplicate entries where uniqueness is enforced

## Output Format

Every generated test case must strictly follow the test case shape defined in `CLAUDE.md`. Read `CLAUDE.md` before generating output and apply its field definitions exactly.

Each test case must include:

- **Title** — Short, action-oriented description of what is being tested. State the input condition and the expected class (e.g. "Login with username at maximum character boundary").
- **Preconditions** — State or data that must exist before the test is executed. Write "None." if there are no preconditions.
- **Steps** — Numbered, sequential actions the tester performs.
- **Expected Result** — The specific, observable outcome. Never use vague language such as "works correctly" or "displays properly". State exactly what the system does: what message appears, what value is returned, what state changes.
- **Severity** — Assign one of: Critical / Major / Minor / Trivial, based on the definitions in `CLAUDE.md`.
- **Status** — Default to `Draft` for all newly generated test cases.

## Grouping

When generating a set of cases for one feature, group them by coverage category with a heading for each group. List boundary value cases in order: empty → whitespace → min−1 → min → max → max+1 → very long.
