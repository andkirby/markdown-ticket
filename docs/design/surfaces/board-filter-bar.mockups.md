# Board Filter Bar — Wireframe Schema

Related spec: `board-filter-bar.spec.md`
Exploration (rejected alternatives): `../explorations/filtering-system.md`

Wireloom is structural — it shows composition and state, not exact chip widths or pixel spacing.

**The one rule: the filter never adds a second header line.** The search input and the compact
Filter button sit inline in the single header row, in the `header__left` dead zone after
ProjectSelector. Facets, chips, and result count live inside the popover that opens *from* the
button — overlaying the board, never pushing it down.

## Desktop — header is always one row

### Idle (no filters)

The header carries: logo · view switcher · project selector · **search input** · **Filter button** ·
(gap) · sort · hamburger. One row. No "Showing all N tickets" line — that lives in the popover.

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
      input placeholder="Filter tickets..." id="freetext"
      button "Filter" id="filter-btn"
      spacer
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
      input placeholder="Filter tickets..." id="freetext-active"
      button "Filter · 3" id="filter-btn-active"
      spacer
      button "Sort: Key ↓" id="sort"
      button "☰" id="hamburger"
```

### Filter popover open (overlays board, does not add a row)

The popover opens below-left of the FilterButton. It overlays the board columns. The header row
itself is unchanged. Inside: result count, facet sections (checkboxes), active chips, clear-all.

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
      input placeholder="Filter tickets..." id="freetext-open"
      button "Filter · 1" id="filter-btn-open"
      spacer
      button "Sort: Key ↓" id="sort"
      button "☰" id="hamburger"
  sheet position=bottom title="Filter":
    panel:
      text "Showing 3 of 180 tickets" id="result-count"
      text "Status" id="section-status"
      checkbox "In Progress" id="st-progress" checked label-right
      checkbox "Proposed" id="st-proposed" label-right
      checkbox "Approved" id="st-approved" label-right
      text "Priority" id="section-priority"
      checkbox "Critical" id="pr-crit" label-right
      checkbox "High" id="pr-high" label-right
      checkbox "Medium" id="pr-med" label-right
      checkbox "Low" id="pr-low" label-right
      text "Assignee" id="section-assignee"
      checkbox "Unassigned" id="as-none" label-right
      checkbox "kirby" id="as-kirby" label-right
      text "Type" id="section-type"
      checkbox "Bug Fix" id="ty-bug" label-right
      checkbox "Feature Enhancement" id="ty-feat" label-right
      row:
        chip "In Progress" id="chip-1"
        button "Clear all" id="clear-all"
```

### Narrow desktop (640–900px) — search shrinks, never wraps

On a narrow desktop the search input shrinks toward its min-width (120px) before the header would
consider wrapping. The Filter button stays. One row, always.

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
      input placeholder="Filter..." id="freetext-narrow"
      button "Filter · 2" id="filter-btn-narrow"
      spacer
      button "Key ↓" id="sort-narrow"
      button "☰" id="hamburger"
```

## Mobile — entry via Hamburger Menu

MDT mobile shows one column at a time (`useBoardLayout.ts`, `max-width: 768px`). The inline search
and Filter button are hidden on `< sm`. Filter entry is a "Filter · N" row in the Hamburger Menu
that opens the same popover.

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

### Mobile — filter popover open (from Hamburger Menu)

Opens the same `FilterPopover` component, anchored to the Hamburger Menu row.

```wireloom
window "Board — Mobile (filter popover)":
  navbar:
    leading:
      backbutton "MDT"
    center:
      text "Change Requests"
    trailing:
      button "☰" id="hamburger-open"
  sheet position=bottom title="Filter":
    panel:
      text "Showing 3 of 180 tickets" id="m-result-count"
      input placeholder="Filter tickets..." id="m-freetext"
      text "Status" id="m-section-status"
      checkbox "In Progress" id="m-st-progress" checked label-right
      checkbox "Proposed" id="m-st-proposed" label-right
      text "Priority" id="m-section-priority"
      checkbox "High" id="m-pr-high" checked label-right
      checkbox "Medium" id="m-pr-med" label-right
      row:
        chip "In Progress" id="m-chip-1"
        chip "High" id="m-chip-2"
        button "Clear all" id="m-clear-all"
```

## Annotations

| Element | Semantic Pattern | Notes |
|---------|------------------|-------|
| `freetext` / `freetext-narrow` / `m-freetext` | re-skinned FilterControls, inline in header | Preserves multi-term AND. Becomes `TicketFilters.query`. Shrinks on narrow desktop, never wraps. |
| `filter-btn` / `filter-btn-active` / `filter-btn-open` | compact Filter button, inline in header | Label: `Filter` when no facet values, `Filter · N` when N active. The ONLY header-level facet summary. |
| `result-count` / `m-result-count` | `<span aria-live="polite">` inside popover | `Showing N of M tickets`. Lives in the popover, NOT in the header. |
| `section-status` / `section-priority` / etc. | FacetSection (checkbox list) inside popover | Multi-select; OR within, AND across. |
| `chip-*` / `m-chip-*` | reuses `Badge` styling, inside popover (or mobile strip) | Removable. In the popover on desktop; in the column-header strip on mobile. |
| `clear-all` / `m-clear-all` | text button, inside popover | Returns empty `TicketFilters`. |
| `mobile-col-switcher` | existing `DropdownMenu` in Column header | Unchanged. MobileChipStrip sits below it on mobile. |
| `hamburger*` | existing Hamburger Menu | Mobile entry: "Filter · N" row opens the same FilterPopover. |
| `m-clear` | chip-strip trailing clear (mobile) | Removes all active values from the strip in one tap. |
