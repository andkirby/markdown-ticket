# UAT Refinement Brief

Ticket: `MDT-129`
Round: 2026-06-24

## Objective

Close a keyboard-interaction gap found during UAT of the project browser panel:
with the panel open, typing in the search field and using arrow keys to move
through results is broken. Today the search input has no arrow handler, and the
result cards use a roving-tabindex model that strands DOM focus on a card, so a
typed character is silently dropped and the query never updates. Bring the panel
to the same combobox contract already used by QuickSearch.

## Approved Changes

1. Adopt the **active-descendant combobox pattern** in `ProjectBrowserPanel`
   (mirror `src/components/QuickSearch/QuickSearchModal.tsx`): a
   `selectedProjectIndex` state drives a visual highlight on the filtered card
   list; DOM focus stays in the search input.
2. **ArrowDown from the search field** moves the highlight onto the first card
   of the filtered list; **ArrowUp/ArrowDown** move it through the list.
3. **Cyclic wrap** at the edges: ArrowDown on the last card wraps to the first;
   ArrowUp on the first card wraps to the last (this was the originating UAT
   request).
4. **Typing while a card is highlighted** keeps focus in the search field and
   updates the query (keystroke is not stranded on the card).
5. **Enter** selects the highlighted project and closes the panel.
6. Cards are no longer keyboard-focusable via `tabIndex` for navigation purposes
   (click selection and the favorite-star button remain operable).

## Changed Requirement IDs

Additive change — new behavior group, no existing IDs mutated:

- `BR-11.1` arrow-down from search highlights first card
- `BR-11.2` arrows move highlight through filtered list
- `BR-11.3` cyclic wrap at list edges
- `BR-11.4` typing keeps focus in search and updates query
- `BR-11.5` Enter selects highlighted project and closes panel

## Affected Downstream Trace

- BDD: `browser_arrow_keys_navigate_list` (BR-11.1/11.2/11.3),
  `browser_typing_keeps_focus_in_search` (BR-11.4),
  `browser_enter_selects_highlighted_project` (BR-11.5)
- Architecture: new obligation `OBL-browser-keyboard-navigation`
  (artifacts `ART-browser-panel`, `ART-selector-card`); pattern note recorded
  replacing the roving-tabindex approach.
- Tests: `TEST-browser-keyboard-nav` (unit, `ProjectBrowserPanel.test.tsx`)
- Tasks: `TASK-13`

## Execution Slices

### Slice 1 — Port active-descendant keyboard nav to ProjectBrowserPanel (`TASK-13`)

- Objective: implement the five BR-11 behaviors in the panel by switching from
  roving-tabindex to active-descendant, matching QuickSearch.
- Direct artifacts/files:
  - `src/components/ProjectSelector/ProjectBrowserPanel.tsx`
  - `src/components/ProjectSelector/ProjectSelectorCard.tsx` (highlight rendering; remove `tabIndex`/`onCardKeyDown` keyboard-focus path)
  - `src/components/ProjectSelector/ProjectBrowserPanel.test.tsx`
- Direct GREEN targets: `browser_arrow_keys_navigate_list`,
  `browser_typing_keeps_focus_in_search`, `browser_enter_selects_highlighted_project`,
  `TEST-browser-keyboard-nav`
- Impacted canonical task IDs: `TASK-13`
- Why the slice exists: the two UAT defects (no field→list arrow nav, dropped
  keystrokes after navigating) share one root cause — the roving-tabindex model.
  Fixing it once resolves both. Reference implementation already exists in
  QuickSearch.

Implementation notes for the slice:

- Move arrow/Enter handling onto the search input's `onKeyDown` (replacing the
  grid-level `handleProjectGridKeyDown`).
- Clamp/reset `selectedProjectIndex` when `searchQuery` changes and when the
  filtered list shrinks (avoid stale-index), as QuickSearch does.
- Highlight via a CSS class/`data-` attribute driven by `selectedProjectIndex`,
  not via DOM focus.
- Keep click-to-select on cards unchanged.

## Validation

- Canonical store revalidated green across all stages:
  `spec-trace validate MDT-129 --stage all` — passed (requirements, bdd,
  architecture, tests, tasks).
- Rendered projections refreshed: `*.trace.md`.
- Human-owned docs updated to mirror the store: `requirements.md`, `bdd.md`,
  `architecture.md`, `tests.md`, `tasks.md`.

## Watchlist

- Stale-index bug after filtering: ensure `selectedProjectIndex` is clamped when
  the filtered list changes (existing QuickSearch pattern).
- Don't regress click selection, favorite-star keyboard activation, or the
  mobile/responsive panel behavior.
- `ProjectBrowserPanel.test.tsx` already exists; extend it rather than adding a
  new test file.

## Open Decisions

1. **Grid wrap semantics.** The panel is a 2-column grid. Cyclic wrap is
   approved, but on ArrowDown from the last card there are two valid targets:
   (a) item 0 (simple cyclic — likely what users expect), or (b) the first card
   of the *same column* (true grid wrap). Recommended default: **item 0**
   (simple cyclic). Confirm before/while implementing `TASK-13`.
2. **QuickSearch consistency.** QuickSearch (`QuickSearchModal.tsx`) currently
   *clamps* and does not wrap. If cyclic wrap ships here, decide whether to
   backport wrap to QuickSearch for a consistent omnibox feel across the app,
   or accept that the two surfaces differ. Out of scope for `TASK-13` unless
   explicitly requested.
