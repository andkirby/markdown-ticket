# Project Browser — Wireframe Schema

Related spec: `specs/project-browser.md` (MDT-129 panel, MDT-152 search extension)

---

## Part 1: ProjectBrowserPanel (Full Overlay)

### Default State (Panel Open)

```wireloom
window "Project Browser — Default":
  panel:
    row:
      input placeholder="Search projects..." type=search id="pb-search"
      button "×" id="pb-close"
    divider
    grid cols=2 rows=2:
      cell id="card-mdt":
        row:
          icon name="star" id="mdt-star"
          text "MDT" bold
        text "Markdown Ticket"
        text "Lightweight ticket mgmt" muted
      cell id="card-abc":
        text "ABC" bold
        text "Another Project"
        text "Example desc here" muted
      cell id="card-xyz":
        text "XYZ" bold
        text "Third Project"
        text "Another example" muted
      cell id="card-api":
        text "API" bold
        text "API Gateway"
        text "Backend service" muted

annotation "Active project has blue gradient bg and star" target="card-mdt" position=top
annotation "Inactive projects use white/gray gradient" target="card-abc" position=right
```

### Search State (User Types "MD")

Current project (MDT) is excluded when the query matches its code or name:

```wireloom
window "Project Browser — Search":
  panel:
    row:
      input placeholder="MD" type=search id="pb-search-active"
      button "×"
    divider
    grid cols=2 rows=1:
      cell id="card-amd":
        text "AMD" bold
        text "A Markdown Project"
      cell:
        text "(no other matches)" muted id="no-match"
    text "Note: MDT excluded — it's current project" muted id="excluded-note"

annotation "Current project excluded from search results" target="excluded-note" position=bottom
```

### Search Empty State (No Matches)

```wireloom
window "Project Browser — No Matches":
  panel:
    row:
      input placeholder="ZZZ" type=search id="pb-search-empty"
      button "×"
    divider
    text "No projects match your search" muted id="empty-search"
```

### Card Detail: Active Project

```wireloom
window "Project Card — Active":
  panel:
    row:
      icon name="star" id="active-star"
      text "MDT" bold id="active-code"
    text "Markdown Ticket" id="active-name"
    text "Lightweight ticket management" muted id="active-desc"

annotation "Blue gradient bg, blue border, shadow-md, rounded-xl" target="active-code" position=top
annotation "Fav-star active, rotate-[15deg]" target="active-star" position=right
```

### Card Detail: Inactive Project (No Favorite)

```wireloom
window "Project Card — Inactive":
  panel:
    text "ABC" bold id="inactive-code"
    text "Another Project" id="inactive-name"
    text "Example description here" muted id="inactive-desc"

annotation "White/gray gradient bg, no star, shadow-sm" target="inactive-code" position=top
```

### Card Detail: Inactive Project (Favorited)

```wireloom
window "Project Card — Inactive Favorited":
  panel:
    row:
      text "XYZ" bold id="fav-code"
      spacer
      icon name="star" id="fav-star"
    text "Third Project" id="fav-name"
    text "Another example project" muted id="fav-desc"

annotation "Star: absolute top-1 right-1, opacity-60 group-hover:opacity-100" target="fav-star" position=right
```

### Card Hover State

```wireloom
window "Project Card — Hover":
  panel:
    text "ABC" bold id="hover-code"
    text "Another Project" id="hover-name"
    text "Example description here" muted id="hover-desc"

annotation "shadow-lg, -translate-y-0.5, scale-[1.02]" target="hover-code" position=top
annotation "transition-all duration-200 ease-out" target="hover-name" position=right
```

### Empty State (No Projects)

```wireloom
window "Project Browser — Empty":
  panel:
    row:
      input placeholder="Search projects..." type=search
      button "×"
    divider
    text "No projects available" muted id="empty-projects"
```

### Mobile Viewport

```wireloom
window "Project Browser — Mobile":
  panel:
    row:
      input placeholder="Search projects..." type=search id="pb-search-mobile"
      button "×"
    divider
    list:
      slot "MDT":
        row:
          icon name="star"
          text "Markdown Ticket" bold
        text "Lightweight mgmt" muted
      slot "ABC":
        text "Another Project"
      slot "XYZ":
        text "Third Project"

annotation "Single column on mobile" target="pb-search-mobile" position=bottom
```

---

## Part 2: ProjectSelectorRail

### Desktop (Active + Inactive Chips + Launcher)

```wireloom
window "Project Selector Rail — Desktop":
  panel:
    row:
      panel id="active-card":
        row:
          icon name="star"
          text "MDT" bold
        text "Markdown Ticket"
        text "ticket mgmt" muted
      chip "ABC" id="chip-abc"
      chip "XYZ" id="chip-xyz"
      chip "API" id="chip-api"
      button "⊕" id="launcher-btn"

annotation "Active card: click opens panel (NOT switch)" target="active-card" position=top
annotation "Inactive chips: click switches project" target="chip-abc" position=bottom
annotation "Launcher button: opens project browser panel" target="launcher-btn" position=right
```

### Active Card Detail

```wireloom
window "Rail Active Card Detail":
  panel:
    row:
      icon name="star" id="rail-star"
      text "MDT" bold id="rail-active-code"
    text "Markdown Ticket" size=small id="rail-active-name"
    text "Lightweight ticket management" muted size=small id="rail-active-desc"

annotation "min-w-[100px] sm:min-w-[150px] max-w-[280px]" target="rail-active-code" position=right
annotation "click → onLauncherClick() (opens panel, NOT switch)" target="rail-active-code" position=bottom
```

### Inactive Chip Detail

```wireloom
window "Rail Chip — Default":
  panel:
    text "ABC" bold id="chip-default"

annotation "rounded-md px-2 py-1.5 h-12" target="chip-default" position=right
```

```wireloom
window "Rail Chip — Favorited":
  panel:
    row:
      text "XYZ" bold id="chip-fav"
      icon name="star" id="chip-fav-star"

annotation "Fav-star rotated chip variant" target="chip-fav-star" position=right
```

### Inactive Chip Hover (HoverCard)

```wireloom
window "Rail Chip — Hover":
  panel:
    text "ABC" bold id="chip-hover-abc"
    divider
    row:
      text "ABC" bold
      text "Another Project"
    text "Example description here" muted id="hovercard-content"

annotation "HoverCard w-80, 100ms delay" target="hovercard-content" position=right
```

### Launcher Button

```wireloom
window "Launcher Button — Default":
  panel:
    button "⊕" id="launcher-default"

annotation "rounded-full w-10 h-10, gradient bg, shadow-sm" target="launcher-default" position=right
```

```wireloom
window "Launcher Button — Active (Panel Open)":
  panel:
    button "⊕" id="launcher-active"

annotation "ring-2 ring-blue-400 when panel open" target="launcher-active" position=right
```

### Mobile Rail (Active Only + Launcher)

```wireloom
window "Project Selector Rail — Mobile":
  panel:
    row:
      panel id="mobile-active-card":
        row:
          icon name="star"
          text "MDT" bold
        text "Markdown Ticket"
        text "ticket mgmt" muted
      spacer
      button "⊕"

annotation "Only active card shown on mobile; chips hidden" target="mobile-active-card" position=bottom
```

---

## Part 3: Panel Open from Rail

### Click Active Card → Panel Opens Below

```wireloom
window "Rail — Panel Opens":
  panel:
    row:
      panel:
        row:
          icon name="star"
          text "MDT" bold
        text "Markdown Ticket"
        text "ticket mgmt" muted
      chip "ABC"
      chip "XYZ"
      chip "API"
      button "⊕"
    divider
    panel:
      row:
        input placeholder="Search projects..." type=search id="rail-panel-search"
        button "×"
      divider
      grid cols=2 rows=2:
        cell:
          row:
            icon name="star"
            text "MDT" bold
          text "Markdown Ticket"
        cell:
          text "ABC" bold
          text "Another Project"
        cell:
          text "XYZ" bold
          text "Third Project"
        cell:
          text "API" bold
          text "API Gateway"

annotation "Panel is full-screen overlay (not anchored to rail)" target="rail-panel-search" position=right
annotation "Appears centered with pt-20 offset" target="rail-panel-search" position=top
```

---

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Backdrop | — | `bg-black/50 backdrop-blur-sm` | Per MODALS.md |
| Panel bg | `--card` | `bg-white dark:bg-slate-900 rounded-2xl` | max-w-4xl |
| Panel border | `--border` | `border-gray-200 dark:border-slate-700` | |
| Header border | `--border` | `border-b border-gray-200 dark:border-slate-700` | |
| Search input bg | `--muted` | `bg-gray-100 dark:bg-slate-800 rounded-lg` | flex-1, replaces title |
| Search input text | `--foreground` | `text-sm` | |
| Search icon | `--muted-foreground` | `text-gray-400 h-4 w-4` | absolute left-9 |
| Close button | — | `p-2 rounded-lg hover:bg-gray-100` | X icon, right of input |
| Search empty state | `--muted-foreground` | `text-center py-12 text-gray-500` | |
| Card active bg | `--primary` (blue) | `from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950` | |
| Card active border | `--primary` (blue) | `border-blue-200 dark:border-blue-800` | |
| Card inactive bg | `--card` | `from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80` | |
| Card inactive border | `--border` | `border-gray-200/50 dark:border-slate-700/50` | |
| Card shared | — | `border rounded-xl px-2 sm:px-4 py-1.5 min-h-12` | |
| Card hover | — | `hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]` | transition-all 200ms |
| Fav star (card) | `--star-*` | `.fav-star.fav-star--card` | absolute top-1 right-1 |
| Fav star (chip) | `--star-*` | `.fav-star.fav-star--chip` | rotated overlay |
| Chip bg | `--card` | `from-white to-gray-50/80 dark:from-slate-800` | |
| Chip border | `--border` | `border-gray-200/50` | |
| Chip hover | `--accent` | `hover:bg-accent hover:border-blue-300` | |
| Chip shape | — | `rounded-md px-2 py-1.5 h-12` | |
| Launcher bg | — | `from-gray-100 to-gray-200/80 dark:from-slate-700` | |
| Launcher hover | `--primary` (blue) | `hover:from-blue-50 hover:to-indigo-50` | |
| Launcher shape | — | `rounded-full w-10 h-10` | |
| Launcher ring | `--primary` (blue) | `ring-2 ring-blue-400 dark:ring-blue-600` | When panel open |
| Grid | — | `grid grid-cols-1 md:grid-cols-2 gap-4` | |
| List scroll | — | `max-h-[60vh] overflow-y-auto p-6` | |
| Empty state | `--muted-foreground` | `text-center py-12 text-gray-500` | |
| HoverCard | — | shadcn `HoverCard` / `HoverCardContent` | w-80, 100ms delay |
| Search section label | `--muted-foreground` | `text-xs uppercase tracking-wide` | "No projects match your search" |

## Maintenance Notes

- Keep this file focused on canonical surface states: panel default/search/empty/mobile, rail desktop/mobile, and launcher open.
- Avoid adding more single-control snapshots unless they introduce a new interaction contract; prefer a short row in `specs/project-browser.md` state tables.
