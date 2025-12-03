# MDT Task Breakdown Workflow (v1)

Generate a task list from a CR ticket for phased, reviewable implementation. Each task is independently commitable and verifiable.

**Core Principle**: Tasks explain *what* to do and *how to verify*, not *how to code*. Write for a mid-level developer who understands patterns but needs direction on scope and interfaces.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Problem This Solves

Large CRs (refactoring, multi-file features) fail when given to LLM agents as single units:
- Agent may go wrong direction with no checkpoint to catch it
- Context loss between sessions leaves work in unclear state
- No way to say "just do Phase 1 today"
- Hard to review incremental progress

Task breakdown enables:
- Phased implementation with review gates
- Resumable work across sessions
- Clear progress tracking
- Independent verification per task

## When to Use

Use this workflow when:
- CR has multiple phases or affects multiple files
- Work will span multiple sessions
- You want checkpoint reviews before proceeding
- CR involves architectural changes (refactoring, new patterns)

Do NOT use when:
- Single-file bug fix
- < 1 hour of work
- You'll watch agent work in real-time
- CR is exploratory/spike

## Output Location

Tasks file: `docs/CRs/{CR-KEY}/tasks.md`

Example: `docs/CRs/SUML-009/tasks.md`

## Execution Steps

### Step 1: Load CR Context

1. Use `mdt-all:get_cr` with `mode="full"` to retrieve CR content
   - Parse CR key, project code
   - If CR doesn't exist, abort: "Create CR first"
   - If CR status is "Implemented", warn: "Creating tasks for implemented CR"

2. Extract from CR:
   - Architecture Design (Pattern, Structure, Extension Rule)
   - Artifact Specifications (new files, modified files)
   - Acceptance Criteria
   - Deployment phases (if defined)
   - Verification approach

3. If Architecture Design missing, recommend: "Run `/mdt-architecture` first for complex refactoring"

### Step 2: Identify Task Boundaries

Group work into logical, independently commitable units:

**Boundary principles:**
- Each task produces working code (tests pass after task)
- Each task has clear verification criteria
- Tasks within a phase can be done in sequence
- Phases are natural review gates

**Task sizing:**
- Target: 15-45 minutes of work per task
- Minimum: Creates or modifies at least one file
- Maximum: Touches no more than 3-4 files

**Grouping by CR type:**

| CR Type | Grouping Strategy |
|---------|-------------------|
| **Refactoring** | Group by module extraction (one task per new file or logical unit) |
| **Feature** | Group by vertical slice (one task per user-visible capability) |
| **Bug Fix** | Usually single task, unless fix spans multiple files |
| **Architecture** | Group by layer or component boundary |

### Step 3: Define Task Structure

Each task follows this format:

```markdown
### Task {phase}.{number}: {Brief description}

**Commit message**: `{type}({scope}): {description}`

**From**: {source file(s) or "New file"}
**To**: {destination file(s)}

**Do**:
- {Specific action 1}
- {Specific action 2}
- {Specific action 3}

**Interface**:
```typescript
// Expected export signature (for new/modified modules)
export function {name}({params}): {return}
```

**Keep unchanged**: {What stays in original location, if applicable}

**Test**:
- {Verification command or test file}
- {Expected outcome}

**Done when**:
- [ ] {Concrete completion criterion}
- [ ] {Concrete completion criterion}
```

### Step 4: Generate Task List

Create the full task list document:

```markdown
# Tasks: {CR-KEY}

> Generated from [{CR-KEY}](../../../docs/CRs/{CR-KEY}.md)
> 
> **Pattern**: {From Architecture Design}
> **Extension Rule**: {From Architecture Design}

## Overview

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | {N} | {Phase 1 description} |
| 2 | {N} | {Phase 2 description} |
| ... | ... | ... |

## Progress

- [ ] Phase 1: {description}
- [ ] Phase 2: {description}
- [ ] Post-implementation

---

## Phase 1: {Phase Name}

**Goal**: {What this phase achieves}
**Verify phase complete**: {How to verify entire phase}

### Task 1.1: {Description}
...

### Task 1.2: {Description}
...

---

## Phase 2: {Phase Name}
...

---

## Post-Implementation

### Task N.1: Update documentation

**Do**:
- Update CLAUDE.md with new file structure
- Update README.md if public API changed

**Done when**:
- [ ] CLAUDE.md reflects actual file organization
- [ ] New developers can navigate codebase using docs

### Task N.2: Verify extension rule

**Do**:
- Attempt to add mock/test instance following Extension Rule
- Document if rule holds or needs adjustment

**Done when**:
- [ ] Extension Rule verified or CR updated with correction

### Task N.3: Tech debt check

**Do**:
- Run `/mdt-tech-debt {CR-KEY}`
- Address or document any findings

**Done when**:
- [ ] No high-severity debt introduced
- [ ] Any deferred debt documented in CR
```

### Step 5: Task Detail Guidelines

**For refactoring tasks (extracting code):**
```markdown
### Task 1.1: Extract {component} to {new file}

**Commit message**: `refactor({scope}): extract {component} to dedicated module`

**From**: `{source file}` ({description of what to extract})
**To**: `{destination file}`

**Do**:
- Create `{destination file}`
- Move {function/class/block description} from source
- Update imports in source to use new module
- Re-export from index if needed for public API

**Interface**:
```typescript
export function {name}({params}): {return}
```

**Keep in source**: {What remains — orchestration, other functions}

**Test**:
- `npm test` — all existing tests pass
- `npm run build` — no TypeScript errors

**Done when**:
- [ ] `{source file}` reduced by ~{N} lines
- [ ] `{destination file}` exists with focused responsibility
- [ ] All imports resolve correctly
- [ ] Tests pass without modification
```

**For feature tasks (new functionality):**
```markdown
### Task 2.1: Implement {capability}

**Commit message**: `feat({scope}): add {capability}`

**From**: New file
**To**: `{file path}`

**Do**:
- Create `{file path}` with {responsibility}
- Implement {specific behavior}
- Wire into {integration point}

**Interface**:
```typescript
export function {name}({params}): {return}
```

**Test**:
- Create `{test file path}`
- Test cases: {list key scenarios}

**Done when**:
- [ ] {Functional criterion from CR acceptance criteria}
- [ ] Unit tests cover happy path and error cases
- [ ] Integrated with {parent module}
```

**For test tasks:**
```markdown
### Task 1.5: Add tests for {module}

**Commit message**: `test({scope}): add unit tests for {module}`

**From**: New file
**To**: `{test file path}`

**Do**:
- Create test file for `{module}`
- Cover: {list key behaviors to test}
- Mock: {list dependencies to mock}

**Test cases**:
- {Input} → {Expected output}
- {Error condition} → {Expected error}
- {Edge case} → {Expected behavior}

**Done when**:
- [ ] Test file exists at `{path}`
- [ ] Coverage for `{module}` > {N}%
- [ ] All tests pass
```

### Step 6: Validate Task List

Before saving, verify:

1. **Completeness**: All artifacts from CR Section 4 are covered by tasks
2. **Independence**: Each task can be committed and tests pass
3. **Sequence**: Tasks in a phase have logical order (dependencies first)
4. **Verification**: Every task has concrete "Done when" criteria
5. **Traceability**: Tasks map back to CR acceptance criteria

### Step 7: Save Task List

1. Create directory if needed: `docs/CRs/{CR-KEY}/`
2. Write task list to: `docs/CRs/{CR-KEY}/tasks.md`
3. Report completion with summary

### Step 8: Report Completion

```markdown
## Task Breakdown Complete

**CR**: {CR-KEY}
**Tasks file**: `docs/CRs/{CR-KEY}/tasks.md`

### Summary
| Phase | Tasks | Estimated |
|-------|-------|-----------|
| 1 | {N} | {N * 30} min |
| 2 | {N} | {N * 30} min |
| Post | 3 | 45 min |
| **Total** | {N} | {total} min |

### Task Overview
1.1 {description}
1.2 {description}
...

### Next Steps
- Review task breakdown for accuracy
- Begin with: `Task 1.1: {description}`
- After each phase, verify before proceeding
```

## Behavioral Rules

- **No line numbers**: Reference by function/block name, not line numbers (they shift)
- **Independently commitable**: Each task leaves code in working state
- **Mid-level developer audience**: Explain what and why, not how to code
- **Include test expectations**: Refactoring = existing tests pass; Features = new tests required
- **Post-implementation tasks always included**: Docs update, extension rule verification, tech debt check
- **Respect CR phases**: If CR has deployment phases, align task phases to match
- **No implementation code**: Task describes interface signatures, not full implementation

## Anti-Patterns to Avoid

❌ **Too vague**: "Refactor the CLI module"
✅ **Specific**: "Extract summarize command handler to `src/cli/commands/summarize-command.ts`"

❌ **Too detailed**: "On line 45, change the import statement to..."
✅ **Right level**: "Move command handler and its helper functions, update imports in source"

❌ **Not commitable**: "Start working on the config module"
✅ **Commitable**: "Extract `provider-factory.ts` with `createProviderConfig()` export"

❌ **No verification**: "Create the new file"
✅ **Verifiable**: "Done when: tests pass, source file reduced by ~100 lines"

❌ **Missing test guidance**: "Implement the feature"
✅ **With tests**: "Create unit tests in `test/config/provider-factory.test.ts` covering provider creation and error cases"

## Integration with Other Workflows

**Before this workflow**:
- `/mdt-ticket-creation` — CR must exist
- `/mdt-architecture` — Recommended for complex refactoring (provides Structure and Extension Rule)
- `/mdt-clarification` — Resolve ambiguities before breaking down

**After this workflow**:
- Implementation — Agent works through tasks sequentially
- `/mdt-tech-debt` — Run as post-implementation task
- `/mdt-reflection` — Capture learnings after completion

**Trigger phrases**:
- "Break down [CR-KEY] into tasks"
- "Create task list for [CR-KEY]"
- "Generate tasks for [CR-KEY]"

## Quality Checklist

Before saving task list, verify:
- [ ] All CR artifacts covered by tasks
- [ ] Each task independently commitable (tests pass after)
- [ ] Tasks sized appropriately (15-45 min each)
- [ ] Verification criteria are concrete
- [ ] Interface signatures included for new modules
- [ ] Test requirements specified (existing pass or new required)
- [ ] Post-implementation tasks included (docs, extension rule, tech debt)
- [ ] Phases align with CR deployment strategy
- [ ] No line numbers used (reference by name)

Context for breakdown: $ARGUMENTS
