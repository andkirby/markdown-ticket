# Tasks — MDT-196 Board Filter Bar

Related CR: `docs/CRs/MDT-196-board-filter-bar.md`
Architecture: `docs/CRs/MDT-196/architecture.md`
Tests: `docs/CRs/MDT-196/tests.md`

Ordered implementation breakdown. Each task lists scope, files, command, and
expected result. v1 only; v1.1 facets (`inWorktree`, `phaseEpic`, `impactAreas`)
are contract-ready but not wired to UI in this ticket.

## Phase 1 — Contract + predicate (no UI)

### T1 — Extend `TicketFilters` contract additively

- **Files**: `domain-contracts/src/ticket/input.ts`
- **Scope**: add `query?: string`, `inWorktree?: boolean`, `impactAreas?: string | string[]` (all optional)
- **Command**: `bun run build:shared`
- **Done when**: shared re-export compiles; no consumer type error. Existing server `matchesFilters` untouched.
- **BDD**: enables S1–S10 typing.

### T2 — Pure-function predicate + unit tests

- **Files**: `src/utils/ticketFilters.ts` (new), `src/utils/ticketFilters.test.ts` (new)
- **Scope**: `applyTicketFilters(tickets, filters)` — exact-match facets (AND across, OR within), multi-term-AND query, `__none__` assignee sentinel.
- **Command**: `bun test --isolate ./src/utils/ticketFilters.test.ts`
- **Done when**: all S1–S10 unit cases pass.

## Phase 2 — State + persistence (no UI)

### T3 — localStorage config module + tests

- **Files**: `src/config/filterPreferences.ts` (new), `src/config/filterPreferences.test.ts` (new)
- **Scope**: `getFilterPreferences()` / `setFilterPreferences()` mirroring `sorting.ts`; invalid shape → `{}`.
- **Command**: `bun test --isolate ./src/config/filterPreferences.test.ts`
- **Done when**: S21, S22 cases pass.

### T4 — `useBoardFilters` hook + reducer + tests

- **Files**: `src/hooks/useBoardFilters.ts` (new), `src/hooks/useBoardFilters.test.ts` (new)
- **Scope**: `useReducer` with `toggle`/`setQuery`/`clearFacet`/`clearAll`/`reconcile`; persists via T3; computes `filteredTickets` via T2; derives `facetOptions` via `useMemo`.
- **Command**: `bun test --isolate ./src/hooks/useBoardFilters.test.ts`
- **done when**: reducer transition cases pass; `reconcile` drops stale values (S10).

## Phase 3 — Components (presentational)

### T5 — `ActiveFilterChips` + tests

- **Files**: `src/components/BoardFilterBar/ActiveFilterChips.tsx` (new), `.test.tsx` (new)
- **Scope**: one removable chip per active value; reuses `Badge` styling; `aria-label` per chip.
- **Command**: `bun test --isolate ./src/components/BoardFilterBar/ActiveFilterChips.test.tsx`
- **Done when**: S12, S13, S24 cases pass.

### T6 — `FacetDropdown` + tests

- **Files**: `src/components/BoardFilterBar/FacetDropdown.tsx` (new), `.test.tsx` (new)
- **Scope**: Radix `DropdownMenu` trigger; label `Facet` / `Facet: N`; checkbox items; static facets take enum values, derived facets take provided options.
- **Command**: `bun test --isolate ./src/components/BoardFilterBar/FacetDropdown.test.tsx`
- **Done when**: S15, S16 cases pass.

### T7 — `DesktopFilterBar` + tests

- **Files**: `src/components/BoardFilterBar/DesktopFilterBar.tsx` (new), `src/components/BoardFilterBar/index.tsx` (new), `.test.tsx` (new)
- **Scope**: composes `FilterControls` (query) + `FacetDropdown`×4 + `ActiveFilterChips` + ClearAll + result-count (`aria-live`).
- **Command**: `bun test --isolate ./src/components/BoardFilterBar/DesktopFilterBar.test.tsx`
- **Done when**: S11, S12, S14, S25 cases pass.

### T8 — `FacetSection` + `MobileChipStrip` + tests

- **Files**: `src/components/BoardFilterBar/FacetSection.tsx` (new), `src/components/BoardFilterBar/MobileChipStrip.tsx` (new), `.test.tsx` (new)
- **Scope**: checkbox group for mobile popover; horizontal-scroll chip strip for column header (returns null when empty).
- **Command**: `bun test --isolate ./src/components/BoardFilterBar/MobileChipStrip.test.tsx`
- **Done when**: S18, S19, S20 cases pass.

## Phase 4 — Integration (the switchover)

### T9 — Wire `Board.tsx` to the hook

- **Files**: `src/components/Board.tsx`
- **Scope**: replace `filterQuery` useState + inline `filteredTickets` useMemo with `useBoardFilters(tickets)`; render `DesktopFilterBar` in header; pass `filters`/`onRemoveFilter` to mobile columns.
- **Command**: `bun run validate:ts` then `bun run build`
- **Done when**: board still renders; free-text still works; facets now work.

### T10 — Wire mobile chrome

- **Files**: `src/components/HamburgerMenu.tsx`, `src/components/Column/index.tsx`
- **Scope**: HamburgerMenu gains `filterCount` + `onOpenFilters`; renders "Filter · N" row opening FilterPopover (FreeTextSearch + FacetSection×4 + Clear all + Done). Column renders `MobileChipStrip` under switcher when active.
- **Command**: `bun run validate:ts` then `bun run build`
- **Done when**: S17, S18 flows work; HamburgerMenu existing tests still pass.

## Phase 5 — E2E + verification

### T11 — E2E spec

- **Files**: `tests/e2e/board/board-filter.spec.ts` (new)
- **Scope**: desktop apply/remove/clear + result-count; mobile hamburger→popover→chip-strip; persistence across reload.
- **Command**: `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/board/board-filter.spec.ts --project=chromium`
- **Done when**: all E2E cases pass (or recorded as deferred if env blocks).

### T12 — Full verification gate

- **Commands**: `bun run validate:ts:all`, `bun run lint`, `bun run build`, `bun test --isolate ./src`, `bun run test:e2e`
- **Done when**: no new failures vs. baseline (pre-existing failures documented in state). The dirty worktree MDT-150 failures remain unchanged and unrelated.

## Sequencing rationale

T1→T2 first because the predicate is pure and fully testable in isolation — it
de-risks the whole feature before any React is written. T3→T4 build the state
layer on top of the predicate. T5–T8 are independent presentational components
that can be built in any order. T9–T10 is the atomic switchover. T11–T12 close
out.

## UAT Round 1 (2026-08-01) — refinement slices

Post-implementation UAT feedback. All three slices are complete and
browser-verified.

### U1 — Click outside filter popover closes it

- **Files**: `src/components/BoardFilterBar/FilterButton.tsx`
- **Change**: replace the broken `position:fixed` click-away overlay with an
  event-based `mousedown` guard (reuses the `<Modal>` primitive's
  `handleClickOutside` pattern). The header's `backdrop-filter` created a
  containing block that trapped the fixed overlay to header bounds.
- **Done when**: popover closes on outside click; stays open on inside click.
  Verified: S26.

### U2 — Filters apply to the list view

- **Files**: `src/components/ProjectView.tsx`
- **Change**: `sortedTickets` now sorts `propFilteredTickets` (the app-level
  filtered set) instead of the raw `propTickets`, so the list table honors
  faceted filters identically to the board.
- **Done when**: applying a facet narrows both board and list to the same row
  set. Verified: S27 (board 185→32, list 32 rows).

### U3 — Proper spacing for active-filter-chips block

- **Files**: `src/components/BoardFilterBar/ActiveFilterChips.tsx`
- **Change**: inline variant gains `mt-3` top gap so the chips block is not
  flush against the facet grid above it.
- **Done when**: `[data-testid=active-filter-chips]` `marginTop` is 12px.
  Verified: S28.
