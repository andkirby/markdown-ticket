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
        ├── div.pane-header (border-b)
        │   ├── button[‹ Ticket] (overlay variant only)
        │   ├── button[◀ back] · button[▶ forward] (history)
        │   ├── span[document title] (truncate)
        │   ├── span[document path] (mono, truncate, title attr)
        │   └── action cluster
        │       ├── button[Open in Documents ↗]
        │       └── button[× close] (discards session)
        └── div.pane-body (own scroll region)
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
- Ticket column: keeps today's readable prose measure — `clamp(420px, 46%, 640px)` in the split; never narrower than the single-column modal's effective reading width.
- Divider: 1px `--border` between columns.
- Pane: fills the remainder, min ~460px; below the responsive breakpoint it overlays instead (see Responsive).
- Scroll: each column is its own scroll region (`overscroll-behavior: contain`); the outer overlay no longer scrolls while the pane is visible. Ticket column scroll position is preserved across pane open/hide/close.
- Floating TableOfContents and the modal close × stay scoped to the ticket column and must not overlay the pane.
- RelativeTimestamp stays in the ticket column only.

### Pane header

- Height and control sizing follow the modal chrome recipe (8×8 icon buttons, tight `px-3 py-2`-class bars, `border-b border-gray-200 dark:border-gray-700`).
- Order: `‹ Ticket` (overlay only) · back/forward · title · path · `Open in Documents ↗` · `×`.
- Back/forward disabled state: `cursor-not-allowed`, never `pointer-events:none` (why-tooltip must survive — STYLING.md §Disabled Controls).
- Path is the mono document path, truncated with ellipsis, full path in `title` attribute.

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
| open — fetch error | document fetch fails | inline error in pane body; previous pane document (if any) is not lost; error is `role="alert"` |
| hidden | Esc (or `‹ Ticket` in overlay) | pane tucked; pill appears naming current document; session (history + scroll) kept |
| discarded | `×` on pane | pane gone, pill gone; modal returns to default width |
| link flagged missing | target known-missing | link renders flagged, non-clickable — identical to today; pane never opens for it |

## Responsive

| Breakpoint | Change |
|------------|--------|
| ≥ 1100px | split layout: ticket column + pane side by side |
| < 1100px | pane becomes a full-cover overlay inside the modal; `‹ Ticket` back control replaces back-cluster leading position (back/forward history still available); pill behavior unchanged |

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
| disabled history | `--muted-foreground` (dimmed) + `cursor-not-allowed` | back/forward at history bounds |
| pill radius | `--radius-pill` | pill shape |
| error | `--destructive` | pane fetch error text |

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
