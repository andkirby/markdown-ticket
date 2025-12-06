# MDT Task Breakdown Workflow (v3)

Generate a task list from a CR ticket for phased, reviewable implementation.

**Core Principle**: Tasks must include **constraints** (size limits, exclusions, anti-duplication) not just actions.

## User Input

```text
$ARGUMENTS
```

## Output Location

`docs/CRs/{CR-KEY}/tasks.md`

## Critical Rules

1. **Shared utilities FIRST** — Phase 1 extracts patterns used by multiple features
2. **Size limits inherited** — from Architecture Design, flag/STOP thresholds
3. **Exclusions prevent bloat** — explicitly state what NOT to move
4. **Anti-duplication** — import from shared, never copy

## Execution Steps

### Step 1: Extract Project Context

Detect from CLAUDE.md or project config files (package.json, Cargo.toml, go.mod, pyproject.toml, Makefile, etc.):

```yaml
project:
  source_dir: {src/, lib/, app/, ...}
  test_command: {npm test, pytest, cargo test, go test, make test, ...}
  build_command: {npm run build, cargo build, go build, make, ...}
  file_extension: {.ts, .py, .rs, .go, .java, ...}
```

### Step 2: Load CR Context

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist
2. Extract:
   - **Architecture Design** — REQUIRED for refactoring
     - Shared Patterns (extract first)
     - Structure (file paths)
     - Size Guidance (limits per module)
   - **Acceptance Criteria** — any overrides
3. **Load requirements if exists**: Check `docs/CRs/{CR-KEY}/requirements.md`
   - If found: extract requirement IDs for task mapping
   - Each task will reference which requirements it implements
4. If Architecture Design missing: abort with "Run `/mdt:architecture` first"

### Step 3: Inherit Size Limits

From Architecture Design `Size Guidance`:

```markdown
| Module | Default | Hard Max | Action if exceeded |
|--------|---------|----------|-------------------|
| `{path}` | {N} | {N×1.5} | Flag / STOP |
```

These become task `Limits`.

### Step 4: Determine Task Order

**Phase 1**: Shared patterns (from Architecture Design)
**Phase 2+**: Features that import from Phase 1

```
Phase 1: Shared Utilities
  Task 1.1: Extract validators (used by all commands)
  Task 1.2: Extract formatters (used by all commands)
  Task 1.3: Extract error handler (used everywhere)

Phase 2: Features
  Task 2.1: Extract command-a (imports from Phase 1)
  Task 2.2: Extract command-b (imports from Phase 1)
```

### Step 5: Task Template

```markdown
### Task {phase}.{number}: {Brief description}

**Structure**: `{exact path from Architecture Design}`

**Implements**: {R1.1, R1.2, ...} *(if requirements.md exists)*

**Limits**:
- Default: {N} lines
- Hard Max: {N×1.5} lines
- If > Default: ⚠️ flag warning
- If > Hard Max: ⛔ STOP

**From**: `{source file}`
**To**: `{destination file}`

**Move**:
- {specific function/class 1}
- {specific function/class 2}

**Exclude** (stays in source or goes elsewhere):
- {what NOT to move}

**Anti-duplication**:
- Import `{shared utility}` from `{path}` — do NOT copy logic
- If similar code exists in `{other file}` — refactor to shared, don't duplicate

**Verify**:
```bash
wc -l {destination}       # check against limits
{test_command}
{build_command}
```

**Done when**:
- [ ] File at correct path
- [ ] Size ≤ default (or flagged if ≤ hard max)
- [ ] No duplicated logic — uses shared imports
- [ ] Tests pass
```

### Step 6: Generate Tasks Document

```markdown
# Tasks: {CR-KEY}

**Source**: [{CR-KEY}]({path to CR})

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `{source_dir}` |
| Test command | `{test_command}` |
| Build command | `{build_command}` |
| File extension | `{ext}` |

## Size Thresholds

| Role | Default | Hard Max | Action |
|------|---------|----------|--------|
| Orchestration | 100 | 150 | Flag at 100+, STOP at 150+ |
| Feature | 200 | 300 | Flag at 200+, STOP at 300+ |
| Utility | 75 | 110 | Flag at 75+, STOP at 110+ |

*(Inherited from Architecture Design, overridden by CR if specified)*

## Shared Patterns (from Architecture Design)

| Pattern | Extract To | Used By |
|---------|------------|---------|
| {pattern} | `{path}` | {consumers} |

> Phase 1 extracts these BEFORE features.

## Architecture Structure (from CR)

```
{paste Structure diagram from Architecture Design}
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

## Requirement Coverage

*(Include ONLY if requirements.md exists)*

| Requirement | Task(s) | Status |
|-------------|---------|--------|
| R1.1 | Task 2.1 | ⬜ Pending |
| R1.2 | Task 2.1, 2.3 | ⬜ Pending |
| R2.1 | Task 3.1 | ⬜ Pending |

**Coverage**: {N}/{M} requirements have implementing tasks

---

## Phase 1: Shared Utilities

> Extract patterns used by multiple features FIRST.

**Phase goal**: All shared utilities exist
**Phase verify**: `{test_command}` passes, utilities importable

### Task 1.1: {Shared pattern}
...

---

## Phase 2: Feature Extraction

> Features import from Phase 1, never duplicate.

**Phase goal**: Features extracted, source reduced
**Phase verify**: Source files ≤ limits, `{test_command}` passes

### Task 2.1: {Feature}
...

---

## Post-Implementation

### Task N.1: Verify no duplication

**Do**: Search for duplicated patterns
```bash
# Example: find similar function names across files
grep -r "validateInput\|formatOutput\|handleError" {source_dir} | cut -d: -f1 | sort | uniq -c | sort -rn
```
**Done when**: [ ] Each pattern exists in ONE location only

### Task N.2: Verify size compliance

**Do**: Check all files
```bash
find {source_dir} -name "*{ext}" -exec wc -l {} \; | awk '$1 > {HARD_MAX}'
```
**Done when**: [ ] No files exceed hard max

### Task N.3: Update project documentation

**Do**: Update CLAUDE.md (or equivalent) with new file structure

### Task N.4: Run `/mdt:tech-debt {CR-KEY}`
```

### Step 7: Validate Before Saving

- [ ] Project context includes all settings (source_dir, test, build, ext)
- [ ] Phase 1 contains shared patterns from Architecture Design
- [ ] Every task has `Limits` (default + hard max)
- [ ] Every task has `Exclude` section
- [ ] Every task has `Anti-duplication` section
- [ ] Features (Phase 2+) import from shared (Phase 1)
- [ ] Architecture Structure included for reference
- [ ] `Verify` uses project's test and build commands
- [ ] **Requirement coverage** (if requirements.md exists):
  - Every requirement has at least one implementing task
  - Flag orphans: "R1.3 has no implementing task"
  - Requirement Coverage table populated

### Step 8: Save and Report

Save to `docs/CRs/{CR-KEY}/tasks.md`

```markdown
## Tasks Generated: {CR-KEY}

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | {N} | Shared utilities |
| 2 | {N} | Feature extraction |
| Post | 4 | Verification |

**Size thresholds**: Flag at default, STOP at 1.5x
**Shared patterns**: {N} (extract in Phase 1)

Next: `/mdt:implement {CR-KEY}`
```

## Task Examples

### Complete task example (refactoring)

```markdown
### Task 1.1: Extract input validators

**Structure**: `{source_dir}/cli/validators/input-validators{ext}`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: `{source_dir}/cli/index{ext}`
**To**: `{source_dir}/cli/validators/input-validators{ext}`

**Move**:
- `validateUrl()` function
- `validateFilePath()` function
- `validateNumericOption()` function
- Related type definitions

**Exclude**:
- Command-specific validation (goes with each command in Phase 2)
- Output formatting (separate task 1.2)
- Error handling (separate task 1.3)

**Anti-duplication**:
- This IS the shared validator — other tasks will import from here
- If similar validation exists elsewhere, consolidate HERE

**Verify**:
```bash
wc -l {source_dir}/cli/validators/input-validators{ext}  # ≤ 75 (or flag ≤ 110)
{test_command}
{build_command}
```

**Done when**:
- [ ] File at `{source_dir}/cli/validators/input-validators{ext}`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] All validation logic consolidated here
- [ ] Tests pass
```

### Anti-duplication example (Phase 2 task)

```markdown
### Task 2.1: Extract summarize command

**Anti-duplication**:
- Import `validateUrl` from `validators/input-validators` — exists from Task 1.1
- Import `formatError` from `formatters/output-formatters` — exists from Task 1.2
- Import `handleCommandError` from `utils/error-handler` — exists from Task 1.3
- Do NOT implement validation/formatting/error-handling in this file
```

### Bad task (what failed in SUML-009)

```markdown
### Task 3: Summarize Command Module
**Description:** Extract summarize command logic into dedicated module
**Deliverables:**
- `src/cli/commands/summarize-command.ts` with complete functionality
```

Problems:
- No size limits → resulted in 745-line file
- No exclusions → moved everything including shared logic
- No anti-duplication → copied validation into every command
- "Complete functionality" is unbounded

## Integration

**Before**: `/mdt:architecture` (required — provides shared patterns + size limits)
**After**: `/mdt:implement {CR-KEY}`

Context: $ARGUMENTS
