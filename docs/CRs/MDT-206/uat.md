# UAT Refinement Brief

## Objective

Extend the epic-lane collapse approach to match `designs/board-zai/design3.html` §8: the whole lane label is the collapse toggle, and a collapsed lane reflows from a vertical sticky column into a horizontal full-width summary bar.

## Background — design3 collapse model

Investigated in `designs/board-zai/design3.html` + `assets/css/05-components.css` + `assets/js/app.js`:

- **Whole-label toggle**: the entire `.lane-label` is the click target (`@click="toggleLaneCollapse(lane)"`); the chevron is a visual affordance only.
- **Collapsed = horizontal summary bar**: `.lane--collapsed .lane-label { flex-direction: row; align-items: center; width: auto; flex: 1; border-right: none }` — the label stops being a 168px sticky column and becomes a full-width one-line bar.
- **Body hidden**: `.lane--collapsed .lane-track { display: none }`.
- **Interactive children opt out**: epic-open uses `@click.stop` so it does not toggle collapse.
- State: `collapsedLanes` map; Collapse all sets every lane true, Expand all clears it.

## Approved Changes

1. **Whole-label toggle**: the lane label is a `div[role=button][tabindex=0][aria-expanded]` (not a `<button>` element, so the real `<button>` children it contains stay HTML-valid); Enter/Space and click both toggle. (design3 used a clickable div; we add role/tabindex/keyboard for a11y.)
2. **Collapsed horizontal reflow**: when collapsed, the label reflows to `flex-direction: row; width: 100%; flex-wrap: wrap` so title + key + status + count + progress + actions sit on one row; the lane body is hidden.
3. **Interactive children stop propagation**: the epic key, lifecycle action, and open-epic icon call `stopPropagation` so they perform their own action without toggling collapse.
4. **Chevron is aria-hidden**: it is a glyph only, no longer a separate button.

## Changed Requirement IDs

- `BR-5.1` — refined in place: an individual lane is collapsed by clicking its whole lane label (role=button, aria-expanded), not a dedicated chevron button.
- `C6` — **new** constraint: collapsed lane label reflows to a horizontal full-width summary bar; body hidden.
- `lane_collapses_via_whole_label` — **new** BDD scenario covering BR-5.1.

## Affected Downstream Trace

- **requirements** — BR-5.1 refined; C6 added; validated + rendered.
- **bdd** — `lane_collapses_via_whole_label` added; validated + rendered.
- **architecture** — `OBL-semantic-css` updated to cover C6 (collapsed reflow); validated + rendered.
- **tests** — `TEST-swimlane-component` + `TEST-swimlane-board-e2e` extended to cover C6; validated + rendered.
- **tasks** — `TASK-2` makes-green the new scenario; validated + rendered.

## Execution Slices

### Slice 1: Whole-label collapse toggle + horizontal reflow (TDD)

- **Objective**: make the whole lane label the collapse toggle and reflow collapsed lanes to a horizontal summary bar.
- **Direct artifacts/files**:
  - `src/components/SwimlaneBoard/index.tsx` (label → role=button container; `stopAndRun` helper; chevron → aria-hidden glyph)
  - `src/components/SwimlaneBoard/swimlane-board.css` (collapsed horizontal reflow; label hover/focus; chevron glyph)
  - `src/components/SwimlaneBoard/SwimlaneBoard.test.tsx` (+4 collapse cases)
  - `tests/e2e/board/swimlane-board.spec.ts` (collapse reflow E2E)
  - `tests/e2e/utils/selectors.ts` (`laneLabelByKey`)
  - `docs/design/surfaces/swimlane-board.spec.md`, `swimlane-board.mockups.md` (collapse model + §7 collapsed mockup)
- **Direct GREEN targets**:
  - `TEST-swimlane-component` -> `src/components/SwimlaneBoard/SwimlaneBoard.test.tsx`
  - `lane_collapses_via_whole_label`, `lane_visibility_controls_do_not_mutate_tickets` -> `tests/e2e/board/swimlane-board.spec.ts`
- **Impacted canonical task IDs**: `TASK-2`.
- **Why**: the prior collapse only hid the body and left a tall sticky label; design3 collapses to a scannable one-line summary.

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

All green at completion: 10/10 component, 16/16 swimlane unit, 8/8 swimlane E2E, 866/866 frontend, all trace stages valid.

## Watchlist

- A `div[role=button]` containing real `<button>` children is HTML-valid; screen readers announce the label as a button with children. Verify with a screen reader pass if accessibility-compliance sign-off is required.
- The collapsed bar uses `flex-wrap: wrap`; on very narrow desktop widths the actions may wrap to a second line. Acceptable; revisit if UAT finds it noisy.

## Prior round (lane-label restructure + scroll model)

The previous UAT round (lifecycle under progress, TicketCode key, no color dot, lane max-height, independent column scroll, chevron on meta row, title word-wrap, clickable key, design-spec alignment) is recorded in CR §8 under `### UAT Session 2026-08-08 (round 1)`.

## Open Decisions

None — the collapse extension was approved as a single change set.
