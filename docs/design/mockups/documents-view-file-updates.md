# Documents View File Updates — Wireframe Schema

Related spec: `specs/documents-view-file-updates.md`

## Default State

```wireframe
┌───────────────────────────────────────────────────────────────────────────────┐
│ DocumentsLayout                                                               │
├───────────────────────────────┬───────────────────────────────────────────────┤
│ DocumentsSidebar              │ MarkdownViewer                                │
│ Documents [Filename ▾] [↑] [⌖] [✎]│ Created: May 1, 2026 | Updated: May 11, 2026│
│ [🔍] Search documents...      │                                               │
│                               │ # Current document                            │
│ ▾ docs                        │                                               │
│   README.md                   │ Markdown content renders here.                │
│   ARCHITECTURE.md  ← selected │                                               │
│ ▾ specs                       │                                               │
│   api.md                      │                                               │
└───────────────────────────────┴───────────────────────────────────────────────┘
```

## Selected File Updated

```wireframe state:documents-view selected-file-updated
┌──────────────────────────────────────────────────────────────────────────────┐
│ DocumentsLayout                                                              │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ DocumentsSidebar             │ MarkdownViewer                                │
│ Documents [Filename ▾] [↑] [⌖] [✎]│ Created: May 1, 2026 | Updated: just now │
│ [🔍] Search documents...      │                              [↻ Updated]      │
│                              │                                               │
│ ▾ docs                       │ # Current document                            │
│   README.md                  │                                               │
│   ARCHITECTURE.md  ● updated │ Fresh content replaces cached content.         │
│ ▾ specs                      │                                               │
│   api.md                     │                                               │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## Non-Selected File Updated

```wireframe state:documents-view other-file-updated
┌──────────────────────────────────────────────────────────────────────────────┐
│ DocumentsLayout                                                              │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ DocumentsSidebar             │ MarkdownViewer                                │
│ Documents [Modified ▾] [↓] [⌖] [✎]│ Created: May 1, 2026 | Updated: May 11, 2026│
│ [🔍] Search documents...      │                                               │
│                              │ # Current document                            │
│ ▾ docs                       │                                               │
│   README.md        ● updated │ Reader stays on the selected file.             │
│   ARCHITECTURE.md  ← selected│                                               │
│ ▾ specs                      │                                               │
│   api.md                     │                                               │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## Selected File Deleted

```wireframe state:documents-view selected-file-deleted
┌──────────────────────────────────────────────────────────────────────────────┐
│ DocumentsLayout                                                              │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ DocumentsSidebar             │ MarkdownViewer                                │
│ Documents [Filename ▾] [↑] [⌖] [✎]│                                           │
│ [🔍] Search documents...      │                 File was deleted              │
│                              │        Choose another document from the tree.  │
│ ▾ docs                       │                                               │
│   README.md                  │              [Select another file]            │
│ ▾ specs                      │                                               │
│   api.md                     │                                               │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## SSE Reconnected

```wireframe state:documents-view reconnecting
┌──────────────────────────────────────────────────────────────────────────────┐
│ DocumentsLayout                                                              │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ DocumentsSidebar             │ MarkdownViewer                                │
│ Documents [Filename ▾] [↑] [⌖] [✎]│ Created: May 1, 2026 | Updated: May 11, 2026│
│ [🔍] Search documents...      │                              [↻ Syncing]      │
│                              │                                               │
│ ▾ docs                       │ # Current document                            │
│   README.md                  │                                               │
│   ARCHITECTURE.md  ← selected│ Content remains visible during refresh.        │
│ ▾ specs                      │                                               │
│   api.md                     │                                               │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## Mobile Viewport

```wireframe viewport:mobile
┌────────────────────────────────────────────┐
│ DocumentsLayout                            │
├────────────────────────────────────────────┤
│ Documents [Modified ▾] [↓] [⌖] [✎]         │
│ [🔍] Search documents...                    │
│ ▾ docs                                     │
│   ARCHITECTURE.md ← selected               │
├────────────────────────────────────────────┤
│ Created: May 1, 2026                       │
│ Updated: just now                          │
│ [↻ Updated]                                │
├────────────────────────────────────────────┤
│ # Current document                         │
│ Fresh content replaces cached content.     │
└────────────────────────────────────────────┘
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Sidebar background | `--muted` | `bg-muted/30` | Existing Documents View panel style |
| Sidebar divider | `--border` | `border-r border-border` | Existing split-pane divider |
| Metadata bar | `--background`, `--border` | `bg-background/95 border-b border-border` | Existing sticky metadata area |
| Metadata text | `--muted-foreground` | `text-xs text-muted-foreground` | Created and Updated labels |
| Scroll to active document | `--muted-foreground`, `--primary` | `data-testid="scroll-to-active-document-button"` | Target icon in sidebar header; disabled until a file is selected; clears search if needed before scrolling |
| Update indicator | `--primary` | `.document-update-indicator` proposed | Compact inline state; right-aligned on desktop |
| Updated file marker | `--primary` | `data-file-state="updated"` proposed | Small dot in file tree, no toast |
| Deleted state | `--destructive` | `text-destructive` | Viewer-level empty state |
| Syncing state | `--primary` | `.document-update-indicator.loading` proposed | Shown during reconnect refetch |
