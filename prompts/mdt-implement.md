# MDT Implementation Orchestrator (v5)

Execute tasks from a task list with constraint verification after each task.

**Core Principle**: Verify TDD (RED→GREEN), size (flag/STOP), structure, and no duplication after each task.

## User Input

```text
$ARGUMENTS
```

## Execution Modes

| Command | Behavior |
|---------|----------|
| `/mdt:implement {CR-KEY}` | Interactive — auto-detect phase or prompt |
| `/mdt:implement {CR-KEY} --phase {X.Y}` | Target specific phase |
| `/mdt:implement {CR-KEY} --all` | Run all tasks, pause at phase boundaries |
| `/mdt:implement {CR-KEY} --continue` | Resume from last incomplete |
| `/mdt:implement {CR-KEY} --task {N.N}` | Run specific task only |

## Execution Steps

### Step 1: Load Context and Discover Phase

**1a. Discover phase context:**

```bash
# Check for phase-specific tasks
phase_tasks=$(find docs/CRs/{CR-KEY} -path "*/phase-*/tasks.md" 2>/dev/null | sort -V)

if [ -n "$phase_tasks" ]; then
  echo "Found phase-specific tasks:"
  for f in $phase_tasks; do
    phase=$(echo "$f" | grep -oE "phase-[0-9.]+")
    # Check completion status
    total=$(grep -c "^### Task" "$f" 2>/dev/null || echo 0)
    done=$(grep -c "^\- \[x\]" "$f" 2>/dev/null || echo 0)
    echo "  - $phase/tasks.md ($done/$total complete)"
  done
fi
```

**1b. Determine phase:**

| Scenario | Behavior |
|----------|----------|
| `--phase 1.1` flag provided | Use specified phase |
| Single `phase-*/tasks.md` exists | Use that phase automatically |
| Multiple `phase-*/tasks.md` exist | Prompt for selection |
| No phase folders, `tasks.md` at root | Non-phased mode |

```markdown
# If multiple phases exist:
Found phases:
  - phase-1.1/tasks.md (0/5 complete)
  - phase-1.2/tasks.md (0/8 complete)

Which phase to implement? [1.1]: _
```

**1c. Set paths:**

```yaml
# Phased
phase: "1.1"
tasks_file: "docs/CRs/{CR-KEY}/phase-1.1/tasks.md"
tests_file: "docs/CRs/{CR-KEY}/phase-1.1/tests.md"

# Non-phased (backward compatible)
phase: null
tasks_file: "docs/CRs/{CR-KEY}/tasks.md"
tests_file: "docs/CRs/{CR-KEY}/tests.md"
```

**1d. Load tasks.md:**

Extract from header:
- **Project Context** (source_dir, test_command, ext)
- **Size Thresholds** (default, hard max per module)
- **Shared Patterns** (what should be imported)
- **Test Coverage** table (test→task mapping)

**1e. Load tests.md (if exists):**

- Extract test file locations
- Extract requirement→test mapping
- Enable TDD verification mode

**1f. Load CR for Architecture Design:**
```
mdt-all:get_cr mode="full"
```

If phased, extract only the relevant phase section.

**1g. Find first incomplete task:**

```bash
# Find first unchecked task
first_incomplete=$(grep -n "^\- \[ \]" "$tasks_file" | head -1)
```

### Step 2: Execute Task

**2a. Show task with phase context:**

```markdown
═══════════════════════════════════════════
{CR-KEY} Phase {X.Y} — Task {N.N}
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
{test_command} --testPathPattern="phase-{X.Y}" 2>&1 | tee /tmp/pre-test.log

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

## Phase Context
- Phase: {X.Y} - {Phase Title}
- Tests: `phase-{X.Y}/tests.md`
- Test filter: `--testPathPattern="phase-{X.Y}"`

## TDD Context
**Tests to make GREEN**:
- `{test_file}`: `{test_name}` — {requirement}
- `{test_file}`: `{test_name}` — {requirement}

**Run before starting**: 
```bash
{test_command} --testPathPattern="phase-{X.Y}"
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
1. `{test_command} --testPathPattern="phase-{X.Y}"` — task tests GREEN
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
{test_command} --testPathPattern="phase-{X.Y}"
```

| Pre-Task | Post-Task | Verdict |
|----------|-----------|---------|  
| RED | GREEN | ✅ TDD satisfied |
| RED | RED | ⛔ Implementation incomplete |
| GREEN | GREEN | ⚠️ Tests were already passing |
| GREEN | RED | ⛔ REGRESSION |

**TDD Failure Handling**:

```markdown
⛔ TDD VERIFICATION FAILED — Phase {X.Y} Task {N.N}

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
✓ Task {N.N} complete (Phase {X.Y})
  TDD: RED → GREEN ({N} tests)
  File: {path} ({N} lines)
  Status: OK
```

**⚠️ FLAG (over default, under hard max):**

```markdown
⚠️ Task {N.N} complete with WARNING (Phase {X.Y})
  TDD: RED → GREEN ({N} tests)
  File: {path} ({N} lines)
  Default: {default}, Hard Max: {hard_max}
  
  Warning: File exceeds default limit.
  
  [continue] [subdivide] [stop]
```

**⛔ STOP (over hard max or TDD failure):**

```markdown
⛔ Task {N.N} BLOCKED (Phase {X.Y})

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

### Step 6: Phase Completion

At end of phase:

```markdown
═══════════════════════════════════════════
✓ Phase {X.Y} Complete: {CR-KEY}
═══════════════════════════════════════════

**Phase**: {X.Y} - {Phase Title}

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

**Other phases available**:
- Phase 1.2: Enhanced Ticket Validation (0/8 tasks)
- Phase 2: Additional Contracts (0/12 tasks)

**Commands**:
- `/mdt:tests {CR-KEY} --phase 1.2` — generate next phase tests
- `/mdt:tasks {CR-KEY} --phase 1.2` — generate next phase tasks
- `/mdt:implement {CR-KEY} --phase 1.2` — implement next phase
- `/mdt:tech-debt {CR-KEY}` — analyze debt (if all phases complete)

[continue to phase 1.2] [stop]
```

### Step 7: Full Completion (All Phases)

When all phases are done:

```markdown
═══════════════════════════════════════════
Implementation Complete: {CR-KEY}
═══════════════════════════════════════════

### Phase Summary
| Phase | Tasks | Tests | Status |
|-------|-------|-------|--------|
| 1.1 | 5/5 | 14 GREEN | ✅ Complete |
| 1.2 | 8/8 | 22 GREEN | ✅ Complete |
| 2 | 12/12 | 31 GREEN | ✅ Complete |

**Total**: 25 tasks, 67 tests GREEN

### Size Compliance
| Phase | Files | Flagged | Over Hard Max |
|-------|-------|---------|---------------|
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
# Task Context: {CR-KEY} Phase {X.Y}

## Project
- Source dir: {source_dir}
- Test command: {test_command}
- Extension: {ext}

## Phase
- Phase: {X.Y} - {Phase Title}
- Test filter: `--testPathPattern="phase-{X.Y}"`

## TDD
**Make these tests GREEN**:
- `validation.test.ts`: `accepts valid codes`
- `validation.test.ts`: `rejects lowercase`

**Pre-check**: `{test_command} --testPathPattern="phase-{X.Y}"`

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
✗ Verification failed (Phase {X.Y})

{test_command} output:
{error output}

[retry] — Agent attempts fix (max 2 retries)
[manual] — You fix, then continue
[stop] — Halt orchestration
```

---

## Behavioral Rules

1. **Phase isolation** — each phase has its own tasks.md and tests.md
2. **TDD verification** — if tests.md exists, verify RED→GREEN
3. **Three zones**: OK (≤default), FLAG (≤1.5x), STOP (>1.5x)
4. **FLAG completes task** — warning recorded
5. **STOP blocks task** — must resolve
6. **Duplication is STOP** — import instead
7. **Phase 1 first** — shared utilities before features
8. **Build + test required** — both must pass
9. **Regression is STOP** — GREEN→RED halts immediately
10. **Phase completion prompts next** — suggest next phase when done

---

## Integration

**Before**: 
- `/mdt:tests` creates `phase-{X.Y}/tests.md`
- `/mdt:tasks` creates `phase-{X.Y}/tasks.md`

**After**: 
- `/mdt:tech-debt` catches anything that slipped through
- Or `/mdt:tests --phase {next}` for next phase

**Folder Structure**:
```
docs/CRs/{CR-KEY}/
├── architecture.md          # All phases
├── phase-1.1/
│   ├── tests.md            # Phase 1.1 tests
│   └── tasks.md            # Phase 1.1 tasks
├── phase-1.2/
│   ├── tests.md
│   └── tasks.md
└── phase-2/
    ├── tests.md
    └── tasks.md
```

Context: $ARGUMENTS
