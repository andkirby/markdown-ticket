# Board Filter Bar

The board's narrowing surface — free-text search plus facet dropdowns over ticket attributes, with active filters shown as removable chips. One `TicketFilters` state shared across desktop and mobile chrome.

Related artifacts:
- Review mockups: `board-filter-bar.mockups.md`
- Exploration / rejected alternatives: `../explorations/filtering-system.md`
- Neighbor surface: `board-layout.spec.md`
- Neighbor surface: `app-header.spec.md` (Hamburger Menu hosts mobile filter entry)
- Neighbor surface: `pin-rail.spec.md` (planned, IDEA-002 — occupies its own left rail, not the header)
- Data contract: `domain-contracts/src/ticket/input.ts` (`TicketFilters`)

## Owns

- The `TicketFilters` state shape and its single predicate semantics (AND across facets, OR within a facet).
- Desktop filter bar composition: free-text input, facet dropdowns, active-filter chip row, clear-all.
- Mobile filter entry: Hamburger Menu "Filter · N" row, mobile chip strip under the column header, and the filter popover.
- The "showing N of M" result-count text.
- Empty-filter invariant: an empty `TicketFilters` shows every ticket. No special cases.

## Does Not Own

- Board column grouping, drag-drop, or per-column sort (`board-layout.spec.md`).
- AppHeader composition or Hamburger Menu item order beyond the filter row's slot (`app-header.spec.md`).
- Mobile one-column-at-a-time layout or the column switcher (`board-layout.spec.md` "Column: Mobile Behavior").
- Ticket badges shown inside cards (`ticket-card.spec.md`). Filter chips reuse badge styling but do not own it.
- The pinned-items surface (IDEA-002 → planned `pin-rail.spec.md`). Pinned items live in their own left rail and are not part of the filter bar's `TicketFilters` state.
- Backend filtering, MCP filtering, or saved/shared views (explicitly out of scope).
- A future `Sheet`/`Drawer` primitive — mobile v1 uses the existing `Popover`.

## Composition

```text
BoardFilterBar
├── DesktopFilterBar                       (≥ sm only — hidden on < sm)
│   ├── FreeTextSearch                     (re-skinned FilterControls)
│   ├── FacetDropdown[status]
│   ├── FacetDropdown[priority]
│   ├── FacetDropdown[assignee]
│   ├── FacetDropdown[type]
│   ├── FacetDropdown[inWorktree]          (v1.1)
│   ├── FacetDropdown[phaseEpic]           (v1.1)
│   ├── FacetDropdown[impactAreas]         (v1.1)
│   ├── ActiveFilterChips                  (one chip per selected value)
│   └── ClearAll                           (≥1 active value only)
├── MobileFilterEntry                      (< sm only — hidden ≥ sm)
│   ├── HamburgerMenuRow["Filter · N"]     (count badge; opens popover)
│   └── FilterPopover
│       ├── FreeTextSearch
│       ├── FacetSection × 4               (status, priority, assignee, type)
│       └── ClearAll + Done
└── MobileChipStrip                        (< 768px, in Column header; only when active)
    └── Chip × N                           (one per active value, one-tap ✕)
```

Both desktop and mobile read from and write to the **same** `TicketFilters` reducer. Only the chrome differs.

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| BoardFilterBar | `src/components/BoardFilterBar/index.tsx` (new) | this file | board or list view, any project |
| DesktopFilterBar | `src/components/BoardFilterBar/DesktopFilterBar.tsx` (new) | — | `≥ sm` |
| FreeTextSearch | `src/components/FilterControls.tsx` (re-skinned) | — | always |
| FacetDropdown | `src/components/BoardFilterBar/FacetDropdown.tsx` (new, Radix `DropdownMenu`) | — | desktop only |
| FacetSection | `src/components/BoardFilterBar/FacetSection.tsx` (new, inside Popover) | — | mobile popover only |
| ActiveFilterChips | `src/components/BoardFilterBar/ActiveFilterChips.tsx` (new, reuses `Badge` styling) | — | ≥1 active value |
| ClearAll | text `button` | — | ≥1 active value |
| HamburgerMenuRow | existing Hamburger Menu (`src/components/HamburgerMenu.tsx`) | `app-header.spec.md` | `< sm` |
| FilterPopover | `src/components/ui/popover.tsx` (existing) | — | `< sm`, on tap |
| MobileChipStrip | rendered inside `Column/index.tsx` header | `board-layout.spec.md` | `< 768px` and ≥1 active value |

## Source / Verification Anchors

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| Data contract | `domain-contracts/src/ticket/input.ts` | `TicketFilters` shape — the single filter state |
| Enum source of truth | `domain-contracts/src/types/schema.ts` | `CRStatuses`, `CRTypes`, `CRPriorities` feed static facet menus |
| Behavior model | `src/hooks/useBoardFilters.ts` (new) | reducer, persistence, `clearAll` |
| Board consumer | `src/components/Board.tsx` | where the predicate replaces the current inline filter |
| Mobile column host | `src/components/Column/index.tsx` | renders MobileChipStrip in the column header |
| Mobile menu host | `src/components/HamburgerMenu.tsx` | hosts the "Filter · N" row alongside mobile sort rows |
| Verification | `tests/e2e/board-filter.spec.ts` (new) | add/remove/clear across desktop and mobile viewports |

## Filter State Contract

The single source of truth. Every UI control, persistence layer, and future MCP/server filter resolves to this shape.

- **Across facets: AND.** `status=In Progress AND priority=High` narrows.
- **Within a facet: OR.** `status=[In Progress, Approved]` widens.
- **`query` is AND-combined with every facet**, and internally stays multi-term AND (today's `Board.tsx` behavior). Multi-term matching covers title, code, and description.
- **Empty `TicketFilters` = show everything.** No special-case branches.
- **`assignee` uses the sentinel string `"__none__"` for "Unassigned."** One facet, one shape — no separate boolean flag.
- **Static facets** (`status`, `type`, `priority`) draw their menu from the enums, not from the ticket set, so the menu never shrinks when a value is unused.
- **Derived facets** (`assignee`, `phaseEpic`, `impactAreas`) draw their menu from the current ticket set via a `useMemo` over the array. No server round-trip.

Persistence: `localStorage["markdown-ticket-filter-preferences"]`, mirroring `markdown-ticket-sort-preferences`. Lifecycle sibling of `localSortPreferences`.

## Facets

| Facet | Type | Values | v1 | Notes |
|-------|------|--------|----|-------|
| `query` | free-text | n/a | ✓ | Title, code, description. Multi-term AND. |
| `status` | enum multi-select | `CRStatuses` (7) | ✓ | |
| `priority` | enum multi-select | `CRPriorities` (4) | ✓ | |
| `assignee` | derived multi-select | unique assignees + `"__none__"` | ✓ | `"__none__"` = Unassigned |
| `type` | enum multi-select | `CRTypes` (6) | ✓ | |
| `inWorktree` | boolean | true / false | v1.1 | Tri-state: undefined = all |
| `phaseEpic` | derived multi-select | unique phase values | v1.1 | |
| `impactAreas` | derived multi-select | unique labels across tickets | v1.1 | |

Deferred (out of scope, revisit with evidence): date ranges, relationship filters (`related`/`depends`/`blocks`), full-text search of `content`, text-syntax filter language, nested AND/OR, saved views.

## Layout

### Spatial boundary

The filter bar and the pin rail (IDEA-002) occupy **different zones** by contract:

| Surface | Zone | Why |
|---------|------|-----|
| BoardFilterBar (this surface) | `header__right`, sibling to `SortControls` | Narrowing is a per-view, transient action — belongs with sort, in the header. |
| PinRail (planned) | New left rail, sibling to the content area in `App.tsx` (`flex-1` row becomes `PinRail + content`) | Pinned items are persistent, cross-view context — belongs in its own always-visible vertical zone. |

This split was forced by space: the 64px header cannot hold project selector + view switcher + filter bar + pin bar + sort + hamburger without collapsing something. Putting the pin bar in its own rail removes the collision instead of managing it. See `../explorations/filtering-system.md` §"Spatial decision" for the rejected alternatives.

### Desktop filter bar (≥ sm)

- Container: `flex items-center gap-2`, sited next to `SortControls`.
  - Single-project mode: inside `AppHeader`.
  - Multi-project (`showHeader`) mode: inside `.board-header` (`board-layout.spec.md:9-14`).
- FreeTextSearch first, then facet dropdowns in fixed order: status, priority, assignee, type.
- FacetDropdown trigger label: `Status` when empty, `Status: N` when N values selected.
- ActiveFilterChips row below the triggers: one chip per selected value, in facet order then value order. Horizontally wraps; never scrolls on desktop.
- ClearAll: text button at the end of the chip row. Only renders when ≥1 chip exists.
- Result-count text below the chip row: `Showing N of M tickets`. Always visible.

### Mobile (< sm)

- Desktop bar hidden (`hidden sm:flex` — same pattern as `SortControls`).
- **Hamburger Menu** gets a new "Filter · N" row in the same block as the existing mobile-only sort rows (`app-header.spec.md` items 6–7). N = count of active filter values; no badge when 0.
- Tapping the row opens **FilterPopover** (existing `Popover` primitive), anchored to the menu item. Contains: FreeTextSearch, four FacetSections (collapsible, checkboxes), Clear all + Done footer.
- **MobileChipStrip** renders inside the column header (`Column/index.tsx`), directly under the column switcher. Horizontal scroll; one chip per active value; each chip one-tap removable. Strip is absent entirely when no filters are active — no empty state, no wasted vertical space.
- No result-count text on mobile (vertical budget too tight; the chip strip itself communicates state).

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| empty | no filter values set | default trigger labels (`Status`, not `Status: 2`); no chip row; no ClearAll; no mobile strip |
| active | ≥1 filter value set | trigger labels show count (`Status: 2`); chip row visible with ClearAll; mobile strip visible; hamburger row shows `Filter · N` |
| facet open | click FacetDropdown / tap mobile "Filter" row | dropdown or popover open with value list; current selections checked |
| all filtered out | predicate matches 0 tickets | board columns show empty state (`board-layout.spec.md` "empty column"); result-count reads `Showing 0 of M tickets` |
| cleared | ClearAll pressed or last chip removed | returns to empty state via single `clearAll` action |

## Responsive

| Breakpoint | Change |
|------------|--------|
| `< 640px` (`< sm`) | Desktop bar hidden. Filter entry moves to Hamburger Menu as "Filter · N" row opening a Popover. MobileChipStrip appears in column header when filters active. |
| `640px–767px` | Same as `< 640px` — still one-column-at-a-time board (`useBoardLayout` uses `max-width: 768px`). |
| `≥ 768px` (desktop) | Desktop filter bar visible. MobileChipStrip absent. Hamburger "Filter · N" row absent. |

Note the intentional split: desktop/mobile chrome flips at `sm` (640px), matching `SortControls`; the board's own column-layout flip happens at `768px`. Between 640–767px the desktop filter bar is hidden and the board is still single-column — the chip strip carries active-filter visibility there.

## Accessibility

- Each FacetDropdown is a Radix `DropdownMenu`: arrow-key navigation, `Escape` to close, `aria-expanded` on trigger.
- Each chip is a `button` with `aria-label="Remove filter: {facet} {value}"`.
- ClearAll is a real `button` with `aria-label="Clear all filters"`, not an icon-only gesture.
- The desktop filter bar is a `<toolbar>` landmark.
- FilterPopover follows the existing `Popover` accessibility contract (focus trap, return focus on close).
- Result-count text is an `aria-live="polite"` region so screen-reader users hear filter effects.

## Semantic Style Anchors

| Element | Anchor | Contract |
|---------|--------|----------|
| facet trigger | `Status` / `Status: N` label swap | the trigger is the per-facet summary — always honest about active state |
| chip | reuses `Badge` styling (`src/components/Badge/`) | filter chips and ticket badges share one visual vocabulary |
| active strip (mobile) | horizontally scrollable chip row | never wraps on mobile; never shows an empty state |

## Extension notes

- **Add a facet**: add an optional field to `TicketFilters`, add a row to the Facets table, add a `FacetDropdown` (desktop) and `FacetSection` (mobile). The predicate updates in one place (`useBoardFilters`). No special-case UI branches.
- **Add the bottom-sheet mobile pattern (deferred)**: introduce a `Sheet` primitive in `src/components/ui/`, replace `FilterPopover` with it, keep `TicketFilters` and the chip strip unchanged. The data structure already supports it.
- **Add a text-syntax mode (deferred)**: layer a syntax parser on top of the same `TicketFilters` reducer. No state-shape change.
- **Add saved views (deferred)**: persist named `TicketFilters` snapshots. The state shape is already serializable.
