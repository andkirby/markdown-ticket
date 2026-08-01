# UAT Refinement Brief

Related CR: `docs/CRs/MDT-196-board-filter-bar.md`
Round: 1 — 2026-08-01

## Objective

Apply three UAT findings on the shipped board filter bar: (1) clicking outside
the filter popover must close it, (2) faceted filters must apply to the list
view as well as the board, and (3) the active-filter-chips block must have
proper spacing. Fix spec drift accumulated during implementation.

## Approved Changes

| # | Change | Why | Type |
|---|--------|-----|------|
| U1 | Replace the broken `position:fixed` click-away overlay in `FilterButton` with an event-based `mousedown` guard (mirrors `<Modal>`). | The header `backdrop-filter: blur(24px)` creates a containing block that traps the fixed overlay to header bounds (64px), so outside clicks never reached it. | Behavior |
| U2 | `ProjectView.sortedTickets` now sorts `propFilteredTickets` instead of raw `propTickets`. | Filters were board-only; the list table ignored them entirely. | Behavior |
| U3 | `ActiveFilterChips` inline variant gains `mt-3` top gap. | Chips block was flush (margin 0) against the facet grid in the popover. | Style |

## Changed Requirement IDs

- **S15, S16** — refined in place: "facet dropdown" → "filter popover with
  two-column facet grid" (drift fix; intent unchanged).
- **S11, S12** — refined in place: per-facet trigger labels → single
  "Filter · N" button + popover (drift fix).
- **S26** (new) — click outside closes the popover.
- **S27** (new) — filters apply to the list view.
- **S28** (new) — chips block spacing.

## Affected Downstream Trace

| Stage | Status |
|-------|--------|
| requirements | No `requirements.md` for this CR; CR §4 acceptance criteria unchanged. |
| bdd | Updated: S11/S12/S15/S16 refined; S26–S28 added. |
| architecture | Updated: D6 component structure + integration points corrected for App.tsx ownership and FilterButton event-based dismissal. |
| tests | Updated: UAT verification section added; drift (DesktopFilterBar/FacetDropdown test files) annotated. |
| tasks | Updated: U1–U3 slices added. |

> Note: `spec-trace` has no store for MDT-196 (`docs/CRs/.trace/MDT-196/store.json`
> does not exist). Trace projection lives in the human-owned docs above; a
> `spec-trace` init/upsert is a follow-up if the team adopts trace for this CR.

## Execution Slices

### Slice U1 — Click-outside dismissal

- **Objective**: popover closes on outside click.
- **Artifacts**: `src/components/BoardFilterBar/FilterButton.tsx`.
- **GREEN target**: S26 (browser smoke test — popover `offsetParent` null after
  outside click).
- **Impacted tasks**: U1.

### Slice U2 — List view filtering

- **Objective**: list table honors faceted filters.
- **Artifacts**: `src/components/ProjectView.tsx`.
- **GREEN target**: S27 (board 185→32, list 32 rows).
- **Impacted tasks**: U2.

### Slice U3 — Chips spacing

- **Objective**: chips block visually separated from facet grid.
- **Artifacts**: `src/components/BoardFilterBar/ActiveFilterChips.tsx`.
- **GREEN target**: S28 (`marginTop` 12px).
- **Impacted tasks**: U3.

## Validation

- `bun test --isolate ./src/components/BoardFilterBar ./src/utils/ticketFilters.test.ts ./src/hooks/useBoardFilters.test.ts` — 78 pass, 0 fail.
- `bun run validate:ts` — 4 changed files clean (FilterButton, ActiveFilterChips, ProjectView, playwright.config).
- Browser smoke tests: all three behaviors confirmed on `localhost:3075` (DEVPT + MDT projects).

## Watchlist

- Restyling is owned by another agent; the chip-gap fix (U3) is the only style
  change in this round and is intentionally minimal (`mt-3`).
- If the header's `backdrop-filter` is ever removed, the event-based guard still
  works — no regression risk.
