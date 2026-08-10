# Swimlane Board

An alternate layout of the board that groups tickets into one row per epic, with the shared status columns running across — so a user can scan a single status down through every epic and compare epic progress at a glance.

## Owns

- The swimlane container, lane construction, lane-label rendering, and epic lifecycle control on the lane header.
- Status-only drag-and-drop within a ticket's own epic lane; the cross-epic drop guard.
- Epic progress computation (terminal children / total children).
- Rendering when App selects the persisted swimlane board layout.

## Does Not Own

- The flat board, columns, or ticket-card identity — see `board-layout.spec.md` and `ticket-card.spec.md`. Swimlanes reuses `TicketCard` and `useDropZone`, not `Column`.
- Epic detail modal, side-rail, and zoom-filter (design3 §3/§4/§5 — deferred).
- The app-header view switcher and board-layout persistence — see `app-header.spec.md`.
- The epic lifecycle rules themselves (the close guard, the reference guard) — those are data-layer rules owned by MDT-205. This surface only renders their state and surfaces their errors.
- Status resolution semantics — terminal statuses for the progress calc are defined by the data layer (Implemented / Rejected / Partially Implemented).

## Composition

```text
SwimlaneBoard
├── div.swimlane-toolbar
│   ├── Button[Hide empty]
│   ├── Button[Show badges]
│   ├── Button[Collapse all]
│   ├── Button[Expand all]
│   └── span[lane-count]
└── div.swimlane-board (overflow: auto, both axes)
    ├── div.swimlane-head (sticky top)
    │   ├── div.swimlane-corner (sticky left+top)
    │   └── div.swimlane-col-header × N columns
    ├── Lane × M epics
    │   ├── div.lane-label[role=button] (sticky left; whole-label collapse toggle)
    │   │   ├── div.lane-title (title text + clickable key)
    │   │   ├── div.lane-meta (status + count pill + collapse chevron glyph)
    │   │   ├── div.lane-progress (mini bar + count text)
    │   │   └── div.lane-actions
    │   │       ├── EpicLifecycleControl (Activate | Close | Closed)
    │   │       └── Button[Open epic ticket]
    │   └── div.lane-body (hidden when collapsed)
    │       └── div.lane-col × N columns (drop target, independently scrollable)
    │           ├── TicketCard × K
    │           └── div.lane-empty (when 0)
    └── Lane[__none] (trailing "No epic" lane)
```

## Children

| Child | Component | Spec | Conditional |
|---|---|---|---|
| SwimlaneBoard | `src/components/SwimlaneBoard/index.tsx` | this file | board layout mode = swimlanes |
| Lane | inline in `src/components/SwimlaneBoard/index.tsx` | this file | per epic + trailing __none |
| EpicLifecycleControl | inline in `src/components/SwimlaneBoard/index.tsx` | this file | epic lanes only (not __none) |
| TicketCard | `src/components/TicketCard.tsx` | `ticket-card.spec.md` | reused with badges hidden unless Show badges is on |
| Drop zone hook | `src/components/Column/useDropZone.ts` | — | reused, with epic-match `canDrop` |

## Source files

| Type | Path |
|---|---|
| SwimlaneBoard | `src/components/SwimlaneBoard/index.tsx` |
| Lane model helpers | `src/components/SwimlaneBoard/helpers.ts` |
| CSS | `src/components/SwimlaneBoard/swimlane-board.css` |
| Ticket card | `src/components/TicketCard.tsx` |
| Board layout pref | `src/config/boardLayoutMode.ts` |
| Design source | `designs/board-zai/design3-epics.md` §8 |

## Lanes

- One lane per epic (`ticket.level === 'epic'`), in epic declaration order.
- A trailing **"No epic"** lane (key `__none`) collects tickets with no `phaseEpic` or whose `phaseEpic` does not resolve to a visible epic. Neutral accent (`--border-strong`), no EpicLifecycleControl, no progress bar.
- **All lanes are collapsed by default.** The set of expanded lanes persists to `localStorage` (`mdt-settings-swimlane-expanded-lanes`) across reloads. Collapse all / Expand all overwrite the set.
- "Hide empty" omits lanes with zero tickets after filters. The `__none` lane is never hidden by this toggle (it's the safety net).
- "Show closed" is off by default. When off, epic lanes whose epic is in a terminal (`Implemented`) status are hidden so the board focuses on active work. The `__none` lane is never hidden by this toggle.
- "Show badges" is off by default in swimlanes. Child ticket cards render code, title, and timestamp only until this toggle is enabled.

## Lane label

The lane label is a sticky-left column (md+) showing the epic identity and lifecycle. It is **not** a drop target.

| Element | Content | Notes |
|---|---|---|
| Lane title text | epic title | word-wraps (`overflow-wrap: break-word`); no color dot precedes it |
| Epic key | code via `<TicketCode>` | clickable button opening the epic ticket viewer; same font/color/glyph as the ticket-card key for scan parity |
| Status badge | `StatusBadge` | lifecycle state chip, sits on the meta row |
| Count pill | `N` | total child tickets, on the meta row |
| Collapse chevron | rotates on toggle | aria-hidden glyph, right-aligned on the meta row; the **whole lane label** is the toggle (role=button, aria-expanded) |
| Mini progress bar | `epicProgress()` width | bar + `done/total` text; `--epic-N` fill on `--bg-muted` track |
| EpicLifecycleControl | Activate / Close / Closed | sits directly under the progress bar (not pinned to the lane bottom); see States table below |
| Open epic ticket | icon button | beside the lifecycle action; opens the existing ticket viewer for the epic |

## Epic lifecycle control (lane header)

An epic's status is a publish/close gate, not a spatial workflow — so it renders as discrete actions on the lane header, never as a card in a column.

| Epic status | Control shown | Action |
|---|---|---|
| Proposed | `[Activate]` button | moves epic to `Approved` |
| Approved | `[Close]` button | moves epic to `Implemented`; calls the close guard (MDT-205) |
| Approved (blocked) | `[Close]` disabled + tooltip | tooltip lists the non-terminal children blocking the close |
| Implemented | `✓ Closed` indicator | no primary action; reopen via ticket viewer |

## States

| State | Trigger | Visual Change |
|---|---|---|
| default | swimlane mode on | lanes render, **all collapsed** (expanded set restored from localStorage if present) |
| drag hover (valid lane-col) | dragging over a lane-col whose epic matches the dragged ticket | `.drag-over` — `--bg-muted` tint |
| drag hover (wrong epic) | dragging over a lane-col of a different epic | no highlight; drop not accepted |
| lane collapsed | whole-label click / Collapse all | lane-body hidden; **label reflows from vertical 220px sticky column to a horizontal full-width summary bar** (title + key + status + count + progress + actions on one row); chevron rotates -90° |
| card badges hidden | swimlane mode default | ticket cards omit attribute badges for compact scanning |
| card badges shown | Show badges checked | ticket cards render the normal `TicketAttributeTags` row |
| empty lane | 0 tickets in lane after filters | `.lane-empty` dashed placeholder per col |
| close blocked | Close clicked with open children | button disabled; tooltip names blockers; toast on click attempt |
| close error | server rejects close (MDT-205 guard) | toast with blocking children; optimistic state reverts |
| no epics | project has zero epic tickets | only the `__none` lane renders |
| read-only | access mode lacks write | drag inactive, lifecycle controls hidden, collapse still works |

## Drag-and-Drop

- Backend: `react-dnd`, same drag type `'ticket'` as the flat board.
- Drop target: `.lane-col` (not the lane, not the label).
- **Status-only**: dropping in a lane-col updates the ticket's status. The epic axis is never changed by a drag.
- **Cross-epic guard**: `canDrop` returns true only when the lane-col's epic key matches the dragged ticket's `phaseEpic`. Wrong-epic lane-cols never highlight and never accept.
- Defense in depth: `onDrop(status, epicKey)` no-ops if `epicKey !== ticket.phaseEpic` (and `epicKey !== '__none'` for unparented tickets).
- The flat board is unaffected — its drop targets highlight and accept as before.

## Layout

- `.swimlane-board`: `height: 100%; overflow: auto` (both axes, the outer synchronized scroll surface for the header and lane labels).
- `.swimlane-head`: `position: sticky; top: 0; z-index: 8; min-width: max-content`.
- `.swimlane-corner`: `position: sticky; left: 0; top: 0; z-index: 9` (both axes).
- `.lane-label`: `width: 220px; position: sticky; left: 0; z-index: 4; max-height: 60vh; border-left: 3px solid var(--epic-color, --border-strong)`. A `max-height` keeps long lists from stretching the lane; the sticky label scrolls within that cap.
- `.lane-body`: `max-height: 60vh` — mirrors the lane-label cap so a lane does not grow unbounded.
- `.lane-col`: `width: 300px; flex-shrink: 0; min-height: 124px; overflow-y: auto; overscroll-behavior: contain`. Each column scrolls **independently**, so a long list in one status does not push the whole lane. The outer board surface still provides synchronized two-axis scroll for the header/labels.
- Column widths and order are shared across all lanes so a single status aligns vertically.

### Collapsed lane layout (design3 §8)

- `.lane--collapsed .lane-body`: `display: none` — the track is hidden.
- `.lane--collapsed .lane-label`: **reflows** from the vertical 220px sticky column to a horizontal full-width summary bar — `flex-direction: row; width: 100%; flex-wrap: wrap; padding: 6px 12px`. The epic key sits **before** the title on the same line, followed by status + count + progress + actions, so many collapsed epics scan as a compact one-line list.
- The whole `.lane-label` is the toggle (`role=button`); interactive children `stopPropagation`.
- The expanded-lane set persists to `localStorage` (`mdt-settings-swimlane-expanded-lanes`); default is empty (all collapsed).

## Responsive

| Breakpoint | Change |
|---|---|
| < 768px (mobile) | sticky-left disabled; lane labels become static full-width headers above each lane-track; columns scroll horizontally; toolbar wraps |
| ≥ 768px (desktop) | sticky lane labels + sticky header; synchronized two-axis scroll |

## Tokens used

| Element | Token | Usage |
|---|---|---|
| epic color | `--epic-1` … `--epic-4` | 4-color rotation per epic; lane left border, progress fill |
| lane track bg | `--bg-subtle` | recessed tier behind lane-cols |
| empty placeholder | `--border-strong` (dashed) | `.lane-empty` outline |
| drop highlight | `--bg-muted` | `.drag-over` tint |
| no-epic accent | `--border-strong` | `__none` lane left border (neutral) |

## Classes used

| Element | Class | Source |
|---|---|---|
| ticket card | `.kanban-card` (via `TicketCard`) | reused — see `ticket-card.spec.md` |
| ticket code | `.ticket-code` (via `<TicketCode>`) | reused — see `STYLING.md` |
| badge row | `.badge[data-status=…]` | reused — see `BADGE_ARCHITECTURE.md` |

New classes (in `swimlane-board.css`): `.swimlane-board`, `.swimlane-board__head`, `.swimlane-board__corner`, `.swimlane-board__col-head`, `.swimlane-board__toolbar`, `.swimlane-board__lane`, `.swimlane-board__lane-label`, `.swimlane-board__lane-label--none`, `.swimlane-board__lane-title`, `.swimlane-board__lane-title-text`, `.swimlane-board__lane-key`, `.swimlane-board__lane-meta`, `.swimlane-board__lane-col`, `.swimlane-board__lane-col.drag-over`, `.swimlane-board__lane-empty`, `.swimlane-board__lane--collapsed`, `.swimlane-board__progress`, `.swimlane-board__lane-count`, `.swimlane-board__lane-actions`, `.swimlane-board__lifecycle`, `.swimlane-board__open-epic`. These mirror the Design 3 swimlane concept without copying Alpine/mock-data architecture.

## Accessibility

- The whole lane label is the collapse toggle: a `div[role=button][tabindex=0][aria-expanded]` (not a `<button>` element, so the real `<button>` children it contains stay HTML-valid). Enter/Space toggles collapse.
- The collapse chevron is an `aria-hidden` glyph; it is a visual affordance only, not a separate control.
- Interactive children inside the label (epic key, lifecycle action, open-epic icon) are real `<button>`s that `stopPropagation` so they perform their own action without toggling collapse.
- The epic key is a `button` wrapping `<TicketCode>`; it opens the epic ticket viewer and carries an `aria-label` and `title` naming the epic.
- EpicLifecycleControl actions are real buttons with `aria-label` naming the epic.
- Open epic ticket is an icon-only `button` with `aria-label` and `title`.
- Disabled Close carries `aria-disabled` and a tooltip (title) listing the blockers.
- Drag-and-drop keyboard alternative: status change via the ticket viewer (existing). Swimlanes does not add a new keyboard DnD mode this pass.

## Extension notes

- Adding the epic detail modal (design3 §4) later: the lane-label doc-icon button is the entry point; leave a slot.
- Adding the side-rail (design3 §5) later: it composes over both board modes; do not couple it to swimlane state.
- Epic theme color is a fixed `--epic-1..4` rotation this pass. Per-epic color is a follow-up; the `--epic-color` CSS var on `.lane` is the seam.
