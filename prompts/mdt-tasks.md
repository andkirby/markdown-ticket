# MDT Task Breakdown Workflow (v2)

Generate a task list from a CR ticket for phased, reviewable implementation.

**Core Principle**: Tasks must include **constraints** (size limits, exclusions) not just actions. LLM agents execute literally — implicit goals must be explicit.

## User Input

```text
$ARGUMENTS
```

## Output Location

`docs/CRs/{CR-KEY}/tasks.md`

## Critical Rules

1. **Size budgets are mandatory**: Every task creating/modifying files must specify max lines
2. **Extract shared utilities FIRST**: Before extracting consumers that will use them
3. **Exclusions prevent bloat**: Explicitly state what NOT to move
4. **Structure path required**: Link each task to CR Architecture Design location

## Execution Steps

### Step 1: Extract Project Context

Detect or extract from CLAUDE.md / project config:

```yaml
project:
  source_dir: {src/, lib/, app/, ...}
  test_command: {npm test, pytest, cargo test, go test, make test, ...}
  build_command: {npm run build, cargo build, go build, make, ...}
  file_extension: {.ts, .py, .rs, .go, .java, ...}
  max_file_lines: {from CR acceptance criteria or default 300}
```

If CLAUDE.md exists, read it. Otherwise detect from project files (package.json, Cargo.toml, go.mod, pyproject.toml, Makefile, etc.).

### Step 2: Load CR Context

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist
2. Extract and keep available:
   - **Architecture Design** (Pattern, Structure, Extension Rule) — REQUIRED for refactoring
   - **Acceptance Criteria** — extract any size/line constraints
   - **Artifact Specifications** — list of files to create/modify
3. If Architecture Design missing for refactoring CR: abort with "Run `/mdt-architecture` first"

### Step 3: Calculate Size Budgets

From CR acceptance criteria, derive per-file limits:

```
CR says: "{source_dir}/cli/index.{ext}" reduced to <300 lines
Current: 958 lines
Extracting to: 4 command files + validators + formatters

Budget allocation:
- index.{ext} target: <200 lines (orchestration only)
- Each command file: <200 lines
- validators/: <100 lines
- formatters/: <100 lines

If extraction would exceed budget → subdivide into smaller tasks
```

**Default budgets when CR doesn't specify:**
- Orchestration files (index, main): 150 lines max
- Feature modules: 200 lines max  
- Utility modules: 100 lines max

### Step 4: Determine Task Order

**Dependency rule**: Extract in this order:
1. **Shared utilities first** (validators, formatters, helpers)
2. **Then consumers** (commands, features that import utilities)

This prevents duplication — consumers can import from already-extracted utilities.

### Step 5: Task Template

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
wc -l {destination}       # must be < {limit}
{test_command}            # must pass
```

**Done when**:
- [ ] `{destination}` exists and < {N} lines
- [ ] `{source}` reduced by ~{N} lines
- [ ] Tests pass unchanged
```

### Step 6: Generate Tasks Document

```markdown
# Tasks: {CR-KEY}

**Source**: [{CR-KEY}]({relative path to CR})

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `{source_dir}` |
| Test command | `{test_command}` |
| Build command | `{build_command}` |
| File extension | `{file_extension}` |

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
**Phase verification**: All utility files exist, `{test_command}` passes

### Task 1.1: {First shared utility}
...

---

## Phase 2: {Name} — Feature Extraction

> Now extract features that import from Phase 1 utilities.

**Phase goal**: {goal}
**Phase verification**: {source files} < {N} lines each, `{test_command}` passes

### Task 2.1: {First feature extraction}
...

---

## Post-Implementation

### Task N.1: Verify structure compliance

**Do**: Compare actual file structure against CR Architecture Design
**Verify**: `find {source_dir}/{area} -name "*{ext}" | sort` matches CR structure
**Done when**: [ ] All files in correct locations per CR

### Task N.2: Verify size compliance

**Do**: Check all new/modified files against size limits
**Verify**:
```bash
find {source_dir} -name "*{ext}" -exec wc -l {} \; | awk '$1 > {MAX}'
# Should output nothing
```
**Done when**: [ ] No files exceed {MAX} lines

### Task N.3: Update project documentation

**Do**: Update CLAUDE.md (or equivalent) with new file structure

### Task N.4: Run `/mdt-tech-debt {CR-KEY}`
```

### Step 7: Validate Before Saving

Checklist:
- [ ] Project context extracted and documented
- [ ] Every task has **Limits** with specific line counts
- [ ] Every task has **Exclude** section (can be empty with explanation)
- [ ] Shared utilities extracted in earlier phase than consumers
- [ ] **Structure** path matches CR Architecture Design exactly
- [ ] **Verify** section uses project's test/build commands
- [ ] Post-implementation includes structure and size verification

### Step 8: Save and Report

Save to `docs/CRs/{CR-KEY}/tasks.md`

Report:
```markdown
## Tasks Generated: {CR-KEY}

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | {N} | Shared utilities |
| 2 | {N} | Feature extraction |
| Post | 4 | Verification |

**Project**: {source_dir}, {test_command}
**Size budget**: {N} lines max per file
**STOP condition**: Exceeding budget requires task subdivision

Next: Review tasks, then run `/mdt-implement {CR-KEY}`
```

## Task Examples

### Example: Refactoring with constraints (language-agnostic)

```markdown
### Task 1.1: Extract input validators

**Structure**: `{source_dir}/cli/validators/input_validators{ext}`

**Limits**:
- Target file: max 100 lines
- Source reduction: ~80 lines

**From**: `{source_dir}/cli/index{ext}`
**To**: `{source_dir}/cli/validators/input_validators{ext}`

**Move**:
- `validate_url()` function
- `validate_file_path()` function  
- `validate_numeric_option()` function
- Related type definitions

**Exclude**:
- Command-specific validation (goes with each command)
- Output formatting (separate task)

**Imports**: Add export/public to moved functions, update imports in index

**Verify**:
```bash
wc -l {source_dir}/cli/validators/input_validators{ext}  # < 100
{test_command}
```

**Done when**:
- [ ] File exists at correct path and < 100 lines
- [ ] index reduced by ~80 lines
- [ ] Tests pass without modification
```

### Anti-pattern: Missing constraints (what fails)

```markdown
### Task 3: Summarize Command Module
**Description:** Extract summarize command logic into dedicated module
**Deliverables:**
- `{source_dir}/cli/commands/summarize_command{ext}` with complete functionality
```

Problems: No size limit, no exclusions, "complete functionality" is unbounded.

## Integration

**Before**: `/mdt-architecture` (required for refactoring)
**After**: `/mdt-implement {CR-KEY}`

Context: $ARGUMENTS
