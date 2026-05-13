# Documents View Navigation — Wireframe Schema

Related spec: `specs/documents-view-navigation.md`

## Default State

```wireframe
┌──────────────────────────────────────────────────────────────────────────────┐
│ DocumentsLayout                                                              │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ DocumentsSidebar             │ MarkdownViewer                                │
│ Documents [Filename ▾][↑][⇤][⌖][✎]                                          │
│ [🔍] Filter documents...      │ # Selected document                           │
│                              │                                               │
│ ▾ Recent                     │ Markdown content renders here.                │
│   Documents View Navigation  │                                               │
│   documents-view-navigation.md                                               │
│   ─────────────────────────  │                                               │
│ All Documents                │                                               │
│ ▸ docs                       │                                               │
│ ▸ server                     │                                               │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## Active Filter

```wireframe state:documents-view filter-active
┌──────────────────────────────────────────────────────────────────────────────┐
│ DocumentsLayout                                                              │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ Documents [Filename ▾][↑][⇤][⌖][✎]│ MarkdownViewer                           │
│ [🔍] navigation              │                                               │
│                              │ # Selected document                           │
│ ▾ Recent                     │                                               │
│   Documents View Navigation  │                                               │
│   documents-view-navigation.md                                               │
│   ─────────────────────────  │                                               │
│ Results                      │                                               │
│ ▾ docs/design/specs          │                                               │
│   documents-view-navigation.md ← selected                                    │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## Filter Hides Selected

```wireframe state:documents-view selected-hidden-by-filter
┌──────────────────────────────────────────────────────────────────────────────┐
│ DocumentsLayout                                                              │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ Documents [Filename ▾][↑][⇤][⌖][✎]│ MarkdownViewer                           │
│ [🔍] docker                  │                                               │
│                              │ # Selected document                           │
│ Results                      │                                               │
│ ▾ docs                       │                                               │
│   DOCKER_GUIDE.md            │                                               │
│                              │                                               │
│ [⌖] action clears filter, expands selected ancestors, scrolls active row     │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## Excluded Ticket Area

```wireframe state:documents-view excluded-ticket-area
┌────────────────────────────────────────────┐
│ Configure document paths                    │
│                                            │
│ Included roots                              │
│   docs                                      │
│                                            │
│ Excluded automatically                      │
│   docs/CRs      ticket area                 │
│                                            │
│ [Cancel]                         [Apply]    │
└────────────────────────────────────────────┘
```

## Mobile Viewport

```wireframe viewport:mobile
┌────────────────────────────────────────────┐
│ Documents                                  │
│ [Filename ▾][↑][⇤][⌖][✎]                  │
│ [🔍] Filter documents...                    │
│                                            │
│ ▾ Recent                                   │
│   Documents View Navigation                │
│   documents-view-navigation.md             │
│   ─────────────────────────                │
│                                            │
│ All Documents                              │
│ ▸ docs                                     │
│ ▸ server                                   │
├────────────────────────────────────────────┤
│ # Selected document                        │
│ Markdown content renders here.             │
└────────────────────────────────────────────┘
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Sidebar background | `--muted` | `bg-muted/30` | Existing Documents View panel style |
| Sidebar divider | `--border` | `border-r border-border` | Existing split-pane divider |
| Section labels | `--muted-foreground` | `.documents-sidebar-section` proposed | Compact labels for Recent and tree areas |
| Recent rows | `--foreground`, `--muted-foreground` | tree file row classes | Same icon, title, filename, truncation, and hover behavior as file rows |
| Recent/tree divider | `--border` | `border-b border-border` | Thin separator after Recent; tree scrolls independently below it |
| Selected row | `--primary` | `data-tree-state="selected"` proposed | Active document highlight |
| Muted disabled row | `--muted-foreground` | `data-tree-state="disabled"` proposed | Excluded paths |
| Collapse control | `--muted-foreground` | icon button | Collapses all except selected ancestors |
| Scroll target | `--primary` | `data-testid="scroll-to-active-document-button"` | Clears filter only when selected row is hidden |
| Excluded ticket area | `--muted-foreground` | PathSelector annotation | `docs/CRs/` is automatically excluded from document browsing |
