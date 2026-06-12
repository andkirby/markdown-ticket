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

Run one ticket from intent to reviewed implementation. Keep the workflow
project-agnostic: discover local conventions first, then use the repository's own
tools, docs, skill index, commands, ticket system, and language stack.

## Core Rules

- Read project instructions before acting: root agent docs, ticket docs, and the
  project-local skill index if present.
- If `docs/SKILLS.md` exists, read it before selecting helper skills. Treat it as
  project-local guidance, not a required file for every repository.
- Use local ticket, trace, and CLI tools when available. Do not hardcode MDT-only
  commands unless the target project explicitly documents them.
- Never auto-close without explicit user approval.
- Keep the working tree scoped. Do not stash, reset, or stage unrelated changes.
- Record state on disk so the pipeline can resume after context loss.

## References

Load only the references needed for the current run:

| Reference | When to read |
|-----------|--------------|
| `references/ralph-loop.md` | Ralph tools or protocol are available in the host app |
| `references/language-typescript.md` | TypeScript, JavaScript, Node, Bun, npm, pnpm, yarn, React |
| `references/language-python.md` | Python, Django, Flask, FastAPI, pytest, uv, Poetry |
| `references/language-rust.md` | Rust, Cargo, crates, clippy |
| `references/language-go.md` | Go modules, `go test`, `go vet` |

If Ralph is not available, use ordinary planning wording: "milestone started",
"milestone complete", and "next milestone".

## Pipeline Shape

Use these milestones. Skip a milestone only when local project instructions or
ticket scope make it irrelevant.

| # | Milestone | Purpose |
|---|-----------|---------|
| 0 | Pre-flight | Discover project, ticket, state, tools, dirty tree, baseline |
| 1 | Assess | Clarify scope, risk, dependencies, non-goals |
| 2 | Requirements | Define required behavior and constraints |
| 3 | Scenarios | Capture acceptance scenarios or equivalent examples |
| 4 | Architecture | Decide ownership, boundaries, data flow, migration path |
| 5 | UX Design | Only for user-facing UI or interaction changes |
| 6 | Tests | Map requirements/scenarios to verification commands and files |
| 7 | Tasks | Produce ordered, scoped implementation tasks |
| 8 | Implement | Execute tasks with TDD or equivalent verification discipline |
| 9 | Review | Review diff against requirements, architecture, and tests |
| 10 | Debt | Identify blocking structural debt and deferred follow-ups |
| 11 | User Review | Present evidence, handle changes, close only on approval |

## Inputs

Accept a ticket key, issue URL, file path, or concise task description.

Common flags:

| Flag | Meaning |
|------|---------|
| `--from STAGE` | Resume from a milestone after validating prior state |
| `--skip STAGES` | Skip named milestones with a short recorded reason |
| `--no-auto-close` | Stop before status close; closing still requires approval |
| `--ux-force` | Run UX design even if UI is not auto-detected |
| `--ignore CHECKS` | Ignore specific pre-flight checks only when user approved |
| `--language NAME` | Force a language reference when auto-detection is ambiguous |

## Pre-Flight

1. Discover project context:
   - Read root instructions such as `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, or equivalent.
   - Read `docs/SKILLS.md` if present.
   - Read ticket-system docs or CLI docs before mutating ticket state.
   - Detect package files: `package.json`, `pyproject.toml`, `Cargo.toml`,
     `go.mod`, or project-specific manifests.
2. Identify language references to load. Prefer project docs over generic refs.
3. Resolve ticket source, artifact directory, current status, and existing spec files.
4. Create or update a state file in the ticket artifact directory:

```json
{
  "pipeline": "mdt-pipeline-e2e",
  "version": 2,
  "ticket": "<ticket key or source>",
  "currentMilestone": "pre-flight",
  "completedMilestones": [],
  "baseline": {},
  "approvals": {},
  "commits": [],
  "updatedAt": "<ISO8601>"
}
```

5. Inspect git state:
   - Run tracked and untracked status checks.
   - If unrelated changes exist, leave them untouched and record the boundary.
   - If conflicting changes block the task, stop and ask.
6. Run baseline commands from project docs. If undocumented, infer cautiously from
   manifests and loaded language references.

Baseline record:

```text
Build: <pass/fail/skipped> command=<...>
Tests: <pass/fail/skipped> command=<...>
Lint:  <pass/fail/skipped> command=<...>
Known pre-existing failures: <summary>
```

## Milestone Contract

For each milestone:

1. Load only the project docs, workflow skills, and language references needed.
2. Read all prior artifacts from disk; do not rely on conversation memory.
3. Produce or update the milestone artifact in the ticket artifact directory.
4. Self-review for completeness, traceability, and consistency.
5. Update the pipeline state file with:
   - milestone name,
   - artifact paths,
   - verification evidence,
   - skipped or deferred items,
   - user approvals when relevant.

When Ralph tools exist, follow `references/ralph-loop.md` for milestone start and
finish calls. Otherwise, report concise milestone progress in normal text.

## Spec Milestones

Keep artifacts concise and traceable.

Assess:
- Define scope, non-goals, dependencies, risks, and implementation confidence.

Requirements:
- Capture functional requirements, non-functional constraints, and durable docs
  that may need updates.

Scenarios:
- Write acceptance examples in the project's preferred form: BDD, examples,
  fixtures, API contracts, screenshots, or CLI transcripts.

Architecture:
- Define behavior owners, module boundaries, data flow, storage/API changes,
  error handling, migration strategy, and rollback/compatibility constraints.
- For backend or shared logic, name the owning layer and consumers.
- For UI, include state transitions and accessibility/responsive constraints.

UX Design:
- Run only for UI, interaction, content, or visual changes unless forced.
- Select the UX skill from the project skill registry first. If no project UX
  skill is documented, use the global UX designer/specifier skill. Use wireframe
  skills only when a visual sketch, state diagram, or layout mockup reduces
  ambiguity.
- Treat UX skills as design-content helpers. The pipeline owns reading the
  ticket, writing the ticket-local UX artifact, and updating durable docs.
- First write a ticket-local UX artifact such as `ux-design.md` for proposed
  flows, alternatives, state tables, and implementation notes.
- Before durable docs are updated, run a reviewer gate. Prefer a project UX
  reviewer skill or reviewer role if the registry provides one; otherwise use an
  independent review pass with the selected UX skill. Human review is optional
  unless the project requires it.
- The reviewer must approve the ticket-local UX draft or request revisions.
  Record reviewer identity, verdict, required changes, and approval evidence in
  the ticket-local UX artifact and pipeline state.
- Only after approval, update durable design documentation before moving to
  Tests or Tasks. If no durable doc is needed, record the reason in the
  ticket-local UX artifact.
- Keep durable docs focused on final surface behavior, states, interaction
  contracts, accessibility, and responsive expectations.

Tests:
- Map each requirement and scenario to concrete verification.
- Prefer exact commands and file paths.
- Mark expected RED/GREEN state before implementation.

Tasks:
- Order tasks so each has a clear scope, owned files, verification command, and
  expected behavior change.
- Split large tickets into parts when a single diff would be hard to review.

Pause before implementation unless the user explicitly requested full autonomy.
Summarize artifacts, key decisions, and verification plan.

## Status Transitions

When the agent starts implementation work with intent to implement the ticket,
move the ticket from backlog/open/proposed into the project's documented
in-progress status before editing code. Use the local ticket CLI, tracker API,
or issue system documented by the project.

Rules:
- Do this after the spec checkpoint when the user approves implementation.
- If the user explicitly requested full autonomy, do it before the first
  implementation task.
- If a project distinguishes "open" from "in progress", prefer "in progress"
  once code/spec implementation has started.
- If no status system exists, record the milestone in the pipeline state file
  instead of inventing a status.

## Implementation

Use the repository's implementation skill or workflow when one exists.

General implementation rules:
- Follow task order.
- Prefer TDD or an equivalent pre/post verification loop.
- Use exact commands from task artifacts or project docs.
- Do not broaden scope without recording why.
- Update task checkboxes or trace records only after evidence passes.
- Update durable docs when behavior, commands, architecture, or user workflows change.
- If implementation changes the agreed UX behavior, update both the ticket-local
  UX artifact and durable design docs before review.

Hard gates before leaving implementation:
- Required build/typecheck passes or the documented equivalent is satisfied.
- Required tests pass, except recorded pre-existing failures.
- Required lint/format/static checks pass or documented exceptions are recorded.

## Review

Review changed files against:

- Ticket requirements and scenarios.
- Architecture decisions and ownership boundaries.
- Test plan coverage.
- Language-specific failure modes from loaded references.
- Project-specific style and docs.

Block close on:
- Logic bugs, data loss, race conditions, security regressions, resource leaks,
  missing required tests, or architecture drift.
- Unexplained broad diffs.
- Uncommitted required artifacts.

Fix issues in priority order and re-run affected verification.

## Git And Close

Commit only when the user requested commits or the workflow explicitly requires
commits. Keep commits scoped:

1. Spec artifacts.
2. Implementation.
3. Review fixes.
4. Pre-existing fixes only when explicitly in scope or low-risk and approved.

Close report:

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

On approval, use the project's documented status transition. If no status system
exists, stop after reporting the evidence.

## Resume

For `--from STAGE`:

1. Read the pipeline state file.
2. Verify required prior artifacts exist.
3. Check whether prior artifacts changed since their recorded timestamp/hash.
4. Re-run cheap validation for stale or edited artifacts.
5. Resume at the requested milestone only after state is consistent.

If state is missing, reconstruct it from artifacts and git history, then ask only
if reconstruction is ambiguous or risky.
