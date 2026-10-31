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

**Current scope — UAT r12 (2026-10-31):** this same CR includes the reader refinement in [uat.md](MDT-248/uat.md) and [ux-design.md](MDT-248/ux-design.md): project-isolated history, ticket-document comparison, compact headers/device badge toggle, independent main history, fullscreen and reference promotion. Earlier scope decisions below describe the original delivery and are superseded where r12 explicitly changes them.

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
- The reference hosts a source-owned document, including ticket subdocuments; promotion may make a ticket or repository document the main view. Its header/actions must match the actual owner (UAT r12).
- Ticket column width stays at readable prose measure when the pane is open; the pane opens by widening the modal, not by shrinking the ticket below its current measure.
- Esc order: hide pane first, then close the modal; Esc never discards reading state.
- Reuse the existing link classification, normalization, and known-missing flagging behavior for document links; a flagged/broken link stays non-clickable.
- Pane documents render with the same markdown pipeline, density settings, and theming as ticket prose; sandboxed HTML documents preview with the existing sandbox guarantees.
- Existing modal conventions (focus trap, backdrop, close affordances) keep holding in the widened state.
- Interaction contract and state machine are specified by the designs/ticket-side-doc/ POC and its decisions record — deviations need a recorded decision.

### Non-Goals
- Not building the multi-pane workspace (panes, per-pane tabs, trails, gathered Related lists) from designs/docs-zai.
- Not changing how links render or classify outside this flow.
- Not introducing a settings UI for link-open behavior in this CR (a config default can arrive later via the existing link configuration surface).
- Trace graph internals remain out of scope; its entry becomes an icon. UAT r12 replaces subdocument tab presentation with a searchable picker while preserving source-path semantics.

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

> All checked 2026-09-24 at close: verified by `tests/e2e/ticket/side-doc-pane.spec.ts` (14 journeys, BR-1.1–1.11) and the unit closure in `TicketSidePane.test.tsx` / `sidePaneSessions.test.ts`, exercised through seven UAT rounds on the live app (uat.md). The separate close action (×) additionally clears the ticket's persisted snapshot since UAT r7.

### Functional (Outcome-focused)
- [x] Clicking a repo document link in ticket prose opens the document beside the ticket in the same modal; the ticket content, scroll position, and selected subdocument are unchanged.
- [x] Clicking a document link inside a pane document navigates the pane and pushes history; back/forward walk the pane's own history with scroll positions restored.
- [x] Hiding the pane preserves the session (document, history, scroll); a visible affordance names the current document and reveals the pane; a separate close action discards the session.
- [x] Esc hides a visible pane, does not discard its session, and closes the modal only when the pane is not visible.
- [x] Clicking a ticket/epic link swaps the ticket content in place while the reading session survives.
- [x] On narrow viewports the pane presents as a full-cover view with an explicit return-to-ticket control.
- [x] A pane document can be handed off to the Documents view, landing on that document.
- [x] Documents known to be missing render flagged and non-clickable, exactly as today.

### Non-Functional
- [x] Pane open/close causes no visible layout jump of the ticket column (top-anchored, ticket measure preserved).
- [x] Keyboard users can operate the full flow (open, navigate, back/forward, hide, reveal, discard, close) with the keyboard-only focus-ring convention intact.
- [x] Light/dark themes and markdown density settings apply to pane content identically to ticket prose.

### Edge Cases
- [x] Clicking a document link while the pane is hidden reveals the pane with that document.
- [x] Rapid repeated navigation (link spam) never corrupts history or scroll state.
- [x] Pane open across a ticket switch keeps rendering the same document.
- [x] A document link whose target becomes invalid mid-session fails visibly without losing the current pane document.

### UAT r12 — Pending acceptance

- [ ] Project A/B/A and viewer reopen preserve isolated per-project reference histories; equal paths never reuse another project's content.
- [ ] Stale requests/cache/title/scroll callbacks cannot contaminate the active project.
- [ ] Internal ticket documents can open beside through a searchable tree without replacing main.
- [ ] Both panes have independent history and Copy path, with correct source provenance.
- [ ] Compact pinned header keeps priority before the key; details expansion is remembered device-wide.
- [ ] Closing main promotes the other document with its own header, metadata, scroll and Back path.
- [ ] Repository promotion shows a document header without stale ticket-only actions.
- [ ] Fullscreen/Restore preserves reading state; narrow and keyboard flows remain operable.

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
- Manual: run the 90-second scenario from the ticket-side-doc POC README (designs/ticket-side-doc/) against the app (doc chain two levels deep, hide/reveal, discard, ticket hop, narrow viewport).
- Automated: E2E covering pane open, follow-link history, scroll restore, hide/reveal/discard states, Esc chain, ticket hop with surviving session, narrow-viewport overlay, and flagged-missing links.
- Reference interaction contract: designs/ticket-side-doc/ (POC index.html + the decisions record).

## 8. Clarifications

### Historical UAT rounds — 2026-09-23 to 2026-09-24

The previous uat.md contained the round history below. It is preserved here so uat.md can be the current execution brief. Earlier verification claims describe those rounds only.

#### Round 1 — 2026-09-23

**Feedback** (user, live use of the split mode):

1. "It sits in a small window" — the split modal kept document-mode whitespace (10dvh top anchor, 2rem card margins) and capped height accordingly, so the working surface felt cramped.
2. "When I scroll, tabs bar is fixed" — the whole ticket column was one scroll container: the title scrolled away, the translucent sticky tabs floated mid-view, and chrome felt unstable.
3. "X button just appears over…" — the card-absolute close × kept its fixed position while content scrolled under it, so it ended up hovering over prose once the header had scrolled away.

**Root cause**: split mode had kept the chrome model of the free-growing document modal (absolute ×, sticky tabs, tall anchor) while switching to internal scrolling — the two were mismatched.

**Fix** (`fix(MDT-248): split mode as pinned-chrome work surface`):

- Split mode is an app panel: ticket-column header + sub-document tabs are pinned; only the content region below the tabs scrolls (`.subdoc-content` is the scroller). The × now always sits over the pinned title bar.
- Frame reclaims height while split: container top anchor 10dvh → 3dvh, card margins `sm:my-8` → 0.5rem, body cap `calc(100dvh - 3dvh - 2.5rem)`.
- Scroll transfer retargeted to the content region and captured at click time (the pane-header focus effect scrolls the overlay before a parent effect could read the offset — found by the strengthened E2E).

**Verification**:

- E2E `side-doc-pane.spec.ts` 9/9 — BR-1.1 now locks the new contract: pre-split offset transfers into the content scroller, and after a deep scroll the title + tabs stay visible with the × above the tabs band.
- `bun run validate:ts`, `bun run build`, `bun run lint:frontend`, TV unit suites — green.

**Status**: round 1 addressed; awaiting next look.

#### Round 2 — 2026-09-23

**Feedback**: "stretch to top/bottom, add a handle to change wall position for reasonable range."

**Fix** (`fix(MDT-248): stretch split frame + draggable column divider (UAT r2)`):

- The split body now has a fixed height `calc(100dvh - 1.5rem)` with a thin frame — a work surface that fills the viewport vertically regardless of content length (content scrolls inside each column).
- New `SplitDivider` between the columns: pointer drag, ArrowLeft/ArrowRight ±32px, double-click reset; range keeps both columns ≥ 340px (`clampTicketColumnWidth`, `splitLayout.ts`). Session-local width.
- The modal × tracks the dragged width via the `--ticket-col-width` CSS var; the pane's own border moved into the divider (1px rule with hover/focus/drag accent).

**Verification**: unit 18/18 (clamp + divider drag/keyboard); E2E 10/10 (new `divider_resizes_columns_within_range` locks drag, clamp, reset, keyboard, and the vertical stretch); TS/build/lint green.

**Status**: round 2 addressed; awaiting next look.

#### Round 3 — 2026-09-23

**Feedback**: "use the same head block style on the doc side"; persist the divider position in localStorage ("find related documents and see how it can be done").

**Fix** (`fix(MDT-248): pane head block + persisted split wall (UAT r3)`):

- Pane header is now the same two-row head block as the ticket column: title bar (`px-4 py-3`, `modal__headline` typography, 32px action controls — hand-off + ×) over a meta bar (`py-2.5`: back/forward + mono path). Replaces the single-row toolbar.
- Wall position persisted as a **percent** of the split body width — `mdt-settings-ticket-side-pane-split-ratio` (config/sidePaneLayout.ts, following the settingsPreferences `mdt-settings-*` conventions). Percent chosen over px: a percent flex-basis resolves live (no restore race with the modal width transition) and keeps the wall's relative position across viewport sizes. Committed on drag end and arrow nudge; double-click reset clears storage; restored when the pane first shows in a later modal. CSS `min-width: 340px` guard holds the readable floor when the window shrinks under a stored position.

**Verification**: unit green across pane + config suites (new sidePaneLayout round-trip/reject tests); E2E 10/10 — the divider journey now closes and reopens the modal and asserts the wall returns to the dragged position with the key present in localStorage; TS/build/lint green.

**Status**: round 3 addressed; awaiting next look.

#### Round 4 — 2026-09-23

**Feedback**: (1) pane error on a broken link "looks so so" — is a notifications system needed? (2) on the live MDT-248 ticket, the `designs/ticket-side-doc/` references don't work — did MDT-248 break them? (3) what about E2E coverage?

**Verdict on (2) — not an MDT-248 regression.** Ticket-prose document links live in a tickets-area-relative world: `markdownPreprocessor.resolveDocumentRef` resolves `..` against the ticket's path and, when a path escapes the tickets area, unconditionally prepends the parent of `ticketsPath` (`docs/`). Repo-root paths (`designs/…`) are therefore unreachable from ticket prose by design — and bare `decisions.md` mentions resolve into the unindexed tickets area as clickable-but-dangling. Before MDT-248 these same links navigated to the Documents view and failed there; the pane only changed where the failure shows.

**Fixes** (`fix(MDT-248): pane failure toast + empty state; de-link unreachable refs (UAT r4)`):

- (1) No new notifications system or agent needed — the app already ships Sonner toasts app-wide (`<Toaster>` in ProjectOverlays, `useToast` hook). The pane now uses it: a failure **with a previous document on screen** toasts "Couldn't load {path}" and keeps the previous document (no inline clutter); a **first-open** failure shows a proper centered empty error state (icon + message + path, `role="alert"`), mirroring the ticket-not-found pattern. The thin inline alert is gone.
- (2) The CR's `designs/` references rewritten as non-linking prose (they can never resolve from ticket prose; the POC folder is referenced by path only). Canonical Edge-2 requirement updated and traces re-rendered.
- (3) E2E: new journey `pane_failure_toast_and_empty_state` covers both failure modes against a genuinely dangling-but-clickable target; suite is 11/11.

**Verification**: unit 19/19 (toast mocked via `mock.module`; retained-doc and first-open cases); E2E 11/11; TS/lint/build green.

**Status**: round 4 addressed; awaiting next look.

#### Round 5 — 2026-09-24

**Feedback**: "I'd make header block docs side panel: `| {h1 title}  {file/path.md | copy icon} |` and `[<] [>]` floating over content, half transparent by default."

**Fix** (`fix(MDT-248): compact pane header + floating history chip (UAT r5)`):

- Pane header collapses to a single row: title leading, then the trailing cluster — mono path (truncated, capped at 40% of the row) with a copy control beside it, then the existing hand-off + × actions. The meta bar is gone.
- Back/forward leave the header: they float as a small pill chip over the top-left of the pane body (`--bg-elevated` at 85% + backdrop blur, `--border`, `--radius-pill`), half transparent at rest and fully opaque on hover/focus; content scrolls under the chip. The chip is a labelled `role="group"`; disabled bounds keep `cursor-not-allowed`.
- Copy reuses the documents-view `CopyPathButton` verbatim (toast + copied-check feedback), always visible in the pane header as an inline micro control (override scoped to `.ticket-side-pane__path-wrap`).
- Overlay variant (< 1100px): the path cluster yields its space to the title (hidden); `‹ Ticket` leads the row; the floating chip is unchanged.

**Verification**: unit 20/20 (new chrome-contract test: path + copy in the header, history group outside it); E2E 12/12 — new `pane_compact_header_floating_history` journey locks the single row, clipboard copy (`grantPermissions`), the chip's absolute position below the header, resting opacity 0.5 → 1 on hover, and back/forward from the chip; live visual check against the dev server confirmed the loaded state (title + `docs/MDT_WORKING_STATE_FILES.md` + copy + actions on one row, chip at 0.5). TS/lint/build green; wireloom mockups updated and revalidated (4/4 blocks parse+render).

**Status**: round 5 addressed; awaiting next look.

#### Round 6 — 2026-09-24

**Feedback**: "the header height is slightly different vs ticket view block. Align right side header to left one."

**Diagnosis**: the pane header rode `py-3` with in-flow 32px chrome controls → 57px, while the ticket column's title row is `py-3` + 24px headline (48px + 1px border = 49px; its × is absolutely positioned, out of flow). The pane's rule sat 8px below the ticket's.

**Fix** (`fix(MDT-248): pane header height parity with ticket title row (UAT r6)`):

- Pane header padding `py-3` → `py-2`: 8 + 32 + 8 = 48px content — exact parity with the ticket row (both rows 49px incl. border; live-verified top/height/bottom = 11/49/60 on both sides, rules form one continuous line). 32px hit targets kept; a CSS comment records the invariant (in-flow 32px controls must never ride `py-3` here).
- Spec gains the parity rule under "Pane header and floating history".

**Verification**: E2E 12/12 ×3 consecutive full runs. Two suite-robustness fixes surfaced while locking parity: BR-1.1's scroll-transfer read is now an `expect.poll` (the transfer can land a frame after pane-visible under load — instant read raced it), and the new parity assertion settles first via a diff-poll (mid-animation rects are fractional and unequal — the r2 `stableColumnWidth` trap again). Unit 20/20, TS/lint green; live re-measure confirms both header rules at the same y.

**Status**: round 6 addressed; awaiting next look.

#### Round 7 — 2026-09-24

**Feedback**: (1) "this modal has different [x] buttons. The source must be only 1, 1 style. review architecture, fix drifts." (2) "The system recovers opened document, but it has to be within a context. I'd keep it within a ticket. Where this stays, storage? localStorage? If we open many tickets with many docs we might get obsolete data — or limit the stack of remembered opened docs, FILO, 5 default. It will keep history too." (3) "Right click on back/forward shall show menu for elements (title / file path, like the documents nav tree)."

**Fixes** (`feat(MDT-248): per-ticket reading sessions, history jump menu, single × source (UAT r7)`):

- **One × source**: new `ModalCloseButton` (ui/Modal.tsx) with the single `.modal__close` style (32px button, 20px glyph) — used by `ModalHeader`, the ticket viewer's card-absolute ×, and the pane's ×. Positioning variants (`--absolute`, `--split`) only place it. Pane chrome icons (hand-off, back/forward) match the 20px glyph — one chrome family. Rule recorded in MODALS.md.
- **Per-ticket reading sessions** (answers the storage question: localStorage, `mdt-settings-ticket-side-pane-sessions`, config/sidePaneSessions.ts): each `{projectId, ticketKey}` keeps `{hist, hi, scrolls, titles}` — full history — FILO-capped at **5 tickets** most-recent-first (the cap is the obsolescence control; no sweeps needed). Modal close tucks the pane and keeps the snapshot; reopening the ticket restores it **hidden** (the pill names the document). × discards and clears the snapshot. The snapshot belongs to the ticket where the session started — ticket hops don't claim the new ticket's slot. Truncated entries' scroll/title keys are pruned at save; deleted documents degrade to the Edge-2 failure UX.
- **History jump menu**: right-clicking back/forward (vendored Radix `ui/context-menu.tsx`) lists that direction's entries in the documents nav-tree row format — title over mono path (last-known titles from the session, humanized fallback) — and activating an entry jumps without truncating the stack. Modal outside-click now exempts Radix portal layers (menus render at document.body and were closing the modal mid-selection).

**Canonical updates**: Edge-5 revised (per-ticket snapshot, restore-hidden, × clears) and BR-1.11 added (history jump menu) via spec-trace upsert; scenario + E2E test-plan coverage expanded; traces re-rendered; requirements.md decision rows revised with a dated addendum.

**Verification**: unit 1190/1190 full frontend (new: session store 7 — round-trip/scoping/FILO cap/eviction protection/pruning/garbage/clear; hook restore/recordTitle/jumpTo); E2E pane suite 14/14 ×6 consecutive (new: `pane_history_context_menu_jumps`, `modal_close_keeps_per_ticket_reading_snapshot`); TS/lint/build green. Full E2E regression 372 passed / 3 failed — all three verified unrelated (invalid-status = documented pre-existing baseline; read-access journey reproduces identically at the pre-r7 baseline commit; type-icon-options is a parallel-load flake passing solo). Two product bugs found and fixed on the way: the session pill sat under the floating ToC (z-20 < z-40) and was unclickable on short content; BR-1.1's scroll-transfer E2E precondition could clamp to 0 before content was tall (test now sets-and-verifies).

**Status**: round 7 addressed; awaiting next look.

#### Round 8 — 2026-09-24 (post-close hardening)

**Feedback**: clicking `docs/design/surfaces/swimlane-board.spec.md` from MDT-206's debt.md "breaks the app heavily — the system does not catch this error." Console: `Invalid hook call … more than one copy of React` → `Uncaught TypeError: Cannot read properties of null (reading 'useRef')` at `ContextMenu` under `HistoryNavButton`, then React unmounted the whole tree.

**Diagnosis**: not a pane-logic bug — a **duplicate React**. The `@radix-ui/react-context-menu` package added in r7 was pre-bundled by Vite in a separate optimizer session (chunk `?v=0f5a7dd9` alongside the app's `?v=a8f3f828`) while the user's long-lived dev tab kept the old module graph; the new dep chunk carried its own React copy, so the menu's `useRef` resolved against a foreign, null dispatcher. Fresh page loads merge into one optimizer session (why 10/10 fresh-context repros were clean); the mixed-graph tab crashed on the ContextMenu mount, and with no boundary between pane and modal the crash unmounted everything.

**Fixes** (`fix(MDT-248): dedupe React in Vite + pane error boundary (UAT r8)`):

- `resolve.dedupe: ['react', 'react-dom']` in vite.config.ts — structural guarantee: every dependency chunk resolves the app's single React, whatever optimizer session bundled it.
- New `PaneErrorBoundary` around `TicketSidePane`: any render error in the pane subtree degrades to an inline "Something went wrong showing this document / the ticket is unharmed" state; the ticket column, modal chrome, and session keep working. The pane can no longer take the app down (demand #1).
- Esc refinement exposed while verifying: one Escape now closes the history menu only (stopped at the menu content) instead of also tucking the pane — matches the r7 interaction contract.

**Verification**: unit 3/3 boundary suite (throwing pane contained, fallback copy, siblings alive) within 93/93 TicketViewer; E2E 14/14 with the menu journey now also locking the menu-only Escape; live reproduction of the exact user path (restored 2-entry session → reveal → right-click back → menu mounts) green with zero console errors post fix — the config change restarts Vite's optimizer, so the user's next tab reload is clean.

**Status**: round 8 addressed; ticket stays Implemented.

#### Round 9 — 2026-09-24 (post-close hardening)

**Feedback**: opening `docs/CRs/MDT-248-ticket-side-doc.md` (backticked, from a design-surface doc in the pane) spammed "Couldn't load docs/design/surfaces/docs/CRs/MDT-248-ticket-side-doc.md". "Ideally it must be a ticket link… router must define this as a ticket link."

**Diagnosis — two defects, one report**:

1. **Misrouting**: a ticket-file reference authored root-style (`docs/CRs/MDT-248[-slug].md`) from a documents-mode doc resolves relative to the source dir (`docs/design/surfaces/docs/CRs/…` — dead), and `resolveDocumentRef` only checked the RESOLVED path against the tickets area. The ticket's main file is the entity itself — it should route to the ticket view, from anywhere.
2. **Toast spam**: `useToast` returned a fresh object literal per render; the pane's fetch effect keeps it in its deps, so a failing fetch (loading true→false flips) re-triggered the effect on every render — an infinite refetch → re-toast loop.

**Fixes** (`fix(MDT-248): ticket-file refs route to tickets + toast api stable (UAT r9)`):

- `resolveDocumentRef` now classifies the AUTHORED path against the tickets area (before mode branching): a root-style `{ticketsPath}/{KEY}[-slug].md` becomes a ticket link; `{ticketsPath}/{KEY}/{subdoc}.md` becomes a ticket-subdoc link — from any source document. Relative refs that correctly land in the tickets area keep working (existing resolved-path rule). A first cut also put this rule in the frontend LinkNormalizer, hoisted above its traversal guard — reverted: MDT-150 pins the normalizer as deliberately conservative (resolution intelligence lives in the preprocessor); three pinned contracts stayed green after the revert.
- `useToast` memoizes its api object (callbacks were already stable) — referentially stable for effect deps; the failure loop is structurally gone.

**Verification**: unit 1198/1198 full frontend (4 new preprocessor cases: root-style main file, subdoc, no-over-capture, relative-into-tickets; useToast stability test); E2E 18/18 across the pane suite (new `ticket_file_ref_routes_to_ticket_view` journey: backticked root-style ref in a pane doc → ticket link → column swaps, pane survives) plus the MDT-150 smartlink regression suite. Live: the user's exact chain (debt.md → swimlane spec → interactions doc → `docs/CRs/MDT-246-epic-detail-board-jump.md`) now yields `/prj/MDT/ticket/MDT-246`, column swap, pane intact, zero console errors — reload the tab to pick it up.

**Status**: round 9 addressed; ticket stays Implemented.

#### Round 10 — 2026-09-24 (post-close hardening)

**Feedback**: "open a doc in right panel, open another one, RMB on [<] history button, click outside the history dropdown somewhere within the document area — actual: the ticket view popup closed; expected: only the history popup closed."

**Diagnosis**: while a Radix context menu is open it disables pointer events on the page body, so the dismissing click never reaches the pane — its target is `<html>`. The Modal's outside-mousedown handler saw a target outside `modal-content` and treated it as an overlay click, closing the whole ticket modal behind the menu. (Proven by capture-phase tracing: `pointerdown@HTML`, `body pointer-events: none`.)

**Fix** (`fix(MDT-248): dismissing click on an open floating menu no longer closes the modal (UAT r10)`): the Modal's outside-click handler ignores clicks whose target is `documentElement`/`body` — a genuine overlay click always targets the backdrop element itself; an html/body target only occurs when a floating layer has suppressed page pointer events. The r7 portal exemption (direct interaction with Radix layers) is unchanged.

**Verification**: E2E pane suite 15/15 ×3 consecutive (the menu journey now clicks outside the open menu at real coordinates and locks modal + pane survival; the menu itself is closed deterministically via the r8 menu-only Escape — Radix's own dismissal of its menu proved flaky under parallel workers, which is outside this contract). Live trace of the exact user flow: `pointerdown@HTML` → menu dismissed, modal open, pane intact. Unit 1198/1198, TS/lint green.

**Status**: round 10 addressed; ticket stays Implemented.

#### Round 11 — 2026-09-24 (post-close hardening)

**Feedback**: "in tight space, when we have opened doc view or ticket doc — we have both [x] buttons visible. Fix this drift."

**Diagnosis**: below the 1100px split breakpoint the pane covers the whole card, and the modal-level × fell back to the card's top-right (`right: 0.75rem`) — exactly where the pane header's own × lives. Two visible close controls for one surface, contradicting the r7 one-close-control rule.

**Fix** (`fix(MDT-248): single close control in overlay mode (UAT r11)`): in overlay mode the modal × tucks with the pane (`.modal__close--absolute.modal__close--split { display: none }` under the breakpoint; the compound selector because modal.css imports later and owns `.modal__close`'s display at equal specificity). The pane's × is the only close control while the pane covers the card; hide/discard the pane and the modal × returns. Desktop split mode is unchanged (the modal × tracks the ticket column, the pane × owns the pane header).

**Verification**: E2E pane suite 15/15 ×4 consecutive — the narrow journey now asserts one close per state (pane overlay → pane × only, modal × hidden; pane tucked → modal × back). Live at 900px: no-pane → 1 ×; pane open → pane × only; tucked → modal × only. Unit 1198/1198 earlier in the round; TS/lint green. Also hardened two suite flakes found on the way: the r5 nav-below-header assertion gained a 2px subpixel tolerance, and the r10 menu-close Escape became conditional (Radix's own dismissal intermittently lands under parallel workers).

**Status**: round 11 addressed; ticket stays Implemented.


### UAT Session 2026-10-31 — Round 12

- User chose same-ticket UAT; no replacement CR is created. The agreed reader refinement remains in MDT-248.
- New defect: screenshot shows sf-api document paths/history in an MDT ticket and a load failure. Source diagnosis identifies bare-path live/cache state paired with current-project fetching. This is user-reported plus source evidence, not a new browser reproduction.
- Approved changes and requirement identity: refined BR-1.7/C1/C2/Edge-5; added BR-1.13–BR-1.19/C8/Edge-8. Existing identifiers retained; task closure gaps from prior UAT additions repaired.
- Updated human docs: requirements.md, bdd.md, architecture.md, tests.md, tasks.md and ux-design.md. uat.md rewritten as the current-round implementation brief; review images and defect screenshot preserved under assets/.
- Three execution slices: project isolation first, then navigation/header/fullscreen, then promotion and final UX/regression sync.
- Initial baseline: 31 unit tests pass, 0 fail, 82 assertions; localhost link-config/index warnings. New isolation/reader acceptance and browser UAT remain pending. No strict drift lock used; canonical stages validated/rendered after sync.
- Implementation is still required. No runtime code is changed by this UAT specification round.
- Canonical design sync (same round): ticket-viewer and ticket-side-doc specs, interactions and mockups now define the approved r12 target; ux-design.md indexes those owners. All 14 Wireloom blocks validate/render. Runtime/browser acceptance remains pending.

### UAT Session 2026-10-31 — r12 review decisions and handoff

- DROP legacy project+ticket snapshots; no migration/reinterpretation. New project-keyed reference histories cap at 50 entries per project and evict oldest.
- Main history is per viewer-open; only reference sessions persist across close.
- Split TASK-12 into sequential TASK-12a (navigation truth) and TASK-12b (chrome), each with one editing owner and a separate GREEN gate.
- Repository promotion uses dedicated /prj/{sourceProject}/read?doc=; native browser Back returns to the preceding ticket, direct/reload opens single document mode, and Close replaces with source Documents-view URL. Existing Documents links remain unchanged. Architecture/tasks record rationale and route ownership.
- PNG drift is explicitly warned in UX handoff, mockups and assets notes; canonical text/Wireloom governs. TASK-13 must regenerate or annotate.
- Requirement refinements: BR-1.14, BR-1.19, Edge-5; additive BR-1.20. No runtime changes or acceptance completion claimed.
