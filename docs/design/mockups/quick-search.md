# Quick Search — Wireframe Schema

Related spec: `specs/quick-search.md`

---

## Default State (Open, No Query)

```wireloom
window "Quick Search — Default":
  panel:
    input placeholder="Search tickets by key or title..." type=search id="qs-input"
    divider
    list:
      item "MDT-001   Project setup" id="qs-r1"
      item "MDT-002   Initial board layout" id="qs-r2"
      item "MDT-003   Ticket file format" id="qs-r3"
      item "MDT-004   MCP server integration" id="qs-r4"
      item "... (up to 10 results)" id="qs-more"
    text "↑↓ navigate  ↵ select  esc close" muted size=small id="qs-footer"
```

## Filtering State (User Types "badge")

```wireloom
window "Quick Search — Filtering":
  panel:
    input placeholder="badge" type=search id="qs-filter-input"
    divider
    list:
      item "MDT-140   Badge color update" id="qs-match-1"
      item "MDT-142   Update badge styles" id="qs-match-2"
      item "MDT-155   Badge hover states" id="qs-match-3"
    text "↑↓ navigate  ↵ select  esc close" muted size=small

annotation "Filter matches against ticket key and title" target="qs-match-1" position=right
```

## Navigating State (Arrow Key Selection)

```wireloom
window "Quick Search — Navigating":
  panel:
    input placeholder="badge" type=search
    divider
    list:
      slot "MDT-140   Badge color update" active id="qs-nav-1"
      item "MDT-142   Update badge styles" id="qs-nav-2"
      item "MDT-155   Badge hover states" id="qs-nav-3"
    text "↑↓ navigate  ↵ select  esc close" muted size=small

annotation "bg-blue-50, keyboard-selected via arrow keys" target="qs-nav-1" position=right
```

## Hover State (Mouse Over Result)

```wireloom
window "Quick Search — Hover":
  panel:
    input placeholder="badge" type=search
    divider
    list:
      item "MDT-140   Badge color update" id="qs-hover-1"
      slot "MDT-142   Update badge styles" active id="qs-hover-2"
      item "MDT-155   Badge hover states" id="qs-hover-3"

annotation "hover:bg-gray-50 highlight" target="qs-hover-2" position=right
```

## Cross-Project Ticket Key Search (Loading)

```wireloom
window "Quick Search — Cross-Project Loading":
  panel:
    input placeholder="ABC-42" type=search id="qs-cross-input"
    divider
    text "Searching: ABC-42" muted id="qs-cross-label"
    divider
    spinner "Searching cross-project..." id="qs-cross-spinner"
    panel:
      text "▬▬▬▬▬▬▬" muted
      text "▬▬▬▬▬▬▬▬▬▬▬▬" muted
    panel:
      text "▬▬▬▬▬▬▬" muted
      text "▬▬▬▬▬▬▬▬▬▬▬▬" muted
    panel:
      text "▬▬▬▬▬▬▬" muted
      text "▬▬▬▬▬▬▬▬▬▬▬▬" muted

annotation "Skeleton cards with animate-pulse" target="qs-cross-spinner" position=right
```

## Cross-Project Ticket Key Search (Results)

```wireloom
window "Quick Search — Cross-Project Results":
  panel:
    input placeholder="ABC-42" type=search
    divider
    text "Cross-Project" muted size=small id="qs-cross-section"
    divider
    list:
      slot "ABC-42   Auth service refactor":
        row:
          chip "High" accent=danger id="cross-priority"
        text "in: Another Project" muted size=small id="cross-project"

annotation "bg-purple-100 text-purple-700 mode indicator" target="qs-cross-section" position=right
annotation "Project result subtitle shows source project" target="cross-project" position=right
```

## Project-Scoped Search (Loading)

```wireloom
window "Quick Search — Project-Scoped Loading":
  panel:
    input placeholder="@ABC login redirect" type=search id="qs-proj-input"
    divider
    text "In: ABC" id="qs-proj-label"
    divider
    spinner "Searching..." id="qs-proj-spinner"
    panel:
      text "▬▬▬▬▬▬▬" muted
      text "▬▬▬▬▬▬▬▬▬▬▬▬" muted

annotation "bg-blue-100 text-blue-700 mode indicator" target="qs-proj-label" position=right
```

## Project-Scoped Search (Results)

```wireloom
window "Quick Search — Project-Scoped Results":
  panel:
    input placeholder="@ABC login redirect" type=search
    divider
    text "In: ABC" id="qs-proj-results-label"
    divider
    list:
      slot "ABC-15   Fix login redirect loop":
        chip "Medium" id="proj-med-1"
      slot "ABC-23   Login redirect after pwd reset":
        chip "Low" id="proj-low"
      slot "ABC-31   Redirect to login on session exp":
        chip "High" accent=danger id="proj-high"
```

## Cross-Project Empty State

```wireloom
window "Quick Search — Cross-Project Empty":
  panel:
    input placeholder="XYZ-999" type=search
    divider
    text "Cross-Project" muted size=small id="qs-empty-section"
    divider
    text "Ticket XYZ-999 not found" muted id="qs-not-found"
    text "Check the ticket key and try again." muted
```

## No Results State

```wireloom
window "Quick Search — No Results":
  panel:
    input placeholder="zzznonexistent" type=search
    divider
    text "No results found" muted id="qs-no-results"
```

## Mobile Viewport

```wireloom
window "Quick Search — Mobile":
  panel:
    input placeholder="badge fix" type=search
    divider
    list:
      item "MDT-136   Fix login"
      item "MDT-140   Badge color"
      item "MDT-142   Badge styles"
```

---

## State Variants

### Result Item — Hover/Selected

```wireloom
window "Result Item — Selected":
  panel:
    row:
      text "MDT-136" bold id="result-key"
      spacer
      chip "Medium" id="result-priority"
    text "Fix login redirect" id="result-title"

annotation "bg-blue-50 dark:bg-blue-900/20, border-l-2 border-blue-500" target="result-key" position=top
```

### Mode Indicator — Current Project

```wireloom
window "Mode Indicator — Current":
  panel:
    chip "In: MDT" id="mode-current"

annotation "bg-gray-100 text-gray-700, text-xs px-2 py-0.5 rounded-full" target="mode-current" position=right
```

### Mode Indicator — Project-Scoped Search

```wireloom
window "Mode Indicator — Project":
  panel:
    chip "In: ABC" id="mode-project"

annotation "bg-blue-100 text-blue-700" target="mode-project" position=right
```

### Mode Indicator — Cross-Project Key

```wireloom
window "Mode Indicator — Cross-Project":
  panel:
    chip "Searching: ABC-42" id="mode-cross"

annotation "bg-purple-100 text-purple-700" target="mode-cross" position=right
```

### Skeleton Card — Loading State

```wireloom
window "Skeleton Card — Loading":
  panel:
    text "▬▬▬▬▬▬▬" muted id="skeleton-line1"
    text "▬▬▬▬▬▬▬▬▬▬▬▬" muted id="skeleton-line2"

annotation "bg-gray-200 dark:bg-gray-800, animate-pulse" target="skeleton-line1" position=right
```

## Component Detail: Result Item

```wireloom
window "Result Item — Default":
  panel:
    row:
      text "MDT-136" bold id="result-default-key"
      spacer
      chip "Medium" id="result-default-priority"
    text "Fix login redirect" id="result-default-title"

annotation "font-mono text-sm text-blue-600, text-gray-900 truncate" target="result-default-key" position=right
```

```wireloom
window "Result Item — Keyboard Selected":
  panel:
    row:
      text "MDT-136" bold id="result-sel-key"
      spacer
      chip "Medium" id="result-sel-priority"
    text "Fix login redirect" id="result-sel-title"

annotation "bg-blue-50 dark:bg-blue-900/20, aria-selected=true" target="result-sel-key" position=right
```

---

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Backdrop | — | `bg-black/50 backdrop-blur-sm` | Per MODALS.md |
| Modal card | `--card` | `bg-white dark:bg-slate-900 rounded-xl shadow-2xl` | max-w-[900px] |
| Input border-bottom | `--border` | `border-b border-gray-200 dark:border-gray-700` | Separates input from results |
| Search icon | `--muted-foreground` | `text-gray-400 h-5 w-5` | Inline SVG, absolute positioned |
| Input text | `--foreground` | `text-lg` | No ring/border on input itself |
| Placeholder | `--muted-foreground` | `placeholder-gray-400` | "Search tickets by key or title..." |
| Ticket key | `--primary` | `font-mono text-sm font-medium text-blue-600 dark:text-blue-400` | shrink-0 |
| Ticket title | `--foreground` | `text-gray-900 dark:text-gray-100 truncate` | flex-1 |
| Result hover | `--accent` | `hover:bg-gray-50 dark:hover:bg-gray-800` | transition-colors |
| Result selected | `--primary` | `bg-blue-50 dark:bg-blue-900/20` | aria-selected=true |
| Result divider | `--border` | `divide-y divide-gray-100 dark:divide-gray-800` | Between items |
| No results | `--muted-foreground` | `p-8 text-center text-gray-500` | |
| Results scroll | — | `max-h-[50vh] overflow-y-auto` | Scrollbar on overflow |
| Mode indicator | — | `text-xs px-2 py-0.5 rounded-full` | Color varies by mode |
| Current project pill | — | `bg-gray-100 text-gray-700` | Gray for neutral |
| Project-scoped pill | `--primary` | `bg-blue-100 text-blue-700` | Blue for project scope |
| Cross-project pill | — | `bg-purple-100 text-purple-700` | Purple for cross-project |
| Project search pill | — | `bg-green-100 text-green-700` | Green for projects |
| Section label | `--muted-foreground` | `text-xs uppercase tracking-wide text-gray-500` | "Current Project", "Cross-Project" |
| Skeleton card | `--muted` | `bg-gray-200 dark:bg-gray-800 animate-pulse` | Loading placeholder |
| Spinner | `--muted-foreground` | `text-gray-400` | 24px, rotate animation |
| Project result subtitle | `--muted-foreground` | `text-xs text-gray-500` | "in: {Project Name}" |
