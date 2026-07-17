---
code: MDT-188
status: Proposed
dateCreated: 2026-07-17T15:33:01.144Z
type: Feature Enhancement
priority: High
---

# Ticket Dependency Graph: Implementation-Order Planning

## 1. Description

### Problem Statement

Ticket dependencies exist as data but are decorative. Tickets store `dependsOn`,
`blocks`, and prose preconditions, and nothing reconciles them or checks them
against reality. A ticket can claim `dependsOn: VOC-053` while VOC-053 is still
`Approved`, list prose preconditions ("VOC-049–VOC-052 implemented") that nobody
checks, and store a `blocks` field that contradicts its own `dependsOn`. Nothing
tells humans or agents what order to implement in, nothing detects when reality
drifts from the plan, and nothing forces a decision when a plan breaks.

Three concrete failures in the live repo today:
- Eleven `dependsOn` edges lack a reciprocal `blocks` entry.
- `MDT-082` both depends on and blocks `MDT-071`.
- The VOC lying-ticket scenario: a ticket whose structured `dependsOn` and prose
  `Precondition` section both reference unfinished work, while the ticket
  presents itself as actionable.

### Current State

- `dependsOn` and `blocks` are independent `string[]` fields
  (`domain-contracts/src/ticket/entity.ts:24-26`); both written to frontmatter
  as comma-joined scalars. `relatedTickets` is a non-graph link.
- Status mutation is centralized in `shared/services/TicketService.ts`, but its
  transition validator (`TicketService.ts:457-529`) is **deliberately dead**
  (`TicketService.ts:356`: *"Status transition validation removed to allow free
  movement. This accommodates legacy/unknown status values."*). Only the test
  mock calls it.
- No graph, traversal, cycle-detection, or topology code exists anywhere in
  `shared/`, `server/`, or `domain-contracts/`.
- Mermaid is first-class in the UI (MDT-164 overlay with pan/zoom), but as a
  generic markdown-block renderer, not a ticket→graph converter.

### Desired State

A planning tool, not a guardrail cop. The product makes implicit planning
explicit, structured, and reconcilable:

- **Build** implementation order — tell humans and agents what must come first.
- **Keep** implementation order — detect when reality drifts from the plan.
- **Store** the decisions — when a plan breaks (dependency Rejected or missing),
  force and record the decision (reject, reform, unlink) rather than letting
  tickets silently lie about their readiness.

The tool says: *"here's the order, here's what's lying about the order, here's
the decision you owe me."*

### Rationale

Implementation order is the primary planning artifact in a ticket-driven
project. Today it lives in prose preconditions and an unenforced `dependsOn`
field, and drifts undetected. An agent or human opening a ticket cannot trust
its readiness claim. Structured, checked dependencies turn tickets into an
honest plan that the tool reconciles against reality.

### Impact Areas

- `shared/` — graph module, status-satisfaction function, mutation boundary
- `cli/` — `mdt-cli deps` command (check, tree, mermaid)
- `domain-contracts/` — satisfaction function, structured error shapes
- `server/` — HTTP error surface for guardrail violations
- (later, v1.1) `src/` — UI readiness banner, focused-neighborhood graph

## 2. Solution Analysis

### Chosen Approach

**Canonical edge: `dependsOn`.** `A dependsOn B` means B must be satisfied
before A may enter an execution/success state.

**`blocks` becomes derived, not stored.** It is `inverse(dependsOn)`. One-time
migration recomputes it, writes it back once, then the `blocks` write path is
deleted. After migration `blocks === inverse(dependsOn)` is an invariant.

**Single logical well, distributed physical storage.** Files are the database;
no central `dependencies.toml`. One module — `DependencyGraph` in
`shared/services/ticket/` — is the only thing that *interprets* dependencies.
CLI, UI, MCP, HTTP, and guardrails all read through it. Storage shape follows
the medium (markdown files); access shape follows the access pattern (graph
traversal).

**Status-satisfaction is one pure function** in `domain-contracts`:

| Status | Satisfied? | Notes |
|---|---|---|
| Implemented | ✅ | |
| Rejected | ❌ terminal | Broken plan — dependent must remove or replace |
| Partially Implemented | ❌ | v1 punt |
| Proposed / Approved / In Progress / On Hold | ❌ | Transient — waiting |

**Guardrails split, not lumped.** Two cases, two policies:

| Case | Trigger | Policy |
|---|---|---|
| Waiting | dep is Approved / In Progress / On Hold | **Warn, do not block.** Free movement. |
| Broken plan | dep is Rejected, or target missing | **Hard block.** `--force` overrides, logged. |

`--force` is consistent across UI, CLI, HTTP, and MCP — never a UI-only escape
hatch. For broken-plan, force is loud and recorded; for waiting, quiet.

**Write-time validation at the `TicketService` boundary** — self-edge, duplicate,
missing target, cycle. One chokepoint; every consumer gets it for free.

**Prose-precondition policy: gloss + reconciliation prompt.** The structured
`dependsOn` is the contract. `mdt-cli deps --check` parses the ticket body for
CR-key tokens, diffs against structured `dependsOn`, and prompts to reconcile.
No semantic verification of unverifiable claims ("release evidence green") —
surface them as externally-satisfied-with-evidence or link a ticket.

### Rejected Alternatives

- **Central `dependencies.toml`.** Second source of truth; drifts the first time
  a ticket is hand-edited. Reject.
- **Independent `blocks` storage (status quo).** Two sources of truth for one
  symmetric fact; already produces contradictions in the live repo. Reject.
- **One unified guardrail rule.** Waiting and broken-plan are different
  semantics; lumping them produces either a friction-cop (blocks waiting) or a
  toothless check (allows broken plans). Reject.
- **Per-edge satisfaction conditions.** "Partially Implemented satisfies this
  specific edge" is v1 scope creep. Reject for v1; revisit if it bites.
- **Epic promotion from `phaseEpic` string.** Inferable epic identity is not
  durable identity. Reject; epics need a real parent field in a later ticket.
- **Custom DAG layout engine in React.** Enterprise sludge; Mermaid's auto-layout
  is fine. Reuse MDT-164.

## 3. Implementation Specification

### Technical Requirements

Three child tickets. See **Slice Structure** below.

### Data changes

- `blocks` write path deleted from `shared/services/TicketService.ts` and
  `shared/services/MarkdownService.ts:240-247`.
- One-time migration script produces a report committed as a CR artifact:
  `blocks === inverse(dependsOn)` for 100% of tickets, contradictions resolved
  or explicitly discarded.

### Cross-project keys

Day-one requirement. The graph keys on `{project}:{number}`, not bare numbers.
The VOC scenario (`VOC-###`) proves this is not hypothetical. Mirrors the
same-vs-cross-project distinction already in MDT-187 badge elision.

## 4. Acceptance Criteria

### Functional

- [ ] **VOC lying-ticket scenario passes.** Given a ticket with
  `dependsOn: VOC-053` where VOC-053 is `Approved`, `mdt-cli deps <KEY> --check`
  prints a violation table naming the dep, its status, and the kind (`waiting`).
- [ ] **Broken-plan guardrail fires.** Given a ticket with `dependsOn: B` where
  B is `Rejected`, attempting to move the ticket to `In Progress` is hard-blocked
  with a structured error listing B and the action (`reject-A | unlink-A`).
- [ ] **Waiting guardrail warns.** Given the same move where B is `Approved`,
  the move succeeds with a warning. No hard block.
- [ ] **`--force` override works** on broken-plan, is logged, and writes a
  decision note. Works identically across CLI, HTTP, MCP.
- [ ] **Cycle write rejected.** Creating `A→B, B→A` via `dependsOn` fails at the
  service boundary with the cycle path in the error.
- [ ] **`blocks` is read-only post-migration.** Writing `blocks` directly fails
  or is ignored; `blocks` always equals `inverse(dependsOn)`.
- [ ] **`mdt-cli deps <KEY> --tree`** renders a DAG with reference markers for
  repeated nodes (not recursive duplication). Supports `--depth`, `--direction`.
- [ ] **`mdt-cli deps <KEY> --mermaid`** emits a Mermaid `flowchart` reusing
  the MDT-164 overlay.
- [ ] **Prose reconciliation prompt.** `--check` detects CR-key tokens in the
  ticket body not present in `dependsOn` and prompts to add them.

### Non-Functional

- [ ] Graph module is O(V+E) for traversal and cycle detection; no quadratic
  behavior at the scale of a 168-ticket project.
- [ ] No new source of truth introduced. All reads go through `DependencyGraph`.

### Edge cases

- Missing dependency target (key with no ticket) → broken-plan.
- Cross-project dependency where the other project is not registered →
  broken-plan with actionable message.
- Self-dependency → rejected at write time.
- Legacy ticket with unknown status value → treated as unsatisfied (safe
  default); the migration must surface these before enforcement ships.

## 5. Slice Structure

Three child tickets. One epic to hold them.

```
MDT-189 (foundation + migration) ──┬──> MDT-190 (CLI deps) ──> MDT-191 (enforcement)
                                   └──> MDT-191 could start, but shouldn't
```

**MDT-189 — Foundation + `blocks` migration** (slices 1 + 2 of IDEA-008).
Graph module in `shared/services/ticket/DependencyGraph.ts` (`buildGraph`,
`isDependencySatisfied`, `violations`, `detectCycle`, `topoSort`, `inverse`)
plus the one-time migration that makes `blocks` read-only. Ships first;
required deliverable is the post-migration report.

**MDT-190 — CLI `mdt-cli deps --check` and `--tree`/`--mermaid`** (slices 4 + 5).
Pure additive presentation over shared services; zero data risk. **This is the
demand probe.** Ships the VOC-scenario checker — the thing the whole feature
exists for.

**MDT-191 — Write + transition enforcement** (slices 3 + 6).
Write-time validation (self/dup/cycle/missing-target) + status-mutation
guardrail (broken-plan hard block, waiting warn, logged `--force`). Both at the
`TicketService` boundary, both share the structured-error shape. **The risky
ticket** — spiritual successor to the dead validator at `TicketService.ts:356`.

### Dependency gate

MDT-189 blocks everything. MDT-190 and MDT-191 both depend on MDT-189. **But
MDT-191 is gated on MDT-190, not just sequenced after it.** Don't ship the new
validator (MDT-191) until users have proven they want the planning tool it
enforces (MDT-190). If MDT-190 gets no use, you do not want to have already
shipped the guardrail that's one legacy ticket away from being killed again.
This is the direct defense against the dead-validator failure mode: ship the
planning tool, let it run, then enforce.

## 6. Vision (not v1, recorded so it shapes v1)

- **UI (v1.1).** Per-ticket readiness banner + focused-neighborhood graph
  reusing the MDT-164 mermaid overlay. One component, one route. No custom DAG
  layout engine.
- **MCP (v1.1/v1.2).** Whatever the CLI gets, MCP gets: `check_readiness`,
  `suggest_next_actionable`, `list_unblocked`. Agents are heavy users of this
  kind of query; CLI first, MCP after.
- **Epics.** A real epic needs a parent ticket field, not promotion of the
  free-form `phaseEpic` string. v1 must not infer epic identity from labels.
- **Whole-project graph.** A 168-node graph is noise as the primary view. Useful
  as an export (Mermaid/DOT), gated behind filters, isolated nodes hidden by
  default. Build only after the focused per-ticket workflow proves useful.

## 7. Decisions Made Now

Every "we will decide later" becomes a permanent bad default. Decided:

- **Default view:** per-ticket, depth-2, both directions, isolated nodes hidden.
- **Prose policy:** gloss + reconciliation prompt; structured `dependsOn` is the
  contract.
- **Cross-project keys:** day-one. Key the graph on `{project}:{number}`.
- **`blocks`:** read-only after migration.
- **Guardrail default:** warn on waiting, hard-block on broken-plan, `--force`
  consistent across surfaces.

## 8. Concerns

- **Dead-validator culture.** Transition validation was killed because legacy
  data broke it. The migration in MDT-189 is what gives MDT-191 clean ground.
  Migrate before enforce, in that order. If the first legacy ticket trips the
  new validator and the temptation is to rip it out — that is the failure mode
  to design against.
- **Two-source-of-truth history.** Today `blocks` is stored independently of
  `dependsOn` and never reconciled. The migration must reconcile or explicitly
  discard, then make re-drift impossible by removing the write path.
- **Scale.** 168-node project graphs are unreadable. Depth and node caps must be
  explicit in the contract, not silent truncation.
- **Override honesty.** `--force` on a broken-plan is a real planning decision
  the tool should remember. If silent, the tool has stopped storing decisions
  and become bureaucracy-optional — the opposite of its purpose.

## 9. References

- `docs/ideas/IDEA-008-ticket-dependency-graph.md` — full design (promoted into this epic)
- `domain-contracts/src/ticket/{entity,frontmatter,input}.ts` — relationship fields
- `domain-contracts/src/types/schema.ts` — status enum (7 statuses, no `Blocked`)
- `shared/services/TicketService.ts:51,108-159,356,457-529` — mutation boundary, dead validator
- `shared/models/Ticket.ts:80-83` — frontmatter array normalization
- `shared/services/MarkdownService.ts:240-247` — frontmatter write-back
- `docs/design/surfaces/relationship-badge.spec.md` — current relationship UI (MDT-187)
- `docs/design/surfaces/mermaid-diagram-viewer.spec.md` — MDT-164 overlay (reuse target)
- `docs/ideas/IDEA-005-tickets-to-mermaid-grid.md` — adjacent CLI Mermaid output
- `docs/ideas/IDEA-007-status-colored-ticket-refs.md` — adjacent dependency-status visibility

### Child tickets

- **MDT-189** — Foundation + `blocks` migration (slices 1 + 2)
- **MDT-190** — CLI `deps --check` and `--tree`/`--mermaid` (slices 4 + 5)
- **MDT-191** — Write + transition enforcement (slices 3 + 6)
