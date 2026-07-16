---
code: MDT-187
status: Implemented
dateCreated: 2026-07-16T10:08:02.416Z
type: Feature Enhancement
priority: Medium
---

# Compact relationship badges with elision and overflow

## 1. Description

### Requirements Scope

`full`

### Problem

- Ticket cards with many relationship links (e.g. 5+ related tickets) crowd the badge row, wrapping to multiple lines and pushing other badges down — visible in the MDT-135 RelationshipBadge as of July 2026.
- Every link repeats the project code prefix (e.g. `VOC-030, VOC-005, VOC-035...`) even though the board is scoped to a single project, making the prefix redundant noise.
- Clicking a relationship link today both navigates and opens the parent card's viewer (pre-existing double-fire), because link clicks bubble to the card's `onClick`.

### Affected Areas

- Frontend: ticket card relationship badges (board surface) and relationship links in the TicketViewer

### Scope

- **In scope**:
  - Same-project link elision on the board (bare zero-padded number; cross-project keeps full code)
  - Overflow compression (`+N` trigger → popover) for relationship lists beyond a threshold
  - Per-link `title` tooltips carrying full CR keys
  - Click-stop (stopPropagation) for relationship link clicks on the card
  - Board/viewer divergence: board elides + compresses; viewer shows full codes
- **Out of scope**:
  - Changing relationship badge color tokens (owned by `badge.css` / `BADGE_ARCHITECTURE.md`)
  - New relationship types beyond `related`/`depends`/`blocks`
  - Board badge visibility preferences (owned by `ticketCardBadges.ts`)
  - Global decision on whether `SmartLink` itself stops propagation — scoped to relationship badge usage only

### Authoritative UX Contract

The full UX specification already exists and is the source of truth for this CR:

- Spec: `docs/design/surfaces/relationship-badge.spec.md`
- Mockups: `docs/design/surfaces/relationship-badge.mockups.md`

Implementation must conform to these. The spec defines elision rules, overflow threshold (`INLINE_MAX = 3`), popover behavior, and the click-stop contract. Parent surface docs were updated in the same session: `ticket-card.spec.md` and `ticket-card.mockups.md`.

## 2. Desired Outcome

### Success Conditions

- When a relationship link points to the current project on the board, it renders as a bare zero-padded number (e.g. `030`), not a full CR key.
- When a relationship link is cross-project, it renders its full CR key (e.g. `VOC-005`) on both board and viewer.
- When a relationship list exceeds `INLINE_MAX` (3), the remaining links collapse behind a `+N` trigger that opens a popover listing the hidden links as full CR keys.
- When the user clicks any relationship link inside a card, only navigation occurs — the card's viewer-open handler does not also fire.
- When the user hovers any relationship link, the full CR key is available via a per-link tooltip.
- When the same ticket is viewed in the TicketViewer, all relationship links render as full CR keys with no elision or compression.

### Constraints

- Must reuse `classifyLink` (`src/utils/linkProcessor.ts`) for same/cross-project classification — do not reimplement the regex.
- Must reuse `formatCrKey` / zero-padding semantics from `shared/utils/keyNormalizer.ts` when extracting the number segment.
- Must reuse existing `.badge[data-relationship]` selectors in `badge.css`; no new badge color tokens.
- Overflow trigger must be an accessible `<button>` (`aria-haspopup`, `aria-expanded`); popover must close on Escape, outside click, and item click; focus returns to trigger on close.
- Board hover-lift animation on the card must not be disturbed (no hover-to-expand on the badge).
- Must mirror the existing `stopPropagation` precedent used by the card's edit button (`TicketCard.tsx` lines 69-73).

### Non-Goals

- Not changing relationship badge colors, icons, or ordering relative to other badges.
- Not adding new relationship types (parent/child/epic).
- Not altering how `SmartLink` behaves outside the relationship badge context.
- Not changing board badge visibility configuration.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Architecture | How to extract the bare number from a link while preserving zero-padding for multi-digit tickets (e.g. `MDT-1005` → `1005`)? | Reuse `keyNormalizer.ts`; zero-padding must survive |
| Architecture | Should the overflow popover be one shadcn `Popover` per badge, or a shared portal? | One popover open per badge; independent across badges |
| Architecture | Where should `stopPropagation` live — wrapper around `SmartLink` in the badge, or a new prop on `SmartLink`? | Scoped to relationship badge usage only; do not change global SmartLink behavior without separate decision |
| Architecture | How to share the relationship-badge component between board (elided) and viewer (full codes) without duplication? | Single component, surface-driven display mode |

### Known Constraints

- UX contract is finalized in `relationship-badge.spec.md`; architecture must conform, not redesign.
- `INLINE_MAX = 3` is the agreed threshold (tunable later).
- Elision is board-only; viewer shows full codes.

### Decisions Deferred

- Implementation approach for popover composition and focus management (determined by `mdt:architecture`)
- Whether `SmartLink` should stop propagation globally (separate CR if pursued)
- Task breakdown (determined by `mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)

- [x] A board card with one same-project relationship link shows `🔗 030` (elided), with a hover tooltip showing `MDT-030`.
- [x] A board card with a cross-project relationship link shows the full code (e.g. `🔗 VOC-005`) inline.
- [x] A board card with a mixed relationship list shows elided and full codes together (e.g. `🔗 030, VOC-005, 035`).
- [x] A board card with more than 3 relationship links shows the first 3 inline and a `+N` trigger for the rest.
- [x] Clicking `+N` opens a popover listing the hidden links as full CR keys, each navigable.
- [x] The popover closes on Escape, outside click, or item click; focus returns to the trigger.
- [x] Clicking any relationship link on a card navigates without opening the card's viewer.
- [x] In the TicketViewer, all relationship links render as full CR keys with no elision or `+N` compression.

### Non-Functional

- [x] Relationship badge rendering introduces no new badge color tokens (reuses `badge.css` data-attribute selectors).
- [x] No regression in card hover-lift animation or drag-drop behavior.
- [x] Popover is keyboard accessible (Tab cycles links, Escape closes, focus trap while open).

### Edge Cases

- Empty/undefined relationship arrays render no badge (unchanged from current behavior).
- A link that `classifyLink` cannot classify as TICKET or CROSS_PROJECT falls back to rendering the full key.
- Board badge preference hiding a relationship type still hides the entire badge (unchanged).

## 5. Verification

### How to Verify Success

- Manual: open a board card with 5+ same-project related tickets; confirm elided numbers, `+N` trigger, and popover behavior.
- Manual: open a board card with a cross-project relationship link; confirm full code is shown.
- Manual: click a relationship link on a card; confirm only navigation occurs (viewer does not open).
- Manual: open the same ticket in the TicketViewer; confirm full CR codes with no elision.
- Automated: unit tests for elision (same/cross/mixed), overflow threshold, and popover open/close behavior.
- Automated: component test confirming `stopPropagation` prevents the card's `onClick` from firing on link click.

## Related

- Implements UX contract from `docs/design/surfaces/relationship-badge.spec.md` and `.mockups.md`.
- Extends MDT-135 (original RelationshipBadge component).

## 8. Clarifications

### UAT Session 2026-07-16 — Global elision + no separator

**Approved changes:**

- Removed the inline comma separator between relationship links. Links now render adjacently (e.g. `🔗 030 005 035`).
- Made project-code elision **global**: same-project links render as bare numbers on all surfaces (board + TicketViewer), not board-only.
- Introduced code-level configuration (`src/config/relationshipBadge.ts`) for the separator (`RELATIONSHIP_LINK_SEPARATOR`) and the global-elision flag (`ELIDE_EVERYWHERE`). A settings UI item is deferred to a later ticket.

**Changed requirement IDs:** in-place refinement of the MDT-187 elision contract (acceptance criterion #8 reversed: viewer now elides too).

**Updated workflow documents:**

- `docs/design/surfaces/relationship-badge.spec.md` — surface scope + separator rules + display examples
- `docs/CRs/MDT-187/architecture.md` — decision D5/displayMode note
- `docs/CRs/MDT-187/bdd.md` — scenario S11 reversed
- `docs/CRs/MDT-187/uat.md` — current-round execution brief (written)

**Strict drift/lock:** not used.