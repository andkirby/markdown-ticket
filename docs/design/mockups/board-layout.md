# Board Layout — Wireframe Schema

Related spec: `specs/board-layout.md`

## Desktop (≥1024px, 4 columns)

```wireframe
┌──────────────────────────────────────────────────────────────────────┐
│ Board Grid (grid-cols-4, items-stretch, p-1)                        │
│ ┌────────────────┬────────────────┬────────────────┬────────────────┐│
│ │ Backlog        │ Open           │ In Progress    │ Done           ││
│ │ (gray gradient)│ (blue gradient)│ (yellow grad.) │ (green grad.)  ││
│ │            [3] │            [5] │ [⏸]       [2] │ [✕]       [4]  ││
│ ├────────────────┼────────────────┼────────────────┼────────────────┤│
│ │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ ││
│ │ │MDT-042 • ..│ │ │MDT-042 • ..│ │ │MDT-042 • ..│ │ │MDT-042 • ..│ ││
│ │ │[Proposed]  │ │ │[Approved]  │ │ │[In Prog]   │ │ │[Impl]      │ ││
│ │ │[Feature]   │ │ │[Bug]       │ │ │[Feature]   │ │ │[Feature]   │ ││
│ │ └────────────┘ │ └────────────┘ │ └────────────┘ │ └────────────┘ ││
│ │ ┌────────────┐ │ ┌────────────┐ │                │ ┌────────────┐ ││
│ │ │MDT-041 • ..│ │ │MDT-039 • ..│ │                │ │MDT-040 • ..│ ││
│ │ │[Proposed]  │ │ │[Approved]  │ │                │ │[Part.Impl] │ ││
│ │ │[Bug]       │ │ │[Feature]   │ │                │ │[Bug]       │ ││
│ │ └────────────┘ │ └────────────┘ │                │ └────────────┘ ││
│ │                │                │                │                ││
│ │  No tickets    │                │                │                ││
│ └────────────────┴────────────────┴────────────────┴────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile (<768px, single active column)

```wireframe viewport:mobile
┌──────────────────────────────┐
│ Board Grid (grid-cols-1)     │
│ ┌────────────────────────────┐│
│ │ In Progress ▼          [2] ││  ← DropdownMenu for column switch
│ ├────────────────────────────┤│
│ │ ┌────────────────────────┐ ││
│ │ │MDT-042 • Fix login     │ ││
│ │ │[In Progress] [Feature] │ ││
│ │ └────────────────────────┘ ││
│ │ ┌────────────────────────┐ ││
│ │ │MDT-038 • Update API    │ ││
│ │ │[In Progress] [Bug]     │ ││
│ │ └────────────────────────┘ ││
│ │                            ││
│ └────────────────────────────┘│
└──────────────────────────────┘
```

## Drag Over State

```wireframe state:column drag-over
┌──────────────────────────────┐
│ Open                     [5] ││
├══════════════════════════════╡  ← ring-2 ring-blue-400/30
│ ┌────────────────────────┐   │  bg-blue-50/50 dark:bg-blue-950/30
│ │MDT-042 • Fix login     │   │
│ │[Approved] [Feature]    │   │
│ └────────────────────────┘   │
│                              │
│  ← drop target zone          │
│                              │
└──────────────────────────────┘
```

## Empty Column

```wireframe state:column empty
┌──────────────────────────────┐
│ Open                     [0] ││
├──────────────────────────────┤│
│                              ││
│                              ││
│       No tickets             ││  ← centered, h-32
│                              ││
│                              ││
└──────────────────────────────┘│
```

## Loading State

```wireframe state:board loading
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐    │
│ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │    │
│ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │    │
│ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓ │    │
│ └──────────────┴──────────────┴──────────────┴──────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

Note: Skeleton placeholders with gradient pulse animation.

## Column with Toggle (In Progress)

```wireframe state:column toggle
┌──────────────────────────────┐
│ In Progress              [3] ││  ← count shows visible tickets
│                    [⏸ Hold 2]││  ← StatusToggle pill
├──────────────────────────────┤│
│ ┌────────────────────────┐   ││
│ │MDT-042 • Active work   │   ││  ← In Progress tickets
│ │[In Progress] [Feature] │   ││
│ └────────────────────────┘   ││
│                              ││
│ Toggle modes:                ││
│  default = main status only  ││
│  active  = On Hold only      ││
│  merge   = both combined     ││
└──────────────────────────────┘│
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Column header bg | column color gradient | `getColumnGradient()` | Different color per column |
| Ticket count pill | `--primary` | `bg-primary/20 text-primary` | `rounded-full`, mono font |
| Drop zone highlight | blue-400/30 | `ring-2 ring-blue-400/30` | Only during drag-over |
| Dragging card | opacity 40% | `opacity-40 scale-95 rotate-2` | Visual feedback during drag |
| Empty state text | `--muted-foreground` | `text-gray-400` | Centered, `text-sm` |
| Loading skeleton | n/a | `animate-pulse` gradient | Gray gradient with staggered delay |
| Column border | `--border` | `border-r border-border` | First col also `border-l` |
| ScrollArea | n/a | `type="hover"` | Fades after 600ms |
