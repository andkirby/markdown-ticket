# Pin Rail

A vertical left rail of icon-only pinned tickets — the user's cross-view, cross-project working
set. Always-available quick access to whatever the user is actively touching. MDT-197 (Phase 1:
tickets only), source idea `docs/ideas/IDEA-002-global-pin-bar.md`.

Related artifacts:
- Review mockups: `pin-rail.mockups.md`
- Source idea: `../ideas/IDEA-002-global-pin-bar.md`
- Ticket: `../../CRs/MDT-197-pin-rail.md`
- Spatial boundary partner: `board-filter-bar.spec.md` §"Spatial boundary"
- Drag-drop contract reused: `board-layout.spec.md` "Drag-and-Drop"
- App shell it slots into: `app-header.spec.md`
- Persistence pattern mirrored: `src/config/documentFavs.ts`, `domain-contracts/src/app-config/schema.ts` (`DocumentFavItem`)

## The one rule

**The pin rail is a sibling of the content area, never a tenant of the header.** It owns the left
rail zone; the board filter bar owns `header__left`/`header__right`. The two surfaces never compete
for the same pixels. This is non-negotiable and is restated in `board-filter-bar.spec.md` and
`app-header.spec.md`'s extension notes.

## Owns

- The left rail zone: a fixed-width vertical column (`48px`, `hidden < md`) rendered as a sibling of
  the content area inside `App.tsx`'s content row — not inside `<main>`, not inside the header.
- The pin set as **server-backed** state (a whole-list `PUT /api/pins` replace, mirroring
  `PUT /api/documents/favs`). Cross-project by design: each pin carries its project code.
- Icon-only pin items: a `48px`-wide strip with ~`32px` square buttons showing the ticket's numeric
  code only. Cross-project pins render side by side; the project code is in the tooltip, not on the
  chip (the numeric code alone is ambiguous across projects — the tooltip is the disambiguator).
- Drag-to-pin: the rail is a drop target for board cards using the existing drag type `'ticket'`
  (`board-layout.spec.md`). No new DnD system. No visible drop glyph — the whole rail is the target;
  drag-hover is signaled by the board's drop-hover style (C-5).
- Click-to-open: clicking a pin opens the ticket viewer for that ticket, same path as a board card
  click (cross-project pins open the owning project's viewer).
- Hover tooltip: priority glyph + ticket key (via the canonical `<TicketCode>`) + title + status
  badge — the minimum to disambiguate cross-project pins and convey state at a glance.
- Hover-× unpin: a small × revealed on each pin item on hover, removing that pin.
- **Feature enable/disable (BR-11):** a browser-only "Pin rail" Switch in Settings → Board. When
  off, neither rail nor collapsed strip renders (0px; truly gone). Default on.
- **Pinned/collapsed toggle (BR-12):** a pin-icon button (lucide `Pin`/`PinOff`).
  - **Pinned** (icon filled `--primary`): rail stays open at `48px` (docked, in flow). Default.
  - **Unpinned** (icon outline): rail auto-collapses to a single floating pin-icon button on
    pointer-leave/blur. The button is the **only** reserved affordance when enabled-but-unpinned —
    it floats at the top-left edge at `opacity: 0.85` (solid on hover), taking **no layout space**
    (`position: absolute; width: 0` container). Hover/focus on the button (or a drag-in-progress)
    slides the full rail open as a floating overlay (`~140ms ease-out`, C-5). No "Pinned" text label
    and no `+` drop glyph — state is conveyed by **visual signals only** (icon fill/accent).
- Overflow behavior: vertical scroll inside the open rail. No cap, no wrap, no shrink-to-fit.

## Does Not Own

- The header zone or anything in it (`app-header.spec.md` owns `nav.header`, `header__left`,
  `header__right`). The board filter bar is the header tenant, not the pin rail.
- Board columns, card layout, or status-change drag-drop (`board-layout.spec.md`). The rail is a new
  drop target, not a new column or a new drag source.
- The ticket card or its badges (`ticket-card.spec.md`). The card is the drag source; its visual
  contract is unchanged.
- The ticket viewer (`ticket-viewer.spec.md`). Clicking a pin opens the existing viewer; the rail
  does not render its own detail surface.
- Document pins (Phase 2 — no document drag source exists yet).
- Auto-populate with in-progress tickets (smart default — deferred per IDEA-002).
- Auto-unpin on done column (per-action toggle — deferred per IDEA-002).
- Mobile FAB/sheet for the rail (mobile interaction model — deferred).
- Pin reordering via drag within the rail (manual recency-based ordering only in v1).
- Hover card / preview pane for pins (tooltip only in v1).

## Spatial boundary

The rail owns the **left rail zone** with a **hybrid docked/floating model**. Whether it occupies
layout flow depends on the pin state:

| State | Layout footprint | Position | Visual |
|-------|------------------|----------|--------|
| pinned (docked) | **`48px`** (in flow, pushes columns) | `position: relative` | full rail: pin-icon toggle (filled `--primary`) + scrollable pin items; no text label, no drop glyph |
| unpinned + collapsed | **`0px`** (floating button only) | container + button `absolute` | a single floating pin-icon button (outline) at the top-left corner, `opacity: 0.85` (→ 1 on hover); no reserved width |
| unpinned + transient open (hover/drag) | **`0px`** (floats over content) | `position: absolute; z-index: 30` | `48px` overlay at the left edge; reverts to collapsed on pointer-leave |
| disabled | **`0px`** | — | nothing (Settings → Board → Pin rail off) |
| content | full width when not pinned; `48px` less when pinned | `flex-1 min-w-0` | board / list / documents |

The rail is a sibling of content inside a `relative` content row in `App.tsx`. **Pinned = docked
(takes 48px, pushes board columns ~48px right). Unpinned = floating (0px footprint; transient hover
reveal overlays content without pushing).** Both collapsed and floating use `position: absolute`
(overlay) so the floating→collapsed slide never flips position mid-animation — **no column jump
during the slide-out** (C-5). Measured: first board column left edge is 56px when pinned, 8px in
collapsed/floating/disabled, and 8px at every sample during the slide-out transition.

This boundary is the counterpart of the filter bar's: filter owns the header (`header__left`/`right`),
pin owns the left rail. Stated from both sides in `board-filter-bar.spec.md` §"Spatial boundary" and
`app-header.spec.md` extension notes.

## Composition

```text
App content row (src/App.tsx)                  ← PinRail + content siblings
├── PinRail
│   ├── PinToggleButton                       (Pin icon: filled=--primary when pinned, outline when unpinned)
│   └── PinList (overflow-y-auto, flex-col, gap-1.5)
│       └── PinItem[]                         (one per pin, recency-pinned-first)
│           ├── PinCode "042"                 (numeric part only; mono; var(--fs-xs,11px) — same token as ticket card code)
│           ├── PinTooltip (on hover)         (portal; NOT native :title)
│           │   ├── TicketCode                (canonical <TicketCode> — priority glyph + "MDT-042"; NEVER hand-composed)
│           │   ├── Title                     (ticket title)
│           │   └── StatusBadge               (reuses Badge data-status)
│           └── UnpinButton ×                 (hover-reveal, top-right of item)
└── content (existing: <main> / ProjectView)
```

`PinRail` itself is the drop target — the whole rail (and its collapsed floating button) accepts
drops. There is **no** separate visible drop glyph; drag-hover is signaled by the board's
drop-hover style on the rail. All resolve to the same `useDrop({ type: 'ticket' })` and the same
`onPin(ticket)` handler.

### Pin ordering

Recency-pinned-first. The most recently pinned ticket renders at the **top** of the list. Order is
derived from `favoritedAt` (descending) on the client; the server stores the full ordered list.
Manual reordering is deferred (IDEA-002).

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| PinRail | `src/components/PinRail/index.tsx` (new) | this file | feature enabled (Settings → Board → Pin rail) |
| PinToggleButton | inline in `PinRail` | — | always (floating button when collapsed; rail-top button when open) |
| PinList | inline in `PinRail` | — | rail open (pinned or transient) |
| PinItem | `src/components/PinRail/PinItem.tsx` (new) | — | one per pin |
| PinTooltip | `src/components/PinRail/PinTooltip.tsx` (new) or shared `Tooltip`/`HoverCard` | — | pointer hover on a PinItem |
| UnpinButton | inline in `PinItem` | — | pointer hover on a PinItem; hidden in read-only |
| StatusBadge | `src/components/Badge/` | `ticket-card.spec.md` / `BADGE_ARCHITECTURE.md` | inside the tooltip |

### Mount site (App.tsx)

`PinRail` mounts as a sibling of the content area inside `App.tsx`'s content row, **outside** the
`locked` branch (it is app-level chrome, not gated by auth state — see States for read-only rules):

```text
<Header>…</Header>
<div className="flex-1 overflow-hidden">          ← existing content row
  {accessMode === 'locked' ? <AuthUnlockPanel/> : (
    <>
      <PinRail … />                               ← NEW sibling
      <ProjectView … />                           ← existing content
    </>
  )}
</div>
```

## Source / Verification Anchors

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| App shell insertion | `src/App.tsx:533` (`flex-1 overflow-hidden` content row) | the exact row `PinRail + content` replaces |
| Drag-drop contract | `src/components/Board.tsx:631` (`DndProvider`), `src/components/Column/index.tsx:73` (`useDrag` type `'ticket'`) | the DnD system the rail reuses — **see Code Drift** |
| Persistence pattern | `src/config/documentFavs.ts`, `server/controllers/DocumentController.ts:putDocumentFavs`, `server/routes/documents.ts:115` (`PUT /favs`) | the whole-list-replace user-selection pattern to mirror for `/api/pins` |
| Pin schema home | `domain-contracts/src/app-config/schema.ts` (`DocumentFavItem`/`DocumentFavState` are the sibling to copy for `PinItem`/`PinState`) | where the validated pin types must live |
| Spatial boundary | `docs/design/surfaces/board-filter-bar.spec.md` §"Spatial boundary" | the contract this surface is the other half of |
| Access mode source | `src/hooks/useProjectManager.ts` (`accessMode`, `canWriteTickets`) | drives read-only pin/unpin gating |
| Verification | `tests/e2e/` (new: `pin-rail.spec.ts`) + `server/tests/api/` (new: `pins.test.ts` mirroring `document-favs.test.ts`) | drag-to-pin, click-to-open, hover-unpin, persistence, cross-project, read-only |

## Pin State Contract

Server-backed, whole-list replace — mirrors `DocumentFavState` in semantics (one whole-list `PUT`, validated state, reset-on-bad-schema). The shape differs in one way: pins are cross-project, so the request carries no `projectId` (each `PinItem` carries its own `projectCode`); document favs are per-project and take a `projectId`.

- **`PinItem`** (new, in `domain-contracts/src/app-config/schema.ts`, beside `DocumentFavItemSchema`):
  `{ projectCode: string (nonempty), ticketCode: string (nonempty, `{CODE}-{NUMBER}`), favoritedAt: string (datetime offset) }.strict()`.
  Project code + ticket code together are the cross-project key; `favoritedAt` drives recency order.
- **`PinState`** (new): `{ pins: PinItem[] }.strict()`. Carries the full ordered list.
- **`PUT /api/pins`** — replaces the entire pin set with the request body (validated `PinState`).
  One endpoint, one shape, consistent with `PUT /api/documents/favs`. Granular `POST`/`DELETE` are
  deferred unless they show a concrete win.
- **Stale-pin rule**: if a pinned ticket is deleted or leaves scope, the next server sync drops it
  silently from the rail (never throws). Client may optimistically drop on a 404/410 ticket lookup.
- **Schema migration**: an older server payload that fails validation is reset to empty, never
  thrown — same posture as document favs.

Persistence is **not** localStorage-only. Reinventing localStorage-only pins would fork the
persistence story for user selections; the document-favs endpoint is the established MDT pattern.

## Layout

### Width and visibility

- Width: `48px` (`w-12`) when visible. `flex-shrink-0`.
- Desktop (`≥ md`): rendered when `pins.length > 0` **or** a board card is being dragged. The
  "dragging" reveal solves the first-pin problem — see States.
- Below `md`: the rail is **hidden** (`hidden md:flex`). Mobile gets no rail in Phase 1 (mobile
  FAB/sheet deferred per IDEA-002). Drag-to-pin is a desktop interaction.

### Structure (desktop, visible)

```text
aside.pin-rail (w-12, border-r border-app, bg-subtle, flex-col, items-center, py-3, gap-1.5)
├── PinToggleButton           (Pin icon: filled --primary when pinned, outline when unpinned)
└── PinList                   (flex-1, overflow-y-auto, w-full, flex-col, items-center, gap-1.5)
    └── PinItem …             (recency-pinned-first)
```

- No text label, no divider, no drop glyph — **visual signals only**. The pin icon's fill/accent is
  the sole state affordance (filled `--primary` = pinned, outline = unpinned). The whole rail is the
  drop target; drag-hover reuses the board's drop-hover style (no dedicated `+` affordance).
- The rail background is `--bg-subtle` (recessed-soft: "nav rails" per `STYLING.md`). It reads as
  chrome one rung apart from the base content next to it, matching the epic rail treatment in the
  `designs/board-zai/design3.html` prototype.
- Border is a single `border-r` using the structural border token (`border-app` → `var(--border)`).
- Scroll: the rail body uses `overflow-y-auto` and inherits the project-standard global scrollbar
  (6px wide, matching columns and the filter popover). No custom scrollbar CSS.

### PinItem

```text
button.pin-item (relative, w-8 h-8, rounded-md, border border-app, bg-app,
                 flex items-center justify-center, var(--fs-xs,11px) mono font-semibold text-muted,
                 hover: border-strong text-app)
├── PinCode "042"             (numeric part of ticketCode; mono; tabular-nums via .ticket-key convention)
├── UnpinButton ×             (absolute top-right; w-4 h-4; hidden until hover; read-only hides it)
└── (PinTooltip rendered via portal on hover)
```

- `32px` square (`w-8 h-8`), `rounded-md`. Default surface `--bg-elevated` (raised, like a card);
  default text `--text-muted`; hover border `--border-strong`, hover text primary.
- PinCode uses the **same font-size token as the board ticket card code** (`var(--fs-xs, 11px)` — see
  `.ticket-card__code` in `ticket.css`), so it tracks the density setting (comfortable `11px` /
  compact `10px`) instead of a hard-coded literal. This keeps the rail chip visually consistent with
  the card it came from.
- The chip shows **only the numeric part** of the ticket code (`042`, not `MDT-042`). This keeps the
  `32px` target legible. The project code lives in the tooltip — the disambiguator, not the chip.
- The × is `16px` (`w-4 h-4`), absolutely positioned at the item's top-right, revealed on pointer
  hover with a short fade. Its hit target is the full `16px` (one-tap unpin). Hidden in read-only.
- PinCode typography follows the `.ticket-key` convention (`STYLING.md`: mono / tabular-nums / 600,
  color-agnostic) so it inherits item color rather than forcing primary text.

### PinTooltip

A portaled hover tooltip (not a native `:title`). Native `:title` cannot carry the status badge and
cannot be styled; the AC requires priority + project code + ticket code + title + status, and status
is a badge.

```text
PinTooltip (portal to body; positioned beside the item)
├── TicketCode                      (canonical <TicketCode>: PriorityIcon glyph + "MDT-042", mono, primary text)
├── Title                           (ticket title, primary text, one line + ellipsis)
└── StatusBadge                     (reuses Badge data-status; same as card badge)
```

- **The ticket key is rendered via the canonical `<TicketCode>` component**
  (`src/components/TicketCode.tsx`) — the single source of the "priority glyph before key" invariant
  shared with the board card, list row, viewer, and QuickSearch. The tooltip must **never**
  hand-compose `<PriorityIcon> + code` (that is how surfaces drift out of sync — see the invariant
  docstring in `TicketCode.tsx`). Passing `priority={metadata?.priority}` drives the colored glyph;
  an undefined priority renders no glyph (graceful). This is constraint C-7.
- Appears on pointer hover after the standard hover delay (~300ms), disappears on pointer leave.
- Width: min-content up to ~`240px`; title truncates with ellipsis.
- Reuse the project's existing tooltip/HoverCard primitive if one exists (e.g. the
  `ProjectSelectorChip` hover card mechanism); otherwise a small dedicated `PinTooltip`. Do **not**
  invent a second tooltip system.

## Drag-and-Drop

The rail reuses the existing board DnD — drag type `'ticket'`, `HTML5Backend` — and adds a new drop
target. No new DnD library, no new drag type.

- **Drop target**: the whole `PinRail` — the open rail **and** the collapsed floating button both
  accept drops. There is no separate drop glyph; the rail surface itself is the target. Uses
  `useDrop({ accept: 'ticket', drop: item => onPin(item.ticket) })`.
- **Drop payload**: the dragged `{ ticket }` from `Column/index.tsx:73`. `onPin` builds a `PinItem`
  from `ticket.projectCode` + `ticket.code` + `now`, dedupes (replace `favoritedAt` if already
  pinned), and dispatches the whole-list `PUT /api/pins`.
- **Drop hover visual** (reuses the board's established pattern, `board-layout.spec.md`):
  `bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-400/30` on the rail while a ticket is dragged
  over it. No new hover vocabulary.
- **Empty-rail reveal**: when `pins.length === 0` and a board-card drag is in progress, the rail
  reveals itself (slides to `48px` as a floating overlay) so the user has a target to drop on — the
  `PinToggleButton` plus the empty rail surface. Outside a drag, an empty unpinned rail collapses to
  the floating button only and takes `0px`.
- **Read-only**: drop targets do not call the mutation API (`canWrite` false → drop is a no-op /
  ignored). The rail still renders pinned items and click-to-open still works. Mirrors the board's
  read-only DnD rule (`board-layout.spec.md`).

### Code Drift — DndProvider scope (must be resolved by implementation)

Today `DndProvider` is mounted **inside** `Board.tsx:631`, scoped to the board. The rail lives in
`App.tsx`, outside that context, so its `useDrop` would silently never fire. Implementation must
**lift `DndProvider` to `App.tsx`** (or to the content row) so both the board (drag source + column
drop targets) and the rail (drop target) share one DnD context. This is a required code change, not
a design option — without it, drag-to-pin cannot work. The board's existing behavior must remain
green (regression gate).

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| disabled | Settings → Board → Pin rail off | rail + floating button render nothing; `0px` footprint (feature removed) |
| collapsed | feature enabled, unpinned, pointer not over, no drag | a single floating pin-icon button (outline) at top-left, `opacity: 0.85` (→ 1 on hover); `0px` layout footprint; still a drop target |
| open (pinned) | feature enabled, pin toggle on (default) | full `48px` **docked** rail: pin-icon toggle (filled `--primary`) + items; no text label, no drop glyph |
| open (hover/drag) | unpinned but pointer hovered/focused, or a drag in progress | slides open to `48px` as a **floating overlay** (no column push); reverts to collapsed on pointer-leave/blur (unless dropped → pins + stays open) |
| empty-drop-target | a board card drag begins while collapsed + `pins.length === 0` | slides open at `48px` floating overlay; the rail surface + toggle are the drop target |
| drag-hover | a ticket is dragged over the rail | rail gains `bg-blue-50/50 ring-2 ring-blue-400/30` (board drop-hover pattern) |
| item-hover | pointer over a PinItem | item border → `--border-strong`, text → primary; UnpinButton × fades in; PinTooltip appears after delay |
| item-active (pinned) | successful drop → pin added | new PinItem inserts at top (recency-first), short highlight then settles |
| stale | a pinned ticket is deleted/out of scope | pin silently dropped on next sync; no error surface |
| offline-mutation | pin/unpin attempted while backend down | mutation fails; toast notification; rail reverts to last-known-good (no phantom pin) |
| read-only | `accessMode === 'read-only'` (or `canWrite === false`) | rail renders and click-to-open works; UnpinButton hidden; drag-drop no-op; no new pins accepted |
| cross-project | pins span ≥2 project codes | items render side by side in recency order; numeric codes may collide (e.g. two `042`) — tooltip disambiguates |

## Non-Functional / Performance Budget

| Requirement | Constraint | How the design satisfies it |
|-------------|-----------|-----------------------------|
| 50-pin render, no perceivable lag | rail renders ≤50 icon-only items | PinItem is a stateless `32px` button; no per-item image/network work; PinTooltip is portaled and lazily mounted on hover, not rendered for all items up front |
| No new runtime frontend deps | zero added dependencies | reuses `react-dnd` + `HTML5Backend` already in the board; reuses existing `Badge`, shared tooltip/HoverCard primitive; no icon library, no virtualization lib (50 items needs none) |
| Drag-to-pin does not regress board DnD | board status drag-drop unchanged | rail adds a `useDrop` target on the existing `'ticket'` drag type; lifting `DndProvider` to `App.tsx` widens the context but does not alter board source/target wiring. Regression gate: existing board drag-drop + status-change tests stay green |
| `/api/pins` response time ≈ document-favs | whole-list `PUT` replace, same shape as `/api/documents/favs` | same controller/service/repository layering; file-backed persistence. **Storage scope differs**: document-favs is per-project (`projects/{id}/document-favs.json`); pins are cross-project (one user-global `pins.json`), since each pin carries its own project code |


## Responsive

| Breakpoint | Rail |
|------------|------|
| `< 768px` (`< md`) | hidden entirely (`hidden md:flex`). No mobile rail in Phase 1 (FAB/sheet deferred). Drag-to-pin is desktop-only. |
| `≥ 768px` (`≥ md`) | full rail per Layout, when visible |

The rail is cross-view chrome: visible on board, list, and documents views (it is app-level, mounted
in `App.tsx`, not per-view). It is not affected by `viewMode`.

## Accessibility

- `PinRail` is a `<nav aria-label="Pinned tickets">` (it is a navigation surface to tickets).
- Each `PinItem` is a `<button>` with `aria-label` carrying the full identity even though the visible
  label is numeric-only: `aria-label="MDT-042: {title} ({status})"`. Screen readers get the
  disambiguation the tooltip gives sighted users.
- `UnpinButton` is a `<button>` with `aria-label="Unpin {projectCode}-{number}"`, rendered in the
  tab order when revealed (hover/focus reveal parity).
- `PinTooltip` is associated via `aria-describedby` so its content is available to AT without hover.
- Keyboard: `PinItem`s are focusable in recency order; `Enter`/`Space` opens the viewer; `Delete` or
  `Backspace` on a focused item unpins (keyboard parity with hover-×). Focus order: rail items →
  content.
- Read-only: pinned items remain focusable/openable; unpin is removed from the tab order.
- Drag-to-pin is a pointer interaction; a keyboard equivalent (e.g. an in-viewer "Pin" action) is
  out of scope for Phase 1 but the rail must not be the *only* way to pin for keyboard users — see
  Open Questions.

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| rail bg | `--bg-subtle` | recessed-soft nav-rail chrome |
| rail border | `var(--border)` (via `border-app`) | single right-edge structural border |
| item bg | `--bg-elevated` | raised chip surface (card-like) |
| item border | `var(--border)` → `--border-strong` (hover) | default → hover reveal |
| item text | `--text-muted` → primary (hover) | default → hover |
| code text | `.ticket-key` (mono / tabular-nums / 600); `var(--fs-xs, 11px)` | numeric code, color-agnostic; **same font-size token as the board ticket card code** (`.ticket-card__code`) |
| toggle (collapsed) | `opacity: 0.85` → `1` (hover/focus) | floating pin button recedes at rest, solid on interaction |
| drop hover | `--primary` (blue-400/30) | ring + tint on drag-over (board pattern) |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| rail | `.pin-rail` (new, in `PinRail/pin-rail.css`) | this surface |
| item | `.pin-item` (new) | this surface |
| code | `.ticket-key` | `STYLING.md` (mono convention) |
| tooltip | reuse shared tooltip/HoverCard primitive, or `.pin-tooltip` (new) | this surface |
| status badge | `Badge[data-status="…"]` | `BADGE_ARCHITECTURE.md` |
| drop hover | `draggable-ticket--dragging`-style ring (reuse board drop-hover utility) | `board-layout.spec.md` |

New classes are scoped under `.pin-rail` / `.pin-item` to avoid collisions. No global class
inventions.

## Extension notes

- **Document pins (Phase 2)**: add a document drag source (does not exist today), then render
  document pins in the same rail. The `PinItem` model gains a `kind: 'ticket' | 'document'` and a
  document-specific tooltip. Rail layout is unchanged.
- **Auto-populate (deferred)**: when the pin set is empty, optionally seed it with in-progress
  tickets. Per IDEA-002, only fills when empty and yields to manual changes. No layout change.
- **Auto-unpin on done (deferred)**: add a per-action toggle in the resolution dialog when a pinned
  ticket moves to the done column. Default "Unpin from bar". The rail is the consumer, not the owner.
- **Manual reorder (deferred)**: make PinItem draggable within the rail (`'pin'` drag type). Order
  becomes user-controlled; `favoritedAt` becomes a tiebreaker. State shape unchanged.
- **Hover card / preview (deferred)**: upgrade the tooltip to a richer hover card. Tooltip-only in v1.
- **Mobile (deferred)**: a FAB/sheet that surfaces the pin set on `< md`. Desktop rail unchanged.
- **Granular API (deferred)**: if whole-list `PUT` shows a concrete loss (e.g. concurrent edits),
  add `POST /api/pins` / `DELETE /api/pins/:key`. The client reducer already maps to whole-list
  replace, so this is additive.

## Open Questions (left for implementation)

- **Keyboard pin affordance**: drag-to-pin is pointer-only in Phase 1. A keyboard-accessible "Pin
  this ticket" action (e.g. in the TicketViewer header or a shortcut) is not specified here — it
  belongs to the ticket viewer surface, not the rail. Flag if the AC's "pin/unpin blocked in
  read-only" is read to require a keyboard pin path in v1.
- **Tooltip primitive**: reuse the existing `ProjectSelectorChip` hover-card mechanism vs. a small
  dedicated `PinTooltip`. Decide at implementation; both satisfy the AC.
- **DndProvider lift scope**: lift to `App.tsx` root vs. to the content row. Either works as long as
  both board and rail share the context; the board regression suite must stay green.
