---
code: MDT-196
status: Implemented
dateCreated: 2026-07-20T16:29:49.348Z
type: Feature Enhancement
priority: Medium
implementationDate: 2026-07-24
implementationNotes: Filter bar lifted to App header (single row, popover-based). Board consumes pre-filtered tickets via props. 105 tests pass, tsc clean, build green, DOM-verified: nav.header=65px, filter inline at y:15, board at y:65.
---

# Add faceted filter bar to board

## 1. Description

### Requirements Scope

`full`

### Problem

- The board's only narrowing tool is a single free-text input (`FilterControls`) that AND-matches tokens in title/code/description. Users cannot facet-filter by status, priority, assignee, type, or any other attribute the cards already display as badges.
- Tickets carry 8+ attributes that map directly to filter facets (`status`, `type`, `priority`, `assignee`, `inWorktree`, `phaseEpic`, `impactAreas`) but none are filterable. The data is present; the control is missing.
- Users resort to scrolling and visual scanning to answer daily-standup questions ("what's critical right now", "what's on my plate", "show only bugs").

### Affected Areas

- Frontend: board header, column rendering, mobile hamburger menu, mobile column header
- Shared: `TicketFilters` contract in `domain-contracts`
- Tests: predicate unit tests, E2E across desktop and mobile viewports

### Scope

In scope:

- Faceted filtering on the board (status, priority, assignee, type in v1; inWorktree, phaseEpic, impactAreas in v1.1)
- Free-text `query` folded into the same filter state
- Desktop filter rendered inline in the app header's single row: a compact `Filter · N` button + free-text search, with facets/chips/count inside a popover that overlays the board (never adds a second header line)
- Mobile filter entry via Hamburger Menu + filter popover + mobile chip strip
- Single shared `TicketFilters` state, persisted to localStorage
- "Showing N of M tickets" result count (rendered inside the popover)

Out of scope (deferred with evidence):

- Date-range filters
- Relationship filters (related/depends/blocks)
- Full-text search of `content`
- Text-syntax filter language (`field:value`)
- Nested AND/OR groups
- Saved/shared views
- Server-side or MCP filtering

## 2. Desired Outcome

### Success Conditions

- When a user selects one or more status values, the board shows only tickets with those statuses.
- When a user selects values across multiple facets, the board AND-combines them (e.g. status=In Progress AND priority=High shows only tickets matching both).
- When a user selects multiple values within one facet, the board OR-combines them (e.g. status=[In Progress, Approved] shows tickets with either).
- When filters are active, each active value is visible as a removable chip **inside the filter popover**; a clear-all action resets to the full set in one tap.
- When no filters are active, the header shows only the bare `Filter` button (no popover content, no second line, no wasted vertical space).
- The header is **always exactly one row (64px)** regardless of filter state — the filter surface never adds a second line.
- When the user opens the board on mobile, filtering is reachable from the Hamburger Menu and active filters are visible as a horizontal chip strip under the column header.
- When the user reloads the page, their last filter state is restored from localStorage.

### Constraints

- Must extend the existing `TicketFilters` contract in `domain-contracts/src/ticket/input.ts` additively — existing callers (MCP `list_crs`, any server-side filter) must keep working without modification.
- Must reuse existing primitives: `src/components/ui/popover.tsx`, Radix `DropdownMenu`, existing `Badge` styling for chips. No new primitive for v1.
- Must persist via localStorage, mirroring the existing `markdown-ticket-sort-preferences` pattern (`src/config/sorting.ts`).
- Must respect the spatial boundary contract: the filter controls render inline in the app header's single row, inside the `header__left` dead zone (after ProjectSelector); the planned pin rail (IDEA-002) owns a separate left rail. The filter surface must never add a second header line. See `docs/design/surfaces/board-filter-bar.spec.md` §"Spatial boundary" and §"The one rule".
- Must not break the existing mobile one-column-at-a-time board layout (`useBoardLayout.ts`, `max-width: 768px`).
- Must remain functional in read-only access modes (filtering does not mutate server state).

### Non-Goals

- Not introducing a `Sheet`/`Drawer` primitive for mobile v1. The existing `Popover` is used; the NN/G-preferred bottom-sheet tray is deferred to a follow-up.
- Not reworking the column grouping, drag-drop, or per-column sort (`board-layout.spec.md`).
- Not changing the ticket card or its badges (`ticket-card.spec.md`). Filter chips reuse badge styling but do not redefine it.
- Not shipping all 8 facets at once. v1 ships 4 (status, priority, assignee, type); v1.1 ships the other 4 (inWorktree, phaseEpic, impactAreas, query fold-in).

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| State management | `useReducer` vs `useState` for `TicketFilters`? | Must be sibling to `localSortPreferences` in the hook layer; localStorage persist |
| Derived facet values | How to compute `assignee`/`phaseEpic`/`impactAreas` menus from the ticket set? | `useMemo` over the existing client-side ticket array; no server round-trip |
| Assignee "Unassigned" | Sentinel string `"__none__"` vs dedicated checkbox row? | Sentinel keeps the data shape single-typed; spec recommends sentinel |
| Mobile chip strip | Where exactly in the column header does the strip sit? | Under the column switcher; horizontal scroll; absent when no filters active |

### Known Constraints

- Static facets (`status`, `type`, `priority`) draw menu values from enums (`CRStatuses`, `CRTypes`, `CRPriorities`) — must NOT derive from the ticket set or the menu shrinks.
- Derived facets (`assignee`, `phaseEpic`, `impactAreas`) draw menu values from the current ticket set.
- Empty `TicketFilters` MUST equal "show everything" — no special-case branches anywhere in the predicate.
- `query` (free-text) AND-combines with every facet and internally stays multi-term AND over title/code/description.

### Decisions Deferred

- Implementation approach for the filter predicate (determined by `mdt:architecture`)
- Specific component file structure for `BoardFilterBar/` (determined by `mdt:architecture`)
- Task breakdown for v1 vs v1.1 phases (determined by `mdt:tasks`)
- Whether to ship v1 and v1.1 together or stage them

## 4. Acceptance Criteria

### Functional (Outcome-focused)

- [x] User can filter the board by one or more status values; the board shows only matching tickets.
- [x] User can filter by priority, assignee (including Unassigned), and type independently and in combination.
- [x] AND-across-facets behavior is correct: selecting status=In Progress AND priority=High shows only tickets matching both.
- [x] OR-within-facet behavior is correct: selecting multiple statuses shows tickets with any of them.
- [x] Active filters are visible as removable chips; removing a chip removes only that value.
- [x] Clear-all resets to the full ticket set in one action.
- [x] Empty filter state shows every ticket and renders no chip row, no clear-all, no mobile chip strip.
- [x] Filter state persists across page reloads via localStorage.
- [x] Mobile user can open filtering from the Hamburger Menu, apply filters via a popover, and see active filters as a chip strip under the column header.
- [x] "Showing N of M tickets" count is accurate after every filter change (desktop).
- [x] Filtering works identically in read-only access modes.

### Non-Functional

- [x] Filter predicate runs in a `useMemo` over the ticket array; no perceivable lag on boards up to 500 tickets.
- [x] No new runtime dependencies added.
- [x] No backend changes, new endpoints, or new indexes required.

### Edge Cases

- All filters exclude every ticket → board columns show their existing empty state; result count reads "Showing 0 of M tickets".
- A derived facet value disappears from the ticket set after a backend update → menu updates; if the value was selected, it is dropped from the filter state silently.
- User clears filters while the popover/dropdown is open → UI closes the popover and resets to empty state.
- Filter state in localStorage is from an older schema → migrated or reset to empty; never throws.

## 5. Verification

### How to Verify Success

- Manual: on desktop, apply and remove filters across all 4 v1 facets; confirm AND/OR semantics, chip rendering, clear-all, result count, and persistence across reload.
- Manual: on a mobile viewport, apply filters via the Hamburger Menu popover; confirm the chip strip under the column header renders and updates; confirm the strip is absent when no filters are active.
- Automated: predicate unit tests covering AND-across-facets, OR-within-facet, empty filter, single-facet, multi-facet, and `query` combination.
- Automated: E2E covering chip add/remove/clear on desktop, and hamburger→popover apply/clear on a mobile viewport.
- Regression: existing board tests, sort tests, and mobile column-switcher tests remain green.

## Source Artifacts

| Artifact | Path | Role |
|----------|------|------|
| Research | `research/filtering-system-research.md` | Filterable attribute analysis, must-haves vs nice-to-haves, data structure |
| Exploration | `docs/design/explorations/filtering-system.md` | Rejected alternatives (popover-only, text-syntax, bottom-sheet v1, horizontal pin bar), research basis |
| Surface spec | `docs/design/surfaces/board-filter-bar.spec.md` | Durable UX contract — composition, facets, states, responsive, a11y, spatial boundary |
| Surface mockups | `docs/design/surfaces/board-filter-bar.mockups.md` | 7 wireloom review states (4 desktop, 3 mobile) |
| Neighbor spec | `docs/design/surfaces/board-layout.spec.md` | Board layout the filter overlays |
| Neighbor spec | `docs/design/surfaces/app-header.spec.md` | Header zones; spatial boundary extension note |
| Data contract | `domain-contracts/src/ticket/input.ts` | `TicketFilters` interface to extend |
| Related idea | `docs/ideas/IDEA-002-global-pin-bar.md` | Spatial boundary partner — pin rail owns left rail, filter owns header dead zone |

## Phase Plan (non-binding — final breakdown via `mdt:tasks`)

- **v1**: 4 facets (status, priority, assignee, type) + free-text fold-in. Desktop inline `Filter · N` button + popover (facets/chips/count inside) + mobile hamburger/popover/chip-strip. localStorage persistence. One header row, always.
- **v1.1**: 4 more facets (inWorktree, phaseEpic, impactAreas). UI-only addition inside the popover; data structure already supports them.

## 8. Clarifications

### UAT Session 2026-08-01

- **Approved changes**:
  - U1: Click-outside closes the desktop filter popover — replaced the broken `position:fixed` overlay (trapped by the header `backdrop-filter` containing block) with an event-based `mousedown` guard mirroring `<Modal>`.
  - U2: Faceted filters now apply to the list view — `ProjectView.sortedTickets` sorts the filtered set instead of the raw ticket set.
  - U3: Active-filter-chips block gains `mt-3` top gap (was flush against the facet grid).
  - Spec drift fixed: bdd S11/S12/S15/S16 refined from per-facet dropdowns to the shipped single-popover + FacetGrid; architecture D6/integration points corrected for App.tsx ownership.
- **Changed requirement IDs**: S11, S12, S15, S16 (refine-in-place); S26, S27, S28 (additive).
- **Updated workflow documents**: `bdd.md`, `architecture.md`, `tests.md`, `tasks.md`, `uat.md`.
- **`uat.md` written**: yes.
- **Strict drift/lock**: no (no `spec-trace` store exists for this CR; trace lives in the human-owned docs).