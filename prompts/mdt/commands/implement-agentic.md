---
name: implement-agentic
description: Execute with agent-based verification
argument-hint: "{CR-KEY} [--prep] [--part X.Y] [--continue] [--task N.N] [--strict] [--batch N]"
allowed-tools:
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/gen-tasks-status.sh:*)
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh:*)
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/enforce-tasks.sh:*)
  - Bash(*test*:*)
  - Bash(*jest*:*)
  - Bash(*vitest*:*)
  - Bash(*playwright*:*)
  - Bash(*bun test*:*)
---

# MDT Agentic Implementation Orchestrator (v6)

Coordinate implementation tasks using specialized agents and checkpointed state.

**Core Principle**: Team lead owns state + decisions. Code agent self-verifies (writes + runs tests). Team lead validates deliverables and catches cross-task regressions.

## Orchestrator Role (MANDATORY)

You are a **team lead** coordinating implementation agents. Your job is to ensure each agent has sufficient context to succeed, validate their deliverables, and maintain project integrity across tasks.

**FORBIDDEN:**
- ❌ NEVER use Edit/Write tools directly for code changes
- ❌ NEVER use Task tool with general-purpose or other subagent types
- ❌ NEVER implement code yourself
- ❌ NEVER mark a task `done` without `verify_result` showing all exit codes = 0

**REQUIRED:**
- ✅ Use Task tool with subagent_type="mdt:verify" for regression + scope checks (batch level)
- ✅ Use Task tool with subagent_type="mdt:code" for implementation (agent self-verifies)
- ✅ Use Task tool with subagent_type="mdt:fix" for cross-task regressions only
- ✅ Use Task tool with subagent_type="mdt:verify-complete" for completion verification
- ✅ Validate every code agent response: `skills_loaded`, `verify_result`, `success`

**ALLOWED Bash:**
- ✅ `${CLAUDE_PLUGIN_ROOT}/scripts/gen-tasks-status.sh` — generate tracker if missing
- ✅ `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh` — update task status by ID
- ✅ `${CLAUDE_PLUGIN_ROOT}/scripts/enforce-tasks.sh` — self-check before completion
- ✅ Test/verify commands (spot-check) — re-run one verify command to validate code agent output

## User Input

```text
$ARGUMENTS
```

## Required Inputs

- `{tasks_file}` resolved from mode:
  - prep: `{TICKETS_PATH}/{CR-KEY}/prep/tasks.md`
  - part: `{TICKETS_PATH}/{CR-KEY}/part-{X.Y}/tasks.md`
  - single: `{TICKETS_PATH}/{CR-KEY}/tasks.md`
- `{tests_file}` resolved from mode:
  - prep: `{TICKETS_PATH}/{CR-KEY}/prep/tests.md`
  - part: `{TICKETS_PATH}/{CR-KEY}/part-{X.Y}/tests.md`
  - single: `{TICKETS_PATH}/{CR-KEY}/tests.md`
- `{architecture_file}` resolved from mode:
  - prep: `{TICKETS_PATH}/{CR-KEY}/prep/architecture.md`
  - feature/bugfix/docs: `{TICKETS_PATH}/{CR-KEY}/architecture.md`
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

Persist to `{checkpoint_path}` where `{checkpoint_path} = {ticket_dir}/.checkpoint.yaml` and `{ticket_dir} = {TICKETS_PATH}/{CR-KEY}`:

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
3. Implement task (code agent writes + self-verifies up to 3 attempts).
4. Team lead validates code agent output (skills, verify_result, drift).
5. Post-verify at batch boundary — regression + scope check (every 3 tasks) or per-task if `--strict`.
6. Fix loop only if: (a) code agent exhausted 3 attempts, or (b) batch verify finds regression.
7. Mark progress — hard gate: only after verified GREEN.
8. Completion verify after all tasks.
9. Post-verify fixes (if CRITICAL/HIGH issues).

---

## Step 1: Load Context (Orchestrator)

- Resolve mode and part.
- Derive paths from mode:
  - `ticket_dir = {TICKETS_PATH}/{CR-KEY}`
  - `tasks_file`, `tests_file`, `architecture_file`
  - `execution_dir` (directory of `tasks_file`)
  - `tracker_path = {execution_dir}/.tasks-status.yaml`
  - `checkpoint_path = {ticket_dir}/.checkpoint.yaml`
- Load `{tasks_file}` and pick the first incomplete task (or target task).
- **Set CR status to In Progress**: `mcp__mdt-all__update_cr_status(project=PROJECT_CODE, key=CR-KEY, status="In Progress")`
- **Auto-generate `.tasks-status.yaml`** if missing: run `${CLAUDE_PLUGIN_ROOT}/scripts/gen-tasks-status.sh` with `{tasks_file}`. This parses task headers and creates the tracker with all tasks as `pending`. No-op if the file already exists.
- **Create Claude Code task list** from tasks.md:
  - Read `{tasks_file}`
  - Parse all `### Task N: {title}` headers (e.g., `### Task 1: Create user service`)
  - Extract the full task content from each header to the next `### Task` or end of file
  - For each task, use `TaskCreate` with:
    - `subject`: Task {N}: {title}
    - `description`: Full task content including Structure, Makes GREEN, Scope, Boundary, Creates, Modifies, Must Not Touch, Create/Move, Exclude, Anti-duplication, Duplication Guard, Verify, Done when
    - `activeForm`: Working on Task {N}
  - This provides visibility into the implementation workflow
- Load `{tests_file}` to extract:
  - tests for the task
  - scope boundaries
  - shared imports / anti-duplication hints
- **Runtime Probe (BLOCKING)**: Before implementing any task, verify that the project runtime is actually executable, not just that binaries exist.
  - Extract Verify commands from `{tasks_file}` (prefer Task 0 when present, then include one representative command per command family used by other tasks).
  - Run each selected command as written.
  - Classify failures:
    - **Infrastructure failure (BLOCKING)**: command cannot start due to missing runtime/dependencies/config (examples: command not found, module/package not found, missing config/manifest, missing script, ENOENT, no such file).
    - **Behavioral/test failure (NON-BLOCKING for this step)**: command runs but tests/assertions fail.
  - If ANY infrastructure failure is found → **STOP** with: "Runtime infrastructure is not functional for `{command}`: `{error}`. Fix infrastructure before implementation."
  - If commands execute but tests fail, continue (feature mode expects RED before implementation; prep/strict baseline handling is still enforced in pre-verify).

- Parse each task's **Makes GREEN (unit)**, **Makes GREEN (BDD)**, and **Verify** sections:
  - `task_tests.makes_green_unit`: list of unit/integration tests from **Makes GREEN (unit)**
  - `task_tests.makes_green_bdd`: list of BDD scenarios from **Makes GREEN (BDD)** (milestone checkpoint tasks only)
  - `task_tests.verify_commands`: list of commands in the **Verify** block (code fence)
  - If a task has **Makes GREEN** entries but **Verify** is missing or empty, **STOP** and require tasks.md update before implementation.
- Load architecture invariants from architecture.md:
  - `one transition authority`
  - `one processing orchestration path`
  - `no test-only logic in runtime files`
  - canonical runtime flow + owner module for each critical behavior
- Build `behavior_owner_ledger` from architecture.md (`behavior -> owner module`).
  - If architecture.md lacks explicit owners or canonical flows for critical behaviors, **STOP** and require `/mdt:architecture` update before implementation.
- Parse **Milestones** table from `{tasks_file}` (if present):
  - `milestones`: list of `{id, name, bdd_scenarios, tasks, checkpoint_command}`
  - Track current milestone — when its last task completes, run the milestone checkpoint
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
architecture_invariants:
  transition_authority: "{owner}"
  orchestration_path: "{path}"
  no_test_logic_in_runtime: true
behavior_owner_ledger: {behavior -> owner module}
```

Expected verdicts from agent:
- `expected`
- `unexpected_green`
- `unexpected_red`
- `invariant_violation`

Decision:
- `expected` → implement
- `unexpected_green` → prompt user to skip/investigate
- `unexpected_red` → STOP (prep baseline broken)
- `invariant_violation` → STOP (architecture drift before coding)

---

## Step 3: Implement

Before launching the code agent:
- Check `{tracker_path}` — if the current task's status is `blocked`, **skip it** and advance to the next task.
- Run: `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh {tracker_path} {TASK_ID} in_progress`
- Enforce owner guard from `behavior_owner_ledger`:
  - If task scope overlaps a behavior owned by another module, require an explicit merge/refactor task before proceeding.

Read the current task's `skills` field from `{tracker_path}`. If present, pass it to the code agent as `required_skills`. The orchestrator does NOT invoke skills itself — it only forwards the names.

Use Task tool with subagent_type="mdt:code" and prompt:

```yaml
mode: "feature" | "prep"
project:
  source_dir: "{src}"
  extension: "{ext}"
required_skills: ["skill-name"]  # from .tasks-status.yaml skills field; omit if empty
part:
  id: "{X.Y}"
  title: "{part_title}"
scope_boundaries: {from tasks/tests}
shared_imports: {from tasks/tests}
task_spec:
  number: "{N.N}"
  title: "{task_title}"
  content: "{task_body}"
task_tests:
  makes_green: {from task's **Makes GREEN** section}
  verify_commands: {from task's **Verify** block}
architecture:
  invariants:
    - one transition authority
    - one processing orchestration path
    - no test-only logic in runtime files
  behavior_owners: {behavior_owner_ledger}
file_targets:
  - path: "{path}"
    exports: ["{export}"]
```

### Team Lead Validation (after code agent returns)

The code agent now self-verifies: it writes code, runs `verify_commands`, and iterates up to 3 times. The orchestrator MUST validate the response before accepting it.

**Gate 1 — Skills loaded**:
- If `required_skills` was sent, check that `skills_loaded` in the response matches `required_skills`.
- If mismatch (missing skills) → **reject** the result. Mark task `blocked`. STOP.
- If `required_skills` was empty/omitted, skip this gate.

**Gate 2 — Tests actually ran**:
- Check that `verify_result.commands_run` is non-empty.
- If empty → **reject** the result. The agent did not run tests. Mark task `blocked`. STOP.
- **Spot-check**: Pick one command from `verify_result.commands_run` and re-run it independently using Bash. Compare the exit code with what the agent reported. If mismatch → treat the entire result as fabricated. Mark task `blocked`. STOP.

**Gate 3 — Tests GREEN**:
- If `success: true` → check all `verify_result.commands_run[].exit_code` are 0.
- If any exit_code ≠ 0 despite `success: true` → treat as inconsistent. Mark task `blocked`. STOP.
- If `success: false` with `error: "TESTS_RED"` → enter fix flow (Step 5) with the actual `verify_result` output.
- If `success: false` with other errors (`SCOPE_BREACH`, `MISSING_CONTEXT`, `INVARIANT_CONFLICT`, `SKILL_LOAD_FAILED`) → mark task `blocked`. STOP.

**Gate 4 — Drift check** (from `drift_report`):
- If `second_owner_detected=true`, mark task `blocked` and **STOP**.
- If `duplicate_runtime_path=true`, mark task `blocked` and **STOP**.
- If `test_runtime_mixing=true`, mark task `blocked` and **STOP**.

Only after ALL gates pass → proceed to mark progress (Step 6).

---

## Step 4: Post-Verify (Regression + Scope Check)

The code agent already verified its own task tests. Post-verify now focuses on **cross-task regression and scope integrity** at batch boundaries.

**Default behavior (fast mode):**
- **Batch**: Run at batch boundary (every 3 tasks by default)
- **Scoped**: Only run mapped tests for changed files (not full suite)
- **Smoke tests**: Run only at final batch unless `--strict` or `--no-smoke`

**When to run:**
- At batch boundary (tasks 3, 6, 9, ...) or final task
- After each task if `--strict` mode
- **At milestone boundary**: when the current task is the last task in a milestone (from Milestones table), run the milestone's BDD checkpoint command in addition to unit test verification. If the BDD checkpoint fails, enter the fix loop for the milestone's BDD scenarios.

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
verification_strategy:
  order:
    - "risk-first: invariant tests + failure-mode tests"
    - "then breadth: mapped suite/full suite per mode"
architecture_invariants:
  transition_authority: "{owner}"
  orchestration_path: "{path}"
  no_test_logic_in_runtime: true
behavior_owner_ledger: {behavior_owner_ledger}
smoke_test:
  command: "{smoke_test_command|empty}"  # only at final batch or --strict
  expected: "{expected_behavior|empty}"
```

**Note:** `required_commands` is no longer sent — the code agent already ran task-level verify commands. Post-verify focuses on the full/mapped test suite for regression detection.

Expected verdicts from agent:
- `all_pass`
- `tests_fail`
- `regression`
- `scope_breach`
- `duplication`
- `behavioral_fail`
- `skipped` (only if smoke test not provided)
- `invariant_violation`
- `duplicate_runtime_path`
- `test_runtime_mixing`

Decision:
- `all_pass` → COMPLETE batch (scope OK or minor spillover)
- `tests_fail` or `regression` → FIX (if attempts < 2)
- `scope_breach` → STOP (or refactor out of band)
- `duplication` → STOP
- `behavioral_fail` → FIX (runtime context)
- `skipped` → warn and COMPLETE only if user approves
- `invariant_violation` or `duplicate_runtime_path` → STOP
- `test_runtime_mixing` → STOP (separate runtime from test scaffolding)

---

## Step 5: Fix Loop

Fix is needed in two scenarios:
- **(a) Code agent returns `TESTS_RED`** after 3 self-fix attempts — pass the actual `verify_result` output to `mdt:fix`.
- **(b) Batch post-verify finds regression** — standard regression fix flow.

Use Task tool with subagent_type="mdt:fix" and prompt:

```yaml
operation: fix
failure_context:
  verdict: "tests_fail" | "regression" | "behavioral_fail"
  failing_tests: ["test name or pattern"]
  error_output: "{truncated stderr, max 500 chars}"
  scope_issue: "{description if scope_breach or duplication, else null}"
  verify_commands: {from task's **Verify** block — explicit, top-level}
  # For scenario (a): include the code agent's last verify output for error context
  code_agent_verify_result: {verify_result from code agent response, or null}
task_spec:
  number: "{N.N}"
  title: "{task_title}"
files_changed: ["{paths from implementation}"]
attempt: 1 | 2
max_attempts: 2
```

Max 2 attempts per task. If fix fails twice:
1. Run: `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh {tracker_path} {TASK_ID} blocked`
2. STOP and surface the failure to the user

Similarly, if Step 4 returns `scope_breach` or `duplication`:
1. Run: `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh {tracker_path} {TASK_ID} blocked`
2. STOP — do not attempt fixes for scope violations

When all remaining tasks are `blocked`, the Stop hook allows clean exit. Report all blocked tasks with their failure reasons.

---

## Step 6: Mark Progress

**Hard gate**: NEVER mark a task `done` without the code agent's `verify_result` showing all `exit_code = 0`. If the code agent returned `success: false`, the task MUST go through the fix loop (Step 5) first, or be marked `blocked`.

After a task passes verification (code agent `success: true` + all gates passed), update **all three** tracking files:

1. **`.checkpoint.yaml`** at `{checkpoint_path}`: advance `task_id`, reset `fix_attempts`, update `batch.current_count`
2. **`.tasks-status.yaml`** at `{tracker_path}`: Run `${CLAUDE_PLUGIN_ROOT}/scripts/update-task-status.sh {tracker_path} {TASK_ID} done`
3. **`tasks.md`** at `{tasks_file}`: change `[ ]` → `[x]` for all checkboxes under the completed task's `**Done when**:` section

All three updates are mandatory before advancing to the next task.

---

## Step 7: Completion Verify

Run **after all tasks are complete** for the selected part or full ticket.

**Optimizations:**
- **Early exit**: If all batch post-verifies passed with `all_pass` **and** no `bdd.md` exists, you may skip `test_command` (already validated)
- **Prep mode simplification**: Skip requirements traceability (no new requirements); only run mechanical checks
- **Parallel execution**: Run remaining commands concurrently (build/lint/typecheck)

**Acceptance gate (feature mode)**:
- If `bdd.md` exists: run the E2E command from bdd.md and require all scenarios GREEN.
- If no E2E command is defined in bdd.md: **STOP** and ask the user to supply it or regenerate `/mdt:bdd`.
- If acceptance tests fail: **STOP**, fix, re-run.

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
  tasks: "{tasks_file content}"
  bdd: "{TICKETS_PATH}/{CR-KEY}/bdd.md content or null}"  # null for prep mode
  architecture: "{architecture_file content or null}"
changed_files: [{files_changed across implementation}]
verification_round: 0 | 1 | 2
batch_verifies_clean: true | false  # enables early exit optimization
architecture_invariants:
  transition_authority: "{owner}"
  orchestration_path: "{path}"
  no_test_logic_in_runtime: true
behavior_owner_ledger: {behavior_owner_ledger}
```

The agent performs:
1. **Risk-based checks first**: invariant-related and failure-mode checks from tasks/tests
2. **Mechanical checks**: Run provided commands (build, test, lint, typecheck) — **in parallel**
3. **Semantic analysis** (feature/bugfix only): Read requirements → search changed_files → verify implementation matches spec and invariant compliance

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
${CLAUDE_PLUGIN_ROOT}/scripts/enforce-tasks.sh <<< '{"stop_hook_active": false, "cwd": "'"$(pwd)"'", "tracker_path": "{tracker_path}"}'
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
- Invariant compliance: {pass|fail} (transition authority + orchestration path)
- Duplicate-path check: {pass|fail}
- Test/runtime separation check: {pass|fail}

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
rm -f {tracker_path}
rm -f {checkpoint_path}
```

These are implementation-time artifacts. Once complete, they serve no purpose. The `--continue` flag only works during an active implementation — after Step 9, there's nothing to resume.

---

## Behavioral Rules

1. Team lead owns decisions; code agent self-verifies; verify agent catches regressions.
2. All agent responses must be JSON.
3. Always checkpoint after each step.
4. **Fast mode is default**: batch 3, scoped-post, reuse-baseline.
5. Prep mode never proceeds on unexpected RED baseline.
6. Code agent gets 3 self-fix attempts; orchestrator fix loop adds 2 more for cross-task issues.
7. Completion verification is mandatory before declaring implementation complete.
8. Orchestrator MUST NOT edit code directly — all work done by agents.
9. Validate architecture invariants before coding; do not proceed on drift.
10. If a second logic owner appears for a behavior, STOP and block task.
11. Verification order is risk-first (invariants/failure modes), then breadth.
12. **NEVER mark a task `done` without `verify_result` showing exit_code 0** — this is the hardest gate.
13. Always validate `skills_loaded` matches `required_skills` before accepting code agent output.

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
