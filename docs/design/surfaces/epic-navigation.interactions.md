# Epic Navigation - Interactions

Durable interaction contract for jumping from an epic reference to the Epics board focused on that epic — the ticket → epic → board journey (MDT-246).

Related specs: `context-badge.spec.md` (split-chip entry point), `ticket-viewer.spec.md` (epic board CTA), `swimlane-board.spec.md` (focused arrival)
Related ticket: `docs/CRs/MDT-246-epic-detail-board-jump.md`
Pattern contract: `frontend/src/styleguide.html` § "epic badge · split chip"

## Owns

- The two entry points of the jump and their unified destination.
- `?epic=` token semantics on the `/epics` route: what it controls and when it is consumed.
- Focus lifecycle on arrival: expansion, visibility override, search handling, scroll, highlight, and how focus ends.
- Return-context preservation (`?view=` carry) for ticket links opened inside a ticket modal.

## Does Not Own

- Visual identity of the split chip and the CTA button — `context-badge.spec.md`, `ticket-viewer.spec.md`, and the styleguide section.
- Swimlane layout, lane construction, and collapse persistence mechanics — `swimlane-board.spec.md`.
- Route constants and the reserved-token registry — `frontend/src/routes.ts`.

## Journey

| # | Entry point | Surface | Resulting navigation |
|---|-------------|---------|----------------------|
| 1 | Split-chip action zone | `ContextBadge[phase]` in the ticket viewer header and ticket attributes panel | `/prj/:code/epics?epic=KEY` |
| 2 | `Epics →` CTA | `CompactTicketHeader` action slot, epic tickets only (`level === 'epic'`) | `/prj/:code/epics?epic=KEY` |

Both entries are one navigation: the open ticket modal closes with it. There is no intermediate state and no back-stack dependency — the app has no history machinery, so a misroute cannot be undone; entry-point affordances must therefore be unambiguous (visible seam, labeled zones — see the styleguide section's rejected bare-glyph variant).

## `?epic=` token

| Aspect | Contract |
|---|---|
| Shape | query parameter on the `/epics` route; value is an epic ticket key (`MDT-012`) |
| While present | the board renders the focused-arrival state for that lane |
| Unknown or missing key | the token is ignored — the board renders normally, no error state (deep links may dangle; degrade, do not block) |
| Removal | navigating within the app (view switch, opening a ticket) drops it naturally; it is never rewritten onto other routes |

The token is view state, not a resource address: it mirrors the existing `?view=` vocabulary. A path segment (`/epics/MDT-012`) and a hash token (`#` is modal state, cf. `#trace`) were considered and rejected in MDT-246 §2.

## Focus lifecycle

Ordered effects when the board mounts with the token, or the token changes while mounted:

1. **Expand** — the focused lane joins the persisted expanded set (`mdt-settings-swimlane-expanded-lanes`).
2. **Visibility override** — the focused lane renders even when "Hide empty" or "Show closed" would exclude it.
3. **Search** — an active toolbar search that does not match the focused lane is cleared on arrival; filter toggles are untouched.
4. **Scroll** — the lane scrolls into view (label plus leading columns).
5. **Highlight** — transient lane highlight in the lane's `--epic-N` accent; auto-clears after ~2s. Expansion persists; the highlight does not.

Focus ends when the user interacts with the board (types in search, toggles a filter, collapses that lane) or navigates away. Ending focus never re-collapses the lane.

## Return context (`?view=` carry)

Ticket links opened from inside a ticket modal (SmartLink via ContextBadge or RelationshipBadge) append the current `?view=` context, so closing the opened ticket returns to the originating view (board / list / epics / documents) instead of the default board. `ticketCloseTargetPath` (`viewModeDerivation.ts`) already maps the token; the carry closes the gap where modal-to-modal links dropped it.

## Keyboard and focus

- Split-chip zones are two tab stops with distinct names: the key link ("Open epic MDT-231") and the action zone ("Show MDT-231 on Epics board").
- The viewer CTA is a standard 32px chrome control — same focus treatment as Trace Graph.
- After a jump, focus lands on the board surface; the focused lane is announced (live region) as an expanded epic lane so screen-reader users share the "you arrived here" signal the highlight gives sighted users.
