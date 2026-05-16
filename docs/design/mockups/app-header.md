# App Header — Wireframe Schema

Related spec: `specs/app-header.md`

## Desktop (≥640px)

```wireframe
┌─────────────────────────────────────────────────────────────┐
│ nav.main-nav (h-16, sticky, backdrop-blur, border-b)       │
│ ┌─────────────────────────────────────────────┬───────────┐ │
│ │ nav-left                  flex-1            │ nav-right │ │
│ │                                             │           │ │
│ │ [Logo] [Board|List|Docs] [ProjectSelector ▾]│ [Sort ▾ ⇅][≡]│
│ │                                             │           │ │
│ └─────────────────────────────────────────────┴───────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Board View Active

```wireframe 
state:app-header board-view
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [●Board○ List○ Docs] [MDT Project ▾]   [Key ▾ ⇅][≡]│
└─────────────────────────────────────────────────────────────┘
```

### Documents View Active

```wireframe state:app-header documents-view
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [○Board○ List● Docs] [MDT Project ▾]              [≡]│
└─────────────────────────────────────────────────────────────┘
```

Note: SortControls hidden when viewMode=documents.

## Mobile (<640px)

```wireframe viewport:mobile
┌──────────────────────────────────┐
│ [Logo] [Board|L|D] [MDT▾]     [≡]│
└──────────────────────────────────┘
```

Note: SortControls hidden on mobile — sort lives inside hamburger menu.

## Hamburger Menu (opened)

```wireframe state:hamburger-menu open
                                        ┌──────────────────┐
                                        │ + Add Project    │
                                        │ ✎ Edit Project   │
                                        ├──────────────────┤
                                        │ (sort controls,  │
                                        │  mobile only)    │
                                        ├──────────────────┤
                                        │ 🗑 Clear Cache   │
                                        │ 👁 Event History │
                                        ├──────────────────┤
                                        │ [☀] [🌙] [💻]   │
                                        └──────────────────┘
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
