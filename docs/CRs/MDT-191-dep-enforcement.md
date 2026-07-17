---
code: MDT-191
status: Proposed
dateCreated: 2026-07-17T15:35:08.742Z
type: Architecture
priority: High
phaseEpic: MDT-188
dependsOn: [MDT-189, MDT-190]
blocks: []
---

# Dependency Write and Transition Enforcement

**Epic:** MDT-188 (Ticket Dependency Graph: Implementation-Order Planning)
**Slice:** Enforcement (IDEA-008 slices 3 + 6)

## 1. Description

### Problem Statement

Once dependencies are real data (MDT-189) and visible (MDT-190), nothing
enforces them. Writes can create cycles, self-edges, or dangling references.
Status transitions can move a ticket to `In Progress` while it depends on a
`Rejected` ticket — a broken plan that nobody is forced to resolve.

This ticket is the spiritual successor to the dead validator at
`shared/services/TicketService.ts:356` ("Status transition validation removed
to allow free movement. This accommodates legacy/unknown status values"). That
validator died because legacy data broke it. This one ships only after MDT-189's
migration has given it clean ground, and only after MDT-190 has proven the
planning tool is wanted.

### Current State

- Status mutation lives in `shared/services/TicketService.ts` around line 356.
- The transition table at `TicketService.ts:457-529` is dead code; only the
  test mock calls it.
- `RELATION_FIELDS` (`TicketService.ts:51`) and `updateTicketAttributes`
  (`TicketService.ts:108-159`) are the write chokepoint; no cycle/self/dup
  checks exist.
- Every consumer (UI drag-drop, CLI, HTTP, MCP) flows through this service.

### Desired State

Two enforcement behaviors, both at the `TicketService` boundary, both sharing
one structured error shape:

1. **Write validation.** Reject `dependsOn` writes that self-edge, duplicate,
   target a missing ticket, or introduce a cycle.
2. **Transition guardrail, split by kind.**
   - **Waiting** (dep Approved/In Progress/On Hold): warn, do not block.
   - **Broken plan** (dep Rejected or target missing): hard block.
   - `--force` / `force: true` overrides, is logged, and writes a decision
     note. Consistent across UI, CLI, HTTP, MCP.

### Scope

**In scope:**
- Write validation at `TicketService.updateTicketAttributes`.
- Transition guardrail at the status-mutation chokepoint.
- Structured error shape, shared with MDT-189's `Violation`.
- `--force` plumbing through CLI, HTTP, MCP (UI follows in v1.1).

**Out of scope:**
- Graph module (MDT-189).
- CLI query surface (MDT-190).
- UI guardrail rendering (v1.1).
- Restoring the full transition table — we are *not* reviving
  `validTransitions`; we are adding dependency-aware enforcement only.

## 2. Solution Analysis

### Design Decisions

- **One chokepoint.** All validation lives in `TicketService`. Do not sprinkle
  checks in routes, components, or formatters. Every consumer gets enforcement
  for free because they all go through the service.
- **Split, don't lump.** Waiting and broken-plan are different semantics:
  waiting is informational (reality is incomplete); broken-plan is a
  decision-forcing function (the plan is internally inconsistent). One rule
  for both produces either a friction-cop or a toothless check.
- **`--force` is consistent across surfaces.** Never a UI-only escape hatch.
  CLI flag, HTTP body field, MCP tool param — all map to the same `force:
  boolean` on the service call.
- **Force on broken-plan is loud.** It writes a decision note on the ticket
  (frontmatter field or content append — confirm at architecture) and a log
  line. Force on waiting is quiet. The difference: forcing past a broken plan
  is a real planning decision the tool must remember; forcing past waiting is
  just starting early.
- **Migrate before enforce.** MDT-189 ships first. The dead validator was
  killed by legacy data; this one stands on ground the migration cleaned.

### Structured error shape

Shared with MDT-189's `Violation`:

```ts
type ReadinessViolation = {
  ticket: string
  violations: Array<{
    dep: string
    status: string
    kind: 'waiting' | 'broken-plan'
    action: string   // e.g. 'reject-A | unlink-A' for broken-plan, 'none (informational)' for waiting
  }>
}
```

HTTP: `409 Conflict` with this body. CLI: prints the table (same format as
MDT-190's `--check`) and exits non-zero unless `--force`. MCP: returns the
violation structure in the tool result.

### Trade-offs

- **Hard blocks are user-hostile in a tool whose data has known
  inconsistencies.** Mitigation: only broken-plan is hard-blocked, `--force`
  always works, and the migration has cleaned the legacy data. Anyone who has
  run a real kanban knows "starting despite a messy dep" is legitimate; the
  tool makes that explicit and recorded rather than impossible.
- **Not reviving the full transition table.** Free status movement stays.
  Adding dependency-aware enforcement only is the minimum that earns its keep.

## 3. Implementation Specification

### Write validation (in `updateTicketAttributes`)

Before accepting a `dependsOn` write:

1. **Resolve targets.** Each value must match an existing ticket
   (`{project}:{number}` resolved cross-project). Missing → reject.
2. **No self-edge.** `dependsOn` cannot contain the ticket's own key.
3. **No duplicate.** Deduplicate silently; no error (matches existing array
   accumulation behavior at `TicketService.ts:108-159`).
4. **No cycle.** Apply the write to a working copy of the graph, run
   `DependencyGraph.detectCycle`. If a cycle is returned, reject with the cycle
   path in the error.

All four checks return the structured error shape with `kind: 'broken-plan'`
and a specific `action` field.

### Transition guardrail (at status mutation)

Before mutating status to `In Progress`, `Implemented`, or
`Partially Implemented`:

1. Run `DependencyGraph.violations(ticket, graph)`.
2. Partition violations by `kind`:
   - Any `broken-plan` and no `force` → reject with structured error.
   - Any `broken-plan` and `force: true` → allow, write decision note, log.
   - Any `waiting` → allow with warning (return warnings in result; do not
     block). `force` is accepted but quiet.

### `--force` plumbing

- **CLI:** `--force` flag on `mdt-cli attr` / status commands.
- **HTTP:** `force: true` in the request body of the status/attr mutation
  endpoint.
- **MCP:** `force: true` param on `update_cr_status` / `update_cr_attrs`.
- **Service:** `force: boolean` parameter on the underlying `TicketService`
  call.

Decision-note write (on broken-plan force): append a timestamped line to
`implementationNotes` (or a new `planningDecisions` frontmatter field — confirm
at architecture). Must be human-readable and survive the next write.

## 4. Acceptance Criteria

### Write validation

- [ ] Adding a self-edge (`MDT-188 dependsOn MDT-188`) is rejected with a
  structured error naming the self-edge.
- [ ] Adding a dependency on a non-existent key (`MDT-188 dependsOn MDT-999`)
  is rejected with a structured error.
- [ ] Adding a cross-project dependency on an unregistered project is rejected
  with an actionable message.
- [ ] Creating a cycle (`A→B, B→A`) is rejected; the error includes the cycle
  path (`A → B → A`).
- [ ] Duplicate edges are deduplicated silently (no error, no duplicate stored).
- [ ] All four checks go through `TicketService.updateTicketAttributes`; no
  consumer can bypass.

### Transition guardrail

- [ ] Moving a ticket to `In Progress` when a dep is `Rejected` is hard-blocked;
      the error lists the dep, its status, kind `broken-plan`, and action
      (`reject-A | unlink-A`).
- [ ] Moving a ticket to `In Progress` when a dep is `Approved` succeeds with a
      warning; the warning is returned in the result.
- [ ] `--force` / `force: true` overrides the broken-plan block, writes a
      decision note, and logs.
- [ ] `--force` works identically across CLI, HTTP, and MCP (UI deferred to
      v1.1; tracked as a follow-up).
- [ ] Status transitions to states other than `In Progress` / `Implemented` /
      `Partially Implemented` are unaffected (free movement preserved).

### VOC end-to-end

- [ ] Given the VOC fixture (`dependsOn: VOC-053`, VOC-053 Approved): moving
      the ticket to `In Progress` succeeds with a waiting warning. With VOC-053
      set to Rejected: the move is hard-blocked until `--force`.

## 5. Verification

- Mutation tests through `TicketService` for every write-validation case.
- Mutation tests for both guardrail kinds (waiting/broken-plan) and the force
  path.
- HTTP integration test: `409` response shape matches the structured error.
- MCP test: tool result carries the violation structure.
- `bun run --cwd server jest` and `bun run validate:ts` on changed files.

## 6. Open Questions

- Decision-note storage: append to `implementationNotes` (existing field,
  human-readable) or new `planningDecisions` frontmatter field (structured)?
  Recommend `implementationNotes` for v1 — structured field is scope creep.
  Confirm at architecture.
- Should the waiting warning be returned synchronously in the mutation result,
  or emitted as a separate log/event? Recommend synchronous in result; simpler
  for all consumers. Confirm.

## 7. Risks

- **This is the ticket most likely to be killed by culture.** The dead
  validator died because legacy data broke it and the answer was to delete the
  check. The defense is sequence: MDT-189's migration runs first; this ticket
  enforces on clean ground. If the first legacy ticket trips the new validator
  and someone proposes ripping it out — that is the failure mode. The answer is
  to fix the data, not delete the check.
- **Hard blocks are a regression risk.** Any existing workflow that moves
  tickets with unresolved deps will break. Mitigation: only `broken-plan`
  hard-blocks; `waiting` warns; `--force` always works; the migration has
  resolved the historical contradictions.

## 8. References

- **Epic:** MDT-188
- **Design:** `docs/ideas/IDEA-008-ticket-dependency-graph.md` (slices 3 + 6)
- **Depends on:** MDT-189 (graph module + migration), MDT-190 (proves demand
  before enforcement ships)
- `shared/services/TicketService.ts:51,108-159,356,457-529` — mutation boundary,
  dead validator tombstone, dead transition table
- `domain-contracts/src/types/schema.ts:9-31` — status enum (no `Blocked`)
- `server/openapi/schemas.ts:287-320` — relationship field OpenAPI docs (will
  need updating for the structured error)
