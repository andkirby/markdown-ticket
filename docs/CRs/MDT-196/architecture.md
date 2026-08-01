# Architecture — MDT-196 Board Filter Bar

Related CR: `docs/CRs/MDT-196-board-filter-bar.md`
UX contract: `docs/design/surfaces/board-filter-bar.spec.md`
BDD: `docs/CRs/MDT-196/bdd.md`

## Context

The board currently narrows via a single free-text `useState` (`filterQuery` in
`Board.tsx:51`) applied by an inline `useMemo` (`Board.tsx:293-311`) that
multi-term-AND-matches tokens against title/code/description. There is no facet
filtering despite 8 ticket attributes mapping directly to filter facets.

The `TicketFilters` contract exists in `domain-contracts/src/ticket/input.ts`
but the frontend never consumes it — only the server does, via
`TicketService.matchesFilters` (`shared/services/TicketService.ts:640`).

## Key decisions

### D1 — One contract, two predicates (exact vs fuzzy)

The server-side `TicketService.matchesFilters` uses **fuzzy/substring** matching
(`fuzzyMatch`, case-insensitive substring) because its caller is MCP search,
where "prog" should match "In Progress".

The frontend faceted UI needs **exact** matching: selecting the "In Progress"
facet value means status === "In Progress", not "In Progress Note". And the
free-text `query` keeps today's multi-term AND semantics over title/code/description.

| Predicate | Location | Match semantics | Caller |
|-----------|----------|-----------------|--------|
| Server (fuzzy) | `shared/services/TicketService.ts:640` | substring, case-insensitive | MCP `list_crs` |
| Frontend (exact + query-AND) | `src/utils/ticketFilters.ts` (new) | exact for facets, multi-term AND for query | Board |

**Rationale**: forcing the frontend to reuse the fuzzy predicate would break
the facet UX (selecting "High" would also match "Highlander"). The two
predicates serve different intents and are allowed to diverge. Both read the
same `TicketFilters` shape.

### D2 — Additive contract extension (no break to existing callers)

`TicketFilters` gains three optional fields. All are optional, so the server's
`matchesFilters` (which only reads fields it knows) and every existing caller
(MCP `list_crs`, server routes) keep working unmodified.

```typescript
// domain-contracts/src/ticket/input.ts — additive change
export interface TicketFilters {
  status?: string | string[]
  type?: string | string[]
  priority?: string | string[]
  assignee?: string | string[]
  phaseEpic?: string | string[]
  impactAreas?: string | string[]          // NEW (v1.1)
  inWorktree?: boolean                      // NEW (v1.1)
  query?: string                            // NEW (v1) — frontend free-text
  dateRange?: { start?: Date, end?: Date }
}
```

The server predicate is **not** extended for v1 — backend filtering of the new
fields is out of scope (CR §"Out of scope"). The fields exist on the contract so
the frontend predicate is typed against the shared shape.

### D3 — Pure-function predicate, hook owns state

Separation: the **predicate** is a pure function (unit-testable with no React);
the **state + persistence** lives in a hook.

| Concern | Owner | File |
|---------|-------|------|
| Predicate (apply filters → ticket subset) | pure function | `src/utils/ticketFilters.ts` |
| State shape, reducer, actions, localStorage | hook | `src/hooks/useBoardFilters.ts` |
| localStorage read/write | config module | `src/config/filterPreferences.ts` |

This mirrors the existing sort architecture: `sorting.ts` (config/persistence)
+ `sortTickets` (pure util) + `SortControls` (UI).

### D4 — `useReducer` for filter state (not `useState`)

Filter state changes are structured (toggle a value in a facet array, clear one
facet, clear all). A reducer gives a single dispatch surface and makes every
transition testable without React. Resolves Open Question "State management" in
the CR.

```typescript
type FilterAction =
  | { type: 'toggle', facet: FacetKey, value: string }
  | { type: 'setQuery', query: string }
  | { type: 'clearFacet', facet: FacetKey }
  | { type: 'clearAll' }
  | { type: 'reconcile', availableValues: ... } // drop stale derived selections
```

### D5 — Sentinel `"__none__"` for Unassigned assignee

Keeps `assignee` single-typed (`string[]`). The predicate treats `"__none__"` as
"ticket.assignee is falsy". One facet, one shape — no separate boolean flag.
Resolves Open Question "Assignee Unassigned" in the CR.

### D6 — Component structure under `BoardFilterBar/`

Per the surface spec's Composition tree. One directory, thin presentational
components; filter state is lifted to **App.tsx** (not Board) so the controls
render inline in the app header's single row (UAT: filters apply to board AND
list views — both consume the same pre-filtered set).

```
src/components/BoardFilterBar/
├── index.tsx              # BoardFilterBar — desktop inline bar OR mobile sheet
├── FilterButton.tsx       # "Filter · N" trigger + popover (desktop)
├── FacetSection.tsx       # checkbox group inside the popover/mobile sheet
├── ActiveFilterChips.tsx  # one removable chip per active value
└── MobileChipStrip.tsx    # horizontal scroll strip for column header
```

**Drift note (UAT 2026-08-01):** the original design proposed per-facet
`FacetDropdown` components (one Radix DropdownMenu per facet). The shipped
implementation uses a single `FilterButton` that opens ONE popover containing
a two-column `FacetGrid` (Type | Status, Priority | Assignee) — all v1 facets
are visible at once. This is simpler and keeps the header to one row.

**Outside-click dismissal (UAT 2026-08-01):** `FilterButton` uses an
event-based `mousedown` guard (mirrors the shared `<Modal>` primitive) rather
than a `position: fixed` click-away overlay. The app header carries
`backdrop-filter: blur(24px)`, which establishes a containing block that traps
fixed descendants to header bounds (64px) — a fixed overlay would only cover
the header, not the full viewport.

`FilterControls.tsx` is reused as-is (re-skinned via props) — it already renders
the search input with clear button. It becomes the `query` control.

## Data flow

```text
localStorage["markdown-ticket-filter-preferences"]
        │  read on mount (filterPreferences.ts)
        ▼
useBoardFilters()  ── reducer state ──▶  TicketFilters
        │                                       │
        │  dispatch (toggle/clear/setQuery)     │  passed as arg
        ▼                                       ▼
BoardFilterBar UI  ──────────────────  applyTicketFilters(tickets, filters)
        │                                       │
        │  user interaction                     │  pure: exact-match facets
        ▼                                       │  + multi-term-AND query
localStorage  ◀── persist on change             ▼
                                        filteredTickets[]  ──▶  Board columns AND List rows
```

The hook persists on every state change (debounce not needed — filter changes
are user-paced, not high-frequency).

**UAT (2026-08-01):** filter state is owned by **App.tsx**, not Board. Both the
board (`Board.tsx` via `filteredTickets` prop) and the list (`ProjectView.tsx`
via `sortedTickets` computed from the filtered set) consume the same
`filteredTickets`. The filter controls render inline in the app header and are
visible in both board and list view modes.

## Integration points

### App.tsx (filter state owner)

The `useBoardFilters(tickets)` hook lives in **App.tsx** so the filter
controls (`BoardFilterBar` desktop + mobile) can render inline in the app
header's single row. App passes `filteredTickets` down to `ProjectView`, which
forwards it to both `Board` (column grouping) and the list table (sorted rows).

```typescript
// App.tsx
const { filters, filteredTickets, facetOptions, toggleFilter, setQuery, clearAll }
  = useBoardFilters(tickets)
```

`Board.tsx` consumes `filteredTickets` via a prop (falls back to `tickets` when
absent — backward compat). The existing `ticketsByColumn` grouping consumes the
prop unchanged.


### HamburgerMenu.tsx

Gains an optional `filterCount` + `onOpenFilters` prop. When `filterCount > 0`
the row shows "Filter · N"; the row opens the mobile FilterPopover. Mirrors the
existing `sortPreferences` / `onSortPreferencesChange` prop pattern already on
the component.

### Column/index.tsx

Gains an optional `activeFilters` + `onRemoveFilter` prop. When `isMobileView`
and filters are active, renders `<MobileChipStrip>` under the column switcher.

### AppHeader / board header

The desktop `DesktopFilterBar` sits in `header__right` next to `SortControls`,
matching the existing `FilterControls` placement. In `showHeader` (multi-project)
mode it sits in `.board-header`.

## Derived facet values

`assignee`, `phaseEpic`, `impactAreas` menus are computed from the ticket set
via `useMemo` inside `useBoardFilters`:

```typescript
const facetOptions = useMemo(() => ({
  assignee: uniqueAssignees(tickets),    // includes "__none__" if any unassigned
  phaseEpic: uniqueValues(tickets.map(t => t.phaseEpic)),
  impactAreas: uniqueFlat(tickets.map(t => t.impactAreas)),
}), [tickets])
```

Static facets (`status`, `type`, `priority`) import directly from
`CRStatuses`, `CRTypes`, `CRPriorities` — never derived from the ticket set.

## Migration / rollback

### Migration path

1. Add optional fields to `TicketFilters` (domain-contracts) — additive, no
   rebuild of consumers required, but `bun run build:shared` is run to refresh
   the `shared` re-export.
2. Add `src/utils/ticketFilters.ts` (predicate) + tests — no integration yet.
3. Add `src/config/filterPreferences.ts` + `src/hooks/useBoardFilters.ts`.
4. Add `BoardFilterBar/` components.
5. Wire into `Board.tsx`, `HamburgerMenu.tsx`, `Column/index.tsx`.
6. Remove the old `filterQuery` useState + inline useMemo from Board.tsx.

Each step leaves the app in a working state. Steps 1-4 add code that is not yet
consumed; step 5 is the atomic switchover.

### Rollback

Revert step 5 (the Board.tsx/HamburgerMenu/Column wiring). The old inline filter
is restored by git revert. The new files (predicate, hook, components) become
dead code but do not affect the app. `TicketFilters` contract additions are
optional fields — reverting them is also safe (no consumer breaks either way).

### localStorage schema migration

`filterPreferences.ts` validates the parsed shape. Unknown/invalid shape → reset
to empty `{}`. Covers BDD S22 ("old schema never throws"). No versioned
migration needed for v1 since there is no prior filter-preferences key.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Performance on large boards (500 tickets) | Predicate is O(tickets × active-facets) in a `useMemo`; benchmark scenario in tests.md. No perceivable lag expected below 1000 tickets. |
| Stale derived selection (assignee removed from set) | `reconcile` action drops selections whose value is no longer in the derived option set. BDD S10. |
| `__none__` sentinel leaking into UI text | `assignee` option rendering maps `"__none__"` → "Unassigned" label at the component boundary; the value stays `"__none__"` in state. |
| Breaking mobile column layout | MobileChipStrip is conditionally rendered and horizontally scrollable; it adds height only when filters active. Existing `useBoardLayout` (`max-width: 768px`) is untouched. |
| React re-render storms from reducer | `useBoardFilters` memoizes `filteredTickets` and `facetOptions`; dispatch identity is stable. |

## Out of scope (deferred with evidence)

- Server-side filtering of `query`, `inWorktree`, `impactAreas` — CR §"Out of scope".
- Bottom-sheet mobile pattern — requires new `Sheet` primitive; deferred to follow-up.
- Saved/shared views — state shape is already serializable; future work.
- v1.1 facets (`inWorktree`, `phaseEpic`, `impactAreas`) UI — contract supports them; UI shipped in a follow-up to keep v1 diff reviewable.
