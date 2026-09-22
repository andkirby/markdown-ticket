---
code: MDT-248
status: In Progress
dateCreated: 2026-09-22T21:44:37.935Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-231
---

# Open documents beside ticket in side reading pane

## 1. Description

### Requirements Scope
`full`

### Problem
- Following a document link from ticket prose navigates to the Documents view; the open ticket is left behind and must be re-found after reading.
- Reading a chain of linked docs (ticket → index doc → detail doc) multiplies the view switches; the working context inside the ticket is lost each time.
- The full multi-document workspace concept (designs/docs-zai) solves this but was judged too complicated for the ticket-centric workflow.

### Affected Areas
- Frontend: ticket viewer experience (how linked content opens while a ticket is on screen)
- Frontend: markdown link behavior inside ticket and document prose
- Frontend: modal layout system (a widened, split variant of the ticket modal)

### Scope
- In scope: opening repo document links inside the ticket modal, beside the ticket; navigation history within the pane; pane show/hide/discard states; narrow-viewport degradation; escape hatch to the Documents view.
- Out of scope: editing documents in the pane; multi-pane layouts or workspace modes (docs-zai parked); gathered "Related" lists; hover peek; favorites; URL deep-linking of pane state.

## 2. Desired Outcome

### Success Conditions
- When a repo document link inside an open ticket is clicked, the ticket stays open and visible, and the document opens in a side pane within the same modal.
- When a document link inside the pane's document is clicked, it opens in the same pane (never a new surface, never the ticket column).
- The pane keeps a per-pane back/forward history; returning to a previously viewed document restores its scroll position.
- The user can hide the pane without losing the reading session (document, history, scroll) and reveal it again from an always-visible affordance; a separate close action discards the session.
- Clicking a ticket link anywhere still swaps the ticket content in place, and an active reading session survives the ticket switch.
- On viewports too narrow for two readable columns, the pane degrades to a full-cover view with an explicit return-to-ticket control.
- The user can hand a pane document off to the full Documents view.
- External links and anchor links keep their current behavior.

### Constraints
- Follow-always semantics: a document-link click always opens/reveals the pane; no mode toggle that changes what a link click means.
- The pane never hosts tickets; the ticket column never hosts repo documents (role exclusivity).
- Ticket column width stays at readable prose measure when the pane is open; the pane opens by widening the modal, not by shrinking the ticket below its current measure.
- Esc order: hide pane first, then close the modal; Esc never discards reading state.
- Reuse the existing link classification, normalization, and known-missing flagging behavior for document links; a flagged/broken link stays non-clickable.
- Pane documents render with the same markdown pipeline, density settings, and theming as ticket prose; sandboxed HTML documents preview with the existing sandbox guarantees.
- Existing modal conventions (focus trap, backdrop, close affordances) keep holding in the widened state.
- Interaction contract and state machine are specified by designs/ticket-side-doc/ (POC + decisions.md) — deviations need a recorded decision.

### Non-Goals
- Not building the multi-pane workspace (panes, per-pane tabs, trails, gathered Related lists) from designs/docs-zai.
- Not changing how links render or classify outside this flow.
- Not introducing a settings UI for link-open behavior in this CR (a config default can arrive later via the existing link configuration surface).
- Not touching the trace graph or ticket subdocument tabs.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| State | Where does pane session state live (component state vs URL) and does it survive modal close/reopen? | Real app is URL-driven; modal already syncs some state via hash |
| Layout | How does the ticket modal migrate from outer-overlay scrolling to two internal scroll regions without the ticket scroll position jumping? | No-jump modal architecture must hold; ticket scroll preserved across pane open/close |
| Navigation | How are document-link clicks intercepted within the ticket modal without breaking their current Documents-view behavior elsewhere? | Existing link config toggles and missing-link flagging must keep working |
| Accessibility | What focus/keyboard model governs two columns in one dialog (focus order, per-column Esc, screen-reader labeling of the pane)? | Existing modal focus trap and keyboard-only focus-ring rules |
| Responsive | Exact breakpoint and behavior for the overlay degradation; what happens on resize while the pane is open? | POC uses <1100px full-cover overlay |
| Testing | E2E strategy for the two-column modal (assertions on pane state, history, scroll restore) | Playwright conventions; SSE stream rules out networkidle waits |

### Known Constraints
- Must compose with the existing ticket viewer chrome: subdocument tabs, floating table of contents (must not cover the pane), relative timestamps, density setting.
- Must reuse the existing document fetch/render path used by the Documents view.
- No new backend endpoints or data model changes.

### Decisions Deferred
- Implementation approach and component structure (determined by `mdt:architecture`)
- Test artifacts and task breakdown (determined by `mdt:tests` / `mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] Clicking a repo document link in ticket prose opens the document beside the ticket in the same modal; the ticket content, scroll position, and selected subdocument are unchanged.
- [ ] Clicking a document link inside a pane document navigates the pane and pushes history; back/forward walk the pane's own history with scroll positions restored.
- [ ] Hiding the pane preserves the session (document, history, scroll); a visible affordance names the current document and reveals the pane; a separate close action discards the session.
- [ ] Esc hides a visible pane, does not discard its session, and closes the modal only when the pane is not visible.
- [ ] Clicking a ticket/epic link swaps the ticket content in place while the reading session survives.
- [ ] On narrow viewports the pane presents as a full-cover view with an explicit return-to-ticket control.
- [ ] A pane document can be handed off to the Documents view, landing on that document.
- [ ] Documents known to be missing render flagged and non-clickable, exactly as today.

### Non-Functional
- [ ] Pane open/close causes no visible layout jump of the ticket column (top-anchored, ticket measure preserved).
- [ ] Keyboard users can operate the full flow (open, navigate, back/forward, hide, reveal, discard, close) with the keyboard-only focus-ring convention intact.
- [ ] Light/dark themes and markdown density settings apply to pane content identically to ticket prose.

### Edge Cases
- [ ] Clicking a document link while the pane is hidden reveals the pane with that document.
- [ ] Rapid repeated navigation (link spam) never corrupts history or scroll state.
- [ ] Pane open across a ticket switch keeps rendering the same document.
- [ ] A document link whose target becomes invalid mid-session fails visibly without losing the current pane document.

## 5. Verification

> Requirements trace projection: [requirements.trace.md](./MDT-248/requirements.trace.md)
> Requirements notes: [requirements.md](./MDT-248/requirements.md)
> Fit assessment: [assess.md](./MDT-248/assess.md) — Option 1, Integrate As-Is
> BDD trace projection: [bdd.trace.md](./MDT-248/bdd.trace.md)
> BDD notes: [bdd.md](./MDT-248/bdd.md)
> Architecture trace projection: [architecture.trace.md](./MDT-248/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-248/architecture.md)
> UX gate: [ux-design.md](./MDT-248/ux-design.md) — approved, durable docs synced
> Tests trace projection: [tests.trace.md](./MDT-248/tests.trace.md)

### How to Verify Success
- Manual: run the 90-second scenario from designs/ticket-side-doc/README.md against the app (doc chain two levels deep, hide/reveal, discard, ticket hop, narrow viewport).
- Automated: E2E covering pane open, follow-link history, scroll restore, hide/reveal/discard states, Esc chain, ticket hop with surviving session, narrow-viewport overlay, and flagged-missing links.
- Reference interaction contract: designs/ticket-side-doc/ (POC index.html + decisions.md).