# Tasks

## Task List

- Walking Skeleton: Create SubDocument model and backend discovery (`TASK-1`)
  Owns: `ART-api-subdocument-tests`, `ART-server-ticket-service`, `ART-shared-subdocument-model`
  Makes Green: `subdoc_navigation_shows_ordered_tabs`
- Frontend: TicketDocumentTabs component with navigation hook (`TASK-2`)
  Owns: `ART-nav-hook-unit-tests`, `ART-ticket-document-tabs`, `ART-use-ticket-document-navigation`
  Makes Green: `subdoc_navigation_hidden_when_absent`, `subdoc_unordered_entries_appended`, `TEST-nav-hook-unit`
- Frontend: dataLayer sub-document API integration (`TASK-3`)
  Owns: `ART-data-layer`
  Makes Green: `subdoc_navigation_shows_ordered_tabs`
- Frontend: Hierarchical folder navigation (`TASK-4`)
  Owns: `ART-ticket-document-tabs`
  Makes Green: `folder_tab_reveals_child_row`, `grouped_folders_preserve_hierarchy`
- Frontend: Content loading hook with sticky navigation (`TASK-5`)
  Owns: `ART-markdown-content`, `ART-ticket-viewer-index`, `ART-use-ticket-document-content`
  Makes Green: `document_selection_loads_content`, `navigation_remains_visible_while_scrolling`
- Frontend: Deep linking with URL hash persistence (`TASK-6`)
  Owns: `ART-use-ticket-document-navigation`
  Makes Green: `deep_link_invalid_hash_falls_back_to_main`, `deep_link_restores_target_document`, `TEST-nav-hook-unit`, `url_hash_updates_on_selection`
- Frontend: Realtime synchronization hook (`TASK-7`)
  Owns: `ART-realtime-hook-tests`, `ART-use-ticket-document-realtime`
  Makes Green: `manual_navigation_available_when_realtime_unavailable`, `navigation_updates_on_structure_change`, `TEST-realtime-hook-unit`
- Frontend: Error handling and E2E integration (`TASK-8`)
  Owns: `ART-e2e-subdocument-tests`, `ART-ticket-viewer-index`
  Makes Green: `error_displayed_when_document_fails`, `TEST-subdoc-navigation`
- Backend: OpenAPI documentation for sub-document endpoints (`TASK-9`)
  Owns: `ART-openapi-spec`, `ART-server-project-controller`
  Makes Green: `TEST-api-subdocuments`

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| `ART-api-subdocument-tests` | `TASK-1` |
| `ART-data-layer` | `TASK-3` |
| `ART-e2e-subdocument-tests` | `TASK-8` |
| `ART-markdown-content` | `TASK-5` |
| `ART-nav-hook-unit-tests` | `TASK-2` |
| `ART-openapi-spec` | `TASK-9` |
| `ART-realtime-hook-tests` | `TASK-7` |
| `ART-server-project-controller` | `TASK-9` |
| `ART-server-ticket-service` | `TASK-1` |
| `ART-shared-subdocument-model` | `TASK-1` |
| `ART-ticket-document-tabs` | `TASK-2`, `TASK-4` |
| `ART-ticket-viewer-index` | `TASK-5`, `TASK-8` |
| `ART-use-ticket-document-content` | `TASK-5` |
| `ART-use-ticket-document-navigation` | `TASK-2`, `TASK-6` |
| `ART-use-ticket-document-realtime` | `TASK-7` |

## Makes Green Summary

| ID | Task IDs |
|---|---|
| `deep_link_invalid_hash_falls_back_to_main` | `TASK-6` |
| `deep_link_restores_target_document` | `TASK-6` |
| `document_selection_loads_content` | `TASK-5` |
| `error_displayed_when_document_fails` | `TASK-8` |
| `folder_tab_reveals_child_row` | `TASK-4` |
| `grouped_folders_preserve_hierarchy` | `TASK-4` |
| `manual_navigation_available_when_realtime_unavailable` | `TASK-7` |
| `navigation_remains_visible_while_scrolling` | `TASK-5` |
| `navigation_updates_on_structure_change` | `TASK-7` |
| `subdoc_navigation_hidden_when_absent` | `TASK-2` |
| `subdoc_navigation_shows_ordered_tabs` | `TASK-1`, `TASK-3` |
| `subdoc_unordered_entries_appended` | `TASK-2` |
| `TEST-api-subdocuments` | `TASK-9` |
| `TEST-nav-hook-unit` | `TASK-2`, `TASK-6` |
| `TEST-realtime-hook-unit` | `TASK-7` |
| `TEST-subdoc-navigation` | `TASK-8` |
| `url_hash_updates_on_selection` | `TASK-6` |
