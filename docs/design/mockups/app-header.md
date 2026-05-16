# App Header — Wireframe Schema

Related spec: `specs/app-header.md`

## Desktop (≥640px)

```wireloom
window "App Header — Desktop":
  header:
    row:
      icon name="star" id="logo"
      segmented id="view-mode":
        segment "Board" id="seg-board"
        segment "List" id="seg-list"
        segment "Docs" id="seg-docs"
      combo value="MDT Project ▾" id="project-selector"
      spacer
      combo value="Sort by Key ⇅" id="sort-controls"
      button "≡" id="hamburger-trigger"
```

### Board View Active

```wireloom
window "App Header — Board View Active":
  header:
    row:
      icon name="star"
      segmented:
        segment "Board" selected
        segment "List"
        segment "Docs"
      combo value="MDT Project ▾"
      spacer
      combo value="Key ▾ ⇅"
      button "≡"
```

### Documents View Active

```wireloom
window "App Header — Documents View Active":
  header:
    row:
      icon name="star"
      segmented:
        segment "Board"
        segment "List"
        segment "Docs" selected
      combo value="MDT Project ▾"
      spacer
      button "≡"

annotation "Sort controls hidden when viewMode=documents" target="hamburger-trigger" position=bottom
```

## Mobile (<640px)

```wireloom
window "App Header — Mobile":
  header:
    row:
      icon name="star"
      segmented:
        segment "Board"
        segment "L"
        segment "D"
      combo value="MDT ▾"
      spacer
      button "≡" id="hamburger-mobile"

annotation "Sort controls live inside hamburger menu on mobile" target="hamburger-mobile" position=bottom
```

## Hamburger Menu (opened)

```wireloom
window "App Header — Hamburger Menu":
  panel:
    list:
      item "+ Add Project" id="menu-add-project"
      item "✎ Edit Project" id="menu-edit-project"
    divider
    list:
      item "Sort controls" id="menu-sort"
    divider
    list:
      item "🗑 Clear Cache" id="menu-clear-cache"
      item "👁 Event History" id="menu-event-history"
    divider
    row:
      button "☀"
      button "🌙"
      button "💻"

annotation "Sort controls appear on mobile only" target="menu-sort" position=right
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Nav bar bg | `--background` + opacity | `bg-white/90 dark:bg-gray-900/90` | Translucent with blur |
| Nav border | `--border` | `border-gray-200/50` | Subtle bottom separator |
| Nav shadow | n/a | `shadow-sm` | Fixed on scroll |
| Hamburger trigger | `--foreground` | ghost button | `p-2`, Menu icon 4×4 |
| Menu dropdown | `--popover` | `bg-background border` | `w-48`, absolute positioned |
| Theme button group | `--primary` / `--muted` | `ButtonGroup` | Active: primary bg |
| Sort select | `--background` | `border rounded-md` | Hidden on `< sm` |
