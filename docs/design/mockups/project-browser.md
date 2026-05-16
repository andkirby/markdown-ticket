# Project Browser — Wireframe Schema

Related spec: `specs/project-browser.md` (MDT-129 panel, MDT-152 search extension)

---

## Part 1: ProjectBrowserPanel (Full Overlay)

### Default State (Panel Open)

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │ [🔍] Search projects...              [✕]  │     │
│     ├─────────────────────────────────────────────┤     │
│     │                                             │     │
│     │  ┌────────────────┐ ┌────────────────┐     │     │
│     │  │ ★ MDT          │ │    ABC          │     │     │
│     │  │ Markdown Ticket│ │ Another Project│     │     │
│     │  │ Lightweight     │ │ Example desc   │     │     │
│     │  │ ticket mgmt     │ │ here           │     │     │
│     │  └────────────────┘ └────────────────┘     │     │
│     │                                             │     │
│     │  ┌────────────────┐ ┌────────────────┐     │     │
│     │  │    XYZ          │ │    API          │     │     │
│     │  │ Third Project  │ │ API Gateway    │     │     │
│     │  │ Another example│ │ Backend service│     │     │
│     │  └────────────────┘ └────────────────┘     │     │
│     │                                             │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Search State (User Types "MD")

Current project (MDT) is excluded when the query matches its code or name:

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │ [🔍] MD_                              [✕]  │     │
│     ├─────────────────────────────────────────────┤     │
│     │                                             │     │
│     │  ┌────────────────┐ ┌────────────────┐     │     │
│     │  │    AMD          │ │                │     │     │
│     │  │ A Markdown     │ │  (no other     │     │     │
│     │  │ Project        │ │   matches)     │     │     │
│     │  └────────────────┘ └────────────────┘     │     │
│     │                                             │     │
│     │  (Note: MDT excluded — it's current project) │     │
│     │                                             │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Search Empty State (No Matches)

```wireframe
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │ [🔍] ZZZ_                             [✕]  │     │
│     ├─────────────────────────────────────────────┤     │
│     │                                             │     │
│     │         No projects match your search       │     │
│     │                                             │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Card Detail: Active Project

```wireframe state:project-card active
┌──────────────────────────────────┐
│ ★ MDT                           │  ← blue gradient bg, blue border
│ Markdown Ticket                 │  ← fav-star active, rotate-[15deg]
│ Lightweight ticket management   │  ← description visible
└──────────────────────────────────┘
    ↑ border-blue-200 dark:border-blue-800
    ↑ bg-gradient-to-br from-blue-50 to-indigo-50
    ↑ shadow-md, rounded-xl, min-h-12
```

### Card Detail: Inactive Project (No Favorite)

```wireframe state:project-card inactive
┌──────────────────────────────────┐
│    ABC                           │  ← white/gray gradient bg
│ Another Project                 │  ← no star
│ Example description here        │  ← description visible
└──────────────────────────────────┘
    ↑ border-gray-200/50
    ↑ bg-gradient-to-br from-white to-gray-50/80
    ↑ shadow-sm, rounded-xl, min-h-12
```

### Card Detail: Inactive Project (Favorited)

```wireframe state:project-card inactive-favorited
┌──────────────────────────────────┐
│ ★ XYZ                           │  ← fav-star active
│ Third Project                   │  ← description visible
│ Another example project         │
└──────────────────────────────────┘
    ↑ Star: absolute top-1 right-1
    ↑ opacity-60 group-hover:opacity-100
```

### Card Hover State

```wireframe state:project-card hover
┌──────────────────────────────────┐
│    ABC                           │  ← shadow-lg
│ Another Project                 │  ← -translate-y-0.5
│ Example description here        │  ← scale-[1.02]
└──────────────────────────────────┘
    ↑ transition-all duration-200 ease-out
```

### Empty State (No Projects)

```wireframe state:project-panel empty
┌─────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50 backdrop-blur-sm]                │
│                                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │ [🔍] Search projects...              [✕]  │     │
│     ├─────────────────────────────────────────────┤     │
│     │                                             │     │
│     │         No projects available               │     │
│     │                                             │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Mobile Viewport

```wireframe viewport:mobile
┌──────────────────────────────┐
│ [backdrop: bg-black/50]      │
│                              │
│ ┌──────────────────────────┐ │
│ │ [🔍] Search projects..[✕]│ │
│ ├──────────────────────────┤ │
│ │                          │ │
│ │ ┌──────────────────────┐ │ │
│ │ │ ★ MDT                │ │ │
│ │ │ Markdown Ticket      │ │ │
│ │ │ Lightweight mgmt     │ │ │
│ │ └──────────────────────┘ │ │
│ │                          │ │
│ │ ┌──────────────────────┐ │ │
│ │ │    ABC                │ │ │
│ │ │ Another Project      │ │ │
│ │ └──────────────────────┘ │ │
│ │                          │ │
│ │ ┌──────────────────────┐ │ │
│ │ │    XYZ                │ │ │
│ │ │ Third Project        │ │ │
│ │ └──────────────────────┘ │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
└──────────────────────────────┘
    ↑ Single column on mobile
```

---

## Part 2: ProjectSelectorRail

### Desktop (Active + Inactive Chips + Launcher)

```wireframe
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  ┌─────────────────┐ ┌──────┐ ┌──────┐ ┌──────┐ [⊕]    │
│  │ ★ MDT           │ │ ABC  │ │ XYZ  │ │ API  │         │
│  │ Markdown Ticket │ │      │ │      │ │      │         │
│  │ ticket mgmt     │ │      │ │      │ │      │         │
│  └─────────────────┘ └──────┘ └──────┘ └──────┘         │
│  ↑ active card         ↑ chips (hover reveals details)  │
│  ↑ click opens panel   ↑ click switches project         │
│                        ↑ launcher opens panel            │
└───────────────────────────────────────────────────────────┘
```

### Active Card Detail

```wireframe state:active-card rail
┌──────────────────────────────────┐
│ ★ MDT                           │  ← fav-star--card
│ Markdown Ticket                 │  ← text-[10px] sm:text-xs
│ Lightweight ticket management   │  ← hidden sm:block for desc
└──────────────────────────────────┘
    ↑ useRailWidthConstraints: min-w-[100px] sm:min-w-[150px] max-w-[280px]
    ↑ click → onLauncherClick() (opens panel, NOT switch)
```

### Inactive Chip Detail

```wireframe state:inactive-chip default
┌──────────┐
│    ABC   │  ← text-sm font-medium
└──────────┘
    ↑ rounded-md px-2 py-1.5 h-12
    ↑ HoverCard wrapper (100ms delay)
```

```wireframe state:inactive-chip favorited
┌──────────┐
│    XYZ ★│  ← fav-star--chip overlay
└──────────┘
    ↑ Star: rotated chip variant
```

### Inactive Chip Hover (HoverCard)

```wireframe state:inactive-chip hover
┌──────────┐
│    ABC   │  ← chip highlighted
└──────────┘
     │
     ▼
┌──────────────────────────┐
│ ABC  Another Project     │  ← HoverCardContent w-80
│ Example description here │  ← whitespace-pre-wrap
└──────────────────────────┘
    ↑ Appears on mouse enter (100ms)
    ↑ Disappears on mouse leave (100ms)
```

### Launcher Button

```wireframe state:launcher default
  ┌───┐
  │ ⊕ │  ← Plus icon, lucide-react
  └───┘
    ↑ rounded-full w-10 h-10
    ↑ gradient bg, shadow-sm
    ↑ hover: shadow-md, -translate-y-0.5
```

```wireframe state:launcher active
  ┌───┐
  │ ⊕ │  ← ring-2 ring-blue-400
  └───┘
    ↑ Panel is open
```

### Mobile Rail (Active Only + Launcher)

```wireframe viewport:mobile
┌────────────────────────────────┐
│                                │
│  ┌─────────────────┐       [⊕] │
│  │ ★ MDT           │           │
│  │ Markdown Ticket │           │
│  │ ticket mgmt     │           │
│  └─────────────────┘           │
│  ↑ only active card           │
│  ↑ chips hidden on mobile     │
│  ↑ launcher still visible     │
│                                │
└────────────────────────────────┘
```

---

## Part 3: Panel Open from Rail

### Click Active Card → Panel Opens Below

```wireframe
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  ┌─────────────────┐ ┌──────┐ ┌──────┐ ┌──────┐ [⊕]    │
│  │ ★ MDT           │ │ ABC  │ │ XYZ  │ │ API  │         │
│  │ Markdown Ticket │ │      │ │      │ │      │         │
│  │ ticket mgmt     │ │      │ │      │ │      │         │
│  └─────────────────┘ └──────┘ └──────┘ └──────┘         │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ [🔍] Search projects...                [✕]  │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ ┌────────────────┐ ┌────────────────┐              │ │
│  │ │ ★ MDT          │ │    ABC          │              │ │
│  │ │ Markdown Ticket│ │ Another Project│              │ │
│  │ └────────────────┘ └────────────────┘              │ │
│  │ ┌────────────────┐ ┌────────────────┐              │ │
│  │ │    XYZ          │ │    API          │              │ │
│  │ │ Third Project  │ │ API Gateway    │              │ │
│  │ └────────────────┘ └────────────────┘              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└───────────────────────────────────────────────────────────┘
    ↑ Panel is full-screen overlay (not anchored to rail)
    ↑ Appears centered with pt-20 offset
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
