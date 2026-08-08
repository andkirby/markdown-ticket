# Requirements: MDT-206

**Source**: [MDT-206](../MDT-206-epic-swimlane-board.md)
**Generated**: 2026-08-08

## Overview

MDT-206 adds an epic swimlane board layout selected from the existing app header view switcher. The feature must preserve flat-board behavior, show epics as lane headers instead of cards, keep ticket drag-and-drop status-only, and surface MDT-205 epic lifecycle guard errors through the lane header action.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | `architecture.md` layout invariants; `tests.md` Playwright layout assertions |
| C2 | `architecture.md` helper ownership; helper tests |
| C3 | `architecture.md` epic classification rule; regression tests |
| C4 | `architecture.md` CSS boundary; implementation review |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Board layout mode | `flat` and `swimlanes` are board layout modes persisted in browser storage and selected by the icon-only app-header view switcher. | Swimlanes becomes a separate route or a Board-local inline toggle. | Design 3 treats Swimlanes as a peer view while sharing the board route/container. |
| Epic lane eligibility | A lane appears for explicit `level: epic` tickets that are visible and usable, plus a final `No epic` lane. | Infer all `phaseEpic` strings as lane owners. | MDT-205 makes explicit `level: epic` the primary signal. |
| Ticket lane key | A child ticket belongs to the matching explicit epic by `phaseEpic` ticket code; missing/unusable targets fall to `No epic`. | Dragging a ticket can reassign `phaseEpic`. | Cross-epic reassignment is out of scope and must be intentional. |
| Epic progress | Terminal children are `Implemented`, `Rejected`, and `Partially Implemented`. | Only `Implemented` counts as terminal. | The CR names all three statuses as terminal for progress. |
| Epic lifecycle | Lane header actions update the epic ticket status through the existing update path. | Epics are dragged as cards in swimlane mode. | In swimlane mode the epic is the lane, not card content. |
| Swimlane card badges | Swimlane cards hide attribute badges by default and expose a local Show badges toggle. | Force the global board badge settings to hide badges everywhere. | The compact swimlane scan is local to swimlanes; flat board cards keep existing behavior. |
| Epic ticket opening | An icon button in the lane footer opens the existing epic ticket viewer. | Add a new epic detail modal. | Reusing the ticket viewer avoids a parallel epic surface in this pass. |

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
