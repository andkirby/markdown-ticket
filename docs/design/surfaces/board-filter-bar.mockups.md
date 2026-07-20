# Board Filter Bar — Wireframe Schema

Related spec: `board-filter-bar.spec.md`
Exploration (rejected alternatives): `../explorations/filtering-system.md`

Wireloom is structural — it shows composition and state, not exact chip widths or pixel spacing.

## Desktop

### Default state — no filters active

```wireloom
window "Board — Filter bar (default)":
  panel:
    row:
      input placeholder="Filter tickets..." id="freetext"
      button "Status" id="facet-status"
      button "Priority" id="facet-priority"
      button "Assignee" id="facet-assignee"
      button "Type" id="facet-type"
      spacer
      button "Sort: Key ↓" id="sort"
      button "Refresh" id="refresh"
    text "Showing all 14 tickets" id="result-count"
```

### Active filters — chips visible

```wireloom
window "Board — Filter bar (active)":
  panel:
    row:
      input placeholder="Filter tickets..." id="freetext"
      button "Status: 2" id="facet-status-active"
      button "Priority: 1" id="facet-priority-active"
      button "Assignee" id="facet-assignee"
      button "Type" id="facet-type"
      spacer
      button "Sort: Key ↓" id="sort"
      button "Refresh" id="refresh"
    row:
      chip "In Progress" id="chip-1"
      chip "Approved" id="chip-2"
      chip "High" id="chip-3"
      button "Clear all" id="clear-all"
    text "Showing 3 of 14 tickets" id="result-count-active"
```

### Facet dropdown open (priority)

```wireloom
window "Board — Filter bar (priority open)":
  panel:
    row:
      input placeholder="Filter tickets..." id="freetext"
      button "Status: 2" id="facet-status-active"
      button "Priority: 1" id="facet-priority-open"
      button "Assignee" id="facet-assignee"
      button "Type" id="facet-type"
      spacer
      button "Sort: Key ↓" id="sort"
  sheet position=bottom title="Priority":
    panel:
      checkbox "Critical" id="val-critical" label-right
      checkbox "High" id="val-high" checked label-right
      checkbox "Medium" id="val-medium" label-right
      checkbox "Low" id="val-low" label-right
      row justify=end:
        button "Done" primary id="priority-done"
```

## Mobile

MDT mobile shows one column at a time (`useBoardLayout.ts`, `max-width: 768px`). The desktop filter
bar is hidden on `< sm` and the filter entry lives in the Hamburger Menu — same pattern as mobile sort
today (`app-header.spec.md` items 6–7). These three mockups show the states the spec contracts.

### Mobile — default (no filters), one-column-at-a-time

No chip strip when nothing is active — vertical space is precious on mobile.

```wireloom
window "Board — Mobile (no filters)":
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

When filters are active, a horizontally-scrollable chip strip appears under the column header. The
Hamburger Menu row carries the count so the state is discoverable with the menu closed.

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

### Mobile — filter Popover open (from Hamburger Menu)

Filtering is reached via the Hamburger Menu, same pattern as mobile sort. Opens a `Popover` (existing
primitive) — not a bottom sheet, which would require a new component (deferred per spec).

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
      input placeholder="Filter tickets..." id="m-freetext"
      text "Status" id="m-section-status"
      checkbox "Proposed" id="m-st-proposed" label-right
      checkbox "In Progress" id="m-st-progress" checked label-right
      checkbox "Approved" id="m-st-approved" checked label-right
      text "Priority" id="m-section-priority"
      checkbox "Critical" id="m-pr-crit" label-right
      checkbox "High" id="m-pr-high" checked label-right
      checkbox "Medium" id="m-pr-med" label-right
      checkbox "Low" id="m-pr-low" label-right
      row justify=end:
        button "Clear all" id="m-clear-all"
        button "Done" primary id="m-done"
```

## Annotations

| Element | Semantic Pattern | Notes |
|---------|------------------|-------|
| `freetext` / `m-freetext` | re-skinned FilterControls | Preserves current multi-term AND behavior. Becomes `TicketFilters.query`. |
| `facet-status` / `facet-priority` / etc. | Radix DropdownMenu trigger | Label shows facet name when empty; `Status: N` when N values selected. |
| `chip-*` / `m-chip-*` | reuses `Badge` styling | Removable; `aria-label="Remove filter: {facet} {value}"`. OR within a facet. |
| `clear-all` / `m-clear-all` | text button | Single action: returns empty `TicketFilters`. Only renders when ≥1 chip. |
| `result-count` | text below bar (desktop) | `Showing N of M tickets`. `aria-live="polite"`. Absent on mobile per spec. |
| `priority-done` / `m-done` | primary button in dropdown/popover footer | Apply-on-close, not live, to match the existing mobile-sort interaction. |
| `mobile-col-switcher` | existing `DropdownMenu` in Column header | Unchanged from `board-layout.spec.md`. MobileChipStrip sits below it. |
| `hamburger` / `hamburger-active` / `hamburger-open` | existing Hamburger Menu | New "Filter · N" row added in the same block as mobile-only sort rows. |
| `m-clear` | chip-strip trailing clear | Removes all active values from the strip in one tap (alternative to opening the popover). |
