# Project Browser — Wireframe Schema

Related spec: `project-browser.spec.md` (MDT-129 panel, MDT-152 search extension)

---

## Part 1: ProjectBrowserPanel (Full Overlay)

### Default State (Panel Open)

```wireloom
window "Project Browser — Default":
  panel:
    row:
      text "Projects" bold id="pb-title"
      input placeholder="Search projects..." type=search id="pb-search"
      button "×" id="pb-close"
    divider
    grid cols=2 rows=2:
      cell id="card-mdt":
        row:
          avatar "MDT" id="mdt-accent"
          icon name="star" id="mdt-star"
          text "Markdown Ticket" bold
        text "Local CR board and docs" muted
      cell id="card-abc":
        row:
          avatar "ABC" id="abc-accent"
          text "Another Project" bold
        text "Example desc here" muted
      cell id="card-xyz":
        row:
          avatar "XYZ"
          text "Third Project" bold
        text "Another example" muted
      cell id="card-api":
        row:
          avatar "API"
          text "API Gateway" bold
        text "Backend service" muted

annotation "Accent mark uses current user's selected project accent or deterministic fallback" target="mdt-accent" position=top
annotation "Favorite star remains separate; accents are identity marks, not status badges" target="mdt-star" position=right
```

### Filled Accent Treatment

Same card size as the standard browser card; only the left identity area is filled by color or a user-owned image.

```wireloom
window "Project Browser — Filled Accent Treatment":
  panel:
    row:
      text "Projects" bold
      input placeholder="Search projects..." type=search
      button "×"
    divider
    grid cols=2 rows=1:
      cell id="filled-color-card":
        row:
          avatar "MDT" id="filled-color"
          text "Markdown Ticket" bold
          spacer
          icon name="star"
        text "Local CR board and project documents" muted
      cell id="filled-image-card":
        row:
          avatar "img" id="filled-image"
          text "Summary Link" bold
        text "Article summarization and review" muted

annotation "Same row height; left identity area is the filled color/image region." target="filled-color" position=top
annotation "Personal image support must be explicit user selection, not auto-discovery from project folder." target="filled-image" position=right
```

### Accent Fallback State

```wireloom
window "Project Browser — Accent Fallback":
  panel:
    row:
      text "Projects" bold
      input placeholder="Search projects..." type=search
      button "×"
    divider
    grid cols=2 rows=1:
      cell id="fallback-card":
        row:
          avatar "DOCS" id="fallback-accent"
          text "Documentation" bold
        text "No user-selected accent yet" muted

annotation "Fallback accent is deterministic from project code/id and does not require migration." target="fallback-accent" position=right
```

### Read-only Project List

```wireloom
window "Project Browser — Read-only":
  panel:
    row:
      text "Projects" bold
      input placeholder="Search projects..." type=search
      button "×"
    divider
    grid cols=2 rows=1:
      cell id="readonly-card-mdt":
        row:
          avatar "MDT" id="readonly-accent"
          text "Markdown Ticket" bold
        text "Markdown Ticket"
        text "Lightweight ticket mgmt" muted

annotation "Favorite toggle is absent because it writes selector state" target="readonly-card-mdt" position=right
annotation "Accent is personal visual preference; it does not grant write access to project config" target="readonly-accent" position=bottom
```

### Token-scoped Project List

```wireloom
window "Project Browser — Token Scoped":
  panel:
    row:
      text "Projects" bold
      input placeholder="Search projects..." type=search
      button "×"
    divider
    grid cols=2 rows=2:
      cell id="token-card-pri":
        text "PRI" bold
        text "Private roadmap"
        text "Read-only via Bob token" muted
      cell id="token-card-docs":
        text "DOCS" bold
        text "Documentation"
        text "Read-only via Bob token" muted
      cell id="token-card-pub":
        text "PUB" bold
        text "Public project"
        text "Read-only for everyone" muted

annotation "Named read tokens can grant several projects; each card remains directly selectable." target="token-card-pri" position=right
annotation "Public projects appear alongside token-scoped projects." target="token-card-pub" position=bottom
```

### Share Link Merged With Token Scope

```wireloom
window "Project Browser — Token Plus Share Link":
  panel:
    row:
      text "Projects" bold
      input placeholder="Search projects..." type=search
      button "×"
    divider
    grid cols=2 rows=2:
      cell id="merge-card-pri":
        text "PRI" bold
        text "Private roadmap"
      cell id="merge-card-docs":
        text "DOCS" bold
        text "Documentation"
      cell id="merge-card-ops":
        text "OPS" bold id="share-merge-project"
        text "Operations notes"

annotation "Opening a one-project share link adds OPS without removing PRI or DOCS." target="share-merge-project" position=right
```

### Empty State

```wireloom
window "Project Browser — No Projects":
  panel:
    row:
      text "Projects" bold
      input placeholder="Search projects..." type=search
      button "×"
    divider
    text "No projects available" muted id="no-projects"

annotation "Unlisted share links do not appear in anonymous project browser listing" target="no-projects" position=bottom
```

### Search State (User Types "MD")

Current project (MDT) is excluded when the query matches its code, title, or description:

```wireloom
window "Project Browser — Search":
  panel:
    row:
      text "Projects" bold
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
      text "Projects" bold
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
      avatar "MDT" id="active-accent"
      text "MDT" bold id="active-code"
      spacer
      icon name="star" id="active-star"
    text "Markdown Ticket" id="active-name"
    text "Lightweight ticket management" muted id="active-desc"

annotation "Blue gradient bg, blue border, shadow-md, rounded-xl" target="active-code" position=top
annotation "Fav-star active, rotate-[15deg]" target="active-star" position=right
annotation "Accent mark precedes code/name and uses current user's preference" target="active-accent" position=left
```

### Card Detail: Inactive Project (No Favorite)

```wireloom
window "Project Card — Inactive":
  panel:
    row:
      avatar "ABC" id="inactive-accent"
      text "ABC" bold id="inactive-code"
    text "Another Project" id="inactive-name"
    text "Example description here" muted id="inactive-desc"

annotation "White/gray gradient bg, no star, shadow-sm" target="inactive-code" position=top
annotation "Accent does not change card size" target="inactive-accent" position=left
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
      text "Projects" bold
      input placeholder="Search projects..." type=search
      button "×"
    divider
    text "No projects available" muted id="empty-projects"
```

### Mobile Viewport

```wireloom
window "Project Browser — Mobile Token Scoped":
  panel:
    row:
      text "Projects" bold id="pb-title-mobile"
      input placeholder="Search projects..." type=search id="pb-search-mobile"
      button "×"
    divider
    list:
      slot "PRI":
        text "Private roadmap" bold
        text "Read-only via Bob token" muted
      slot "DOCS":
        text "Documentation" bold
      slot "PUB":
        text "Public project" bold

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
          avatar "MDT" id="rail-active-accent"
          icon name="star"
          text "Markdown Ticket" bold
        text "Markdown Ticket"
        text "ticket mgmt" muted
      chip "ABC" id="chip-abc"
      chip "XYZ" id="chip-xyz"
      chip "API" id="chip-api"
      button "⊕" id="launcher-btn"

annotation "Active card: click opens panel (NOT switch)" target="active-card" position=top
annotation "Inactive chips: click switches project" target="chip-abc" position=bottom
annotation "Launcher button: opens project browser panel" target="launcher-btn" position=right
annotation "Rail accent stays compact; do not use filled-card treatment in the rail" target="rail-active-accent" position=bottom
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
annotation "Chip may include compact accent dot/mark but height remains h-12" target="chip-default" position=bottom
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
| Accent mark | proposed project accent tokens | `.project-accent-mark` + `data-project-accent` | Personal project identity preference |
| Filled identity area | proposed project accent tokens | `.project-identity-fill` | Same-size color/image treatment for browser cards only |

## Maintenance Notes

- Keep this file focused on canonical surface states: panel default/search/empty/mobile, rail desktop/mobile, and launcher open.
- Avoid adding more single-control snapshots unless they introduce a new interaction contract; prefer a short row in `project-browser.spec.md` state tables.
- Keep personal project accent rendering here; keep the color picker control in `project-edit-form.mockups.md`.
