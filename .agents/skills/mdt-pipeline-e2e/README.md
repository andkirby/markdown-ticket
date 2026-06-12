# mdt-pipeline-e2e

Full lifecycle pipeline for MDT-managed tickets — spec through implementation to done.

## What it does

Takes a ticket from idea to **Implemented** in a single automated run:

```
pre-flight → assess → requirements → BDD → architecture → UX design* → tests → tasks
          → implement → code review → tech-debt → user review → close
```

Runs as a **single agent** with a **Ralph loop**. Each iteration is one milestone.
No sub-agents or teams needed.

## Usage

```
/mdt:pipeline-e2e ABC-012                          # full auto
/mdt:pipeline-e2e ABC-012 --from architecture       # resume mid-pipeline
/mdt:pipeline-e2e ABC-012 --skip assess             # skip specific milestones
/mdt:pipeline-e2e ABC-012 --no-auto-close           # don't close ticket
/mdt:pipeline-e2e ABC-012 --ux-force                # force UX design stage
/mdt:pipeline-e2e ABC-012 --ignore baseline,lint    # skip pre-flight checks
```

## Milestones

| # | Milestone | What happens | Skill loaded |
|---|-----------|-------------|-------------|
| 0 | Pre-flight | Git state, baseline build, load ticket | — |
| 1 | Assess | Feasibility, scope, risk | `mdt:assess` |
| 2 | Requirements | Functional + non-functional requirements | `mdt:requirements` |
| 3 | BDD | Behavior scenarios (Given/When/Then) | `mdt:bdd` |
| 4 | Architecture | Backend design, module boundaries | `mdt:architecture` |
| 5 | UX Design | Design specs, state tables, wireframes | `ux-designer-specifier` |
| 6 | Tests | Test plans | `mdt:tests` |
| 7 | Tasks | Implementable tasks with TDD structure | `mdt:tasks` |
| 8 | Implement | TDD execution | `mdt:implement` |
| 9 | Code Review | Self-review, fix issues, fix pre-existing tests | — |
| 10 | Tech Debt | Structural issues scan | `mdt:tech-debt` |
| 11 | User Review + Close | Present to user, close ticket | — |

UX Design (5) is **conditional** — auto-skipped for backend-only tickets.

## Per-milestone pattern

Every milestone follows the same loop:

```
1. Load skill          → read the relevant SKILL.md
2. Execute workflow    → produce artifacts
3. Self-review         → check for gaps, fix
4. ralph_done          → advance to next milestone
```

## Key behaviors

### Pre-flight
- **Dirty git tree blocks the pipeline.** Options: commit, stash, or abort.
- Baseline build + test + lint check. Recorded for comparison at close.
- Can skip with `--ignore baseline` if you know the state.

### Spec → Implementation checkpoint
After all spec milestones pass, the pipeline pauses for user approval before
starting implementation. Ticket moves to `in_progress` only when implementation starts.

### Pre-existing test failures
The pipeline fixes simple pre-existing failures (missing mocks, config, typos).
Complex failures that require deep domain knowledge are **noted, not fixed** — 
the pipeline doesn't rabbit-hole on unrelated test suites.

### Commit strategy
Separate commits for traceability:
1. Spec artifacts
2. Implementation
3. Pre-existing test fixes (separate commit)
4. Code review fixes

### Close checklist
Before setting `Implemented`, all of these must pass:
- Spec artifacts exist and complete
- All tasks checked
- Build clean
- All tests green
- Lint clean
- Code review done
- Tech debt checked
- Durable docs updated
- Changes committed
- User approved

### Durable document updates
The pipeline tracks documents that need updating:
- `docs/design/surfaces/*.spec.md` — UX milestone
- `docs/ARCHITECTURE.md` — if architecture changes
- `README.md` — if user-facing changes
- `AGENTS.md` / `DEBUG.md` — if dev workflow changes

## Dependencies

This skill builds on:
- `mdt` — core MDT workflow skills (assess, requirements, bdd, etc.)
- `mdt-pipeline` — v1 pipeline patterns (Producer/Reviewer quality gates)
- `ux-designer-specifier` — UX design specs (conditional)
- `mdt-ux-designer` — project-specific UX context (conditional)
- `wireloom` — wireframe authoring (conditional)
- `commit` — conventional commit skill

## File location

```
.agents/skills/mdt-pipeline-e2e/
├── SKILL.md     ← you are here
└── README.md    ← this file
```

## Relationship to v1

`mdt-pipeline` (v1) uses a Producer/Reviewer team with quality gates between
spec stages. mdt-pipeline-e2e replaces the team with a single-agent Ralph loop. Both are
available — v1 if you have team support, e2e for simpler single-agent execution.
