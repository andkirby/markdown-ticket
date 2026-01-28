# MDT Agentic Implementation Orchestrator (v3)

Coordinate implementation tasks using specialized agents and checkpointed state.

**Core Principle**: Orchestrator owns state + decisions. Agents execute scoped work and return structured JSON.

## Orchestrator Constraints (MANDATORY)

You are a flow orchestrator. Your ONLY job is to launch subagents using the Task tool and relay their results.

**FORBIDDEN:**
- ❌ NEVER use Edit/Write/Bash tools directly
- ❌ NEVER use Task tool with general-purpose or other subagent types
- ❌ NEVER implement code yourself

**REQUIRED:**
- ✅ Use Task tool with subagent_type="mdt:verify" for pre/post checks
- ✅ Use Task tool with subagent_type="mdt:code" for implementation
- ✅ Use Task tool with subagent_type="mdt:fix" for fixing failures
- ✅ Use Task tool with subagent_type="mdt:verify-complete" for completion verification

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
  version: 3
  cr_key: "{CR-KEY}"
  mode: "feature" | "prep"
  part: "{X.Y|null}"
  task_id: "{N.N}"
  step: "pre_verify" | "implement" | "post_verify" | "fix" | "complete_verify" | "complete_fix"
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
  # Completion verification state
  completion:
    verification_round: 0 | 1 | 2
    last_verdict: "pass" | "partial" | "fail" | null
    issues_found: []           # Full issues array from verify-complete
    fix_tasks_generated: []    # IDs of fix tasks appended to tasks.md
  updated_at: "{ISO8601}"
```

---

## Orchestrator Flow (high level)

1. Load context (tasks/tests, mode/part, size limits, shared imports).
2. Derive `smoke_test_command` from requirements/BDD if available.
3. Pre-verify - Use Task tool with subagent_type="mdt:verify", operation=pre-check.
4. Implement - Use Task tool with subagent_type="mdt:code".
5. Post-verify - Use Task tool with subagent_type="mdt:verify", operation=post-check.
6. Fix loop on failure - Use Task tool with subagent_type="mdt:fix" with max 3 attempts.
7. Mark progress and advance.
8. Completion verify - Use Task tool with subagent_type="mdt:verify-complete" after all tasks complete.
9. Post-verify fix loop (if CRITICAL/HIGH issues).

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

## Step 2: Pre-Verify

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

## Step 3: Implement

Use Task tool with subagent_type="mdt:code" and prompt:

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

## Step 4: Post-Verify

Use Task tool with subagent_type="mdt:verify" and prompt:

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

## Step 5: Fix Loop

Use Task tool with subagent_type="mdt:fix" and prompt containing failure context and retry count.
Max 2 attempts per task.

---

## Step 6: Mark Progress

- Update `tasks.md`: mark task complete
- Update `tests.md`: mark tests GREEN
- Clear checkpoint or advance to next task

---

## Step 7: Completion Verify

Run **after all tasks are complete** for the selected part or full ticket.

Use Task tool with subagent_type="mdt:verify-complete" and prompt:

```yaml
cr_key: "{CR-KEY}"
mode: "feature" | "prep" | "bugfix" | "docs"
project:
  build_command: "{build_command or null}"
  test_command: "{test_command or null}"
  lint_command: "{lint_command or null}"
  typecheck_command: "{typecheck_command or null}"
artifacts:
  cr_content: "{full CR markdown}"
  requirements: "{TICKETS_PATH}/{CR-KEY}/requirements.md content or null"
  tasks: "{TICKETS_PATH}/{CR-KEY}/tasks.md content}"
  bdd: "{TICKETS_PATH}/{CR-KEY}/bdd.md content or null}"
changed_files: [{files_changed across implementation}]
verification_round: 0 | 1 | 2
```

The agent performs:
1. **Mechanical checks**: Run provided commands (build, test, lint, typecheck)
2. **Semantic analysis**: Read requirements → search changed_files → verify implementation matches spec

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

## Behavioral Rules

1. Orchestrator owns decisions; agents only report.
2. All agent responses must be JSON.
3. Always checkpoint after each step.
4. Feature mode requires behavioral verification unless user explicitly skips.
5. Prep mode never proceeds on unexpected RED baseline.
6. Max 2 fix attempts per task.
7. Completion verification is mandatory before declaring implementation complete.
8. Orchestrator MUST NOT edit code directly - all work done by agents.

---

Context: $ARGUMENTS
