# Documents View File Updates — Wireframe Schema

Related spec: `documents-view-file-updates.spec.md`

Shared navigation shell: `documents-view-navigation.md`.

Use that mockup for the full sidebar/header/tree contract. This file only repeats sidebar detail when the update state changes the tree itself.

## Default State

```wireloom
window "Documents View — Default":
  panel:
    row:
      col 360:
        text "Documents navigation" bold id="nav-context"
        text "See documents-view-navigation.md" muted
      col fill:
        text "Document preview" bold
        row:
          text "Created: May 1, 2026" muted size=small id="meta-created"
          text "Updated: May 11, 2026" muted size=small id="meta-updated"
        text "# Current document" bold id="doc-heading"
        text "Markdown content renders here." muted

annotation "Sidebar composition is owned by documents-view-navigation.md" target="nav-context" position=bottom
annotation "Metadata bar with created/updated dates" target="meta-created" position=top
```

## Selected File Updated

```wireloom
window "Documents View — Selected File Updated":
  panel:
    row:
      col 360:
        text "Documents navigation" bold
        text "Selected file remains highlighted" muted id="selected-nav-note"
      col fill:
        text "Document preview" bold
        row:
          text "Created: May 1, 2026" muted size=small
          text "Updated: just now" muted size=small
          spacer
          text "Updated" accent=success size=small id="update-indicator"
        text "# Current document" bold
        text "Fresh content replaces cached content." muted

annotation "Optional updated marker may appear on selected tree row" target="selected-nav-note" position=bottom
annotation "Inline update indicator" target="update-indicator" position=right
```

## Non-Selected File Updated

```wireloom
window "Documents View — Other File Updated":
  panel:
    row:
      col 520:
        text "Documents navigation" bold
        row:
          text "Documents"
          combo value="Modified ▾" id="combo-modified"
          button "↑"
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        input placeholder="Search documents..." type=search
        tree:
          node "docs":
            node "README.md" id="readme-updated"
            node "ARCHITECTURE.md" selected
          node "specs" collapsed:
            node "api.md"
      col fill:
        text "Document preview" bold
        row:
          text "Created: May 1, 2026" muted size=small
          text "Updated: May 11, 2026" muted size=small
        text "# Current document" bold
        text "Markdown content renders here." muted

annotation "Updated dot on non-selected file" target="readme-updated" position=right
annotation "Combo updates to show modified file name" target="combo-modified" position=right
annotation "Non-selected file updates do not change the selected preview" target="readme-updated" position=bottom
```

## Selected File Deleted

```wireloom
window "Documents View — File Deleted":
  panel:
    row:
      col 520:
        text "Documents navigation" bold
        row:
          text "Documents"
          combo value="Filename ▾"
          button "↑"
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        input placeholder="Search documents..." type=search
        tree:
          node "docs":
            node "README.md"
          node "specs" collapsed:
            node "api.md"
      col fill:
        text "Document preview" bold
        text "File was deleted" accent=danger id="deleted-msg"
        text "Choose another document from the tree." muted
        button "Select another file" id="select-another"

annotation "Empty state when selected file is deleted" target="deleted-msg" position=top
```

## SSE Reconnected

```wireloom
window "Documents View — Syncing":
  panel:
    row:
      col 360:
        text "Documents navigation" bold
        text "Tree refreshes after reconnect" muted id="reconnect-nav-note"
      col fill:
        text "Document preview" bold
        row:
          text "Created: May 1, 2026" muted size=small
          text "Updated: May 11, 2026" muted size=small
          spacer
          text "Syncing..." accent=success size=small id="sync-indicator"
        text "# Current document" bold
        text "Content remains visible during refresh." muted

annotation "Navigation refreshes without changing selection" target="reconnect-nav-note" position=bottom
annotation "Syncing indicator during reconnect refetch" target="sync-indicator" position=right
```

## Mobile Viewport

```wireloom
window "Documents View — Mobile":
  panel:
    row:
      text "Created: May 1, 2026" muted size=small
      text "Updated: just now" muted size=small
    text "Updated" accent=success size=small
    divider
    text "# Current document" bold
    text "Fresh content replaces cached content." muted
```

Mobile update states apply to the preview mode. Navigation mode remains owned by `documents-view-navigation.md`.

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Navigation context | `--muted-foreground` | compact placeholder | Full sidebar contract lives in `documents-view-navigation.md` |
| Metadata bar | `--background`, `--border` | `bg-background/95 border-b border-border` | Existing sticky metadata area |
| Metadata text | `--muted-foreground` | `text-xs text-muted-foreground` | Created and Updated labels |
| Update indicator | `--primary` | `text-primary` | Plain inline metadata-row text, not a badge |
| Updated file marker | `--primary` | `data-file-state="updated"` proposed | Small dot in file tree, no toast |
| Deleted state | `--destructive` | `text-destructive` | Viewer-level empty state |
| Syncing state | `--primary` | `text-primary` | Plain inline metadata-row text shown during reconnect refetch |
