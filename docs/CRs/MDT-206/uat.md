# UAT Refinement Brief

## Objective

Round 9: two approved items — (1) the toolbar search matches **epic tickets only** (round 8's child-ticket matching is removed: the query means "which epic", never "which ticket"), and (2) the swimlane toolbar toggle-button pattern is ruled and documented in `frontend/src/styleguide.html` ahead of the toolbar's checkbox→button conversion.

## Approved Changes

1. **Search = epic key/title only**: `filterLanesBySearch` keeps an epic lane when its **epic key or title** matches (showing **all** its tickets); every other lane — including the No-epic lane and lanes where only child tickets match — is removed while the query is active. Clearing restores the full board. Key matching still accepts `ABC-012` / `12` / `ABC-12` (unchanged); progress stays presentation-only (unchanged).
2. **Toolbar toggle-button pattern (ruled and implemented)**: the three toolbar filters (Hide empty / Show badges / Show closed) became `aria-pressed` toggle buttons with **visible labels** in a `.control-group`, pressed state = the ramp's solid strength. Icons encode the **object** (Show closed → the Implemented status glyph, Show badges → `Tag`, Hide empty → `SquareDashed`) — **no shared eye icon**: the eye would duplicate the verb the label already carries and its eye/eye-off polarity flips meaning between controls. Collapse all / Expand all are one-shot actions: plain `btn btn-sm btn-outline` buttons with lucide icons (`FoldVertical` / `UnfoldVertical`), never `aria-pressed`. Pattern reference: `styleguide.html` ("toolbar toggles" section).

## Changed Requirement IDs

- `BR-6.1` — **refined in place**: matching scope narrowed to the epic ticket's own key/title; child matching and lane narrowing removed.
- `swimlane_search_filters_by_title_or_key` — **refined in place** to epic-only semantics.
- `TEST-swimlane-component`, `TEST-swimlane-helpers`, `TEST-swimlane-board-e2e` — coverage flipped to the new semantics.

## Affected Downstream Trace

- **requirements** — BR-6.1 refined; validated + rendered.
- **bdd** — scenario refined; validated + rendered.
- **tests** — coverage notes updated (plans already cover BR-6.1).
- **architecture** — untouched (the change is inside one pure helper; no owner/flow change).

## Execution Slices

### Slice 1: Epic-only search semantics

- **Objective**: the query filters which epic lanes exist; child tickets never match.
- **Direct artifacts/files**:
  - `frontend/src/components/SwimlaneBoard/helpers.ts` (`filterLanesBySearch` simplified to epic-only keep; `matchesTicketSearch` unchanged as the epic key/title matcher)
  - `frontend/src/components/SwimlaneBoard/index.tsx` (search `aria-label`/placeholder reworded to epics)
  - tests: `frontend/src/components/SwimlaneBoard/helpers.test.ts`, `frontend/src/components/SwimlaneBoard/SwimlaneBoard.test.tsx`, `tests/e2e/board/swimlane-board.spec.ts`
- **Direct GREEN targets**:
  - Helper: epic key/title match keeps the whole lane; child-only / No-epic-only / nothing-matching queries remove those lanes; empty query returns the input unchanged.
  - Component: epic-title and epic-key (bare number, simplified) matches keep the lane with all tickets; child-title query removes the lane; aria-label says "epics"; clear restores.
  - E2E: epic-title/epic-key match keeps lane + all cards; child-only query removes lanes; clear restores.
- **Impacted canonical task IDs**: `TASK-2` (makes-green already includes the scenario).
- **Why**: UAT feedback — the search is for finding epics; matching children made a lane-list control behave like a second card filter (the header global filter already does that).

### Slice 2: Styleguide toolbar-toggle pattern section

- **Objective**: document the ruled pattern so the conversion has a canonical reference.
- **Direct artifacts/files**: `frontend/src/styleguide.html` (new "toolbar toggles · filters are pressed-state buttons, labels stay" section: labeled `aria-pressed` pills at the ramp's solid strength, unique per-object icons, rejected icon-only variant; Collapse all / Expand all noted as plain actions).
- **Direct GREEN targets**: none (static demo page; `scripts/parse-css.mjs` gate covers CSS syntax at commit).
- **Impacted canonical task IDs**: none (docs artifact outside spec-trace scope).
- **Why**: the checkbox→button conversion was approved in design; the ruling must not live only in chat.

### Slice 3: Swimlane toolbar conversion (the ruled pattern, applied)

- **Objective**: the three filter checkboxes become the ruled toggle buttons; Collapse all / Expand all get lucide icons.
- **Direct artifacts/files**:
  - `frontend/src/components/SwimlaneBoard/index.tsx` (checkbox labels → `aria-pressed` buttons in `control-group` + `swimlane-board__filter`; actions → `btn btn-sm btn-outline` with `FoldVertical`/`UnfoldVertical`; icons `SquareDashed`/`Tag`/`ImplementedGlyph`)
  - `frontend/src/components/SwimlaneBoard/swimlane-board.css` (`.swimlane-board__toggle` deleted; `.swimlane-board__filter` skin — pressed = solid pill declared after `:hover` so active absorbs hover)
  - tests: `SwimlaneBoard.test.tsx` (`.checked` → `aria-pressed`; new pattern test), `tests/e2e/board/epic-board-jump.spec.ts` (`not.toBeChecked` → `aria-pressed="false"`)
- **Direct GREEN targets**:
  - Component: filters render as `<button aria-pressed>` inside a named group; actions carry no `aria-pressed`; hide-empty pressed state survives focused arrival (BR-1.5).
  - E2E: all swimlane + epic-board-jump specs green unchanged (testids preserved).
- **Impacted canonical task IDs**: none new — presentation-only re-skin of BR-5.1 controls (no behavior change: same state, same persistence, same endFocus wiring).
- **Why**: the design ruling (slice 2) approved the conversion; the user scheduled it in the same round with lucide icons on the actions.

## Validation

```bash
bun test --isolate frontend/src/components/SwimlaneBoard/helpers.test.ts
bun test --isolate frontend/src/components/SwimlaneBoard/SwimlaneBoard.test.tsx
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
bun run validate:ts frontend/src/components/SwimlaneBoard/helpers.ts frontend/src/components/SwimlaneBoard/index.tsx
spec-trace validate MDT-206 --stage all
```

All green at completion: 24/24 helpers (2 RED pre-check), 41/41 swimlane component (3 RED search pre-check + toggle-pattern test), 15/15 swimlane + epic-board-jump E2E, `bun run build` clean, semantic-classes hook clean, TS validation clean, all trace stages valid.

## Watchlist

- The **No-epic lane is removed by any active query** (it has no epic to match) — intentional; an epic-search control should not keep an unmatched bucket. Recorded in BR-6.1.
- The focused-arrival search-keep check (`?epic=` token) now means "the focused epic's own key/title matches" — same behavior for epic lanes, no change needed.
- The toolbar conversion (slice 3) rides the uncommitted MDT-247 `statusGlyphs.tsx` (`ImplementedGlyph` import) — MDT-206 and MDT-247 should land together.

## Prior rounds

- Rounds 1–8 are recorded in CR §8 (round 8 made the search filter the lane list with child narrowing; round 9 removes the child matching).

## Open Decisions

None.
