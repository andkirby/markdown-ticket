# Agent Goal: Wire MDT-189 into spec-trace via mdt-pipeline-e2e

**Ticket:** MDT-189 — Dependency Graph v1 (`mdt-cli deps --check` with foundation and migration)
**Epic:** MDT-188
**Branch:** `MDT-187-relationship-badge-overflow` (do NOT branch; this is doc/trace work on an existing branch with other in-flight work — be surgical)
**Mode:** Spec-trace wiring only. **Stop before `implement`.**

---

## Your job, in one sentence

MDT-189 already has human-authored spec artifacts (`architecture.md`, `bdd.md`, `tests.md`, `tasks.md`) but they are **not wired into the project's traceability system**. Your job is to run the ticket through `mdt-pipeline-e2e` using `spec-trace-cli` as the per-stage quality gate, backfilling the missing `requirements` stage and ingesting every existing artifact into spec-trace's canonical store, so that `spec-trace validate MDT-189 --stage all` exits clean.

When you are done, an implementer (next agent, or a human) can run `mdt:implement` against MDT-189 and every requirement, scenario, test, and task is traceably linked with stable IDs.

## Load these skills first

1. **`mdt-pipeline-e2e`** — `.agents/skills/mdt-pipeline-e2e/SKILL.md` (repo-relative). You are the orchestrator; this skill is your control loop.
2. **`spec-trace-cli`** — `~/.agents/skills/spec-trace-cli/SKILL.md` (user-global). This is the per-stage quality gate. Every milestone's "done" includes `spec-trace validate MDT-189 --stage <stage>` exiting 0.
3. **`mdt`** — `~/.agents/skills/mdt/SKILL.md` (user-global). Project workflow skills (`mdt:requirements`, `mdt:bdd`, etc.) if you need their templates.

## Hard constraints (read before acting)

- **`spec-trace` 0.4.0 is installed.** Verify with `spec-trace --version` first. If it's missing or broken, stop and report — do not attempt to install.
- **Do NOT touch internal store files** at `docs/CRs/.trace/MDT-189/store.json`. Black box. Only `spec-trace` commands write there.
- **Do NOT re-author the existing artifacts.** `architecture.md`, `bdd.md`, `tests.md`, `tasks.md` are the source of truth for content. Your job is to ingest them into spec-trace's canonical store with stable IDs, not to rewrite them. If validation fails because of a content gap, surface it — don't silently "fix" by remapping IDs (forbidden by the skill).
- **Stage order is non-negotiable:** `requirements → bdd → architecture → tests → tasks → bundle`. You cannot validate BDD before requirements exist.
- **Writes are serialized.** Never parallelize `spec-trace upsert` calls for the same ticket. One at a time.
- **Stop before `implement`.** This prompt covers milestones `pre-flight` through `tasks` only. Implementation is a separate run.
- **Surgical commits.** The branch has unrelated in-flight work (MDT-168 config, MDT-193 epic badge, ProjectSelector). Stage only your own files per commit. Verify with `git diff --cached --name-only` before every commit.
- **No AI attribution in commits** (project rule).
- **Frontmatter writes via `mdt-cli attr`, never hand-edit.** This is the MDT-192 incident class. (Note: `mdt-cli attr` currently has a key-resolution bug on some tickets — if it fails, fall back to direct edit + verify round-trip with `mdt-cli <key>` showing the expected field. Document any fallback in the commit message.)

## Project context (already resolved — don't re-discover)

```
Project code:    MDT
Project root:    resolved by `mdt-cli project` (run it once at start)
Tickets path:    docs/CRs
Ticket file:     docs/CRs/MDT-189-dep-graph-foundation.md
Artifact dir:    docs/CRs/MDT-189/
Pipeline state:  docs/CRs/MDT-189.pipeline-state.json   (sibling of ticket file, per MDT-168 precedent)
Spec-trace store: docs/CRs/.trace/MDT-189/store.json    (black box — do not touch directly)
```

## Existing artifacts (ingest these — do not rewrite)

| Stage | File | Status | Notes for ingestion |
|---|---|---|---|
| (missing) | `requirements.md` | **BACKFILL** | Must be authored. Derive `BR-*` behavior requirements, `C*` constraints, and `Edge-*` edge cases from the existing `bdd.md` scenarios + `architecture.md` decisions. The bdd.md has scenarios S1–S14 that currently have no backing requirement IDs — they need `BR-*` to cover. |
| bdd | `bdd.md` | Exists | 14 gherkin scenarios (S1–S14). Each must `--covers BR-x.y`. S1 (VOC lying-ticket) is the acceptance test. |
| architecture | `architecture.md` | Exists | 5 design decisions (D1–D5), module API, key resolution rule, migration sequence. Map decisions to `OBL-*` obligations with `--derived-from BR-*` and `--artifacts ART-*`. |
| tests | `tests.md` | Exists | Test IDs already defined (TEST-buildGraph-*, TEST-violations-*, etc.). Ingest as-is with `--covers` linkage. |
| tasks | `tasks.md` | Exists | 11 tasks (TASK-satisfaction through TASK-smoke). Ingest as-is with `--owns ART-*` and `--makes-green` linkage. |

## Milestone plan (skip-allowed milestones flagged)

Run the pipeline-e2e milestone matrix with these scoping decisions:

| Milestone | Action | Why |
|---|---|---|
| **pre-flight** | Run | Create `.pipeline-state.json` with discovery record. Verify `spec-trace --version` and baseline `bun run --cwd server jest` (capture pass/fail; do not fix pre-existing failures). |
| **assess** | **SKIP** | Scope is already assessed — IDEA-008 + MDT-188 epic + design.md did that work. Record skip reason in state. Precedent: MDT-187 also skipped assess. |
| **requirements** | **RUN (backfill)** | This is the real gap. Author `requirements.md` from existing artifacts. This is the bulk of the new work. |
| **bdd** | RUN (ingest) | Existing bdd.md → spec-trace scenarios. Each scenario gets `--covers BR-x.y`. |
| **architecture** | RUN (ingest) | Existing architecture.md → artifacts + obligations. |
| **ux** | **SKIP** | Backend + CLI only; no UI in v1. Record skip reason. (design.md's user-flow diagram is the UX artifact if anyone asks; v1 has no UI surface.) |
| **tests** | RUN (ingest) | Existing tests.md → test plans with `--covers`. |
| **tasks** | RUN (ingest) | Existing tasks.md → tasks with `--owns` and `--makes-green`. |
| **implement** | **DO NOT START** | Out of scope. Stop after `tasks`. |

## Definition of done (all must be true)

- [ ] `docs/CRs/MDT-189.pipeline-state.json` exists with discovery record, milestone completions, and recorded skip reasons for `assess` and `ux`.
- [ ] `docs/CRs/MDT-189/requirements.md` exists (the backfill — the only net-new human artifact).
- [ ] `spec-trace validate MDT-189 --stage all` exits 0.
- [ ] `spec-trace render all MDT-189` succeeds; `*.trace.md` projections exist for every stage with content.
- [ ] Every scenario in `bdd.md` has a `--covers BR-x.y` that resolves to a real requirement.
- [ ] Every test plan in `tests.md` has a `--covers` linkage to a requirement or scenario.
- [ ] Every task in `tasks.md` has `--owns ART-*` and `--makes-green` linkage.
- [ ] One commit per milestone that produced net changes (pre-flight, requirements, bdd, architecture, tests, tasks). Skip-only milestones (assess, ux) do not need their own commit — just a state update folded into the next milestone's commit.
- [ ] The commit messages are scoped and do not sweep up unrelated in-flight files. Verify with `git diff --cached --name-only` before every commit.
- [ ] Final close report posted in your reply, with the spec-trace validation output quoted as evidence.

## Working rules for the requirements backfill

This is the genuine intellectual work in the prompt. Do it carefully.

- **Mine bdd.md for behaviors.** Each `Scenario:` block is a behavior. Group related scenarios under one `BR-*` (e.g., S1, S2, S3, S4, S5 all test the `--check` violation reporter → one `BR-1` with sub-requirements `BR-1.1` through `BR-1.5`). Use the MDT-168 requirements.trace.md style as a template.
- **Mine architecture.md decisions for constraints.** D1 (satisfaction split), D2 (migration writes via MarkdownService), D3 (blocks stays in frontmatter), D4 (v1 doesn't write), D5 (tree/mermaid deferred) → `C1` through `C5` with `--route tests` or `--route not_applicable`.
- **Mine for edge cases.** Unknown status (S7), missing target (S4), cross-project unregistered project, empty deps (S6), legacy data → `Edge-1` through `Edge-N` with `--route tests`.
- **Kind discipline (non-negotiable, per skill):**
  - `behavior` + `--route bdd` only. `BR-*` IDs.
  - `constraint` never on bdd route. `C*` IDs.
  - `edge_case` never on bdd route (if it needs a scenario, add a `BR-*` that covers it). `Edge-*` IDs.
- **Preserve IDs once written.** Don't remap to fix validation errors — that's forbidden by the skill. If validation fails, read `LLM_GUIDANCE` and apply only `ALLOWED_FIXES`.

## What to do if you get stuck

- **`spec-trace` command missing/broken:** stop, report, do not install.
- **Validation fails with `INVALID_BDD_ROUTE_TARGET`:** a constraint or edge_case is wrongly routed to bdd. Read the `LLM_GUIDANCE`, reclassify per the decision rule, never silently remap.
- **A scenario in bdd.md doesn't map to any plausible requirement:** the scenario may be badly scoped. Do NOT invent a requirement to silence the validator. Surface the gap in your reply and ask the user.
- **`mdt-cli attr` fails on MDT-189 specifically** (known bug): fall back to direct edit + round-trip verify (`mdt-cli 189` shows expected field). Note the fallback in the commit.
- **Dirty-tree conflict with unrelated work:** unstage strangers with `git reset HEAD <files>` before each commit. The branch has MDT-168, MDT-193, and ProjectSelector work in flight — none of it is yours.

## Close report format (post this in your final reply)

```
Ticket: MDT-189
Pipeline: mdt-pipeline-e2e + spec-trace-cli
Milestones completed: pre-flight, requirements, bdd, architecture, tests, tasks
Milestones skipped: assess (already done in IDEA-008/MDT-188), ux (no v1 UI)
Implement: NOT STARTED (out of scope per prompt)

Artifacts:
  - requirements.md (NEW — backfilled)
  - bdd.md (ingested, no content change)
  - architecture.md (ingested, no content change)
  - tests.md (ingested, no content change)
  - tasks.md (ingested, no content change)
  - *.trace.md (rendered projections)
  - .pipeline-state.json

Spec-trace validation:
  $ spec-trace validate MDT-189 --stage all
  <paste actual output>

Requirement coverage:
  BR-* : N behavior requirements
  C*   : M constraints
  Edge-* : K edge cases
  Uncovered scenarios: <list or "none">

Commits:
  <hash> <message>
  ...

Open issues / escalations:
  <list, or "none">
```

## Reference paths

- Orchestrator skill: `.agents/skills/mdt-pipeline-e2e/SKILL.md` (repo-relative)
- Trace skill: `~/.agents/skills/spec-trace-cli/SKILL.md` (user-global)
- Project skills index: `docs/SKILLS.md` (repo-relative)
- Ticket: `docs/CRs/MDT-189-dep-graph-foundation.md`
- Existing artifacts: `docs/CRs/MDT-189/{architecture,bdd,tests,tasks}.md`
- Epic context: `docs/CRs/MDT-188-dependency-graph-epic.md`, `docs/CRs/MDT-188/design.md`
- Design source: `docs/ideas/IDEA-008-ticket-dependency-graph.md`
- Precedent for trace file shapes: `docs/CRs/MDT-168/{requirements,bdd,architecture,tests,tasks}.trace.md`
- Precedent for pipeline state: `docs/CRs/MDT-168.pipeline-state.json`

Begin with pre-flight: `spec-trace --version`, then `spec-trace init MDT-189`, then write `.pipeline-state.json`. Do not skip pre-flight.
