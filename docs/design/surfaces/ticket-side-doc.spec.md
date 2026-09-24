# Ticket Side Doc

The ticket viewer's side reading pane: repo documents open beside the ticket, inside the same modal, so following document links never leaves the ticket context (MDT-248).

Related interactions: `ticket-side-doc.interactions.md` (state machine, link routing, Esc chain, keyboard/focus)
Related ticket: `docs/CRs/MDT-248-ticket-side-doc.md`
Design source: `designs/ticket-side-doc/` (interactive POC + options record in `decisions.md`)

## Owns

- The pane's composition, states, and layout inside the ticket viewer modal.
- The split (widened) layout variant of the ticket modal: ticket column + pane geometry.
- The session pill (hidden-state affordance) and its placement in the ticket column.
- The user-visible contract of what opens where (document links vs ticket links vs external links).

## Does Not Own

- Link classification, normalization, and known-missing flagging — `SmartLink` / `linkProcessor` (unchanged behavior, intercepted delivery).
- Modal base behaviors (backdrop, focus trap, body scroll lock) — `MODALS.md`.
- Markdown rendering and typography — `markdown-content.spec.md` (`documents` variant for pane docs).
- Documents view behavior after hand-off — `documents-view-navigation.spec.md`.
- The ticket modal's URL model (hash tokens like `#trace`); pane URL encoding is deferred (see Extension notes).

## Composition

```text
TicketViewer Modal[size="xl", widened variant when pane visible]
└── div.ticket-viewer-content
    ├── div.ticket-column (existing viewer: CompactTicketHeader, TicketDocumentTabs, content)
    │   └── button.ticket-side-pane__pill (conditional: session exists AND pane hidden)
    └── aside.ticket-side-pane (conditional: pane visible)
        ├── div.pane-header (single row, border-b)
        │   ├── button[‹ Ticket] (overlay variant only)
        │   ├── span[document title] (truncate)
        │   ├── span[document path] (mono, truncate, title attr) + button[copy path]
        │   └── action cluster
        │       ├── button[Open in Documents ↗]
        │       └── button[× close] (discards session)
        └── div.pane-body (relative)
            ├── div.pane-nav (floating chip over content: ◀ back · ▶ forward)
            └── div.pane-scroll (own scroll region)
                ├── MarkdownContent[variant="documents", sourcePath=doc path]
                └── (conditional) HtmlSandboxViewer for HTML documents
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| MarkdownContent | `frontend/src/components/MarkdownContent/index.tsx` | `markdown-content.spec.md` | always in pane body (markdown docs) |
| HtmlSandboxViewer | `frontend/src/components/DocumentsView/HtmlSandboxViewer.tsx` | `documents-view-navigation.spec.md` | HTML documents (same sandbox invariants as ticket subdoc preview) |
| SmartLink | `frontend/src/components/SmartLink/index.tsx` | — | renders links inside pane docs; document links target the pane itself |

Proposed new component (architecture MDT-248): `frontend/src/components/TicketViewer/TicketSidePane.tsx` (+ `ticket-side-pane.css`, `useSidePane.ts`) with colocated CSS; delivery seam at `frontend/src/components/SmartLink/documentDelivery.ts`; widened modal via a `split` size tier in `ui/Modal.tsx` + `modal.css`.

## Layout

### Split modal variant

- Default (pane closed): exactly today's `xl` modal. No visual difference until a document link is clicked.
- Pane visible: modal widens (proposed cap `min(94vw, 1560px)`), animated so the ticket column stays visually anchored; only the right edge grows.
- Split is a **work surface**, not a document glance: the frame stretches to top/bottom (fixed height `calc(100dvh - 1.5rem)`, thin frame instead of the document-mode anchor and margins); content scrolls inside each column regardless of length.
- **Divider**: a draggable wall between the columns (9px hit area, 1px rule, primary accent on hover/focus/drag). Pointer drag, ArrowLeft/ArrowRight (±32px), double-click resets to the default. Reasonable range: neither column below 340px (`clampTicketColumnWidth`; a CSS min-width guard holds the floor when the window shrinks under a stored position). The wall position is **persisted** as a percent of the split body width in localStorage (`mdt-settings-ticket-side-pane-split-ratio`, config/sidePaneLayout.ts): committed on drag end and arrow nudge, cleared on reset, restored the first time the pane shows in a later modal. A percent basis resolves live, so restore has no measurement race with the modal width transition and the wall keeps its relative position across viewport sizes.
- Ticket column: default width `clamp(420px, 46%, 640px)`; the divider overrides it while dragged. Never narrower than a readable measure.
- **Pinned chrome**: in split mode the ticket column's header (title + badges) and sub-document tabs stay fixed; only the content region below the tabs scrolls. The card-absolute modal close × therefore always sits over the pinned title bar — never over scrolling prose — and tracks the dragged column width (`--ticket-col-width` var on the modal card).
- Divider: 1px `--border` visual rule (the divider element owns it; the pane itself has no border).
- Pane: fills the remainder; below the responsive breakpoint the divider is hidden and the pane overlays instead (see Responsive).
- Scroll: the ticket column's content region and the pane body are independent scroll regions (`overscroll-behavior: contain`); the outer overlay no longer scrolls while the pane is visible. Scroll positions are preserved across pane open/hide/close (offset captured at open time — the pane-header focus otherwise scrolls the overlay first).
- Floating TableOfContents stays scoped to the ticket column and must not overlap the pane.
- RelativeTimestamp stays in the ticket column only.

### Pane header and floating history

A single-row head block: `‹ Ticket` (overlay variant only) leading, document title in `modal__headline` typography (`min-w-0` truncation), then the trailing cluster — mono document path (truncate, capped at 40% of the row, full path in the `title` attribute) with the shared copy-path control beside it, then `Open in Documents ↗` and `×` close as 32px chrome controls.

Pane history is not header chrome: back/forward float over the top-left of the pane body as a small pill chip (elevated surface at 85% with backdrop blur, `--radius-pill`), **half transparent at rest and fully opaque on hover/focus** — quiet until aimed at. The chip stays put while the content scrolls under it.

- Disabled history at stack bounds: `cursor-not-allowed`, never `pointer-events:none` (tooltips survive — STYLING.md §Disabled Controls).
- The header container is the focus target when the pane opens (`tabIndex={-1}`).
- Copy-path reuses the documents-view control verbatim (toast + copied-check feedback); in the pane it is always visible, sized as an inline micro control.

### Session pill

- Visible only when a session exists and the pane is hidden.
- Position: floating bottom-right of the ticket column content area, above the content (z above prose, below modal close).
- Contents: document glyph · `READING` label · current document title (truncate) · `show ›` action. Entire pill is one button; accessible name `Show {document title} side pane`.
- Style: elevated chip — `--bg-elevated` surface, `--border` outline with `--state-active-border` emphasis, `--radius-pill`.

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| closed | no session (modal open, nothing read) | today's modal, unchanged |
| open — loading | document link clicked | pane visible, header shows target title/path, body shows the standard loading treatment; ticket column unchanged |
| open — loaded | document fetched | pane body renders markdown via `documents` variant; density + theme follow global settings |
| open — html document | target is HTML | HtmlSandboxViewer in pane body |
| open — fetch error | document fetch fails | with a previous document on screen: toast reports the failure (app Sonner via `useToast`) and the previous document stays; first open with nothing loaded: inline empty error state (`role="alert"`) naming the path |
| hidden | Esc (or `‹ Ticket` in overlay) | pane tucked; pill appears naming current document; session (history + scroll) kept |
| discarded | `×` on pane | pane gone, pill gone; modal returns to default width |
| link flagged missing | target known-missing | link renders flagged, non-clickable — identical to today; pane never opens for it |

## Responsive

| Breakpoint | Change |
|------------|--------|
| ≥ 1100px | split layout: ticket column + pane side by side |
| < 1100px | pane becomes a full-cover overlay inside the modal; `‹ Ticket` leads the header row; the path cluster yields its space to the title (hidden); the floating history chip and pill behavior unchanged |

Resize while open follows the breakpoint live; no reload or session loss.

## Accessibility

- Pane is a `complementary` landmark labeled `Document preview — {title}` inside the dialog.
- Focus moves into the pane header when the pane opens; returns to the session pill (or the originating link, if pill not shown) when hidden; returns to prior context when discarded.
- Keyboard-only focus rings per the app-wide `:focus-visible` convention.
- Esc chain and keyboard routing: `ticket-side-doc.interactions.md`.

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| pane surface | `--background` | pane body matches ticket column surface; divider separates |
| divider | `--border` | 1px column separator |
| hover | `--state-hover-bg` | header buttons, pill hover |
| active session signal | `--state-active-bg` / `--state-active-fg` | pill emphasis (committed reading state) |
| document title | `--foreground` | pane header title |
| document path | `--muted-foreground` | mono path text |
| floating history chip | `--bg-elevated` @85% + backdrop blur, `--border`, `--radius-pill` | back/forward over the pane body; opacity 0.5 at rest → 1 on hover/focus |
| disabled history | `--muted-foreground` (dimmed) + `cursor-not-allowed` | back/forward at history bounds |
| pill radius | `--radius-pill` | pill shape |
| empty error state | `--destructive` (icon), `--text-subtle` (path) | pane first-open fetch failure |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| pane | `.ticket-side-pane` proposed | colocated CSS in TicketViewer |
| pane header | `.ticket-side-pane__header` proposed | same |
| pill | `.ticket-side-pane__pill` proposed | same |
| modal split | widened variant via `MODALS.md` pattern (prop shape is architecture's decision) | `MODALS.md` |
| prose | `.prose.prose--document` | `markdown-content.spec.md` |

## Source and verification anchors

| Type | Path |
|------|------|
| Viewer host | `frontend/src/components/TicketViewer/index.tsx` |
| Link delivery point | `frontend/src/components/SmartLink/index.tsx` (DOCUMENT links today navigate to Documents view) |
| Link classification | `frontend/src/utils/linkProcessor.ts` |
| Interaction contract | `ticket-side-doc.interactions.md` |
| CR | `docs/CRs/MDT-248-ticket-side-doc.md` |
| Interactive POC | `designs/ticket-side-doc/index.html` (state machine reference implementation) |
| E2E | `tests/e2e/ticket/side-doc-pane.spec.ts` (TEST-side-doc-pane, 9 journeys) |

## Extension notes

- A future config default for link-open behavior (`documentLinks.openIn = pane | documents`) belongs to the existing link configuration surface (config.toml link defaults), not to this surface. When it ships, follow-always remains the pane's internal rule; the setting only picks the delivery target.
- URL encoding of pane state (shareable "ticket + open doc" deep link) is deliberately deferred; when designed, it composes with the ticket modal's hash-token model (`#trace` precedent).
- Multi-pane (second document side by side), gathered Related lists, and hover peek were evaluated and rejected for this CR — `designs/ticket-side-doc/decisions.md` records why; re-open with evidence, not by drift.
