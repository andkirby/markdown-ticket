# Assessment: MDT-206

## Verdict

**Recommendation**: Option 2 - Redesign Inline

## Feature Pressure

### Target Feature Needs

- Board users need an alternate epic swimlane layout without changing the flat board's status grouping.
- The UI must group non-epic tickets by `phaseEpic`, keep epics as lane headers, and compute progress from child ticket statuses.
- Drag-and-drop must remain status-only and reject cross-epic drops.
- Board layout mode, hide-empty lanes, and lane collapse controls need local persistence.

### Current System Assumptions

- `Board.tsx` owns filtered ticket input, optimistic status updates, sort preferences, and visible-column composition.
- `Column/index.tsx` owns status drop zones and ticket-card rendering for the flat board.
- Ticket cards are currently status-column children; there is no second axis for epic grouping.
- MDT-205 already provides `level: epic`, `phaseEpic` validation, and the epic close guard in shared/backend services.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | Board can absorb the mode, but grouping/progress must not overload Column. |
| Extension Fit | Healthy | Existing Board props and `useDropZone` create a clean insertion point for a sibling board surface. |
| Dependency Fit | Healthy | No new runtime packages are needed; React DnD and existing tokens cover the UI. |
| Verification Fit | Concerning | The feature needs new Playwright coverage plus focused pure helper tests for grouping/progress. |
| Redesign Scope | Concerning | A bounded component extraction is needed inside `frontend/src/components/Board/`. |

## Mismatch Points

### Board Layout Ownership

- Current system assumes: one board layout renders `Column` components directly.
- Feature needs: two sibling board layouts, flat and swimlane, sharing source tickets and mutation wiring.
- Mismatch: adding lane behavior into `Column` would mix flat-board and swimlane responsibilities.
- Adjustment required: keep `Board.tsx` as orchestrator and add a dedicated `SwimlaneBoard` component with colocated helpers/styles.
- Scope: bounded.

### Epic Lifecycle Surface

- Current system assumes: ticket status updates are initiated by dragging cards or ticket detail controls.
- Feature needs: epic lane headers expose Activate/Close/Closed lifecycle controls.
- Mismatch: epics must not render as draggable cards in swimlane mode, but their status still updates.
- Adjustment required: route lane-header status actions through the same `onTicketUpdate` path as Board drag updates, preserving MDT-205 close-guard errors.
- Scope: local.

### Cross-Epic Drag Safety

- Current system assumes: a status column accepts any draggable ticket when writing is enabled.
- Feature needs: lane columns accept only tickets whose `phaseEpic` resolves to the same lane.
- Mismatch: status-only columns have no epic axis.
- Adjustment required: swimlane drop zones must compare dragged ticket lane key against target lane key in both `canDrop` and `drop` handlers.
- Scope: local.

## Dependency and Tooling Pressure

- New packages: none.
- Runtime/config impact: browser `localStorage` keys for board mode and swimlane lane preferences.
- Testing/E2E impact: add Playwright coverage under `tests/e2e/board/` and selectors under `tests/e2e/utils/selectors.ts`.
- Main risk introduced: layout drift if swimlane CSS does not keep column widths aligned across lanes.

## Verification Gaps

- Preservation tests needed: flat board remains unchanged when swimlanes is off.
- E2E/contract drift risks: Playwright drag/drop semantics and backend close-guard error surfacing.
- Safe-to-refactor now?: yes, with tests written before runtime changes.

## Recommendation

### Option 2: Redesign Inline

Use when: the feature needs a second board layout and persistence model, but the change is bounded to Board composition and tests.
Architecture must redesign: board mode ownership, swimlane grouping/progress helpers, lane drop-zone behavior, and lane-header lifecycle action wiring.
Expected scope added: one dedicated swimlane component folder plus test and selector updates.
