# Assessment: MDT-248

## Verdict

**Recommendation**: Option 1 — Integrate As-Is

The ticket modal already owns multi-content layouts (subdoc tabs, trace shell), SmartLink centralizes every markdown link's rendering, and the document fetch path the pane needs is already used by the Documents view. The feature lands as a new child surface plus two additive seams; nothing existing must be reorganized first.

## Feature Pressure

### Target Feature Needs
- Repo-document links clicked inside the open ticket modal must open in a side pane beside the ticket (never navigate away), with follow-links staying in the pane.
- A per-pane history with scroll restore, and a three-state session model (closed / open / hidden) with an always-visible reveal affordance (pill) and a separate discard action.
- The modal must widen into a two-scroll-region split layout while the pane is visible, without moving or narrowing the ticket column, and degrade to a full-cover overlay below 1100px.
- Ticket links keep swapping the ticket column in place; the session survives ticket hops; the session dies with the modal.

### Current System Assumptions
- The ticket viewer is a single-column free-growing modal (`MODALS.md` Pattern B); the outer overlay is the scroll container.
- `SmartLink` renders DOCUMENT links as router `<Link>`s to the Documents view — one delivery path, no per-surface override.
- Modal widths come from a fixed size registry (`modal-content--{sm,md,lg,xl,full}` in `modal.css`); the size is static per mount.
- Esc closing is a boolean prop (`closeOnEscape`) the viewer already gates per state (`!isTraceGraphOpen`).

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | Pane is a new child of the ticket viewer; ownership stays in TicketViewer; no boundary warping |
| Extension Fit | Healthy | Two clean seams: SmartLink already centralizes link rendering (context-based delivery override); Modal size registry is CSS-owned and additive |
| Dependency Fit | Healthy | No new packages, endpoints, or config; responsive is CSS-only; reuses `/api/documents/content` |
| Verification Fit | Concerning | Two existing E2E families (`smartlink-doc-refs.spec.ts`, `inline-code-doc-links.spec.ts`) click doc links inside the ticket modal and assert current delivery — they will drift and must be updated alongside |
| Redesign Scope | Healthy | Split layout is an additive modal variant (constrained mode already exists as a pattern); no foundational change |

## Mismatch Points

### Link delivery inside the ticket modal
- Current system assumes: DOCUMENT links always navigate to the Documents view (single delivery path in `SmartLink`).
- Feature needs: per-surface delivery — pane when a ticket modal hosts the link, Documents view everywhere else.
- Mismatch: the delivery decision lives in `SmartLink`'s render, which has no knowledge of the hosting surface.
- Adjustment required: React context provided by the ticket viewer; `SmartLink`'s DOCUMENT case calls the context handler (with the normalized target path) before falling back to router navigation. Context default = current behavior, so all other surfaces are untouched.
- Scope: local

### Modal geometry and scroll model
- Current system assumes: static width class per mount; free-growing body scrolled by the outer overlay.
- Feature needs: dynamic width (xl → widened split) while the pane is visible, and two internal scroll regions so the ticket column's scroll position survives pane open/hide/close.
- Mismatch: the scroll container identity changes (overlay → column) when the split activates.
- Adjustment required: new `modal-content` width tier + a split body variant that switches the ticket column to its own scroll container; an explicit scroll-position transfer on activation/deactivation preserves position (no-jump architecture holds). MODALS.md gains this third layout mode.
- Scope: local (bounded CSS + one layout branch in the viewer)

### Esc ordering
- Current system assumes: `closeOnEscape` is a static boolean per modal state (already toggled for the trace shell).
- Feature needs: Esc to walk outward one layer per press (trace shell → pane → modal).
- Mismatch: none structurally — the existing pattern extends: `closeOnEscape = !traceOpen && !paneVisible`, pane handles its own Escape via a document-level listener while visible.
- Adjustment required: none beyond the gate expression; ordering is safe because the Modal's listener is inert while `closeOnEscape` is false.
- Scope: local

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: none (a future `documentLinks.openIn` config default is explicitly out of scope for this CR)
- Testing/E2E impact: new E2E spec for the pane; the two existing doc-link spec families need expectations updated for in-modal delivery; component tests extend `TicketViewer.test.tsx` harness (bun:test + testing-library, no DnD context needed for the viewer)
- Main risk introduced: regression of doc-link behavior outside the ticket modal (Documents view, quick search, ticket attributes) if the SmartLink seam leaks — covered by keeping the context default inert and asserting unchanged delivery in existing surfaces

## Verification Gaps

- Preservation tests needed: existing doc-link E2E families above must keep passing for link *rendering* (classification, missing-link flagging) with delivery expectations updated for the modal case; Documents-view delivery must remain asserted somewhere (it is, in `documents/` specs' direct URL entries, plus the fallback case outside modals)
- E2E/contract drift risks: `.smart-link[data-link-type="document"]` selector contract is stable; the *navigation* expectation changes only when the ticket modal hosts the link
- Safe-to-refactor now?: yes — `bun run check` green except documented pre-existing domain-contracts lint (24 import-order errors, unrelated); TicketViewer has an established component-test harness

## Recommendation

### Option 1: Integrate As-Is
Use when: the feature extends existing owners along their own seams (it does — viewer child surface, SmartLink context, Modal size registry, existing documents API).
Architecture impact: bounded to the two local adjustments above; both are additive and already specified in `docs/design/surfaces/ticket-side-doc.spec.md` + `.interactions.md`.
