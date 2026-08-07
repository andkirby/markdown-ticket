---
code: MDT-206
status: Approved
dateCreated: 2026-08-08T00:00:00.000Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-205
dependsOn: MDT-205
---

# Add epic swimlane board with progress and close guard

## 1. Description

### Requirements Scope

`requirements`

### Problem

- The board is grouped by status only. There is no way to see every epic's tickets laid out across status columns at once — i.e. to compare epic progress and scan a single status down through all epics.
- Once MDT-205 lands, epics will be first-class tickets with `level: epic` but have no visual surface on the board.
- The flat board cannot answer "which epics are stuck, which are moving" without manual filtering.

### Affected Areas

- Frontend: board view, board mode state and persistence, header controls
- Frontend: new swimlane board surface, epic progress computation
- Frontend: existing epic badge rendering (reconcile inferred vs explicit level)

### Scope

**In scope:**

- A board mode toggle ("Epics") shown when on the board view, switching between flat and swimlane layouts
- A swimlane layout: one lane per epic plus a trailing "No epic" lane, columns shared across lanes
- Per-lane epic progress (mini bar) computed live from child ticket statuses
- An epic lifecycle control on each lane header (Activate / Close / Closed) — epics do NOT appear as cards and are NOT dragged across columns
- Status-only drag-and-drop within a ticket's own epic lane; cross-epic drag is blocked
- Surfacing the epic close-guard error (from MDT-205) when Close is attempted with open children

**Out of scope:**

- Swimlanes as a peer entry in the main view switcher (this pass uses a board-mode toggle only)
- Zoom-to-one-epic filter (design3 §3)
- Epic detail modal (design3 §4)
- Epic side-rail (design3 §5)
- Rendering epics as cards on the flat board (design3 §2 — diverged)

### Constraints

- Swimlanes is triggered (for now) by an "Epics" toggle button when on Board view — not a full view-switcher refactor.
- Epics are never rendered as cards in any board mode. In swimlane mode the epic is the lane.
- Drag-and-drop is status-only within a ticket's own epic lane; cross-epic reassignment via drag is blocked (a silent spatial drag would disguise misassignment).
- Depends on MDT-205 (the `level` field and phaseEpic validation).

## 2. Desired Outcome

### Success Conditions

- When on the board view, a user can toggle an "Epics" control to switch the board into swimlane mode and back.
- In swimlane mode, a user sees every epic as a row (lane), with its tickets distributed across the shared status columns — so they can scan one status down through all epics.
- Each lane shows live epic progress, so a user can tell at a glance which epics are moving and which are stuck.
- A user can advance an epic's lifecycle (Proposed → Approved → Implemented) directly from its lane header, without opening the ticket and without dragging across columns — because epic status is a publish/close gate, not a spatial workflow.
- Dragging a ticket updates its status only; the epic axis is never changed by a drag.
- Board mode persists across navigation and reload.

### Non-Goals

- Not building the epic detail modal, side-rail, or zoom-filter (deferred).
- Not supporting cross-epic ticket reassignment via drag (that is a separate, intent-capturing action).
- Not changing the flat board's behavior when swimlanes is off.

## 3. Open Questions

| Area | Question | Constraints |
|---|---|---|
| Epic colors | Fixed rotation from tokens, or user-set per epic? | Fixed rotation for this pass; per-epic color deferred. |
| Mobile | How should swimlanes behave on narrow screens? | Design3 mock drops sticky-left and uses full-width headers below desktop. |
| Empty lanes | Hide by default, or show with an empty state? | Design3 offers a "Hide empty" toggle. |

### Decisions Deferred

- Implementation approach (determined by `mdt:architecture`)
- Specific artifacts and file placement (determined by `mdt:architecture`)
- Task breakdown (determined by `mdt:tasks`)

## 4. Acceptance Criteria

### Functional

- [ ] When on the board view, an "Epics" toggle is visible; activating it switches to swimlane mode, deactivating returns to flat.
- [ ] Board mode choice persists across navigation (board → list → board) and across page reload.
- [ ] Swimlane mode renders one lane per epic (`level: epic`) plus a trailing "No epic" lane collecting tickets with no `phaseEpic`.
- [ ] Each lane shows the epic's color dot, title, code, a mini progress bar, and a ticket count.
- [ ] Each lane header shows the epic's lifecycle state and the available transition:
  - `Proposed` → an **Activate** action moves it to `Approved`.
  - `Approved` → a **Close** action moves it to `Implemented` (disabled with a tooltip naming the blocking children when the close guard fails).
  - `Implemented` → shows a **Closed** indicator (no primary action; reopening happens via the ticket viewer).
- [ ] Epics are never rendered as cards and are never dragged across columns in any board mode.
- [ ] Columns (status) share the same widths and order across all lanes, so a single status aligns vertically down through every epic.
- [ ] Dragging a ticket to a lane-column in the same epic updates the ticket's status.
- [ ] Dragging a ticket toward a lane-column of a different epic does not accept the drop (no highlight, no status change, no epic change).
- [ ] The flat board's drag-and-drop behavior is unchanged when swimlanes is off.
- [ ] Attempting to close an epic (via the lane Close action) with open children surfaces a clear error naming the blocking children (via MDT-205's guard).
- [ ] A "Hide empty" control omits lanes with zero tickets after filters.
- [ ] "Collapse all" / "Expand all" controls work, and individual lanes can be collapsed/expanded.
- [ ] Filters, search, density, and theme all apply in swimlane mode exactly as in flat mode.

### Non-Functional

- [ ] Swimlane mode is a single synchronized-scroll surface (both axes), not per-column scroll.
- [ ] Epic progress = `(terminal children) / (total children) * 100`, computed live; terminal statuses are `Implemented`, `Rejected`, `Partially Implemented`.
- [ ] Existing inferred-epic badge rendering continues to work for legacy data; explicit `level: epic` is the primary signal once present.

### Edge Cases

- A project with no epics shows only the "No epic" lane in swimlane mode.
- A ticket whose `phaseEpic` points at a non-existent ticket appears in the "No epic" lane (does not break the view).
- Collapsing a lane and then filtering should keep the lane collapsed.
- An epic with zero children shows 0% progress and an empty lane body.
- A `Proposed` epic with zero children is effectively invisible in swimlane mode (it has no lane) — its lifecycle can still be advanced via the ticket viewer or CLI.
- The Close action is disabled (not hidden) when blocked, with a tooltip listing the non-terminal children so the user knows what to resolve.
- Reopening an Implemented epic back to Approved is done via the ticket viewer (no lane-header reopen action this pass).

## 5. Verification

### How to Verify Success

- Manual: toggle swimlanes on, confirm lanes/columns/progress render; drag within an epic; attempt a cross-epic drag and confirm it is blocked.
- Automated: end-to-end tests covering toggle, lane rendering, within-epic drag, cross-epic block, progress bar, collapse/expand.
- Regression: flat board behavior unchanged when swimlanes is off; full type validation and build pass.

## 6. References

- `designs/board-zai/design3-epics.md` §8 (swimlanes), §6 (progress) — primary UX spec
- `designs/board-zai/design3.html` — swimlane mock (HTML structure, CSS classes, drag/drop guards)
- Depends on: MDT-205 (epic level field + validation)
