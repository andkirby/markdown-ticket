# Pin Rail - Mockups

Related spec: `pin-rail.spec.md`
Source idea: `../ideas/IDEA-002-global-pin-bar.md`
Ticket: `../../CRs/MDT-197-pin-rail.md`
Prototype reference: `designs/board-zai/design3.html` §"PIN RAIL"

The wireframes below show the durable layout truth of the rail: a `48px` vertical strip of
icon-only pin items, recency-pinned-first, with a hover tooltip and hover-× unpin. Wireloom is
structural — exact icon styling, rotated-label rendering, and the `32px` square chip corners are
approximated; the spec's Tokens/Classes sections carry the pixel contract.

## 1. Populated rail (default state, ≥ md, ≥1 pin)

The steady state: rail visible beside the board, several pins, no hover in progress. Cross-project
pins (e.g. `MDT-042` and `OTHER-042`) render side by side in recency order; the numeric code alone
sits on the chip and the project code lives in the tooltip.

```wireloom
window "Board — populated pin rail":
  row:
    col 48:
      panel:
        col:
          text "Pinned" size=small muted id="label"
          divider
          button "042" id="pin-top"
          button "042" id="pin-cross"
          button "197" id="pin-third"
          button "129" id="pin-fourth"
          button "088" id="pin-fifth"
          button "+" id="drop-affordance"

annotation "Vertical collapsed-strip label; text-[9px] uppercase tracking-wider, text-subtle." target="label" position=right
annotation "Icon-only PinItem. Numeric code only on the chip (32px square, mono). Project code is in the tooltip, not here — numeric codes collide across projects (see next two items)." target="pin-top" position=right
annotation "Same number, different project. Tooltip disambiguates: 'MDT-042' vs 'OTHER-042'." target="pin-cross" position=right
annotation "Trailing DropAffordance (dashed +). Always last; doubles as the empty-rail drop target. Whole rail also accepts drops when populated." target="drop-affordance" position=right
```

| Element | Semantic Pattern | Notes |
|---------|------------------|-------|
| rail | `w-12 border-r border-app bg-subtle flex-col items-center py-3 gap-1.5` | recessed-soft nav-rail chrome; right edge only |
| "Pinned" label | `text-[9px] uppercase tracking-wider text-subtle` | collapsed-strip treatment, approximated as horizontal in wireloom |
| divider | `w-5 h-px var(--border)` | 1px rule under the label |
| PinItem | `w-8 h-8 rounded-md border border-app bg-app text-[10px] mono` | raised chip; numeric code via `.ticket-key` |
| DropAffordance | `w-8 h-8 rounded-md border border-dashed border-app` | trailing; drop target |

## 2. PinItem hover (tooltip + unpin ×)

Hovering a pin reveals the portaled tooltip (project code + ticket code + title + status badge) and
the top-right × for one-tap unpin. This is the disambiguation + mutation state.

```wireloom
window "Board — pin item hover":
  row:
    col 48:
      panel:
        col:
          text "Pinned" size=small muted
          divider
          button "042" id="pin-hovered"
          button "042"
          button "197"
          button "+"
    spacer
    panel:
      col:
        text "MDT-042" weight=bold id="tt-code"
        text "Add vertical pin rail for ticket quick access" id="tt-title"
        status "In Progress" kind=info id="tt-status"

annotation "Hovered PinItem: border → --border-strong, text → primary. UnpinButton × fades in at top-right (16px hit target)." target="pin-hovered" position=left
annotation "Portaled tooltip (NOT native :title). Full identity — this is the cross-project disambiguator. Appears after ~300ms hover." target="tt-code" position=left
annotation "Status reuses Badge[data-status] from the card; tooltip is the only place status appears for a pin." target="tt-status" position=left
```

| Element | Semantic Pattern | Notes |
|---------|------------------|-------|
| hovered item | `border-strong text-app` + `ring` if drag-hover | default → hover reveal |
| × | `w-4 h-4 absolute top-right`, hover/focus reveal | hidden in read-only |
| tooltip | portal to body; `aria-describedby` associate | reuses shared tooltip/HoverCard primitive |

## 3. Empty rail as drop target (first-pin case)

With zero pins the rail is absent (`0px`). The moment a board card drag starts, the rail reveals at
`48px` showing only the dashed `+` DropAffordance as the drop target — so the user always has
somewhere to drop the first pin.

```wireloom
window "Board — empty rail revealed by drag":
  row:
    col 48:
      panel:
        col:
          button "+" id="empty-drop"

annotation "Rail absent outside a drag (0px). During a board-card drag it reveals at 48px with ONLY the dashed + as the target. No header, no items." target="empty-drop" position=right
annotation "Drop hover visual reuses the board pattern: bg-blue-50/50 ring-2 ring-blue-400/30 while a ticket is dragged over." target="empty-drop" position=right
```

| Element | Semantic Pattern | Notes |
|---------|------------------|-------|
| revealed empty rail | `w-12 border-r border-app bg-subtle` centered `+` | only during an active ticket drag |
| drop hover | `bg-blue-50/50 ring-2 ring-blue-400/30` | board drop-hover pattern, reused |

## 4. Drag-to-pin from a board card

A board card is the drag source (type `'ticket'`, existing). The rail is the drop target. On drop,
`onPin` builds a `PinItem` from the dragged ticket and dispatches the whole-list `PUT /api/pins`.

```wireloom
window "Board — dragging a card onto the rail":
  row:
    col 48:
      panel:
        col:
          text "Pinned" size=small muted
          divider
          button "042" id="drop-rail"
          button "197"
          button "+"
    spacer
    panel:
      text "Board content" muted id="board"

annotation "Whole rail is a drop target (useDrop type 'ticket'). Reuses board DnD — no new drag system." target="drop-rail" position=right
annotation "Drag payload { ticket } from Column/index.tsx. onPin → PinItem(projectCode, ticketCode, now) → PUT /api/pins (whole-list replace)." target="drop-rail" position=left
annotation "DndProvider must be lifted to App.tsx so board (source) and rail (target) share one context. See spec §'Code Drift'." target="board" position=left
```

## 5. Read-only mode

Pinned items render and click-to-open works. Unpin is hidden and drag-to-pin is a no-op. The rail
remains useful for *viewing* the working set; only mutations are blocked.

```wireloom
window "Board — read-only pin rail":
  row:
    col 48:
      panel:
        col:
          text "Pinned" size=small muted
          divider
          button "042" id="pin-ro"
          button "197"
          button "+" id="drop-ro"

annotation "Items render and are openable. aria-label still carries full identity." target="pin-ro" position=right
annotation "× hidden (no unpin). DropAffordance present visually but drop is a no-op when canWrite is false (mirrors board read-only DnD rule)." target="drop-ro" position=right
```

## 6. Mobile (< md) — rail hidden

Below `md` the rail is hidden entirely (`hidden md:flex`). Mobile gets no rail in Phase 1; a
FAB/sheet is deferred per IDEA-002. Drag-to-pin is a desktop interaction.

```wireloom
window "Board — mobile (no rail)":
  panel:
    text "Board content fills full width." id="mobile-board"
    text "Pin rail is hidden < md. Mobile FAB/sheet deferred (IDEA-002)." size=small muted

annotation "hidden md:flex on the rail → 0px footprint on mobile. Content row is just content." target="mobile-board" position=top
```

## Review notes

- **Numeric-code-only chips are intentional.** A `32px` square cannot legibly hold `MDT-042`. The
  tooltip is the contract for full identity; the chip is a glanceable handle. Two pins with the same
  number but different projects is an expected, handled case (wireframe 1, items 1–2).
- **The dashed `+` is always trailing**, even when populated. It is the visible drop affordance and
  the empty-rail target; it is not a click-to-add button in v1 (no add-by-search picker in scope).
- **The "Pinned" label is shown horizontally in wireframes** because Wireloom cannot render a
  rotated/vertical collapsed-strip label. In the app it uses the project's collapsed-strip treatment
  (vertical or rotated text, `text-[9px]`).
- **Tooltip vs HoverCard**: the wireframe shows a lightweight tooltip. Implementation may upgrade to
  the existing `ProjectSelectorChip` hover-card primitive if that is the project's established
  pattern; both satisfy the AC. See spec §"Open Questions".
