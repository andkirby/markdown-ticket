# MDT Task Breakdown Workflow (v9)

Generate tasks from architecture + tests. Tasks include **constraints** (scope boundaries, exclusions, anti-duplication), not just actions.

## Decision Tree

```
Input: /mdt:tasks {CR-KEY} [--prep] [--part X.Y]

Prerequisites exist?
├─ No architecture.md → ERROR: Run /mdt:architecture first
├─ No tests.md → ERROR: Run /mdt:tests first
│
└─ Yes → What mode?
    ├─ --prep → Read prep/architecture.md + prep/tests.md
    │   └─ Output: prep/tasks.md
    │
    └─ Feature → Read architecture.md + [part-X.Y/]tests.md
        ├─ Multi-part? Prompt for part selection
        └─ Output: [part-X.Y/]tasks.md
```

## Task Template (Essential)

```markdown
### Task {N}: {Brief description}

**Structure**: `{path from architecture}`

**Makes GREEN**: *(from tests.md)*
- `test_file.ts`: `test name`

**Scope**: {what this task owns}
**Boundary**: {what it must not touch}

**Create/Move**:
- {specific item 1}
- {specific item 2}

**Exclude**: {what NOT to include}

**Anti-duplication**: Import `{X}` from `{path}` — do NOT copy

**Verify**:
```bash
{test_command} --filter="..."   # tests GREEN
```

**Done when**:
- [ ] Tests GREEN (were RED)
- [ ] No duplicated logic
- [ ] Smoke test passes (feature works with real execution)
- [ ] Fallback/absence paths match requirements (if applicable)
```

## Critical Rules

1. **Scope boundaries inherited** from architecture.md constraints
2. **Makes GREEN** populated from tests.md
3. **Exclude** explicitly states what NOT to move
4. **Anti-duplication** requires import, never copy
5. **Order**: Shared utilities before features
6. **Sequencing**: Add a walking skeleton task before deep module work, unless change is tiny/single-module
7. **Constraint coverage**: Reference requirement constraint IDs (C1, C2...) in relevant tasks
8. **Architecture structure coverage**: Walk the architecture.md Structure section. Every listed file must appear in at least one task's Create/Modify list. If a file has no task, add one.

## Implementation Sequencing

Use this sequencing to keep integration stable:

- Start with a **walking skeleton** task: create files, interfaces, and an end-to-end path.
- Implement only the simplest happy path first to prove wiring.
- Keep early logic minimal; avoid optimization or premature abstraction.
- Expand module-by-module: data rules, edge cases, and failure paths.
- Skip the skeleton only for tiny, single-module changes or scoped bug fixes.

## Output: tasks.md

```markdown
# Tasks: {CR-KEY}

**Source**: architecture.md + tests.md

## Scope Boundaries

- {Module or area}: {scope + boundary}

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 2, Task 4 |
| C2 | Task 1, Task 7 |

## Tasks

### Task 1: ...
### Task 2: ...

## Post-Implementation

- [ ] No duplication (grep check)
- [ ] Scope boundaries respected
- [ ] All tests GREEN
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

## Checklist

- [ ] Architecture + tests exist
- [ ] Scope boundaries from architecture
- [ ] Makes GREEN from tests.md
- [ ] Every task has Scope/Boundary, Exclude, Anti-duplication
- [ ] Shared patterns before features
- [ ] Every file in architecture.md Structure section covered by a task

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
/mdt:implement → makes tests GREEN
```

---
*Context: $ARGUMENTS*
