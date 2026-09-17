---
code: MDT-246
status: In Progress
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
- [x] UAT round 1 executed per repo convention (uat.md brief +
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

## 8. Clarifications

### UAT Session 2026-09-16 (Round 1)

Verification round — no requirement deltas, no changed IDs, no strict
drift/lock needed. `uat.md` written (brief + validation log).

- All ACs verified on the live app (walk A–E in `uat.md` § Validation):
  split chip geometry (action zone exactly 24×24, identity-zone height parity
  with the plain badge), one-navigation jumps, focused arrival
  (expand+persist+scroll+~2s highlight+live region), `?view=` carry round
  trip, unknown-token degradation, and the Show-closed override (MDT-225 is
  Implemented, so every real jump to it exercises the override).
- Three review findings fixed before UAT (behavior-faithful, no spec change):
  `carryViewParam` inserts before `#fragment` (anchored epic values no longer
  lose the carried view); `Collapse all` ends focus (it collapses the focused
  lane); `architecture.md` no longer names dead `TicketAttributes.tsx` as a
  live surface.
- User-reported round-1 finding F1, fixed: the split chip rendered 28px with
  dead space — the shadcn Badge wrapper's baked-in utilities (`py-0.5`,
  `font-semibold`) outranked `@layer components`, so badge.css never owned the
  chrome. Root-cause fix strips those utilities from `ui/badge.tsx`; chip now
  24px (styleguide parity), all badges at the curated font-weight 500 (was
  600). Details in `uat.md` § Round-1 finding F1.
- Known non-blocking: deterministic mdt-verify evidence (sealed plan +
  immutable run) absent — plan was initialized after implementation started
  and seal requires the live baseline; RED pre-states + green post-states
  recorded in-session (see `.pipeline-state.json` exceptions).

### UAT finding F2 (2026-09-16)

User ruling: every badge, on every surface, renders at the same height — the
canonical 20px badge box — and the split chip's action zone must not increase
the badge's visible height anywhere. Supersedes the "badge grows ~4px"
geometry notes (styleguide § "epic badge · split chip" and
`context-badge.spec.md`, dated 2026-09-13). The MDT-236 24×24 floor still
holds and moves to an invisible hit surface, not the visible box.

Fix (badge.css split-chip block only): `.badge-action` drops
`min-height: 24px` (keeps `min-width: 24px`), gains `align-self: stretch` —
its visible box becomes the identity zone's 20px line — and an invisible
`::after` hit surface (`inset: -2px 0` → a 24px band, vertical-only so it
never reaches the key link). Wrapper (`ui/badge.tsx`) untouched; hover veil,
seam, and keyboard-only focus treatment stay on the visible box.

Measured: before the fix, an inventory of all four badge surfaces (viewer
header, flat board, epics swimlane with Show-badges + Expand-all, list) found
2207 visible badges at exactly 20.00px and the chip as the single 24.00px
outlier (106.42×24.00, action 24×24). After: chip 106.42×20.00, action
20.00×24.00, identity zone 20.00 — equal to every neighbor. Hit-target proof
via `document.elementFromPoint`: points 1.5px above and 1.5px below the
button's visual edges resolve to `button.badge-action`; 3px out resolves to
the badges row (outside the surface). Details in `uat.md` § Round-1 finding
F2.
