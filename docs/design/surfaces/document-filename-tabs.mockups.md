# Document Filename Tabs — Wireframe Schema

Related spec: `document-filename-tabs.spec.md`

Shared navigation shell: `documents-view-navigation.mockups.md`.

## Grouped With Root

```wireloom
window "Documents View — Filename Tabs":
  panel:
    row:
      col 360:
        text "Documents navigation" bold id="nav-context"
        tree:
          node "docs":
            node "some-name.md"
            node "some-name.one.md"
            node "some-name.two.md" selected id="tree-active"
      col fill:
        tabs id="filename-tabs":
          tab "main"
          tab "one"
          tab "two" active id="active-tab"
        text "# Two Variant" bold
        text "Two marker" muted

annotation "Tree keeps physical files visible" target="tree-active" position=left
annotation "Filename tabs sit above the preview" target="filename-tabs" position=top
annotation "Active tab matches the selected physical file" target="active-tab" position=right
```

## Multi-Dot Variant

```wireloom
window "Documents View — Multi-Dot Variant":
  panel:
    row:
      col 360:
        text "Documents navigation" bold
        tree:
          node "docs":
            node "some-name.alpha.beta.md" selected id="multi-tree-active"
            node "some-name.one.md"
            node "some-name.two.md"
      col fill:
        tabs id="multi-tabs":
          tab "alpha.beta" active id="multi-active"
          tab "one"
          tab "two"
        text "# Alpha Beta Variant" bold
        text "Alpha beta marker" muted

annotation "Later dot segments stay in the tab label" target="multi-active" position=right
```

## Lone Variant

```wireloom
window "Documents View — Lone Filename Variant":
  panel:
    row:
      col 360:
        text "Documents navigation" bold
        tree:
          node "docs":
            node "some-name-extra.one.md" selected id="lone-tree-active"
      col fill:
        tabs id="lone-tabs":
          tab "one" active id="lone-active"
        text "# Different Base" bold
        text "Different base marker" muted

annotation "A single dot-notation variant still renders filename tabs" target="lone-tabs" position=top
```

## Standalone Markdown

```wireloom
window "Documents View — Standalone Markdown":
  panel:
    row:
      col 360:
        text "Documents navigation" bold
        tree:
          node "docs":
            node "standalone.md" selected id="standalone-tree-active"
      col fill:
        text "# Standalone" bold id="standalone-heading"
        text "Standalone marker" muted

annotation "No filename tabs render for ungrouped markdown" target="standalone-heading" position=top
```

## Mobile Preview

```wireloom
window "Documents View — Filename Tabs Mobile":
  panel:
    tabs id="mobile-tabs":
      tab "main"
      tab "alpha.beta"
      tab "one" active
      tab "two"
    divider
    text "# One Variant" bold
    text "One marker" muted
```

Mobile behavior:

- Filename tabs remain in the preview mode, not the navigation mode.
- The tab row scrolls horizontally when labels exceed the viewport.
- Selecting a filename tab keeps the user in preview mode and updates the selected physical file.

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Filename tab list | `--border` | `.tab__list overflow-x-auto scrollbar-hide` | Same Radix tab list pattern as ticket subdocument tabs |
| Filename tab | `--muted-foreground`, `--foreground`, `--primary` | `.tab` | Active tab uses existing `data-state='active'` underline |
| Filename tabs wrapper | `--background` | `.documents-view__filename-tabs` | Fixed above the scrolling preview content |
| Physical tree row | `--primary` | existing selected tree row treatment | Tree selection follows active physical file |
| Viewer content | `--background` | `.documents-view__viewer-content` | Markdown preview receives active file path |
