# Ticket Card — Wireframe Schema

Related spec: `ticket-card.spec.md`

## Default State

```wireloom
window "Ticket Card — Default":
  panel:
    row:
      text "MDT-042" bold id="ticket-code"
      text "Fix login redirect" id="ticket-title"
    row:
      chip "Proposed" id="status-badge"
      chip "Medium" id="priority-badge"
      chip "Feature" id="type-badge"
      spacer
      icon name="gear" id="edit-icon"

annotation "Title row: font-semibold, text-sm" target="ticket-title" position=top
annotation "Edit icon hidden until hover" target="edit-icon" position=right
```

## Hover State

```wireloom
window "Ticket Card — Hover":
  panel:
    row:
      text "MDT-042" bold
      text "Fix login redirect"
    row:
      chip "Proposed"
      chip "Medium"
      chip "Feature"
      spacer
      icon name="gear" id="edit-icon-hover"

annotation "Shadow elevates, -translate-y-0.5, scale-[1.005]" target="edit-icon-hover" position=right
annotation "Edit icon fades in (opacity 0→1)" target="edit-icon-hover" position=bottom
```

## Dragging State

```wireloom
window "Ticket Card — Dragging":
  panel:
    row:
      text "MDT-042" bold muted id="drag-code"
      text "Fix login redirect" muted id="drag-title"
    row:
      chip "Proposed" id="drag-status"
      chip "Medium"
      chip "Feature"

annotation "opacity-40, scale-95, rotate-2, shadow-2xl" target="drag-code" position=top
```

## With All Badges (Full Attributes)

```wireloom
window "Ticket Card — Full Badges":
  panel:
    row:
      text "MDT-042🪾" bold id="full-code"
      text "Implement auth flow"
    row:
      chip "In Progress" id="full-status"
      chip "High" accent=danger id="full-priority"
      chip "Feature"
    row:
      chip "Phase:Auth" id="full-phase"
      chip "🪾 Worktree" id="full-worktree"
    row:
      chip "Related:3" id="full-related"
      chip "Dep:2" id="full-dep"
      chip "Blocks:1" id="full-blocks"

annotation "Badges wrap to multiple lines when they overflow" target="full-related" position=right
```

## Minimal Badges (No Optional Attributes)

```wireloom
window "Ticket Card — Minimal Badges":
  panel:
    row:
      text "MDT-042" bold
      text "Fix typo"
    row:
      chip "Proposed"
      chip "Low"
      chip "Bug"
      spacer
      icon name="gear"
```

## Invalid Status

```wireloom
window "Ticket Card — Invalid Status":
  panel:
    row:
      text "MDT-042" bold id="invalid-title"
      text "Fix login redirect"
    row:
      chip "Foo" accent=danger id="invalid-badge"
      chip "Medium"
      chip "Feature"
      spacer
      icon name="gear"

annotation "data-invalid=true, tooltip: 'Invalid status: Foo'" target="invalid-badge" position=right
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
| Worktree icon | n/a | `🪾` emoji | Appended to ticket code in title row; also shown as a chip in badge bar |
