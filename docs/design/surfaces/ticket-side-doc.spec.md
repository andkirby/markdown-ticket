# Ticket Side Doc

Independent reference document beside the main ticket/document, with source-owned navigation and project-isolated reading history.

**Design status:** canonical MDT-248 UAT r12 target (2026-10-31); implementation pending. The old POC describes earlier behavior, not the current target.

Related: [interactions](ticket-side-doc.interactions.md), [mockups](ticket-side-doc.mockups.md), [host reader](ticket-viewer.spec.md), [UAT brief](../../CRs/MDT-248/uat.md).

## Owns

Reference toolbar/body, visible/hidden/closed states and reveal pill, split geometry, source provenance, reference history and project-partitioned lifetime.

## Does Not Own

Shared H1/header, main document picker/history, device details toggle, fullscreen and promotion identity: ticket-viewer.spec.md and ticket-viewer.interactions.md.
Link classification/missing flagging, markdown internals, HTML sandbox guarantees, modal base behavior and Documents workspace retain their existing owners.

## Composition

```text
Reader shared header + optional badges (host-owned)
Reading area
├── Main toolbar/body/reveal pill (host-owned)
├── Draggable divider (split)
└── Reference
    ├── Pinned toolbar
    │   ├── Back / Forward (right-click history jump menus)
    │   ├── Ticket document title/selector OR repository title
    │   │   └── Smaller source identity/path
    │   └── Copy path, Open in Documents when applicable, Close right pane
    └── Independent document scroll region
        ├── MarkdownContent using document variant
        └── Existing HtmlSandboxViewer for HTML
```

## Toolbar and source identity

- 52px desktop toolbar aligns with the main toolbar beneath the shared header; 32px controls/20px glyphs reuse the existing chrome pattern.
- History controls are in the toolbar. Remove the floating history chip so it cannot cover prose or tables.
- Title is prominent; source label is secondary. Same-ticket and different-ticket references both show their actual owning ticket key/path.
- Repository references show their source project/path; include project name when needed for disambiguation. Full path remains available through tooltip/accessibility and Copy path.
- Ticket title/chevron opens that reference owner's document tree. It is independent of the left ticket. Repository documents have no ticket-picker chevron.
- Copy path copies the actual displayed project-relative source, with existing copied-check/toast feedback. Open in Documents resolves that same source project/file.
- Source identity is always project-qualified internally. Identical relative paths in different projects cannot share content, cache, titles or scroll.
- Reference can show ticket-owned markdown/HTML subdocuments or repository documents. It has no second ticket metadata header; the shared header belongs to main.

## Layout

- Framed split cap min(94vw,1560px), default main width clamp(420px,46%,640px), reference fills remainder. Divider can change the ratio; neither column below 340px.
- Shared header is above both columns. Only content bodies scroll; both toolbars remain visible. The host-owned global close stays at the reader's top-right, not attached to the dragged ticket width.
- In framed split, retain the thin work-surface frame and available viewport height; fullscreen removes outer margins. Main/reference scroll positions survive all transitions.
- Divider retains 9px hit area/1px rule, col-resize cursor, primary hover/focus/drag emphasis, pointer drag, ArrowLeft/Right by 32px and double-click reset.
- Remember the split as a percentage using the existing split-preference pattern. This layout preference is independent of project history and device details disclosure.
- Main ToC cannot cover the reference; reveal pill stays above ToC. Neither controls nor prose can widen the whole reader when a table overflows.

## Session and close behavior

| State/action | Result |
| --- | --- |
| No reference session | Single main, no reveal pill |
| Open beside / repository link | Reference loads beside main; main location unchanged |
| Another reference opened | Replace right document; retain browser-style reference history |
| Escape / Return to main | Hide reference, retain history/scroll, show source-naming pill |
| Reveal pill | Restore current reference and its reading position |
| Close right pane | Discard only active project's reference session, return to single main |
| Same-project main ticket change | Reference owner/history/file unchanged |
| Project change | Save/deactivate old project's reference; restore only destination project's session or empty |
| Close viewer / reopen project | Persist bounded project history, restore hidden with pill |
| Close left pane / narrow Use as main | Host promotes reference, consumes its slot and adopts its document identity |

First r12 use drops/ignores all legacy project+ticket snapshots without migration. Only new project-keyed reference history persists, with 50 entries per project and oldest-entry eviction. Main history remains per viewer-open.

The reveal pill names the current document (and owner when needed); accessible name Show {document title} side pane. It remains a single button at the main content's bottom-right. Restore/history rules are defined only in the interaction contract.

## Responsive

| Width | Presentation |
| --- | --- |
| >=1100px | Main + divider + reference; both toolbars pinned |
| <1100px | Reference covers main content; Return to main, source/history/copy, Use as main and reference Close remain reachable |
| <640px | Ticket-document picker is a sheet; long labels truncate with full accessible source; no horizontal tab strip |

Below the split breakpoint hide the divider and covered left/global close so the reference surface has one visible close control. Hide/discard reference to regain the host close. Use as main preserves promotion access when left close is covered.
Resize switches presentation live without changing source identity, histories or scroll. Shared header/action placement and small-screen title treatment belong to the host.

## Failures and accessibility

- Loading keeps toolbar/source orientation; commit fetched content only to its matching source context.
- Failed replacement retains the prior loaded document and its source with an error naming the failed target; first-open failure shows a path-naming inline error. No repeated toast/refetch loop.
- Known-missing links remain flagged/inert. Deleted/inaccessible saved targets show the recoverable failure state; never rebase them under another project.
- Keep PaneErrorBoundary: a failing reference cannot unmount main or modal controls.
- Use the complementary landmark Document preview — {title}; announce open/hide/discard/promotion and source changes.
- Focus enters the reference toolbar on open, returns to reveal pill on hide, to surviving main on discard, and to promoted main on promotion.
- Full keyboard operation, visible focus, existing graph/portal Escape rules, prose/density/theme parity and sandboxed HTML remain required.

## Semantic style anchors

| Element | Reused anchor |
| --- | --- |
| Surface/prose | --background; .prose--document |
| Source label/divider | --muted-foreground; --border |
| Hover/selected/focus | --state-hover-bg; --state-active-bg/fg; --ring |
| Chrome | .modal__close and existing 32px/20px controls |
| Reveal pill | --bg-elevated; --radius-pill; active tint |
| Failure | --destructive; existing error-boundary/empty-state pattern |

Pinned toolbar/project identity and promotion require revised composition; there is no new color/token system.

## Source / verification anchors

| Anchor | Path | Status |
| --- | --- | --- |
| Reference owner | frontend/src/components/TicketViewer/TicketSidePane.tsx | Existing component; toolbar/source cache requires r12 work |
| Session | frontend/src/components/TicketViewer/useSidePane.ts | Existing bare-path state is not the target identity model |
| Persistence | frontend/src/config/sidePaneSessions.ts | Legacy project+ticket snapshots are ignored; new project-keyed reference history caps at 50 entries per project, oldest evicted |
| Host integration | frontend/src/components/TicketViewer/index.tsx | Project transition and promotion owner |
| Rendering | frontend/src/components/MarkdownContent/index.tsx | Reuse pipeline/sandbox boundaries |
| Verification | tests/e2e/ticket/side-doc-pane.spec.ts | Existing baseline plus planned isolation/reader journeys |
