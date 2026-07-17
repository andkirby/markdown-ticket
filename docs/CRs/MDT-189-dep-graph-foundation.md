---
code: MDT-189
status: Proposed
dateCreated: 2026-07-17T15:35:08.528Z
type: Architecture
priority: High
phaseEpic: MDT-188
dependsOn: []
blocks: [MDT-190, MDT-191]
---

# Dependency Graph Foundation and `blocks` Migration

**Epic:** MDT-188 (Ticket Dependency Graph: Implementation-Order Planning)
**Slice:** Foundation (IDEA-008 slices 1 + 2)

## 1. Description

### Problem Statement

Ticket dependencies are stored but never interpreted. No graph, no traversal,
no cycle detection exists. `blocks` is stored independently of `dependsOn` and
never reconciled — the live repo has 11 edges missing reciprocal `blocks` and
one outright contradiction (`MDT-082` ↔ `MDT-071`). Every downstream slice
(MDT-190 query, MDT-191 enforcement) needs a single module to read through.

### Current Architecture

- `dependsOn`, `blocks`, `relatedTickets` are independent `string[]` fields on
  `Ticket` (`domain-contracts/src/ticket/entity.ts:24-26`).
- Frontmatter is the database; arrays are stored as comma-joined scalars
  (`shared/models/Ticket.ts:80-83`, `shared/services/MarkdownService.ts:240-247`).
- Mutation flows through `shared/services/TicketService.ts:108-159`
  (`updateTicketAttributes`), which already special-cases relation fields.
- No graph, traversal, or cycle-detection code exists anywhere in `shared/`,
  `server/`, or `domain-contracts/`.

### Proposed Architecture

One module in `shared/services/ticket/DependencyGraph.ts` is the only thing
that interprets dependencies. Every consumer (CLI, UI, MCP, HTTP, guardrails)
reads through it. Storage stays distributed (files); logic is a single well.

`blocks` becomes derived: `blocks := inverse(dependsOn)`. The write path is
deleted after migration.

### Rationale

Two sources of truth for one symmetric fact is the bug, not a feature. The
live repo already proves the failure mode. A graph engine built on lying data
produces lying output. Fix the data model before building anything on top.

## 2. Solution Analysis

### Key Components

- `DependencyGraph` module (pure functions over `Ticket[]`).
- `isDependencySatisfied` in `domain-contracts` (importable without the graph).
- Migration script (one-shot) + committed report.
- `blocks` write-path removal in `TicketService` and (optionally)
  `MarkdownService`.

### Design Decisions

- **Canonical edge: `dependsOn`.** It carries the semantic weight
  ("B must be done before A"); `blocks` is its inverse.
- **Cross-project keys, day-one.** The graph keys on `{project}:{number}`. The
  VOC scenario (`VOC-###`) is not hypothetical. Same-project edges resolve bare
  numbers against the active project's code; cross-project edges stay fully
  qualified. Mirrors MDT-187 badge elision.
- **`blocks` read-only after migration.** Not "audited" — decided. Write path
  removed. Invariant enforced by removing the ability to drift.

### Trade-offs

- We lose the ability for humans to set `blocks` independently. That ability
  was the bug; losing it is the fix.
- We keep `blocks` in frontmatter (human-readable) but derive it from
  `dependsOn`. This means a hand-edit to `blocks:` in a markdown file will be
  overwritten on next write. That's acceptable and correct — `dependsOn` is the
  contract.

## 3. Implementation Specification

### Module: `shared/services/ticket/DependencyGraph.ts`

Pure functions. No file I/O, no mutation — the caller hands in tickets, gets
back derived structures.

```ts
buildGraph(tickets: Ticket[]): DepGraph
isDependencySatisfied(status: string): boolean          // also in domain-contracts
violations(ticket: Ticket, graph: DepGraph): Violation[]
detectCycle(graph: DepGraph): CyclePath | null           // O(V+E) DFS, returns path
topoSort(graph: DepGraph): Ticket[]                      // for next-actionable ordering
inverse(graph: DepGraph): Record<string, string[]>       // blocks := inverse(dependsOn)
```

`Violation` shape (shared with MDT-191):

```ts
{ dep: string, status: string, kind: 'waiting' | 'broken-plan', action: string }
```

### Status-satisfaction table (`isDependencySatisfied`)

| Status | Satisfied? |
|---|---|
| Implemented | ✅ |
| Rejected | ❌ terminal |
| Partially Implemented | ❌ (v1 punt) |
| Proposed / Approved / In Progress / On Hold | ❌ |

### Migration Strategy

1. Read every ticket in every registered project.
2. Compute `blocksComputed := inverse(dependsOn)`.
3. Diff against stored `blocks`. Report:
   - missing reciprocals (added),
   - extra reciprocals (removed),
   - contradictions (e.g. `MDT-082` ↔ `MDT-071`) — flagged, not auto-resolved.
4. Write `blocks := blocksComputed` for all tickets.
5. Commit the report as a CR artifact
   (`docs/CRs/MDT-188/blocks-migration-report.md`) listing every changed
   ticket and every flagged contradiction with the resolution chosen.
6. Delete the `blocks` write path:
   - `shared/services/TicketService.ts:51` — remove `blocks` from `RELATION_FIELDS`.
   - `shared/services/TicketService.ts:108-159` — reject `blocks` in
     `updateTicketAttributes` with an explicit error (silent drop rejected;
     silent drops are how data drifts back).
   - `shared/services/MarkdownService.ts:240-247` — keep writing `blocks` to
     frontmatter (still stored; just no longer user-writable). The write
     happens from the derived value, not from user input.

### Dependencies

- None within MDT-188. This is the root; MDT-190 and MDT-191 depend on this.

### Risk Assessment

- **Migration is a one-way door.** Once `blocks` is recomputed and the write
  path is removed, the old data is gone. The report is the audit trail. Run
  dry-run first; review the diff; commit before deleting the write path.
- **Contradictions hide bugs.** `MDT-082` ↔ `MDT-071` is not just bad data —
  it's a signal that someone's mental model of the dependency was wrong. The
  migration must surface these loudly, not silently pick a winner.

## 4. Acceptance Criteria

- [ ] `DependencyGraph` module exists and is exported from `shared/services/ticket/`.
- [ ] `buildGraph` handles same-project and cross-project edges; bare numbers
  resolve to the active project's code.
- [ ] `isDependencySatisfied` lives in `domain-contracts` and matches the table
  above.
- [ ] `violations(ticket, graph)` returns `{dep, status, kind, action}` rows.
- [ ] `detectCycle` returns the cycle path (e.g. `A → B → C → A`) or null;
  O(V+E); tested on synthetic cycles of varying length.
- [ ] `topoSort` produces a stable, deterministic order on a fixture DAG.
- [ ] `inverse` produces `blocks := inverse(dependsOn)` and round-trips.
- [ ] **VOC fixture test passes.** A fixture ticket with `dependsOn: VOC-053`
  (Approved) returns one `waiting` violation naming VOC-053.
- [ ] Migration runs against the live repo and produces a report listing every
  changed ticket (11+ missing reciprocals) and every contradiction
  (`MDT-082` ↔ `MDT-071`) with the chosen resolution.
- [ ] Post-migration, `blocks === inverse(dependsOn)` holds for 100% of tickets
  (verified by a one-shot check script; result recorded in the report).
- [ ] The `blocks` write path is removed from `TicketService.updateTicketAttributes`.
  Attempting to set `blocks` via that API returns an explicit error.

## 5. Verification

- Unit tests for every `DependencyGraph` function on a fixture project.
- Snapshot test reproducing the VOC lying-ticket scenario — `violations()` on a
  ticket with `dependsOn: VOC-053` (Approved) returns the violation row.
- Migration dry-run + real run; diff committed.
- `bun run --cwd server jest` for shared-service tests; `bun run validate:ts`
  on changed files.

## 6. Open Questions

- Contradictions flagged during migration (e.g. `MDT-082` ↔ `MDT-071`): who
  decides the resolution, and where is the decision recorded? Recommend: the
  migration run is interactive (prompt y/N per contradiction) and the decision
  is written into the report. Confirm at architecture.

## 7. References

- **Epic:** MDT-188
- **Design:** `docs/ideas/IDEA-008-ticket-dependency-graph.md` (slices 1 + 2)
- `domain-contracts/src/ticket/entity.ts:24-26` — relationship fields
- `domain-contracts/src/types/schema.ts:9-31` — status enum
- `shared/services/TicketService.ts:51,108-159` — mutation boundary
- `shared/services/MarkdownService.ts:240-247` — frontmatter write-back
- `shared/models/Ticket.ts:80-83` — frontmatter array normalization
- **Epic siblings:** MDT-190 (CLI query), MDT-191 (enforcement) — both blocked
  by this ticket.
