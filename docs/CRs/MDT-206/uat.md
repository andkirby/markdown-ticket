# UAT Refinement Brief

## Objective

Make the swimlane board's status columns collapsible like the flat Board page: a per-column collapse chevron in the header collapses a status column into a 44px rail (status dot + click-to-expand), hiding that column's drop zones in every lane.

## Approved Changes

1. **Column collapse (shared with flat Board)**: each swimlane column header renders a collapse chevron. Collapsing replaces the header with a 44px click-to-expand rail (status dot only) and replaces that column's lane-body cells with a narrow strip (no drop zone, matching the flat Board).
2. **Clickable collapsed columns (Board parity)**: the collapsed column is one big expand surface — clicking the header rail *or* any lane strip re-expands the column. The strips are real `<button>`s (`aria-label="Expand column …"`), not dead divs.
3. **Shared collapse memory**: swimlane column collapse reuses the flat Board's `mdt-settings-collapsed-columns` key (keyed by primary status) + the `COLLAPSED_COLUMNS_CHANGE_EVENT` cross-tab sync. A status collapsed in one view is collapsed in the other.
4. **Independent axes**: column collapse (status axis) and lane collapse (epic axis) are independent — toggling one does not affect the other.

## Changed Requirement IDs

- `BR-5.3` — **new** behavior: swimlane column collapse to a 44px rail, shared key, independent from lane collapse.
- `column_collapses_to_rail_shared_with_flat_board` — **new** BDD scenario.
- `TEST-swimlane-board-e2e`, `TEST-swimlane-component` — extended to cover BR-5.3.

## Affected Downstream Trace

- **requirements** — BR-5.3 added; non-ambiguity row added; validated + rendered.
- **bdd** — one new scenario; validated + rendered.
- **tests** — TEST-swimlane-board-e2e + TEST-swimlane-component extended (covers += BR-5.3); validated + rendered.

## Execution Slices

### Slice 1: Swimlane column collapse (TDD)

- **Objective**: per-column collapse to a 44px rail, reusing the flat Board's collapse memory.
- **Direct artifacts/files**:
  - `src/components/SwimlaneBoard/index.tsx` (collapsedColumns state + COLLAPSED_COLUMNS_CHANGE_EVENT sync + toggleColumnCollapse; header rail/chevron; lane-body cell strip when collapsed)
  - `src/components/SwimlaneBoard/swimlane-board.css` (.swimlane-board__col-collapse, .swimlane-board__col-head--collapsed, .swimlane-board__col-expand, .swimlane-board__lane-col-rail)
  - tests: `src/components/SwimlaneBoard/SwimlaneBoard.test.tsx` (6 new column-collapse cases), `tests/e2e/board/swimlane-board.spec.ts` (column-collapse E2E), `tests/e2e/utils/selectors.ts` (colCollapseByStatus, colExpandByStatus, laneColRail)
- **Direct GREEN targets**:
  - 7 unit cases: render chevron, collapse→rail+persist shared key, expand from rail, **expand by clicking a lane strip (Board parity)**, restore from localStorage, independence from lane collapse, cross-view event sync.
  - 1 E2E case: collapse Done column → 44px rail + strip cell + shared key + re-expand via header rail **and via a lane strip**.
- **Impacted canonical task IDs**: `TEST-swimlane-board-e2e`, `TEST-swimlane-component` (covers extended).
- **Why**: "collapsible like the Board page" — the swimlane had lane collapse but no column collapse; the flat Board already has the canonical column-collapse mechanism and memory. Board parity also means the whole collapsed column is clickable, not just the header.

## Validation

```bash
bun test src/components/SwimlaneBoard/SwimlaneBoard.test.tsx
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
bun run validate:ts src/components/SwimlaneBoard/index.tsx src/components/SwimlaneBoard/SwimlaneBoard.test.tsx
spec-trace validate MDT-206 --stage all
```

All green at completion: 22/22 swimlane component (15 lane + 7 column), 10/10 swimlane E2E, all trace stages valid.

## Watchlist

- Column collapse is keyed by primary status string (e.g. `"Implemented"`), shared with the flat Board. If a future column-config change makes two columns share a primary status, collapse would affect both — but the flat Board has the same constraint, so this is the canonical behavior, not a regression.
- `act()` wraps the cross-view event-sync unit test because a raw `window.dispatchEvent` triggers a setState outside React's batching boundary. The production listener is identical to the flat Board's verified pattern.

## Prior rounds

- Rounds 1–4 (lane-label restructure, collapse approach, `/epics` route + Default View + switcher sizing, collapse persistence/Show-closed/key-before-title) are recorded in CR §8.

## Open Decisions

None.
