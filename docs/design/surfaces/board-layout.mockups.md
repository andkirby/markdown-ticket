# Board Layout — Wireframe Schema

Related spec: `board-layout.spec.md`

## Desktop (≥1024px, 4 columns)

```wireloom
window "Board — Desktop (4 columns)":
  panel:
    grid cols=4 rows=1:
      cell "Backlog" id="col-backlog":
        kv "Backlog" "3" id="backlog-count"
      cell "Open" id="col-open":
        kv "Open" "5" id="open-count"
      cell "In Progress" id="col-progress":
        kv "In Progress" "2" id="progress-count"
      cell "Done" id="col-done":
        kv "Done" "4" id="done-count"
    grid cols=4 rows=1:
      cell:
        list:
          slot "MDT-042 • Fix...":
            chip "Proposed" id="backlog-1-status"
            chip "Feature" id="backlog-1-type"
          slot "MDT-041 • Update...":
            chip "Proposed"
            chip "Bug"
          slot "No tickets" accent=warning id="backlog-empty"
      cell:
        list:
          slot "MDT-042 • Fix login":
            chip "Approved"
            chip "Feature"
          slot "MDT-039 • Setup API":
            chip "Approved"
            chip "Feature"
      cell:
        list:
          slot "MDT-042 • Active work":
            chip "In Progress"
            chip "Feature"
      cell:
        list:
          slot "MDT-040 • Complete":
            chip "Impl"
            chip "Feature"
          slot "MDT-038 • Deployed":
            chip "Part.Impl"
            chip "Bug"

annotation "Column header uses color gradient" target="col-backlog" position=top
annotation "Count pill shows visible tickets" target="backlog-count" position=right
annotation "Empty state: centered text" target="backlog-empty" position=right
```

## Mobile (<768px, single active column)

```wireloom
window "Board — Mobile":
  panel:
    combo value="In Progress" id="mobile-column-picker"
    list:
      slot "MDT-042 • Fix login":
        chip "In Progress"
        chip "Feature"
      slot "MDT-038 • Update API":
        chip "In Progress"
        chip "Bug"

annotation "DropdownMenu for column switching" target="mobile-column-picker" position=right
```

## Drag Over State

```wireloom
window "Board — Drag Over":
  panel:
    kv "Open" "5" id="drag-col-header"
    list:
      slot "MDT-042 • Fix login" id="drag-card":
        chip "Approved"
        chip "Feature"
      slot "" id="drop-zone"

annotation "ring-2 ring-blue-400/30 highlight" target="drag-col-header" position=top
annotation "bg-blue-50/50 drop target zone" target="drop-zone" position=right
```

## Empty Column

```wireloom
window "Board — Empty Column":
  panel:
    kv "Open" "0" id="empty-col-header"
    text "No tickets" muted id="empty-text"

annotation "Centered empty state, h-32" target="empty-text" position=bottom
```

## Loading State

```wireloom
window "Board — Loading":
  panel:
    grid cols=4 rows=3:
      cell id="loading-skeleton-1":
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner
      cell:
        spinner

annotation "Skeleton placeholders with gradient pulse animation" target="loading-skeleton-1" position=bottom
```

## Column with Toggle (In Progress)

```wireloom
window "Board — Column Toggle":
  panel:
    row:
      text "In Progress" bold
      spacer
      chip "⏸ Hold 2" id="toggle-pill"
    list:
      slot "MDT-042 • Active work":
        chip "In Progress"
        chip "Feature"
    divider
    text "Toggle modes:" muted
    text "default = main status only" muted
    text "active = On Hold only" muted
    text "merge = both combined" muted

annotation "StatusToggle pill: filters visible tickets" target="toggle-pill" position=right
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Column header bg | column color gradient | `getColumnGradient()` | Different color per column |
| Ticket count pill | `--primary` | `bg-primary/20 text-primary` | `rounded-full`, mono font |
| Drop zone highlight | blue-400/30 | `ring-2 ring-blue-400/30` | Only during drag-over |
| Dragging card | opacity 40% | `opacity-40 scale-95 rotate-2` | Visual feedback during drag |
| Empty state text | `--muted-foreground` | `text-gray-400` | Centered, `text-sm` |
| Loading skeleton | n/a | `animate-pulse` gradient | Gray gradient with staggered delay |
| Column border | `--border` | `border-r border-border` | First col also `border-l` |
| ScrollArea | n/a | `type="hover"` | Fades after 600ms |
