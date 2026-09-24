# UAT: MDT-248

## Round 1 — 2026-09-23

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

## Round 2 — 2026-09-23

**Feedback**: "stretch to top/bottom, add a handle to change wall position for reasonable range."

**Fix** (`fix(MDT-248): stretch split frame + draggable column divider (UAT r2)`):

- The split body now has a fixed height `calc(100dvh - 1.5rem)` with a thin frame — a work surface that fills the viewport vertically regardless of content length (content scrolls inside each column).
- New `SplitDivider` between the columns: pointer drag, ArrowLeft/ArrowRight ±32px, double-click reset; range keeps both columns ≥ 340px (`clampTicketColumnWidth`, `splitLayout.ts`). Session-local width.
- The modal × tracks the dragged width via the `--ticket-col-width` CSS var; the pane's own border moved into the divider (1px rule with hover/focus/drag accent).

**Verification**: unit 18/18 (clamp + divider drag/keyboard); E2E 10/10 (new `divider_resizes_columns_within_range` locks drag, clamp, reset, keyboard, and the vertical stretch); TS/build/lint green.

**Status**: round 2 addressed; awaiting next look.

## Round 3 — 2026-09-23

**Feedback**: "use the same head block style on the doc side"; persist the divider position in localStorage ("find related documents and see how it can be done").

**Fix** (`fix(MDT-248): pane head block + persisted split wall (UAT r3)`):

- Pane header is now the same two-row head block as the ticket column: title bar (`px-4 py-3`, `modal__headline` typography, 32px action controls — hand-off + ×) over a meta bar (`py-2.5`: back/forward + mono path). Replaces the single-row toolbar.
- Wall position persisted as a **percent** of the split body width — `mdt-settings-ticket-side-pane-split-ratio` (config/sidePaneLayout.ts, following the settingsPreferences `mdt-settings-*` conventions). Percent chosen over px: a percent flex-basis resolves live (no restore race with the modal width transition) and keeps the wall's relative position across viewport sizes. Committed on drag end and arrow nudge; double-click reset clears storage; restored when the pane first shows in a later modal. CSS `min-width: 340px` guard holds the readable floor when the window shrinks under a stored position.

**Verification**: unit green across pane + config suites (new sidePaneLayout round-trip/reject tests); E2E 10/10 — the divider journey now closes and reopens the modal and asserts the wall returns to the dragged position with the key present in localStorage; TS/build/lint green.

**Status**: round 3 addressed; awaiting next look.

## Round 4 — 2026-09-23

**Feedback**: (1) pane error on a broken link "looks so so" — is a notifications system needed? (2) on the live MDT-248 ticket, the `designs/ticket-side-doc/` references don't work — did MDT-248 break them? (3) what about E2E coverage?

**Verdict on (2) — not an MDT-248 regression.** Ticket-prose document links live in a tickets-area-relative world: `markdownPreprocessor.resolveDocumentRef` resolves `..` against the ticket's path and, when a path escapes the tickets area, unconditionally prepends the parent of `ticketsPath` (`docs/`). Repo-root paths (`designs/…`) are therefore unreachable from ticket prose by design — and bare `decisions.md` mentions resolve into the unindexed tickets area as clickable-but-dangling. Before MDT-248 these same links navigated to the Documents view and failed there; the pane only changed where the failure shows.

**Fixes** (`fix(MDT-248): pane failure toast + empty state; de-link unreachable refs (UAT r4)`):

- (1) No new notifications system or agent needed — the app already ships Sonner toasts app-wide (`<Toaster>` in ProjectOverlays, `useToast` hook). The pane now uses it: a failure **with a previous document on screen** toasts "Couldn't load {path}" and keeps the previous document (no inline clutter); a **first-open** failure shows a proper centered empty error state (icon + message + path, `role="alert"`), mirroring the ticket-not-found pattern. The thin inline alert is gone.
- (2) The CR's `designs/` references rewritten as non-linking prose (they can never resolve from ticket prose; the POC folder is referenced by path only). Canonical Edge-2 requirement updated and traces re-rendered.
- (3) E2E: new journey `pane_failure_toast_and_empty_state` covers both failure modes against a genuinely dangling-but-clickable target; suite is 11/11.

**Verification**: unit 19/19 (toast mocked via `mock.module`; retained-doc and first-open cases); E2E 11/11; TS/lint/build green.

**Status**: round 4 addressed; awaiting next look.

## Round 5 — 2026-09-24

**Feedback**: "I'd make header block docs side panel: `| {h1 title}  {file/path.md | copy icon} |` and `[<] [>]` floating over content, half transparent by default."

**Fix** (`fix(MDT-248): compact pane header + floating history chip (UAT r5)`):

- Pane header collapses to a single row: title leading, then the trailing cluster — mono path (truncated, capped at 40% of the row) with a copy control beside it, then the existing hand-off + × actions. The meta bar is gone.
- Back/forward leave the header: they float as a small pill chip over the top-left of the pane body (`--bg-elevated` at 85% + backdrop blur, `--border`, `--radius-pill`), half transparent at rest and fully opaque on hover/focus; content scrolls under the chip. The chip is a labelled `role="group"`; disabled bounds keep `cursor-not-allowed`.
- Copy reuses the documents-view `CopyPathButton` verbatim (toast + copied-check feedback), always visible in the pane header as an inline micro control (override scoped to `.ticket-side-pane__path-wrap`).
- Overlay variant (< 1100px): the path cluster yields its space to the title (hidden); `‹ Ticket` leads the row; the floating chip is unchanged.

**Verification**: unit 20/20 (new chrome-contract test: path + copy in the header, history group outside it); E2E 12/12 — new `pane_compact_header_floating_history` journey locks the single row, clipboard copy (`grantPermissions`), the chip's absolute position below the header, resting opacity 0.5 → 1 on hover, and back/forward from the chip; live visual check against the dev server confirmed the loaded state (title + `docs/MDT_WORKING_STATE_FILES.md` + copy + actions on one row, chip at 0.5). TS/lint/build green; wireloom mockups updated and revalidated (4/4 blocks parse+render).

**Status**: round 5 addressed; awaiting next look.

## Round 6 — 2026-09-24

**Feedback**: "the header height is slightly different vs ticket view block. Align right side header to left one."

**Diagnosis**: the pane header rode `py-3` with in-flow 32px chrome controls → 57px, while the ticket column's title row is `py-3` + 24px headline (48px + 1px border = 49px; its × is absolutely positioned, out of flow). The pane's rule sat 8px below the ticket's.

**Fix** (`fix(MDT-248): pane header height parity with ticket title row (UAT r6)`):

- Pane header padding `py-3` → `py-2`: 8 + 32 + 8 = 48px content — exact parity with the ticket row (both rows 49px incl. border; live-verified top/height/bottom = 11/49/60 on both sides, rules form one continuous line). 32px hit targets kept; a CSS comment records the invariant (in-flow 32px controls must never ride `py-3` here).
- Spec gains the parity rule under "Pane header and floating history".

**Verification**: E2E 12/12 ×3 consecutive full runs. Two suite-robustness fixes surfaced while locking parity: BR-1.1's scroll-transfer read is now an `expect.poll` (the transfer can land a frame after pane-visible under load — instant read raced it), and the new parity assertion settles first via a diff-poll (mid-animation rects are fractional and unequal — the r2 `stableColumnWidth` trap again). Unit 20/20, TS/lint green; live re-measure confirms both header rules at the same y.

**Status**: round 6 addressed; awaiting next look.

## Round 7 — 2026-09-24

**Feedback**: (1) "this modal has different [x] buttons. The source must be only 1, 1 style. review architecture, fix drifts." (2) "The system recovers opened document, but it has to be within a context. I'd keep it within a ticket. Where this stays, storage? localStorage? If we open many tickets with many docs we might get obsolete data — or limit the stack of remembered opened docs, FILO, 5 default. It will keep history too." (3) "Right click on back/forward shall show menu for elements (title / file path, like the documents nav tree)."

**Fixes** (`feat(MDT-248): per-ticket reading sessions, history jump menu, single × source (UAT r7)`):

- **One × source**: new `ModalCloseButton` (ui/Modal.tsx) with the single `.modal__close` style (32px button, 20px glyph) — used by `ModalHeader`, the ticket viewer's card-absolute ×, and the pane's ×. Positioning variants (`--absolute`, `--split`) only place it. Pane chrome icons (hand-off, back/forward) match the 20px glyph — one chrome family. Rule recorded in MODALS.md.
- **Per-ticket reading sessions** (answers the storage question: localStorage, `mdt-settings-ticket-side-pane-sessions`, config/sidePaneSessions.ts): each `{projectId, ticketKey}` keeps `{hist, hi, scrolls, titles}` — full history — FILO-capped at **5 tickets** most-recent-first (the cap is the obsolescence control; no sweeps needed). Modal close tucks the pane and keeps the snapshot; reopening the ticket restores it **hidden** (the pill names the document). × discards and clears the snapshot. The snapshot belongs to the ticket where the session started — ticket hops don't claim the new ticket's slot. Truncated entries' scroll/title keys are pruned at save; deleted documents degrade to the Edge-2 failure UX.
- **History jump menu**: right-clicking back/forward (vendored Radix `ui/context-menu.tsx`) lists that direction's entries in the documents nav-tree row format — title over mono path (last-known titles from the session, humanized fallback) — and activating an entry jumps without truncating the stack. Modal outside-click now exempts Radix portal layers (menus render at document.body and were closing the modal mid-selection).

**Canonical updates**: Edge-5 revised (per-ticket snapshot, restore-hidden, × clears) and BR-1.11 added (history jump menu) via spec-trace upsert; scenario + E2E test-plan coverage expanded; traces re-rendered; requirements.md decision rows revised with a dated addendum.

**Verification**: unit 1190/1190 full frontend (new: session store 7 — round-trip/scoping/FILO cap/eviction protection/pruning/garbage/clear; hook restore/recordTitle/jumpTo); E2E pane suite 14/14 ×6 consecutive (new: `pane_history_context_menu_jumps`, `modal_close_keeps_per_ticket_reading_snapshot`); TS/lint/build green. Full E2E regression 372 passed / 3 failed — all three verified unrelated (invalid-status = documented pre-existing baseline; read-access journey reproduces identically at the pre-r7 baseline commit; type-icon-options is a parallel-load flake passing solo). Two product bugs found and fixed on the way: the session pill sat under the floating ToC (z-20 < z-40) and was unclickable on short content; BR-1.1's scroll-transfer E2E precondition could clamp to 0 before content was tall (test now sets-and-verifies).

**Status**: round 7 addressed; awaiting next look.

## Round 8 — 2026-09-24 (post-close hardening)

**Feedback**: clicking `docs/design/surfaces/swimlane-board.spec.md` from MDT-206's debt.md "breaks the app heavily — the system does not catch this error." Console: `Invalid hook call … more than one copy of React` → `Uncaught TypeError: Cannot read properties of null (reading 'useRef')` at `ContextMenu` under `HistoryNavButton`, then React unmounted the whole tree.

**Diagnosis**: not a pane-logic bug — a **duplicate React**. The `@radix-ui/react-context-menu` package added in r7 was pre-bundled by Vite in a separate optimizer session (chunk `?v=0f5a7dd9` alongside the app's `?v=a8f3f828`) while the user's long-lived dev tab kept the old module graph; the new dep chunk carried its own React copy, so the menu's `useRef` resolved against a foreign, null dispatcher. Fresh page loads merge into one optimizer session (why 10/10 fresh-context repros were clean); the mixed-graph tab crashed on the ContextMenu mount, and with no boundary between pane and modal the crash unmounted everything.

**Fixes** (`fix(MDT-248): dedupe React in Vite + pane error boundary (UAT r8)`):

- `resolve.dedupe: ['react', 'react-dom']` in vite.config.ts — structural guarantee: every dependency chunk resolves the app's single React, whatever optimizer session bundled it.
- New `PaneErrorBoundary` around `TicketSidePane`: any render error in the pane subtree degrades to an inline "Something went wrong showing this document / the ticket is unharmed" state; the ticket column, modal chrome, and session keep working. The pane can no longer take the app down (demand #1).
- Esc refinement exposed while verifying: one Escape now closes the history menu only (stopped at the menu content) instead of also tucking the pane — matches the r7 interaction contract.

**Verification**: unit 3/3 boundary suite (throwing pane contained, fallback copy, siblings alive) within 93/93 TicketViewer; E2E 14/14 with the menu journey now also locking the menu-only Escape; live reproduction of the exact user path (restored 2-entry session → reveal → right-click back → menu mounts) green with zero console errors post fix — the config change restarts Vite's optimizer, so the user's next tab reload is clean.

**Status**: round 8 addressed; ticket stays Implemented.
