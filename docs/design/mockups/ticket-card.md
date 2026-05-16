# Ticket Card — Wireframe Schema

Related spec: `specs/ticket-card.md`

## Default State

```wireframe
┌─────────────────────────────────┐
│ MDT-042 • Fix login redirect    │  ← Title row (font-semibold, text-sm)
│                                 │
│ [Proposed] [Medium] [Feature]   │  ← Badges (flex-wrap, gap-2)
│                      [✎]       │  ← Edit icon (hidden until hover)
└─────────────────────────────────┘
```

## Hover State

```wireframe state:ticket-card hover
┌─────────────────────────────────┐
│ MDT-042 • Fix login redirect    │  ← shadow elevate, -translate-y-0.5
│                                 │     scale-[1.005]
│ [Proposed] [Medium] [Feature]   │
│                      [✎]       │  ← Edit icon fades in (opacity 0→1)
└─────────────────────────────────┘
```

## Dragging State

```wireframe state:ticket-card drag
  ╲──────────────────────────────╱
  │ MDT-042 • Fix login redirect │  ← opacity-40, scale-95, rotate-2
  │                               │     shadow-2xl, cursor:move
  │ [Proposed] [Medium] [Feature] │
  └───────────────────────────────┘
```

## With All Badges (Full Attributes)

```wireframe state:ticket-card full-badges
┌─────────────────────────────────┐
│ MDT-042 • Implement auth flow   │
│                                 │
│ [In Progress] [High] [Feature]  │
│ [Phase:Auth] 🪾 Worktree        │
│ [Related:3] [Dep:2] [Blocks:1] │
│                      [✎]       │
└─────────────────────────────────┘
```

Note: Badges wrap to multiple lines when they overflow.

## Minimal Badges (No Optional Attributes)

```wireframe state:ticket-card minimal
┌─────────────────────────────────┐
│ MDT-042 • Fix typo              │
│                                 │
│ [Proposed] [Low] [Bug]         │
│                      [✎]       │
└─────────────────────────────────┘
```

## Invalid Status

```wireframe state:ticket-card invalid-status
┌─────────────────────────────────┐
│ MDT-042 • Fix login redirect    │  ← data-invalid="true"
│                                 │     tooltip: 'Invalid status: "Foo"'
│ [●Foo●] [Medium] [Feature]     │  ← StatusBadge shows invalid state
│                      [✎]       │
└─────────────────────────────────┘
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Card bg (light) | inline gradient | `from-white to-gray-50/80` | Subtle gradient |
| Card bg (dark) | inline gradient | `from-slate-800 to-slate-900/80` | |
| Card border | `--border` | `border rounded-xl` | |
| Card shadow (rest) | inline | `shadow-[0_1px_3px...]` | Very subtle |
| Card shadow (hover) | inline | `shadow-[0_8px_20px...]` | Elevated shadow |
| Ticket code | `--primary` | `text-primary dark:text-blue-400` | `font-medium` |
| Title text | `--foreground` | `text-gray-900 dark:text-white` | `font-semibold text-sm` |
| Separator | `--foreground` | `•` with `mx-1` | Between code and title |
| Edit icon | `--muted-foreground` | `opacity-0 group-hover:opacity-100` | 4×4 pencil |
| Badges | badge.css vars | `.badge[data-*]` | See BADGE_ARCHITECTURE.md |
| Worktree icon | n/a | `🪾` emoji | Appended to ticket code |
