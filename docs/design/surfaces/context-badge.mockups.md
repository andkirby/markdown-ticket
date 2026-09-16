# Context Badge — Wireframe Schema

Related spec: `context-badge.spec.md`
Parent surfaces: `ticket-card.spec.md`, `ticket-viewer.spec.md`

Wireloom is structural. It cannot render the actual badge gradients (`badge.css` `data-context` selectors) or the `SmartLink` link color (`smart-link.css` `[data-link-type]`), so color and gradient identity live in the spec and `BADGE_ARCHITECTURE.md`, not here. Each mockup isolates a single badge; the rest of the card chrome is omitted (see `ticket-card.mockups.md` for full-card context).

The MDT-193 change is the contrast between the **phase plain text** and **phase link** states below. Assignee and worktree are shown for completeness and did not change.

## Phase — Plain Text (Baseline)

Board card scoped to project `MDT`. `phaseEpic` is a prose label, not a ticket key — renders as plain text inside the pill. This is the unchanged behavior for prose values.

```wireloom
window "Phase — plain text":
  panel:
    row:
      chip "Phase A (Foundation)" id="phase-prose"

annotation "phaseEpic='Phase A (Foundation)'.\nNot a ticket-key shape → plain text.\nNo link, default text color." target="phase-prose" position=top
```

## Phase — Ticket Key Link (MDT-193)

Board card scoped to project `MDT`. `phaseEpic` is a whole-string ticket key — the pill content renders as a link. Visual chrome is identical to plain text; only the value text becomes a `SmartLink`.

```wireloom
window "Phase — ticket key link":
  panel:
    row:
      chip "MDT-187" id="phase-link"

annotation "phaseEpic='MDT-187'.\nWhole-string ticket key → SmartLink.\nclick → navigate to /prj/MDT/ticket/MDT-187.\nclick also stopPropagation so parent card onClick\ndoes not open the card viewer.\nVisually: purple text, hover underline." target="phase-link" position=top
```

## Phase — Suffix Variants Still Link

`.md` and `#anchor` suffixes are tolerated by `classifyLink` and still linkify. Display text includes the suffix.

```wireloom
window "Phase — suffix variants":
  panel:
    row:
      chip "MDT-187.md" id="phase-md"
      chip "MDT-187#section" id="phase-anchor"

annotation "MDT-187.md and MDT-187#section\nboth classify as TICKET → link.\nDisplay string includes the suffix." target="phase-md" position=top
```

## Phase — Embedded Reference Stays Plain Text

The boundary: a ticket key embedded in prose does **not** linkify. Only whole-string matches link.

```wireloom
window "Phase — embedded ref (out of scope)":
  panel:
    row:
      chip "Epic: MDT-187" id="phase-embedded"

annotation "phaseEpic='Epic: MDT-187'.\nNot a whole-string key → plain text.\nEmbedded-ref linkification is a non-goal\n(see spec 'Phase linking contract')." target="phase-embedded" position=top
```

## Phase — Cross-Project Edge Case

Board scoped to `MDT`; `phaseEpic` is `ABC-012`. The value linkifies (it is a whole-string key) but resolves against the **current** project route, not project `ABC`. Pre-existing `classifyLink` limitation shared with the relationship badge.

```wireloom
window "Phase — cross-project edge case":
  panel:
    row:
      chip "ABC-012" id="phase-cross"

annotation "ABC-012 is a whole-string key → link.\nBUT resolves to /prj/MDT/ticket/ABC-012 (current\nproject), not /prj/ABC/ticket/ABC-012.\nPre-existing classifyLink limitation, not an\nMDT-193 regression. Documented in spec." target="phase-cross" position=top
```

## Assignee Variant (Unchanged)

For completeness. Plain text only, never links.

```wireloom
window "Assignee — plain text":
  panel:
    row:
      chip "john" id="assignee"

annotation "Assignee value renders as plain text.\nNever linkified (no username classifier).\nNo MDT-193 change." target="assignee" position=top
```

## Worktree Variant (Unchanged)

For completeness. Visible text is the literal word "worktree"; the path is exposed only via the badge `title` tooltip.

```wireloom
window "Worktree — literal label":
  panel:
    row:
      chip "worktree" id="worktree"

annotation "Visible text: literal 'worktree'.\ntitle attr carries the full worktreePath.\nNever linkified. No MDT-193 change." target="worktree" position=top
```

## Phase — Split Chip (Detail Surfaces, MDT-246)

In the ticket viewer header or ticket attributes panel, a linkable epic reference renders as a split chip: an identity zone (passive Zap + key link, unchanged from MDT-193) and a trailing action zone that jumps to the Epics board focused on that epic. Wireloom is structural — the seam, rest veil, and 24×24 floor are owned by `context-badge.spec.md` § "Split chip" and the styleguide section.

```wireloom
window "Phase — split chip (viewer / attributes)":
  panel:
    row:
      chip "⚡ MDT-187" id="split-identity"
      button "▤" id="split-action"

annotation "Identity zone: passive Zap glyph + SmartLink.\nclick → open epic ticket viewer (unchanged, MDT-193).\nZap is never a click target." target="split-identity" position=top
annotation "Action zone: real button, 24×24 minimum,\nrows-3 glyph, seam-separated.\nclick → /prj/MDT/epics?epic=MDT-187\n(focus lifecycle: epic-navigation.interactions.md)." target="split-action" position=right
```

## Phase — Board Card Stays Compact (MDT-246)

On board cards the linkable phase value keeps the single-zone pill: cards are scan surfaces, the card itself already owns "open" as the click action, and a 24px target per card would inflate card height.

```wireloom
window "Phase — board card (no action zone)":
  panel:
    row:
      chip "⚡ MDT-187" id="card-identity"

annotation "Board card: identity zone only.\nSame click as MDT-193 — opens the epic ticket viewer.\nThe action zone renders only in detail surfaces\n(viewer header, ticket attributes)." target="card-identity" position=top
```
