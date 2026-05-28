# Documents View Navigation — Wireframe Schema

Related spec: `documents-view-navigation.spec.md`

## Default State

```wireloom
window "Documents View Navigation — Default":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        row id="nav-controls":
          input placeholder="Search documents..." type=search id="nav-search"
          combo value="Update Date ▾" id="nav-sort"
          button "↓" id="nav-direction"
        section "Favs":
          list:
            item "docs                                      ★" id="fav-folder"
            item "Documents View Navigation                 ★" id="fav-document"
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
        tabs id="filename-tabs":
          tab "main"
          tab "overview" active
          tab "details"
        text "# Selected document" bold id="doc-heading"
        text "Markdown content renders here." muted

annotation "Header controls are [search flex] [sort] [direction] on the second row" target="nav-controls" position=right
annotation "Favs render above Recent only when reconciled favs exist" target="fav-folder" position=right
annotation "Active star removes the fav; row opens document or locates folder" target="fav-document" position=right
annotation "Recent section remains below Favs and keeps existing behavior" target="recent-1" position=right
annotation "All Documents: collapsible tree roots" target="docs-root" position=right
annotation "Grouped markdown filename tabs are owned by document-filename-tabs.mockups.md" target="filename-tabs" position=top
```

## No Configured Paths

```wireloom
window "Documents View Navigation — No Configured Paths":
  panel:
    row:
      col 520:
        text "No document paths configured" bold id="empty-title"
        text "Choose which folders or Markdown files should appear in Documents View." muted
        button "Configure document paths" id="empty-configure"
      col fill:
        text "Select document paths to start browsing project docs." muted

annotation "Do not auto-open the tree selector; keep the page calm on first load." target="empty-title" position=right
annotation "CTA opens the same PathSelector modal as the sidebar gear action." target="empty-configure" position=right
```

## Active Filter

```wireloom
window "Documents View Navigation — Filter Active":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        row id="active-filter-row":
          input placeholder="navigation" type=search id="active-filter"
          combo value="Title ▾"
          button "↑"
        section "Favs":
          list:
            item "docs                                      ★" id="fav-filtered"
            item "Documents View Navigation                 ★"
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

annotation "Search narrows the tree only; Favs and Recent stay visible" target="active-filter" position=right
annotation "Sort controls stay to the right of the search field" target="active-filter-row" position=right
annotation "Favs are not removed by tree filtering" target="fav-filtered" position=right
annotation "Selected file highlighted in filtered results" target="filtered-selected" position=right
```

## Read-only Navigation

```wireloom
window "Documents View Navigation — Read-only":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          spacer
          icon name="check"
        row id="readonly-nav-controls":
          input placeholder="Search documents..." type=search
          combo value="Update Date ▾"
          button "↓"
        section "Favs":
          list:
            item "docs" id="readonly-fav-folder"
            item "Documents View Navigation" id="readonly-fav-doc"
        section "Recent":
          list:
            item "Documents View Navigation"
        divider
        text "All Documents" bold
        tree:
          node "docs" collapsed id="readonly-docs-root"
      col fill:
        text "# Selected document" bold
        text "Markdown content renders here." muted

annotation "Configure paths and fav-star mutation controls are absent in read-only mode" target="readonly-nav-controls" position=right
annotation "Existing Favs remain selectable shortcuts, without remove-star buttons" target="readonly-fav-doc" position=right
```

## Filter Hides Selected

```wireloom
window "Documents View Navigation — Selected Hidden by Filter":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          spacer
          icon name="check"
          icon name="star" id="scroll-clear"
          icon name="gear"
        row:
          input placeholder="docker" type=search id="hide-filter"
          combo value="Filename ▾"
          button "↑"
        section "Favs":
          list:
            item "docs                                      ★" id="folder-fav-hidden-filter"
        text "Results" bold
        tree:
          node "docs":
            node "DOCKER_GUIDE.md" id="docker-result"
      col fill:
        text "# Selected document" bold

annotation "Scroll-to-active clears filter, expands ancestors, scrolls to row" target="scroll-clear" position=right
annotation "Selecting a folder fav clears filter if needed, expands ancestors, and locates the folder row" target="folder-fav-hidden-filter" position=right
```

## Restored Collapsed Sections

```wireloom
window "Documents View Navigation — Restored Collapsed Sections":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        row:
          input placeholder="Search documents..." type=search
          combo value="Filename ▾"
          button "↑"
        section "Favs" id="favs-collapsed":
          text "collapsed" muted
        section "Recent" id="recent-collapsed":
          text "collapsed" muted
        divider
        text "All Documents" bold
        tree:
          node "docs" collapsed
          node "server" collapsed
      col fill:
        text "# Selected document" bold
        text "Markdown content renders here." muted

annotation "Favs remembers collapsed/open in browser-local state per project" target="favs-collapsed" position=right
annotation "Recent uses its own browser-local section-state value; it is independent from Favs" target="recent-collapsed" position=right
```

## Fav Show All

```wireloom
window "Documents View Navigation — Fav Show All":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        row:
          input placeholder="Search documents..." type=search
          combo value="Filename ▾"
          button "↑"
        section "Favs                         Show all" id="fav-show-all":
          list:
            item "docs                                      ★"
            item "architecture.md                           ★"
            item "README.md                                 ★"
            item "server                                    ★"
            item "Documents View Navigation                 ★" id="fav-cap-last"
        section "Recent":
          list:
            item "document-favs.md"
        divider
        text "All Documents" bold
        tree:
          node "docs" collapsed
      col fill:
        text "# Selected document" bold
        text "Markdown content renders here." muted

annotation "Initial view shows five fav rows" target="fav-cap-last" position=right
annotation "Show all is a trailing header action; it expands every fav inline" target="fav-show-all" position=right
```

## Fav Show Less

```wireloom
window "Documents View Navigation — Fav Show Less":
  panel:
    row:
      col 520:
        row:
          text "Documents" bold
          spacer
          icon name="check"
          icon name="star"
          icon name="gear"
        row:
          input placeholder="Search documents..." type=search
          combo value="Filename ▾"
          button "↑"
        section "Favs                         Show less" id="fav-show-less":
          list:
            item "docs                                      ★"
            item "architecture.md                           ★"
            item "README.md                                 ★"
            item "server                                    ★"
            item "Documents View Navigation                 ★"
            item "docs/design                               ★"
        section "Recent":
          list:
            item "document-favs.md"
        divider
        text "All Documents" bold
        tree:
          node "docs" collapsed
      col fill:
        text "# Selected document" bold
        text "Markdown content renders here." muted

annotation "Show less stays in the Favs header and returns to the five-row preview" target="fav-show-less" position=right
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
      icon name="check"
      icon name="star"
      icon name="gear"
    row:
      input placeholder="Search documents..." type=search
      combo value="Filename ▾"
      button "↑"
    section "Favs":
      list:
        item "docs                         ★"
        item "Documents View Navigation    ★"
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
| Section labels | `--muted-foreground` | inline compact section controls | Compact labels for Favs, Recent, and tree areas |
| Search/sort row | `--border`, `--background`, `--foreground` | `.documents-view__navigation-controls-row`, `.documents-view__search-field`, `.documents-view__sort-select`, `.documents-view__sort-direction-button` | Search flexes left; sort select and direction stay fixed on the right |
| Fav rows | `--foreground`, `--muted-foreground`, `--star-*` | `.fav-star.fav-star--document.active` | Active star is trailing/right-aligned; document row opens; folder row locates |
| Recent rows | `--foreground`, `--muted-foreground` | tree file row classes | Same title, filename, truncation, and hover behavior as file rows |
| Favs/Recent/tree divider | `--border` | `border-b border-border` | Thin separators; Favs expands inline with Show all; tree scrolls independently below shortcut sections |
| Selected row | `--primary` | `data-tree-state="selected"` proposed | Active physical document highlight; filename tab selection follows the same file path |
| Located folder row | `--primary` | `data-located="true"` | Folder fav target after locate action |
| Section open state | browser localStorage | document navigation preferences | Favs and Recent collapsed/open state persists per project as separate values in the current browser |
| Fav show-all state | browser localStorage | document navigation preferences | Show all/less state persists per project separately from section open state |
| Muted disabled row | `--muted-foreground` | `data-tree-state="disabled"` proposed | Excluded paths |
| Sort direction | `--muted-foreground` | `.documents-view__sort-direction-button` | Reverses the selected sort field |
| Collapse tree | `--muted-foreground` | icon-only button | Collapses folders except selected ancestors |
| Scroll target | `--primary` | `data-testid="scroll-to-active-document-button"` | Clears filter only when selected row is hidden |
| Configure document paths | `--muted-foreground` | gear/settings icon-only button | Opens path configuration |
| No-paths configure CTA | `--foreground`, `--border`, `--background` | outline button | Opens path configuration without auto-opening the modal on first load |
| Read-only document nav | `--muted-foreground` | no star mutation controls | Existing shortcuts remain clickable; configure paths is hidden |
| Excluded ticket area | `--muted-foreground` | PathSelector annotation | `docs/CRs/` is automatically excluded from document browsing |
| Filename tabs | `--border`, `--primary` | `.tab__list`, `.tab` | Full grouped-tab contract lives in `document-filename-tabs.mockups.md` |
