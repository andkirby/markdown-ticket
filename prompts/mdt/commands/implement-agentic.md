---
name: implement-agentic
description: Execute with agent-based verification
argument-hint: "{CR-KEY} [--prep] [--part X.Y] [--continue] [--task N.N] [--strict] [--batch N]"
allowed-tools:
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/gen-tasks-status.sh:*)
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh:*)
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/enforce-tasks.sh:*)
---

# MDT Agentic Implementation Orchestrator (v5)

Coordinate implementation tasks using specialized agents and checkpointed state.

**Core Principle**: Orchestrator owns state + decisions. Agents execute scoped work and return structured JSON.

## Orchestrator Constraints (MANDATORY)

You are a flow orchestrator. Your ONLY job is to launch subagents using the Task tool and relay their results.

**FORBIDDEN:**
- ❌ NEVER use Edit/Write tools directly for code changes
- ❌ NEVER use Task tool with general-purpose or other subagent types
- ❌ NEVER implement code yourself

**REQUIRED:**
- ✅ Use Task tool with subagent_type="mdt:verify" for pre/post checks
- ✅ Use Task tool with subagent_type="mdt:code" for implementation
- ✅ Use Task tool with subagent_type="mdt:fix" for fixing failures
- ✅ Use Task tool with subagent_type="mdt:verify-complete" for completion verification

**ALLOWED Bash (state management scripts only):**
- ✅ `${CLAUDE_PLUGIN_ROOT}/scripts/gen-tasks-status.sh` — generate tracker if missing
- ✅ `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh` — update task status by ID
- ✅ `${CLAUDE_PLUGIN_ROOT}/scripts/enforce-tasks.sh` — self-check before completion

## User Input

```text
$ARGUMENTS
```

## Required Inputs

- `{TICKETS_PATH}/{CR-KEY}/tasks.md`
- `{TICKETS_PATH}/{CR-KEY}/tests.md`
- Optional: `{TICKETS_PATH}/{CR-KEY}/requirements.md`, `{TICKETS_PATH}/{CR-KEY}/bdd.md`

## Agent Call Paths

Use Task tool with subagent_type:
- `mdt:verify` - Pre/post verification
- `mdt:verify-complete` - Final quality checks
- `mdt:code` - Implementation
- `mdt:fix` - Remediation

## Execution Modes

| Command | Behavior |
|---------|----------|
| `/mdt:implement-agentic {CR-KEY}` | Interactive — **fast mode by default** (batch 3, scoped-post, reuse-baseline) |
| `/mdt:implement-agentic {CR-KEY} --prep` | Execute prep (refactoring) tasks |
| `/mdt:implement-agentic {CR-KEY} --part {X.Y}` | Target specific part |
| `/mdt:implement-agentic {CR-KEY} --continue` | Resume from last checkpoint |
| `/mdt:implement-agentic {CR-KEY} --task {N.N}` | Run specific task only |
| `/mdt:implement-agentic {CR-KEY} --strict` | **Per-task verification** (pre-verify + full post-verify + smoke test) |
| `/mdt:implement-agentic {CR-KEY} --batch {N}` | Override batch size (default: 3) |
| `/mdt:implement-agentic {CR-KEY} --no-smoke` | Skip behavioral smoke tests at batch boundaries |

**Default behavior (fast mode):**
- `--batch 3` — Post-verify after every 3 tasks (not per-task)
- `--reuse-baseline` — Skip pre-verify if cached baseline matches
- `--scoped-post` — Only run mapped tests for changed files
- **Feature mode**: Skip pre-verify entirely (TDD expects red tests)
- **Prep mode**: Pre-verify required (baseline must be green)

**Strict mode** restores conservative per-task verification for critical implementations.

---

## Checkpoint Schema (minimal)

Persist to `{TICKETS_PATH}/{CR-KEY}/.checkpoint.yaml`:

```yaml
checkpoint:
  version: 4
  cr_key: "{CR-KEY}"
  mode: "feature" | "prep"
  part: "{X.Y|null}"
  task_id: "{N.N}"
  step: "implement" | "post_verify" | "fix" | "complete_verify" | "complete_fix"
  # Batch tracking (fast mode)
  batch:
    size: 3  # configurable via --batch N
    current_count: 0  # tasks since last verify
    accumulated_files: []  # files changed in current batch
    all_clean: true  # false if any batch verify failed
  baseline:
    tests: {pre-verify result or null}  # null in feature mode
    scope: {pre-verify scope snapshot}
  implementation:
    files_changed: []
    files_created: []
    notes: ""
  latest_verify:
    tests: {post-verify result}
    scope: {post-verify result}
    behavioral: {post-verify smoke test result}
  fix_attempts: 0
  fix_history: []
  # Completion verification state
  completion:
    verification_round: 0 | 1 | 2
    last_verdict: "pass" | "partial" | "fail" | null
    issues_found: []           # Full issues array from verify-complete
    fix_tasks_generated: []    # IDs of fix tasks appended to tasks.md
    batch_verifies_clean: true  # enables completion verify optimizations
  updated_at: "{ISO8601}"
```

---

## Orchestrator Flow (high level)

**Fast mode (default):**
1. Load context (tasks/tests, mode/part, scope boundaries, shared imports, smoke_test_command).
2. Pre-verify (prep/strict only; feature mode skips).
3. Implement task.
4. Post-verify at batch boundary (every 3 tasks) or per-task if `--strict`.
5. Fix loop on failure (max 2 attempts).
6. Mark progress and advance to next task.
7. Completion verify after all tasks.
8. Post-verify fixes (if CRITICAL/HIGH issues).

---

## Step 1: Load Context (Orchestrator)

- Resolve mode and part.
- Load `tasks.md` and pick the first incomplete task (or target task).
- **Set CR status to In Progress**: `mcp__mdt-all__update_cr_status(project=PROJECT_CODE, key=CR-KEY, status="In Progress")`
- **Auto-generate `.tasks-status.yaml`** if missing: run `${CLAUDE_PLUGIN_ROOT}/scripts/gen-tasks-status.sh` with the path to `tasks.md`. This parses task headers and creates the tracker with all tasks as `pending`. No-op if the file already exists.
- **Create Claude Code task list** from tasks.md:
  - Read `{TICKETS_PATH}/{CR-KEY}/tasks.md`
  - Parse all `### Task N: {title}` headers (e.g., `### Task 1: Create user service`)
  - Extract the full task content from each header to the next `### Task` or end of file
  - For each task, use `TaskCreate` with:
    - `subject`: Task {N}: {title}
    - `description`: Full task content including Structure, Makes GREEN, Scope, Boundary, Create/Move, Exclude, Anti-duplication, Verify, Done when
    - `activeForm`: Working on Task {N}
  - This provides visibility into the implementation workflow
- Load `tests.md` to extract:
  - tests for the task
  - scope boundaries
  - shared imports / anti-duplication hints
- Derive `smoke_test_command` from requirements/BDD acceptance criteria.
  - If feature mode and smoke test is missing: warn and require explicit user choice to proceed.

---

## Step 2: Pre-Verify

**Default behavior:**
- **Feature mode**: SKIP pre-verify (TDD expects tests to be red initially)
- **Prep mode**: Required unless `--reuse-baseline` and cached baseline is valid
- **Strict mode**: Always pre-verify before each task

**When to run** (prep mode or `--strict`):

Use Task tool with subagent_type="mdt:verify" and prompt:

```yaml
operation: pre-check
mode: "feature" | "prep"
part:
  id: "{X.Y}"
  test_filter: "{filter}"
project:
  test_command: "{test_command}"
files_to_check: ["{file}"]
scope_boundaries: {from tasks/tests}
```

Expected verdicts from agent:
- `expected`
- `unexpected_green`
- `unexpected_red`

Decision:
- `expected` → implement
- `unexpected_green` → prompt user to skip/investigate
- `unexpected_red` → STOP (prep baseline broken)

---

## Step 3: Implement

Before launching the code agent:
- Check `.tasks-status.yaml` — if the current task's status is `blocked`, **skip it** and advance to the next task.
- Run: `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh {TRACKER_PATH} {TASK_ID} in_progress`

Use Task tool with subagent_type="mdt:code" and prompt:

```yaml
mode: "feature" | "prep"
project:
  source_dir: "{src}"
  extension: "{ext}"
part:
  id: "{X.Y}"
  title: "{part_title}"
scope_boundaries: {from tasks/tests}
shared_imports: {from tasks/tests}
task_spec:
  number: "{N.N}"
  title: "{task_title}"
  content: "{task_body}"
file_targets:
  - path: "{path}"
    exports: ["{export}"]
```

---

## Step 4: Post-Verify

**Default behavior (fast mode):**
- **Batch**: Defer verification until batch boundary (every 3 tasks by default)
- **Scoped**: Only run mapped tests for changed files (not full suite)
- **Smoke tests**: Run only at final batch unless `--strict` or `--no-smoke`

**When to run:**
- At batch boundary (tasks 3, 6, 9, ...) or final task
- After each task if `--strict` mode

Use Task tool with subagent_type="mdt:verify" and prompt:

```yaml
operation: post-check
mode: "feature" | "prep"
part:
  id: "{X.Y}"
  test_filter: "{filter}"
project:
  test_command: "{test_command}"
files_to_check: {accumulated files_changed from batch}
scope_boundaries: {from tasks/tests}
scoped: true  # default: only run mapped tests
smoke_test:
  command: "{smoke_test_command|empty}"  # only at final batch or --strict
  expected: "{expected_behavior|empty}"
```

Expected verdicts from agent:
- `all_pass`
- `tests_fail`
- `regression`
- `scope_breach`
- `duplication`
- `behavioral_fail`
- `skipped` (only if smoke test not provided)

Decision:
- `all_pass` → COMPLETE batch (scope OK or minor spillover)
- `tests_fail` or `regression` → FIX (if attempts < 2)
- `scope_breach` → STOP (or refactor out of band)
- `duplication` → STOP
- `behavioral_fail` → FIX (runtime context)
- `skipped` → warn and COMPLETE only if user approves

---

## Step 5: Fix Loop

Use Task tool with subagent_type="mdt:fix" and prompt:

```yaml
operation: fix
failure_context:
  verdict: "tests_fail" | "regression" | "behavioral_fail"
  failing_tests: ["test name or pattern"]
  error_output: "{truncated stderr, max 500 chars}"
  scope_issue: "{description if scope_breach or duplication, else null}"
task_spec:
  number: "{N.N}"
  title: "{task_title}"
files_changed: ["{paths from implementation}"]
attempt: 1 | 2
max_attempts: 2
```

Max 2 attempts per task. If fix fails twice:
1. Run: `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh {TRACKER_PATH} {TASK_ID} blocked`
2. STOP and surface the failure to the user

Similarly, if Step 4 returns `scope_breach` or `duplication`:
1. Run: `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh {TRACKER_PATH} {TASK_ID} blocked`
2. STOP — do not attempt fixes for scope violations

When all remaining tasks are `blocked`, the Stop hook allows clean exit. Report all blocked tasks with their failure reasons.

---

## Step 6: Mark Progress

After a task passes verification, update **all three** tracking files:

1. **`.checkpoint.yaml`**: advance `task_id`, reset `fix_attempts`, update `batch.current_count`
2. **`.tasks-status.yaml`**: Run `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh {TRACKER_PATH} {TASK_ID} done`
3. **`tasks.md`**: change `[ ]` → `[x]` for all checkboxes under the completed task's `**Done when**:` section

All three updates are mandatory before advancing to the next task.

---

## Step 7: Completion Verify

Run **after all tasks are complete** for the selected part or full ticket.

**Optimizations:**
- **Early exit**: If all batch post-verifies passed with `all_pass`, skip `test_command` (already validated)
- **Prep mode simplification**: Skip requirements traceability (no new requirements); only run mechanical checks
- **Parallel execution**: Run remaining commands concurrently (build/lint/typecheck)

Use Task tool with subagent_type="mdt:verify-complete" and prompt:

```yaml
cr_key: "{CR-KEY}"
mode: "feature" | "prep" | "bugfix" | "docs"
project:
  build_command: "{build_command or null}"
  test_command: "{test_command or null}"  # skip if all batch verifies passed
  lint_command: "{lint_command or null}"
  typecheck_command: "{typecheck_command or null}"
artifacts:
  cr_content: "{full CR markdown}"
  requirements: "{TICKETS_PATH}/{CR-KEY}/requirements.md content or null"  # null for prep mode
  tasks: "{TICKETS_PATH}/{CR-KEY}/tasks.md content}"
  bdd: "{TICKETS_PATH}/{CR-KEY}/bdd.md content or null}"  # null for prep mode
  architecture: "{TICKETS_PATH}/{CR-KEY}/architecture.md content or null}"
changed_files: [{files_changed across implementation}]
verification_round: 0 | 1 | 2
batch_verifies_clean: true | false  # enables early exit optimization
```

The agent performs:
1. **Mechanical checks**: Run provided commands (build, test, lint, typecheck) — **in parallel**
2. **Semantic analysis** (feature/bugfix only): Read requirements → search changed_files → verify implementation matches spec

Expected verdicts from agent:
- `pass`
- `partial`
- `fail`

Decision:
- `pass` → complete workflow
- `partial` or `fail` → evaluate issues list

---

## Step 8: Post-Verify Fixes

If verification returns any **CRITICAL** or **HIGH** issues:

1. Append a new section to `tasks.md`:

```markdown
## Post-Verify Fixes

### Fix PV-1: {Issue title}
**Evidence**: {path:line}
**Reason**: {severity} — {short details}
**Action**: {fix direction}
```

2. Execute only these fix tasks using the same per-task verify loop (Task tool with subagent_type="mdt:verify" and "mdt:fix").
3. Re-run Task tool with subagent_type="mdt:verify-complete" once.
4. If CRITICAL/HIGH remain after one re-run, STOP and recommend splitting into a follow-up CR.

MEDIUM/LOW issues:
- Append to `issues.md`
- Route to `/mdt:tech-debt` or a follow-up CR (do not block completion)

---

## Step 9: Final Completion

Before declaring completion, run the self-check:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/enforce-tasks.sh <<< '{"stop_hook_active": false, "cwd": "'"$(pwd)"'"}'
```
If it exits non-zero, tasks remain incomplete — do not proceed.

After all tasks pass and completion verification succeeds:

```markdown
═══════════════════════════════════════════
Implementation Complete: {CR-KEY}
═══════════════════════════════════════════

**Mode**: {feature | prep}

### Summary
| Part | Tasks | Tests | Status |
|------|-------|-------|--------|
| {part} | {done}/{total} | {N} GREEN | ✅ |

**Total**: {N} tasks, {N} tests GREEN

### Verification
- Batch verifies: {N} passed
- Completion verify: pass
- Fix rounds: {N}

### Next Steps
- [ ] Review flagged files
- [ ] `/mdt:tech-debt {CR-KEY}`
- [ ] Commit changes
```

After displaying the summary, ask user for confirmation before finalizing status:

```
AskUserQuestion: "Mark {CR-KEY} as Implemented?"
Options: [Yes (Recommended)] [No, keep In Progress]
```

If approved: `mcp__mdt-all__update_cr_status(project=PROJECT_CODE, key=CR-KEY, status="Implemented")`
If declined: leave status as "In Progress".

Then clean up ephemeral state files:
```bash
rm -f {TICKETS_PATH}/{CR-KEY}/.tasks-status.yaml
rm -f {TICKETS_PATH}/{CR-KEY}/.checkpoint.yaml
```

These are implementation-time artifacts. Once complete, they serve no purpose. The `--continue` flag only works during an active implementation — after Step 9, there's nothing to resume.

---

## Behavioral Rules

1. Orchestrator owns decisions; agents only report.
2. All agent responses must be JSON.
3. Always checkpoint after each step.
4. **Fast mode is default**: batch 3, scoped-post, reuse-baseline.
5. Prep mode never proceeds on unexpected RED baseline.
6. Max 2 fix attempts per task.
7. Completion verification is mandatory before declaring implementation complete.
8. Orchestrator MUST NOT edit code directly - all work done by agents.

---

## Integration

**Workflow position**:
```
Feature:     requirements → bdd → architecture → tests → tasks → implement-agentic
Refactoring: assess → bdd --prep → architecture --prep → tests --prep → tasks --prep → implement-agentic --prep
```

**Before**: `/mdt:tasks` creates tasks.md
**After**: `/mdt:tech-debt` catches remaining issues

---

Context: $ARGUMENTS
