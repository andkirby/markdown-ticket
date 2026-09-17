# Context Badge

Pill on a ticket card or in the ticket viewer that shows a single piece of per-ticket context — the phase/epic label, the assignee, or the worktree indicator. The phase variant renders a whole-string ticket key as an in-app link; in detail surfaces the linkable phase value renders as a split chip whose trailing action zone jumps to the Epics board focused on that epic (MDT-246).

Related artifacts:
- Review mockups: `context-badge.mockups.md`
- Journey contract: `epic-navigation.interactions.md` (entry point, `?epic=` token, focus lifecycle)
- Parent surfaces: `ticket-card.spec.md`, `ticket-viewer.spec.md`
- Style contract: `BADGE_ARCHITECTURE.md`, `frontend/src/styleguide.html` § "epic badge · split chip"
- Sibling pattern: `relationship-badge.spec.md` — phase linking reuses the same `SmartLink` + `stopPropagation` contract as relationship links.

## Owns

- Rendering one of three context variants (`phase`, `assignee`, `worktree`) inside a shared `Badge[data-context=variant]` shell.
- Phase variant: deciding whether `value` is a whole-string ticket key and, if so, rendering it as a `SmartLink` instead of plain text.
- Phase variant, detail surfaces (ticket viewer header, ticket attributes): rendering the split chip — identity zone (passive Zap + key link) plus trailing action zone — when the value is linkable. See "Split chip" below.
- Phase variant: stopping click propagation so a parent card/viewer click handler does not double-fire on link navigation.
- Worktree variant: showing the literal word "worktree" with the path in the `title` tooltip.

## Does Not Own

- Badge color tokens — owned by `badge.css` data-attribute selectors (`BADGE_ARCHITECTURE.md`).
- Link href construction and same/cross-project classification — owned by `linkProcessor.ts` (`classifyLink`). ContextBadge consumes the result; it does not redefine what counts as a ticket reference.
- Card-level layout, ordering, or wrapping — owned by `TicketAttributeTags` / `ticket-card.spec.md`.
- Whether each context badge is visible on a given card — owned by board badge preferences (`ticketCardBadges.ts`).
- Elision, overflow, and `+N` collapse — owned by `relationship-badge.spec.md`. ContextBadge renders exactly one value.
- The jump destination and `?epic=` token semantics — owned by `epic-navigation.interactions.md`. The action zone navigates; it does not define what arrival means.
- Whether the split chip renders on a given surface — this spec renders the action zone only in detail surfaces (viewer header, ticket attributes); board cards keep the compact single-zone badge because cards are scan surfaces (see "Split chip").
- True cross-project routing for the phase link. `classifyLink` classifies any `XXX-NNN` whole string as `TICKET` and resolves it against the current project route; this is a pre-existing limitation shared with the relationship badge, not owned here.

## Composition

```text
ContextBadge (one per variant)
└── Badge[data-context=phase|assignee|worktree]
    ├── Variant: phase + linkable value, detail surface (MDT-246 split chip)
    │   ├── span.badge__id (identity zone)
    │   │   ├── Zap glyph (aria-hidden, passive — never a click target)
    │   │   └── span (click → stopPropagation)
    │   │       └── SmartLink (click → open epic ticket viewer)
    │   └── button.badge-action (action zone, click → stopPropagation → jump)
    ├── Variant: phase + linkable value, board card
    │   └── span (click → stopPropagation)
    │       └── SmartLink (click → navigate) — no action zone
    └── Any other case
        └── plain text node
```

## Variants

| Variant | `value` source | Render | Link? |
|---------|----------------|--------|-------|
| `phase` | `ticket.phaseEpic` | The raw string | Yes, when the whole string is a ticket key shape |
| `assignee` | `ticket.assignee` | The raw string | Never |
| `worktree` | `ticket.worktreePath` | Literal "worktree" | Never |

## Phase linking contract

The phase variant is the only variant that can render a link. The decision is delegated entirely to `classifyLink(value, currentProject)`:

| `phaseEpic` value | `classifyLink` result | Render |
|---|---|---|
| `MDT-187` | `TICKET` | `<SmartLink data-link-type="ticket">` → navigates |
| `MDT-187.md` | `TICKET` | link (suffix tolerated) |
| `MDT-187#section` | `TICKET` | link (anchor preserved) |
| `Phase A (Foundation)` | `UNKNOWN` | plain text |
| `Epic: MDT-187` | `UNKNOWN` | plain text (embedded refs are out of scope) |
| `TEST-` | `UNKNOWN` | plain text (malformed) |

Boundary: only whole-string matches linkify. Embedded ticket references inside prose do not linkify — this is a deliberate scope limit, not a bug. The boundary is set by the anchored regexes in `classifyLink`, not by this surface.

Cross-project note: `ABC-012` viewed from a non-`ABC` project linkifies but resolves against the **current** project route, not `ABC` — the pre-existing `classifyLink` ordering limitation shared with the relationship badge.

## Split chip (epic jump, MDT-246)

In detail surfaces, a linkable phase value renders as **one unit with two separately interactive zones**:

| Zone | Contents | Action |
|---|---|---|
| Identity | passive Zap glyph + key link (`SmartLink`) | opens the epic ticket viewer — unchanged from MDT-193 |
| Action | trailing button, `rows-3` glyph, seam-separated | jumps to `/prj/:code/epics?epic=KEY` (contract in `epic-navigation.interactions.md`) |

- **Surfaces**: ticket viewer header (`CompactTicketHeader`) and ticket attributes panel. Board cards keep the compact single-zone badge — cards are scan surfaces; a 24px target per card would inflate card height for an action the card itself already owns (click = open).
- **Hit target** (user ruling 2026-09-16; supersedes the 2026-09-13 "badge grows ~4px" geometry note): every badge on every surface renders at the same height — the canonical 20px badge box — and the split chip is no exception. The action zone is a real button whose visible box is that same 20px; the MDT-236 24×24 a11y floor is still required and is met by an invisible hit surface (2px `::after` expansion above/below the button, vertical-only so it never reaches the key link), not by the visible box. The Zap never becomes a click target — measured rejection in `frontend/src/styleguide.html` § "epic badge · split chip" (12×12 glyph, 4px from a competing link, misroute with no back).
- **Zone legibility**: 1px seam derived from the badge's own color (`currentColor`), plus a half-strength neutral veil at rest (`color-mix 45% --bg-muted`); hover completes to the full neutral tier (`--state-hover-bg`). A bare hover-token swap measured invisible against the gold tint in dark mode.
- **Structure**: the zones are siblings inside the badge — never a button nested inside a link.

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Badge shell | `frontend/src/components/ui/badge.tsx` | shadcn | always |
| SmartLink | `frontend/src/components/SmartLink/index.tsx` | — | phase variant + linkable value only |
| Split-chip action zone | inline button (`.badge-action`) | this file | phase variant + linkable value + detail surface only (MDT-246) |

## Source / Verification Anchors

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| Surface owner | `frontend/src/components/Badge/ContextBadge.tsx` | composition, phase-link decision, variant dispatch |
| Behavior model | `frontend/src/utils/linkProcessor.ts` (`classifyLink`) | defines what counts as a linkable ticket key — the phase variant's source of truth for the boundary |
| Style contract | `frontend/src/components/Badge/badge.css` (`.badge[data-context="phase\|assignee\|worktree"]`) | per-variant color identity |
| Link style | `frontend/src/components/SmartLink/smart-link.css` (`.smart-link[data-link-type]`) | semantic link color when the phase value linkifies |
| Unit verification | `frontend/src/components/Badge/ContextBadge.test.tsx` | link-vs-plain-text decision across value shapes; propagation |
| E2E verification | `tests/e2e/board/epic-badge-link.spec.ts` | phase link navigates end-to-end on the board |
| Pattern contract | `frontend/src/styleguide.html` § "epic badge · split chip" | zone geometry, hover ladder, rejected bare-glyph variant |
| Journey contract | `docs/design/surfaces/epic-navigation.interactions.md` | action-zone destination and focus lifecycle |

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| phase plain text | `phaseEpic` is not a ticket-key shape | pill, value in default text color |
| phase link | `phaseEpic` is a whole-string ticket key | pill, value as `SmartLink` (purple, hover-underline) |
| split chip (detail) | linkable phase value, viewer/attributes surface | same 20px pill height as every badge (24×24 hit surface is invisible, not visible box); identity zone + seam + action zone (rest veil); key hover stays on the text, action hover = neutral tier |
| split chip action focus | keyboard/pointer focus on action zone | action zone shows the full neutral tier; key link unaffected |
| assignee | any non-empty `assignee` | pill, plain text |
| worktree | `worktreePath` present | pill, literal "worktree"; `title` carries the full path |
| empty | `value` missing | the parent call site hides the badge — ContextBadge is not rendered |
| ticket links disabled | global `enableTicketLinks=false` | phase link falls back to plain text (delegated to `SmartLink`) |

## Layout

- Shared `Badge` pill chrome for all variants (border, rounded-full, compact padding — owned by `badge.css`).
- The phase link, when present, fills the pill content; no extra padding or margin around the `SmartLink`.
- No icon is shown on the phase link (`showIcon={false}`), keeping the pill visually identical whether the value is a link or plain text.
- Split chip (detail surfaces): the action zone fills the badge's trailing edge (flush right, own corner rounding on the outer side); identity zone keeps the normal badge padding.

## Accessibility

- Phase link: the `SmartLink` anchor is keyboard-focusable and announces as a link to the referenced ticket.
- Split chip: two tab stops with distinct names — "Open epic {KEY}" (link) and "Show {KEY} on Epics board" (button). The Zap glyph stays `aria-hidden`; it is never given an accessible name or a click target.
- Worktree variant: the path is exposed via the `title` attribute on the badge, not as visible text (the visible text is the literal word "worktree").
- The phase link's `stopPropagation` span does not trap focus or intercept keyboard events — it only prevents the parent click handler from firing on mouse click.

## Extension notes

- If a future surface needs the assignee variant to link to a user profile, do not add linking to ContextBadge directly — `classifyLink` does not classify usernames. Either introduce a new variant with its own resolver or extend `classifyLink`.
- If true cross-project routing becomes required for the phase link, the fix belongs in `classifyLink` (reorder the ticket/cross-project regex checks), not in this surface. See MDT-193 §6 for the two documented fix options.
- If embedded-ref linkification (e.g. `"Epic: MDT-187"` → link inside prose) is later required, it is a separate concern owned by tokenization, not by this single-value badge.
