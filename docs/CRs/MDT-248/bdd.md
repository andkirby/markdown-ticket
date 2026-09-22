# BDD: MDT-248

**Source**: [MDT-248](../MDT-248-ticket-side-doc.md) · [requirements.trace.md](./requirements.trace.md)
**Generated**: 2026-09-23 · Stage: `mdt:bdd` · Mode: normal (canonical)

## Overview

Five journeys, nine scenarios, all `route=bdd` behaviors covered: open-beside (link → pane, follow-link), history (back/forward with scroll restore), session states (Esc-hide + pill-reveal, ×-discard, Esc-close-modal), context survival (ticket hop), and hand-off/responsive (Documents hand-off, narrow overlay). The ticket column never moves and never loses state — that invariant threads through every scenario's `Then`.

## Acceptance Strategy

- **Executable**: Playwright E2E — `tests/e2e/ticket/side-doc-pane.spec.ts` (`TEST-side-doc-pane`, 9 tests), written RED against the planned DOM contract (`sidePaneSelectors` in `tests/e2e/utils/selectors.ts`). Command: `bun run test:e2e -- tests/e2e/ticket/side-doc-pane.spec.ts`
- **Unit-closed at `mdt:tests`**: constraints and edges (C1–C7, Edge-1..6) — geometry, scroll preservation, Esc chain ordering, prose parity, aria landmark/announcements, delivery isolation outside the modal, flagged-missing links, rapid navigation, breakpoint crossing, session death on modal close, mid-session invalidation
- Budget: 9/12 scenarios; max 3 per journey — within gate

## Test-Facing Contract Notes

The E2E suite locks this DOM contract:

- pane: `aside[data-testid="ticket-side-pane"]`, visible only in open states; header exposes `ticket-side-pane-{title,path,back,forward,close,open-documents}`; overlay variant adds `ticket-side-pane-back-to-ticket` (split variant does not render it)
- pill: `button[data-testid="ticket-side-pane-pill"]`, visible exactly when a session exists and the pane is hidden; contains the current document title
- scroll region: `[data-testid="ticket-side-pane-scroll"]` — scrollTop is the observable for scroll memory
- delivery: clicking `a.smart-link[data-link-type="document"]` inside the ticket modal does NOT navigate (URL unchanged) — the pane opens instead; the link's href still points at the Documents route (rendering contract unchanged, MDT-150 specs keep passing)

Fixtures: `simple` scenario; chained docs `docs/side-doc-guide.md` → `docs/deep-dive.md` (deep-dive padded with 30 filler paragraphs for scroll assertions); links hosted in an `architecture.md` subdoc (`../../docs/…` relative refs, the MDT-150 pattern); sibling ticket from `scenario.crCodes[1]`.

Scroll determinism: link clicks inside the pane use JS dispatch (`el.click()`) in the scroll test — Playwright's actionability scroll would move the pane before the app snapshots the position.

## Execution Notes

- RED expectation: all 9 fail at `sidePaneSelectors.pane` visibility until implementation lands
- Esc tests rely on the chain order (pane before modal); the trace-shell layer is covered by existing MDT-174 specs and not re-tested here
- Narrow test resizes the live page (900×800) rather than spawning a separate context, because Edge-4 (crossing while open) is the risky direction

---
*Rendered by mdt:bdd via spec-trace 0.4.0*
