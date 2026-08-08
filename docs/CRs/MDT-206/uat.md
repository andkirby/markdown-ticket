# UAT Refinement Brief

## Objective

Apply the approved UAT round of epic-swimlane lane-label refinements to MDT-206: restructure the lane label for a denser, card-parity scan, cap lane height with independent column scroll, and make the epic key clickable.

## Approved Changes

1. **Lifecycle actions not pinned to bottom** — `[Activate]`/`[Close]`/`✓ Closed` move directly under the progress bar (was `margin-top: auto` footer).
2. **Design specs aligned** — `docs/design/surfaces/swimlane-board.spec.md` and `swimlane-board.mockups.md` updated to the new lane-label structure and scroll model.
3. **Epic key via TicketCode** — the lane key now renders through the shared `<TicketCode>` component (priority glyph + key), matching ticket-card key typography/color; clickable, opens the epic ticket viewer.
4. **No color dot** — removed the `.swimlane-board__epic-dot` preceding the title.
5. **Lane max-height** — lane label and lane body capped at `60vh` so long lists don't stretch the lane.
6. **Independent column scroll** — each `.lane-col` scrolls vertically on its own (`overflow-y: auto` + `overscroll-behavior: contain`); the outer board still provides synchronized two-axis scroll.
7. **Collapse chevron relocated** — moved to the status-and-count row, aligned right.
8. **Title word-wrap** — long titles wrap (`overflow-wrap/word-break: break-word`) instead of single-line ellipsis.
9. **Clickable epic key** — opens the existing ticket viewer (same path as the open-epic icon button).

## Changed Requirement IDs

- `C1` — refined in place: synchronized outer scroll **plus** independent per-column scroll within a lane max-height (was: one synchronized surface, no per-column scroll).
- `C5` — **new** constraint: lane-label layout (lifecycle under progress, chevron on status/count row, no color dot, wrapped title).
- `BR-2.5` — **new** behavior: epic lane key renders via TicketCode and is clickable to open the epic ticket.
- `epic_lane_key_opens_ticket` — **new** BDD scenario covering BR-2.5.

## Affected Downstream Trace

- **requirements** — C1 refined; C5 + BR-2.5 added; validated + rendered.
- **bdd** — `epic_lane_key_opens_ticket` added; validated + rendered.
- **architecture** — `ART-swimlane-component-test` artifact, `OBL-epic-key` obligation added; `OBL-semantic-css` updated to cover C5 + the component test; validated + rendered.
- **tests** — `TEST-swimlane-component` plan added; `TEST-swimlane-board-e2e` extended to cover C5/BR-2.5; validated + rendered.
- **tasks** — `TASK-2` owns the new component test artifact and makes-green the new scenario/plan; validated + rendered.

## Execution Slices

### Slice 1: Lane label restructure + scroll model (TDD)

- **Objective**: implement all 9 UI tasks behind a failing component test, then an E2E layout assertion.
- **Direct artifacts/files**:
  - `src/components/SwimlaneBoard/index.tsx` (TicketCode key button, removed dot, chevron on meta row, lifecycle under progress)
  - `src/components/SwimlaneBoard/swimlane-board.css` (title wrap, lane max-height, independent column scroll, repositioned actions)
  - `src/components/SwimlaneBoard/SwimlaneBoard.test.tsx` (new component test, 6 cases)
  - `tests/e2e/board/swimlane-board.spec.ts` (new UAT layout test)
  - `tests/e2e/utils/selectors.ts` (`laneKeyByKey` selector)
  - `docs/design/surfaces/swimlane-board.spec.md`, `swimlane-board.mockups.md` (spec alignment)
- **Direct GREEN targets**:
  - `TEST-swimlane-component` -> `src/components/SwimlaneBoard/SwimlaneBoard.test.tsx`
  - `epic_lane_key_opens_ticket`, `lane_headers_show_progress_and_lifecycle` -> `tests/e2e/board/swimlane-board.spec.ts`
- **Impacted canonical task IDs**: `TASK-2`.
- **Why**: the lane label was bottom-pinned and used a bespoke key; this slice delivers a dense, card-parity lane header with bounded height.

## Validation

```bash
# unit
bun test --isolate src/components/SwimlaneBoard/SwimlaneBoard.test.tsx
bun test --isolate src/components/SwimlaneBoard/helpers.test.ts
bun run fe:test
# e2e
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
# types + trace
bun run validate:ts src/components/SwimlaneBoard/index.tsx src/components/SwimlaneBoard/SwimlaneBoard.test.tsx
spec-trace validate MDT-206 --stage all
```

All green at completion: 6/6 component, 12/12 swimlane unit, 7/7 swimlane E2E, 862/862 frontend, all trace stages valid.

## Watchlist

- `60vh` lane max-height is a viewport-relative cap; on very short viewports a long column's scroll region is small. Revisit if UAT finds it cramped.
- Per-column independent scroll means the sticky column header does not stay pinned within a column (only the board-level `.swimlane-board__head` is sticky). Acceptable for this pass; a per-column sticky head is a follow-up if needed.

## Open Decisions

None — all 9 changes were approved as a single UAT round.
