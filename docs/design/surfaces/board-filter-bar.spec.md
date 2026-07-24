# Board Filter Bar

The board's narrowing surface — a free-text search plus a faceted filter popover, both rendered **inside the app header's single row**. One `TicketFilters` state shared across desktop and mobile.

Related artifacts:
- Review mockups: `board-filter-bar.mockups.md`
- Exploration / rejected alternatives: `../explorations/filtering-system.md`
- Neighbor surface: `board-layout.spec.md`
- Neighbor surface: `app-header.spec.md` (owns the header zone this surface renders into)
- Neighbor surface: `pin-rail.spec.md` (planned, IDEA-002 — separate left rail, not the header)
- Data contract: `domain-contracts/src/ticket/input.ts` (`TicketFilters`)

## The one rule

**The filter surface never adds a second line to the header.** Every state — idle, active, popover open — renders within the existing 64px `nav.header` row. This is non-negotiable and drives every decision below.

## Owns

- The `TicketFilters` state shape and its single predicate semantics (AND across facets, OR within a facet).
- The free-text search input rendered inline in the header.
- The compact "Filter · N" button rendered inline in the header, next to the search input.
- The filter popover (facets + active chips + clear-all) that opens *from* the button, overlapping content, never pushing it down.
- Mobile filter entry via the Hamburger Menu.
- The "showing N of M" result count, rendered **inside the popover**, not as a header line.
- Empty-filter invariant: an empty `TicketFilters` shows every ticket. No special cases.

## Does Not Own

- The app header zone itself (`app-header.spec.md` owns `nav.header`, `header__left`, `header__right`). This surface renders *into* `header__left` as a tenant; it does not restructure the header.
- Board column grouping, drag-drop, or per-column sort (`board-layout.spec.md`).
- Mobile one-column-at-a-time layout or the column switcher (`board-layout.spec.md`).
- Ticket badges shown inside cards (`ticket-card.spec.md`). Filter chips reuse badge styling but do not own it.
- The pinned-items surface (IDEA-002 / MDT-197, planned `pin-rail.spec.md`).
- Backend filtering, MCP filtering, or saved/shared views.
- A `Sheet`/`Drawer` primitive — mobile uses the existing `Popover`.

## Spatial boundary

The header (`nav.header`, 64px tall) has two zones. Measured from a 1280px-wide viewport:

| Zone | Width | Contents today | Available for filter |
|------|-------|----------------|----------------------|
| `header__left` | ~1040px | MobileLogo (85px) + ViewModeSwitcher (~160px) + ProjectSelector (~207px), then `flex-1` dead stretch | **~580px dead space** — this is where the filter lives |
| `header__right` | ~224px | SortControls + HamburgerMenu (+ AuthStatusAction when locked) | **0px** — full |

The filter surface occupies the `header__left` dead zone, after ProjectSelector and before the `flex-1` stretch ends. It does **not** touch `header__right` (no room) and does **not** render below the header (no second line).

This boundary is shared with the pin rail (IDEA-002 / MDT-197): filter owns `header__left` dead zone; pin owns a separate left rail. The two never compete for the same pixels.

## Composition

```text
BoardFilterBar (rendered into header__left, after ProjectSelector)
├── FreeTextSearch                  (inline input, ~200px, flex-shrink-0)
├── FilterButton["Filter · N"]      (compact button; opens FilterPopover)
│   └── FilterPopover               (Radix Popover — overlays content, does NOT push it)
│       ├── ResultCount             ("Showing N of M tickets"; aria-live; popover-only)
│       ├── FacetSection[status]    (checkbox list, multi-select)
│       ├── FacetSection[priority]
│       ├── FacetSection[assignee]
│       ├── FacetSection[type]
│       ├── FacetSection[inWorktree]      (v1.1)
│       ├── FacetSection[phaseEpic]       (v1.1)
│       ├── FacetSection[impactAreas]     (v1.1)
│       ├── ActiveFilterChips       (one chip per selected value; popover-only)
│       └── ClearAll                (text button)
└── MobileFilterEntry               (< sm only — hidden ≥ sm; rendered via Hamburger Menu)
    └── (same FilterPopover component, opened from the menu)
```

**Critical: `ActiveFilterChips` and `ResultCount` render inside the popover, not in the header.** This is what guarantees no second line. When filters are active, the only header-level evidence is the button label changing to `Filter · N`. The full detail (chips, count, clear-all) lives behind the popover. Opening the popover overlays the board — it never inserts a row.

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| BoardFilterBar | `src/components/BoardFilterBar/index.tsx` | this file | board or list view, any project |
| FreeTextSearch | `src/components/FilterControls.tsx` (re-skinned) | — | desktop (`≥ sm`) inline in header |
| FilterButton | `src/components/BoardFilterBar/FilterButton.tsx` | — | desktop (`≥ sm`) inline in header; label `Filter` or `Filter · N` |
| FilterPopover | `src/components/BoardFilterBar/FilterPopover.tsx` (wraps `src/components/ui/popover.tsx`) | — | on FilterButton click / hamburger tap |
| FacetSection | `src/components/BoardFilterBar/FacetSection.tsx` (checkbox list) | — | inside popover |
| ActiveFilterChips | `src/components/BoardFilterBar/ActiveFilterChips.tsx` (reuses `Badge` styling) | — | inside popover; ≥1 active value |
| ResultCount | `<span aria-live="polite">` | — | inside popover; always rendered there |
| ClearAll | text `button` | — | inside popover; ≥1 active value |
| HamburgerMenuRow | existing Hamburger Menu (`src/components/HamburgerMenu.tsx`) | `app-header.spec.md` | `< sm` (FilterButton entry lives here on mobile) |

## Source / Verification Anchors

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| Data contract | `domain-contracts/src/ticket/input.ts` | `TicketFilters` shape — the single filter state |
| Enum source of truth | `domain-contracts/src/types/schema.ts` | `CRStatuses`, `CRTypes`, `CRPriorities` feed static facet menus |
| Behavior model | `src/hooks/useBoardFilters.ts` | reducer, persistence, `clearAll` |
| Header host | `src/App.tsx:428-480` | `Header`/`HeaderContent` — where the filter bar mounts (header__left centerSection) |
| Header layout | `src/components/Header/header.css` | `header__left` / `header__right` zone definitions |
| Mobile menu host | `src/components/HamburgerMenu.tsx` | hosts the "Filter · N" row on mobile |
| Verification | `tests/e2e/board-filter.spec.ts` | add/remove/clear; assert header height never grows |

## Filter State Contract

The single source of truth. Every UI control, persistence layer, and future MCP/server filter resolves to this shape.

- **Across facets: AND.** `status=In Progress AND priority=High` narrows.
- **Within a facet: OR.** `status=[In Progress, Approved]` widens.
- **`query` is AND-combined with every facet**, and internally stays multi-term AND over title/code/description.
- **Empty `TicketFilters` = show everything.** No special-case branches.
- **`assignee` uses the sentinel string `"__none__"` for "Unassigned."** One facet, one shape.
- **Static facets** (`status`, `type`, `priority`) draw values from enums. **Derived facets** (`assignee`, `phaseEpic`, `impactAreas`) draw values from the current ticket set via `useMemo`.

Persistence: `localStorage["markdown-ticket-filter-preferences"]`, mirroring `markdown-ticket-sort-preferences`.

## Facets

| Facet | Type | Values | v1 | Notes |
|-------|------|--------|----|-------|
| `query` | free-text | n/a | ✓ | Title, code, description. Multi-term AND. |
| `status` | enum multi-select | `CRStatuses` (7) | ✓ | |
| `priority` | enum multi-select | `CRPriorities` (4) | ✓ | |
| `assignee` | derived multi-select | unique assignees + `"__none__"` | ✓ | `"__none__"` = Unassigned |
| `type` | enum multi-select | `CRTypes` (6) | ✓ | |
| `inWorktree` | boolean | true / false | v1.1 | |
| `phaseEpic` | derived multi-select | unique phase values | v1.1 | |
| `impactAreas` | derived multi-select | unique labels | v1.1 | |

Deferred (out of scope): date ranges, relationship filters, full-text search of `content`, text-syntax language, nested AND/OR, saved views.

## Layout

### Desktop (≥ sm) — single header row, always

All three elements render inline inside `header__left`, after ProjectSelector:

1. **FreeTextSearch** — `~200px` wide, `flex-shrink-0`. Search icon + input + clear (× when non-empty). This is the primary narrowing tool and stays always-visible because users type faster than they click facets.
2. **FilterButton** — compact, `flex-shrink-0`. Label: `Filter` when no facet values selected, `Filter · N` when N values active. Opens `FilterPopover`.
3. The `flex-1` dead stretch in `header__left` absorbs any remaining space after these two, keeping them anchored next to ProjectSelector (left-of-center) rather than pushed against `header__right`.

**The bar does NOT wrap.** FreeTextSearch + FilterButton together consume ~280px, well within the ~580px dead zone. If the viewport is so narrow that they'd collide with `header__right`, the FreeTextSearch shrinks (min-width ~120px) before anything wraps to a second line.

### FilterPopover (opens from FilterButton, overlays content)

- Anchored below-left of the FilterButton. Width ~320px. Overlays the board — does NOT insert a row.
- Contents, top to bottom:
  1. **ResultCount** — `Showing N of M tickets`. `aria-live="polite"`. Always present inside the popover.
  2. **FreeTextSearch mirror** (optional) — if the header search is narrow on small desktops, a second search input inside the popover gives full-width typing room. On normal widths, omit (header search is enough).
  3. **FacetSections** — collapsible checkbox lists in fixed order: status, priority, assignee, type. OR within, AND across.
  4. **ActiveFilterChips** — one chip per selected value, removable. Renders here, not in the header.
  5. **ClearAll** — text button, bottom of popover. Only when ≥1 value active.
- Apply is **live** (toggling a checkbox immediately filters; no Done button needed). The popover closes on outside-click or Escape.

### Mobile (< sm)

- The inline FreeTextSearch and FilterButton are hidden on `< sm` (the header is too crowded with logo + view switcher + hamburger).
- A **"Filter · N" row** in the Hamburger Menu opens the same `FilterPopover` component, anchored to the menu item.
- **MobileChipStrip** renders inside the column header (`Column/index.tsx`), under the column switcher — horizontally scrollable, one chip per active value. This is the mobile active-filter summary (there is no header chip row on mobile).
- Result count shows inside the popover, same as desktop.

## States

| State | Trigger | Header appearance | Popover (when open) |
|-------|---------|-------------------|---------------------|
| empty | no filter values | FreeTextSearch empty; button reads `Filter` | result count "Showing all M"; no chips; no ClearAll |
| query active | user typed in FreeTextSearch | input shows query; button still reads `Filter` (query is not a facet) | result count reflects query; no facet chips |
| facet active | user checked facet value(s) in popover | button reads `Filter · N` | result count + chips + ClearAll |
| query + facets | both | input shows query; button reads `Filter · N` | result count + chips + ClearAll |
| all filtered out | predicate matches 0 | button reads `Filter · N`; input may have query | "Showing 0 of M"; board empty state behind popover |
| cleared | ClearAll or last chip removed | button reverts to `Filter`; input clears | returns to empty state |

**In every state, the header is exactly one row (64px).** The only thing that changes in the header is the content of the search input and the label on the button. No row is ever added.

## Responsive

| Breakpoint | Header filter chrome |
|------------|---------------------|
| `< 640px` (`< sm`) | Inline FreeTextSearch + FilterButton hidden. Entry via Hamburger Menu "Filter · N" row → popover. MobileChipStrip in column header when active. |
| `≥ 640px` (`≥ sm`) | FreeTextSearch + FilterButton inline in `header__left`. No MobileChipStrip. Hamburger "Filter" row absent. |
| narrow desktop (640–900px) | FreeTextSearch shrinks toward min-width (120px) before wrapping; never wraps to a second line. |

## Accessibility

- FreeTextSearch is a standard `<input>` with `aria-label="Filter tickets"`.
- FilterButton is a `<button>` with `aria-expanded` reflecting popover state, `aria-haspopup="dialog"`, and `aria-label` that includes the count when active (`Filter, 3 active`).
- FilterPopover follows the existing `Popover` contract: focus trap, `Escape` closes, focus returns to FilterButton.
- FacetSections use native `<input type="checkbox">` with associated `<label>`.
- Chips inside the popover are `<button>` with `aria-label="Remove filter: {facet} {value}"`.
- ResultCount is `aria-live="polite"` so screen readers announce filter effects whether the popover is open or not.

## Semantic Style Anchors

| Element | Anchor | Contract |
|---------|--------|----------|
| filter button label | `Filter` / `Filter · N` swap | the single header-level summary of facet state — honest without consuming width |
| popover chip | reuses `Badge` styling (`src/components/Badge/`) | filter chips and ticket badges share one visual vocabulary |
| mobile strip | horizontally scrollable chip row | never wraps; never shows an empty state |

## Extension notes

- **Add a facet**: add an optional field to `TicketFilters`, add a row to the Facets table, add a `FacetSection` inside the popover. The header never changes — the popover absorbs new facets.
- **Show active chips inline in the header later (deferred)**: if a future header restructure frees more width, chips can render between FreeTextSearch and FilterButton. Today there isn't room, so chips live in the popover. The `TicketFilters` state is unchanged either way.
- **Add the bottom-sheet mobile pattern (deferred)**: introduce a `Sheet` primitive, replace the mobile popover with it. No state change.
- **Add a text-syntax mode (deferred)**: layer a parser on the same `TicketFilters` reducer. No state change.
- **Add saved views (deferred)**: persist named snapshots. State shape is already serializable.
