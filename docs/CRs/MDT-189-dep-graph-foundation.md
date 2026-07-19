---
code: MDT-189
status: In Progress
dateCreated: 2026-07-17T15:35:08.528Z
type: Feature Enhancement
priority: High
phaseEpic: MDT-188
blocks: MDT-191
---

# Dependency Graph v1: `mdt-cli deps --check` with Foundation and Migration

**Epic:** MDT-188 (Ticket Dependency Graph: Implementation-Order Planning)
**Slice:** Consolidated v1 — IDEA-008 slices 1 + 2 + 4 (foundation, migration, CLI check).

The original plan split foundation/migration/CLI into three tickets. The
foundation ticket had no consumer and was therefore not user-testable. This
ticket collapses foundation + migration + the `mdt-cli deps --check` command
into one user-visible outcome: **a human runs the command, sees the violation
table, and the VOC lying-ticket scenario is detected.** The graph module is
proven by its consumer, not by proxy unit tests.

`--tree` and `--mermaid` are explicitly **deferred unless trivial** — they are
nice-to-haves; if they cost more than a day they become a follow-up ticket.

## 1. Description

### Problem Statement

Ticket dependencies are stored but never interpreted. A ticket can claim
`dependsOn: VOC-053` while VOC-053 is `Approved` and nothing detects the lie.
`blocks` is stored independently of `dependsOn` and never reconciled — the live
repo has 11 edges missing reciprocal `blocks` and one outright contradiction
(`MDT-082` ↔ `MDT-071`). No graph, no traversal, no cycle detection exists.

### Current State

- `dependsOn`, `blocks`, `relatedTickets` are independent `string[]` fields
  on `Ticket` (`domain-contracts/src/ticket/entity.ts:24-26`).
- Frontmatter is the database; arrays stored as comma-joined scalars
  (`shared/models/Ticket.ts:80-83`, `shared/services/MarkdownService.ts:240-247`).
- Mutation flows through `shared/services/TicketService.ts:108-159`
  (`updateTicketAttributes`).
- No graph/traversal/cycle-detection code exists in `shared/`, `server/`,
  or `domain-contracts/`.
- CLI (`cli/src/commands/list.ts`) has no relationship view and no `deps`
  command.

### Desired State

After this ticket:

1. One `DependencyGraph` module (`shared/services/ticket/DependencyGraph.ts`)
   is the only interpreter of dependencies. Every future consumer (UI, MCP,
   enforcement) reads through it.
2. `blocks` is derived from `dependsOn` (read-only after migration).
3. `mdt-cli deps <KEY> --check` prints a violation table that detects the
   VOC lying-ticket scenario.
4. The migration has cleaned the live repo's `blocks` data and removed the
   write path that produced the drift.

### Rationale

The user value is the check command — that's the planning tool. Foundation and
migration exist to support it. Bundling them in one ticket makes the foundation
**testable by a user**, which is the completion criterion. Three separate
tickets with one untestable in the middle was ceremony for ceremony's sake.

## 2. Solution Analysis

### Design Decisions

- **Canonical edge: `dependsOn`.** `A dependsOn B` means B must be satisfied
  before A may enter an execution state. `blocks := inverse(dependsOn)`.
- **Cross-project keys, day-one.** The graph keys on `{project}:{number}`.
  The VOC scenario (`VOC-###`) is not hypothetical. Same-project edges resolve
  bare numbers against the active project's code; cross-project edges stay
  fully qualified. Mirrors MDT-187 badge elision.
- **`blocks` read-only after migration.** Not "audited" — decided. Write path
  removed; invariant enforced by removing the ability to drift.
- **Satisfaction is a pure function.** `isDependencySatisfied(status)` lives in
  `domain-contracts` so every consumer imports it without pulling the graph:

  | Status | Satisfied? |
  |---|---|
  | Implemented | ✅ |
  | Rejected | ❌ terminal |
  | Partially Implemented | ❌ (v1 punt) |
  | Proposed / Approved / In Progress / On Hold | ❌ |

- **Violation shape** (shared with MDT-191 enforcement later):

  ```ts
  { dep: string, status: string, kind: 'waiting' | 'broken-plan', action: string }
  ```

  - `waiting` — dep is Approved/In Progress/On Hold (reality incomplete).
  - `broken-plan` — dep is Rejected, or target missing (plan internally broken).
  - `action` — human-readable resolution hint
    (`'reject-A | unlink-A'` for broken-plan, `'none (informational)'` for
    waiting).

### CLI command surface (v1)

```
mdt-cli deps <KEY> --check          # primary; default if no flag given
mdt-cli deps <KEY> --check --json   # structured output for scripts/agents
```

Output (the VOC format):

```
Dependency check: MDT-188

Precondition                       | Status    | Evidence
dependsOn: VOC-053                 | ❌        | VOC-053 is "Approved" (waiting)
dependsOn: MDT-054                 | ✅        | MDT-054 is "Implemented"
dependsOn: MDT-999                 | ❌        | Target missing (broken-plan)

Ready: NO (2 unresolved)
```

**Prose reconciliation (informational only in v1):** scan ticket body for
CR-key tokens not in `dependsOn`; print them as a separate `Unverifiable prose`
section. v1 does **not** prompt to write — that interaction belongs in MDT-191
with the write path. v1 just surfaces the gap.

**Cross-project key rendering:** fully qualified (`VOC-053`); same-project
keys bare (`053`) per MDT-187 elision rules — but only when single-project
context is unambiguous; otherwise full key.

### CLI boundary (per AGENTS.md)

`cli/src/commands/deps.ts` is pure presentation. All logic
(`buildGraph`, `violations`, satisfaction) is imported from `shared/`. If
cycle detection or prose scanning ends up reusable by MCP/UI, it lives in
`shared/`, not `cli/`.

### Trade-offs

- **One big PR.** Migration touches every ticket file (data risk); graph
  module is new code; CLI command is new surface. Harder to review than three
  small PRs. Justified because smaller PRs that aren't independently testable
  are worse than one PR that is.
- **`--tree`/`--mermaid` deferred.** They're useful but not load-bearing. If
  trivial to add during implementation, add them; otherwise cut to follow-up.
  Scope guard against ticket bloat.
- **Migration is a one-way door.** Once `blocks` is recomputed and the write
  path is removed, the old data is gone. The report is the audit trail.

## 3. Implementation Specification

### 3.1 Module — `shared/services/ticket/DependencyGraph.ts`

Pure functions over `Ticket[]`. No file I/O, no mutation.

```ts
export interface DepGraph {
  nodes: Map<string, Ticket>            // key: '{project}:{number}'
  edges: Map<string, string[]>          // key → dependsOn keys
}

export interface Violation {
  dep: string                           // CR key as stored
  status: string                        // dep's status, or 'missing'
  kind: 'waiting' | 'broken-plan'
  action: string
}

export function buildGraph(tickets: Ticket[], activeProjectCode: string): DepGraph
export function violations(ticket: Ticket, graph: DepGraph): Violation[]
export function detectCycle(graph: DepGraph): string[] | null   // O(V+E) DFS
export function topoSort(graph: DepGraph): Ticket[]
export function inverse(graph: DepGraph): Map<string, string[]>  // blocks
```

Key resolution rule (inside `buildGraph`):
- Stored value matches `^[A-Z]+-\d+$` → use as-is (cross-project).
- Otherwise → prefix with `activeProjectCode` (same-project bare number).

Satisfaction lives separately, in `domain-contracts`:

```ts
// domain-contracts/src/ticket/satisfaction.ts
export function isDependencySatisfied(status: string): boolean
```

### 3.2 Migration script — `scripts/migrate-blocks.ts` (or `.tsx`)

One-shot. Steps:

1. Enumerate every ticket in every registered project (`ProjectService` +
   `TicketService.listTickets`).
2. For each ticket, compute `blocksComputed := inverse(dependsOn)` using the
   graph over the whole project.
3. Diff `blocksComputed` against stored `blocks`. Classify:
   - `added` — reciprocal missing in stored (will be written).
   - `removed` — stored has reciprocal not in computed (will be removed).
   - `contradiction` — both `A dependsOn B` and `A blocks B` (logical
     impossibility; `MDT-082` ↔ `MDT-071` is the known case).
4. Prompt per contradiction (interactive y/N): "A dependsOn B AND A blocks B.
   Keep dependsOn, drop blocks? [y/N]". Default: keep dependsOn (canonical).
5. Write `blocks := blocksComputed` for all tickets via `MarkdownService`
   (direct frontmatter rewrite — not via `updateTicketAttributes`, to avoid
   triggering the write path we're about to disable).
6. Print summary: N tickets changed, M reciprocals added, K contradictions
   resolved. Write report to `docs/CRs/MDT-189/blocks-migration-report.md`.
7. Run post-check: re-enumerate, assert `blocks === inverse(dependsOn)` for
   100%. Write result into the report.

Then, separately (reviewable as its own commit within this ticket):

8. Remove the `blocks` write path:
   - `shared/services/TicketService.ts:51` — drop `'blocks'` from
     `RELATION_FIELDS`.
   - `shared/services/TicketService.ts:108-159` — in
     `updateTicketAttributes`, reject `blocks` writes with an explicit error
     ("blocks is derived from dependsOn; edit dependsOn instead").
   - `shared/services/MarkdownService.ts:240-247` — keep writing `blocks` to
     frontmatter, but from the derived value, not from user input. The
     canonical writer recomputes `blocks` whenever `dependsOn` changes.

### 3.3 CLI — `cli/src/commands/deps.ts`

```ts
// Pseudocode shape; see architecture.md for full design
export async function depsAction(key: string, opts: DepsOptions): Promise<void> {
  const project = await resolveProject(opts.project)
  const tickets = await ticketService.listTickets({ project: project.id, all: true })
  const target = tickets.find(t => t.code === normalizeKey(key, project.code))
  if (!target) throw new CliCommandError(`Ticket ${key} not found`)

  const graph = buildGraph(tickets, project.code)
  const v = violations(target, graph)

  if (opts.json) return writeStructuredSuccess({ violations: v, ready: v.length === 0 })
  printViolationTable(target, v)
  printProseGapSection(target)        // CR-key tokens in body not in dependsOn
}
```

Register in `cli/src/index.ts` under the `ticket` subcommand tree, mirroring
how `attr` and `list` register. Add top-level alias `deps`.

Output formatter in `cli/src/output/depsFormatter.ts` — matches existing
formatter patterns (`formatter.ts`), supports color via `colors.ts`, respects
`NO_COLOR`.

## 4. Acceptance Criteria

### Functional (user-testable — these are the v1 definition of done)

- [ ] **VOC scenario passes end-to-end.** Given a fixture ticket with
  `dependsOn: VOC-053` where VOC-053 is `Approved`, `mdt-cli deps <KEY> --check`
  prints a violation row: dep=`VOC-053`, status=`Approved`, kind=`waiting`,
  evidence=`"Approved" (waiting)`.
- [ ] **Broken-plan detection.** Same fixture but VOC-053 set to `Rejected`:
  row kind=`broken-plan`, action includes `reject-<KEY> | unlink-<KEY>`.
- [ ] **Missing target.** `dependsOn: MDT-999` (no such ticket) → row
  status=`missing`, kind=`broken-plan`.
- [ ] **Clean ticket.** All deps Implemented → output `Ready: YES`, no rows.
- [ ] **Cross-project key rendering.** Cross-project deps render as `VOC-053`;
  same-project deps render bare when context is unambiguous.
- [ ] **`--json` output** exposes `{ violations, ready }` for agents/scripts.
- [ ] **Migration report** committed at
  `docs/CRs/MDT-189/blocks-migration-report.md`, listing every changed ticket
  and every contradiction with its resolution.
- [ ] **Post-migration invariant.** One-shot check script confirms
  `blocks === inverse(dependsOn)` for 100% of tickets; result in the report.
- [ ] **`blocks` write path removed.** `mdt-cli attr 189 blocks+=MDT-999`
  returns an explicit error naming the canonical alternative.

### Non-functional

- [ ] `detectCycle` is O(V+E); tested on synthetic cycles of length 2, 3, 5.
- [ ] No new source of truth — all dependency interpretation flows through
  `DependencyGraph`.
- [ ] CLI command follows the boundary in AGENTS.md — no graph logic in
  `cli/src/`.

### Deferred (explicitly out of v1)

- `--tree`, `--mermaid` flags (add if trivial during implementation).
- Status-transition guardrails (MDT-191).
- Write-time cycle/self-edge rejection (MDT-191).
- UI rendering (v1.1, separate ticket).
- MCP wrappers (v1.1/v1.2, separate ticket).

## 5. Verification

- `bun run --cwd server jest` for shared-service and migration tests.
- CLI command test with in-memory fixture project (mirrors
  `cli/src/commands/list.ts` test pattern).
- Snapshot test reproducing the VOC scenario — the primary acceptance test.
- Migration dry-run + real run; `git diff docs/CRs/` reviewed before
  committing the data changes.
- `bun run validate:ts` on all changed files.
- **Manual user test:** `mdt-cli deps MDT-188 --check` against the real repo
  after migration; confirm output matches expected violation shape.

## 6. Open Questions

- **Prose reconciliation section scope.** v1 surfaces CR-key tokens in the body
  not in `dependsOn`. Should it scan the whole body, or only
  `## Precondition` / `## Prerequisites` sections? Recommend sections-only —
  scanning everything triggers false positives on "see also" sentences.
  Confirm at architecture.
- **Migration contradiction default.** When `A dependsOn B` AND `A blocks B`,
  default to keeping `dependsOn` (canonical) and dropping `blocks`. Is this
  always right, or are there cases where the `blocks` entry was the intended
  one? Recommend: always keep `dependsOn`, log loudly, let a human override
  interactively.
- **Migration run mode.** Interactive (prompt per contradiction) vs.
  `--yes` flag for CI. Recommend both; default interactive.

## 7. Risks

- **One-way door on `blocks` data.** Mitigation: dry-run, review diff, then
  commit. The report is the audit trail.
- **Big PR.** Mitigation: commit in logical slices within the ticket
  (module → migration → write-path removal → CLI), each reviewable in the PR.
- **Demand unknown.** This ticket is its own demand probe — if `deps --check`
  gets no use after shipping, MDT-191 (enforcement) does not ship. That's the
  design, not a failure.

## 8. Clarifications

### UAT Session 2026-07-19 — Relationship inventory renders by default

**Trigger:** Operator ran `mdt ticket deps --yaml 189` and observed that the
command returns readiness/violations only — no relationship tree. MDT-189
itself (`dependsOn: []`, `blocks: [MDT-191]`) renders as `Ready: YES`
indistinguishable from a leaf ticket.

**Approved changes:**

- Default `mdt-cli deps <KEY>` output gains a relationship-inventory section
  ("Depends on" + "Blocks"), rendered independent of violations.
- `--check` becomes strict mode (violations-only) to preserve the pre-UAT
  contract for scripts.
- Structured `--json` / `--yaml` gains a `data.relations` block with
  `dependsOn` and `blocks` arrays of `{ key, status }` entries.
- Inventory data sourced from `inverse(graph)` (C-11) — never re-derived in
  the CLI.

**Changed requirement IDs:**

- `BR-3.1` — `refine_in_place` (expanded JSON schema to include `relations`).
- `BR-6.1`, `BR-6.2`, `BR-6.3`, `BR-6.4` — `additive_change` (new behaviors).
- `C-11` — `additive_change` (new constraint: inventory computed via
  `inverse(graph)`).

**Updated workflow documents:** `requirements.md`, `bdd.md` (S15–S18),
`architecture.md` (D6, Data Flow), `tests.md` (4 new test IDs),
`tasks.md` (TASK-relations-formatter, TASK-relations-wire).

**`uat.md` written:** yes — `docs/CRs/MDT-189/uat.md`.

**Strict drift/lock used:** no. Standard validate per stage; all 5 stages
green (`spec-trace validate MDT-189 --stage all`).

**Implementation required:** yes — two execution slices
(TASK-relations-formatter, TASK-relations-wire). See `uat.md`.

## 8. References

- **Epic:** [MDT-188](MDT-188-dependency-graph-epic.md)
- **Design source:** [IDEA-008](../ideas/IDEA-008-ticket-dependency-graph.md)
- **User flow + guardrail diagrams:** [MDT-188/design.md](MDT-188/design.md)
- **Subdocuments (implementation input):**
  - [architecture.md](MDT-189/architecture.md)
  - [bdd.md](MDT-189/bdd.md)
  - [tests.md](MDT-189/tests.md)
  - [tasks.md](MDT-189/tasks.md)
- `domain-contracts/src/ticket/entity.ts:24-26` — relationship fields
- `domain-contracts/src/types/schema.ts:9-31` — status enum
- `shared/services/TicketService.ts:51,79,108-159` — mutation boundary
- `shared/services/MarkdownService.ts:240-247` — frontmatter write-back
- `shared/models/Ticket.ts:80-83` — frontmatter normalization
- `cli/src/commands/list.ts` — CLI command template
- `cli/src/output/{formatter,structured,colors}.ts` — CLI output patterns
- **Follow-ups:** MDT-191 (enforcement, blocked by this ticket), MDT-192
  (frontmatter guard, blocked by this ticket's migration).
