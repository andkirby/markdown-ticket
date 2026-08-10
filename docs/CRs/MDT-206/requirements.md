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
| Epic ticket opening | An icon button beside the lifecycle action and the clickable epic key both open the existing epic ticket viewer. | Add a new epic detail modal. | Reusing the ticket viewer avoids a parallel epic surface in this pass. |
| Lane label layout | The lifecycle action sits directly under the progress bar; the collapse chevron sits on the status-and-count row aligned right; the title word-wraps; no color dot precedes the title; the epic key uses the shared TicketCode component. | Pin actions to the lane bottom, ellipsis the title, or render a bespoke lane key. | A dense, scannable lane header that matches ticket-card key typography. |
| Lane scroll model | The outer board provides synchronized two-axis scroll; each lane column scrolls independently within a per-lane max-height. | A single synchronized surface that forces the whole lane to grow with the longest column. | Long lists in one status must not stretch the lane or the board. |
| Lane collapse | Clicking the whole lane label toggles collapse; collapsed lanes reflow to a horizontal full-width summary bar (title + key + status + count + progress + actions) with the body hidden. | A dedicated chevron-only button, or a collapsed lane that leaves a tall sticky label column behind. | A dense, scannable list of collapsed epic summaries (design3 §8). |
| Epics URL | Swimlanes has a deep-linkable `/prj/:code/epics` route, mirroring `/list`. The layout is derived from the URL at render time. | A localStorage-only layout with no URL; or `/swimlanes` (internal name users never see). | `/epics` matches the user-facing label and the domain noun (the lane axis is epics). |
| Default View | The Settings → Default View preference (Board, Epics, List) is the authoritative source for the bare-project-path landing redirect; the switcher keeps it in sync. | A write-only preference ignored by routing, or a separate `lastBoardListMode` key that drifts. | "Default View" = "the view I land on", which is what users expect. |
| Control sizing | Icon-button controls use the `--sz-control` (32px) token for the hit target and `--sz-icon` (16px) for the glyph. | Hardcoded px per component (30×28px button, 14px icon). | One tokenized standard, documented in the styleguide. |

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
