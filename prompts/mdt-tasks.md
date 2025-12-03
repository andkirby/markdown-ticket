# MDT Task Breakdown Workflow (v2)

Generate a task list from a CR ticket for phased, reviewable implementation.

**Core Principle**: Tasks must include **constraints** (size limits, exclusions) not just actions. LLM agents execute literally — implicit goals must be explicit.

## User Input

```text
$ARGUMENTS
```

## Critical Rules (learned from failures)

1. **Size budgets are mandatory**: Every task creating/modifying files must specify max lines
2. **Extract shared utilities FIRST**: Before extracting consumers that will use them
3. **Exclusions prevent bloat**: Explicitly state what NOT to move
4. **Structure path required**: Link each task to CR Architecture Design location

## Output Location

`docs/CRs/{CR-KEY}/tasks.md`

## Execution Steps

### Step 1: Load CR Context

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist
2. Extract and keep available:
   - **Architecture Design** (Pattern, Structure, Extension Rule) — REQUIRED for refactoring
   - **Acceptance Criteria** — extract any size/line constraints
   - **Artifact Specifications** — list of files to create/modify
3. If Architecture Design missing for refactoring CR: abort with "Run `/mdt-architecture` first"

### Step 2: Calculate Size Budgets

From CR acceptance criteria, derive per-file limits:

```
CR says: "src/cli/index.ts reduced to <300 lines"
Current: 958 lines
Extracting to: 4 command files + validators + formatters

Budget allocation:
- index.ts target: <200 lines (orchestration only)
- Each command file: <200 lines
- validators/: <100 lines
- formatters/: <100 lines

If extraction would exceed budget → subdivide into smaller tasks
```

**Default budgets when CR doesn't specify:**
- Orchestration files (index.ts): 150 lines max
- Feature modules: 200 lines max  
- Utility modules: 100 lines max

### Step 3: Determine Task Order

**Dependency rule**: Extract in this order:
1. **Shared utilities first** (validators, formatters, helpers)
2. **Then consumers** (commands, features that import utilities)

This prevents duplication — consumers can import from already-extracted utilities.

### Step 4: Task Template

Each task MUST follow this format:

```markdown
### Task {phase}.{number}: {Brief description}

**Structure**: `{exact path from CR Architecture Design}`

**Limits**:
- Target file: max {N} lines
- Source reduction: ~{N} lines

**From**: `{source file}`
**To**: `{destination file}`

**Move**:
- {specific function/class/block 1}
- {specific function/class/block 2}

**Exclude** (stays in source or goes elsewhere):
- {what NOT to move — shared utilities, unrelated logic}

**Imports**: Update source to import from new location

**Verify**:
```bash
wc -l {destination} # must be < {limit}
npm test           # must pass
```

**Done when**:
- [ ] `{destination}` exists and < {N} lines
- [ ] `{source}` reduced by ~{N} lines
- [ ] Tests pass unchanged
```

### Step 5: Generate Tasks Document

```markdown
# Tasks: {CR-KEY}

**Source**: [{CR-KEY}]({relative path to CR})

## Global Constraints

| Constraint | Value | From |
|------------|-------|------|
| Max file size | {N} lines | CR Acceptance Criteria |
| Target structure | See Architecture Design | CR Section 2 |

**Architecture Structure** (from CR):
```
{paste exact Structure diagram from CR Architecture Design}
```

**STOP Condition**: If any file would exceed {N} lines, do NOT proceed. Subdivide the task first.

---

## Phase 1: {Name} — Shared Utilities

> Extract shared code BEFORE extracting features that will use it.

**Phase goal**: {goal}
**Phase verification**: All utility files exist, tests pass

### Task 1.1: {First shared utility}
...

---

## Phase 2: {Name} — Feature Extraction

> Now extract features that import from Phase 1 utilities.

**Phase goal**: {goal}
**Phase verification**: {source files} < {N} lines each, tests pass

### Task 2.1: {First feature extraction}
...

---

## Post-Implementation

### Task N.1: Verify structure compliance

**Do**: Compare actual file structure against CR Architecture Design
**Verify**: `find src/{area} -name "*.ts" | sort` matches CR structure
**Done when**: [ ] All files in correct locations per CR

### Task N.2: Verify size compliance

**Do**: Check all new/modified files against size limits
**Verify**:
```bash
find src/ -name "*.ts" -exec wc -l {} \; | awk '$1 > {MAX}'
# Should output nothing
```
**Done when**: [ ] No files exceed {MAX} lines

### Task N.3: Update CLAUDE.md

### Task N.4: Run `/mdt-tech-debt {CR-KEY}`
```

### Step 6: Validate Before Saving

Checklist:
- [ ] Every task has **Limits** with specific line counts
- [ ] Every task has **Exclude** section (can be empty with explanation)
- [ ] Shared utilities extracted in earlier phase than consumers
- [ ] **Structure** path matches CR Architecture Design exactly
- [ ] **Verify** section has runnable commands
- [ ] Post-implementation includes structure and size verification

### Step 7: Save and Report

Save to `docs/CRs/{CR-KEY}/tasks.md`

Report:
```markdown
## Tasks Generated: {CR-KEY}

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | {N} | Shared utilities |
| 2 | {N} | Feature extraction |
| Post | 4 | Verification |

**Size budget**: {N} lines max per file
**STOP condition**: Exceeding budget requires task subdivision

Next: Review tasks, then run `/mdt-implement {CR-KEY}`
```

## Task Examples

### Good: Refactoring with constraints

```markdown
### Task 1.1: Extract input validators

**Structure**: `src/cli/validators/input-validators.ts`

**Limits**:
- Target file: max 100 lines
- Source reduction: ~80 lines

**From**: `src/cli/index.ts`
**To**: `src/cli/validators/input-validators.ts`

**Move**:
- `validateUrl()` function
- `validateFilePath()` function  
- `validateNumericOption()` function
- Related type definitions

**Exclude**:
- Command-specific validation (goes with each command)
- Output formatting (separate task)

**Imports**: Add `export` to moved functions, update index.ts imports

**Verify**:
```bash
wc -l src/cli/validators/input-validators.ts  # < 100
npm test
```

**Done when**:
- [ ] File exists at correct path and < 100 lines
- [ ] index.ts reduced by ~80 lines
- [ ] Tests pass without modification
```

### Bad: Missing constraints (what failed in SUML-009)

```markdown
### Task 3: Summarize Command Module
**Description:** Extract summarize command logic into dedicated module
**Deliverables:**
- `src/cli/commands/summarize-command.ts` with complete summarize functionality
```

Problems: No size limit, no exclusions, "complete functionality" is unbounded.

## Integration

**Before**: `/mdt-architecture` (required for refactoring)
**After**: `/mdt-implement {CR-KEY}`

Context: $ARGUMENTS
