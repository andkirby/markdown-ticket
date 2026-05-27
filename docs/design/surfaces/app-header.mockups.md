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
      combo value="Sort by Key ⇅" id="sort-controls"
      row id="hamburger-trigger":
        button "≡"
        status "●" kind=success id="owner-dot"

annotation "Green dot marks owner/admin access; Lock remains inside the hamburger menu." target="owner-dot" position=bottom
```

## Desktop Public Read-only

```wireloom
window "App Header — Public Read-only":
  header:
    row:
      icon name="star"
      segmented:
        segment "Board" selected
        segment "List"
        segment "Docs"
      combo value="Public Project ▾"
      spacer
      combo value="Key ▾ ⇅"
      button "≡" id="readonly-menu-trigger"

annotation "Public-only read access has no header dot; the Read only label is inside the hamburger menu." target="readonly-menu-trigger" position=bottom
```

## Desktop Shared Read-only

```wireloom
window "App Header — Shared Read-only":
  header:
    row:
      icon name="star"
      segmented:
        segment "Board" selected
        segment "List"
        segment "Docs"
      combo value="Private Project ▾"
      spacer
      combo value="Key ▾ ⇅"
      row id="shared-menu-trigger":
        button "≡"
        status "●" kind=warning id="shared-dot"

annotation "Orange dot marks read-token or share-link access beyond public projects." target="shared-dot" position=bottom
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
      button "≡" id="documents-menu-trigger"

annotation "Sort controls hidden when viewMode=documents" target="documents-menu-trigger" position=bottom
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
      item "Lock" id="menu-owner-lock"
    divider
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

annotation "Lock clears the owner session cookie and is shown only for owner/admin access." target="menu-owner-lock" position=right
annotation "Sort controls appear on mobile only" target="menu-sort" position=right
```

## Hamburger Menu (read-only)

```wireloom
window "App Header — Read-only Menu":
  panel:
    list:
      item "Read only" id="readonly-status-row"
      item "Unlock access" id="readonly-unlock-access"
      item "Sort controls" id="readonly-menu-sort"
    divider
    list:
      item "Clear Cache"
    divider
    row:
      button "Light"
      button "Dark"
      button "System"

annotation "Read-only status moved from the header into the menu." target="readonly-status-row" position=right
annotation "Unlock access opens the owner-token overlay while preserving the read-only board." target="readonly-unlock-access" position=right
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
| Owner access dot | green utility | absolute status dot | Top-right of hamburger trigger |
| Shared access dot | orange utility | absolute status dot | Top-right of hamburger trigger; absent for public-only read-only |
| Menu dropdown | `--popover` | `bg-background border` | `w-48`, absolute positioned |
| Read-only status row | `--muted-foreground` | menu status row | Inside hamburger menu only |
| Unlock access item | `--foreground` | menu item with `KeyRound` icon | Read-only sessions only |
| Lock item | `--foreground` | menu item with `LockKeyhole` icon | Owner/admin sessions only |
| Theme button group | `--primary` / `--muted` | `ButtonGroup` | Active: primary bg |
| Sort select | `--background` | `border rounded-md` | Hidden on `< sm` |
