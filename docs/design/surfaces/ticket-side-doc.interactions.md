# Ticket Side Doc - Interactions

Durable interaction contract for the ticket viewer's side reading pane: state machine, link routing, history/scroll, and the Esc chain (MDT-248).

Related specs: `ticket-side-doc.spec.md` (composition, layout, states), `ticket-viewer.spec.md` (host modal)
Related ticket: `docs/CRs/MDT-248-ticket-side-doc.md`
Reference implementation: `designs/ticket-side-doc/` (Alpine POC; its state model is normative)

## Owns

- The pane session state machine (closed / open / hidden) and every transition into and out of it.
- The routing table: which link kinds open in the pane, which swap the ticket column, which leave the app.
- Per-pane history semantics (browser-tab model) and scroll memory.
- The Esc chain ordering inside the ticket modal.
- Session lifetime rules (what survives a ticket hop, what dies with the modal).

## Does Not Own

- Link classification and missing-target flagging — `linkProcessor` / SmartLink config.
- Modal base keyboard behavior (focus trap, body scroll lock) — `MODALS.md`.
- `#trace` shell open/close (orthogonal; trace shell keeps its own Esc behavior when open).
- Sub-document tab navigation — `useTicketDocumentNavigation`.

## State machine

| # | From | Event | To | Effects |
|---|------|-------|-----|---------|
| 1 | closed | document link clicked | open | pane reveals, modal widens, doc loads, history = [doc], focus → pane header |
| 2 | open | document link clicked (different doc) | open | push onto history (forward stack truncated), pane navigates |
| 3 | open | document link clicked (same doc) | open | no-op navigation (no duplicate history entry) |
| 4 | open | Esc / `‹ Ticket` (overlay) | hidden | pane tucked, pill appears; session kept |
| 5 | hidden | document link clicked | open | pane re-reveals with the new doc (state 2 semantics from the kept session) |
| 6 | hidden | pill clicked | open | pane re-reveals on the current doc, scroll restored |
| 7 | open or hidden | `×` on pane | closed | session discarded (doc, history, scroll), modal narrows |
| 8 | any | ticket link clicked | unchanged | ticket column swaps in place; pane state and session untouched |
| 9 | any | modal closes | closed | session dies with the modal (reopen starts paneless) |

Invariants:

- A document-link click **always** reveals the pane (follow-always). There is no mode in which document links navigate to the Documents view instead; the only per-doc alternative is the explicit `Open in Documents ↗` hand-off.
- Esc never discards a session; only `×` does.
- The pane never hosts a ticket; the ticket column never hosts a repo document.

## Link routing

| Link kind (linkProcessor) | Delivered to | Notes |
|---------------------------|--------------|-------|
| DOCUMENT | the pane | including links inside pane documents (recursion stays in the pane) |
| DOCUMENT, known-missing | not clickable | flagged rendering, identical to today — pane never opens |
| TICKET / CROSS_PROJECT | ticket column swap | current modal behavior preserved, incl. `?view=` carry (`epic-navigation.interactions.md`) |
| sub-document ref | sub-document tab selection | current tab behavior |
| EXTERNAL | browser tab | unchanged |
| in-page anchor | current region scroll | applies to whichever region contains the link |

## History and scroll

- One history stack for the pane (browser-tab model): entries are document refs; a new visit truncates the forward stack; consecutive duplicates are not pushed.
- Back/forward enabled state reflects stack bounds; disabled uses `cursor-not-allowed` (tooltip survives).
- Scroll position is captured per history entry on every navigation and restored on back/forward and on hide/reveal.
- Hiding the pane captures scroll; revealing restores it. Discarding clears it.
- Rapid navigation must not corrupt the stack: navigation applies to the committed top of stack only.

## Esc chain

Ordered, one Esc press per step:

1. Trace shell open → closes shell (existing behavior, unchanged).
2. Pane visible → hides pane (session kept).
3. Otherwise → closes the ticket modal (existing behavior).

Steps compose: Esc walks outward exactly one layer per press.

## Divider (UAT r2)

- Drag (pointer), ArrowLeft/ArrowRight (±32px, focusable separator), double-click resets to the CSS default.
- Range: neither column below 340px (`clampTicketColumnWidth` in `splitLayout.ts`); the smaller bound wins when the body cannot fit two minimums.
- Session-local: the width lives in the ticket viewer and dies with the modal; it survives hide/reveal and ticket hops.
- While dragging: global col-resize cursor, selection suppressed (`ticket-side-pane--resizing` body class); the modal close × tracks the width via `--ticket-col-width`.
- Hidden below the split breakpoint (no divider in overlay mode).

## Session lifetime

- Survives: ticket hops in the ticket column (state 8), sub-document tab switches, pane hide/reveal cycles, viewport resize across the split/overlay breakpoint, theme and density changes.
- Dies: `×` discard, closing the ticket modal (state 9). Navigating away from the ticket route closes the modal, therefore the session.

## Keyboard and focus

- Pane open: focus moves to the pane header (first enabled control). Tab order flows ticket column → pane header → pane body links.
- Pane hide via Esc: focus moves to the session pill (it names the tucked document).
- Pane discard via `×`: focus returns to the element that opened the session if still present; otherwise the modal close control.
- All controls are standard tab stops; roving tabindex is not used. Keyboard-only `:focus-visible` rings throughout.

## Screen reader announcements

- Pane opens: announce `Opening {document title} beside ticket`.
- Pane hides: announce `{document title} tucked — show it from the reading pill`.
- Pane discarded: announce `Reading session closed`.
