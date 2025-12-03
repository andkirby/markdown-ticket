# MDT Implementation Orchestrator (v1)

Interactive orchestrator for executing tasks from a task list. Runs tasks sequentially, tracks progress, and coordinates with appropriate sub-agents.

**Core Principle**: One task at a time, verify before proceeding. Human stays in control with options to pause, skip, or batch-run.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## What This Orchestrator Does

1. Loads task list from `docs/CRs/{CR-KEY}/tasks.md`
2. Identifies appropriate sub-agent/model for each task type
3. Executes tasks sequentially with verification
4. Tracks progress (marks completed tasks)
5. Provides control points between tasks

## Execution Modes

| Command | Behavior |
|---------|----------|
| `/mdt-implement {CR-KEY}` | Interactive mode — ask after each task |
| `/mdt-implement {CR-KEY} --all` | Step-by-step all — run all tasks, pause only at phase boundaries |
| `/mdt-implement {CR-KEY} --phase {N}` | Run specific phase only |
| `/mdt-implement {CR-KEY} --task {N.N}` | Run specific task only |
| `/mdt-implement {CR-KEY} --fast` | Skip test verification (risky, use for trusted refactoring) |
| `/mdt-implement {CR-KEY} --continue` | Resume from last incomplete task |

## Execution Steps

### Step 1: Load Context

1. Parse CR key from `$ARGUMENTS`
2. Load task list from `docs/CRs/{CR-KEY}/tasks.md`
   - If file doesn't exist, abort: "Run `/mdt-tasks {CR-KEY}` first to generate task list"
3. Parse task structure:
   - Extract phases and tasks
   - Identify completed tasks (marked `[x]`)
   - Find first incomplete task
4. Load CR for context: `mdt-all:get_cr` with `mode="full"`
   - Extract Architecture Design (Pattern, Structure, Extension Rule)
   - This guides implementation decisions

### Step 2: Select Sub-Agent Strategy

Based on task type, select appropriate execution approach:

| Task Type | Signal | Sub-Agent Strategy |
|-----------|--------|-------------------|
| **Refactoring** | "Extract", "Move", "Rename" | Code manipulation — can use fast model (Haiku) for mechanical changes |
| **New Feature** | "Implement", "Create", "Add" | Requires reasoning — use capable model (Sonnet/Opus) |
| **Test Creation** | "Add tests", "Test cases" | Pattern-based — can use fast model with test examples |
| **Documentation** | "Update docs", "CLAUDE.md" | Writing — use capable model |
| **Verification** | "Verify", "Check" | Analysis — use capable model |

**Sub-agent selection output:**
```markdown
Task 1.1: Extract summarize command
Type: Refactoring (mechanical extraction)
Suggested agent: Fast model (Haiku) — code movement, no complex decisions
```

User can override: "use sonnet" or "use opus" for any task.

### Step 3: Present Task

Before executing, show:

```markdown
## Task {N.N}: {Title}

**Phase**: {Phase number} — {Phase name}
**Type**: {Task type}
**Agent**: {Suggested sub-agent}

**From**: {Source file(s)}
**To**: {Destination file(s)}

**Do**:
- {Action 1}
- {Action 2}
- {Action 3}

**Interface**:
```typescript
{Expected export signature}
```

**Verify**:
- {Test command}
- {Expected outcome}

---

**Commands**: [run] [skip] [phase] [all] [stop] [agent:{model}]
```

Wait for user command.

### Step 4: Execute Task

On "run" or "all" or "phase":

1. **Announce start:**
   ```
   ▶ Starting Task {N.N}: {Title}
   ```

2. **Execute with sub-agent:**
   - Pass task description and context to selected agent
   - Agent performs file operations (create, modify, move)
   - Agent should follow Architecture Design constraints

3. **Run verification** (unless `--fast`):
   ```bash
   npm test        # or project-specific test command
   npm run build   # verify compilation
   ```

4. **Report result:**
   ```markdown
   ✓ Task {N.N} complete
     Created: {list of created files}
     Modified: {list of modified files}  
     Deleted: {list of deleted files}
     Tests: {passing|failing|skipped}
     Duration: {time}
   ```

5. **Update tasks.md:**
   - Change `- [ ]` to `- [x]` for completed task
   - Add completion timestamp as comment if desired

### Step 5: Handle Verification Failure

If tests fail after task execution:

```markdown
✗ Task {N.N} verification failed

**Test output**:
```
{test error output}
```

**Options**:
- [retry] — Agent attempts to fix the issue
- [manual] — You fix manually, then mark complete
- [skip] — Skip this task (mark incomplete)
- [stop] — Stop orchestration, investigate
```

On "retry":
- Show agent the error
- Agent attempts fix
- Re-run verification
- Max 3 retry attempts

### Step 6: Inter-Task Control

After each task (in interactive mode):

```markdown
✓ Task {N.N} complete

Progress: {completed}/{total} tasks | Phase {N}: {completed}/{phase_total}

Next: Task {N.N+1}: {Title}

[continue] [skip] [phase] [all] [stop] [review]
```

**Commands:**
| Command | Action |
|---------|--------|
| `continue` / `c` / `yes` / `y` | Run next task, ask again after |
| `skip` / `s` | Skip next task, continue to following |
| `phase` / `p` | Run remaining tasks in current phase without asking |
| `all` / `a` | Run all remaining tasks, pause only at phase boundaries |
| `stop` / `q` | Stop orchestration, save progress |
| `review` / `r` | Show git diff of changes so far |
| `status` | Show overall progress summary |

### Step 7: Phase Boundary

At end of each phase:

```markdown
═══════════════════════════════════════════════════════
✓ Phase {N} Complete: {Phase Name}
═══════════════════════════════════════════════════════

**Tasks completed**: {N}/{N}
**Files created**: {list}
**Files modified**: {list}

**Phase verification**:
- [ ] All tests passing
- [ ] {Phase-specific verification from tasks.md}

**Recommendation**: Review changes before proceeding to Phase {N+1}

[continue] [review] [stop]
```

Even in `--all` mode, pause at phase boundaries for review.

### Step 8: Completion

After all tasks (or on stop):

```markdown
═══════════════════════════════════════════════════════
Implementation Session Complete
═══════════════════════════════════════════════════════

**CR**: {CR-KEY}
**Session**: {timestamp}

### Progress
| Phase | Status | Tasks |
|-------|--------|-------|
| 1 | ✓ Complete | 4/4 |
| 2 | ◐ Partial | 2/5 |
| 3 | ○ Not started | 0/3 |
| Post | ○ Not started | 0/3 |

### Summary
- Tasks completed: {N}/{total}
- Files created: {N}
- Files modified: {N}
- Tests: {passing|failing}

### Files Changed
**Created:**
- {file path}
- {file path}

**Modified:**
- {file path}
- {file path}

### Next Steps
- {If incomplete: Resume with `/mdt-implement {CR-KEY} --continue`}
- {If phase done: Review before next phase}
- {If all done: Run post-implementation tasks}
- {If tests failing: Fix before proceeding}

### Post-Implementation Checklist
- [ ] Review git diff
- [ ] Run full test suite
- [ ] Update CLAUDE.md
- [ ] Verify Extension Rule
- [ ] Run `/mdt-tech-debt {CR-KEY}`
- [ ] Commit changes
```

## Task Execution Guidelines

### For Refactoring Tasks

```markdown
**Context for sub-agent:**

You are extracting code from {source} to {destination}.

Architecture Design:
- Pattern: {pattern}
- Structure: {structure diagram}
- Extension Rule: {rule}

Task requirements:
{task Do section}

Expected interface:
{task Interface section}

Constraints:
- Maintain existing functionality (tests must pass)
- Follow existing code style
- Update imports in source file
- Re-export from index if needed for public API
```

### For Feature Tasks

```markdown
**Context for sub-agent:**

You are implementing new functionality.

Architecture Design:
- Pattern: {pattern}
- Structure: {structure diagram}  
- Extension Rule: {rule}

Task requirements:
{task Do section}

Expected interface:
{task Interface section}

Test requirements:
{task Test section}

Constraints:
- Follow Architecture Design structure
- Create tests alongside implementation
- Wire into integration points as specified
```

### For Test Tasks

```markdown
**Context for sub-agent:**

You are creating tests for {module}.

Test file location: {test file path}

Cover these scenarios:
{task Test cases section}

Existing test patterns in this project:
{show example from existing tests}

Constraints:
- Follow existing test style
- Mock external dependencies
- Include happy path and error cases
```

## Fast Mode (`--fast`)

When `--fast` flag is provided:
- Skip test verification after each task
- Skip build verification
- Only verify at phase boundaries
- Show warning:
  ```
  ⚠ Fast mode: Skipping per-task verification
  Tests will run at phase boundaries only
  ```

Use for:
- Trusted mechanical refactoring
- When tests are slow and you'll review manually
- Batch extraction of similar files

Do NOT use for:
- New feature implementation
- Complex refactoring with logic changes
- When you're unsure about the changes

## Progress Tracking

Tasks.md is updated in place:

**Before:**
```markdown
### Task 1.1: Extract summarize command
- [ ] `src/cli/index.ts` reduced by ~135 lines
- [ ] `src/cli/commands/summarize-command.ts` exists
- [ ] Tests pass
```

**After:**
```markdown
### Task 1.1: Extract summarize command ✓ <!-- completed: 2025-01-15T14:30:00 -->
- [x] `src/cli/index.ts` reduced by ~135 lines
- [x] `src/cli/commands/summarize-command.ts` exists
- [x] Tests pass
```

## Error Recovery

### Session Interrupted

If orchestration stops unexpectedly:
1. Progress is saved in tasks.md (completed tasks marked)
2. Resume with `/mdt-implement {CR-KEY} --continue`
3. Orchestrator finds first incomplete task and continues

### Task Failed

If a task cannot be completed:
1. Mark task with failure note in tasks.md
2. User can:
   - Fix manually, then run `/mdt-implement {CR-KEY} --task {N.N}` to re-verify
   - Skip and continue
   - Stop and investigate

### Verification Failed

If tests fail:
1. Show error output
2. Offer retry (agent attempts fix)
3. Max 3 retries
4. If still failing, require manual intervention

## Behavioral Rules

- **Never skip verification silently** — always inform user if verification skipped
- **Pause at phase boundaries** — even in `--all` mode
- **Track all progress** — update tasks.md after each task
- **Show clear status** — user should always know what's done and what's next
- **Respect Architecture Design** — pass to sub-agent as constraint
- **Suggest appropriate agent** — but let user override
- **Handle failures gracefully** — save progress, offer recovery options

## Integration with Other Workflows

**Before this workflow**:
- `/mdt-ticket-creation` — CR must exist
- `/mdt-architecture` — Recommended (provides guidance to sub-agents)
- `/mdt-tasks` — Required (generates task list)

**After this workflow**:
- Manual: Review and commit changes
- `/mdt-tech-debt` — Verify no new debt introduced
- `/mdt-reflection` — Capture implementation learnings

**Trigger phrases**:
- "Implement [CR-KEY]"
- "Run tasks for [CR-KEY]"
- "Continue implementation of [CR-KEY]"
- "Work on [CR-KEY] step by step"

## Quality Checklist

During orchestration, verify:
- [ ] Each task leaves code in working state (tests pass)
- [ ] Progress tracked in tasks.md
- [ ] Architecture Design followed
- [ ] Phase boundaries respected with review pause
- [ ] Failures handled with clear options
- [ ] User maintains control (can stop/skip/review anytime)

Context for implementation: $ARGUMENTS
