# MDT Implementation Orchestrator (v3)

Execute tasks from a task list with constraint verification after each task.

**Core Principle**: Verify size (flag/STOP), structure, and no duplication after each task.

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
3. Load CR with `mdt-all:get_cr mode="full"` for Architecture Design
4. Find first incomplete task

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

**2c. Run verification:**
```bash
{build_command}   # must compile
{test_command}    # must pass
```

### Step 3: Verify Constraints

After each task, verify **before** marking complete:

**3a. Size check (three zones):**
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

**3b. Structure check:**
```bash
ls -la {expected_path}  # Must exist at correct location
```

**3c. Duplication check:**
```bash
# Check if task file duplicates logic that should be imported
# Example: validation patterns that should come from shared validators
grep -l "{pattern_that_should_be_shared}" {new_file}
# If found: warn about potential duplication
```

### Step 4: Handle Results

**✅ OK (under default):**
```markdown
✓ Task {N.N} complete
  File: {path} ({N} lines)
  Status: OK
```

**⚠️ FLAG (over default, under hard max):**
```markdown
⚠️ Task {N.N} complete with WARNING
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
3. Report result

### Step 6: Phase Boundary

At end of each phase:

```markdown
═══════════════════════════════════════════
✓ Phase {N} Complete
═══════════════════════════════════════════

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

### Size Summary
| File | Lines | Default | Hard Max | Status |
|------|-------|---------|----------|--------|
| {path} | {N} | {N} | {N} | ✅/⚠️ |

### Warnings
{list any flagged files that exceeded default}

### Final Check
```bash
# Files over hard max (should be none)
find {source_dir} -name "*{ext}" -exec wc -l {} \; | awk '$1 > {HARD_MAX}'
```

### Next Steps
- [ ] Review flagged files — can they be improved?
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
1. Check: `wc -l {file}` — report line count
2. Check: imports from shared modules, no duplication
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

1. **Three zones**: OK (≤default), FLAG (default to 1.5x), STOP (>1.5x)
2. **FLAG completes task** — but warning recorded
3. **STOP blocks task** — cannot mark complete
4. **Duplication is STOP** — as bad as size violation
5. **Phase 1 first** — shared utilities must exist before features
6. **Build + test required** — both must pass

## Integration

**Before**: `/mdt:tasks` generated task list with limits
**After**: `/mdt:tech-debt` catches anything that slipped through

Context: $ARGUMENTS
