# Architecture: MDT-248

## Overview

The ticket viewer hosts a side reading pane. Three decisions carry the design: (1) document delivery becomes a **React context seam at SmartLink** — the ticket viewer provides a handler, every other surface keeps today's router navigation untouched; (2) the pane session is a **hook-owned state machine** (`useSidePane`) living exactly one modal lifetime, with browser-tab history and per-entry scroll memory; (3) the modal gains an additive **`split` width tier** and switches its body to two internal scroll regions while the pane is visible, with an explicit scroll-position transfer so the ticket column never jumps.

Pattern: *hosted secondary surface* — same pattern as the trace shell (a capability the ticket viewer mounts around its content), but inline rather than full-viewport. Chosen over extending `TicketDocumentTabs` (tabs hide content — the job is reference) and over the docs-zai workspace model (pane management is out of scope; `designs/ticket-side-doc/decisions.md` records the rejected options).

## Module Boundaries

| Module | Owns | Does not own |
|--------|------|--------------|
| `SmartLink/documentDelivery.ts` (new) | the `DocumentDeliveryContext` + `useDocumentDelivery()` hook; default `null` | what delivery means |
| `SmartLink/index.tsx` | deciding, at click time, whether a DOCUMENT link is pane-delivered (context handler + `normalizedLink.filePath` present, link not flagged) or router-navigated | pane behavior |
| `TicketViewer/useSidePane.ts` (new) | session state machine: history stack, index, scroll map, visible flag; open/back/fwd/hide/reveal/discard | rendering, fetching |
| `TicketViewer/TicketSidePane.tsx` (+ css, new) | pane chrome (header, history controls, hand-off, close), document fetch + render, loading/error states, the session pill | session truth (owned by `useSidePane`) |
| `TicketViewer/index.tsx` | composition: provides delivery context, mounts pane + pill, modal size/Escape gating, scroll transfer | — |
| `ui/Modal.tsx` + `modal.css` | one new size tier (`split`); everything else unchanged | split scroll layout (owned by ticket-viewer css) |

Import direction: `SmartLink` owns the context module; `TicketViewer` imports and provides it. The generic component never imports the feature.

## Canonical Flow — document link inside the ticket modal

```text
click on a.smart-link[data-link-type="document"] (rendered inside TicketViewer's MarkdownContent)
→ SmartLink onClick: useDocumentDelivery() returns handler && normalizedLink.filePath && !documentMissing
→ preventDefault; handler(filePath)                      // router navigation never fires
→ useSidePane.openDocument(filePath): capture current pane scroll, truncate forward stack, push, visible=true
→ TicketViewer re-renders: Modal size="split", body switches to .ticket-viewer-body--split
→ scroll transfer effect: overlay scrollTop → ticket column scrollTop (pane open) / reverse (hide/close)
→ TicketSidePane fetches /api/documents/content?projectId&filePath (authFetch; cached per path in the session)
→ pane renders MarkdownContent (document prose variant, density + theme parity) or HtmlSandboxViewer for HTML
```

Escape: `closeOnEscape = !isTraceGraphOpen && !paneVisible`; `useSidePane` binds its own document keydown (Escape → hide) while visible. The Modal's handler is inert whenever the pane is visible, so ordering is irrelevant; one Esc walks out exactly one layer (trace shell → pane → modal).

## Program Design (contracts)

```ts
// SmartLink/documentDelivery.ts
export interface DocumentDelivery { openDocument(filePath: string): void }
export const DocumentDeliveryContext: React.Context<DocumentDelivery | null>
export function useDocumentDelivery(): DocumentDelivery | null   // SmartLink consumes

// TicketViewer/useSidePane.ts
interface SidePaneState { hist: string[]; hi: number; scrolls: Record<string, number>; visible: boolean }
function useSidePane(): {
  state;                                   // hist/hi/scrolls/visible
  currentPath: string | null;
  hasSession: boolean; paneVisible: boolean; canBack: boolean; canFwd: boolean;
  openDocument(path: string): void;        // reveal + push (dedupe consecutive)
  back(): void; fwd(): void;               // scroll applied by the pane via scrolls
  hide(): void; reveal(): void;            // keep session
  discard(): void;                         // session dies
  captureScroll(top: number): void;        // called by the pane at navigation boundaries only
}

// TicketViewer/TicketSidePane.tsx — presentational, props-driven (no session truth)
<TicketSidePane projectId hist hi visible scrolls fetchContent? onBack onForward
                onHide onDiscard onOpenInDocuments onScrollChange onTitleChange? />
<SidePanePill title onReveal />            // ticket-column affordance
```

Least-confident decisions and what would invalidate them:

1. **Scroll transfer via overlay↔column handoff** — evidence: MODALS.md documents the outer overlay as today's scroll container; the no-jump architecture is the hard constraint. Invalidated if the modal body ever becomes internal-scroll always; then the transfer collapses to nothing and C2 is satisfied structurally.
2. **Session dies with the modal (no URL state)** — evidence: CR defers URL encoding; `#trace` shows hash-state deep links are the precedent when needed. Invalidated by a product ask for shareable ticket+doc links; then session moves to route state and Edge-5 changes meaning.
3. **Per-path content cache in the pane component (ref map)** — evidence: documents are static enough within a session; SSE live-update for pane docs is out of scope. Invalidated by a need for live-updating pane docs; then cache moves behind a query hook with invalidation.

## Invariants

- `SmartLink` behavior with no provider is byte-identical to today (C6).
- Flagged (known-missing) document links never deliver anywhere — they stay non-clickable (C7).
- The pane never renders a ticket; the ticket column never renders a repo document (routing table, interactions.md).
- The ticket column's scroll position survives pane open/hide/close exactly (C2); the modal's top-left anchor never moves (no-jump).
- Esc never discards a session; only pane × or modal close does (interactions.md state machine).
- The floating ToC and the modal close × stay scoped to the ticket column (spec Layout).

## Structure

```text
frontend/src/components/
  SmartLink/
    documentDelivery.ts        (new) context + hook
    index.tsx                  (edit) DOCUMENT case: context-mediated delivery
  TicketViewer/
    useSidePane.ts             (new) session state machine
    TicketSidePane.tsx         (new) pane + pill components
    ticket-side-pane.css       (new) pane chrome, split columns, pill, overlay breakpoint
    ticket-viewer.css          (edit) split body variant + scroll regions
    index.tsx                  (edit) composition, modal gating, scroll transfer
    TicketSidePane.test.tsx    (new) unit closure for C*/Edge-*
  ui/
    Modal.tsx                  (edit) add 'split' size key
    modal.css                  (edit) .modal-content--split tier + width transition
tests/e2e/
  ticket/side-doc-pane.spec.ts (new, RED) TEST-side-doc-pane
  utils/selectors.ts           (edit) sidePaneSelectors
docs/design/surfaces/
  ticket-side-doc.spec.md            (sync at UX gate)
  ticket-side-doc.interactions.md    (sync at UX gate)
```

## Tradeoffs and Alternatives

- **Context seam vs custom event bus**: context is typed, provider-scoped, and testable; an event bus would let any surface deliver without opting in — precisely the C6 risk. Context wins.
- **New `split` modal tier vs widening `xl`**: a new tier is additive and explicit; redefining `xl` would change every `xl` modal (settings, search) — rejected.
- **Fetch-in-pane vs reusing MarkdownViewer wholesale**: MarkdownViewer carries ToC/frontmatter chrome the pane doesn't need; the pane reuses the endpoint and the prose pipeline instead. Small duplication of the fetch call, isolated behind the pane.

## Error Philosophy

- Pane fetch failure: inline error in the pane body, previous document retained, session intact (Edge-2). No toast, no modal-level disruption.
- Delivery of a target that becomes invalid mid-session: the link renders flagged (existing SmartLink path, C7); the pane keeps its current document (Edge-6).
- The pane never blocks the ticket column: pane errors are pane-local.

## Extension Rule

When the URL-encoding question lands (shareable ticket + open doc), encode pane state as a reserved token alongside `#trace` in `frontend/src/routes.ts`; the session hook stays the single owner of pane truth, and the route only seeds/deserializes it. Multi-pane and gathered-Related remain rejected directions until evidence reopens them (`designs/ticket-side-doc/decisions.md`).
