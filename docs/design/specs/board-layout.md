# Board Layout

Kanban board — the primary surface for viewing and managing tickets as columns. Each column maps to one or more ticket statuses. Supports drag-and-drop, inline sort/filter, and responsive mobile column switching.

## Composition

```text
Board (DndProvider wrapper)
└── BoardContent
    ├── div.board-header (showHeader mode only)
    │   ├── FilterControls
    │   ├── SortControls
    │   ├── Button[Refresh]
    │   ├── Button[Create]
    │   └── HamburgerMenu
    └── div.board-grid (flex-1, grid)
        ├── Column[Backlog]
        ├── Column[Open]
        ├── Column[In Progress]
        └── Column[Done]
```

Each Column contains:

```text
Column
├── div.column-header (gradient bg)
│   ├── h3[column-label] or DropdownMenu (mobile column switcher)
│   └── div.column-meta
│       ├── StatusToggle (In Progress, Done columns only)
│       └── span[ticket-count badge]
├── ScrollArea (flex-1, min-h-0)
│   └── div.column-drop-zone
│       ├── DraggableTicketCard × N
│       └── div.empty-state (when 0 tickets)
└── ResolutionDialog (Done column only, conditional)
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Board | `src/components/Board.tsx` | this file | always |
| Column | `src/components/Column/index.tsx` | this file (column section) | always (4 visible) |
| TicketCard | `src/components/TicketCard.tsx` | `specs/ticket-card.md` | inside Column |
| FilterControls | `src/components/FilterControls.tsx` | — | `showHeader` mode only |
| SortControls | `src/components/SortControls.tsx` | — | `showHeader` mode only |
| HamburgerMenu | `src/components/HamburgerMenu.tsx` | `specs/app-header.md` | `showHeader` mode only |
| StatusToggle | `src/components/Column/StatusToggle.tsx` | — | In Progress, Done columns |
| ResolutionDialog | `src/components/ResolutionDialog.tsx` | — | Done column on drop |
| ScrollArea | `src/components/ui/scroll-area.tsx` | — | inside each Column |

## Source files

| Type | Path |
|------|------|
| Board | `src/components/Board.tsx` |
| Column | `src/components/Column/index.tsx` |
| StatusToggle | `src/components/Column/StatusToggle.tsx` |
| Drop zone hook | `src/components/Column/useDropZone.ts` |
| Button modes hook | `src/components/Column/useButtonModes.ts` |
| Board layout hook | `src/hooks/useBoardLayout.ts` |
| Column config | `src/config/statusConfig.ts` |
| Sort config | `src/config/sorting.ts` |

## Layout

### Board grid

- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Full width: `w-full`
- Items stretch: `items-stretch`
- Padding: `p-1`
- Overflow: `overflow-hidden` on the grid, each column handles its own scroll
- Height: `flex-1 min-h-0` (fills remaining viewport below app header)

### Column

- Flex column: `flex flex-col`
- Full height: `h-full min-h-0`
- Header: gradient background (`bg-gradient-to-br` with color from `getColumnGradient()`), `rounded-t-lg`, `shadow-md`, `z-10`
- Header padding: `px-3 py-2`
- Content area: `flex-1 min-h-0`, uses `ScrollArea` with `type="hover"` and `scrollHideDelay={600}`
- Drop zone padding: `px-3 py-2 space-y-2` (8px gap between cards)
- Border: `border-r border-border`, first column adds `border-l`

### Column widths (grid breakpoints)

| Breakpoint | Columns visible | Column width |
|------------|----------------|--------------|
| < 640px | 1 (mobile: active column only) | 100% |
| 640–768px | 2 | 50% each |
| 768–1024px | 3 | 33% each |
| 1024px+ | 4 | 25% each |

## Board Columns

Defined in `src/config/statusConfig.ts` → `BOARD_COLUMNS`. Visible columns only:

| Column | Label | Color | Statuses | Has Toggle |
|--------|-------|-------|----------|------------|
| backlog | Backlog | gray | Proposed | No |
| open | Open | blue | Approved | No |
| inProgress | In Progress | yellow | In Progress, On Hold | Yes (On Hold) |
| done | Done | green | Implemented, Partially Implemented, Rejected | Yes (Rejected) |

The 5th column (Deferred) has `visible: false` and is not rendered.

## Column: Status Toggle

In Progress and Done columns have a `StatusToggle` that toggles visibility of secondary statuses (On Hold, Rejected). Three modes:

| Mode | Description | Visible Tickets |
|------|-------------|-----------------|
| default | Main status only | In Progress (excl. On Hold) or Implemented + Partially Implemented |
| toggle active | Secondary status only | On Hold only, or Rejected only |
| merge active | Both statuses combined | All tickets for that column |

## Column: Mobile Behavior

On mobile (`< 768px`), only one column is visible at a time. The `useBoardLayout` hook manages this:

- `isMobile` detected via `(max-width: 768px)` media query
- `activeColumnIndex` tracks which column is shown (default: 0)
- Column header becomes a `DropdownMenu` for switching between columns
- Each dropdown item shows column label + ticket count

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | normal render | gradient column headers, cards listed vertically |
| drag hover (drop zone) | dragging a ticket over a column | `bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-400/30` |
| drag active (card) | user is dragging a card | card: `opacity-40 scale-95 rotate-2 shadow-2xl` |
| card hover | mouse enters card | card: `hover:scale-[1.02] hover:-translate-y-1`, shadow elevate |
| empty column | 0 visible tickets | centered "No tickets" text, `h-32` |
| loading | initial load | skeleton placeholders: gradient pulse animation |
| no project | no project selected | centered empty state: 📋 icon, message, backend-down alert |
| error | API failure | destructive Alert with Refresh button |
| resolution dialog | drop on Done column | modal asking status choice (Implemented / Partially Implemented / Rejected) |

## Drag-and-Drop

- Backend: `react-dnd` with `HTML5Backend`, wrapped in `DndProvider` at Board level
- Drag type: `'ticket'`
- Drag handle: entire card (`cursor: move`)
- Drop target: column root div
- On drop: updates ticket status via API with optimistic UI update
- Error: toast notification, reverts optimistic state
- Hold/Reject restore: tickets moving from hold/reject back to active status restore their saved column position

## Sort & Filter

- **Sort**: Applied per-column, not globally. `SortPreferences` stored in localStorage (`markdown-ticket-sort-preferences`). Attributes: Key (desc), Title (asc), Created Date (desc), Update Date (desc).
- **Filter**: Board-level text filter matching title, code, or description. Applied before column grouping.
- Both controls in `showHeader` mode only (multi-project Board). In single-project mode, controls live in the app header.

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| column bg | column gradient | `getColumnGradient(column.color)` per column config |
| drop zone highlight | `--primary` (blue-400/30) | ring color on drag-over |
| ticket count | `--primary` | `bg-primary/20 text-primary` pill |
| border | `--border` | column borders |
| background | `--background` | column content area |

## Extension notes

- Adding a new column: add entry to `BOARD_COLUMNS` in `statusConfig.ts` with `visible: true`, set `order`. Grid auto-adjusts if ≤4 columns at xl.
- Adding a new status: add to `STATUS_CONFIG` and assign to a column's `statuses` array.
- Ticket position persistence: `useProjectManager` stores positions for hold/reject restore. Positions are keyed by ticket code.
- The `showHeader` prop controls whether the board renders its own header bar (multi-project mode). When `false`, sort/filter/hamburger live in the app header.
