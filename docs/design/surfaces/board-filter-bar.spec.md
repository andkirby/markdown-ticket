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
- The filter popover (facets + active chips + clear-all) that opens *from* the button, overlapping content, never pushing it down. Desktop uses a manual overlay panel anchored below-right of the button; mobile uses a bottom-anchored sheet opened from the Hamburger Menu.
- Mobile filter entry via the Hamburger Menu (wrapped in `border-t`/`border-b` separators to group it as a distinct menu section).
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

The filter surface occupies the `header__left` dead zone and is **right-aligned** within it — anchored near `header__right` (next to sort + hamburger), not next to ProjectSelector. The `flex-1` dead stretch absorbs the remaining space to the *left* of the filter block, keeping the logo / view switcher / project selector clustered at the far left and the filter + sort + hamburger clustered at the right. It does **not** touch `header__right` (no room there) and does **not** render below the header (no second line).

This boundary is shared with the pin rail (IDEA-002 / MDT-197): filter owns `header__left` dead zone; pin owns a separate left rail. The two never compete for the same pixels.

## Composition

```text
BoardFilterBar (rendered into header__left, right-aligned within the dead zone)
├── FreeTextSearch                  (inline input, ~200px, flex-shrink-0)
├── FilterButton["Filter · N"]      (compact button; opens FilterPopover)
│   └── FilterPopover               (manual overlay panel — overlays content, does NOT push it)
│       ├── ResultCount             ("Showing N of M tickets"; aria-live; popover-only)
│       ├── FacetGrid               (two-column grid of FacetSections)
│       │   ├── Col A: FacetSection[type]      ┐
│       │   ├── Col B: FacetSection[status]    │  Row 1: Type    | Status
│       │   ├── Col A: FacetSection[priority]  │  Row 2: Priority | Assignee
│       │   └── Col B: FacetSection[assignee]  ┘
│       ├── ActiveFilterChips       (one chip per selected value; popover-only)
│       └── ClearAll                (text button)
└── MobileFilterEntry               (< sm only — hidden ≥ sm; rendered via Hamburger Menu)
    └── (same FacetGrid + chips inside a bottom-anchored sheet)
```

**Critical: `ActiveFilterChips` and `ResultCount` render inside the popover, not in the header.** This is what guarantees no second line. When filters are active, the only header-level evidence is the button label changing to `Filter · N`. The full detail (chips, count, clear-all) lives behind the popover. Opening the popover overlays the board — it never inserts a row.

### Facet grid order

The four v1 facets render in a **two-column grid**, filling column-major:

| Position | Left column | Right column |
|----------|-------------|--------------|
| Row 1 | **Type** | **Status** |
| Row 2 | **Priority** | **Assignee** |

This order groups the enum-backed facets (type, status, priority — bounded, short lists) with the derived assignee list on the right. The grid uses `grid grid-cols-2 gap-x-4` so the two columns share vertical rhythm.

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| BoardFilterBar | `src/components/BoardFilterBar/index.tsx` | this file | board or list view, any project |
| FreeTextSearch | `src/components/FilterControls.tsx` (re-skinned) | — | desktop (`≥ sm`) inline in header |
| FilterButton | `src/components/BoardFilterBar/FilterButton.tsx` | — | desktop (`≥ sm`) inline in header; label `Filter` or `Filter · N` |
| FilterPopover | manual overlay panel (fixed overlay + absolute panel; see `FilterButton.tsx`) | — | on FilterButton click |
| FacetGrid | `grid grid-cols-2 gap-x-4` container in `index.tsx` | — | inside popover / mobile sheet |
| FacetSection | `src/components/BoardFilterBar/FacetSection.tsx` (checkbox list) | — | inside FacetGrid |
| ActiveFilterChips | `src/components/BoardFilterBar/ActiveFilterChips.tsx` (reuses `Badge` styling, `gap-2`) | — | inside popover; ≥1 active value |
| ResultCount | `<span aria-live="polite">` | — | inside popover; always rendered there |
| ClearAll | text `button` | — | inside popover; ≥1 active value |
| HamburgerMenuRow | existing Hamburger Menu (`src/components/HamburgerMenu.tsx`) | `app-header.spec.md` | `< sm` (FilterButton entry lives here on mobile, wrapped in separators) |
| MobileFilterSheet | bottom-anchored overlay panel in `index.tsx` (`MobileFilterPopover`) | — | `< sm`, opened from Hamburger Menu |

## Source / Verification Anchors

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| Data contract | `domain-contracts/src/ticket/input.ts` | `TicketFilters` shape — the single filter state |
| Enum source of truth | `domain-contracts/src/types/schema.ts` | `CRStatuses`, `CRTypes`, `CRPriorities` feed static facet menus |
| Behavior model | `src/hooks/useBoardFilters.ts` | reducer, persistence, `clearAll` |
| Header host | `src/App.tsx:428-480` | `Header`/`HeaderContent` — where the filter bar mounts (header__left centerSection) |
| Header layout | `src/components/Header/header.css` | `header__left` / `header__right` zone definitions |
| Mobile menu host | `src/components/HamburgerMenu.tsx` | hosts the "Filter · N" row on mobile (wrapped in `border-t`/`border-b` separators) |
| Verification | `tests/e2e/board/board-filter.spec.ts` | add/remove/clear via popover; assert header height never grows; mobile sheet opens on tap |

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

All three elements render inline inside `header__left`, **right-aligned** within the dead zone (the wrapper uses `justify-end`):

1. **FreeTextSearch** — `~200px` wide, `flex-shrink-0`. Search icon + input + clear (× when non-empty). This is the primary narrowing tool and stays always-visible because users type faster than they click facets.
2. **FilterButton** — compact, `flex-shrink-0`. Label: `Filter` when no facet values selected, `Filter · N` when N values active. Opens `FilterPopover`.
3. The `flex-1` dead stretch in `header__left` absorbs any remaining space to the **left** of these two, anchoring them next to sort + hamburger at the right edge rather than next to ProjectSelector at the left.

**The bar does NOT wrap.** FreeTextSearch + FilterButton together consume ~280px, well within the ~580px dead zone. If the viewport is so narrow that they'd collide with ProjectSelector, the FreeTextSearch shrinks (min-width ~120px) before anything wraps to a second line.

### FilterPopover (opens from FilterButton, overlays content)

- Anchored below-right of the FilterButton (right-aligned to the button, matching the header right alignment). Width ~440px to fit the two-column facet grid. Overlays the board — does NOT insert a row.
- **Scroll**: the popover body uses `overflow-y-auto` with `max-h-[70vh]` and inherits the project-standard global `::-webkit-scrollbar` (6px wide, gray-400 thumb, gray-100 track) — the same scrollbar columns use. No custom scrollbar CSS.
- Contents, top to bottom:
  1. **ResultCount** + **ClearAll** — a header row: `Showing N of M tickets` (`aria-live="polite"`, left) and `Clear all` (right, only when ≥1 value active).
  2. **FacetGrid** — two-column `grid grid-cols-2 gap-x-4` of collapsible checkbox lists in the order: type, status (row 1), priority, assignee (row 2). OR within a facet, AND across facets.
  3. **ActiveFilterChips** — one chip per selected value, removable. Renders here, not in the header.
- Apply is **live** (toggling a checkbox immediately filters; no Done button needed). The popover closes on outside-click or Escape.

### Mobile (< sm)

- The inline FreeTextSearch and FilterButton are hidden on `< sm` (the header is too crowded with logo + view switcher + hamburger).
- A **"Filter · N" row** in the Hamburger Menu opens the filter panel. This row is wrapped in separators (`border-t` above, `border-b` below) so the Filter block reads as a distinct section, matching the Sort block's separator pattern.
- The filter panel is a **bottom-anchored sheet** (`fixed inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto`) for thumb reachability — not a Radix Popover anchored to an invisible trigger. It is **portaled to `document.body`** via `createPortal` so it escapes the header's `backdrop-blur-xl` containing block (which would otherwise trap `position:fixed` descendants inside the header's box). It contains: a free-text input, the same two-column FacetGrid, ActiveFilterChips, and a Done button. Tapping the Filter row first closes the Hamburger Menu, then opens the sheet.
- **MobileChipStrip** renders inside the column header (`Column/index.tsx`), under the column switcher — horizontally scrollable, one chip per active value. This is the mobile active-filter summary (there is no header chip row on mobile).
- Result count shows inside the panel, same as desktop.

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
| `< 640px` (`< sm`) | Inline FreeTextSearch + FilterButton hidden. Entry via Hamburger Menu "Filter · N" row (wrapped in `border-t`/`border-b` separators) → bottom-anchored filter sheet. MobileChipStrip in column header when active. |
| `≥ 640px` (`≥ sm`) | FreeTextSearch + FilterButton inline in `header__left`, right-aligned. No MobileChipStrip. Hamburger "Filter" row absent. |
| narrow desktop (640–900px) | FreeTextSearch shrinks toward min-width (120px) before wrapping; never wraps to a second line. |

## Accessibility

- FreeTextSearch is a standard `<input>` with `aria-label="Filter tickets"`.
- FilterButton is a `<button>` with `aria-expanded` reflecting popover state, `aria-haspopup="dialog"`, and `aria-label` that includes the count when active (`Filter, 3 active`).
- FilterPopover (desktop) is a `role="dialog"` panel with `aria-label="Filter tickets"`. A fixed click-away overlay closes it; `Escape` closes it; focus returns to FilterButton.
- MobileFilterSheet is a `role="dialog"` bottom-anchored panel with `aria-label="Filter tickets"`. Same close semantics (overlay click / Done button / Escape).
- FacetSections use native `<input type="checkbox">` with associated `<label>`.
- Chips inside the popover are `<button>` with `aria-label="Remove filter: {facet} {value}"`.
- ResultCount is `aria-live="polite"` so screen readers announce filter effects whether the popover is open or not.

## Semantic Style Anchors

| Element | Anchor | Contract |
|---------|--------|----------|
| filter button label | `Filter` / `Filter · N` swap | the single header-level summary of facet state — honest without consuming width |
| filter block alignment | `justify-end` within `header__left` dead zone | right-aligned next to sort + hamburger; never left-anchored to ProjectSelector |
| facet grid | `grid grid-cols-2 gap-x-4` | two-column layout; type/status row, priority/assignee row |
| popover chip | reuses `Badge` styling (`src/components/Badge/`); container uses `gap-2` (project standard) | filter chips and ticket badges share one visual vocabulary |
| popover scroll | global `::-webkit-scrollbar` (6px, gray-400 thumb, gray-100 track) | the same scrollbar columns use — one scroll standard across the app |
| mobile menu Filter row | `border-t border-b border-border` separators | visually groups Filter as a distinct menu section (mirrors the Sort block) |
| mobile strip | horizontally scrollable chip row | never wraps; never shows an empty state |

## Extension notes

- **Add a facet**: add an optional field to `TicketFilters`, add a row to the Facets table, add a `FacetSection` inside the popover. The header never changes — the popover absorbs new facets.
- **Show active chips inline in the header later (deferred)**: if a future header restructure frees more width, chips can render between FreeTextSearch and FilterButton. Today there isn't room, so chips live in the popover. The `TicketFilters` state is unchanged either way.
- **Add the bottom-sheet mobile pattern**: the mobile filter uses a manual bottom-anchored overlay panel (`fixed inset-x-0 bottom-0`). A future `Sheet`/`Drawer` primitive could replace it with no state change.
- **Add a text-syntax mode (deferred)**: layer a parser on the same `TicketFilters` reducer. No state change.
- **Add saved views (deferred)**: persist named snapshots. State shape is already serializable.
