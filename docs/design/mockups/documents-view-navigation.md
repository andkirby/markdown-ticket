# Documents View Navigation — Wireframe Schema

Related spec: `specs/documents-view-navigation.md`

## Default State

```wireloom
window "Documents View Navigation — Default":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          combo value="Name ▾"
          button "↑"
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        input placeholder="Filter documents..." type=search id="nav-search"
        section "Recent":
          list:
            item "Documents View Navigation" id="recent-1"
            item "documents-view-navigation.md" id="recent-2"
        divider
        text "All Documents" bold id="all-docs-label"
        tree:
          node "docs" collapsed id="docs-root"
          node "server" collapsed id="server-root"
      col fill:
        text "# Selected document" bold id="doc-heading"
        text "Markdown content renders here." muted

annotation "Recent section shows recently opened files" target="recent-1" position=right
annotation "All Documents: collapsible tree roots" target="docs-root" position=right
```

## Active Filter

```wireloom
window "Documents View Navigation — Filter Active":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          combo value="Name ▾"
          button "↑"
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        input placeholder="navigation" type=search id="active-filter"
        section "Recent":
          list:
            item "Documents View Navigation" id="recent-filtered"
            item "documents-view-navigation.md" id="recent-filtered-2"
        divider
        text "Results" bold id="results-label"
        tree:
          node "docs/design/specs":
            node "documents-view-navigation.md" selected id="filtered-selected"
      col fill:
        text "# Selected document" bold
        text "Markdown content renders here." muted

annotation "Filter narrows both Recent and tree" target="active-filter" position=right
annotation "Selected file highlighted in filtered results" target="filtered-selected" position=right
```

## Filter Hides Selected

```wireloom
window "Documents View Navigation — Selected Hidden by Filter":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          combo value="Name ▾"
          button "↑"
          spacer
          icon name="check"
          icon name="star" id="scroll-clear"
          icon name="gear"
        input placeholder="docker" type=search id="hide-filter"
        text "Results" bold
        tree:
          node "docs":
            node "DOCKER_GUIDE.md" id="docker-result"
      col fill:
        text "# Selected document" bold

annotation "Scroll-to-active clears filter, expands ancestors, scrolls to row" target="scroll-clear" position=right
```

## Excluded Ticket Area

```wireloom
window "Documents View — Excluded Ticket Area":
  panel:
    text "Configure document paths" bold
    divider
    text "Included roots" bold id="inc-label"
    text "docs" id="inc-docs"
    divider
    text "Excluded automatically" bold id="exc-label"
    text "docs/CRs" id="exc-crs"
    text "ticket area" muted id="exc-note"
    divider
    row justify=end:
      button "Cancel"
      button "Apply" primary

annotation "Ticket directory automatically excluded from document browsing" target="exc-crs" position=right
```

## Mobile Viewport

```wireloom
window "Documents View Navigation — Mobile":
  panel:
    text "Documents" bold
    row:
      combo value="Name ▾"
      button "↑"
      spacer
      icon name="check"
      icon name="star"
      icon name="gear"
    input placeholder="Filter documents..." type=search
    section "Recent":
      list:
        item "Documents View Navigation"
        item "documents-view-navigation.md"
    divider
    text "All Documents" bold
    tree:
      node "docs" collapsed
      node "server" collapsed
    divider
    text "# Selected document" bold
    text "Markdown content renders here." muted
```

Mobile behavior:

- Navigation and preview are separate modes, not a long permanently stacked page.
- Selecting a document moves to preview; a back control returns to the document list.
- Search, recent files, and tree controls remain in the navigation mode.

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
| Sort direction | `--muted-foreground` | icon-only button | Reverses the selected sort field |
| Collapse tree | `--muted-foreground` | icon-only button | Collapses folders except selected ancestors |
| Scroll target | `--primary` | `data-testid="scroll-to-active-document-button"` | Clears filter only when selected row is hidden |
| Configure document paths | `--muted-foreground` | icon-only button | Opens path configuration |
| Excluded ticket area | `--muted-foreground` | PathSelector annotation | `docs/CRs/` is automatically excluded from document browsing |
