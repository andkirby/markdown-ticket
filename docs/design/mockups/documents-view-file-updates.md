# Documents View File Updates — Wireframe Schema

Related spec: `specs/documents-view-file-updates.md`

## Default State

```wireloom
window "Documents View — Default":
  panel:
    row:
      col 250:
        row:
          text "Documents" bold id="sidebar-title"
          combo value="Filename ▾" id="filename-combo"
          icon name="plus" id="icon-up"
          icon name="check" id="icon-scroll"
          icon name="gear" id="icon-edit"
        input placeholder="Search documents..." type=search id="doc-search"
        tree id="file-tree":
          node "docs" id="docs-folder":
            node "README.md" id="readme"
            node "ARCHITECTURE.md" selected id="arch-selected"
          node "specs" collapsed id="specs-folder":
            node "api.md" id="api-md"
      col fill:
        row:
          text "Created: May 1, 2026" muted size=small id="meta-created"
          text "Updated: May 11, 2026" muted size=small id="meta-updated"
        text "# Current document" bold id="doc-heading"
        text "Markdown content renders here." muted

annotation "File tree with selected item" target="arch-selected" position=right
annotation "Metadata bar with created/updated dates" target="meta-created" position=top
```

## Selected File Updated

```wireloom
window "Documents View — Selected File Updated":
  panel:
    row:
      col 250:
        row:
          text "Documents" bold
          combo value="Filename ▾"
          icon name="plus"
          icon name="check"
          icon name="gear"
        input placeholder="Search documents..." type=search
        tree:
          node "docs":
            node "README.md"
            node "ARCHITECTURE.md" selected id="arch-updated"
          node "specs" collapsed:
            node "api.md"
      col fill:
        row:
          text "Created: May 1, 2026" muted size=small
          text "Updated: just now" muted size=small
          spacer
          status "Updated" kind=info id="update-indicator"
        text "# Current document" bold
        text "Fresh content replaces cached content." muted

annotation "Updated dot marker on file" target="arch-updated" position=right
annotation "Inline update indicator" target="update-indicator" position=right
```

## Non-Selected File Updated

```wireloom
window "Documents View — Other File Updated":
  panel:
    row:
      col 250:
        row:
          text "Documents" bold
          combo value="Modified ▾" id="combo-modified"
          icon name="plus"
          icon name="check"
          icon name="gear"
        input placeholder="Search documents..." type=search
        tree:
          node "docs":
            node "README.md" id="readme-updated"
            node "ARCHITECTURE.md" selected
          node "specs" collapsed:
            node "api.md"
      col fill:
        row:
          text "Created: May 1, 2026" muted size=small
          text "Updated: May 11, 2026" muted size=small
        text "# Current document" bold
        text "Reader stays on the selected file." muted

annotation "Updated dot on non-selected file" target="readme-updated" position=right
annotation "Combo updates to show modified file name" target="combo-modified" position=right
```

## Selected File Deleted

```wireloom
window "Documents View — File Deleted":
  panel:
    row:
      col 250:
        row:
          text "Documents" bold
          combo value="Filename ▾"
          icon name="plus"
          icon name="check"
          icon name="gear"
        input placeholder="Search documents..." type=search
        tree:
          node "docs":
            node "README.md"
          node "specs" collapsed:
            node "api.md"
      col fill:
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
      col 250:
        row:
          text "Documents" bold
          combo value="Filename ▾"
          icon name="plus"
          icon name="check"
          icon name="gear"
        input placeholder="Search documents..." type=search
        tree:
          node "docs":
            node "README.md"
            node "ARCHITECTURE.md" selected
          node "specs" collapsed:
            node "api.md"
      col fill:
        row:
          text "Created: May 1, 2026" muted size=small
          text "Updated: May 11, 2026" muted size=small
          spacer
          status "Syncing" kind=info id="sync-indicator"
        text "# Current document" bold
        text "Content remains visible during refresh." muted

annotation "Syncing indicator during reconnect refetch" target="sync-indicator" position=right
```

## Mobile Viewport

```wireloom
window "Documents View — Mobile":
  panel:
    row:
      text "Documents" bold
      combo value="Modified ▾"
      icon name="plus"
      icon name="check"
      icon name="gear"
    input placeholder="Search documents..." type=search
    tree:
      node "docs":
        node "ARCHITECTURE.md" selected
    divider
    row:
      text "Created: May 1, 2026" muted size=small
      text "Updated: just now" muted size=small
    status "Updated" kind=info
    divider
    text "# Current document" bold
    text "Fresh content replaces cached content." muted
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
