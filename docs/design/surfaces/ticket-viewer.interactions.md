# Ticket Viewer — Interactions

Canonical main-reader navigation, details preference, fullscreen and promotion contract for MDT-248 UAT r12. **Approved target; implementation pending.**

Related: [composition](ticket-viewer.spec.md), [mockups](ticket-viewer.mockups.md), [reference lifecycle](ticket-side-doc.interactions.md), [UAT brief](../../CRs/MDT-248/uat.md).

## Owns / does not own

Owns main visited-location history, picker intent, shared identity updates, details disclosure and promotion. Reference history/lifecycle/project persistence is owned by ticket-side-doc.interactions.md. Link classification, backend permission checks and graph internals retain their existing owners.

## Location and history

A location identifies source project, canonical relative file, ticket owner when applicable, document kind and anchor. A visited entry retains its reading position. Labels and Copy path refer to the actual displayed file, not an inferred key filename.
Main history is per viewer-open lifetime, clears on viewer close, and is not persisted. Only reference sessions persist across close. A fresh direct/reloaded reader starts with one main location and disabled main Back. Main history records visited locations, including ticket/subdoc transitions; Back/Forward is independent of the reference's stack. Forward history truncates on a new visit; consecutive identical destinations do not duplicate. Back/Forward restores selection, source context and scroll.
Same-project main navigation leaves reference untouched. Main project changes save/deactivate the old project's reference and select only the destination project's saved session or empty state. See reference interactions for restoration and stale-response rules.
No Previous/Next in board order and no viewer-local global ticket search are introduced.

## Picker intent

| Action | Destination / side effects |
| --- | --- |
| Open current document title/chevron | Searchable tree of that pane's owning ticket |
| Select Main or a file name | That pane; capture and restore its navigation context |
| Select a folder | Expand/collapse in tree, no new toolbar row |
| Open {document} beside | Right reference; main file/selection/scroll unchanged |
| Open the already current reference beside | Reveal/focus it; no duplicate history entry |
| Filter names/relative paths | Keep useful ancestry and owner identity; no navigation until selection |
| Clear search | Restore full tree without changing the reading document |

Main pane/Beside indicators compare full identity, not filename. Name and Open beside are separate controls, not nested buttons. Both are keyboard/touch reachable. Close the picker after successful destination activation and focus the destination toolbar. Escape closes it without changing selection and restores trigger focus.
The reference picker remains scoped to its ticket even after main visits another ticket. Selecting its own name changes reference; Open beside from that picker also targets the existing reference, never a third pane.
Repository documents have no ticket picker. Open in Documents remains the explicit workspace hand-off.

## Details preference

| Event | Result |
| --- | --- |
| Fresh profile / invalid or unavailable persistence | Collapsed default; toggling still works in memory |
| Hover/focus metadata control | Neutral highlight and Show/Hide ticket details tooltip only |
| Click / Enter / Space | Toggle badge flow immediately below title; update global browser/device preference |
| Ticket/project navigation or viewer reopen | Apply the same remembered disclosure state |
| Ticket document promotion | Recompute metadata for new owner; keep disclosure state |
| Repository promotion | Hide ticket-only control/row; leave saved preference unchanged |

Disclosure is independent of board badge filters, project histories and fullscreen. Never expand badge labels inline in the title row on hover; adjacent actions must not move under the pointer. Badge row wrapping/disclosure must not reset document reading positions. Metadata glyphs, reference counts and Trace/Epic targets always follow main identity.
Keyboard labels and aria-expanded/aria-controls expose state without requiring hover.

## Main close and promotion

| Situation | Action | Result |
| --- | --- | --- |
| Reference visible, main visible | Close left pane | Promote reference to single main |
| Narrow reference overlay | Use as main | Same promotion without reaching the covered main toolbar |
| Single main | Close viewer | Close entire reader; no pane-close control is shown |
| Reference open | Close right pane | Discard active project's reference only; main remains |
| Reference open | Escape / Return to main | Hide reference with reveal pill; main remains |

Promotion is atomic: source project/file/owner, content selection, title, priority, badges, graph availability and scroll move together. Same-ticket promotion keeps the ticket header. Another-ticket promotion uses that ticket's header. A repository document uses document title/path/copy/hand-off and no ticket-only chrome.
Append the promoted location to main history after capturing previous main context. Main Back restores that earlier reading location; it does not automatically recreate the consumed reference/split.
Consume the promoted reference slot and its reveal pill; do not leave a second hidden copy. Other projects' saved sessions remain untouched. Do not implicitly reveal a target project's unrelated reference on promotion.
If a target cannot be loaded/validated for promotion, keep the existing main/header intact and expose the failure in reference; no stale-header/new-content pairing. Focus the promoted main toolbar on success and announce its source.
Repository promotion uses /prj/{sourceProject}/read?doc={encodedProjectRelativePath}. Promotion pushes this route; in-session browser Back returns to the preceding ticket URL. Direct/reloaded entry opens one repository main document with no active reference/pill and no restored main history. Close viewer replaces this URL with the source /documents?file= URL. Existing Documents links retain their workspace behavior; rationale is in MDT-248 architecture.md.

## Fullscreen / Restore

Fullscreen toggles app-viewport geometry, not document identity or browser fullscreen state. Store the prior frame/split arrangement for Restore. Preserve both histories, selected documents, scroll, details disclosure and remembered split ratio.
Fullscreen state is local to the reader session; device persistence is required for details, not for fullscreen. Fullscreen does not open the graph shell. Restore is explicit; Escape follows the layer chain below.

## Keyboard, focus and close scope

- Tab order follows shared header, main toolbar/content, reference toolbar/content when visible.
- Tree arrow keys expand/move within the picker; Enter selects the focused destination; separately focusable Open beside exposes its complete destination name.
- Back/Forward controls are ordinary named buttons. Disabled bounds remain understandable and tooltip-accessible.
- Escape consumes exactly one active layer: picker/history menu, Trace shell, visible reference hide, reader close.
- In narrow reference overlay the covered main/global close tucks; only reference Close is exposed on that pane surface. Return to main and Use as main remain distinct.
- Reuse existing modal portal exemptions so dismissing a picker/menu cannot close the viewer behind it.
- Closing global viewer returns focus to its originating control when available; navigation/promotion focuses the committed destination toolbar.

## Failure and source-boundary rules

Async results must match the active source/location generation. Old project data cannot populate another project's header, cache identity, error fallback, history titles, scroll or saved record.
A failed navigation retains a previously loaded document with its own title/source; identify the failed target separately in the error. With no prior document show the existing path-naming empty error. Known-missing targets remain inert.
Deleted main subdocs fall back to Main; a missing reference remains a recoverable session error, never silently resolves against another project.
These behaviors are planned acceptance targets; the UAT brief records current evidence and locked route/storage decisions.
