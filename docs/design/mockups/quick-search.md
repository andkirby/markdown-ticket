# Quick Search — Wireframe Schema

Related spec: `specs/quick-search.md`

---

## Default State (Open, No Query)

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] Search tickets by key or     │         │
│           │     title...                      │         │
│           ├───────────────────────────────────┤         │
│           │ MDT-001   Project setup           │         │
│           ├───────────────────────────────────┤         │
│           │ MDT-002   Initial board layout    │         │
│           ├───────────────────────────────────┤         │
│           │ MDT-003   Ticket file format      │         │
│           ├───────────────────────────────────┤         │
│           │ MDT-004   MCP server integration  │         │
│           ├───────────────────────────────────┤         │
│           │ ... (up to 10 results)            │         │
│           └───────────────────────────────────┘         │
│                                                         │
│                    [↑↓ navigate  ↵ select  esc close]   │
└─────────────────────────────────────────────────────────┘
```text

## Filtering State (User Types "badge")

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] badge_                       │         │
│           ├───────────────────────────────────┤         │
│           │ MDT-140   Badge color update      │  ← match│
│           ├───────────────────────────────────┤         │
│           │ MDT-142   Update badge styles     │  ← match│
│           ├───────────────────────────────────┤         │
│           │ MDT-155   Badge hover states      │  ← match│
│           └───────────────────────────────────┘         │
│                                                         │
│                    [↑↓ navigate  ↵ select  esc close]   │
└─────────────────────────────────────────────────────────┘
```

## Navigating State (Arrow Key Selection)

```wireframe
state:quick-search navigating
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] badge_                       │         │
│           ├═══════════════════════════════════┤         │
│           │▌MDT-140   Badge color update      │  ← bg-blue-50, arrow
│           ├───────────────────────────────────┤         │
│           │ MDT-142   Update badge styles     │         │
│           ├───────────────────────────────────┤         │
│           │ MDT-155   Badge hover states      │         │
│           └───────────────────────────────────┘         │
│                                                         │
│                    [↑↓ navigate  ↵ select  esc close]   │
└─────────────────────────────────────────────────────────┘
```text

## Hover State (Mouse Over Result)

```wireframe state:quick-search hover
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] badge_                       │         │
│           ├───────────────────────────────────┤         │
│           │ MDT-140   Badge color update      │         │
│           ├═══════════════════════════════════┤         │
│           │▌MDT-142   Update badge styles     │  ← hover:bg-gray-50
│           ├───────────────────────────────────┤         │
│           │ MDT-155   Badge hover states      │         │
│           └───────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Cross-Project Ticket Key Search (Loading)

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] ABC-42_                      │         │
│           ├───────────────────────────────────┤         │
│           │ Searching: ABC-42                 │         │
│           ├───────────────────────────────────┤         │
│           │                                   │         │
│           │         [spinner rotating]        │         │
│           │                                   │         │
│           │  ┌─────────────────────────────┐  │         │
│           │  │ ▬▬▬▬▬▬▬                     │  │         │
│           │  │ ▬▬▬▬▬▬▬▬▬▬▬▬                 │  │         │
│           │  └─────────────────────────────┘  │         │
│           │  ┌─────────────────────────────┐  │         │
│           │  │ ▬▬▬▬▬▬▬                     │  │         │
│           │  │ ▬▬▬▬▬▬▬▬▬▬▬▬                 │  │         │
│           │  └─────────────────────────────┘  │         │
│           │  ┌─────────────────────────────┐  │         │
│           │  │ ▬▬▬▬▬▬▬                     │  │         │
│           │  │ ▬▬▬▬▬▬▬▬▬▬▬▬                 │  │         │
│           │  └─────────────────────────────┘  │         │
│           └───────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```text

## Cross-Project Ticket Key Search (Results)

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] ABC-42_                      │         │
│           ├───────────────────────────────────┤         │
│           │ Cross-Project                    │         │
│           ├───────────────────────────────────┤         │
│           │ ABC-42               ● High       │         │
│           │ Auth service refactor            │         │
│           │ in: Another Project              │         │
│           └───────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Project-Scoped Search (Loading)

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] @ABC login redirect_         │         │
│           ├───────────────────────────────────┤         │
│           │ In: ABC                          │         │
│           ├───────────────────────────────────┤         │
│           │         [spinner rotating]        │         │
│           │  ┌─────────────────────────────┐  │         │
│           │  │ ▬▬▬▬▬▬▬                     │  │         │
│           │  │ ▬▬▬▬▬▬▬▬▬▬▬▬                 │  │         │
│           │  └─────────────────────────────┘  │         │
│           └───────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```text

## Project-Scoped Search (Results)

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] @ABC login redirect_         │         │
│           ├───────────────────────────────────┤         │
│           │ In: ABC                          │         │
│           ├───────────────────────────────────┤         │
│           │ ABC-15               ● Medium     │         │
│           │ Fix login redirect loop           │         │
│           ├───────────────────────────────────┤         │
│           │ ABC-23               ● Low        │         │
│           │ Login redirect after pwd reset    │         │
│           ├───────────────────────────────────┤         │
│           │ ABC-31               ● High       │         │
│           │ Redirect to login on session exp  │         │
│           └───────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Cross-Project Empty State

```wireframe state:quick-search cross-project-empty
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] XYZ-999_                     │         │
│           ├───────────────────────────────────┤         │
│           │ Cross-Project                    │         │
│           ├───────────────────────────────────┤         │
│           │                                   │         │
│           │   Ticket XYZ-999 not found        │         │
│           │                                   │         │
│           │   Check the ticket key and        │         │
│           │   try again.                      │         │
│           │                                   │         │
│           └───────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```text

## No Results State

```wireframe state:quick-search empty
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│           ┌───────────────────────────────────┐         │
│           │ [🔍] zzznonexistent_              │         │
│           ├───────────────────────────────────┤         │
│           │                                   │         │
│           │         No results found          │         │
│           │                                   │         │
│           └───────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Mobile Viewport

```wireframe viewport:mobile
┌──────────────────────────────┐
│ [backdrop: bg-black/50]      │
│                              │
│ ┌──────────────────────────┐ │
│ │ [🔍] badge fix_         │ │
│ ├──────────────────────────┤ │
│ │ MDT-136  Fix login      │ │
│ ├──────────────────────────┤ │
│ │ MDT-140  Badge color    │ │
│ ├──────────────────────────┤ │
│ │ MDT-142  Badge styles   │ │
│ └──────────────────────────┘ │
│                              │
└──────────────────────────────┘
```text

---

## State Variants

### Result Item — Hover/Selected

```wireframe state:result-item hover
┌──────────────────────────────────────────┐
│ MDT-136                      ● Medium   │  ← bg-blue-50 dark:bg-blue-900/20
│ Fix login redirect                      │  ← border-l-2 border-blue-500
└──────────────────────────────────────────┘
```

### Mode Indicator — Current Project

```wireframe state:mode-indicator current
┌─────────────────────┐
│ In: MDT             │  ← bg-gray-100 text-gray-700
└─────────────────────┘
    ↑ text-xs px-2 py-0.5 rounded-full
```text

### Mode Indicator — Project-Scoped Search

```wireframe state:mode-indicator project
┌─────────────────────┐
│ In: ABC             │  ← bg-blue-100 text-blue-700
└─────────────────────┘
```

### Mode Indicator — Cross-Project Key

```wireframe state:mode-indicator cross-project
┌─────────────────────────────┐
│ Searching: ABC-42           │  ← bg-purple-100 text-purple-700
└─────────────────────────────┘
```text

### Skeleton Card — Loading State

```wireframe state:skeleton loading
┌──────────────────────────────────────────┐
│ ▬▬▬▬▬▬▬                                    │  ← bg-gray-200 dark:bg-gray-800
│ ▬▬▬▬▬▬▬▬▬▬▬▬                                │  ← animate-pulse
└──────────────────────────────────────────┘
```text

## Component Detail: Result Item

```wireframe state:result-item default
┌──────────────────────────────────────────┐
│ MDT-136                      ● Medium   │  ← font-mono text-sm text-blue-600
│ Fix login redirect                      │  ← text-gray-900 truncate
└──────────────────────────────────────────┘
    ↑ px-4 py-3 flex items-center gap-3
```

```wireframe state:result-item selected
┌──────────────────────────────────────────┐
│▌MDT-136                      ● Medium   │  ← bg-blue-50 dark:bg-blue-900/20
│ Fix login redirect                      │
└──────────────────────────────────────────┘
    ↑ Keyboard-selected (↑↓ arrows)
```text

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
