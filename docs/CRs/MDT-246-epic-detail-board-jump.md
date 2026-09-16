---
code: MDT-246
status: Proposed
dateCreated: 2026-09-09T11:52:22.991Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-225
---

# Jump from epic detail to its Epics-board lane

## 1. Description

Journey gap (reported 2026-09-09): a user opens a ticket, then opens its epic
(the gold Zap ContextBadge in the ticket header). From the epic's detail view
there is no way to reach the Epics board focused on that epic and its tickets.

Verified current state:

- The epic badge (CompactTicketHeader.tsx:32, ContextBadge.tsx:69-108) is a
  SmartLink that navigates to the epic's own ticket-detail modal — nothing else.
- The `/epics` route (routes.ts:40) parses no epic-targeting token; collapsed
  lanes and show-closed are localStorage state (SwimlaneBoard/index.tsx:25-47,
  194-205) and lanes default to collapsed, so even landing on `/epics` leaves
  the user to find and expand the right lane manually.
- No focusEpic / scrollToEpic / lane-targeting capability exists anywhere in
  frontend/src (grep-verified).

Secondary defect in the same journey: the epic badge link carries no `?view=`
context, so opening a ticket from the Epics view, clicking through to the epic,
and closing it returns to the flat board instead of the Epics view
(viewModeDerivation.ts:36-42).

## 2. Desired Outcome

**Option A — URL-addressable epic focus + header action on the epic detail
(recommended).**

1. TicketViewer shows an "Epics →" action in the CompactTicketHeader
   action slot (beside the Trace Graph button,
   TicketViewer/index.tsx:432) when `ticket.level === 'epic'`; it navigates to
   `/prj/:code/epics?epic=MDT-###` in a single navigation (the modal closes
   with it). Label ruled 2026-09-16: `Epics →` — the switcher's own word for
   the destination + trailing arrow-right as the go-verb; tooltip/aria carry
   the full sentence "Show MDT-### on Epics board" (Label-in-Name holds).
   Icon: `Rows3` — the same glyph the view switcher already uses for
   the Epics toggle (ViewModeSwitcher.tsx:19). Not Zap: the lightning is the
   epic *identity* glyph (ContextBadge.tsx:89, TicketCode.tsx:45), passive-only
   in both existing usages; reusing it on an action would put two Zaps with
   different jobs side by side in the same header (the key line already
   renders one). The inverse action (lane → open epic) already uses a
   destination glyph (FileText = Docs icon); the forward action mirrors it
   (Rows3 = Epics view icon).
2. ProjectRouteHandler parses `?epic=` on the `/epics` route and threads
   `focusEpicKey` down Board.tsx:581 → SwimlaneBoard.
3. SwimlaneBoard on focus: expand and persist the target lane
   (mdt-settings-swimlane-expanded-lanes), include it regardless of
   Hide empty / Show closed filters, scrollIntoView, and apply a transient
   lane highlight in the lane's `--epic-{colorIndex}` accent.
4. Unknown or missing epic key → token ignored, board renders normally.
5. Fix `?view=` carry: ticket links opened from within a ticket modal
   (SmartLink via ContextBadge) append the current `?view=` so modal-close
   returns to the originating view.
6. Child-side entry point — the epic ContextBadge becomes a **split chip**
   (ruled 2026-09-13; pattern documented in `frontend/src/styleguide.html`
   § "epic badge · split chip"). One unit, two interactive zones:
   identity zone (passive Zap + key link to the epic ticket, unchanged) and
   a trailing action zone (≥24×24 button, `rows-3`, seam + half-strength
   neutral veil at rest, full `--state-hover-bg` on hover, title/aria-label
   "Show MDT-### on Epics board", stopPropagation) navigating to the same
   `?epic=` deep link. The bare-glyph variant (clickable Zap) was measured
   and rejected: 12×12 target vs the 24px floor, 4px from a competing link,
   misfire is a full navigation with no back, and it double-duties the
   passive identity glyph.

Options considered:

- **B — embedded children list inside the epic detail**: rejected as primary;
  duplicates the board in a lesser form (no drag, no status columns). Possible
  complement later, not the jump.
- **C — universal "reveal ticket anywhere" mechanism** (board card / list row /
  lane): the right long-term generalization; A builds the focus primitive
  generically so C can reuse it. Deferred.

Param design: query `?epic=`, mirroring the existing `?view=` vocabulary.
Hash token rejected (`#` is modal state, cf. `#trace` / MDT-237); path segment
`/epics/MDT-###` rejected (grows the route table for ephemeral view state).

## 3. Open Questions

- Should focus clear an active toolbar search, or only override visibility
  filters? **RESOLVED (2026-09-15, design pass):** focus overrides Hide
  empty / Show closed for the focused lane; an active search that would not
  match the focused lane is cleared on arrival; filter toggles are
  untouched (epic-navigation.interactions.md § Focus lifecycle).
- Should the transient highlight auto-clear (timeout) or persist until next
  interaction? **RESOLVED (2026-09-15, design pass):** auto-clears (~2s);
  lane expansion persists; focus ends on user board interaction and never
  re-collapses the lane.
- Should child tickets also get a direct "open my epic's lane" affordance, or
  keep the single mechanism via the epic detail? **RESOLVED (2026-09-13):**
  split chip on the epic ContextBadge (§2 item 6) — the badge carries both
  destinations as two visible zones. The single-mechanism rule survives:
  both entry points use the same `rows-3` destination glyph and the same
  `?epic=` deep link.

## 4. Acceptance Criteria

- [ ] Epic detail header (level: epic) shows an "Epics →" action
      beside the Trace Graph button, with the Rows3 icon (the view switcher's
      Epics glyph) and a trailing arrow-right; tooltip/aria carry the full
      sentence
- [ ] Epic ContextBadge renders as a split chip: identity zone (passive Zap +
      key link to ticket view) + trailing ≥24×24 action button (rows-3, seam +
      rest veil, hover `--state-hover-bg`, labeled) navigating to the `?epic=`
      deep link; Zap never becomes a click target
- [ ] The action navigates to `/prj/:code/epics?epic=:key` in one navigation;
      no orphaned modal state
- [ ] SwimlaneBoard with `focusEpicKey`: lane expanded (persisted), scrolled
      into view, transiently highlighted in its epic color
- [ ] Focused lane renders even when Hide empty / Show closed would exclude it
- [ ] `?epic=` pointing at an unknown/missing epic is ignored; board renders
      normally
- [ ] `?view=` context survives epic-badge navigation from within a ticket
      modal (close returns to the originating view)
- [ ] Unit tests for focus expansion / filter-override / unknown-key logic;
      E2E for the full journey ticket → epic → board (target via
      data-lane-key)
- [ ] UAT round 1 executed per repo convention (uat.md brief +
      §Clarifications entry in the CR file)

## 5. Verification

- `bun run lint` + `bun run validate:ts`
- SwimlaneBoard unit tests (focus expansion, filter override, unknown key)
- Playwright E2E journey spec (data-lane-key targeting)
- UAT round 1: manual browser walk of the journey

## 6. References

- MDT-231 (parent epic — UI/UX improvements), MDT-225 (epic level + swimlane
  model), MDT-206 (swimlane board), MDT-193 (ContextBadge epic SmartLink),
  MDT-237 (#trace hash-token precedent), MDT-244 (header key-line layout)
- Pattern contract: frontend/src/styleguide.html § "epic badge · split chip —
  identity vs action" (ruled idiom + rejected bare-glyph variant, verified
  light + dark)
- Design docs (2026-09-15 design pass): docs/design/surfaces/
  epic-navigation.interactions.md (new — journey, `?epic=` token, focus
  lifecycle, `?view=` carry), context-badge.spec.md + .mockups.md (split
  chip; cards stay compact), ticket-viewer.spec.md + .mockups.md (epic board
  CTA in the action slot), swimlane-board.spec.md + .mockups.md (focused
  arrival)
- Key files: frontend/src/routes.ts,
  frontend/src/components/routes/ProjectRouteHandler.tsx,
  frontend/src/components/routes/viewModeDerivation.ts,
  frontend/src/components/Board.tsx,
  frontend/src/components/SwimlaneBoard/index.tsx,
  frontend/src/components/TicketViewer/index.tsx,
  frontend/src/components/TicketViewer/CompactTicketHeader.tsx,
  frontend/src/components/Badge/ContextBadge.tsx,
  frontend/src/components/SmartLink/index.tsx