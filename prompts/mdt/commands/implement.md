# MDT Implementation Orchestrator (v9)

Execute tasks from a task list with constraint verification after each task.

**Core Principle**: Verify TDD (RED→GREEN), scope boundaries (flag/STOP), structure, and no duplication after each task.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Execution Modes

| Command | Behavior |
|---------|----------|
| `/mdt:implement {CR-KEY}` | Interactive — auto-detect part or prompt |
| `/mdt:implement {CR-KEY} --prep` | Execute prep (refactoring) tasks |
| `/mdt:implement {CR-KEY} --part {X.Y}` | Target specific part |
| `/mdt:implement {CR-KEY} --all` | Run all tasks, pause at part boundaries |
| `/mdt:implement {CR-KEY} --continue` | Resume from last incomplete |
| `/mdt:implement {CR-KEY} --task {N.N}` | Run specific task only |

## Execution Steps

### Step 1: Load Context and Discover Part

**1a. Detect mode:**

| Condition | Mode | tasks_file | tests_file | Test Expectation |
|-----------|------|------------|------------|------------------|
| `--prep` flag | prep | `prep/tasks.md` | `prep/tests.md` | GREEN (preserve) |
| `--part X.Y` flag | part | `part-X.Y/tasks.md` | `part-X.Y/tests.md` | RED (TDD) |
| Single `part-*/tasks.md` | part (auto) | that part | matching tests | RED |
| Multiple `part-*/tasks.md` | part (prompt) | user selects | matching tests | RED |
| `prep/tasks.md` has unchecked items | prep (auto) | `prep/tasks.md` | `prep/tests.md` | GREEN |
| No part folders | single | `tasks.md` | `tests.md` | RED |

All paths relative to `{TICKETS_PATH}/{CR-KEY}/`.

If both prep (incomplete) and part tasks exist, prompt user: `[Continue prep (recommended)] [Proceed to feature]`.

**1b. Load tasks.md** — extract: scope boundaries, shared patterns/imports, test coverage mapping.

**1c. Load tests.md** (if exists) — extract: test file locations, requirement→test mapping. Enables TDD verification.

**1d. Load CR** via `mdt-all:get_cr mode="full"`. For multi-part, extract relevant part section only.

**1e. Find first incomplete task** — first unchecked `- [ ]` in tasks_file.

### Step 2: Execute Task

**2a. Show task with context:**

```markdown
═══════════════════════════════════════════
{CR-KEY} Part {X.Y} — Task {N.N}
═══════════════════════════════════════════

### Task {N.N}: {Title}

**Limits**: Default {N}, Hard Max {N×1.5}
**Structure**: `{path}`
**Makes GREEN**: {test list}

{task content}

[run] [skip] [stop]
```

**2b. TDD Pre-check** (if tests.md exists):

Run `{test_command} {test_filter}` to record current state. If tests are unexpectedly GREEN (feature) or RED (prep), investigate before proceeding.

**2c. Pass to sub-agent with context:**

```markdown
# Task Context: {CR-KEY} Part {X.Y}

## Project
- Source dir: {source_dir}
- Test command: {test_command}
- Test filter: {test_filter}
- Extension: {ext}

## TDD
**Make these tests GREEN**:
- `{test_file}`: `{test_name}` — {requirement}

**Pre-check**: `{test_command} {test_filter}`
Confirm these tests are RED.

## Constraints
- Scope: {what this task owns}
- Boundary: {what it must not touch}
- Shared imports: {list — import, don't copy}

## Task
{task content}

## After Completion
1. `{test_command} {test_filter}` — task tests GREEN
2. Verify scope boundaries and exclusions
3. Verify imports from shared modules
```

**2d. Run verification:**

```bash
{build_command}   # must compile
{test_command}    # must pass (full suite)
```

### Step 3: Verify Constraints

After each task, verify **before** marking complete:

**3a. TDD check:**

Run `{test_command} {test_filter}` and evaluate:

| Mode | Pre→Post | Verdict |
|------|----------|---------|
| Feature | RED→GREEN | ✅ TDD satisfied |
| Feature | RED→RED | ⛔ Implementation incomplete |
| Feature | GREEN→GREEN | ⚠️ Already passing — investigate |
| Prep | GREEN→GREEN | ✅ Behavior preserved |
| Prep | RED→GREEN | ⚠️ Unexpected — was already failing |
| Prep | RED→RED | ⚠️ Still failing |
| Any | GREEN→RED | ⛔ REGRESSION — halt immediately |

**TDD Failure**: Max 2 retries. Show failing tests, offer `[retry] [investigate] [stop]`.

**3b. Scope check (three zones):**

- ✅ OK: Within scope and boundaries
- ⚠️ FLAG: Minor spillover — complete with warning
- ⛔ STOP: Boundary breach — must resolve

**3c. Structure + duplication check:**

Verify files at expected paths. Check for copied logic that should be imported.

### Step 4: Handle Results

| Result | Action |
|--------|--------|
| ✅ OK | Report: TDD status, file, scope OK |
| ⚠️ FLAG | Report with warning. Offer `[continue] [subdivide] [stop]` |
| ⛔ STOP | Block task. Offer `[subdivide] [justify] [retry] [stop]` |

### Step 5: Mark Progress

Only after verification:

1. Update tasks.md: `- [ ]` → `- [x]` (flagged: `- [x] ⚠️`)
2. Update tests.md: `🔴 RED` → `✅ GREEN` for completed tests
3. Report result

### Step 6: Prep/Part Completion

**Prep completion:**

```markdown
═══════════════════════════════════════════
✓ Prep Complete: {CR-KEY}
═══════════════════════════════════════════

**Tasks completed**: {N}/{N}

### Behavior Preservation
| Test File | Before | After |
|-----------|--------|-------|
| {file} | {N} GREEN | {N} GREEN |

**Regressions**: 0 ✅

### Scope Summary
| File | Change | Status |
|------|--------|--------|
| {file} | {what changed} | ✅ OK |

═══════════════════════════════════════════

**Next**: `/mdt:architecture {CR-KEY}` — design feature against restructured code
```

**Part completion:**

```markdown
═══════════════════════════════════════════
✓ Part {X.Y} Complete: {CR-KEY}
═══════════════════════════════════════════

### TDD Summary
| Test File | Before | After |
|-----------|--------|-------|
| {file} | {N} RED | {N} GREEN |

**Regressions**: 0

### Flagged Files
{list any warnings or "None"}

═══════════════════════════════════════════

**Other parts**: {list incomplete parts with task counts}
**Next**: `/mdt:implement {CR-KEY} --part {next}` or `/mdt:tech-debt {CR-KEY}` (if all done)
```

### Step 7: Acceptance Verification (Feature mode only)

After all parts complete, verify user-visible behavior:

| Condition | Action |
|-----------|--------|
| `bdd.md` exists | Run `{e2e_command}` — all must pass |
| No `bdd.md`, `requirements.md` exists | Run smoke test from acceptance criteria |
| Feature Enhancement, neither exists | STOP — run `/mdt:bdd` first |

If acceptance tests fail: STOP, fix, re-run.

### Step 7b: Completion Verification

Run `@mdt:verify-complete` agent:

```yaml
cr_key: "{CR-KEY}"
mode: "feature" | "prep" | "bugfix" | "docs"
project:
  build_command: "{build_command or null}"
  test_command: "{test_command or null}"
  lint_command: "{lint_command or null}"
  typecheck_command: "{typecheck_command or null}"
artifacts:
  cr_content: "{CR markdown}"
  requirements: "{requirements.md or null}"
  tasks: "{tasks.md content}"
  bdd: "{bdd.md or null}"
changed_files: [{all files changed}]
verification_round: 0
```

- `pass` → proceed to completion
- `partial` or `fail` → report CRITICAL/HIGH issues and STOP. Suggest: fix and re-run with `--continue`, or use `/mdt:implement-agentic` for automatic fix loop.

### Step 8: Full Completion

```markdown
═══════════════════════════════════════════
Implementation Complete: {CR-KEY}
═══════════════════════════════════════════

### Summary
| Part | Tasks | Tests | Status |
|------|-------|-------|--------|
| {part} | {done}/{total} | {N} GREEN | ✅ |

**Total**: {N} tasks, {N} tests GREEN

### Scope Review
| Part | Files | Flagged | Breaches |
|------|-------|---------|----------|
| {part} | {N} | {N} | {N} |

### Next Steps
- [ ] Review flagged files
- [ ] `/mdt:tech-debt {CR-KEY}`
- [ ] Commit changes
- [ ] Update CR status to Implemented
```

---

## Behavioral Rules

1. **Part isolation** — each part/prep has its own tasks.md and tests.md
2. **TDD verification** — feature: RED→GREEN; prep: GREEN→GREEN
3. **Three zones**: OK (≤default), FLAG (≤1.5x), STOP (>1.5x)
4. **FLAG completes** with warning recorded. **STOP blocks** — must resolve
5. **Duplication is STOP** — import instead
6. **Part 1 first** — shared utilities before features
7. **Build + test required** — both must pass
8. **Acceptance verification required** — BDD/smoke test before completion
9. **Regression is STOP** — GREEN→RED halts immediately

---

## Integration

**Workflow position**:
```
Feature:     requirements → bdd → architecture → tests → tasks → implement
Refactoring: assess → bdd --prep → architecture --prep → tests --prep → tasks --prep → implement --prep
```

**Before**: `/mdt:tasks` creates tasks.md
**After**: `/mdt:tech-debt` catches remaining issues

**Folder Structure**:
```
{TICKETS_PATH}/{CR-KEY}/
├── bdd.md
├── architecture.md
├── prep/
│   ├── architecture.md, tests.md, tasks.md
├── part-{X.Y}/
│   ├── tests.md, tasks.md
```

Context: $ARGUMENTS
