# App Header — Wireframe Schema

Related spec: `app-header.spec.md`

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
      status "Owner session" kind=success id="owner-session-chip"
      button "Lock" id="owner-lock"
      combo value="Sort by Key ⇅" id="sort-controls"
      button "≡" id="hamburger-trigger"
```

## Desktop Read-only

```wireloom
window "App Header — Read-only":
  header:
    row:
      icon name="star"
      segmented:
        segment "Board" selected
        segment "List"
        segment "Docs"
      combo value="Public Project ▾"
      spacer
      status "Read only" kind=info id="readonly-badge"
      button "Unlock" id="readonly-unlock"
      combo value="Key ▾ ⇅"
      button "≡"

annotation "Badge appears before sort controls when access mode cannot write" target="readonly-badge" position=bottom
annotation "Unlock opens the auth token panel for owner-token upgrade" target="readonly-unlock" position=bottom
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
      item "Edit Project" id="menu-edit-project"
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

## Hamburger Menu (read-only)

```wireloom
window "App Header — Read-only Menu":
  panel:
    list:
      item "Sort controls" id="readonly-menu-sort"
    divider
    list:
      item "Clear Cache"
    divider
    row:
      button "Light"
      button "Dark"
      button "System"

annotation "Add/Edit Project and Settings are absent without owner/admin access" target="readonly-menu-sort" position=right
```

## Unlock Panel Entry

```wireloom
window "Auth Token Entry":
  sheet position=center title="Board is locked":
    text "This server accepts an owner token for management or a read token for scoped read-only access."
    input placeholder="Access token" type=password id="access-token-input"
    text "Tokens are exchanged for a secure server session and are not stored in browser storage." muted
    row justify=end:
      button "Cancel"
      button "Unlock" primary id="apply-access-token"

annotation "Token submission uses backend exchange; invalid errors stay generic" target="apply-access-token" position=right
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Nav bar bg | `--background` + opacity | `bg-white/90 dark:bg-gray-900/90` | Translucent with blur |
| Nav border | `--border` | `border-gray-200/50` | Subtle bottom separator |
| Nav shadow | n/a | `shadow-sm` | Fixed on scroll |
| Hamburger trigger | `--foreground` | ghost button | `p-2`, Menu icon 4×4 |
| Menu dropdown | `--popover` | `bg-background border` | `w-48`, absolute positioned |
| Read-only badge | `--muted` | `chip` / small badge | Shown only when write access is unavailable |
| Theme button group | `--primary` / `--muted` | `ButtonGroup` | Active: primary bg |
| Sort select | `--background` | `border rounded-md` | Hidden on `< sm` |
