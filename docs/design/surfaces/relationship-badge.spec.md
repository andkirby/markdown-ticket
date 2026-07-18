# Relationship Badge

Pill on a ticket card or in the ticket viewer that groups ticket links of one relationship type (`related`, `depends`, `blocks`) and navigates to the linked ticket on click.

Related artifacts:
- Review mockups: `relationship-badge.mockups.md`
- Parent surfaces: `ticket-card.spec.md`, `ticket-viewer.spec.md`
- Style contract: `BADGE_ARCHITECTURE.md`
- Sibling pattern: `context-badge.spec.md` — the `ContextBadge[phase]` (Epic) variant reuses the same `SmartLink` + `stopPropagation` contract for whole-string ticket keys in `phaseEpic` (MDT-193). Only the phase variant linkifies; assignee and worktree are plain text.

## Owns

- Rendering the icon and color for a relationship type (one badge per type).
- The display form of each link: full code, or elided number for same-project links.
- Compressing long link lists: first N inline, remaining behind a `+N` overflow trigger.
- Opening and closing the overflow popover, and routing clicks on its items.
- Stopping click propagation so parent card/viewer click handlers do not double-fire.

## Does Not Own

- Card-level layout, ordering, or wrapping — owned by `TicketAttributeTags` / `ticket-card.spec.md`.
- Badge color tokens — owned by `badge.css` data-attribute selectors (`BADGE_ARCHITECTURE.md`).
- Link href construction and same/cross-project classification — owned by `linkProcessor.ts` (`classifyLink`).
- CR key format and zero-padding — owned by `keyNormalizer.ts` (`formatCrKey`).
- Whether relationship badges are visible on a given card — owned by board badge preferences (`ticketCardBadges.ts`).

## Composition

```text
RelationshipBadge (one per type: related | depends | blocks)
├── Badge[data-relationship=type]
│   ├── span[icon]                 (🔗 | ⬅️ | ➡️)
│   ├── InlineLink × min(N, INLINE_MAX)
│   │   └── SmartLink (click → navigate, stopPropagation)
│   ├── span[", "] separator       (between inline links only)
│   └── OverflowTrigger (only when links.length > INLINE_MAX)
│       └── button["+N"] (click → open popover, stopPropagation)
└── Popover (only while overflow open)
    └── PopoverLink × (links.length − INLINE_MAX)
        └── SmartLink (click → navigate + close popover, stopPropagation)
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Badge shell | `src/components/ui/badge.tsx` | shadcn | always |
| SmartLink | `src/components/SmartLink/index.tsx` | — | per link |
| OverflowTrigger | inline `<button>` | this file | `links.length > INLINE_MAX` |
| Popover | shadcn `Popover` | — | `links.length > INLINE_MAX` and open |

## Source / Verification Anchors

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| Surface owner | `src/components/Badge/RelationshipBadge.tsx` | composition, elision, overflow, popover |
| Behavior model | this spec | click-stop, elision rule, overflow threshold |
| Style contract | `src/components/Badge/badge.css` (`data-relationship` selectors, lines 182–194) | relationship color identity |
| Link classification | `src/utils/linkProcessor.ts` (`classifyLink`, `LinkType.TICKET` vs `LinkType.CROSS_PROJECT`) | same/cross-project display decision |
| Key format | `shared/utils/keyNormalizer.ts` (`formatCrKey`) | zero-padded number extraction |
| Card click owner | `src/components/TicketCard.tsx` (`onClick={onEdit}`, line 45) | why stopPropagation is required |

## Display Rules

### Project-code elision

A link renders its **bare zero-padded number** when it belongs to the current project, and its **full CR key** when cross-project.

| Link data | Current project | Renders as |
|-----------|-----------------|------------|
| `MDT-030` | `MDT` | `030` |
| `MDT-1005` | `MDT` | `1005` |
| `VOC-005` | `MDT` | `VOC-005` |
| `abc-12` (any) | — | normalized full key |

Rules:

- Same/cross classification reuses `classifyLink` from `linkProcessor.ts`; do not reimplement the regex.
- Zero-padding is preserved so a bare number still reads as a ticket key, not an arbitrary integer. Extract the number segment from the full key (`split('-').pop()` on the normalized key), not from the raw input.
- Each link keeps a per-link `title` attribute carrying its **full CR key** (e.g. `MDT-030`) so hover reveals what was elided. The legacy single `title` on the whole badge is removed.
- **Surface scope**: elision applies **globally** — board card and TicketViewer alike — while `ELIDE_EVERYWHERE` is on (default). The `displayMode` prop is retained for a future per-surface settings override but is currently a no-op when `ELIDE_EVERYWHERE` is on. (UAT 2026-07-16: changed from board-only to global.)
- **Inline separator**: links render with no separator by default (`RELATIONSHIP_LINK_SEPARATOR = ''`). A non-empty value (e.g. `', '`) restores comma separation. Configured in `src/config/relationshipBadge.ts`.

### Overflow

| Constant | Value | Notes |
|----------|-------|-------|
| `INLINE_MAX` | 3 | Links shown inline before collapsing. Tunable. |

Behavior:

- When `links.length <= INLINE_MAX`: all links render inline, separated by `RELATIONSHIP_LINK_SEPARATOR` (default: no separator). No trigger, no popover.
- When `links.length > INLINE_MAX`: first `INLINE_MAX` links render inline; an OverflowTrigger renders `+N` where `N = links.length − INLINE_MAX`. The comma separator is **not** rendered before the trigger.
- Popover lists the remaining `N` links, each as a full-CR-key `SmartLink` regardless of same/cross status (the popover is the "show me everything" affordance), each with a `title` carrying the full key.
- Badge-level `title` tooltip in the overflow case lists **all** full keys joined by `, ` — so a quick hover still reveals the complete set without opening the popover.

### Display examples

| `links` | Current project | Board renders |
|---------|-----------------|---------------|
| `['MDT-030']` | `MDT` | `🔗 030` |
| `['MDT-030','MDT-005','MDT-035']` | `MDT` | `🔗 030 005 035` |
| `['MDT-030','MDT-005','MDT-035','MDT-040','MDT-041']` | `MDT` | `🔗 030 005 035 +2` |
| `['MDT-030','VOC-005','MDT-035']` | `MDT` | `🔗 030 VOC-005 035` |
| `['VOC-030','VOC-005','VOC-035']` | `MDT` | `🔗 VOC-030 VOC-005 VOC-035` |

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | `links.length <= INLINE_MAX` | inline links only |
| overflow-closed | `links.length > INLINE_MAX`, popover closed | inline links + `+N` button (no extra chrome) |
| overflow-open | click `+N` | popover anchored to trigger; trigger gets `[aria-expanded=true]` |
| hover (link) | mouse over an inline or popover link | link underlines; per-link `title` shows full key |
| hover (trigger) | mouse over `+N` | trigger background lifts (badge hover treatment) |
| disabled | board badge preference hides this type | badge not rendered (owned by parent) |

## Interaction

### Click propagation (critical)

The badge renders inside a clickable card (`TicketCard` opens the viewer via `onClick={onEdit}`, `TicketCard.tsx:45`). Every interactive descendant **must** stop propagation on click, exactly as the edit button does (`TicketCard.tsx:69–73`):

- Inline `SmartLink` click → `stopPropagation`, then navigate.
- OverflowTrigger click → `stopPropagation`, then toggle popover.
- Popover `SmartLink` click → `stopPropagation`, then navigate and close popover.

> Pre-existing bug to fix as part of this work: the current `SmartLink` (`src/components/SmartLink/index.tsx`) renders plain `<Link>`/`<a>` and does **not** stop propagation, so today a click on a relationship link both navigates and opens the card's viewer. Wrapping the badge's links in the propagation contract above resolves it for this surface; a separate decision is whether `SmartLink` itself should stop propagation globally.

### Popover behavior

- Open: click `+N` trigger. Focus moves to the first popover link.
- Close: `Escape`; outside click; or click of a popover link.
- While open, the trigger is `aria-expanded="true"` and `aria-controls` the popover.
- Keyboard: `Tab` cycles popover links; `Shift+Tab` reverses; `Escape` returns focus to the trigger.
- One popover open per badge. Opening a second badge's popover does not close the first (badges are independent), but within one badge only one popover exists.

## Layout

- Badge shell inherits `.badge[data-relationship=type]` from `badge.css` (cyan / amber / rose gradients).
- Icon `mr-1`; links inline with `mx-1` comma separators (matches current spacing, `RelationshipBadge.tsx:56–67`).
- `+N` trigger is a `<button>` styled to read as part of the badge — same text style, no border, `hover:underline`, `aria-haspopup="dialog"`, `aria-expanded`.
- Popover width: auto, min 8rem; items render as a vertical list, each a single-line `SmartLink`.

## Semantic Style Anchors

| Element | Semantic Anchor | Contract |
|---------|-----------------|----------|
| badge color | `.badge[data-relationship="related\|depends\|blocks"]` | relationship type identity (badge.css) |
| inline link | `.smart-link[data-link-type="ticket\|cross-project"]` | same/cross hint via existing SmartLink data attr |
| overflow trigger | proposed `.relationship-badge__overflow` | inline button reads as badge content, not a separate control |

The overflow trigger is the only proposed new class. It cannot reuse an existing class because it is an inline button masquerading as badge text (no border, no standalone padding) — distinct from the edit button (`.ticket-card__edit`, which is a revealed affordance) and from shadcn button variants.

## Responsive

Relationship badges inherit the card's `flex-wrap` row; no badge-specific breakpoints. On narrow columns the row wraps to additional lines as today — overflow compression is what keeps each badge short so wrapping stays rare.

## Extension Notes

- `INLINE_MAX` is a single constant; tuning it changes only how many links show before `+N`.
- Elision rule is data-driven from `classifyLink`. If a new link source produces a type other than `TICKET`/`CROSS_PROJECT`, fall back to rendering the full key.
- A future "relationship badge visibility" preference (per type, per surface) would slot into `ticketCardBadges.ts`, not here.
- Do not add hover-to-expand. It is inaccessible (keyboard/touch), conflicts with the card's hover-lift animation, and is undiscoverable. Overflow is click-driven.
- Do not split one relationship type into one-pill-per-link. The grouping is the information; per-link pills multiply icon noise and lose the semantic group. Each link is already individually clickable inside the single badge.
