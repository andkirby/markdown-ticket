# Ticket Card

Card displayed in a board column representing a single ticket. Shows ticket identity, title, and attribute badges. Supports drag-and-drop via a wrapper.

## Composition

```text
DraggableTicketCard (drag wrapper)
└── TicketCard
    ├── div.card-body
    │   ├── div.title-row
    │   │   └── h4.ticket-title
    │   │       ├── TicketCode
    │   │       ├── span[• separator]
    │   │       └── span[title text]
    │   └── div.attributes-row
    │       ├── TicketAttributeTags (flex-1)
    │       │   ├── StatusBadge
    │       │   ├── PriorityBadge
    │       │   ├── TypeBadge
    │       │   ├── ContextBadge[phase] (conditional)
    │       │   ├── RelationshipBadge[related] (conditional)
    │       │   ├── RelationshipBadge[depends] (conditional)
    │       │   ├── RelationshipBadge[blocks] (conditional)
    │       │   └── ContextBadge[worktree] (conditional)
    │       └── div.actions (shrink-0)
    │           └── button[edit icon] (opacity on hover)
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| TicketCard | `src/components/TicketCard.tsx` | this file | always |
| TicketCode | `src/components/TicketCode.tsx` | — | always |
| TicketAttributeTags | `src/components/TicketAttributeTags.tsx` | — | always |
| StatusBadge | `src/components/Badge/StatusBadge.tsx` | — | always |
| PriorityBadge | `src/components/Badge/PriorityBadge.tsx` | — | always |
| TypeBadge | `src/components/Badge/TypeBadge.tsx` | — | always |
| ContextBadge | `src/components/Badge/ContextBadge.tsx` | — | phase, assignee, worktree |
| RelationshipBadge | `src/components/Badge/RelationshipBadge.tsx` | — | related, depends, blocks |

## Source files

| Type | Path |
|------|------|
| Component | `src/components/TicketCard.tsx` |
| Drag wrapper | `src/components/Column/index.tsx` (DraggableTicketCard) |
| Attribute tags | `src/components/TicketAttributeTags.tsx` |
| Badge module | `src/components/Badge/` |
| Badge styles | `src/components/Badge/badge.css` |
| TicketCode | `src/components/TicketCode.tsx` |

## Layout

### Card

- Background: gradient `from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80`
- Border: `border rounded-xl`
- Padding: `px-3 py-4`
- Shadow (rest): `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`
- Backdrop blur: `backdrop-blur-sm`
- Click handler: opens ticket viewer (`onEdit`)

### Title row

- Flex: `flex items-start justify-between mb-2`
- TicketCode rendered as `font-medium text-primary dark:text-blue-400`
- Separator: `•` with `mx-1`
- Title: `font-semibold text-sm truncate` — truncated when it overflows

### Attributes row

- Flex: `flex items-start justify-between gap-2`
- Badges: `flex flex-wrap gap-2`
- Edit button: `opacity-0 group-hover:opacity-100`, `w-4 h-4` pencil icon

### Card width

Card fills the column width minus padding. Column padding is `px-3`, drop zone gap is `space-y-2` (8px).

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | normal render | gradient bg, subtle shadow, cursor-pointer |
| hover | mouse enters | `hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)]`, `hover:-translate-y-0.5`, `hover:scale-[1.005]`, edit button fades in |
| dragging | user drags the card | wrapper: `opacity-40 scale-95 rotate-2 shadow-2xl`, cursor: move |
| invalid status | status not in valid set | class `ticket-card--invalid`, `data-invalid="true"`, title tooltip shows invalid status name |
| click | user clicks card | opens TicketViewer modal for this ticket |

## Badge Display Order

Badges appear left-to-right in this fixed order:

1. **StatusBadge** — always
2. **PriorityBadge** — always
3. **TypeBadge** — always
4. **ContextBadge[phase]** — when `ticket.phaseEpic` is set
5. **RelationshipBadge[related]** — when `ticket.relatedTickets` has items
6. **RelationshipBadge[depends]** — when `ticket.dependsOn` has items
7. **RelationshipBadge[blocks]** — when `ticket.blocks` has items
8. **ContextBadge[worktree]** — when `ticket.inWorktree === true`

If a badge value is empty or array is empty, the badge is not rendered.

## TicketCode

The code segment renders with worktree indicator:

- Format: `{CODE}` (e.g., `MDT-042`)
- Color: `text-primary dark:text-blue-400`
- Font: `font-medium`
- Worktree: appends `🪾` icon when `ticket.inWorktree === true`
- Data attribute: `data-testid="ticket-code"`

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| card bg (light) | inline gradient | `from-white to-gray-50/80` |
| card bg (dark) | inline gradient | `from-slate-800 to-slate-900/80` |
| code text | `--primary` | ticket code color |
| title text | `--foreground` | `text-gray-900 dark:text-white` |
| border | `--border` | card border |
| badge colors | `badge.css` data attributes | see `BADGE_ARCHITECTURE.md` |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| card | `.ticket-card` | inline Tailwind |
| invalid card | `.ticket-card--invalid` | inline Tailwind |
| title | `.ticket-title` | inline Tailwind |
| badge | `.badge[data-status="..."]` | `badge.css` |

## Extension notes

- Badge order is defined by `TicketAttributeTags.tsx` — add new badges at the end of the render list, before the worktree badge.
- New badge types must follow the `BADGE_ARCHITECTURE.md` data-attribute pattern.
- Invalid status detection: `isValidStatus()` checks against hardcoded CR status list. If statuses become configurable, this check must update.
- The drag wrapper (`DraggableTicketCard`) lives in `Column/index.tsx`, not in TicketCard. Card does not own its own drag behavior.
- Edit button on hover uses `group-hover` — requires `group` class on the card root.
