# MDT Implementation Orchestrator (v7)

Execute tasks from a task list with constraint verification after each task.

**Core Principle**: Verify TDD (RED→GREEN), size (flag/STOP), structure, and no duplication after each task.

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

**1a. Check for prep mode:**

```bash
# If --prep flag in arguments
if [[ "$ARGUMENTS" == *"--prep"* ]]; then
  mode="prep"
  tasks_file="{TICKETS_PATH}/{CR-KEY}/prep/tasks.md"
  tests_file="{TICKETS_PATH}/{CR-KEY}/prep/tests.md"
  # Prep mode: tests should STAY GREEN (behavior preservation)
  test_expectation="GREEN"
  # Skip part discovery
fi
```

**1b. Discover part context (if not prep mode):**

```bash
# Check for part-specific tasks
part_tasks=$(find {TICKETS_PATH}/{CR-KEY} -path "*/part-*/tasks.md" 2>/dev/null | sort -V)

if [ -n "$part_tasks" ]; then
  echo "Found part-specific tasks:"
  for f in $part_tasks; do
    part=$(echo "$f" | grep -oE "part-[0-9.]+")
    # Check completion status
    total=$(grep -c "^### Task" "$f" 2>/dev/null || echo 0)
    done=$(grep -c "^\- \[x\]" "$f" 2>/dev/null || echo 0)
    echo "  - $part/tasks.md ($done/$total complete)"
  done
fi
```

**1c. Determine part:**

| Scenario | Behavior |
|----------|----------|
| `--prep` flag provided | Use prep mode |
| `--part 1.1` flag provided | Use specified part |
| Single `part-*/tasks.md` exists | Use that part automatically |
| Multiple `part-*/tasks.md` exist | Prompt for selection |
| `prep/tasks.md` exists (no flags) | Check prep completion, prompt if unclear |
| No part folders, `tasks.md` at root | Single-part mode |

```bash
# If prep/tasks.md exists, check completion status
if [ -f "{TICKETS_PATH}/{CR-KEY}/prep/tasks.md" ]; then
  # Read first 20 lines for checkbox status
  head -n 20 "{TICKETS_PATH}/{CR-KEY}/prep/tasks.md" | grep -q "^\- \[ \]"
  prep_incomplete=$?

  if [ $prep_incomplete -eq 0 ]; then
    # Unchecked tasks found → prep incomplete
    mode="prep"
  else
    # All checked or unclear → prompt user
    echo "Prep tasks found. Check completion status and prompt if needed"
  fi
fi
```

```markdown
# If prep exists but status unclear:
Found both prep and part tasks:
  - prep/tasks.md (incomplete)
  - part-1/tasks.md (0/5 complete)

Prep refactoring appears incomplete. Continue prep or proceed to feature work?
  [1] Continue prep (recommended)
  [2] Proceed to feature mode
Choice [1]: _
```

**1d. Set paths:**

```yaml
# Prep mode
mode: "prep"
tasks_file: "{TICKETS_PATH}/{CR-KEY}/prep/tasks.md"
tests_file: "{TICKETS_PATH}/{CR-KEY}/prep/tests.md"
test_expectation: "GREEN"  # Behavior preservation

# Multi-part
part: "1.1"
tasks_file: "{TICKETS_PATH}/{CR-KEY}/part-1.1/tasks.md"
tests_file: "{TICKETS_PATH}/{CR-KEY}/part-1.1/tests.md"
test_expectation: "RED"  # TDD - tests start RED

# Single-part (backward compatible)
part: null
tasks_file: "{TICKETS_PATH}/{CR-KEY}/tasks.md"
tests_file: "{TICKETS_PATH}/{CR-KEY}/tests.md"
```

**1e. Load tasks.md:**

Extract from header:
- **Project Context** (source_dir, test_command, ext)
- **Size Thresholds** (default, hard max per module)
- **Shared Patterns** (what should be imported)
- **Test Coverage** table (test→task mapping)

**1f. Load tests.md (if exists):**

- Extract test file locations
- Extract requirement→test mapping
- Enable TDD verification mode

**1g. Load CR for Architecture Design:**
```
mdt-all:get_cr mode="full"
```

If multi-part, extract only the relevant part section.

**1h. Find first incomplete task:**

```bash
# Find first unchecked task
first_incomplete=$(grep -n "^\- \[ \]" "$tasks_file" | head -1)
```

### Step 2: Execute Task

**2a. Show task with part context:**

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

```bash
# Record which tests are currently RED for this task
{test_command} --testPathPattern="part-{X.Y}" 2>&1 | tee /tmp/pre-test.log

# Extract tests that should go GREEN for this task
# From task's "Makes GREEN" section
```

If tests already pass before implementation → investigate:
- Is there existing code?
- Was task partially done?
- Are tests too loose?

**2c. Pass to sub-agent with context:**

```markdown
# Task Context

## Project
- Source dir: {source_dir}
- Test command: {test_command}
- Extension: {ext}

## Part Context
- Part: {X.Y} - {Part Title}
- Tests: `part-{X.Y}/tests.md`
- Test filter: `--testPathPattern="part-{X.Y}"`

## TDD Context
**Tests to make GREEN**:
- `{test_file}`: `{test_name}` — {requirement}
- `{test_file}`: `{test_name}` — {requirement}

**Run before starting**:
```bash
{test_command} --testPathPattern="part-{X.Y}"
```
Confirm these tests are RED.

## Size Constraints
- Default: {N} lines → aim for this
- Hard Max: {N×1.5} lines → STOP if exceeded

## Anti-Duplication
Shared utilities (import, don't copy):
- `{path}` — {what it provides}

## Task
{task content}

## After Completion
1. `{test_command} --testPathPattern="part-{X.Y}"` — task tests GREEN
2. `wc -l {file}` — report line count
3. Verify imports from shared modules
```

**2d. Run verification:**

```bash
{build_command}   # must compile
{test_command}    # must pass (full suite)
```

### Step 3: Verify Constraints

After each task, verify **before** marking complete:

**3a. TDD check** (if tests.md exists):

```bash
{test_command} --testPathPattern="part-{X.Y}"
# Or for prep: --testPathPattern="prep"
```

**For feature/part mode** (test_expectation = RED):

| Pre-Task | Post-Task | Verdict |
|----------|-----------|---------|
| RED | GREEN | ✅ TDD satisfied |
| RED | RED | ⛔ Implementation incomplete |
| GREEN | GREEN | ⚠️ Tests were already passing |
| GREEN | RED | ⛔ REGRESSION |

**For prep mode** (test_expectation = GREEN, behavior preservation):

| Pre-Task | Post-Task | Verdict |
|----------|-----------|---------|
| GREEN | GREEN | ✅ Behavior preserved |
| GREEN | RED | ⛔ REGRESSION — behavior broken |
| RED | GREEN | ⚠️ Unexpected — test was already failing |
| RED | RED | ⚠️ Test still failing |

**TDD Failure Handling**:

```markdown
⛔ TDD VERIFICATION FAILED — Part {X.Y} Task {N.N}

**Expected GREEN**:
- `{test_name}` — still RED
- `{test_name}` — still RED

**Regression** (was GREEN, now RED):
- `{test_name}` — BROKEN

[retry] — Agent attempts fix (max 2 retries)
[investigate] — Review test expectations
[stop] — Halt orchestration
```

**3b. Size check (three zones):**

```bash
lines=$(wc -l < "{file}")
default={default_limit}
hard_max={hard_max_limit}

if [ "$lines" -le "$default" ]; then
  echo "✅ OK: $lines lines (limit: $default)"
elif [ "$lines" -le "$hard_max" ]; then
  echo "⚠️ FLAG: $lines lines (exceeds default $default)"
else
  echo "⛔ STOP: $lines lines (exceeds hard max $hard_max)"
fi
```

**3c. Structure check:**

```bash
ls -la {expected_path}  # Must exist at correct location
```

**3d. Duplication check:**

```bash
grep -l "{shared_pattern}" {new_file}
# If found: warn about potential duplication
```

### Step 4: Handle Results

**✅ OK (TDD satisfied, under default):**

```markdown
✓ Task {N.N} complete (Part {X.Y})
  TDD: RED → GREEN ({N} tests)
  File: {path} ({N} lines)
  Status: OK
```

**⚠️ FLAG (over default, under hard max):**

```markdown
⚠️ Task {N.N} complete with WARNING (Part {X.Y})
  TDD: RED → GREEN ({N} tests)
  File: {path} ({N} lines)
  Default: {default}, Hard Max: {hard_max}

  Warning: File exceeds default limit.

  [continue] [subdivide] [stop]
```

**⛔ STOP (over hard max or TDD failure):**

```markdown
⛔ Task {N.N} BLOCKED (Part {X.Y})

  Issue: {exceeds hard max | TDD failure | duplication}

  [subdivide] [justify] [retry] [stop]
```

### Step 5: Mark Progress

Only after verification:

1. Update tasks.md: `- [ ]` → `- [x]`
2. If flagged: `- [x] ⚠️ {N} lines (flagged)`
3. **Update Test Coverage** in tests.md:
   - `🔴 RED` → `✅ GREEN` for completed tests
4. Report result

### Step 6: Prep/Part Completion

**For prep mode completion:**

```markdown
═══════════════════════════════════════════
✓ Prep Complete: {CR-KEY}
═══════════════════════════════════════════

**Mode**: Preparatory Refactoring
**Tasks completed**: {N}/{N}

### Behavior Preservation
| Test File | Before | After |
|-----------|--------|-------|
| existing.test.ts | 12 GREEN | 12 GREEN |
| integration.test.ts | 8 GREEN | 8 GREEN |

**Regressions**: 0 ✅

### Size Summary (Refactored Files)
| File | Before | After | Target | Status |
|------|--------|-------|--------|---------|
| god-class.ts | 450 | 120 | 150 | ✅ OK |
| new-service.ts | — | 95 | 100 | ✅ OK |

═══════════════════════════════════════════

### Codebase Restructured — Ready for Feature Design

The refactoring is complete. Now design the feature against the NEW code structure.

**Next Steps**:
1. `/mdt:architecture {CR-KEY}` — design feature against restructured code
2. `/mdt:tests {CR-KEY} --part 1` — generate feature tests
3. Continue normal workflow...

Next: `/mdt:architecture {CR-KEY}`
```

**For part mode completion:**

At end of part:

```markdown
═══════════════════════════════════════════
✓ Part {X.Y} Complete: {CR-KEY}
═══════════════════════════════════════════

**Part**: {X.Y} - {Part Title}

### TDD Summary
| Test File | Before | After |
|-----------|--------|-------|
| validation.test.ts | 8 RED | 8 GREEN |
| migration.test.ts | 6 RED | 6 GREEN |

**Tests transitioned**: {N} RED → GREEN
**Regressions**: 0

### Size Summary
| File | Lines | Default | Status |
|------|-------|---------|--------|
| schema.ts | 142 | 150 | ✅ OK |
| validation.ts | 98 | 100 | ✅ OK |

### Flagged Files
{list any warnings}

═══════════════════════════════════════════

### Next Steps

**Other parts available**:
- Part 1.2: Enhanced Ticket Validation (0/8 tasks)
- Part 2: Additional Contracts (0/12 tasks)

**Commands**:
- `/mdt:tests {CR-KEY} --part 1.2` — generate next part tests
- `/mdt:tasks {CR-KEY} --part 1.2` — generate next part tasks
- `/mdt:implement {CR-KEY} --part 1.2` — implement next part
- `/mdt:tech-debt {CR-KEY}` — analyze debt (if all parts complete)

[continue to part 1.2] [stop]
```

### Step 7: Full Completion (All Parts)

When all parts are done:

```markdown
═══════════════════════════════════════════
Implementation Complete: {CR-KEY}
═══════════════════════════════════════════

### Part Summary
| Part | Tasks | Tests | Status |
|------|-------|-------|--------|
| 1.1 | 5/5 | 14 GREEN | ✅ Complete |
| 1.2 | 8/8 | 22 GREEN | ✅ Complete |
| 2 | 12/12 | 31 GREEN | ✅ Complete |

**Total**: 25 tasks, 67 tests GREEN

### Size Compliance
| Part | Files | Flagged | Over Hard Max |
|------|-------|---------|---------------|
| 1.1 | 4 | 0 | 0 |
| 1.2 | 5 | 1 | 0 |
| 2 | 8 | 0 | 0 |

### Next Steps
- [ ] Review flagged files
- [ ] `{test_command}` — verify all tests GREEN
- [ ] `/mdt:tech-debt {CR-KEY}`
- [ ] Commit changes
- [ ] Update CR status to Implemented
```

---

## Sub-Agent Context Template

```markdown
# Task Context: {CR-KEY} Part {X.Y}

## Project
- Source dir: {source_dir}
- Test command: {test_command}
- Extension: {ext}

## Part
- Part: {X.Y} - {Part Title}
- Test filter: `--testPathPattern="part-{X.Y}"`

## TDD
**Make these tests GREEN**:
- `validation.test.ts`: `accepts valid codes`
- `validation.test.ts`: `rejects lowercase`

**Pre-check**: `{test_command} --testPathPattern="part-{X.Y}"`

## Constraints
- Default: {N} lines
- Hard Max: {N×1.5} lines
- Shared imports: {list}

## Task
{task content}
```

---

## Error Handling

**Test/build failure:**

```markdown
✗ Verification failed (Part {X.Y})

{test_command} output:
{error output}

[retry] — Agent attempts fix (max 2 retries)
[manual] — You fix, then continue
[stop] — Halt orchestration
```

---

## Behavioral Rules

1. **Part isolation** — each part/prep has its own tasks.md and tests.md
2. **TDD verification** — feature: RED→GREEN; prep: GREEN→GREEN
3. **Three zones**: OK (≤default), FLAG (≤1.5x), STOP (>1.5x)
4. **FLAG completes task** — warning recorded
5. **STOP blocks task** — must resolve
6. **Duplication is STOP** — import instead
7. **Part 1 first** — shared utilities before features
8. **Build + test required** — both must pass
9. **Regression is STOP** — GREEN→RED halts immediately
10. **Part completion prompts next** — suggest next part when done

---

## Integration

**Position in workflow**:
```
Feature:     requirements → bdd → architecture → tests → tasks → implement
Refactoring: assess → bdd --prep → architecture → tests --prep → tasks → implement
```

**Before**:
- `/mdt:bdd` creates `bdd.md` + E2E tests (user-visible behavior)
- `/mdt:tests` creates `part-{X.Y}/tests.md` + module tests (from architecture)
- `/mdt:tasks` creates `part-{X.Y}/tasks.md`

**After**:
- `/mdt:tech-debt` catches anything that slipped through
- Or `/mdt:tests --part {next}` for next part

**Test Verification**:
- BDD tests (E2E): Verify user-visible behavior
- Module tests (unit/integration): Verify component behavior
- Both must go GREEN for feature completion

**Folder Structure**:
```
{TICKETS_PATH}/{CR-KEY}/
├── bdd.md                   # BDD acceptance scenarios
├── architecture.md          # Feature design (after prep)
├── prep/                    # Preparatory refactoring
│   ├── bdd.md              # Locked E2E behavior (GREEN)
│   ├── architecture.md     # Refactoring design
│   ├── tests.md            # Locked module behavior (GREEN)
│   └── tasks.md            # Refactoring tasks
├── part-1/                  # Feature part 1
│   ├── tests.md            # Module tests (RED → GREEN)
│   └── tasks.md            # Feature tasks
└── part-2/
    ├── tests.md
    └── tasks.md
```

Context: $ARGUMENTS
