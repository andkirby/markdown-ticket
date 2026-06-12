---
name: mdt-pipeline-e2e
version: 1.0.0
description: |
  Full MDT ticket lifecycle pipeline — spec through implementation to done.
  Runs as a single agent using Ralph loop with milestones for each stage.
  Stages: assess → requirements → BDD → architecture → UX design (if UI) →
  tests → tasks → implement → code review → fix → tech-debt → user review → close.
  
  Fully automatic until blocked: generates all artifacts, implements code,
  ensures tests green, self-reviews code, and closes the ticket.
  
  Use when asked to "run the full pipeline", "implement ABC-012 end to end",
  "take this ticket to done", or "full auto pipeline".
---

# MDT Full Lifecycle Pipeline v2

## Overview

End-to-end pipeline that takes a ticket from idea to **Implemented**.
Runs as a **single agent** using a **Ralph loop** — each iteration is a milestone
(stage). No sub-agents or teams needed.

```
 assess → requirements → BDD → architecture → UX design* → tests → tasks
       → implement → code review → tech-debt → user review → close

 * UX design only if ticket involves UI changes
```

Every milestone follows the same 3-step pattern:

```
1. Load skill → execute the workflow → produce artifacts
2. Self-review → check for gaps → fix
3. ralph_done → advance to next milestone
```

## Quick Start

```
/mdt:pipeline-e2e ABC-012
/mdt:pipeline-e2e ABC-012 --from architecture
/mdt:pipeline-e2e ABC-012 --skip assess
/mdt:pipeline-e2e ABC-012 --no-auto-close
/mdt:pipeline-e2e ABC-012 --ignore baseline,lint
```

## Milestones

| # | Milestone | What happens | Skill |
|---|-----------|-------------|-------|
| 0 | **Pre-flight** | Git state check, baseline build, ticket load | — |
| 1 | **Assess** | Feasibility, scope, risk | `mdt:assess` |
| 2 | **Requirements** | Functional + non-functional requirements | `mdt:requirements` |
| 3 | **BDD** | Behavior scenarios (Given/When/Then) | `mdt:bdd` |
| 4 | **Architecture** | Backend design, module boundaries, data flow | `mdt:architecture` |
| 5 | **UX Design** | Design specs, state tables, wireframes *(conditional)* | `ux-designer-specifier` |
| 6 | **Tests** | Test plans mapping requirements → test files | `mdt:tests` |
| 7 | **Tasks** | Implementable tasks with TDD structure | `mdt:tasks` |
| 8 | **Implement** | TDD execution, build + test gates | `mdt:implement` |
| 9 | **Code Review** | Self-review checklist, fix issues | — |
| 10 | **Tech Debt** | Structural issues scan | `mdt:tech-debt` |
| 11 | **User Review + Close** | Present to user, close ticket | — |

## Flags

| Flag | Description |
|------|-------------|
| `ABC-012` | Required. Ticket key. |
| `--from STAGE` | Resume from a specific milestone. Verifies prior artifacts exist. |
| `--skip STAGES` | Comma-separated milestones to skip. Use sparingly. |
| `--no-auto-close` | Run all milestones but stop before closing ticket. |
| `--ux-force` | Force UX design milestone even for non-UI tickets. |
| `--ignore CHECKS` | Comma-separated pre-flight checks to skip: `baseline`, `lint`, `build`. |

## Execution

### Pre-flight (Milestone 0)

Run before starting the Ralph loop. **Blocks pipeline if dirty.**

**0a. Git state check**

```bash
git status --porcelain
```

If working tree is dirty:
```
⚠️ Working tree has uncommitted changes:
  {list changed files}

Options:
  [Commit changes]   — run /commit skill, then restart pipeline
  [Stash changes]    — git stash, pipeline proceeds, pop at end
  [Abort]            — stop pipeline, clean up yourself
```

**0b. Baseline build check** *(skip with `--ignore baseline`)*

```bash
bun run build:all 2>&1
bunx jest --no-coverage --testTimeout=10000 --forceExit 2>&1
bun run lint 2>&1
```

Record baseline:
```
Baseline:
  Build:    ✅ / ❌
  Tests:    {N}/{N} passing, {N} failing
  Lint:     ✅ / ❌

Pre-existing failures (if any):
  {list failing suites and test names}
```

If baseline build fails and user says proceed — note it. The pipeline will
still ensure the final state is better than baseline.

**0c. Load ticket context**

```bash
mdt-cli 12
```

This reads ticket base data. `{TICKETS_PATH}` and `{PROJECT_CODE}` are
injected by session hooks. If missing, run `mdt-cli project | grep tickets` to resolve.

Parse ticket to determine:
- Ticket type (feature, bugfix, docs, refactor)
- Whether UI is involved (scan title, description, tags)
- Existing artifacts (check `{TICKETS_PATH}/{CR-KEY}/`)

**0d. Start Ralph loop**

```
ralph_start:
  name: mdt-pipeline-{CR-KEY}
  task: {the milestone plan from below}
  maxIterations: 50
  itemsPerIteration: 1
  reflectEvery: 5
```

### Spec Milestones (1–7)

Each spec milestone follows this pattern:

```
── Iteration ──────────────────────────────
1. Load skill:
   Read mdt skill: /mdt
   Read skills/{stage}/SKILL.md

2. Execute the workflow:
   - Read ticket CR
   - Read all prior artifacts from disk
   - Generate stage artifacts
   - Write to {TICKETS_PATH}/{CR-KEY}/

3. Self-review:
   - Re-read all artifacts produced
   - Check completeness, traceability, consistency
   - Fix any gaps found
   - Re-verify

4. Report:
   {stage} complete. Artifacts: {list files}

5. ralph_done → next milestone
```

**Architecture milestone (4) — extra quality focus:**

Self-review must verify:
- Module boundaries with clear ownership
- Data flow (request → controller → service → repo)
- Error handling strategy (not "try/catch everywhere")
- Type safety (no `any` without justification)
- Every module testable in isolation
- No circular dependencies
- No god objects or grab-bag services

**UX Design milestone (5) — conditional:**

Auto-detect: scan ticket for UI-related keywords (frontend, component, CSS,
modal, page, layout, visual, button, form, table, dashboard).

If UI detected (or `--ux-force`):
- Load skills: `ux-designer-specifier`, `mdt-ux-designer`
- Produce concise design document updates in `docs/design/surfaces/`
- State tables for interactive elements
- Wireframes via `wireloom` skill if needed
- Focus: interaction flows, state transitions, responsive behavior

If no UI detected, skip this milestone entirely.

**After all spec milestones — user checkpoint:**

Before implementation starts, pause and present:

```
═══════════════════════════════════════════
  {CR-KEY} — Spec Complete
═══════════════════════════════════════════

Artifacts:
  {list all files}

Architecture summary:
  {3-5 key design decisions}

Ticket status will change to: In Progress

Options:
  [Proceed to implementation]
  [Review artifacts first]
  [Revise a specific stage]
═══════════════════════════════════════════
```

On "Proceed":
```bash
mdt-cli attr {ticket-number} status=in_progress
```

### Implementation Milestone (8)

```
1. Load skill:
   Read mdt skill: /mdt:implement

2. Execute:
   mdt:implement {CR-KEY} --all

   - Follow TDD: RED → GREEN for every task
   - After all tasks complete, verify hard gates

3. Hard gates (must ALL pass before leaving this milestone):
   - bun run build:all → exit 0
   - Full test suite → 0 failures
   - Lint → 0 errors

4. If gates fail:
   - Fix. Re-run. Max 3 attempts per gate.
   - If still failing after 3 attempts → escalate to user.

5. ralph_done → next milestone
```

### Code Review Milestone (9)

Self-review of all changed files.

**9a. Collect changes**
```bash
git diff --name-only main...HEAD
git ls-files --others --exclude-standard
```

**9b. Review checklist** — apply to every changed file:

```
🔴 Critical (blocks close):
  - Logic bugs / race conditions
  - Resource leaks (timers, listeners, handles)
  - Double-call bugs (lifecycle methods called twice)
  - Missing error handling (uncaught promises, unhandled edges)

🟡 Medium (must fix):
  - Missing tests for new code paths
  - Non-idempotent operations that should be
  - Hardcoded values that should be configurable
  - Type safety gaps (`as any` without justification)

🟢 Minor (fix if easy):
  - Dead code, unused imports
  - Misleading comments
  - Inconsistent naming

Architecture check:
  - Clean separation of concerns
  - No circular dependencies
  - Single responsibility per module
  - Clear data flow (no hidden mutations)
```

**9c. Fix issues found**

Fix in priority order: critical → medium → minor.
After fixes, re-run: build + tests + lint.

**9d. Pre-existing test failures**

Check for test failures that predate this ticket:

```
Pre-existing failure policy:
  ✅ Fix if: root cause is clear and low-risk (missing mock, config, typo)
  ⚠️ Note if: root cause requires deep domain knowledge or risky refactoring
  ❌ Skip if: fix could break other working features

If fixing:
  - Fix root cause, not the test (unless test is wrong)
  - Commit separately from ticket implementation
  - Re-run full suite → must pass

If noting:
  - Record in close report as "known issues"
  - Let user decide whether to fix before close
```

**9e. Commit implementation changes**

```
Commit strategy:
  1. Spec artifacts commit:    feat(scope): {CR-KEY} spec artifacts
  2. Implementation commits:   feat(scope): {CR-KEY} {what was built}
  3. Pre-existing fixes:       fix(scope): fix N pre-existing test failures
  4. Review fixes:             fix(scope): {CR-KEY} code review fixes
```

Separate commits for traceability. Use the `/commit` skill for each.

### Tech Debt Milestone (10)

```
1. Load skill:
   Read mdt skill: /mdt:tech-debt

2. Execute:
   mdt:tech-debt {CR-KEY}

3. Handle results:
   - Fix CRITICAL and HIGH items
   - Record MEDIUM/LOW in debt.md for later
   - Re-run tests after any fix

4. ralph_done → next milestone
```

### User Review + Close Milestone (11)

**11a. Build close report**

```
═══════════════════════════════════════════════════
  {CR-KEY} — Ready for Review
═══════════════════════════════════════════════════

## What was built
  {5-10 line summary}

## Artifacts
  Spec:  {list {TICKETS_PATH}/{CR-KEY}/*}
  Code:  {list changed files}
  Tests: {N} new tests, {N} pre-existing fixed

## Quality gates
  Build:    ✅ clean
  Tests:    ✅ {N}/{N} passing ({N} suites)
  Lint:     ✅ 0 errors
  Review:   ✅ 0 critical, 0 medium issues
  Debt:     {N} items (CRITICAL: {N}, HIGH: {N})

## Commits
  {list git log --oneline for this ticket}

## Durable document updates
  {list any docs/ files created or updated:
   design specs, architecture docs, README changes, etc.}

## Known trade-offs
  {anything deferred, MEDIUM debt items, noted pre-existing failures}
═══════════════════════════════════════════════════
```

**11b. Ask user**

```
Ready for your review. Options:
  [Approve and close]  — commit any remaining, set Implemented
  [Request changes]    — describe what needs fixing
  [See diff]           — show git diff for specific files
  [Run app]            — start dev server for manual testing
```

**11c. Handle response**

| Response | Action |
|----------|--------|
| Approve | Commit remaining, set status = Implemented |
| Changes requested | Fix, re-test, re-present at next Ralph iteration |
| See diff | Show diff, wait for next instruction |
| Run app | `bun run dev:full`, guide user to test |

**11d. Close (on approval)**

Before setting Implemented, verify close checklist:

```
Close checklist:
  ✅ Spec artifacts exist and are complete
  ✅ All tasks checked in tasks.md
  ✅ Build clean
  ✅ All tests green
  ✅ Lint clean
  ✅ Code review done (0 critical, 0 medium)
  ✅ Tech debt checked
  ✅ Durable docs updated (design, README, etc.)
  ✅ Changes committed
  ✅ User approved
```

All ✅ → `mdt-cli attr {ticket-number} status=implemented`

## Context Management

Single agent, Ralph loop. Context grows with each milestone.

**Recycling strategy:**
- Each milestone reads artifacts from disk, not from conversation history
- Spec milestones produce files → next milestone reads them fresh
- If context gets heavy (>6 milestones in), the Ralph `reflectEvery` checkpoint
  is a good time to summarize and trim
- Spec artifacts on disk are always the source of truth, not conversation memory

**Document update tracking:**

During the planning phase, maintain a list of durable documents to update:

```
Durable documents to update:
  [ ] docs/design/surfaces/{feature}.spec.md    (UX milestone)
  [ ] docs/ARCHITECTURE.md                       (if arch changes)
  [ ] README.md                                  (if user-facing changes)
  [ ] AGENTS.md                                  (if dev workflow changes)
  [ ] DEBUG.md                                   (if runtime changes)
```

Update these during the appropriate milestone. Check off at close.

## `--from` State Validation

When resuming with `--from {stage}`, verify prior artifacts exist:

| --from | Required artifacts |
|--------|-------------------|
| requirements | `assess.md` |
| bdd | `requirements.md` |
| architecture | `bdd.md` |
| ux-design | `architecture.md` |
| tests | `architecture.md` |
| tasks | `tests.md` |
| implement | `tasks.md` |
| code-review | implementation code exists |
| tech-debt | implementation code exists |

If required artifacts missing → STOP with message:
```
Cannot resume from {stage}: missing {artifact}.
Run earlier stages first or use --skip to override.
```

## Error Handling

| Condition | Action |
|-----------|--------|
| Dirty git tree | Ask user: commit, stash, or abort |
| Baseline build broken | Note, proceed with warning. Ensure final > baseline. |
| Spec milestone produces weak artifacts | Self-review catches, fix, retry |
| Implementation TDD stuck | Max 3 retries per task, then escalate |
| Build fails after implementation | Fix, max 3 attempts, then escalate |
| Code review finds critical bugs | Fix, re-test, continue |
| Pre-existing test failure (complex) | Note in close report, don't rabbit-hole |
| User requests changes | Fix, re-test, re-present |

## Examples

### Full pipeline
```
/mdt:pipeline-e2e ABC-042
→ All milestones from pre-flight to close
```

### Resume mid-pipeline
```
/mdt:pipeline-e2e ABC-042 --from architecture
→ Validates requirements.md + bdd.md exist, starts at architecture
```

### Backend ticket (no UX)
```
/mdt:pipeline-e2e ABC-042
→ Auto-detects no UI, skips UX design milestone
```

### Skip baseline check
```
/mdt:pipeline-e2e ABC-042 --ignore baseline
→ Skips pre-flight build/test check
```

### Don't auto-close
```
/mdt:pipeline-e2e ABC-042 --no-auto-close
→ Runs all milestones, stops before setting Implemented
```
