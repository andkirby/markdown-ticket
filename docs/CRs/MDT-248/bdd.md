# BDD: MDT-248

Current target: UAT r12, 2026-10-31. Canonical Given/When/Then records are rendered in [bdd.trace.md](bdd.trace.md); this narrative groups the journeys.

## Retained journeys

Open/follow references, browser-style reference history, Escape hide and reveal, reference discard, Documents hand-off, narrow overlay, right-click history jumps and ticket-file routing remain acceptance contracts. Same-project ticket hops preserve the reference. Project changes use the isolation journey below.

| Scenario | Coverage |
| --- | --- |
| doc_link_opens_pane_beside_ticket | BR-1.1 |
| escape_hides_pane_pill_reveals | BR-1.4,BR-1.5 |
| escape_with_pane_hidden_closes_modal | BR-1.10 |
| handoff_opens_documents_view | BR-1.8 |
| narrow_viewport_pane_overlays | BR-1.9 |
| pane_back_forward_restores_scroll | BR-1.3 |
| pane_close_discards_session | BR-1.6 |
| pane_follow_link_stays_in_pane | BR-1.2 |
| pane_history_context_menu_jumps | BR-1.11 |
| ticket_file_ref_routes_to_ticket_view | BR-1.12 |
| ticket_link_swaps_column_pane_survives | BR-1.7 |

## UAT r12 journeys

### ticket_document_picker_opens_beside

Covers BR-1.13.
- Given Implementation is open and the searchable ticket document picker is visible.
- When The user filters for architecture and activates Open beside, then opens review beside.
- Then The main document stays unchanged; review replaces architecture on the right and Back can return to architecture.

### main_history_restores_ticket_document

Covers BR-1.14.
- Given The main pane visited A/requirements, B/Main and C/architecture while a reference stayed open.
- When Main Back is activated twice and then Forward.
- Then The saved main locations and reading positions return in order; right history is unchanged.

### compact_headers_preserve_document_identity

Covers BR-1.15.
- Given Main shows ticket B and reference shows A/architecture or a repository document.
- When Both panes are scrolled and Copy path is used on each.
- Then Both toolbars stay visible; each copy and provenance names its actual source; priority stays before B's key and Trace targets B only when available.

### ticket_details_preference_survives_navigation

Covers BR-1.16.
- Given Ticket details are collapsed.
- When The details control is activated, another ticket/project opened, and the viewer closed and reopened.
- Then Details remain expanded; a repository document omits ticket badges without clearing the preference and returning to a ticket restores the expanded row.

### close_main_promotes_ticket_document

Covers BR-1.17.
- Given Main is A/implementation and reference is B/architecture with a saved scroll offset.
- When Close left pane is activated.
- Then B/architecture fills the reader, header and metadata belong to B, its scroll survives, and main Back returns to A/implementation.

### close_main_promotes_repository_document

Covers BR-1.17.
- Given A ticket and a repository document are displayed side by side.
- When The main pane is closed.
- Then The repository document fills the reader with its own title/path, copy and hand-off; ticket badges and Trace disappear and Back can return to the prior main ticket.

### reader_fullscreen_restores_layout

Covers BR-1.18.
- Given Two documents have independent histories and scroll positions.
- When Fullscreen and then Restore are activated.
- Then The reader frame changes but both documents, histories, scroll positions and split preference survive.

### project_switch_restores_own_reference_history

Covers BR-1.7, BR-1.19.
- Given Project A has a two-document reference history and project B has its own distinct history, including an identically named path.
- When The user switches A to B and back, then closes/reopens the viewer.
- Then Each project exposes only its own history/content/title/scroll and reopens hidden; no A path is requested with B's project identity.


## Verification boundary

Current executable baseline: tests/e2e/ticket/side-doc-pane.spec.ts and existing pane/store units. New journeys are specifications pending implementation, not passing test claims. tests.md defines equal-path project collisions, asynchronous isolation, mobile access, preference fallback and promotion failures. Retain source-based links, flagged targets, HTML sandbox and graph-shell regressions.

## Locked review follow-up acceptance

- Main history is per viewer-open only. Extend main_history_restores_ticket_document with close/reopen: main Back resets while reference history persists and restores hidden.
- legacy_history_is_ignored_and_capped: Given valid legacy project+ticket records and no new-format project store, When r12 initializes and 51 distinct references are visited in project A, Then old paths never appear, A retains only the newest 50 with consistent index/scroll/title keys and project B is unchanged. Covers BR-1.19.
- repository_reader_route_entry_and_exit: Given a ticket plus a repository reference, When it is promoted, Then push the source /read?doc= URL and keep main history; browser Back restores the prior ticket URL, Close replaces with source /documents?file=, direct/reloaded read links open one main document with no active reference and disabled main Back, and ordinary Documents links still open the workspace. Covers BR-1.17 and BR-1.20.
