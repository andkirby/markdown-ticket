---
id: IDEA-008
status: promoted
date: 2026-07-17
resolution-date: 2026-07-17
promoted-to: MDT-188
---

# Ticket Dependency Graph: Implementation-Order Planning

## Idea

Make ticket dependencies operational rather than decorative. This is **a
planning tool**, not a kanban guardrail. The product is not the graph — the
graph is a view. The product is making implicit planning explicit, structured,
and reconcilable against reality:

- **Build** implementation order: tell humans and agents what must come first.
- **Keep** implementation order: detect when reality drifts from the plan.
- **Store** the decisions: when a plan breaks, force and record the decision
  (reject, reform, unlink) rather than silently letting tickets lie about their
  own readiness.

The tool says: *"here's the order, here's what's lying about the order, here's
the decision you owe me."* Not *"no, you can't move that ticket."*

Guardrails earn their keep only where a plan is internally broken (a dependency
is Rejected or missing), not where reality is merely incomplete (a dependency
is still Approved). Those are different semantics and get different policies.

## Investigation

### Current state

- Tickets store `dependsOn` and `blocks` as independent `string[]` fields
  (`domain-contracts/src/ticket/entity.ts:24-26`); both are written to
  frontmatter as comma-joined scalars. `relatedTickets` is a non-graph link.
- `phaseEpic` is a free-form string label, not a ticket key. No Epic type and
  no parent/child model exist.
- Status mutation is centralized in `shared/services/TicketService.ts`, but its
  transition validator (`TicketService.ts:457-529`) is **deliberately dead**.
  Line 356: *"Status transition validation removed to allow free movement.
  This accommodates legacy/unknown status values."* Only the test mock calls
  it. Any new enforcement must reckon with why this was killed.
- Checkout scan: 168 tickets, 13 `dependsOn` edges, 6 `blocks` edges. Eleven
  dependency edges lack a reciprocal `blocks` entry. `MDT-082` both depends on
  and blocks `MDT-071`. No missing targets, self-edges, or cycles today — but
  nothing enforces that; it is luck, not contract.
- No graph/traversal/cycle/topology code exists anywhere in `shared/`,
  `server/`, or `domain-contracts/`.
- Mermaid is first-class in the UI (MDT-164 overlay with pan/zoom), but it is a
  generic markdown-block renderer, not a ticket→graph converter.
- IDEA-005 proposes Mermaid CLI output and lists a dependency graph as a
  follow-up family member.

### The real spec: a lying ticket

A ticket whose frontmatter says `dependsOn: VOC-053` and whose body says:

```
Precondition                       | Status    | Evidence
VOC-049–VOC-052 implemented        | ❌        | VOC-052 still "Approved"
VOC-053 release evidence green     | ❌        | VOC-053 still "Approved"
dependsOn: VOC-053                 | ❌        | Not Implemented
```

This ticket is lying about its readiness in **two languages at once** — English
prose in a Precondition section, and a structured `dependsOn` field — and
nothing checks either. This scenario is the acceptance test for v1. Note the
cross-project key (`VOC-###`): the graph must key on `{project}:{number}` from
day one, not bare numbers.

## Design

### Data contract

**Physical storage stays distributed.** Files are the database in this project;
a central `dependencies.toml` would be a second source of truth that drifts the
first time someone edits a ticket by hand. Reject the central store.

**Logical access is a single well.** One module — `DependencyGraph` in
`shared/services/ticket/` — is the only thing allowed to *interpret*
dependencies. CLI, UI, MCP, HTTP, and guardrails all read through it. The graph
is computed from distributed storage on demand (cached with file-watch
invalidation). Storage shape follows the storage medium (markdown files);
access shape follows the access pattern (graph traversal). Do not confuse them.

**Canonical edge: `dependsOn`.** `A dependsOn B` means B must be satisfied
before A may enter an execution/success state.

**`blocks` becomes derived, not stored.** It is the inverse projection
`inverse(dependsOn)`. One-time migration recomputes it, writes it back once for
compatibility, then the `blocks` write path is deleted. After migration
`blocks === inverse(dependsOn)` is an invariant, enforced by removing the
ability to write it independently. No "compatibility audit" that defers the
decision — the decision is: read-only after migration.

`relatedTickets` stays untouched. It is a link, not a graph edge; it has no
satisfaction semantics.

### Status satisfaction — one pure function

Define `isDependencySatisfied(status)` once in `domain-contracts`. Every
consumer uses it.

| Status                  | Satisfied? | Notes                                            |
| ----------------------- | ---------- | ------------------------------------------------ |
| Implemented             | ✅         |                                                  |
| Rejected                | ❌ terminal | Broken plan — dependent must remove or replace   |
| Partially Implemented   | ❌         | v1 punt; revisit if it bites                     |
| Proposed / Approved /   | ❌         | Transient / waiting — informational, not broken   |
| In Progress / On Hold   |            |                                                  |

Rejected is not "waiting." A dependency on a rejected ticket is itself probably
invalid and must be surfaced as a broken plan, not lumped with transient
states.

### Guardrails — split, do not lump

Two cases, two policies:

| Case          | Trigger                                    | Policy                                                       |
| ------------- | ------------------------------------------ | ------------------------------------------------------------ |
| **Waiting**   | dep is Approved / In Progress / On Hold    | **Warn, do not block.** Free movement. Reality is just early. |
| **Broken plan** | dep is **Rejected**, or target **missing** | **Hard block.** `--force` overrides, is logged, and writes a decision note. Force a decision. |

Structured error carries the kind so every surface can render it correctly:

```
{ ticket: "A", violations: [
  { dep: "B", status: "Rejected", kind: "broken-plan", action: "reject-A | unlink-A" },
  { dep: "C", status: "Approved", kind: "waiting",     action: "none (informational)" },
]}
```

`--force` / `force: true` is consistent across UI, CLI, HTTP, and MCP — never
a UI-only escape hatch. For `broken-plan`, force is loud and recorded (a note
on the ticket or a log line); for `waiting`, force is quiet.

The validator killed at `TicketService.ts:356` died because it broke on legacy
data. The new enforcement lives on clean ground because the migration runs
first. **Order matters: migrate before enforce.** Do not ship enforcement that
the first legacy ticket will tempt someone to rip out.

### Write-time validation

All `dependsOn` writes pass through `TicketService.updateTicketAttributes`
(which already special-cases relation fields at lines 108-159). One chokepoint.
Reject writes that:

- reference a missing target (no such ticket / unknown project key),
- create a self-edge,
- duplicate an existing edge,
- introduce a cycle (DFS, O(V+E), returns the cycle path in the error).

This is the only place validation belongs. Do not sprinkle checks in routes,
components, or formatters.

### Prose preconditions — policy, not magic

The VOC example shows preconditions living in both prose and structured fields.
Three honest options, and v1 picks the first:

1. **Gloss + reconciliation prompt.** Prose preconditions are a human gloss;
   `dependsOn` is the contract. `mdt-cli deps <KEY> --check` parses the ticket
   body for CR-key-shaped tokens, diffs them against the structured `dependsOn`,
   and prompts to reconcile: *"You mention VOC-049..VOC-052 in your
   Precondition section but they are not in dependsOn. Add? [y/N]"*. Lossy but
   useful, deterministic, and exactly the CLI input interface this tool needs.
2. **Agent reconciliation.** An LLM reads prose preconditions and proposes
   structured `dependsOn` edits; the parser from (1) is the deterministic spine
   the agent wraps. MCP-first-class later; not v1.
3. **No semantic verification of prose claims.** *"VOC-053 release evidence
   green"* is a claim about the world, not a ticket status. The tool cannot
   check it without a model of "release evidence." Surface it as *unverifiable
   precondition — link a ticket or mark satisfied-with-evidence.* Do not
   pretend.

v1 = (1) + (3). The discipline: a prose precondition must either become a
structured edge or be explicitly marked as externally-satisfied-with-evidence.
No middle ground where a precondition is just English nobody checks.

## Delivery

### Slice order

The graph module is the spine. The **first user-facing slice is the checker,
not the renderer** — because the checker is what fights the VOC scenario, and
it is the cheapest probe for real demand.

Slices are grouped into three child tickets (see MDT-188 for the canonical
breakdown):

- **MDT-189 — Foundation + `blocks` migration** (slices 1 + 2 below).
- **MDT-190 — CLI `deps --check` and `--tree`/`--mermaid`** (slices 4 + 5).
- **MDT-191 — Write + transition enforcement** (slices 3 + 6).

Slice detail (for reference; tickets are authoritative):

1. **Graph module** — `shared/services/ticket/DependencyGraph.ts`: `buildGraph`,
   `isDependencySatisfied`, `violations(ticket)`, `detectCycle`, `topoSort`,
   `inverse`. → verify: unit tests on a fixture project, including the VOC
   scenario as a test case.
2. **`blocks` migration** — recompute, write-once, delete the write path. →
   verify: post-migration `blocks === inverse(dependsOn)` for 100% of tickets;
   report committed as a CR artifact.
3. **Write-time validation** at the `TicketService` boundary — self / dup /
   cycle / missing-target. → verify: mutation tests through the service.
4. **`mdt-cli deps <KEY> --check`** — prints the violation table with evidence
   (the VOC format above), plus prose-precondition reconciliation prompt. **This
   is the first user-facing slice and the real test of demand.** → verify:
   snapshot tests on a known-broken fixture.
5. **`mdt-cli deps <KEY> --tree [--depth=N] [--direction=up|down|both]`** and
   `--mermaid` output. Repeated nodes use reference markers, not recursive
   duplication (it is a DAG, not a tree). → verify: snapshot tests.
6. **Status-mutation guardrail** at the service boundary — broken-plan = hard
   block (logged `--force`), waiting = warn. → verify: tests for both kinds and
   the force-override path.

Slices 1–6 are the product. The hard part is consistent mutation behavior across
file storage, shared services, HTTP, MCP, CLI, and optimistic drag/drop — not
the renderer.

### Follow-up projections (mentioned, not v1)

- **v1.1 — UI.** Per-ticket readiness banner + focused-neighborhood graph
  reusing the MDT-164 mermaid overlay. One component, one route. No custom DAG
  layout engine — Mermaid's auto-layout is fine; writing one is enterprise
  sludge.
- **v1.1/v1.2 — MCP.** Whatever the CLI gets, MCP gets: `check_readiness`,
  `suggest_next_actionable`, `list_unblocked`. Agents are heavy users of this
  kind of query; build the shared module and MCP wraps it. CLI first, MCP after.

### Vision (not v1, recorded so it shapes v1)

- **Epics.** A real epic needs a parent ticket field, not promotion of the
  free-form `phaseEpic` string. v1 must not infer epic identity from labels.
  When epics arrive, an "opened epic" default view follows naturally from a
  canonical child→parent key.
- **Whole-project graph.** A 168-node graph is noise as the primary view.
  Useful as an export (Mermaid/DOT), gated behind filters, with isolated nodes
  hidden by default. Build only after the focused per-ticket workflow proves
  useful.

## Decisions made now (not deferred)

Every "we will decide later" becomes a permanent bad default. Decided:

- **Default view:** per-ticket, depth-2, both directions, isolated nodes hidden.
- **Prose policy:** gloss + reconciliation prompt; structured `dependsOn` is the
  contract.
- **Cross-project keys:** day-one. Key the graph on `{project}:{number}`.
- **`blocks`:** read-only after migration.
- **Guardrail default:** warn on waiting, hard-block on broken-plan, `--force`
  consistent across surfaces.

## Concerns

- **Dead-validator culture.** Transition validation was killed because legacy
  data broke it. The migration in slice 2 is what gives slices 3 and 6 clean
  ground. If the first legacy ticket trips the new validator and the temptation
  is to rip it out — that is the failure mode to design against. Migrate before
  enforce, in that order.
- **Two-source-of-truth history.** Today `blocks` is stored independently of
  `dependsOn` and never reconciled (11 missing reciprocals, 1 contradiction in
  the live repo). The migration must reconcile or explicitly discard, then make
  re-drift impossible by removing the write path.
- **Scale.** 168-node project graphs are unreadable. Depth and node caps must be
  explicit in the contract, not silent truncation.
- **Override honesty.** `--force` on a broken-plan is a real planning decision
  the tool should remember. If it is silent, the tool has stopped storing
  decisions and become bureaucracy-optional — the opposite of its purpose.

## Decision

**Promoted to MDT-188** (epic) on 2026-07-17, with three child tickets:
MDT-189 (foundation + migration), MDT-190 (CLI query), MDT-191 (enforcement).
Ship canonical dependency semantics, the migration, and `mdt-cli deps --check`
before any graph UI. Use the VOC lying-ticket scenario as the v1 acceptance
test.

Overall effort: **L**, dominated by consistent mutation behavior across all
surfaces, not by graph rendering. MDT-188 carries the canonical acceptance
criteria; this idea doc is the investigation record.

## References

- `domain-contracts/src/ticket/{entity,frontmatter,input}.ts` — relationship fields
- `domain-contracts/src/types/schema.ts` — status enum (no `Blocked` status)
- `shared/services/TicketService.ts:51,108-159,356,457-529` — mutation boundary, dead validator
- `shared/models/Ticket.ts:80-83` — frontmatter array normalization
- `docs/design/surfaces/relationship-badge.spec.md` — current relationship UI
- `docs/design/surfaces/mermaid-diagram-viewer.spec.md` — MDT-164 overlay (reuse target)
- `docs/ideas/IDEA-005-tickets-to-mermaid-grid.md` — adjacent CLI Mermaid output
- `docs/ideas/IDEA-007-status-colored-ticket-refs.md` — adjacent dependency-status visibility
