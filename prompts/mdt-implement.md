# MDT Implementation Orchestrator (v2)

Execute tasks from a task list with structural verification after each task.

**Core Principle**: Verify constraints (size, structure) after each task, not just tests. STOP if constraints violated.

## User Input

```text
$ARGUMENTS
```

## Execution Modes

| Command | Behavior |
|---------|----------|
| `/mdt-implement {CR-KEY}` | Interactive — verify and ask after each task |
| `/mdt-implement {CR-KEY} --all` | Run all, pause at phase boundaries |
| `/mdt-implement {CR-KEY} --continue` | Resume from last incomplete task |
| `/mdt-implement {CR-KEY} --task {N.N}` | Run specific task only |

## Execution Steps

### Step 1: Load Context

1. Load `docs/CRs/{CR-KEY}/tasks.md` — abort if missing
2. Load CR with `mdt-all:get_cr mode="full"`
3. Extract:
   - **Global Constraints** from tasks.md header (max file size)
   - **Architecture Structure** from CR
   - **STOP Condition** from tasks.md
4. Find first incomplete task (not marked `[x]`)

### Step 2: Execute Task

For each task:

**2a. Show task with constraints:**
```markdown
## Task {N.N}: {Title}

**Limits**: Target < {N} lines, Source -{N} lines
**Structure**: `{path from CR}`

{task content}

[run] [skip] [stop]
```

**2b. Execute:**
Pass to sub-agent with constraint context:
```
CONSTRAINTS (from CR):
- Max file size: {N} lines
- Target path must be: {exact path}
- Do NOT include: {Exclude items}

STOP IF: New file would exceed {N} lines. Report and wait for subdivision.

TASK:
{task content}
```

**2c. Run tests:**
```bash
npm test
npm run build
```

### Step 3: Verify Constraints (CRITICAL)

After each task, verify **before** marking complete:

**3a. Size check:**
```bash
# Check all files modified/created by this task
for file in {files from task}; do
  lines=$(wc -l < "$file" 2>/dev/null || echo "0")
  max={limit from task}
  if [ "$lines" -gt "$max" ]; then
    echo "FAIL: $file has $lines lines (max $max)"
  fi
done
```

**3b. Structure check:**
```bash
# Verify file exists at exact path from task Structure field
ls -la {Structure path from task}
```

**3c. Handle violations:**

If size exceeded:
```markdown
⛔ CONSTRAINT VIOLATION

`{file}` has {N} lines (limit: {max})

Options:
- [subdivide] — Break this task into smaller extractions
- [adjust] — Increase limit if justified (update CR)
- [stop] — Halt and investigate
```

Do NOT mark task complete if constraints violated.

### Step 4: Mark Progress

Only after all verifications pass:

1. Update tasks.md: `- [ ]` → `- [x]`
2. Report:
```markdown
✓ Task {N.N} complete
  Created: {files} ({lines} lines each)
  Modified: {files}
  Tests: passing
  Constraints: verified
```

### Step 5: Phase Boundary

At end of each phase:

```markdown
═══════════════════════════════════════════
✓ Phase {N} Complete
═══════════════════════════════════════════

**Structure verification**:
```bash
find src/{area} -name "*.ts" -exec wc -l {} \; | sort -n
```

**Files created**: {list with line counts}
**Largest file**: {name} ({N} lines) — {OK|WARN if near limit}

[continue to Phase {N+1}] [review] [stop]
```

### Step 6: Completion

```markdown
═══════════════════════════════════════════
Implementation Complete: {CR-KEY}
═══════════════════════════════════════════

### Final Structure Check
```bash
find src/ -name "*.ts" -exec wc -l {} \; | awk '$1 > {MAX}'
```
{output — should be empty}

### Summary
| Metric | Before | After | Target |
|--------|--------|-------|--------|
| {source file} | {N} lines | {N} lines | <{N} |
| ... | ... | ... | ... |

### Next Steps
- [ ] Review git diff
- [ ] Run full test suite  
- [ ] Commit changes
- [ ] Run `/mdt-tech-debt {CR-KEY}`
```

## Sub-Agent Context Template

When delegating task to sub-agent, include:

```markdown
# Task Context

## Constraints (MUST follow)
- **Max file size**: {N} lines — STOP if exceeded
- **Target structure**: `{exact path}`
- **Exclude from extraction**: {list from task}

## Architecture Reference
```
{Structure diagram from CR}
```

## Task
{task content from tasks.md}

## Verification (run after)
```bash
wc -l {target file}  # must be < {limit}
npm test             # must pass
```

## STOP Conditions
- If target file would exceed {N} lines → STOP, report, request subdivision
- If unsure what to exclude → STOP, ask for clarification
- If tests fail after 2 retries → STOP, report failure
```

## Error Handling

**Test failure:**
```markdown
✗ Tests failed

{error output}

[retry] — Agent attempts fix (max 2 retries)
[manual] — You fix, then continue
[stop] — Halt orchestration
```

**Constraint violation:**
```markdown
⛔ Size limit exceeded: {file} has {N} lines (max {limit})

This task cannot be marked complete.

[subdivide] — Break into smaller tasks
[adjust-limit] — Update CR if larger file justified
[stop] — Investigate
```

## Behavioral Rules

1. **Never skip constraint verification** — it's the whole point
2. **Pass constraints to sub-agent** — they execute literally
3. **STOP on violations** — don't accumulate problems
4. **Size check uses actual file** — not estimate
5. **Phase boundaries are mandatory pauses** — even with `--all`

## Quality Gate

Before marking any task complete, verify:
- [ ] Tests pass
- [ ] Build passes
- [ ] Target file(s) under size limit
- [ ] File(s) at correct structure path
- [ ] Source file reduced (for extractions)

Context: $ARGUMENTS
