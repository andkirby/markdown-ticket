# UAT Refinement Brief

## Objective

Round 12 — 2026-10-31. Continue MDT-248 on the same ticket, rather than replace it with another CR. Capture the agreed reader upgrade and the reported cross-project reference-history defect. This brief specifies remaining work; it does not certify UAT passed or authorize ticket closure.

## Approved Changes

- Fix project isolation first: independently retained reference history per project; qualify every entry/cache/fetch by its real source.
- Replace crowded tabs with a searchable ticket-document tree and explicit Open beside actions, including internal ticket documents.
- Independent main and reference Back/Forward; global search stays the ticket-search entry. No board-order Previous/Next.
- Compact shared H1/header, stable priority before ticket key, icon Trace action, source-aware toolbars and Copy path on both panes.
- Click-to-expand badge row, remembered device-wide across projects/tickets/reopen. Hover/focus tooltip only; no hover badge dropdown.
- Close main promotes the right document. Another ticket adopts its own metadata; repository documents get a document header without ticket-only controls.
- Fullscreen/Restore preserves reader state; keep divider, hide/reveal, accessibility and rendering guarantees.
- Canonical viewer/reference specs, interaction contracts and Wireloom mockups in docs/design/surfaces are synchronized to the approved target; [UX design](ux-design.md) is their ticket handoff/index. Runtime implementation remains pending.

## Changed Requirement IDs

Refine in place: BR-1.7, C1, C2, Edge-5. Add: BR-1.13–BR-1.19, C8, Edge-8.
Identity rationale: BR-1.7 keeps ticket-navigation intent but distinguishes project changes; C1/C2 make the approved geometry/scroll contract current; Edge-5 keeps close/restore/discard intent while refining the project partition. BR-1.19 explicitly adds per-project history behavior. No upstream IDs silently removed.

## Affected Downstream Trace

New scenarios: ticket_document_picker_opens_beside, main_history_restores_ticket_document, compact_headers_preserve_document_identity, ticket_details_preference_survives_navigation, close_main_promotes_ticket_document, close_main_promotes_repository_document, reader_fullscreen_restores_layout, project_switch_restores_own_reference_history.
Existing ticket_link_swaps_column_pane_survives now explicitly covers same-project survival.
New obligations/test plans/tasks close isolation, reader navigation/header and promotion. Existing task closure gaps for the r7–r9 menu, routing, sessions, boundary, toast and split tests are repaired.

## Execution Slices

### 1. Project-owned history and request isolation — TASK-11

Objective: remove the defect before layering new reader behavior on it.
Artifacts: TicketViewer/index.tsx, useSidePane.ts, TicketSidePane.tsx, config/sidePaneSessions.ts and their tests.
Direct GREEN targets: project_switch_restores_own_reference_history; TEST-reader-project-isolation; TEST-side-doc-pane-sessions.
Reason: live session survives with bare paths while fetch uses the currently selected project. Cache is path-only and restoration exits early when a session already exists.
DROP legacy project+ticket snapshots (no migration). Start new-format project histories empty on first r12 load, cap each project's reference history at 50 entries and evict oldest. Include A/B equal-path collisions, switching back, fresh reopen, stale requests and persistence contamination; legacy_history_is_ignored_and_capped is a direct GREEN target.

### 2a. Navigation truth — TASK-12a

Artifacts: ticket-document picker/navigation owner, reader controller and copy-path controls.
Direct GREEN targets: ticket_document_picker_opens_beside; main_history_restores_ticket_document; TEST-reader-navigation-truth.
Main history lives only for one viewer-open lifetime; only reference sessions persist. One editing owner, separate GREEN gate before chrome work.

### 2b. Chrome — TASK-12b

Artifacts: CompactTicketHeader, reader/reference toolbar CSS, device preference and fullscreen binding.
Direct GREEN targets: compact_headers_preserve_document_identity; ticket_details_preference_survives_navigation; reader_fullscreen_restores_layout; TEST-reader-navigation-header.
Bind to navigation truth from 12a; do not create a second controller. One editing owner, separate GREEN gate before promotion.

### 3. Document promotion and final regression — TASK-13

Objective: closing main promotes the source document safely, updates all ownership-dependent chrome and verifies runtime behavior against the synchronized canonical designs.
Artifacts: TicketViewer/index.tsx, navigation/route owner, TicketSidePane.tsx, integration tests and durable surface docs.
Direct GREEN targets: close_main_promotes_ticket_document, close_main_promotes_repository_document, repository_reader_route_entry_and_exit; TEST-reader-promotion, TEST-reader-ux-contract; baseline TEST-side-doc-pane plus existing unit/session/boundary/toast/split test plans.
Reason: promotion changes the main context; repository mode cannot retain the old ticket header, actions or path resolution.
Supporting baseline task IDs TASK-1–TASK-10 remain explicit regression ownership; r12 work is TASK-11, TASK-12a, TASK-12b and TASK-13, not a blind replay of all old tasks.

## Validation

- User-reported evidence: MDT-248 was open with Public Search Api and sf-api history paths in the right pane, ending in Couldn't load this document. The screenshot is an optional local review aid; this written reproduction context is the durable record.
- Source diagnosis: project+ticket persistence is scoped, but live history and component cache are path-only; fetcher uses the current project; restore is skipped while a live session exists. This is consistent with the report, not a fresh live reproduction.
- Existing unit baseline: 31 passed / 0 failed / 82 assertions, with localhost config/index connection warnings; see tests.md.
- Spec-trace requirements, BDD, architecture, tests and tasks were validated and rendered after sync; the final all-stage check reports zero issues. Six prior task-closure gaps were repaired. No strict requirements lock was introduced this round.
- Runtime implementation, new regressions, browser UAT and full-suite readiness remain pending.

## Watchlist

- Different projects can contain the same path and ticket key. Partition live session, rendering, async results and persistence together; changing a storage key alone is insufficient.
- Do not auto-close/rebase a same-project reference when main changes.
- Preserve r8 error boundary and r9 toast-loop prevention; failure must not contaminate another project's fallback.
- Keep the priority glyph in TicketCode's existing template; don't move it into the details toggle.
- No automatic scope expansion to document editing, multi-pane tabs, board-order navigation or a second global search.
- Legacy POC and old uat rounds are historical; current target is requirements/BDD trace and ux-design.md.

## Locked Review Decisions

- Legacy history: DROP all project+ticket snapshots; no migration. New project-keyed store, 50 entries per project, oldest evicted. Main history is per viewer-open only; reference sessions alone persist across close.
- Repository promotion: dedicated /prj/{sourceProject}/read?doc={encodedProjectRelativePath}. Push on promotion; browser Back returns to preceding ticket; fresh/deep-linked/reloaded reader is document-only with no active reference and no restored main history; Close replaces with source Documents-view URL. Existing /documents links retain workspace behavior. Rationale and exact contract: architecture.md.
- Review images are optional, local-only pre-development aids with known contradictory controls/order. Canonical surface text/Wireloom governs; images are excluded from Git and deleted after implementation and UAT are complete.
- No blocking design decision remains for the implementation handoff.
