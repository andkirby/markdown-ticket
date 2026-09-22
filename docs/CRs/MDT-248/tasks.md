# Tasks: MDT-248

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- Delivery seam: `SmartLink` decides pane-vs-router delivery at click time only; classification, normalization, and flagging are untouched.
- Pane: `TicketViewer/TicketSidePane.tsx` + `useSidePane.ts` own the session; nothing else holds pane truth.
- Modal: one additive `split` size tier; all other modal consumers unaffected.
- E2E contract: `sidePaneSelectors` + `tests/e2e/ticket/side-doc-pane.spec.ts` (already RED).
- Must not touch: `docs/CRs/MDT-249*` (user's parallel work), `DocumentsView/` internals (hand-off target only), `server/**` (no endpoint changes), `domain-contracts/**` (pre-existing lint debt stays).

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|-------------------------------|
| Document-link delivery decision | `SmartLink/index.tsx` + `documentDelivery.ts` | N/A (no other surface may deliver) |
| Pane session truth (hist/hi/scrolls/visible) | `TicketViewer/useSidePane.ts` | N/A |
| Pane chrome + fetch + render | `TicketViewer/TicketSidePane.tsx` | N/A |
| Split modal geometry + scroll transfer | `TicketViewer/index.tsx` + css | N/A |
| Document content endpoint usage | existing `/api/documents/content` | import-only; no second fetch path |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 (split geometry) | Task 3, Task 4 |
| C2 (no-jump / scroll preservation) | Task 4, Task 5 |
| C3 (keyboard + Esc chain) | Task 6 |
| C4 (prose parity) | Task 3, Task 10 |
| C5 (landmark + announcements) | Task 3, Task 6 |
| C6 (delivery isolation) | Task 1, Task 10 |
| C7 (missing links inert) | Task 1, Task 10 |
| Edge-1..6 | Tasks 3, 5, 6, 9, 10 (unit closure) |

## Milestones

| Milestone | BDD Scenarios (BR) | Tasks | Checkpoint | Observable Proof |
|-----------|--------------------|-------|------------|------------------|
| M0 | — | skipped | Runner proven by RED E2E run (9/9 failed at pane selector, not at harness) | `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts` |
| M1: open beside | BR-1.1, BR-1.2 | Task 1–4 | `doc_link_opens_pane_beside_ticket`, `pane_follow_link_stays_in_pane` GREEN | same E2E command, `--grep "BR-1.1|BR-1.2"` |
| M2: history + session states | BR-1.3, BR-1.4, BR-1.5, BR-1.6, BR-1.10 | Task 5–6 | 3 scenario tests GREEN | `--grep "BR-1.3|BR-1.4|BR-1.6|BR-1.10"` |
| M3: survival + hand-off | BR-1.7, BR-1.8 | Task 7–8 | 2 scenario tests GREEN | `--grep "BR-1.7|BR-1.8"` |
| M4: responsive + closure | BR-1.9 + all C/Edge | Task 9–10 | full suite GREEN; unit suite GREEN; regression suites GREEN | commands below |

## Tasks

### Task 1: Document delivery context seam + SmartLink interception (M1)

**Skills**: mdt-frontend
**Structure**: `frontend/src/components/SmartLink/documentDelivery.ts` (new)
**Scope**: context + hook; SmartLink DOCUMENT case calls the handler with `normalizedLink.filePath` when a provider exists and the link is not flagged; otherwise today's router navigation.
**Boundary**: no changes to classification, normalization, missing-flagging, or any other link type.
**Creates**: `documentDelivery.ts`
**Modifies**: `SmartLink/index.tsx`
**Deletes**: None
**Must Not Touch**: `linkProcessor.ts`, `linkNormalization.ts`, `documentExistenceCache.ts`
**Anti-duplication**: import the context from `documentDelivery.ts` — do NOT re-create a context elsewhere.
**Duplication Guard**: delivery decision exists only in SmartLink's DOCUMENT case (checked: no other delivery path).
**Re-plan Trigger**: if `normalizedLink.filePath` proves absent for resolvable document links, stop — the seam's payload must come from the normalizer, not ad-hoc href parsing.
**Verify**: `bun test --isolate ./frontend/src/components/TicketViewer/TicketSidePane.test.tsx -t "documentDelivery"`
**Done when**: unit delivery tests GREEN; SmartLink behavior without provider byte-identical.

### Task 2: useSidePane session state machine (M1)

**Skills**: mdt-frontend
**Structure**: `frontend/src/components/TicketViewer/useSidePane.ts` (new)
**Scope**: hist/hi/scrolls/visible state; openDocument (reveal + push + dedupe + truncate), back/fwd (scroll capture/restore), hide/reveal, discard, captureScroll.
**Boundary**: no rendering, no fetching, no Esc wiring (TicketViewer owns gating).
**Creates**: `useSidePane.ts`
**Modifies**: None
**Deletes**: None
**Must Not Touch**: `useTicketDocumentNavigation.ts` (subdoc navigation is a different domain)
**Anti-duplication**: single session owner — do not mirror pane state in TicketViewer locals.
**Duplication Guard**: history semantics match the interactions.md browser-tab model; no parallel history array in the component.
**Re-plan Trigger**: if scroll capture needs DOM measurement beyond a number (virtualized content), stop and re-architect.
**Verify**: `bun test --isolate ./frontend/src/components/TicketViewer/TicketSidePane.test.tsx -t "useSidePane"`
**Done when**: state-machine unit tests GREEN.

### Task 3: Modal split tier + TicketSidePane component + pill + css (M1)

**Skills**: mdt-frontend
**Structure**: `frontend/src/components/TicketViewer/TicketSidePane.tsx`, `ticket-side-pane.css` (new); `ui/Modal.tsx`, `ui/modal.css` (edit)
**Scope**: pane chrome (header/back/forward/hand-off/close/overlay-return), document fetch (injectable for tests) + error retention, MarkdownContent render with `prose--document` + density, HtmlSandboxViewer for HTML, `SidePanePill`, `split` size tier + width transition, semantic classes only (contracted-file hook).
**Boundary**: layout columns live in ticket-viewer css (Task 4); this task owns pane-internal styles + the modal tier.
**Creates**: `TicketSidePane.tsx`, `ticket-side-pane.css`
**Modifies**: `ui/Modal.tsx`, `ui/modal.css`
**Deletes**: None
**Must Not Touch**: other modal consumers' classes; `MODALS.md` (docs sync is Task 10)
**Anti-duplication**: import delivery context from `documentDelivery.ts`; reuse `authFetch` + the documents endpoint — do NOT fork the fetch path.
**Duplication Guard**: no second prose variant; use `prose--document`.
**Re-plan Trigger**: if `prose--document` styling diverges from the ticket column's density behavior, stop — parity is a constraint (C4).
**Verify**: `bun test --isolate ./frontend/src/components/TicketViewer/TicketSidePane.test.tsx -t "TicketSidePane|SidePanePill"`
**Done when**: pane chrome unit tests GREEN (landmark, path, prose class, disabled bounds, error retention).

### Task 4: Integrate into TicketViewer with scroll transfer (M1 — checkpoint)

**Skills**: mdt-frontend, playwright-cli
**Structure**: `frontend/src/components/TicketViewer/index.tsx`, `ticket-viewer.css`
**Scope**: provide delivery context; mount pane + pill; `size={paneVisible ? 'split' : 'xl'}`; `closeOnEscape` gating; split body variant with two internal scroll regions; overlay→column scrollTop transfer both directions (C2); focus moves to pane header on open.
**Boundary**: subdoc tabs, TOC, trace graph untouched; ToC must not overlap the pane (verify positioning).
**Creates**: None
**Modifies**: `index.tsx`, `ticket-viewer.css`
**Deletes**: None
**Must Not Touch**: `TraceGraphShell`, `useTicketDocument*` hooks
**Anti-duplication**: pane state via `useSidePane` only.
**Duplication Guard**: no second Escape handler outside the Modal+pane pair.
**Re-plan Trigger**: if the scroll transfer cannot preserve position exactly across the container identity switch, stop — that is architecture decision 1 being invalidated.
**Makes GREEN (Behavior)**: `doc_link_opens_pane_beside_ticket`, `pane_follow_link_stays_in_pane` → `tests/e2e/ticket/side-doc-pane.spec.ts`
**Verify**: `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts --grep "BR-1.1|BR-1.2"`
**Observe**: E2E output shows the two M1 tests passing; all other pane tests still RED (expected).

### Task 5: History back/forward with scroll restore (M2)

**Skills**: mdt-frontend
**Scope**: wire back/forward controls to the hook; apply per-entry scroll on path change; disabled states with `cursor-not-allowed`.
**Boundary**: no history UI beyond the two controls (no trail, no dropdowns — rejected alternatives).
**Creates**: None — **Modifies**: `TicketSidePane.tsx`, `useSidePane.ts` (if capture timing needs it) — **Deletes**: None
**Must Not Touch**: subdoc tab history
**Anti-duplication**: single scroll map in the hook.
**Duplication Guard**: scroll restore happens in exactly one effect (pane body), not per control.
**Re-plan Trigger**: rapid-click history corruption (Edge-3) if observed — revisit commit semantics.
**Makes GREEN (Behavior)**: `pane_back_forward_restores_scroll` → e2e spec
**Verify**: `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts --grep "BR-1.3"`

### Task 6: Esc chain, hide/reveal pill, discard (M2 — checkpoint)

**Skills**: mdt-frontend
**Scope**: pane-visible Escape listener → hide; `closeOnEscape={!trace && !paneVisible}`; pill render conditions + reveal; × discard; focus returns (pill on hide); open/hide/discard live-region announcements.
**Boundary**: trace shell Esc behavior untouched.
**Creates**: None — **Modifies**: `TicketViewer/index.tsx`, `TicketSidePane.tsx`, `ticket-side-pane.css` — **Deletes**: None
**Must Not Touch**: `Modal.tsx` escape implementation
**Anti-duplication**: exactly one pane-Escape listener.
**Duplication Guard**: pill visibility = `hasSession && !paneVisible` — no mirrored boolean.
**Re-plan Trigger**: if Modal's escape effect races the pane listener (ordering), stop and consolidate gating.
**Makes GREEN (Behavior)**: `escape_hides_pane_pill_reveals`, `pane_close_discards_session`, `escape_with_pane_hidden_closes_modal` → e2e spec
**Verify**: `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts --grep "BR-1.4|BR-1.6|BR-1.10"`

### Task 7: Session survives ticket-column swaps (M3)

**Skills**: mdt-frontend
**Scope**: verify/fix that ticket-link swaps (route param change) keep the viewer mounted with pane state; no state reset on ticket prop change.
**Boundary**: no changes to ticket-link navigation itself (`?view=` carry untouched).
**Creates**: None — **Modifies**: `index.tsx` only if a reset path exists — **Deletes**: None
**Must Not Touch**: `viewModeDerivation.ts`
**Anti-duplication**: none expected.
**Duplication Guard**: none expected (verification-heavy task).
**Re-plan Trigger**: if the viewer remounts on ticket change (keyed remount), the session owner must move up — architecture decision 2 territory.
**Makes GREEN (Behavior)**: `ticket_link_swaps_column_pane_survives` → e2e spec
**Verify**: `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts --grep "BR-1.7"`

### Task 8: Open-in-Documents hand-off (M3)

**Skills**: mdt-frontend
**Scope**: pane header control navigates to the current document's Documents URL (from the normalizer's webHref shape); closes the modal.
**Boundary**: Documents view arrival behavior untouched.
**Creates**: None — **Modifies**: `TicketSidePane.tsx` — **Deletes**: None
**Must Not Touch**: `documents-view-navigation.spec.md` contracts
**Anti-duplication**: reuse the link's normalized web route; do not hand-build the URL twice.
**Duplication Guard**: single URL builder path.
**Re-plan Trigger**: none likely.
**Makes GREEN (Behavior)**: `handoff_opens_documents_view` → e2e spec
**Verify**: `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts --grep "BR-1.8"`

### Task 9: Narrow-viewport overlay variant (M4)

**Skills**: mdt-frontend, playwright-cli
**Scope**: `<1100px` media query: pane absolute overlay inside modal body; `‹ Ticket` return control (hidden ≥1100px); live crossing without session loss.
**Boundary**: no JS breakpoint listener unless CSS proves insufficient.
**Creates**: None — **Modifies**: `ticket-side-pane.css`, `TicketSidePane.tsx` — **Deletes**: None
**Must Not Touch**: app-level responsive rules
**Anti-duplication**: one breakpoint constant (CSS comment-linked to spec).
**Duplication Guard**: overlay vs split share the same pane DOM — no second overlay component.
**Re-plan Trigger**: if resize crossing loses scroll/session, revisit layout anchoring.
**Makes GREEN (Behavior)**: `narrow_viewport_pane_overlays` → e2e spec
**Verify**: `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts --grep "BR-1.9"`

### Task 10: Full green + regression + docs sync (M4 — final)

**Skills**: playwright-cli
**Scope**: full unit suite GREEN; full pane E2E GREEN; regression: existing doc-link specs (`smartlink-doc-refs`, `inline-code-doc-links`), subdoc specs, `detail.spec.ts`; `MODALS.md` gains the split layout mode; `ticket-side-doc.spec.md`/`interactions.md` final sync check; `ticket-viewer.spec.md` verification anchors refreshed.
**Boundary**: no behavior changes while syncing docs — drift found means a fix task, not a doc patch over drift.
**Creates**: None — **Modifies**: `frontend/src/MODALS.md`, durable docs (sync only) — **Deletes**: None
**Must Not Touch**: `docs/CRs/MDT-249*`
**Anti-duplication**: docs state contracts once and cross-reference.
**Duplication Guard**: MODALS.md split mode must not restate the pane spec — it owns the modal pattern only.
**Re-plan Trigger**: any regression failure in the two doc-link spec families that can't be attributed to intended delivery change.
**Verify**:
```bash
bun test --isolate ./frontend/src/components/TicketViewer/TicketSidePane.test.tsx
bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts
bun run test:e2e -- tests/e2e/ticket/smartlink-doc-refs.spec.ts tests/e2e/ticket/inline-code-doc-links.spec.ts
bun run validate:ts && bun run lint
```
**Observe**: `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts` → 9/9 passed.

## Post-Implementation

- [x] No duplication (grep check — single delivery seam, single session owner, single prose variant)
- [x] Scope boundaries respected (MDT-249 untouched; server/shared/domain untouched)
- [x] Actual create/modify/delete paths match task mutation intent
- [x] All unit tests GREEN (13/13 pane suite; 1169/1169 full frontend)
- [x] All BDD scenarios GREEN (9/9 side-doc-pane E2E)
- [x] Milestone observable proofs pass with real execution
- [x] Fallback/absence paths match requirements (delivery without provider; flagged links)

Post-verify notes (2026-09-23): fixture links in the E2E spec initially resolved one
directory too deep (`../../docs/x.md` from a subdoc doubles `docs/`); corrected to
`../../x.md`. The BR-1.6 test caught a real overlap bug — the modal-level close ×
stacked over the pane × in split mode; fixed with `.modal__close--split` scoping
the close to the ticket column (spec rule: modal chrome never overlays the pane).

## Post-Verify Fixes (recorded by `mdt:implement`)

- None yet.
