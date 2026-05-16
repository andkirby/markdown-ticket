# Settings — Wireframe Schema

Related spec: `specs/settings.md`

## Appearance Tab (default)

```wireframe
┌──────────────────────────────────────────┐
│ Settings                            [×]  │
│──────────────────────────────────────────│
│ [●Appearance] [○Board] [○Advanced]       │
│──────────────────────────────────────────│
│                                          │
│ Theme                                    │
│ Choose light, dark, or system theme      │
│                                          │
│ ┌──────────┬──────────┬──────────┐       │
│ │ ☀ Light  │ 🌙 Dark  │ 💻 System│       │
│ └──────────┴──────────┴──────────┘       │
│                                          │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                          │
│ Default View                             │
│ Open this view when navigating to a      │
│ project                                  │
│                                          │
│ ┌──────────────────────────┐             │
│ │ Board               ▾   │             │
│ └──────────────────────────┘             │
│                                          │
└──────────────────────────────────────────┘
```

## Board Tab

```wireframe state:settings board-tab
┌──────────────────────────────────────────┐
│ Settings                            [×]  │
│──────────────────────────────────────────│
│ [○Appearance] [●Board] [○Advanced]       │
│──────────────────────────────────────────│
│                                          │
│ Card Density                             │
│ Compact shows more tickets per column    │
│                                          │
│ ┌──────────────────────────┐             │
│ │ Comfortable          ▾  │             │
│ └──────────────────────────┘             │
│                                          │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                          │
│ Smart Links                    [●━━━━○]  │
│ Auto-detect ticket keys and doc paths    │
│                                          │
└──────────────────────────────────────────┘
```

## Advanced Tab

```wireframe state:settings advanced-tab
┌──────────────────────────────────────────┐
│ Settings                            [×]  │
│──────────────────────────────────────────│
│ [○Appearance] [○Board] [●Advanced]       │
│──────────────────────────────────────────│
│                                          │
│ Event History                   [●━━━━○]  │
│ Show SSE event history panel             │
│                                          │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                          │
│ Cache                                    │
│ Clear all cached data and reload         │
│                          [Clear Cache]   │
│                                          │
└──────────────────────────────────────────┘
```

## Mobile

```wireframe viewport:mobile
┌──────────────────────────┐
│ Settings            [×]  │
│──────────────────────────│
│ [●App] [○Board] [○Adv]  │
│──────────────────────────│
│                          │
│ Theme                    │
│ Choose your theme        │
│                          │
│ ┌──────┬──────┬──────┐   │
│ │ ☀    │ 🌙   │ 💻   │   │
│ │Light │ Dark │System│   │
│ └──────┴──────┴──────┘   │
│                          │
│ Default View             │
│ Open this view first     │
│                          │
│ ┌────────────────────┐   │
│ │ Board          ▾   │   │
│ └────────────────────┘   │
│                          │
└──────────────────────────┘
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Modal | `--background` | `bg-white dark:bg-slate-900` | size="md" |
| Tab trigger active | `--primary` | `border-b-2 border-primary` | `text-sm font-medium` |
| Tab trigger inactive | `--muted-foreground` | `hover:text-foreground` | |
| Tab content | n/a | `p-6` | |
| Setting label | `--foreground` | `text-sm font-medium` | |
| Setting desc | `--muted-foreground` | `text-sm mt-0.5` | |
| Theme button active | `--primary` | `bg-primary text-primary-foreground` | rounded-md |
| Theme button inactive | `--muted` | `bg-muted text-foreground` | |
| Select | `--background` | `border rounded-md px-3 py-2` | |
| Switch on | `--primary` | bg-primary, knob right | |
| Switch off | `--muted` | bg-muted, knob left | |
| Clear cache button | `--border` | `variant="outline"` | |
| Setting divider | `--border` | dashed or `space-y-6` gap | Between groups |
