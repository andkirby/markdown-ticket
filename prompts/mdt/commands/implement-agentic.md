# MDT Agentic Implementation Orchestrator (v2)

Coordinate implementation tasks using specialized agents and checkpointed state.

**Core Principle**: Orchestrator owns state + decisions. Agents execute scoped work and return structured JSON.

## User Input

```text
$ARGUMENTS
```

## Required Inputs

- `{TICKETS_PATH}/{CR-KEY}/tasks.md`
- `{TICKETS_PATH}/{CR-KEY}/tests.md`
- Optional: `{TICKETS_PATH}/{CR-KEY}/requirements.md`, `{TICKETS_PATH}/{CR-KEY}/bdd.md`

## Agent Call Paths

- `@mdt:verify`
- `@mdt:code`
- `@mdt:fix`

## Execution Modes

| Command | Behavior |
|---------|----------|
| `/mdt:implement-agentic {CR-KEY}` | Interactive — auto-detect part or prompt |
| `/mdt:implement-agentic {CR-KEY} --prep` | Execute prep (refactoring) tasks |
| `/mdt:implement-agentic {CR-KEY} --part {X.Y}` | Target specific part |
| `/mdt:implement-agentic {CR-KEY} --continue` | Resume from last checkpoint |
| `/mdt:implement-agentic {CR-KEY} --task {N.N}` | Run specific task only |

---

## Checkpoint Schema (minimal)

Persist to `{TICKETS_PATH}/{CR-KEY}/.checkpoint.json`:

```yaml
checkpoint:
  version: 2
  cr_key: "{CR-KEY}"
  mode: "feature" | "prep"
  part: "{X.Y|null}"
  task_id: "{N.N}"
  step: "pre_verify" | "implement" | "post_verify" | "fix"
  baseline:
    tests: {pre-verify result}
    sizes: {pre-verify size snapshot}
  implementation:
    files_changed: []
    files_created: []
    notes: ""
  latest_verify:
    tests: {post-verify result}
    sizes: {post-verify result}
    behavioral: {post-verify smoke test result}
  fix_attempts: 0
  fix_history: []
  updated_at: "{ISO8601}"
```

---

## Orchestrator Flow (high level)

1. Load context (tasks/tests, mode/part, size limits, shared imports).
2. Derive `smoke_test_command` from requirements/BDD if available.
3. Pre-verify (@mdt:verify agent, operation=pre-check).
4. Implement (@mdt:code agent).
5. Post-verify (@mdt:verify agent, operation=post-check).
6. Fix loop on failure (@mdt:fix agent) with max 3 attempts.
7. Mark progress and advance.

---

## Step 1: Load Context (Orchestrator)

- Resolve mode and part.
- Load `tasks.md` and pick the first incomplete task (or target task).
- Load `tests.md` to extract:
  - tests for the task
  - size limits
  - shared imports / anti-duplication hints
- Derive `smoke_test_command` from requirements/BDD acceptance criteria.
  - If feature mode and smoke test is missing: warn and require explicit user choice to proceed.

---

## Step 2: Pre-Verify (`@mdt:verify (agent)`)

Call `@mdt:verify (agent)` with:

```yaml
operation: pre-check
mode: "feature" | "prep"
part:
  id: "{X.Y}"
  test_filter: "{filter}"
project:
  test_command: "{test_command}"
files_to_check: ["{file}"]
size_limits: {from tasks/tests}
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

## Step 3: Implement (`@mdt:code (agent)`)

Call `@mdt:code (agent)` with:

```yaml
mode: "feature" | "prep"
project:
  source_dir: "{src}"
  extension: "{ext}"
part:
  id: "{X.Y}"
  title: "{part_title}"
size_constraints: {from tasks/tests}
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

## Step 4: Post-Verify (`@mdt:verify (agent)`)

Call `@mdt:verify (agent)` with:

```yaml
operation: post-check
mode: "feature" | "prep"
part:
  id: "{X.Y}"
  test_filter: "{filter}"
project:
  test_command: "{test_command}"
files_to_check: {files_changed from code-agent}
size_limits: {from tasks/tests}
smoke_test:
  command: "{smoke_test_command|empty}"
  expected: "{expected_behavior|empty}"
```

Expected verdicts from agent:
- `all_pass`
- `tests_fail`
- `regression`
- `size_stop`
- `duplication`
- `behavioral_fail`
- `skipped` (only if smoke test not provided)

Decision:
- `all_pass` → COMPLETE (FLAG size is OK with warning)
- `tests_fail` or `regression` → FIX (if attempts < 2)
- `size_stop` → STOP (or refactor out of band)
- `duplication` → STOP
- `behavioral_fail` → FIX (runtime context)
- `skipped` → warn and COMPLETE only if user approves

---

## Step 5: Fix Loop (`@mdt:fix (agent)`)

Call `@mdt:fix (agent)` with failure context and retry count.
Max 2 attempts per task.

---

## Step 6: Mark Progress

- Update `tasks.md`: mark task complete
- Update `tests.md`: mark tests GREEN
- Clear checkpoint or advance to next task

---

## Behavioral Rules

1. Orchestrator owns decisions; agents only report.
2. All agent responses must be JSON.
3. Always checkpoint after each step.
4. Feature mode requires behavioral verification unless user explicitly skips.
5. Prep mode never proceeds on unexpected RED baseline.
6. Max 2 fix attempts per task.

---

Context: $ARGUMENTS
