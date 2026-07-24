# Board Filter Bar — Wireframe Schema

Related spec: `board-filter-bar.spec.md`
Exploration (rejected alternatives): `../explorations/filtering-system.md`

Wireloom is structural — it shows composition and state, not exact chip widths or pixel spacing.

**The one rule: the filter never adds a second header line.** The search input and the compact
Filter button sit inline in the single header row, **right-aligned** within the `header__left` dead
zone (next to sort + hamburger, not next to ProjectSelector). Facets, chips, and result count live
inside the popover that opens *from* the button — overlaying the board, never pushing it down.

The popover uses a **two-column facet grid**: Type | Status on row 1, Priority | Assignee on row 2.

## Desktop — header is always one row

### Idle (no filters)

The header carries: logo · view switcher · project selector · (flex gap) · **search input** ·
**Filter button** · sort · hamburger. The filter block is right-aligned in the dead zone.
One row. No "Showing all N tickets" line — that lives in the popover.

```wireloom
window "Board — header (idle)":
  panel:
    row:
      text "▣ MDT" id="logo"
      segmented id="view-switcher":
        segment "Board" selected
        segment "List"
        segment "Docs"
      text "Markdown Ticket Board" id="proj-sel"
      spacer
      input placeholder="Filter tickets..." id="freetext"
      button "Filter" id="filter-btn"
      button "Sort: Key ↓" id="sort"
      button "☰" id="hamburger"
```

### Facets active (button label changes, still one row)

Only the FilterButton label changes — `Filter` → `Filter · 3`. The header row is identical otherwise.
Chips and count are NOT in the header; they're in the popover.

```wireloom
window "Board — header (facets active)":
  panel:
    row:
      text "▣ MDT" id="logo"
      segmented id="view-switcher-active":
        segment "Board" selected
        segment "List"
        segment "Docs"
      text "Markdown Ticket Board" id="proj-sel"
      spacer
      input placeholder="Filter tickets..." id="freetext-active"
      button "Filter · 3" id="filter-btn-active"
      button "Sort: Key ↓" id="sort"
      button "☰" id="hamburger"
```

### Filter popover open (overlays board, two-column facet grid)

The popover opens below-right of the FilterButton (right-aligned to the button). It overlays the
board columns. The header row itself is unchanged. Inside: result count + clear-all (header row),
then the two-column facet grid (Type | Status, Priority | Assignee), then active chips.

```wireloom
window "Board — filter popover open":
  panel:
    row:
      text "▣ MDT" id="logo"
      segmented id="view-switcher-open":
        segment "Board" selected
        segment "List"
        segment "Docs"
      text "Markdown Ticket Board" id="proj-sel"
      spacer
      input placeholder="Filter tickets..." id="freetext-open"
      button "Filter · 1" id="filter-btn-open"
      button "Sort: Key ↓" id="sort"
      button "☰" id="hamburger"
  sheet position=bottom title="Filter":
    panel:
      row:
        text "Showing 3 of 180 tickets" id="result-count"
        button "Clear all" id="clear-all"
      grid cols=2:
        text "Type" id="section-type"
        text "Status" id="section-status"
        checkbox "Bug Fix" id="ty-bug" label-right
        checkbox "In Progress" id="st-progress" checked label-right
        checkbox "Feature Enhancement" id="ty-feat" label-right
        checkbox "Proposed" id="st-proposed" label-right
        checkbox "Documentation" id="ty-doc" label-right
        checkbox "Approved" id="st-approved" label-right
        text "Priority" id="section-priority"
        text "Assignee" id="section-assignee"
        checkbox "Critical" id="pr-crit" label-right
        checkbox "Unassigned" id="as-none" label-right
        checkbox "High" id="pr-high" label-right
        checkbox "kirby" id="as-kirby" label-right
        checkbox "Medium" id="pr-med" label-right
        checkbox "Low" id="pr-low" label-right
      row:
        chip "In Progress" id="chip-1"
```

### Narrow desktop (640–900px) — search shrinks, never wraps

On a narrow desktop the search input shrinks toward its min-width (120px) before the header would
consider wrapping. The Filter button stays right-aligned. One row, always.

```wireloom
window "Board — narrow desktop header":
  panel:
    row:
      text "▣" id="logo-sm"
      segmented id="view-switcher-narrow":
        segment "Board" selected
        segment "List"
        segment "Docs"
      text "MDT" id="proj-sel-sm"
      spacer
      input placeholder="Filter..." id="freetext-narrow"
      button "Filter · 2" id="filter-btn-narrow"
      button "Key ↓" id="sort-narrow"
      button "☰" id="hamburger"
```

## Mobile — entry via Hamburger Menu

MDT mobile shows one column at a time (`useBoardLayout.ts`, `max-width: 768px`). The inline search
and Filter button are hidden on `< sm`. Filter entry is a "Filter · N" row in the Hamburger Menu,
wrapped in separators (`border-t` / `border-b`) to group it as a distinct section. Tapping it opens
a full-width filter modal (reuses the shared `<Modal>` primitive — same pattern as the project
browser). The search input sits in the pinned header; below it a result-count + Clear-all row, then
the two-column facet grid + chips inside a ScrollArea.

### Mobile — hamburger menu open (Filter row with separators)

```wireloom
window "Board — Mobile (hamburger menu)":
  navbar:
    leading:
      backbutton "MDT"
    center:
      text "Change Requests"
    trailing:
      button "☰" id="hamburger-open"
  sheet position=bottom title="Menu":
    panel:
      button "Sort: Key ↓" id="menu-sort"
      separator
      button "Filter · 2" id="menu-filter"
      separator
      button "Clear Cache" id="menu-cache"
      button "Event History" id="menu-events"
```

### Mobile — idle (one column, no strip)

```wireloom
window "Board — Mobile (idle)":
  navbar:
    leading:
      backbutton "MDT"
    center:
      text "Change Requests"
    trailing:
      button "☰" id="hamburger"
  panel:
    text "In Progress  ▾" id="mobile-col-switcher"
    text "2 tickets"
    list:
      slot "MDT-042 • Fix login":
        chip "In Progress"
        chip "Feature"
      slot "MDT-039 • Setup API":
        chip "In Progress"
        chip "Feature"
```

### Mobile — filters active (chip strip under column header)

When facets are active, a horizontal chip strip appears under the column switcher. The Hamburger
row carries the count for discoverability with the menu closed.

```wireloom
window "Board — Mobile (filters active)":
  navbar:
    leading:
      backbutton "MDT"
    center:
      text "Change Requests"
    trailing:
      button "☰" id="hamburger-active"
  panel:
    text "In Progress  ▾" id="mobile-col-switcher-active"
    row:
      chip "High" id="m-chip-1"
      chip "Bug" id="m-chip-2"
      button "✕" id="m-clear"
    text "1 of 2 tickets"
    list:
      slot "MDT-051 • Crash on save":
        chip "In Progress"
        chip "High"
        chip "Bug"
```

### Mobile — filter modal open (full-width modal, from Hamburger Menu)

Opens a full-width filter modal (reuses the shared `<Modal>` primitive, same pattern as the project
browser). The "Filter" headline + search input sit in the pinned header. Below: a result-count +
Clear-all row, then the two-column facet grid + chips inside a ScrollArea.

```wireloom
window "Board — Mobile (filter modal)":
  navbar:
    leading:
      backbutton "MDT"
    center:
      text "Change Requests"
    trailing:
      button "☰" id="hamburger-open"
  modal title="Filter" close-button=true:
    header:
      text "Filter" id="m-title"
      input placeholder="Filter tickets..." id="m-freetext"
    panel:
      row:
        text "Showing 3 of 180 tickets" id="m-result-count"
        button "Clear all" id="m-clear-all"
      grid cols=2:
        text "Type" id="m-section-type"
        text "Status" id="m-section-status"
        checkbox "Bug Fix" id="m-ty-bug" label-right
        checkbox "In Progress" id="m-st-progress" checked label-right
        checkbox "Feature" id="m-ty-feat" label-right
        checkbox "Proposed" id="m-st-proposed" label-right
        text "Priority" id="m-section-priority"
        text "Assignee" id="m-section-assignee"
        checkbox "High" id="m-pr-high" checked label-right
        checkbox "Unassigned" id="m-as-none" label-right
        checkbox "Medium" id="m-pr-med" label-right
        checkbox "kirby" id="m-as-kirby" label-right
      row:
        chip "In Progress" id="m-chip-1"
        chip "High" id="m-chip-2"
```

## Annotations

| Element | Semantic Pattern | Notes |
|---------|------------------|-------|
| `freetext` / `freetext-narrow` / `m-freetext` | re-skinned FilterControls, inline in header (right-aligned on desktop) | Preserves multi-term AND. Becomes `TicketFilters.query`. Shrinks on narrow desktop, never wraps. |
| `filter-btn` / `filter-btn-active` / `filter-btn-open` | compact Filter button, inline in header (right-aligned) | Label: `Filter` when no facet values, `Filter · N` when N active. The ONLY header-level facet summary. |
| `result-count` / `m-result-count` | `<span aria-live="polite">` inside popover (desktop) / below modal header (mobile) | `Showing N of M tickets`. Lives inside the popover/modal, NOT in the header. |
| `section-type` / `section-status` / `section-priority` / `section-assignee` | FacetSection in a two-column `grid grid-cols-2 gap-x-4` | Row 1: Type \| Status. Row 2: Priority \| Assignee. Multi-select; OR within, AND across. |
| `chip-*` / `m-chip-*` | reuses `Badge` styling (`gap-2`), inside popover/modal (or mobile strip) | Removable. In the popover on desktop; in the column-header strip on mobile. |
| `clear-all` / `m-clear-all` | text button, inside popover header row / below modal header | Returns empty `TicketFilters`. Single instance — no duplication on mobile. |
| `mobile-col-switcher` | existing `DropdownMenu` in Column header | Unchanged. MobileChipStrip sits below it on mobile. |
| `menu-filter` | Hamburger Menu "Filter · N" row, wrapped in `separator` | Opens the full-width filter modal. Separators above and below group it as a distinct menu section. |
| `hamburger*` | existing Hamburger Menu | Mobile entry: "Filter · N" row (with separators) opens the full-width filter modal. |
| `m-clear` | chip-strip trailing clear (mobile) | Removes all active values from the strip in one tap. |
| `m-done` | close (✕) button in the mobile filter modal header | Closes the modal (apply is live; close is for dismiss). |
