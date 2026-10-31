# UX Design: MDT-248

**Current target:** UAT r12, approved 2026-10-31. Canonical surface specs, interaction contracts and Wireloom mockups are now synchronized. Runtime implementation and browser acceptance remain pending.

## Canonical ownership

| Contract | Owner |
| --- | --- |
| Shared header, details disclosure, main toolbar/picker and fullscreen | [Ticket Viewer](../../design/surfaces/ticket-viewer.spec.md) |
| Main history, picker intent, badge preference and promotion | [Ticket Viewer interactions](../../design/surfaces/ticket-viewer.interactions.md) |
| Reference toolbar/provenance, split geometry and overlay | [Ticket Side Doc](../../design/surfaces/ticket-side-doc.spec.md) |
| Project histories, lifecycle, source-qualified routing and stale-result isolation | [Ticket Side Doc interactions](../../design/surfaces/ticket-side-doc.interactions.md) |
| Single/expanded/picker/promotion/narrow review states | [Viewer mockups](../../design/surfaces/ticket-viewer.mockups.md) |
| Same/other-ticket/repository references, history, hidden/error and overlay states | [Side-pane mockups](../../design/surfaces/ticket-side-doc.mockups.md) |

This file is the ticket handoff/index, not a parallel copy of the surface contracts. [UAT brief](uat.md), canonical requirements/BDD trace and architecture/tests/tasks supply behavioral identities and execution closure.

## Approved direction

- Compact shared identity header with priority before the main key; independent pinned document toolbars and Copy path.
- Searchable owner-scoped document tree and explicit Open beside action; global search remains the ticket-search entry.
- Main and reference Back/Forward use independent visit history. Reference history is isolated and retained per project.
- Badge disclosure is click/keyboard activated, remembered browser/device-wide, and shows no hover dropdown.
- Closing main promotes the reference with its own source/header/metadata and scroll; repository promotion has document-only chrome.
- Fullscreen/Restore preserves reader state. Existing divider, rendering/sandbox, focus, missing-link, error-boundary and graph-shell rules remain.
- Separate table inspection, extra pane tabs, document editing and board-order Previous/Next remain outside r12.

## Visual review

**Temporary-image warning:** optional local review images may contain obsolete controls/order or illustrative counts. They are excluded from Git and must not govern implementation. Delete them after implementation and UAT are complete.

Canonical surface specs and embedded Wireloom mockups are the self-contained review artifacts. Optional images can remain locally in assets/ during pre-development; a checkout does not require them.
All 14 embedded Wireloom states in the canonical mockup files validate and render through wireloom-to-html. This is structural validation, not browser/runtime UAT.

## Reuse and extension

Reuse TicketCode, badge data attributes/order, existing theme interaction tokens, ModalCloseButton/32px chrome, copy feedback, prose/HTML sandbox, divider and Trace shell.
The new composition, title-triggered document picker, main history, disclosure and promotion require reader changes because the old ticket-only host and horizontal tabs cannot express the agreed workflow. No new palette is proposed.
frontend/src/MODALS.md still describes the current runtime; implementing the reader-specific pinned single/fullscreen extension requires reconciling that owner. No frontend runtime/document files are changed by this design sync.

## Locked implementation decisions

Legacy project+ticket snapshots are dropped/ignored without migration. New project-keyed reference histories retain 50 entries per project, evict oldest, and persist across close. Main history lasts one viewer-open only. TASK-12a owns navigation truth; TASK-12b owns chrome, with separate owners/gates.

Repository promotion uses /prj/{sourceProject}/read?doc={encodedProjectRelativePath}. Promotion pushes this route; in-session browser Back returns to the preceding ticket URL. Direct/reloaded entry opens one repository main document with no active reference/pill and no restored main history. Close viewer replaces this URL with the source /documents?file= URL. Existing Documents links retain their workspace behavior; rationale is in MDT-248 architecture.md.
