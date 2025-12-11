# MDT Implementation Orchestrator (v4)

Execute tasks from a task list with constraint verification after each task.

**Core Principle**: Verify TDD (RED→GREEN), size (flag/STOP), structure, and no duplication after each task.

## User Input

```text
$ARGUMENTS
```

## Execution Modes

| Command | Behavior |
|---------|----------|
| `/mdt:implement {CR-KEY}` | Interactive — verify and ask after each task |
| `/mdt:implement {CR-KEY} --all` | Run all, pause at phase boundaries |
| `/mdt:implement {CR-KEY} --continue` | Resume from last incomplete |
| `/mdt:implement {CR-KEY} --task {N.N}` | Run specific task only |

## Execution Steps

### Step 1: Load Context

1. Load `docs/CRs/{CR-KEY}/tasks.md` — abort if missing
2. Extract from tasks.md header:
   - **Project Context** (source_dir, test_command, ext)
   - **Size Thresholds** (default, hard max per role)
   - **Shared Patterns** (what should be imported, not duplicated)
   - **Requirement Coverage** table (if exists)
3. Load CR with `mdt-all:get_cr mode="full"` for Architecture Design
4. **Load requirements if exists**: Check `docs/CRs/{CR-KEY}/requirements.md`
   - If found: track which requirements each task implements
   - After task completion, mark requirements as satisfied
5. **Load tests if exists**: Check `docs/CRs/{CR-KEY}/tests.md`
   - If found: enable TDD verification mode
   - Extract test file locations and requirement→test mapping
   - Track which tests should go RED→GREEN per task
6. Find first incomplete task

### Step 2: Execute Task

**2a. Show task:**
```markdown
## Task {N.N}: {Title}

**Limits**: Default {N}, Hard Max {N×1.5}
**Structure**: `{path}`
**Anti-duplication**: Import from {shared modules}

{task content}

[run] [skip] [stop]
```

**2b. Pass to sub-agent with context:**
```markdown
# Constraints

## Size
- Default limit: {N} lines
- Hard max: {N×1.5} lines
- If > default but ≤ hard max: complete but FLAG
- If > hard max: STOP, cannot proceed

## Anti-duplication
- These utilities exist: {list from Phase 1}
- IMPORT from them, do NOT copy logic
- If you find yourself writing similar code: STOP, import instead

## Task
{task content}
```

**2c. TDD Pre-check** (if tests.md exists):
```bash
# Record which tests are currently RED for this task's requirements
{test_command} --filter="{task_test_filter}" 2>&1 | tee /tmp/pre-test.log
# Expected: tests for this task's requirements should FAIL
```

If tests already pass before implementation → investigate:
- Is there existing code that satisfies this?
- Was this task already partially done?
- Are tests too loose?

**2d. Run verification:**
```bash
{build_command}   # must compile
{test_command}    # must pass
```

### Step 3: Verify Constraints

After each task, verify **before** marking complete:

**3a. TDD check** (if tests.md exists):
```bash
# Run tests for this task's requirements
{test_command} --filter="{task_test_filter}"
```

| Pre-Task | Post-Task | Verdict |
|----------|-----------|---------|  
| RED | GREEN | ✅ TDD satisfied |
| RED | RED | ⛔ Implementation incomplete |
| GREEN | GREEN | ⚠️ Tests were already passing (investigate) |
| GREEN | RED | ⛔ REGRESSION — broke something |

**TDD Failure Handling**:
```markdown
⛔ TDD VERIFICATION FAILED

Task {N.N} did not satisfy TDD requirements.

**Expected GREEN**:
- `{test_name}` — still RED
- `{test_name}` — still RED

**Regression** (was GREEN, now RED):
- `{test_name}` — BROKEN

[retry] — Agent attempts fix (max 2 retries)
[investigate] — Review test expectations vs implementation
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
  echo "⚠️ FLAG: $lines lines (exceeds default $default, under hard max $hard_max)"
  # Task completes but warning recorded
else
  echo "⛔ STOP: $lines lines (exceeds hard max $hard_max)"
  # Task cannot complete
fi
```

**3c. Structure check:**
```bash
ls -la {expected_path}  # Must exist at correct location
```

**3d. Duplication check:**
```bash
# Check if task file duplicates logic that should be imported
# Example: validation patterns that should come from shared validators
grep -l "{pattern_that_should_be_shared}" {new_file}
# If found: warn about potential duplication
```

### Step 4: Handle Results

**✅ OK (TDD satisfied, under default):**
```markdown
✓ Task {N.N} complete
  TDD: RED → GREEN ({N} tests)
  File: {path} ({N} lines)
  Status: OK
```

**⚠️ FLAG (over default, under hard max):**
```markdown
⚠️ Task {N.N} complete with WARNING
  TDD: RED → GREEN ({N} tests)
  File: {path} ({N} lines)
  Default: {default}, Hard Max: {hard_max}
  
  Warning: File exceeds default limit.
  Consider: Can this be subdivided? Is there logic to extract?
  
  [continue] [subdivide] [stop]
```
Task IS complete, but warning recorded for review.

**⛔ STOP (over hard max):**
```markdown
⛔ Task {N.N} BLOCKED — exceeds hard max

  File: {path} ({N} lines)
  Hard Max: {hard_max}
  
  This task cannot be marked complete.
  
  Options:
  [subdivide] — Break into smaller extractions
  [justify] — Add justification to CR, increase limit
  [stop] — Halt and investigate
```
Task is NOT complete. Cannot proceed without resolution.

**⛔ STOP (duplication detected):**
```markdown
⛔ Task {N.N} BLOCKED — duplication detected

  File: {path}
  Issue: Contains {pattern} which exists in {shared_module}
  
  Options:
  [fix] — Remove duplicate, import from shared
  [stop] — Halt and investigate
```

### Step 5: Mark Progress

Only after verification:

1. Update tasks.md: `- [ ]` → `- [x]`
2. If flagged, add note: `- [x] ⚠️ {N} lines (flagged)`
3. **Update Test Coverage** (if tests.md exists):
   - Find tests this task made GREEN
   - Update status in tests.md: `🔴 RED` → `✅ GREEN`
4. **Update Requirement Coverage** (if requirements.md exists):
   - Find requirements this task implements (from task's `**Implements**` field)
   - Update status: `⬜ Pending` → `✅ Satisfied`
5. Report result

### Step 6: Phase Boundary

At end of each phase:

```markdown
═══════════════════════════════════════════
✓ Phase {N} Complete
═══════════════════════════════════════════

**TDD summary** (if tests.md exists):
| Test File | Before Phase | After Phase |
|-----------|--------------|-------------|
| {test_path} | {N} RED | {N} GREEN |

**Size summary**:
| File | Lines | Limit | Status |
|------|-------|-------|--------|
| {path} | {N} | {default} | ✅/⚠️ |

**Flagged files**: {list any warnings}
**Shared utilities available**: {list for next phase}

[continue] [review] [stop]
```

### Step 7: Completion

```markdown
═══════════════════════════════════════════
Implementation Complete: {CR-KEY}
═══════════════════════════════════════════

### TDD Summary

*(Include if tests.md exists)*

| Test File | Initial | Final | Status |
|-----------|---------|-------|--------|
| {test_path} | {N} RED | {N} GREEN | ✅ All passed |

**Tests transitioned**: {N} RED → GREEN
**Regressions**: 0 (no GREEN → RED)

### Size Summary
| File | Lines | Default | Hard Max | Status |
|------|-------|---------|----------|--------|
| {path} | {N} | {N} | {N} | ✅/⚠️ |

### Warnings
{list any flagged files that exceeded default}

### Requirement Satisfaction

*(Include ONLY if requirements.md exists)*

| Requirement | Status | Implementing Task |
|-------------|--------|-------------------|
| R1.1 | ✅ Satisfied | Task 2.1 |
| R1.2 | ✅ Satisfied | Task 2.1, 2.3 |
| R2.1 | ✅ Satisfied | Task 3.1 |

**Coverage**: {N}/{M} requirements satisfied ({percentage}%)

### Final Check
```bash
# Files over hard max (should be none)
find {source_dir} -name "*{ext}" -exec wc -l {} \; | awk '$1 > {HARD_MAX}'
```

### Next Steps
- [ ] Review flagged files — can they be improved?
- [ ] Verify all tests GREEN: `{test_command}`
- [ ] Run `/mdt:tech-debt {CR-KEY}`
- [ ] Commit changes
```

## Sub-Agent Context Template

```markdown
# Task Context

## Project
- Source dir: {source_dir}
- Test command: {test_command}
- Extension: {ext}

## TDD Context (if tests.md exists)
**Tests to make GREEN**:
- `{test_file}`: `{test_name}` — {what it tests}
- `{test_file}`: `{test_name}` — {what it tests}

**Run before starting**: `{test_command} --filter={filter}`
- Confirm these tests are RED

**Success criteria**: These specific tests pass after implementation.

## Size Constraints
- Default: {N} lines → aim for this
- Hard Max: {N×1.5} lines → STOP if exceeded
- If between default and hard max → complete with FLAG

## Anti-Duplication
Shared utilities exist (import, don't copy):
- `{path}` — {what it provides}
- `{path}` — {what it provides}

If writing code similar to these → STOP, import instead.

## Task
{task content}

## After Completion
1. Check: `{test_command}` — tests for this task should now pass
2. Check: `wc -l {file}` — report line count
3. Check: imports from shared modules, no duplication
```

## Error Handling

**Test/build failure:**
```markdown
✗ Verification failed: {test_command} or {build_command}

[retry] — Agent attempts fix (max 2 retries)
[manual] — You fix, then continue  
[stop] — Halt orchestration
```

## Behavioral Rules

1. **TDD verification** — if tests.md exists, verify RED→GREEN per task
2. **Three zones**: OK (≤default), FLAG (default to 1.5x), STOP (>1.5x)
3. **FLAG completes task** — but warning recorded
4. **STOP blocks task** — cannot mark complete
5. **Duplication is STOP** — as bad as size violation
6. **Phase 1 first** — shared utilities must exist before features
7. **Build + test required** — both must pass
8. **Regression is STOP** — if previously GREEN test becomes RED, halt immediately

## Integration

**Before**: `/mdt:tasks` generated task list with limits (and `/mdt:tests` if TDD enabled)
**After**: `/mdt:tech-debt` catches anything that slipped through

**TDD Flow** (when tests.md exists):
```
/mdt:tests → creates failing tests
/mdt:tasks → maps tasks to tests  
/mdt:implement → verifies RED→GREEN per task
```

Context: $ARGUMENTS
