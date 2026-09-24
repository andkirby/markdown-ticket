# Requirements: MDT-248

**Source**: [MDT-248](../MDT-248-ticket-side-doc.md) · [requirements.trace.md](./requirements.trace.md)
**Generated**: 2026-09-23 · Stage: `mdt:requirements` · Mode: full

## Overview

MDT-248 gives the ticket viewer a side reading pane: repo-document links inside the open ticket modal open beside the ticket instead of navigating to the Documents view, with a per-pane history, a three-state session (closed / open / hidden), a reveal pill, and a narrow-viewport overlay mode. The primary beneficiary is the reviewer working a ticket whose real footprint spans many documents (the MDT-226 case); the key constraint is that the ticket column never moves, narrows, or loses scroll position. Interaction contract: `docs/design/surfaces/ticket-side-doc.interactions.md`.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 (split geometry) | architecture.md (Modal variant), tasks.md (Verify), tests.md (layout assertions) |
| C2 (no-jump / scroll preservation) | architecture.md (scroll transfer), tests.md (E2E scroll assertions) |
| C3 (keyboard + Esc chain) | architecture.md (Esc wiring), tests.md (keyboard flows) |
| C4 (prose parity) | architecture.md (rendering), tests.md (class assertions) |
| C5 (landmark + announcements) | architecture.md (a11y), tests.md (aria assertions) |
| C6 (delivery isolation outside modal) | architecture.md (context default), tests.md (regression) |
| C7 (missing links stay inert) | architecture.md (no interception for flagged), tests.md (regression, existing specs) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Session | {current document, history stack + index, per-entry scroll, last-known titles} created on first document open; modal close keeps a per-ticket snapshot in localStorage (project+ticket scoped, FILO cap 5) that reopens hidden with the pill (revised UAT r7) | session persisted globally or per project | the reading context belongs to the ticket; a capped FILO keeps storage bounded and fresh (Edge-5) |
| Hide vs discard | Hide (Esc, overlay ‹ Ticket, modal close) preserves the session; only × (pane close) discards — and clears that ticket's snapshot (revised UAT r7) | Esc discarding, or a mode that also discards | Esc must never destroy reading state (CR constraint); one destroy affordance keeps the model learnable |
| Repeated same-doc click | No history push (no-op navigation); consecutive duplicates never push | push duplicates | browser-tab model; keeps back/forward meaningful |
| History push | Truncates the forward stack (browser-tab model) | append-only stack | matches learned browser semantics from the POC |
| Ticket hop | Ticket-column swap via ticket/epic link; pane session explicitly survives | pane clears on ticket switch | mid-review context is the point of the pane (CR success condition) |
| Delivery model | Follow-always: a document-link click always reveals the pane inside the ticket modal | mode toggle flipping link semantics | stable learnable default (designs/ticket-side-doc/decisions.md B1) |
| "Repo document" | Anything the link pipeline classifies as DOCUMENT (markdown or sandboxed HTML) resolved against the project document index | ticket subdocuments (tab navigation), FILE/EXTERNAL/ANCHOR links | routing table in interactions.md § Link routing |

## Configuration

None in this ticket. A future `documentLinks.openIn` default belongs to the existing link-configuration surface (config.toml link defaults) and is out of scope.

## Open Questions carried to architecture

- Pane session state location (component state vs URL) — CR §3, resolved by architecture.
- Scroll-container transfer mechanics without position jump — CR §3.
- E2E strategy for two-column modal assertions — CR §3, resolved at tests stage.

---
*Rendered by mdt:requirements via spec-trace*

## UAT r7 Addendum (2026-09-24)

Two requirement records changed after the initial stage (canonical state in
`requirements.trace.md`; upserted via spec-trace):

- **Edge-5 (revised)**: a modal close no longer discards the session — it keeps a
  per-ticket snapshot in localStorage (`mdt-settings-ticket-side-pane-sessions`,
  project+ticket scoped, FILO cap 5, most-recent first) restored **hidden** with
  the reveal pill on the next open of that ticket. The pane × discards and clears
  the snapshot. Obsolete entries are bounded by the cap; deleted documents
  degrade to the Edge-2 failure UX on restore.
- **BR-1.11 (new)**: right-clicking the back/forward controls shows that
  direction's history as a jump menu (document title over mono file path, the
  documents nav-tree row format); activating an entry jumps without truncating
  the stack.
