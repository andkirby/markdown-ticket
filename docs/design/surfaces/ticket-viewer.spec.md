# Ticket Viewer

A ticket/document reader for following references, comparing documents and returning to previous reading locations.

**Design status:** MDT-248 UAT r12 approved target (2026-10-31); implementation and browser acceptance are pending. The source anchors below still contain the previous tabs, badge bar and ticket-only host. This is the canonical composition contract, not a statement that the target is shipped.

Related artifacts:
- [Main reader interactions](ticket-viewer.interactions.md)
- [Review mockups](ticket-viewer.mockups.md)
- [Reference pane](ticket-side-doc.spec.md) and [its interactions](ticket-side-doc.interactions.md)
- [UAT brief](../../CRs/MDT-248/uat.md) and [ticket UX handoff](../../CRs/MDT-248/ux-design.md)

## Owns

- Shared reader header, main document toolbar and document-picker composition.
- Device-wide ticket-details disclosure, fullscreen/Restore, main navigation and promotion presentation.
- Orientation when main is a ticket document or a repository document.
- Existing Trace Graph entry/shell and epic board action.

## Does Not Own

- Reference lifecycle/project partition: ticket-side-doc.interactions.md.
- Markdown internals: markdown-content.spec.md. Documents workspace: documents-view-navigation.spec.md.
- Global search, editing, board-order Previous/Next, arbitrary extra panes, or graph-dashboard internals.
- Modal focus/portal/body-lock primitives: frontend/src/MODALS.md. The pinned single-reader/fullscreen composition is a proposed reader-specific extension to its current free-growing layout.

## Composition

```text
Modal reader
├── Pinned shared header
│   ├── TicketCode template + H1 main ticket title OR H1 repository document title
│   ├── Ticket-details disclosure (ticket mode only)
│   └── Epic action when applicable, Trace when available, Fullscreen/Restore, Close viewer
├── Optional expanded badge row
└── Reading area
    ├── Main pane
    │   ├── Pinned toolbar: Back, Forward, document selector/title, Copy path, hand-off, Close left pane
    │   ├── Searchable ticket-document picker (popover/sheet, when open)
    │   ├── Document scroll region with timestamp/content/loading/error
    │   └── Reveal pill (reference hidden)
    ├── Divider (split only)
    └── Reference pane (ticket-side-doc.spec.md)
TraceGraphShell (existing isolated full-viewport tool)
```

## Header and identity

- Header spans the whole reader and follows the main document. Desktop target height 48px; 32px chrome buttons with 20px glyphs.
- One H1 uses the existing modal headline pattern. Ticket identity is TicketCode + separator + title; preserve configured type/epic/worktree rules.
- Priority stays immediately before the ticket key. Do not move it into the trailing metadata control. Do not repeat the main key in its document toolbar.
- Title yields space through truncation before controls disappear. Full title remains accessible through its complete accessible name and tooltip.
- Trailing order: ticket-details disclosure, epic board action if applicable, Trace Graph if available, Fullscreen/Restore, Close viewer.
- Ticket-details is a single recognizably clickable control containing compact current-ticket metadata glyphs and a chevron. Neutral hover/focus, selected tint/up-chevron while expanded. Accessible name Show ticket details or Hide ticket details; aria-expanded and aria-controls.
- Hover/focus shows a tooltip only. Click/Enter/Space toggles the in-flow badge row beneath the title; there is no hover badge dropdown.
- Disclosure is one browser/device-wide preference across projects, tickets, promotion and reopen. Default collapsed; unavailable/corrupt storage falls back safely without disabling in-memory operation. Repository mode hides the control/row without resetting this preference.
- Badge row starts at 36px and wraps. It uses existing badge components/order: status, priority, type subject to TicketCode type suppression, phase, assignee, worktree, related, depends, blocks, external refs. Existing external-ref grouping/+N/unavailable states remain. Board badge filters do not remove viewer metadata.
- Expanded details and header resizing preserve the reading positions beneath pinned chrome.

### Ticket actions

- Trace Graph is an icon button, accessible name/tooltip Trace Graph; hidden when the main ticket has no standard store. It always targets the main ticket, never the reference's owner.
- Epic navigation retains the label Epics →, rows-3/arrow action vocabulary, accessible name Show {KEY} on Epics board, and destination /prj/:code/epics?epic=KEY. It leaves the reader in one navigation as specified by epic-navigation.interactions.md.
- Repository main mode has document title/source/copy/hand-off and global controls; no ticket key, priority, details, epic or Trace action.

## Main toolbar and document discovery

- Toolbar target height 52px, aligned with the reference toolbar when split. Order: Back, Forward, selected document title/chevron, flexible space, Copy path, repository hand-off when applicable, Close left pane when split.
- Main history lasts only for the current viewer-open lifetime and clears on close; only reference sessions persist across viewer close. Back/Forward mean visited locations in this pane, not adjacent board tickets. Show disabled bounds with explanatory tooltips; retain existing right-click jump-menu behavior for reference history.
- Selected ticket-document title is the picker trigger, replacing both horizontal tabs and a separate Documents button. Even a ticket with only Main retains history/copy; its picker includes Main.
- Picker is a searchable, scrollable tree scoped to that pane's document-owning ticket. Include Main, preserve nested folders and distinguish full paths.
- Folder activation expands/collapses in the picker; it does not add another toolbar row.
- Selecting a document name navigates that pane. A separate split-icon action Open {document} beside opens it on the right without changing main. Always reachable on focus/touch; selected rows retain the action; pointer hover may reveal it for other rows.
- Show Main pane/Beside markers only for matching full source identity. Search uses names and relative paths while retaining useful ancestry; no matches shows No matching documents with Clear search.
- Opening beside replaces the single reference, adds reference history, and deduplicates consecutive same-document opens. A picker on the reference remains scoped to its owner after main changes; there is no third pane.
- Repository documents have no ticket-picker chevron. Keep Open in Documents as the explicit full-workspace hand-off.
- Copy path exists for both panes and uses the actual displayed file's resolved project-relative path, including the main ticket file. Preserve the copied-check/toast feedback; never reconstruct a filename from a key.

## Framed, split and fullscreen layouts

- Use the base Modal and its existing dim/blur, focus trapping and body lock.
- Framed single width uses xl; split uses min(94vw,1560px). Shared header and pane toolbars stay pinned in both modes; document bodies scroll internally. This replaces the previous free-growing ticket-modal/tab-only sticky behavior.
- Fullscreen fills the app viewport without card margins. Restore returns to the prior frame and split preference. Both document locations, histories and scroll offsets survive. Browser Fullscreen API is not required; fullscreen is independent of the Trace shell.
- Split geometry and project-owned reference state belong to ticket-side-doc.spec.md. Neither column drops below 340px; retain remembered divider position and keyboard resize/reset.
- The Table of Contents stays associated with main content and never overlaps reference chrome. A hidden-reference pill remains reachable above ToC.
- Prose retains existing density/theme, document-source resolution, markdown pipeline and sandboxed HTML behavior. Wide tables scroll within the pane; a separate table inspection/expansion feature is not committed by r12.
- Timestamp stays above/beside content without covering a heading. Fetch failures show the existing inline error/loading treatment. Deleted main subdocs fall back to Main; removal of a reference target retains the error/session contract.

## Promotion and source ownership

| Reference document | Result of Close left pane |
| --- | --- |
| Same ticket | Its selected document fills main; ticket identity stays |
| Other ticket | Its selected document fills main; header, priority, badges and actions switch atomically to that owner |
| Repository document | Full-width document mode with its title/path/copy/hand-off; no old ticket chrome |

Close left pane is distinct from global Close viewer and reference Close. Tooltip: Close left pane; keep right document. It appears only while split. Promotion preserves source and scroll, consumes the reference slot/pill, and adds a main-history location. Main Back restores the previous main location without rebuilding a discarded split. Repository promotion uses /prj/{sourceProject}/read?doc={encodedProjectRelativePath}. Promotion pushes this route; in-session browser Back returns to the preceding ticket URL. Direct/reloaded entry opens one repository main document with no active reference/pill and no restored main history. Close viewer replaces this URL with the source /documents?file= URL. Existing Documents links retain their workspace behavior; rationale is in MDT-248 architecture.md.

### TraceGraphShell

- Opens from the `Trace Graph` action as a full-screen ticket-owned viewer.
- The shell owns app navigation: a floating semi-transparent `Back` button closes the shell and returns to the same ticket viewer state.
- The dashboard HTML does not own the back button and does not render MDT app chrome.
- **URL deep link (MDT-174):** shell open state is reflected in the URL via the reserved `#trace` hash fragment, so the URL is a shareable deep link into the graph view.
  - Opening the shell appends `#trace`; the `Back` control / overlay / Escape removes it.
  - The hash is the **single source of truth** for shell open state. No local component state mirrors it.
  - `#trace` is reserved and must not collide with legacy hash-based sub-document links; `useTicketDocumentNavigation` skips it during hash→path redirect resolution.
  - Switching sub-documents while the shell is open preserves `#trace` (document selection and graph open state are orthogonal).
  - Closing the ticket modal or switching tickets navigates to a hash-less URL, which drops `#trace` naturally — the viewer must not auto-close the shell via its own effects (that races the modal's initial `isOpen=false` state on deep-link load and strips the hash).
  - Reserved token and helpers live in `frontend/src/routes.ts` (`TRACE_GRAPH_HASH`, `TRACE_GRAPH_HASH_FRAGMENT`, `isTraceGraphHash`).
- The iframe source is ticket-based, for example:
  - `/spec-trace/trace-dashboard.html?project={projectCode}&ticket={ticketCode}`
- The dashboard HTML derives its data endpoint from `project` and `ticket`.
- The backing store path is standard and server-owned:
  - `{ticketsDir}/.trace/{ticketCode}/store.json`
- No header, title bar, store label, or other shell chrome is shown above the dashboard.
- The iframe receives the full viewport. The floating `Back` button overlays the top-left of the iframe with translucent background, border, text, and icon; it has no blur and becomes fully legible on hover/focus.
- The modal viewport variant has no outer padding, centered-card margin, rounded corners, or modal shadow. The iframe fills `100dvw × 100dvh`.
- The dashboard's own CSS and layout stay isolated inside the iframe.
- No ticket document tabs, ticket content, or TableOfContents are visible while the trace shell is open.
- This spec intentionally does not define the graph board internals. The dashboard HTML remains the owner of graph layout, filters, cards, edges, and graph-specific controls.


## States and verification expectations

| State | Trigger | Visible result |
| --- | --- | --- |
| Single ticket | Ticket opens | Shared ticket header, toolbar, content; saved details state |
| Picker open | Document title activated | Search/tree and explicit Open beside actions |
| Split | Open beside/reference link | Two aligned toolbars and independent bodies |
| Reference hidden | Escape/Return to main | Single main with source-naming reveal pill |
| Details expanded | Disclosure activated | Badge flow below title; reader position retained |
| Project change | Navigate to a different project | Only that project's reference session is active |
| Promoted ticket/repository | Close left pane | One main document with its own source-specific header |
| Fullscreen | Fullscreen activated | Viewport reader; Restore available |
| Loading/error | Document fetch pending/fails | Existing content retention/inline error semantics |
| Missing ticket | Invalid ticket destination | Ticket Not Found; Close and return remain usable |
| Live update/removal | SSE changes current file | Refresh content/tree or fall back to Main without corrupting other history |

New-state verification is pending. Existing unit/E2E anchors prove only their recorded baseline; see the current UAT tests plan.

## Entry points and discovery

Returning-user walkthrough (design reasoning, not browser evidence): the selected document title/chevron occupies the former pinned-tab location; opening it exposes the full tree and search. A selected row's persistent split action exposes comparison. The outlined details control restores badges even when the device preference begins collapsed. Both pane histories remain visible while scrolling. Clear source labels prevent a surviving reference being mistaken for the new main ticket.

## Responsive and accessibility

- >=1100px: split toolbars below the shared header. <1100px: full-cover reference with Return to main and Use as main; exact controls/lifecycle in ticket-side-doc.spec.md.
- <640px: ticket picker is a sheet. Title truncates, icon controls keep full accessible names and visible focus. The expanded badge flow may wrap; it never becomes a hidden horizontal menu.
- One active overlay consumes Escape at a time; details are changed through the disclosure, not Escape.
- Reuse ModalCloseButton styles with distinct names Close viewer, Close left pane and Close right pane. Only global Close remains when a single document is shown.
- Preserve keyboard tree navigation, named pane/history controls, focus restoration to picker triggers, and source announcements on navigation/promotion.
- Main content, timestamps, ToC and live SSE handling keep their existing owners; no polling or duplicate parser is introduced.

## Semantic style anchors

| Element | Existing anchor | Contract |
| --- | --- | --- |
| Header/title | .modal__headline; --foreground | Main identity, not repeated in left toolbar |
| Disclosure | --state-hover-bg; --state-active-bg/fg; --ring | Neutral hover, selected expanded state, keyboard focus |
| Key/priority | TicketCode/PriorityIcon template | Stable priority-before-key |
| Badges | .badge[data-*] | Existing meanings, order and grouping |
| Reader chrome | .modal__close; existing 32px/20px controls | Shared styling, distinct scope labels |
| Pane content | .prose--ticket / .prose--document | Existing rendering/density parity |
| Paths/separators | --muted-foreground; --border | Secondary source identity and simple divisions |

## Source / verification anchors

| Anchor | Path | Scope |
| --- | --- | --- |
| Host | frontend/src/components/TicketViewer/index.tsx | Main context, modal, reference, scroll |
| Header | frontend/src/components/TicketViewer/CompactTicketHeader.tsx | Current header starting point |
| Document navigation | frontend/src/components/TicketViewer/useTicketDocumentNavigation.ts | Current path authority; picker replaces tab presentation |
| Reference | frontend/src/components/TicketViewer/TicketSidePane.tsx | Source, copy, history and rendering |
| Behavioral contract | docs/CRs/MDT-248/requirements.trace.md | Approved canonical requirement identities |
| Verification | tests/e2e/ticket/side-doc-pane.spec.ts | Baseline and planned r12 journeys; no new-pass claim |
