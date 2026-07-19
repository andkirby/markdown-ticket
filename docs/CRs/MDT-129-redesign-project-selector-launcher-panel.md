---
code: MDT-129
status: Implemented
dateCreated: 2026-03-02T16:06:27.177Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-039,MDT-118
---

# Redesign project selector launcher panel

## 1. Description
### Requirements Scope
- full

### Problem
- The current project selector becomes difficult to use when many projects are available.
- The current selector does not provide a clear distinction between the current project, quick-access projects, and the full project list.
- Users need a project selector that remains compact in the rail while still providing access to all projects.

### Affected Areas
- `src`: project selector and project switching UI
- `shared`: global configuration contract for selector visibility settings
- `server`: validated delivery of global UI configuration
- `tests`: selector behavior coverage
- `docs`: selector behavior and configuration documentation

### Scope
- In scope:
- Present the active project as a larger card in the selector rail.
- Present inactive visible projects as compact code-only cards in the selector rail.
- Open the full project browser panel by clicking the active project card.
- Show the full project list in a panel directly below the selector.
- Show favorite state on full project cards and on the active project card.
- Show hover cards on inactive project chips revealing full project details.
- Support a configurable visible project count through global UI configuration.
- Out of scope:
- Cross-project aggregate browsing mode.
- Changes to unrelated board, list, or documents navigation controls.
- Non-required persistence enhancements beyond favorite-state support.
## 2. Desired Outcome
### Success Conditions
- The selector rail clearly identifies the current project.
- The selector rail remains compact while still exposing quick access to visible inactive projects.
- Users can open a full project browser by clicking the active project card.
- The full project browser appears directly below the selector.
- Users can switch projects from both the selector rail and the full project browser.
- Hovering over inactive project chips reveals full project details.
- Favorite state is visible consistently in the selector experience.
- The selector remains usable when the number of projects exceeds the visible rail count.

### Constraints
- The full project browser is visually attached to the selector.
- Project switching behavior remains supported.
- Visible selector capacity is controlled through global UI configuration.
- Hover cards appear on inactive chips with configurable delay (100ms open/close).

### Non-Goals
- No aggregate "All Projects" mode.
- No rank or recency badges in the selector UI.
- No title or description expansion for inactive visible rail items.
## 3. Architecture
> Architecture projection: [architecture.md](./architecture.md) (rendered from canonical spec-trace state)

**Pattern**: Progressive Disclosure with Anchored Overlay

**Key constraint**: Active project always visible; panel anchored directly below rail; mutable state in `project-selector.json`

**Extension**: Add new view modes by creating new components; no changes to existing rail/panel
## 4. Acceptance Criteria
### Functional (Outcome-focused)
- [x] The selector rail shows the active project as a larger card containing project code and title.
- [x] The selector rail shows inactive visible projects as compact code-only cards.
- [x] Clicking the active project card opens a panel directly below the selector.
- [x] Hovering over inactive project chips shows a hover card with full project details.
- [x] The panel shows the full project list as cards containing project code, title, and description.
- [x] Favorite state is visible on full project cards.
- [x] Favorite state is visible on the active project card when the active project is favorited.
- [x] Selecting a project from the selector rail changes the current project.
- [x] Selecting a project from the full project panel changes the current project.
- [x] The selector supports a configured visible project count through global UI configuration.

### Non-Functional
- [x] The selector remains readable and operable when many projects are registered.
- [x] The panel remains visually anchored to the selector.
- [x] The interaction remains usable on desktop and mobile-sized viewports.
- [x] The updated behavior is covered by stable automated selectors.

### Edge Cases
- [x] Long project titles do not break the active rail card or full project cards.
- [x] Projects without descriptions remain selectable and visually coherent in the panel.
- [x] The active project remains visible even when it would otherwise fall outside the normal visible subset.
- [x] Absence of favorite state does not create broken spacing or misaligned controls.
- [x] The selector behaves correctly when the total number of projects is less than or equal to the visible count.
## 5. Verification
### How to Verify Success
- Manual verification:
- Confirm that the rail shows one active larger card and compact inactive cards.
- Confirm that clicking the active project card opens a full project panel directly below the selector.
- Confirm that hovering over inactive project chips shows hover cards with full project details.
- Confirm that project switching works from both the rail and the full project panel.
- Automated verification:
- Verify active card rendering, compact inactive rendering, hover card behavior, panel rendering, and project switching.
- Verify behavior when project count is below, equal to, and above the configured visible limit.
- Documentation verification:
- Confirm that global configuration documentation describes visible selector capacity and selector behavior.

## 8. Clarifications

### UAT Session 2026-06-24 — Project browser keyboard navigation

**Source:** UAT review of the project browser panel. Found that typing in the
search field and using arrow keys to move through results is broken (the search
input has no arrow handler; cards use a roving-tabindex model that strands DOM
focus and silently drops typed characters).

**Approved changes:**
- Adopt the active-descendant combobox pattern in `ProjectBrowserPanel`,
  mirroring `QuickSearch` (`selectedIndex` drives a highlight; focus stays in
  the search input).
- ArrowDown from the field highlights the first card; ArrowUp/ArrowDown move
  through the filtered list; ArrowDown on the last / ArrowUp on the first wraps.
- Typing while a card is highlighted keeps focus in the field and updates the
  query (keystroke not dropped).
- Enter selects the highlighted project and closes the panel.

**Changed requirement IDs (additive — new BR-11 group, no existing IDs
mutated):** `BR-11.1`, `BR-11.2`, `BR-11.3`, `BR-11.4`, `BR-11.5`

**Updated workflow documents:** `requirements.md`, `bdd.md`, `architecture.md`,
`tests.md`, `tasks.md` (mirrored from canonical spec-trace store).

**New canonical trace records:** scenarios `browser_arrow_keys_navigate_list`,
`browser_typing_keeps_focus_in_search`, `browser_enter_selects_highlighted_project`;
obligation `OBL-browser-keyboard-navigation`; test plan `TEST-browser-keyboard-nav`;
task `TASK-13`.

**`uat.md` written:** yes (current-round execution brief).

**Strict drift/lock used:** no.

**Open decisions (see `uat.md`):** grid wrap semantics (item 0 vs same-column);
whether to backport wrap to QuickSearch for consistency.

**More implementation required:** yes — `TASK-13` (slice 1 in `uat.md`).

### Implementation 2026-06-24 — TASK-13 complete

Implemented the active-descendant keyboard navigation in `ProjectBrowserPanel`,
mirroring `QuickSearch`.

**Code changes:**
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx`: added
  `selectedProjectIndex` state; arrow/Enter handling moved onto the search
  input (`handleSearchKeyDown`) with cyclic wrap; highlight resets on open and
  on each keystroke; clamped against the filtered list. Removed the old
  roving-tabindex grid handler and `getGridColumnCount`. Grid is now
  `role="listbox"`.
- `src/components/ProjectSelector/ProjectSelectorCard.tsx`: browser cards are
  now `role="option"`, `tabindex=-1`, with `aria-selected`/`data-selected`
  driven by a new `highlighted` prop (visual highlight only; DOM focus stays in
  the input). Removed the now-dead `onCardKeyDown` prop. Favorite-star button is
  `tabindex=-1` in browser mode so it is not a tab stop.
- `src/components/ProjectSelector/project-selector.css`: added
  `.project-card[data-selected="true"]` highlight reusing the focus-visible ring
  tokens.

**Decision (Open Decision 1):** linear cyclic navigation (item 0 on wrap),
treating the filtered results as an ordered list — matches the user's described
mental model and QuickSearch.

**Verification:**
- Unit: 10/10 pass in `ProjectBrowserPanel.test.tsx` (covers BR-11.1–11.5);
  full ProjectSelector suite 47/47.
- E2E: 12/12 pass in `project-browser.spec.ts`, including the three rewritten
  keyboard tests (Tab-doesn't-land-on-card, Enter-selects-highlighted,
  arrow-wrap). The accent-colors keyboard test was rewritten to the new contract
  and passes.
- Pre-existing (unrelated): 9 accent-colors spec failures reproduce identically
  on the original code (verified via stash); not caused by this change.
- `bun run lint`, `bun run validate:ts`: clean.

**Open Decision 2 (QuickSearch wrap consistency):** deferred — QuickSearch still
  clamps. Backport only if a consistent cyclic feel across both omnibox surfaces
  is later requested.

### Implementation 2026-06-24 — TASK-13 iteration 2 (grid nav + visible highlight + active-first)

User testing of iteration 1 surfaced three regressions, all root-caused and fixed:

1. **Highlight invisible.** `data-selected` used Tailwind `ring` (`box-shadow`),
   which the active card's own `box-shadow` clobbered. Switched to `outline`
   (separate layer) — verified at the browser level: `outline: rgb(37,99,235)
   solid 2px` renders on the highlighted card alongside its box-shadow.
2. **Zigzag on Down/Up.** Iteration 1 copied QuickSearch's *linear* `+1` nav, but
   the panel is a 2-column GRID, so `+1` moved right, not down. Restored
   `getGridColumnCount` and Excel-grid semantics: Down/Up move within the same
   column (±columnCount), Left/Right move between adjacent columns (±1), all
   cyclic. The old roving-tabindex code had the grid math right; it was the
   focus handling that was broken.
3. **Tab escaped the panel.** The handler lived only on the search input, so
   once focus left it (via Tab — cards were `tabindex=-1`) it escaped to
   `<body>` and every arrow went dead. Moved the handler onto `ModalBody`
   (common ancestor) and made Tab/Shift+Tab act as down/up (preventDefault),
   so focus never leaves the panel. Escape still closes.

Also: the panel now highlights the **active project on open** (wherever it sits
in the favorites/usage ordering — the panel is not active-first), so the first
key press moves from the current project. Searching clears the highlight.

**Testing honesty fix (root cause of the false-green):** iteration-1 tests used
`fill()` (keeps focus in the input) instead of real Tab key presses, so they
never exercised the human flow that broke. jsdom also reports a 1-column grid,
 so unit tests physically cannot verify column navigation. Fixes:
- Unit tests now mock `getComputedStyle` to force a 2-column grid and assert
  Excel-grid math (Down from index 0 → index 2, etc.).
- The e2e asserts the rendered grid is genuinely 2 columns (`gridTemplateColumns`)
  then verifies ArrowDown moves by +columnCount from the active project's actual
  index, with an explicit `not.toBe(activeIndex + 1)` anti-zigzag guard.
- A real-browser probe confirmed the outline highlight renders.

**Verified:** unit 48/48, e2e project-browser 12/12, types clean, changed files
lint clean (pre-existing `cli/` import-sort failure is unrelated).

### Implementation 2026-06-24 — TASK-16 (scroll-follow) + open decisions

**Bug:** keyboard navigation moved the highlight off the visible area but the
Radix `ScrollArea` viewport did not follow it, so the highlighted card
disappeared.

**Fix:** a `useLayoutEffect` in `ProjectBrowserPanel` watches
`selectedProjectIndex` and calls `scrollIntoView({ block: 'nearest' })` on the
`[data-selected="true"]` card (queried within `projectGridRef`). `useLayoutEffect`
runs before paint so the viewport follows with no visible jump; `block: 'nearest'`
scrolls only when the card is outside the visible area, so it never fights the
user. No new ref or card-API change — reuses the existing grid ref and the
`data-selected` contract.

**Verified:** unit 49/49 (incl. `BR-11.6` scroll-into-view), e2e project-browser
12/12, spec-trace all-green. `validate:ts` shows one pre-existing error in
`SettingsModal/BackendConfigSection.tsx` (untouched by this work).

### Open decisions (deferred — not implemented)

- **Search matching model.** The panel and the codebase's `fuzzyMatch()` use
  case-insensitive **substring** matching, not true fzf-style **subsequence**
  matching + scored ranking. User decision: leave substring matching in place
  and record fzf-style matching as an **open recommendation**. Revisit if
  project names/codes grow long or numerous and substring starts missing
  intent.
- **Arrow keys vs. text caret (combobox conflict).** Excel-grid navigation
  reuses Left/Right for column movement, which conflicts with caret movement
  inside the search query (you cannot move the cursor mid-string with arrows).
  The accepted current tradeoff keeps the Excel-grid nav model because it is
  what the user validated. The alternative (omnibox convention: Up/Down navigate
  in reading order, Left/Right stay as caret — like Spotlight/VS Code) resolves
  the conflict but drops column-aware navigation; revisit only if caret editing
  in the query becomes a real friction point.