---
name: mdt-pipeline-e2e
description: |
  Run a project-agnostic ticket lifecycle pipeline from discovery and specification
  through implementation, verification, review, and user-approved close. Use when
  asked to run the full pipeline, implement a ticket end to end, take a ticket to
  done, resume a lifecycle pipeline, or coordinate spec-to-code work with quality
  gates across any language or repository.
---

# Ticket Pipeline E2E

Run one ticket from intent to reviewed implementation. Own the control loop;
load project docs, project-local skills, references, and tools only when needed.

## Start Here

1. Read root instructions and ticket docs.
2. Run this skill's `scripts/discover_project.sh <repo-root> [ticket]` when
   shell access is available.
3. Resolve the ticket source, artifact directory, current status, and existing
   artifacts.
4. Write or update `.pipeline-state.json` in the ticket artifact directory.
5. Run baseline verification from project docs or discovered package scripts.
6. Start the milestone matrix below.

## Core Rules

- Prefer project docs over this generic skill for paths, commands, statuses,
  durable docs, and verification.
- Read `docs/SKILLS.md` when present before selecting helper skills.
- Do not hardcode MDT commands unless the project documents MDT or the user says
  "use MDT flow".
- Never close a ticket without explicit user approval.
- Keep the worktree scoped; never stash, reset, stage, or rewrite unrelated
  user changes.
- Record enough state on disk to resume after context loss.

## Discovery Record

Record this before milestone 1:

```text
Project docs: <files read>
Ticket source: <key/url/path/description>
Artifact directory: <path>
Ticket status model: <states and transition command, or none>
Workflow skills/tools: <project-local first, global fallback>
Language/runtime: <detected stack and selected references>
Verification commands: <baseline build/test/lint/docs commands>
Dirty worktree boundary: <unrelated files to avoid, or none>
```

State file shape:

```json
{
  "pipeline": "mdt-pipeline-e2e",
  "version": 4,
  "ticket": "<ticket key or source>",
  "currentMilestone": "pre-flight",
  "completedMilestones": [],
  "discovery": {},
  "artifacts": {},
  "baseline": {},
  "approvals": {},
  "commits": [],
  "updatedAt": "<ISO8601>"
}
```

## References

Load only what applies:

| Reference | Load when |
|-----------|-----------|
| `references/mdt-workflow.md` | User says "use MDT flow" or MDT stage skills are available |
| `references/ux-gate.md` | UI, interaction, content, visual, or durable design-doc changes |
| `references/ralph-loop.md` | Ralph tools or equivalent milestone protocol are available |
| `references/language-typescript.md` | TypeScript, JavaScript, Node, Bun, npm, pnpm, yarn, React |
| `references/language-python.md` | Python, Django, Flask, FastAPI, pytest, uv, Poetry |
| `references/language-rust.md` | Rust, Cargo, crates, clippy |
| `references/language-go.md` | Go modules, `go test`, `go vet` |

## Inputs

Accept a ticket key, issue URL, file path, or concise task description.

| Flag | Meaning |
|------|---------|
| `--from STAGE` | Resume after validating prior artifacts and state |
| `--skip STAGES` | Skip named milestones with a recorded reason |
| `--no-auto-close` | Stop before final status close |
| `--ux-force` | Run UX even when not auto-detected |
| `--ignore CHECKS` | Ignore checks only with user approval |
| `--language NAME` | Force a language reference when detection is ambiguous |

## Milestone Matrix

Default artifact names may be overridden by project docs.

| Milestone | Load | Write | Done when | Stop if |
|-----------|------|-------|-----------|---------|
| Pre-flight | Root docs, ticket docs, skill registry | `.pipeline-state.json` | Discovery, dirty boundary, baseline commands recorded | Ticket/artifact dir/status is unsafe to infer |
| Assess | `mdt:assess` if using MDT | `assess.md` | Scope, non-goals, risks, dependencies, confidence recorded | Scope is materially ambiguous |
| Requirements | `mdt:requirements` if using MDT | `requirements.md` | Functional needs, constraints, durable-doc impacts recorded | Required behavior is unknowable |
| Scenarios | `mdt:bdd` if using MDT | `bdd.md` or project equivalent | Acceptance examples are testable | Critical examples conflict |
| Architecture | `mdt:architecture` if using MDT | `architecture.md` | Owners, boundaries, data flow, migration, rollback recorded | Ownership or migration path is unsafe |
| UX | `references/ux-gate.md` | `ux-design.md` plus durable design docs when approved | UX draft reviewed; durable docs updated or skipped with reason | Required reviewer approval is missing |
| Tests | `mdt:tests` plus language reference | `tests.md` | Each requirement/scenario maps to exact verification | No credible verification path exists |
| Tasks | `mdt:tasks` if using MDT | `tasks.md` | Ordered tasks include scope, files, commands, expected result | Diff would be too broad for one ticket |
| Implement | Implementation skill, task refs | Code, docs, task/state updates | Required checks pass or exceptions are recorded | Dirty conflict, destructive action, or blocked check |
| Review | Changed files, artifacts, language refs | Review notes/state fixes | Blocking issues fixed and checks rerun | Data loss, security, missing tests, or architecture drift remains |
| Debt | `mdt:tech-debt` if useful | Debt notes in state or ticket | Blocking debt separated from follow-ups | Debt blocks correctness |
| User Review | Final artifacts and evidence | Close report | User approves close | User requests changes |

Skip a milestone only when project rules or ticket scope make it irrelevant.
Record the skipped milestone and reason in state.

## State Updates

After every milestone:

- Write the human artifact named in the matrix unless project docs override it.
- If a stage tool writes only a trace/projection file, also write the concise
  human artifact named in the matrix.
- Update `.pipeline-state.json`:
  - `currentMilestone` is the next pending milestone or `user-review`.
  - `completedMilestones` includes the finished milestone.
  - `artifacts` maps milestone names to written paths.
  - `baseline`, `approvals`, `commits`, and exceptions are current.
- Do not call a milestone complete until its state and artifact entries are
  written.

## Implementation Gates

- If implementing, move backlog/open/proposed work to the project's documented
  in-progress status before editing code.
- If no status system exists, record implementation start in state.
- Continue into implementation when the user asked to run end to end, implement,
  take the ticket to done, or use full autonomy.
- Pause only for planning-only requests, required approvals, unsafe inference,
  destructive actions, conflicting dirty worktree, or blocked verification.

Hard gates before review:

```text
Build/typecheck: <pass/fail/skipped> command=<...>
Tests:          <pass/fail/skipped> command=<...>
Lint/static:    <pass/fail/skipped> command=<...>
Docs/other:     <pass/fail/skipped> command=<...>
Known failures: <pre-existing or accepted exceptions>
```

## Close Report

```text
Ticket: <key>
Built: <short summary>
Artifacts: <spec/test/task/state files>
Changed code: <files>
Verification: <commands and results>
Known trade-offs: <deferred items>
Commits: <hashes, if any>
Approval needed: <yes/no>
```

On approval, use the project's documented close transition. Commit only when the
user requested commits or the project workflow requires them.

## Resume

For `--from STAGE`:

1. Read `.pipeline-state.json`.
2. Verify prior artifacts exist.
3. Check whether prior artifacts changed since recorded timestamp/hash.
4. Re-run cheap validation for stale artifacts.
5. Resume only after state is consistent.

If state is missing, reconstruct it from artifacts and git history. Ask only
when reconstruction is ambiguous or risky.
