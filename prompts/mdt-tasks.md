# MDT Task Breakdown Workflow (v5)

Generate a task list from a CR ticket for phased, reviewable implementation.

**Core Principle**: Tasks must include **constraints** (size limits, exclusions, anti-duplication) not just actions.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output Location

- **Phased CR**: `{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}/tasks.md`
- **Non-phased CR**: `{TICKETS_PATH}/{CR-KEY}/tasks.md`

## Critical Rules

1. **Shared utilities FIRST** — Phase 1 extracts patterns used by multiple features
2. **Size limits inherited** — from Architecture Design, flag/STOP thresholds
3. **Exclusions prevent bloat** — explicitly state what NOT to move
4. **Anti-duplication** — import from shared, never copy
5. **Co-locate with tests** — tasks.md goes in same folder as tests.md

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

### Step 2: Load CR Context and Discover Phase

**2a. Load CR:**
```
mdt-all:get_cr mode="full"
```

**2b. Discover phase context:**

```bash
# Check for phase-specific tests first (co-location pattern)
phase_tests=$(find {TICKETS_PATH}/{CR-KEY} -path "*/phase-*/tests.md" 2>/dev/null | sort -V)

if [ -n "$phase_tests" ]; then
  # Phased CR - list available phases with tests
  echo "Found phase-specific tests:"
  for f in $phase_tests; do
    phase=$(echo "$f" | grep -oE "phase-[0-9.]+")
    echo "  - $phase/tests.md"
  done
fi
```

**2c. Determine phase and output path:**

| Scenario | Behavior |
|----------|----------|
| `--phase 1.1` flag provided | Use specified phase |
| Single `phase-*/tests.md` exists | Use that phase automatically |
| Multiple `phase-*/tests.md` exist | Prompt for selection |
| No phase folders exist | Non-phased mode (backward compatible) |

```markdown
# If multiple phases with tests exist:
Found phases with tests:
  - phase-1.1/tests.md
  - phase-1.2/tests.md

Which phase to generate tasks for? [1.1]: _
```

**2d. Set paths:**

```yaml
# Phased
phase: "1.1"
tests_file: "{TICKETS_PATH}/{CR-KEY}/phase-1.1/tests.md"
output_file: "{TICKETS_PATH}/{CR-KEY}/phase-1.1/tasks.md"

# Non-phased (backward compatible)
phase: null
tests_file: "{TICKETS_PATH}/{CR-KEY}/tests.md"
output_file: "{TICKETS_PATH}/{CR-KEY}/tasks.md"
```

**2e. Load phase-specific architecture:**

If phased, extract from `architecture.md`:
- Only the selected phase section
- Phase-specific Structure
- Phase-specific Size Guidance
- Phase-specific patterns

```markdown
## From architecture.md → Phase 1.1:

### Enhanced Structure
domain-contracts/src/project/
├── schema.ts              → 150 lines
├── validation.ts          → 100 lines
├── migration.ts           → 80 lines
└── index.ts              → 30 lines

### Size Guidance
| Module | Limit | Hard Max |
|--------|-------|----------|
| schema.ts | 150 | 225 |
| validation.ts | 100 | 150 |
```

**2f. Load tests.md:**

```bash
# Load from phase folder or root
if [ -f "$tests_file" ]; then
  # Extract test→requirement mapping
  # Each task will reference which tests it makes GREEN
fi
```

**2g. Validate prerequisites:**

- If Architecture Design missing: abort with "Run `/mdt:architecture` first"
- If phase specified but no phase section in architecture: abort with "Phase {X.Y} not found in architecture.md"

### Step 3: Inherit Size Limits

From Architecture Design (phase-specific if phased):

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
  Task 1.1: Extract validators
  Task 1.2: Extract formatters

Phase 2: Features
  Task 2.1: Implement feature-a (imports from Phase 1)
  Task 2.2: Implement feature-b (imports from Phase 1)
```

### Step 5: Task Template

```markdown
### Task {phase}.{number}: {Brief description}

**Structure**: `{exact path from Architecture Design}`

**Implements**: {P{X.Y}-1, P{X.Y}-2, ...} *(phase requirement IDs)*

**Makes GREEN**: *(from tests.md)*
- `{test_file}`: `{test_name}` (P{X.Y}-1)
- `{test_file}`: `{test_name}` (P{X.Y}-2)

**Limits**:
- Default: {N} lines
- Hard Max: {N×1.5} lines
- If > Default: ⚠️ flag warning
- If > Hard Max: ⛔ STOP

**From**: `{source file}` *(if refactoring)*
**To**: `{destination file}`

**Move/Create**:
- {specific function/class 1}
- {specific function/class 2}

**Exclude** (stays in source or goes elsewhere):
- {what NOT to move}

**Anti-duplication**:
- Import `{shared utility}` from `{path}` — do NOT copy logic

**Verify**:
```bash
wc -l {destination}       # check against limits
{test_command} --testPathPattern="phase-{X.Y}"
{build_command}
```

**Done when**:
- [ ] Tests RED before task, GREEN after
- [ ] File at correct path
- [ ] Size ≤ default (or flagged if ≤ hard max)
- [ ] No duplicated logic — uses shared imports
- [ ] All tests pass (no regressions)
```

### Step 6: Generate Tasks Document

```markdown
# Tasks: {CR-KEY} Phase {X.Y}

**Source**: [{CR-KEY}]({path}) → Phase {X.Y}
**Phase**: {X.Y} - {Phase Title}
**Tests**: `phase-{X.Y}/tests.md`
**Generated**: {timestamp}

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `{source_dir}` |
| Test command | `{test_command}` |
| Build command | `{build_command}` |
| File extension | `{ext}` |
| Phase test filter | `--testPathPattern="phase-{X.Y}"` |

## Size Thresholds (Phase {X.Y})

| Module | Default | Hard Max | Action |
|--------|---------|----------|--------|
| `schema.ts` | 150 | 225 | Flag at 150+, STOP at 225+ |
| `validation.ts` | 100 | 150 | Flag at 100+, STOP at 150+ |

*(From Architecture Design → Phase {X.Y})*

## Shared Patterns (Phase {X.Y})

| Pattern | Extract To | Used By |
|---------|------------|---------|
| {pattern} | `{path}` | {consumers} |

> Internal phase tasks extract shared patterns BEFORE features.

## Architecture Structure (Phase {X.Y})

```
{paste Structure diagram from Architecture Design phase section}
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

## Test Coverage (from phase-{X.Y}/tests.md)

| Test | Requirement | Task | Status |
|------|-------------|------|--------|
| `validation.test > accepts valid codes` | P{X.Y}-1 | Task 1.1 | 🔴 RED |
| `validation.test > rejects invalid` | P{X.Y}-1 | Task 1.1 | 🔴 RED |
| `migration.test > detects legacy` | P{X.Y}-3 | Task 1.2 | 🔴 RED |

**TDD Goal**: All tests RED before implementation, GREEN after respective task

---

## TDD Verification

Before starting each task:
```bash
{test_command} --testPathPattern="phase-{X.Y}"  # Should show failures
```

After completing each task:
```bash
{test_command} --testPathPattern="phase-{X.Y}"  # Task tests should pass
{test_command}                                   # Full suite — no regressions
```

---

## Phase {X.Y} Tasks

### Task 1.1: {First task}

**Structure**: `{path}`

**Makes GREEN**:
- `validation.test.ts`: `accepts valid codes` (P{X.Y}-1)
- `validation.test.ts`: `rejects invalid codes` (P{X.Y}-1)

**Limits**:
- Default: 150 lines
- Hard Max: 225 lines

...

---

### Task 1.2: {Second task}

...

---

## Post-Implementation (Phase {X.Y})

### Task N.1: Verify no duplication

```bash
grep -r "{pattern}" {source_dir} | cut -d: -f1 | sort | uniq -c
```
**Done when**: [ ] Each pattern exists in ONE location only

### Task N.2: Verify size compliance

```bash
find {source_dir} -name "*{ext}" -exec wc -l {} \; | awk '$1 > {HARD_MAX}'
```
**Done when**: [ ] No files exceed hard max

### Task N.3: Run phase tests

```bash
{test_command} --testPathPattern="phase-{X.Y}"
```
**Done when**: [ ] All phase tests GREEN
```

### Step 7: Validate Before Saving

- [ ] Project context includes all settings
- [ ] Phase correctly identified (or non-phased fallback)
- [ ] Size limits from phase-specific Architecture section
- [ ] Every task has `Limits`, `Exclude`, `Anti-duplication`
- [ ] **Test coverage** (from phase tests.md):
  - Every test has an implementing task
  - Task `**Makes GREEN**` section populated
  - Test Coverage table populated
- [ ] Tasks output to same folder as tests.md

### Step 8: Save and Report

**Create output directory if needed:**
```bash
mkdir -p "{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}"
```

**Save to phase-aware path:**
- Phased: `{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}/tasks.md`
- Non-phased: `{TICKETS_PATH}/{CR-KEY}/tasks.md`

**Report:**

```markdown
## Tasks Generated: {CR-KEY} Phase {X.Y}

| Metric | Value |
|--------|-------|
| Phase | {X.Y} - {Phase Title} |
| Tasks | {N} |
| Tests to make GREEN | {N} |

**Output**: `{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}/tasks.md`
**Tests**: `{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}/tests.md`

**Size thresholds**: Flag at default, STOP at 1.5x

Next: `/mdt:implement {CR-KEY} --phase {X.Y}`
```

---

## Task Examples

### Complete task example (phased)

```markdown
### Task 1.1: Implement ProjectSchema with validation

**Structure**: `domain-contracts/src/project/schema.ts`

**Implements**: P1.1-1, P1.1-2

**Makes GREEN**:
- `validation.test.ts`: `accepts valid project codes` (P1.1-1)
- `validation.test.ts`: `rejects lowercase codes` (P1.1-1)
- `validation.test.ts`: `requires name field` (P1.1-2)
- `validation.test.ts`: `requires code field` (P1.1-2)

**Limits**:
- Default: 150 lines
- Hard Max: 225 lines
- If > 150: ⚠️ flag
- If > 225: ⛔ STOP

**Create**:
- `ProjectSchema` Zod schema with field validations
- `Project` type exported via `z.infer<>`
- Code pattern regex: `^[A-Z][A-Z0-9]{1,4}$`

**Exclude**:
- Migration logic (Task 1.2)
- Custom business rules beyond basic validation (Task 1.3)

**Anti-duplication**:
- This IS the source schema — other modules will import from here

**Verify**:
```bash
wc -l domain-contracts/src/project/schema.ts  # ≤ 150
npm test -- --testPathPattern="phase-1.1"
npm run build
```

**Done when**:
- [ ] 4 tests GREEN (were RED)
- [ ] File at `domain-contracts/src/project/schema.ts`
- [ ] Size ≤ 150 lines
- [ ] Exports ProjectSchema and Project type
```

---

## Phase Discovery Examples

### Example 1: Auto-detect from tests.md location

```bash
$ /mdt:tasks MDT-101

Found phase-specific tests:
  - phase-1.1/tests.md
  - phase-1.2/tests.md

Which phase to generate tasks for? [1.1]: 1.1

Loading architecture.md → Phase 1.1...
Loading phase-1.1/tests.md...

Output: {TICKETS_PATH}/MDT-101/phase-1.1/tasks.md
```

### Example 2: Direct phase selection

```bash
$ /mdt:tasks MDT-101 --phase 1.2

Loading architecture.md → Phase 1.2...
Loading phase-1.2/tests.md...

Output: {TICKETS_PATH}/MDT-101/phase-1.2/tasks.md
```

### Example 3: Non-phased (backward compatible)

```bash
$ /mdt:tasks MDT-050

No phases detected.
Loading tests.md...

Output: {TICKETS_PATH}/MDT-050/tasks.md
```

---

## Integration

**Before**: 
- `/mdt:architecture` (required — provides structure + size limits)
- `/mdt:tests` (provides test→requirement mapping in same phase folder)

**After**: `/mdt:implement {CR-KEY} --phase {X.Y}`

**Co-location Pattern**:
```
{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}/
├── tests.md    ← /mdt:tests creates
└── tasks.md    ← /mdt:tasks creates (this prompt)
```

Context: $ARGUMENTS
