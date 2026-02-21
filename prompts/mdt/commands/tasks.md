# MDT Task Breakdown Workflow (v11)

Generate tasks from architecture + tests + bdd. Tasks include **constraints** (scope boundaries, exclusions, anti-duplication), not just actions.

## Decision Tree

```
Input: /mdt:tasks {CR-KEY} [--prep] [--part X.Y]

Prerequisites exist?
├─ No architecture.md → ERROR: Run /mdt:architecture first
├─ No tests.md → ERROR: Run /mdt:tests first
│
├─ bdd.md exists? → Load as supplementary input (for E2E-only files)
│
└─ Yes → What mode?
    ├─ --prep → Read prep/architecture.md + prep/tests.md [+ prep/bdd.md]
    │   └─ Output: prep/tasks.md
    │
    └─ Feature → Read architecture.md + [part-X.Y/]tests.md [+ bdd.md]
        ├─ Multi-part? Prompt for part selection
        └─ Output: [part-X.Y/]tasks.md
```

## Task Template (Essential)

```markdown
### Task {N}: {Brief description}

**Milestone**: M{X} — {milestone name} (BR-X.Y)  ← omit if no bdd.md

**Structure**: `{path from architecture}`

**Makes GREEN (unit)**: *(from tests.md)*
- `test_file`: `test name`

**Makes GREEN (BDD)**: *(only on milestone's final task)*
- `scenario_name` → `e2e_test_file` (BR-X.Y)

**Enables (BDD)**: *(tasks that contribute to a future milestone)*
- `scenario_name` (BR-X.Y) — needs Task {M} to complete

**Scope**: {what this task owns}
**Boundary**: {what it must not touch}

**Creates**:
- {new file/module}

**Modifies**:
- {existing file/module}

**Must Not Touch**:
- {module/file outside task ownership}

**Create/Move**:
- {specific item 1}
- {specific item 2}

**Exclude**: {what NOT to include}

**Anti-duplication**: Import `{X}` from `{path}` — do NOT copy

**Duplication Guard**:
- Check owner module for target behavior before coding
- If logic exists elsewhere, add explicit merge/refactor task immediately (no parallel path)
- Verify no second runtime owner was introduced

**Verify**:
```bash
{test_command} --filter="..."   # unit tests GREEN
{e2e_command} --grep="..."      # BDD GREEN (only if Makes GREEN (BDD) present)
```

**Done when**:
- [ ] Unit tests GREEN (were RED)
- [ ] BDD scenarios GREEN (if Makes GREEN (BDD) listed)
- [ ] No duplicated logic
- [ ] Smoke test passes (feature works with real execution)
- [ ] Fallback/absence paths match requirements (if applicable)
```

**Field intent (avoid overlap):**
- `Boundary`: high-level boundary for this task's responsibility area.
- `Must Not Touch`: concrete files/modules outside ownership (hard no-go list).
- `Exclude`: prohibited behavior or scope inside touched files (for example: no migrations, no API contract changes).
- `Creates`/`Modifies`: canonical file ownership list used for planning and coverage checks.
- `Create/Move`: optional atomic action list; do not restate full `Creates`/`Modifies` entries verbatim.

## Task 0: Install Dependencies

If architecture.md lists external packages in Key Dependencies, generate **Task 0** to install them before other tasks. Use the project's package manager with appropriate dev/runtime scope.

## Critical Rules

1. **Scope boundaries inherited** from architecture.md constraints
2. **Makes GREEN** populated from tests.md and/or bdd.md
3. **Exclude** explicitly states what NOT to move
4. **Anti-duplication** requires import, never copy
5. **Order**: Dependencies → shared utilities → features
6. **Sequencing**: Build one vertical path first (walking skeleton + first user-visible slice), then expand
7. **Constraint coverage**: Reference requirement constraint IDs (C1, C2...) in relevant tasks
8. **Architecture structure coverage (ENFORCED)**: After drafting all tasks, run the Architecture Coverage Check below. This is a required step, not a passive checklist item.
9. **Dependency installation**: Generate Task 0 from architecture Key Dependencies (see above)
10. **Verify ↔ Makes GREEN alignment**: Each task's **Verify** command(s) must directly run the tests or BDD scenarios listed in **Makes GREEN**. If **Makes GREEN** includes BDD scenarios or E2E test files, **Verify** must run the corresponding E2E command (no placeholders).
11. **BDD milestone alignment**: When bdd.md exists, group tasks into milestones where each milestone delivers one or more BDD scenarios GREEN. Tasks are sequenced to complete vertical slices, not horizontal layers.
12. **Task ownership fields required**: Every task must include `Creates`, `Modifies`, and `Must Not Touch`.
13. **Duplication guard required**: Every task must include `Duplication Guard` with an owner-check and duplicate-path check.
14. **Overlap handling**: If a task overlaps an existing module's responsibility, add a merge/refactor task immediately before proceeding.

## Milestone Planning (when bdd.md exists)

If bdd.md is present, plan tasks around **milestones** — vertical slices that make BDD scenarios progressively GREEN.

### Algorithm

1. **List BDD scenarios** from bdd.md with their requirement IDs (BR-X.Y)
2. **Trace module dependencies** for each scenario against architecture.md Structure:
   - Which types/models does this scenario need?
   - Which services/data layer?
   - Which stores/state?
   - Which components/views/templates?
   - Which routes/endpoints?
3. **Group scenarios** by shared module dependencies — scenarios needing the same modules belong to the same milestone
4. **Order milestones** from simplest (fewest modules) to most complex (most modules, building on previous milestones)
5. **Assign tasks to milestones** — each milestone contains the tasks needed to make its BDD scenarios GREEN

### Milestone Structure

```
Milestone 0: Walking Skeleton (all layers with stubs)
  → Checkpoint: builds/compiles, stubs render

Milestone 1: {simplest user-visible behavior} (BR-X.Y)
  → Tasks: enough of data + logic + UI layers for this scenario
  → Checkpoint: BDD scenario(s) GREEN

Milestone 2: {next behavior, builds on M1} (BR-X.Y, BR-X.Z)
  → Tasks: additional modules needed
  → Checkpoint: BDD scenario(s) GREEN

...

Milestone N: {most complex behavior} (BR-X.Y)
  → Tasks: remaining modules
  → Checkpoint: ALL BDD scenarios GREEN
```

### Key Principles

- **Vertical, not horizontal**: Don't do "all stores → all components." Do "enough store + component for BR-1.1 to work."
- **Each milestone has a BDD checkpoint**: The implementer runs specific BDD scenarios after the milestone's last task. If they're not GREEN, something broke.
- **Tasks within a milestone** still follow dependency order: data layer → logic → presentation.
- **No bdd.md? Skip milestones**: Fall back to module-by-module sequencing (walking skeleton → expand).
- **No parallel runtime ownership**: if milestone work introduces overlapping behavior ownership, insert merge/refactor task before next feature task.

## Implementation Sequencing

Use this sequencing to keep integration stable:

- Start with a **walking skeleton** task (Milestone 0) that spans **every distinct layer** in architecture.md Structure:
  - Extract unique top-level directories/layers (e.g., types, services, stores, components, routes, handlers)
  - The skeleton must create at least one file per layer with minimal stubs and real wiring between them
  - **BLOCKING**: A skeleton that skips ANY layer is incomplete. If architecture.md lists components, the skeleton MUST include at least one component stub.
  - List all layers explicitly in the skeleton task's `Creates` field
- When milestones are planned, sequence tasks within each milestone to deliver vertical slices.
- First feature milestone must deliver one end-to-end vertical runtime path before adding alternative paths.
- Within a milestone: implement data layer → logic → presentation (simplest happy path first).
- Keep early logic minimal; avoid optimization or premature abstraction.
- Skip milestones only for tiny, single-module changes, scoped bug fixes, or when no bdd.md exists.

## Architecture Coverage Check (Rule 8) — BLOCKING

After drafting tasks, this check is **mandatory** and **blocks completion if failed**.

### Step A: Extract and Tally

1. Parse architecture.md Structure section, extract every **leaf source file path**
2. Build a **unique set** of file paths referenced in each task's `Structure`, `Creates`, `Modifies`, and `Create/Move` fields
3. For each layer, count unique architecture files vs unique matched task files
4. Build coverage table with **numeric values only**:

```markdown
## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| types/ | 3 | 3 | 0 | ✅ |
| services/ | 4 | 4 | 0 | ✅ |
| components/ | 12 | 0 | 12 | ❌ |
```

**Column rules**:
- `Arch Files`: Count of unique leaf file paths from architecture.md Structure (integer)
- `In Tasks`: Count of unique architecture file paths that appear in task `Structure`, `Creates`, `Modifies`, or `Create/Move` fields via exact path match (integer, NOT "E2E only", NOT "covered by", NOT "N/A")
- `Gap`: `Arch Files - In Tasks` (calculated, not guessed)
- `Status`: `✅` if Gap = 0, `❌` if Gap > 0

If any row has `Gap > 0`, include exact orphan paths:

```markdown
### Orphaned Files
- `app/ui/sidebar/view-file.ext`
- `app/routes/feature/resource/view-file.ext`
```

### Step B: Resolve Gaps (BLOCKING)

If ANY row has `Gap > 0`:

1. **STOP** — task breakdown is incomplete
2. For each orphaned file, find test coverage:
   - In tests.md? → Use as "Makes GREEN"
   - In bdd.md only? → Use BDD scenario as "Makes GREEN"
   - Neither? → "Makes GREEN: manual smoke test" + `⚠️ No automated test`
3. **Generate additional tasks** for orphaned files (grouped by layer)
4. Re-run coverage check
5. Repeat until ALL rows show Gap = 0

### Step C: Anti-Loophole Rules

- A note at the bottom saying "covered by E2E" does NOT satisfy coverage
- Files must appear in a task's **Structure/Creates/Modifies/Create/Move field** to count
- Directory-only references (for example `app/ui/`) do NOT count toward file coverage
- If no task exists for a file, Gap is non-zero and breakdown is incomplete
- This check **cannot be bypassed** with documentation or notes

## Output: tasks.md

```markdown
# Tasks: {CR-KEY}

**Source**: architecture.md + tests.md [+ bdd.md]

## Scope Boundaries

- {Module or area}: {scope + boundary}

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| {behavior} | `{path}` | {Task N or N/A} |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 2, Task 4 |
| C2 | Task 1, Task 7 |

## Milestones (when bdd.md exists)

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint |
|-----------|------------------------|-------|------------|
| M0: Walking Skeleton | — | Task 1 | Builds, stubs render |
| M1: {behavior} | BR-1.1, BR-1.2 | Task 2-3 | `scenario_a` GREEN |
| M2: {behavior} | BR-1.3, BR-2.1 | Task 4-5 | `scenario_b`, `scenario_c` GREEN |

## Tasks

### Task 1: ... (M0)
### Task 2: ... (M1)
### Task 3: ... (M1 — checkpoint)

## Post-Implementation

- [ ] No duplication (grep check)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN (if bdd.md exists)
- [ ] Smoke test passes (feature works with real execution)
- [ ] Fallback/absence paths match requirements (if applicable)

## Post-Verify Fixes (appended by implement-agentic)

- Added only if `/mdt:verify-complete` finds CRITICAL/HIGH issues
- Each fix references issue evidence and required action
```

## Output: .tasks-status.yaml

After writing tasks.md, also write a machine-readable tracker to `{TICKETS_PATH}/{CR-KEY}/.tasks-status.yaml`:

```yaml
cr_key: "{CR-KEY}"
total: {number of tasks}
tasks:
  - id: 1
    title: "{Task 1 title from ### Task 1: ...}"
    status: pending
  - id: 2
    title: "{Task 2 title}"
    status: pending
  ...
```

Rules:
- One entry per `### Task N:` in tasks.md
- All statuses start as `pending`
- Title is the text after `### Task N: `
- `total` matches the number of task entries

## Common Pitfall

❌ **Don't** write tasks as just "implement X"
✅ **Do** include Scope/Boundary, Exclude, Anti-duplication for every task

## Self-Check Questions

Before finalizing tasks.md, ask:

- Did I map every architecture **leaf file path** to at least one task `Structure`, `Creates`, `Modifies`, or `Create/Move` entry?
- If any row has `Gap > 0`, did I stop, add orphan-file tasks, and re-run coverage?
- Did I avoid directory-only references as coverage evidence?
- Did I keep examples and wording framework-agnostic unless the CR explicitly requires a specific stack?
- Where tests.md is missing coverage but bdd.md has it, did `Makes GREEN` cite the exact BDD scenario?
- Does every task's **Verify** command actually run the tests/scenarios listed in **Makes GREEN**?
- If bdd.md exists, did I plan milestones? Does every BDD scenario appear in exactly one milestone's checkpoint?
- Is each milestone a vertical slice (data + logic + UI), not a horizontal layer?
- Does every task include `Creates`, `Modifies`, `Must Not Touch`, and `Duplication Guard`?
- If module ownership overlap appeared, did I insert a merge/refactor task immediately?

## Checklist

- [ ] Architecture + tests exist
- [ ] Scope boundaries from architecture
- [ ] Makes GREEN (unit) from tests.md, Makes GREEN (BDD) from bdd.md
- [ ] Every task has Scope/Boundary, Exclude, Anti-duplication
- [ ] Every task has Creates, Modifies, Must Not Touch, Duplication Guard
- [ ] Milestones planned from BDD scenarios (if bdd.md exists)
- [ ] Every BDD scenario assigned to exactly one milestone checkpoint
- [ ] Shared patterns before features
- [ ] First implementation milestone delivers a single vertical runtime path
- [ ] Ownership overlaps resolved via explicit merge/refactor tasks
- [ ] Architecture Coverage Check executed — ALL rows Gap = 0 (Rule 8, BLOCKING)

## Completion

**Prep mode**:
```markdown
## Task Breakdown Complete

**CR**: {CR-KEY}
**Output**: prep/tasks.md + prep/.tasks-status.yaml
**Tasks**: {N} tasks
**Tracker**: {N} tasks, all pending

**Next**: `/mdt:implement {CR-KEY} --prep` or `/mdt:implement-agentic {CR-KEY} --prep`
```

**Feature mode**:
```markdown
## Task Breakdown Complete

**CR**: {CR-KEY}
**Output**: [part-X.Y/]tasks.md + [part-X.Y/].tasks-status.yaml
**Tasks**: {N} tasks
**Tracker**: {N} tasks, all pending

**Next**: `/mdt:implement {CR-KEY}` or `/mdt:implement-agentic {CR-KEY}`
```

## Integration

```
/mdt:architecture → structure + scope boundaries
        ↓
/mdt:tests → test specs
        ↓
/mdt:tasks → tasks with constraints (this workflow)
        ↓
/mdt:implement(-agentic) → makes tests GREEN
```

---
*Context: $ARGUMENTS*
