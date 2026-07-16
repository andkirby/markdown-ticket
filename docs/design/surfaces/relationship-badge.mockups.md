# Relationship Badge — Wireframe Schema

Related spec: `relationship-badge.spec.md`
Parent surfaces: `ticket-card.spec.md`, `ticket-viewer.spec.md`

Wireloom is structural. It cannot render the actual badge gradients (`badge.css` `data-relationship` selectors) or the precise `+N` inline-button styling, so color and gradient identity live in the spec and `BADGE_ARCHITECTURE.md`, not here. Each mockup isolates the relationship row; the rest of the card chrome is omitted (see `ticket-card.mockups.md` for full-card context).

Relationship icons (unchanged from current): `related` = 🔗, `depends` = ⬅️, `blocks` = ➡️.

## Same-Project, Single Link (Baseline Elision)

Board card scoped to project `MDT`. One same-project related link renders as a bare zero-padded number.

```wireloom
window "Relationship — same-project, 1 link":
  panel:
    row:
      chip "🔗 030" id="rel-single"

annotation "Same-project link shows bare number, not MDT-030.\ntitle attr carries full key: 'MDT-030'." target="rel-single" position=top
```

## Same-Project, Inline (No Overflow)

Three same-project links — exactly at `INLINE_MAX`, so all render inline with no `+N` trigger.

```wireloom
window "Relationship — same-project, at limit":
  panel:
    row:
      chip "🔗 030, 005, 035" id="rel-at-limit"

annotation "3 links = INLINE_MAX. No +N trigger yet.\nBadge-level title lists all full keys." target="rel-at-limit" position=right
```

## Mixed Same- and Cross-Project

Board scoped to `MDT`; the middle link is `VOC-005`. Same-project links elide; the cross-project link keeps its full code.

```wireloom
window "Relationship — mixed projects":
  panel:
    row:
      chip "🔗 030, VOC-005, 035" id="rel-mixed"

annotation "Same-project → bare number.\nCross-project → full CR key (VOC-005).\nEach link keeps its own title with the full key." target="rel-mixed" position=top
```

## Overflow, Popover Closed (Drift Case from Screenshot)

Five same-project related links — the case that triggered this redesign. First three render inline (elided); the remaining two collapse into a `+N` trigger. This is the contract for the screenshot's `🔗 VOC-030, VOC-005, VOC-035, VOC-040, VOC-041` row, shown here scoped to `MDT`.

```wireloom
window "Relationship — overflow closed":
  panel:
    row:
      chip "🔗 030, 005, 035 +2" id="rel-overflow"

annotation "links.length (5) > INLINE_MAX (3).\nInline: first 3, elided.\n+2 = 5 − 3. No comma before +N.\nBadge title carries all 5 full keys." target="rel-overflow" position=top
```

## Overflow, Popover Open

User clicked `+2`. Popover anchors to the trigger and lists the remaining links as full CR keys, each navigable.

```wireloom
window "Relationship — popover open":
  panel:
    row:
      chip "🔗 030, 005, 035 +2" id="rel-trigger-expanded"
  sheet position=center title="Related tickets (2 hidden)":
    row:
      text "MDT-040" id="popover-link-1"
    row:
      text "MDT-041" id="popover-link-2"

annotation "Trigger: aria-expanded=true, aria-controls popover." target="rel-trigger-expanded" position=top
annotation "Each item is a SmartLink: full CR key, click → navigate + close popover + stopPropagation.\nFocus enters here on open; Escape returns focus to trigger." target="popover-link-1" position=right
```

## All Three Relationship Types (Board)

Shows the three badge colors side by side in one card row, each with realistic counts. Colors are not rendered by Wireloom; see `badge.css` (`related` = cyan, `depends` = amber, `blocks` = rose).

```wireloom
window "Relationship — three types":
  panel:
    row:
      chip "🔗 030, 005, 035 +2" id="rel-multi"
      chip "⬅️ 012" id="dep-multi"
      chip "➡️ VOC-200" id="blk-multi"

annotation "related — cyan. depends — amber. blocks — rose.\nEach badge independent; +N popover per badge." target="rel-multi" position=top
```

## Ticket Viewer (Full Codes, No Elision)

In the TicketViewer the surface is the detail view and has room, so **all** relationship links render as full CR keys with no elision and no overflow compression. This is the explicit board/viewer divergence.

```wireloom
window "Relationship — ticket viewer":
  panel:
    row:
      chip "🔗 MDT-030, MDT-005, MDT-035, MDT-040, MDT-041" id="viewer-rel"
    row:
      chip "⬅️ MDT-012" id="viewer-dep"

annotation "Viewer: full CR keys for every link, same- and cross-project.\nNo +N compression in the viewer even when > INLINE_MAX.\nLinks still stopPropagation within the viewer shell if it is click-to-close." target="viewer-rel" position=top
```

## Annotations

| Element | Token / Class | Notes |
|---------|---------------|-------|
| Badge color | `.badge[data-relationship="related\|depends\|blocks"]` | cyan / amber / rose gradients (badge.css) |
| Inline link | `.smart-link[data-link-type="ticket\|cross-project"]` | existing SmartLink data attr; underline on hover |
| Per-link tooltip | `title="MDT-030"` | full CR key always available on hover, even when elided |
| Badge-level tooltip (overflow) | `title="MDT-030, MDT-005, MDT-035, MDT-040, MDT-041"` | all full keys; quick scan without opening popover |
| Overflow trigger | proposed `.relationship-badge__overflow` | inline `<button>` styled as badge text; `aria-haspopup="dialog"`, `aria-expanded` |
| Popover | shadcn `Popover` | anchors to trigger; full-CR-key SmartLinks; Escape / outside-click / item-click closes |
| Board vs viewer | — | Board elides + compresses; viewer shows full codes, no compression |

## Decisions Captured (from review)

- **One badge per relationship type**, not one pill per link. The grouping is the information; per-link pills lose the group and multiply icon noise. Each link is already individually clickable inside the single badge.
- **Click `+N` → popover** for overflow. Not hover-expand: hover is inaccessible to keyboard/touch, conflicts with the card's existing hover-lift animation, and is undiscoverable.
- **Board-only elision.** Same-project links show bare zero-padded numbers on the board; cross-project keep full codes. The viewer keeps full codes everywhere.
- **`stopPropagation` on every interactive child** — inline links, the `+N` trigger, and popover links — mirroring the card's existing edit-button pattern (`TicketCard.tsx:69–73`). Fixes a pre-existing double-fire where clicking a relationship link today both navigates and opens the card viewer.
