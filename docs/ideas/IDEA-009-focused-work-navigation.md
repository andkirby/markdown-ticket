---
id: IDEA-009
status: triage
date: 2026-07-28
resolution-date:
promoted-to:
---

# Focused Work Navigation

## Idea

Let a user choose one ticket as the current focus, move through related tickets
and documents, and always return to that anchor. An optional right-side panel
could show the current preview, navigation trail, and explicit relationship
neighborhood without taking the user away from the board.

## Investigation

### Fit

Strong fit. MDT already joins tickets, specifications, subdocuments, dependency
relationships, and cross-project navigation. The missing concept is continuity
while a user moves between those surfaces.

### Adjacent work

- MDT-197 owns the persistent pin rail and cross-view working set.
- MDT-174 and MDT-204 own the ticket-focused trace graph.
- MDT-150, MDT-161, MDT-162, and MDT-169 cover document links, document
  navigation, and filename tabs.
- Quick Search and browser routes already provide global discovery and browser
  Back/Forward behavior.

This idea should compose those capabilities, not replace or duplicate them.

### Proposed interaction model

- **Focus anchor:** one ticket selected explicitly by the user.
- **Focus trail:** transient ordered history of tickets and documents opened
  while working from the anchor.
- **Related neighborhood:** only explicit ticket dependencies, relationships,
  and linked documents.
- **Return to focus:** persistent one-action affordance.
- **Focus panel:** optional right-side panel for preview, trail, and the focused
  neighborhood; collapses when the board needs the width.

### Boundaries

- Pins are a persistent multi-item working set; focus is one current context.
- Visited does not mean related.
- Do not infer or persist relationships from browsing behavior.
- Do not replace URL routes or browser history with private component state.
- Do not turn the panel into a duplicate Documents View or whole-project graph.
- Mobile needs a separate sheet/tab interaction; a permanent side panel is
  desktop-only.

### Challenges

- **Duplication:** overlaps with the pin rail, Ticket Viewer, document tabs, and
  trace graph unless ownership is explicit.
- **Scope:** complete delivery is Large; it spans shell composition, routing,
  history, previews, and relationship presentation.
- **Prematurity:** the right-side panel should not be built merely to consume
  empty board space. The focus workflow must prove useful first.
- **Dependency:** requires a UX interaction contract covering focus creation,
  replacement, clearing, trail lifetime, URL behavior, and panel precedence.

## Decision

**Investigate more.** Preserve the focus-anchor model in the Design 3 shell
exploration, but do not add it to the first redesign delivery. The next step is
a focused UX specification with three states: focus established, navigation
away from focus, and return to focus. Validate that model before deciding
whether the right-side panel is persistent, contextual, or user-toggleable.

Estimated effort: **L** for the complete concept; **S–M** for a testable
focus-anchor and return-path slice using existing routes and Ticket Viewer.

## References

- `research/design3-frontend-adoption-strategy.md`
- `docs/CRs/MDT-197-pin-rail.md`
- `docs/CRs/MDT-174-trace-graph-viewer.md`
- `docs/CRs/MDT-204-trace-graph-chain-depth.md`
- `docs/design/surfaces/ticket-viewer.spec.md`
- `docs/design/surfaces/documents-view-navigation.spec.md`
- `docs/design/surfaces/quick-search.interactions.md`
