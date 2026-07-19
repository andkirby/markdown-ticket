# Requirements: MDT-189

**Source**: [MDT-189](../MDT-189-dep-graph-foundation.md)
**Epic**: [MDT-188](../MDT-188-dependency-graph-epic.md) · Design: [MDT-188/design.md](../MDT-188/design.md)
**Backfilled**: 2026-07-18

## Overview

MDT-189 ships a dependency graph that is *interpreted*, not merely *stored*. A
human runs `mdt-cli deps <KEY> --check` and sees the violation table that catches
the canonical VOC lying-ticket scenario (a ticket that claims `dependsOn:
VOC-053` while VOC-053 is `Approved`). Three pieces land together so the graph
module is proven by its consumer rather than by proxy unit tests:

1. **Foundation** — one `DependencyGraph` module in `shared/` plus a satisfaction
   classifier in `domain-contracts/`. Every future consumer (UI, MCP,
   enforcement) reads through it.
2. **Migration** — `blocks` is reconciled against `dependsOn` across the live
   repo via a reviewable dry-run / interactive / invariant-checked script.
3. **CLI surface** — `mdt-cli deps --check` prints the violation table plus an
   informational prose-gap section; `--json` exposes the same data to agents.

After this ticket, `blocks` is derived from `dependsOn` and the user-facing
write path that produced the drift is removed.

## Semantic Decisions

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---|---|---|---|
| Canonical edge | `dependsOn` is the contract; `blocks := inverse(dependsOn)`, derived on write | Store `blocks` independently and reconcile manually | Independent storage drifts; the live repo already has 11 missing reciprocals and one outright contradiction (MDT-082 ↔ MDT-071) |
| Physical storage | Files are the database; no central `dependencies.toml` | Centralized edge store | Files are already the database; one logical well, distributed physical storage |
| Satisfaction API shape | Two functions: `isDependencySatisfied(status) → boolean` and `classifyViolation(depStatus) → kind` | One tri-state function | A UI badge wants only the boolean; the CLI formatter needs the kind (D1) |
| Satisfaction on unknown status | Safe default → unsatisfied | Treat unknown as satisfied, or throw | Legacy data with non-schema statuses killed the prior validator (S7) |
| Migration write path | Direct `MarkdownService` frontmatter rewrite | Route through `updateTicketAttributes` | Migration runs *before* the write path is removed; using the path we're disabling is confusing (D2) |
| v1 `--check` write behavior | Informational only — surfaces prose gaps without writing | y/N reconciliation prompt that mutates `dependsOn` | The write path requires MDT-191's validation; v1 does not half-ship MDT-191 (D4) |
| CLI module placement | Pure presentation; reusable logic in `shared/` | Logic inside `cli/` | AGENTS.md "CLI Business Logic Boundary" — MCP/UI will reuse the graph |
| `--tree` / `--mermaid` | Deferred unless trivial (≤ 1 day) | In-scope v1 deliverables | Both are nice-to-haves; the acceptance test is `--check` (D5) |

## Constraint Carryover

Each constraint must appear in architecture and be reachable from tasks/tests:

| Constraint ID | Must Appear In |
|---|---|
| C-1 (satisfaction split into boolean + kind) | architecture.md (Component API), tests.md (satisfaction tests) |
| C-2 (migration writes via MarkdownService) | architecture.md (Decisions D2, Migration sequence), tasks.md (TASK-migration) |
| C-3 (blocks derived on write, dependsOn is the contract) | architecture.md (Decisions D3), tests.md (TEST-blocks-*) |
| C-4 (v1 --check is informational, no write) | architecture.md (Decisions D4), bdd.md (S8 exit 0) |
| C-5 (--tree/--mermaid deferred unless trivial) | architecture.md (Decisions D5, Non-Goals), tasks.md (Cut lines) |
| C-6 (one DependencyGraph module, single interpreter) | architecture.md (Structure), tasks.md (TASK-graph) |
| C-7 (blocks := inverse(dependsOn), read-only after migration) | architecture.md (Rationale), bdd.md (S13) |
| C-8 (CLI is pure presentation, logic in shared/) | architecture.md (Rationale), tasks.md (TASK-formatter, TASK-deps-command) |
| C-9 (satisfaction lives in domain-contracts for cross-package import) | architecture.md (Component API), tasks.md (TASK-satisfaction) |
| C-10 (key resolution rule: FQDN as-is vs project-prefix + zero-pad) | architecture.md (Key resolution), bdd.md (S2) |
| C-11 (relationship inventory computed via `inverse(graph)`, not re-derived in CLI) | architecture.md (Decisions D6), bdd.md (S15, S16), tasks.md (TASK-relations-formatter, TASK-relations-wire) |

## Delivery Timing

All behavior requirements (BR-1.1 through BR-6.4) are `Now` — they are
delivered in this ticket. No requirement is deferred except `--tree`/`--mermaid`
(C-5), which are conditional cut-lines, not requirements.

> **UAT 2026-07-19:** BR-6.x and C-11 added during post-implementation UAT
> when the shipped `deps 189` output exposed a definition-of-done miss: a
> ticket that only blocks others rendered as a bare "Ready: YES"
> indistinguishable from a leaf. The fix is additive — the default output
> gains a relationship-inventory section; `--check` strict mode preserves the
> original violations-only contract for scripts.

## Behavioral Requirements

### BR-1 — `mdt-cli deps --check` violation reporter

The primary surface. A human runs `mdt-cli deps <KEY> --check` and sees a
violation table that classifies each `dependsOn` edge by satisfaction kind,
names the offending dep, and prints a `Ready: YES|NO` summary.

#### BR-1.1

Route: `bdd`

WHEN a ticket depends on an unfinished (non-`Implemented`) ticket with a known
schema status, THEN `mdt-cli deps --check` shall emit a row classifying the dep
as `kind: waiting`, naming the dep, and including evidence of the dep's status.

Covers: S1.

#### BR-1.2

Route: `bdd`

WHEN a ticket depends on a fully-qualified cross-project key (`{PROJECT}-###`),
THEN `mdt-cli deps --check` shall resolve the dep against the target project's
tickets and render the row's dep key in the fully-qualified form (never the
bare number).

Covers: S2.

#### BR-1.3

Route: `bdd`

WHEN a ticket depends on a `Rejected` ticket, THEN `mdt-cli deps --check` shall
classify the dep as `kind: broken-plan` and the row's action field shall contain
actionable resolution hints (e.g., `reject-<KEY> | unlink-<KEY>`).

Covers: S3.

#### BR-1.4

Route: `bdd`

WHEN a ticket depends on a key that does not resolve to any ticket in any
registered project, THEN `mdt-cli deps --check` shall emit a row with `status:
missing`, `kind: broken-plan`, naming the unresolved key.

Covers: S4.

#### BR-1.5

Route: `bdd`

WHEN a ticket's every `dependsOn` edge is satisfied (or the ticket has no
dependencies), THEN `mdt-cli deps --check` shall emit no violation rows and the
summary line shall read `Ready: YES`.

Covers: S5, S6.

#### BR-1.6

Route: `bdd`

WHEN a ticket depends on a ticket whose status is not in `CRStatusSchema` (e.g.,
legacy `Deferred`), THEN `mdt-cli deps --check` shall classify the dep as
`kind: waiting` (safe default → unsatisfied) and the evidence shall note that
the status is unrecognized.

Covers: S7.

### BR-2 — Prose reconciliation (informational)

The body of a ticket may reference CR keys in prose that are not present in
`dependsOn`. v1 surfaces these gaps as a separate section without writing.

#### BR-2.1

Route: `bdd`

WHEN a ticket's body contains CR-key tokens inside a `## Precondition` or `##
Prerequisites` section that are absent from `dependsOn`, THEN `mdt-cli deps
--check` shall print an "Unverifiable prose" section listing those keys and
exit 0 without attempting any write.

Covers: S8.

#### BR-2.2

Route: `bdd`

WHEN a ticket's body mentions CR keys outside any precondition section (e.g.,
"See also MDT-030 for context."), THEN `mdt-cli deps --check` shall NOT include
those keys in the prose-gaps section.

Covers: S9.

### BR-3 — Structured JSON output

#### BR-3.1

Route: `bdd`

WHEN a caller runs `mdt-cli deps <KEY> --check --json` (or `--yaml`), THEN
stdout shall be valid structured output matching the documented schema
(`schemaVersion`, `ok`, `command`, `data: { ticket, ready, violations[],
proseGaps[], relations: { dependsOn: [...], blocks: [...] } }`) so agents and
scripts can consume both the readiness verdict *and* the relationship
inventory programmatically.

Covers: S10, S18.

> **UAT 2026-07-19 (refine_in_place):** Original BR-3.1 covered only
> `{ ticket, ready, violations[], proseGaps[] }`. Amended to add the `relations`
> block — same ID because the intent (machine-readable deps view) is unchanged;
> the contract is expanded, not replaced.

### BR-4 — `blocks` migration is reviewable before commit

The migration is a one-way door. It must be reviewable end to end before any
file is written, and its post-condition must be verifiable.

#### BR-4.1

Route: `bdd`

WHEN an operator runs `bun run scripts/migrate-blocks.ts --dry-run`, THEN the
script shall print a complete report (per-ticket diff, contradictions,
invariant projection) and modify no file under `docs/CRs/`.

Covers: S11.

#### BR-4.2

Route: `bdd`

WHEN the migration runs for real and encounters a ticket that both `dependsOn`
and `blocks` the same key, THEN the script shall prompt interactively
(`Keep dependsOn, drop blocks? [y/N]`); on `y` the `blocks` entry is removed,
on `n` or EOF the run aborts with no writes.

Covers: S12.

#### BR-4.3

Route: `bdd`

WHEN the migration completes successfully, THEN for every ticket `T` in every
registered project `T.blocks` shall equal the sorted inverse of all `dependsOn`
edges pointing at `T`, and the report shall record an invariant-verification
line (`Invariant verified: 100% of N tickets`).

Covers: S13.

### BR-5 — `blocks` becomes a derived, non-writable field

After migration, the canonical way to change `blocks` is to change `dependsOn`.

#### BR-5.1

Route: `bdd`

WHEN a user attempts a direct `blocks` write (`mdt-cli attr <KEY>
blocks+=<OTHER>`), THEN the command shall exit non-zero, stderr shall contain
an actionable message naming the derived-field rule (`blocks is derived from
dependsOn; edit dependsOn instead`), and the ticket file shall remain unchanged.

Covers: S14.

### BR-6 — Relationship inventory renders by default (UAT 2026-07-19)

The default `mdt-cli deps <KEY>` output shows the ticket's *structural role in
the graph*, not just its readiness verdict. A ticket that only has outgoing
`blocks` edges (e.g., MDT-189 itself: `dependsOn: []`, `blocks: [MDT-191]`)
must render its blocking role explicitly — never collapsing to a bare
"Ready: YES" that is indistinguishable from a leaf ticket with no relationships
at all. Readiness is a derived computation over the graph; showing readiness
without showing the graph is showing the answer without the question.

#### BR-6.1

Route: `bdd`

WHEN a caller runs `mdt-cli deps <KEY>` (default, no `--check` strict flag),
THEN the human output shall include a relationship-inventory section listing
every `dependsOn` entry (upstream) with its current status, and every entry
in `inverse(dependsOn)` pointing at this ticket (downstream — i.e., what this
ticket blocks) with each blocker's current status — independent of whether any
violations exist.

Covers: S15.

#### BR-6.2

Route: `bdd`

WHEN a ticket has an empty `dependsOn` array but a non-empty `blocks` array
(or non-empty downstream edges in `inverse(dependsOn)`), THEN the relationship
inventory shall render the downstream section with the blocking role named
explicitly (e.g., "Blocks: MDT-191") and the inventory section shall not be
suppressed, even though the readiness verdict is `Ready: YES`.

Covers: S16.

#### BR-6.3

Route: `bdd`

WHEN a caller runs `mdt-cli deps <KEY> --check` (strict mode), THEN the output
shall remain violations-only — the same behavior that shipped before UAT
2026-07-19 — so existing scripts that depend on a stable violations-only
contract are not broken.

Covers: S17.

#### BR-6.4

Route: `bdd`

WHEN a caller runs `mdt-cli deps <KEY> --json` or `--yaml`, THEN the
structured output shall include a `relations` block with `dependsOn` and
`blocks` arrays (each entry carrying the related ticket's key and current
status) alongside the existing `violations` and `proseGaps` arrays.

Covers: S18 (also amends BR-3.1).

## Constraints

### C-1

Route: `tests`

The satisfaction surface shall be split into two functions: `isDependencySatisfied(status)
→ boolean` (pure status check; UI badge use case) and `classifyViolation(depStatus)
→ SatisfactionKind` (kind for CLI formatter and future guardrail). The two
questions shall not be collapsed into one tri-state return.

### C-2

Route: `tests`

The `blocks` migration script shall write via `MarkdownService` direct
frontmatter rewrite, not via `TicketService.updateTicketAttributes`. Migration
is a data fix, not a ticket mutation, and must not route through the write path
it is about to disable.

### C-3

Route: `tests`

`blocks` shall remain stored in frontmatter but shall be recomputed (derived)
whenever `dependsOn` changes. A hand-edit to `blocks:` shall be overwritten on
the next write; `dependsOn` is the contract.

### C-4

Route: `tests`

The v1 `--check` surface shall be informational only: it shall surface prose
gaps as a separate section but shall not write `dependsOn` or prompt the user to
mutate it. The reconciliation write interaction is deferred to MDT-191.

### C-5

Route: `not_applicable`

`--tree` and `--mermaid` flags are deferred to a follow-up ticket if their
implementation cost exceeds one day. They are nice-to-haves; the acceptance test
for MDT-189 is `--check` alone.

### C-6

Route: `tests`

The system shall provide exactly one dependency-graph module
(`shared/services/ticket/DependencyGraph.ts`) that is the sole interpreter of
dependency edges. Every future consumer (CLI, HTTP, MCP, UI) shall read through
it; no consumer shall re-implement graph traversal independently.

### C-7

Route: `tests`

The canonical dependency edge shall be `dependsOn`. After migration, `blocks`
shall be defined as the sorted inverse of `dependsOn` and shall be read-only
through the user-facing write path.

### C-8

Route: `tests`

The CLI (`cli/src/commands/deps.ts`, `cli/src/output/depsFormatter.ts`) shall be
pure presentation: argument parsing, output formatting, and exit codes only.
Any logic reusable by another consumer (MCP, HTTP, UI) — graph building,
satisfaction, violation classification, prose scanning — shall live in
`shared/` or `domain-contracts/`.

### C-9

Route: `tests`

`isDependencySatisfied` and `classifyViolation` shall live in
`domain-contracts/src/ticket/satisfaction.ts` so that HTTP, MCP, and UI packages
can import them without pulling the graph module or `shared/`.

### C-10

Route: `tests`

`buildGraph` shall resolve every `dependsOn` entry with the following rule: if
the stored value matches `^[A-Z]+-\d+$`, use it as-is (cross-project
fully-qualified form); otherwise prefix with `{activeProjectCode}-` and zero-pad
the numeric portion to three digits. This mirrors the `keyNormalizer.ts` rule
established by MDT-187.

### C-11

Route: `tests`

The relationship inventory (BR-6) shall be computed from the same `DepGraph`
the violation reporter uses — never re-traversed or re-resolved by the CLI.
`inverse(graph)` is the canonical source of "what does this ticket block"; the
CLI is pure presentation over it. This prevents a second source of truth for
the same symmetric fact and keeps C-6 (single graph interpreter) intact.

> **UAT 2026-07-19 (additive_change):** New constraint added alongside BR-6 to
> keep the inventory data path honest — the CLI must call `inverse()`, not
> re-derive blocking edges from raw `dependsOn` arrays.

## Edge Cases

### Edge-1

Route: `tests`

WHEN a dependency's target ticket has a status value not present in
`CRStatusSchema` (legacy data, e.g., `Deferred`, `Pending`), the system shall
apply a safe default of *unsatisfied*, classify the violation as `waiting`, and
note in the evidence that the status is unrecognized. The system shall not
throw, shall not treat the unknown status as satisfied, and shall not silently
drop the edge.

### Edge-2

Route: `tests`

WHEN a `dependsOn` entry does not resolve to any ticket in any registered
project, the system shall emit a row with `status: missing`, `kind:
broken-plan`, naming the unresolved key, and shall not crash the check.

### Edge-3

Route: `tests`

WHEN a `dependsOn` entry references a fully-qualified cross-project key whose
target project is not registered in the project registry, the system shall
treat the target as missing (per Edge-2) and shall surface the unresolved
project in the evidence rather than silently swallowing the cross-project
reference.

### Edge-4

Route: `tests`

WHEN a ticket has an empty `dependsOn` array (leaf ticket) or no `dependsOn`
field at all, the system shall emit no violation rows, print `Ready: YES`, and
never produce a spurious "self" or null edge.

### Edge-5

Route: `tests`

WHEN pre-migration data has a ticket whose `blocks` and `dependsOn` entries
contradict (e.g., `A dependsOn B` AND `A blocks B`), the migration script shall
not silently reconcile the contradiction; it shall prompt the operator
interactively (BR-4.2) and shall not write until the operator decides.

### Edge-6

Route: `tests`

WHEN a ticket's `dependsOn` array contains duplicate entries (e.g.,
`["MDT-100", "MDT-100"]`), the graph builder shall collapse them to a single
edge and shall not emit duplicate violation rows or duplicate inverse-`blocks`
entries.

## Route Policy Summary

| Route | Count | IDs |
|---|---:|---|
| bdd | 16 | BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-1.5, BR-1.6, BR-2.1, BR-2.2, BR-3.1, BR-4.1, BR-4.2, BR-4.3, BR-5.1, BR-6.1, BR-6.2, BR-6.3, BR-6.4 |
| tests | 16 | C-1, C-2, C-3, C-4, C-6, C-7, C-8, C-9, C-10, C-11, Edge-1, Edge-2, Edge-3, Edge-4, Edge-5, Edge-6 |
| not_applicable | 1 | C-5 |

## Scenario Coverage Matrix

Every scenario in [bdd.md](bdd.md) is covered by exactly one `BR-*` requirement:

| Scenario | Title | Covers |
|---|---|---|
| S1 | VOC lying-ticket detected (acceptance) | BR-1.1 |
| S2 | Cross-project dependency | BR-1.2 |
| S3 | Broken-plan: dep is Rejected | BR-1.3 |
| S4 | Broken-plan: dep target missing | BR-1.4 |
| S5 | Clean ticket | BR-1.5 |
| S6 | Leaf ticket (no deps) | BR-1.5 |
| S7 | Unknown dep status | BR-1.6 |
| S8 | Prose precondition gaps surfaced | BR-2.1 |
| S9 | Casual CR-key mentions ignored | BR-2.2 |
| S10 | JSON output shape | BR-3.1 |
| S11 | Dry-run produces report | BR-4.1 |
| S12 | Interactive contradiction prompt | BR-4.2 |
| S13 | Post-migration invariant | BR-4.3 |
| S14 | Direct blocks write rejected | BR-5.1 |
| S15 | Default output shows relationship inventory | BR-6.1 |
| S16 | Outgoing-blocks ticket renders blocking role | BR-6.2 |
| S17 | `--check` strict mode stays violations-only | BR-6.3 |
| S18 | JSON/YAML output carries `relations` block | BR-6.4 |

No uncovered scenarios.

---

Use `requirements.trace.md` for canonical requirement rows and route summaries.
_Backfilled from existing bdd.md + architecture.md per MDT-189 pipeline-agent-prompt_
