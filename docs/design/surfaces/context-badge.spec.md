# Context Badge

Pill on a ticket card or in the ticket viewer that shows a single piece of per-ticket context — the phase/epic label, the assignee, or the worktree indicator. The phase variant renders a whole-string ticket key as an in-app link.

Related artifacts:
- Review mockups: `context-badge.mockups.md`
- Parent surfaces: `ticket-card.spec.md`, `ticket-viewer.spec.md`
- Style contract: `BADGE_ARCHITECTURE.md`
- Sibling pattern: `relationship-badge.spec.md` — phase linking reuses the same `SmartLink` + `stopPropagation` contract as relationship links.

## Owns

- Rendering one of three context variants (`phase`, `assignee`, `worktree`) inside a shared `Badge[data-context=variant]` shell.
- Phase variant: deciding whether `value` is a whole-string ticket key and, if so, rendering it as a `SmartLink` instead of plain text.
- Phase variant: stopping click propagation so a parent card/viewer click handler does not double-fire on link navigation.
- Worktree variant: showing the literal word "worktree" with the path in the `title` tooltip.

## Does Not Own

- Badge color tokens — owned by `badge.css` data-attribute selectors (`BADGE_ARCHITECTURE.md`).
- Link href construction and same/cross-project classification — owned by `linkProcessor.ts` (`classifyLink`). ContextBadge consumes the result; it does not redefine what counts as a ticket reference.
- Card-level layout, ordering, or wrapping — owned by `TicketAttributeTags` / `ticket-card.spec.md`.
- Whether each context badge is visible on a given card — owned by board badge preferences (`ticketCardBadges.ts`).
- Elision, overflow, and `+N` collapse — owned by `relationship-badge.spec.md`. ContextBadge renders exactly one value.
- True cross-project routing for the phase link. `classifyLink` classifies any `XXX-NNN` whole string as `TICKET` and resolves it against the current project route; this is a pre-existing limitation shared with the relationship badge, not owned here.

## Composition

```text
ContextBadge (one per variant)
└── Badge[data-context=phase|assignee|worktree]
    ├── Variant: phase + linkable value
    │   └── span (click → stopPropagation)
    │       └── SmartLink (click → navigate)
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

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Badge shell | `src/components/ui/badge.tsx` | shadcn | always |
| SmartLink | `src/components/SmartLink/index.tsx` | — | phase variant + linkable value only |

## Source / Verification Anchors

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| Surface owner | `src/components/Badge/ContextBadge.tsx` | composition, phase-link decision, variant dispatch |
| Behavior model | `src/utils/linkProcessor.ts` (`classifyLink`) | defines what counts as a linkable ticket key — the phase variant's source of truth for the boundary |
| Style contract | `src/components/Badge/badge.css` (`.badge[data-context="phase\|assignee\|worktree"]`) | per-variant color identity |
| Link style | `src/components/SmartLink/smart-link.css` (`.smart-link[data-link-type]`) | semantic link color when the phase value linkifies |
| Unit verification | `src/components/Badge/ContextBadge.test.tsx` | link-vs-plain-text decision across value shapes; propagation |
| E2E verification | `tests/e2e/board/epic-badge-link.spec.ts` | phase link navigates end-to-end on the board |

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| phase plain text | `phaseEpic` is not a ticket-key shape | pill, value in default text color |
| phase link | `phaseEpic` is a whole-string ticket key | pill, value as `SmartLink` (purple, hover-underline) |
| assignee | any non-empty `assignee` | pill, plain text |
| worktree | `worktreePath` present | pill, literal "worktree"; `title` carries the full path |
| empty | `value` missing | the parent call site hides the badge — ContextBadge is not rendered |
| ticket links disabled | global `enableTicketLinks=false` | phase link falls back to plain text (delegated to `SmartLink`) |

## Layout

- Shared `Badge` pill chrome for all variants (border, rounded-full, compact padding — owned by `badge.css`).
- The phase link, when present, fills the pill content; no extra padding or margin around the `SmartLink`.
- No icon is shown on the phase link (`showIcon={false}`), keeping the pill visually identical whether the value is a link or plain text.

## Accessibility

- Phase link: the `SmartLink` anchor is keyboard-focusable and announces as a link to the referenced ticket.
- Worktree variant: the path is exposed via the `title` attribute on the badge, not as visible text (the visible text is the literal word "worktree").
- The phase link's `stopPropagation` span does not trap focus or intercept keyboard events — it only prevents the parent click handler from firing on mouse click.

## Extension notes

- If a future surface needs the assignee variant to link to a user profile, do not add linking to ContextBadge directly — `classifyLink` does not classify usernames. Either introduce a new variant with its own resolver or extend `classifyLink`.
- If true cross-project routing becomes required for the phase link, the fix belongs in `classifyLink` (reorder the ticket/cross-project regex checks), not in this surface. See MDT-193 §6 for the two documented fix options.
- If embedded-ref linkification (e.g. `"Epic: MDT-187"` → link inside prose) is later required, it is a separate concern owned by tokenization, not by this single-value badge.
