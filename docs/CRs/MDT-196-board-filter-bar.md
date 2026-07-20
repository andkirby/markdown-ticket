---
code: MDT-196
status: Proposed
dateCreated: 2026-07-20T16:29:49.348Z
type: Feature Enhancement
priority: Medium
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
- Desktop chip bar with active-filter chips and clear-all
- Mobile filter entry via Hamburger Menu + filter popover + mobile chip strip
- Single shared `TicketFilters` state, persisted to localStorage
- "Showing N of M tickets" result count

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
- When filters are active, each active value is visible as a removable chip; a clear-all action resets to the full set in one tap.
- When no filters are active, the board looks identical to today (no chip row, no clear-all, no wasted vertical space).
- When the user opens the board on mobile, filtering is reachable from the Hamburger Menu and active filters are visible as a horizontal chip strip under the column header.
- When the user reloads the page, their last filter state is restored from localStorage.

### Constraints

- Must extend the existing `TicketFilters` contract in `domain-contracts/src/ticket/input.ts` additively — existing callers (MCP `list_crs`, any server-side filter) must keep working without modification.
- Must reuse existing primitives: `src/components/ui/popover.tsx`, Radix `DropdownMenu`, existing `Badge` styling for chips. No new primitive for v1.
- Must persist via localStorage, mirroring the existing `markdown-ticket-sort-preferences` pattern (`src/config/sorting.ts`).
- Must respect the spatial boundary contract: the filter bar owns `header__right`; the planned pin rail (IDEA-002) owns a separate left rail. See `docs/design/surfaces/board-filter-bar.spec.md` §"Spatial boundary".
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

- [ ] User can filter the board by one or more status values; the board shows only matching tickets.
- [ ] User can filter by priority, assignee (including Unassigned), and type independently and in combination.
- [ ] AND-across-facets behavior is correct: selecting status=In Progress AND priority=High shows only tickets matching both.
- [ ] OR-within-facet behavior is correct: selecting multiple statuses shows tickets with any of them.
- [ ] Active filters are visible as removable chips; removing a chip removes only that value.
- [ ] Clear-all resets to the full ticket set in one action.
- [ ] Empty filter state shows every ticket and renders no chip row, no clear-all, no mobile chip strip.
- [ ] Filter state persists across page reloads via localStorage.
- [ ] Mobile user can open filtering from the Hamburger Menu, apply filters via a popover, and see active filters as a chip strip under the column header.
- [ ] "Showing N of M tickets" count is accurate after every filter change (desktop).
- [ ] Filtering works identically in read-only access modes.

### Non-Functional

- [ ] Filter predicate runs in a `useMemo` over the ticket array; no perceivable lag on boards up to 500 tickets.
- [ ] No new runtime dependencies added.
- [ ] No backend changes, new endpoints, or new indexes required.

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
| Surface mockups | `docs/design/surfaces/board-filter-bar.mockups.md` | 6 wireloom review states (3 desktop, 3 mobile) |
| Neighbor spec | `docs/design/surfaces/board-layout.spec.md` | Where the filter bar sits; existing sort/filter section |
| Neighbor spec | `docs/design/surfaces/app-header.spec.md` | Mobile filter entry via Hamburger Menu; spatial boundary note |
| Data contract | `domain-contracts/src/ticket/input.ts` | `TicketFilters` interface to extend |
| Related idea | `docs/ideas/IDEA-002-global-pin-bar.md` | Spatial boundary partner — pin rail owns left rail, filter owns header |

## Phase Plan (non-binding — final breakdown via `mdt:tasks`)

- **v1**: 4 facets (status, priority, assignee, type) + free-text fold-in. Desktop chip bar + mobile hamburger/popover/chip-strip. localStorage persistence.
- **v1.1**: 4 more facets (inWorktree, phaseEpic, impactAreas). UI-only addition; data structure already supports them.