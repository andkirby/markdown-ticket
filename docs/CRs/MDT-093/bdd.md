# BDD

## Overview

BDD scenarios cover five user journeys: sub-document discovery with ordering, hierarchical folder navigation with nested tab rows, document selection with sticky navigation, deep linking with URL hash persistence, and realtime synchronization with fallback behavior. 10 scenarios across 5 journeys, all within budget.

## Scenarios By Requirement Family

### BR-1

- Sub-document navigation hidden when no related files (`subdoc_navigation_hidden_when_absent`)
  Covers: `BR-1.5`
  Given: a ticket with no related sub-document files or folders
  When: I view the ticket detail page
  Then: I see only the main ticket document without tab navigation
- Sub-document tabs appear in configured or default order (`subdoc_navigation_shows_ordered_tabs`)
  Covers: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-2.1`
  Given: a ticket with related sub-document files; ordering is either default (no config) or custom (project.ticketSubdocuments set in .mdt-config.toml)
  When: I view the ticket detail page
  Then: I see tab navigation with main plus discovered top-level entries in the configured or default order (requirements, domain, architecture, poc, tests, tasks, debt when default)
- Entries not in configured order are appended alphabetically (`subdoc_unordered_entries_appended`)
  Covers: `BR-1.4`
  Given: a ticket with sub-document files where some names are not in the configured or default order list
  When: I view the ticket detail page
  Then: I see the known ordered entries first, followed by the remaining entries in ascending alphabetical order

### BR-2

- Folder tab reveals child documents in next row (`folder_tab_reveals_child_row`)
  Covers: `BR-2.2`, `BR-2.3`, `BR-2.5`
  Given: a ticket with folder sub-documents and I am on the ticket page
  When: I select a folder tab
  Then: a second tab row appears showing that folder's children and the current document content is preserved
- Grouped folders preserve hierarchy without flattening (`grouped_folders_preserve_hierarchy`)
  Covers: `BR-2.4`
  Given: a ticket with grouped folders like prep/ poc/ or part-*
  When: I view the sub-document navigation
  Then: I see each folder as a grouped navigation entry in the primary row rather than flattened descendant names
- Sub-document tabs appear in configured or default order (`subdoc_navigation_shows_ordered_tabs`)
  Covers: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-2.1`
  Given: a ticket with related sub-document files; ordering is either default (no config) or custom (project.ticketSubdocuments set in .mdt-config.toml)
  When: I view the ticket detail page
  Then: I see tab navigation with main plus discovered top-level entries in the configured or default order (requirements, domain, architecture, poc, tests, tasks, debt when default)

### BR-3

- Selecting document tab loads and displays content (`document_selection_loads_content`)
  Covers: `BR-3.1`, `BR-3.2`
  Given: a ticket with sub-documents and I am on the ticket page
  When: I select a document tab other than main
  Then: I see loading feedback followed by the corresponding markdown content
- Navigation remains visible while scrolling content (`navigation_remains_visible_while_scrolling`)
  Covers: `BR-3.3`, `BR-3.4`
  Given: a ticket with sub-documents and I have selected a tab with long content
  When: I scroll down through the document content
  Then: the tab navigation stays visible and no layout shift disrupts my reading

### BR-4

- Deep link with missing target falls back to main (`deep_link_invalid_hash_falls_back_to_main`)
  Covers: `BR-4.4`
  Given: a ticket with sub-documents
  When: I open the ticket page with a URL hash referencing a sub-document that no longer exists
  Then: the main tab is shown instead
- Deep link opens targeted sub-document on page load (`deep_link_restores_target_document`)
  Covers: `BR-4.3`
  Given: a ticket with sub-documents including a nested folder
  When: I open the ticket page with a URL hash pointing to a valid nested sub-document path
  Then: the required folder levels open and the targeted document is displayed
- URL hash updates when selecting sub-document (`url_hash_updates_on_selection`)
  Covers: `BR-4.1`, `BR-4.2`
  Given: a ticket with nested folder sub-documents and I am on the ticket page
  When: I select a nested document
  Then: the URL hash updates to encode the full relative path using slash-separated segments

### BR-5

- Error displayed when document fails to load (`error_displayed_when_document_fails`)
  Covers: `BR-5.3`
  Given: I am viewing a ticket with sub-documents and have selected a tab
  When: the document content fails to load
  Then: I see an error message in the content area while the navigation remains available
- Manual navigation available when realtime updates unavailable (`manual_navigation_available_when_realtime_unavailable`)
  Covers: `BR-5.4`
  Given: I am viewing a ticket with sub-documents and realtime updates are unavailable
  When: I use the tab navigation to select different documents
  Then: I can still navigate using the last successfully loaded structure
- Navigation updates when sub-document structure changes (`navigation_updates_on_structure_change`)
  Covers: `BR-5.1`, `BR-5.2`
  Given: I am viewing a ticket with sub-documents and have a sub-document selected
  When: the underlying file structure changes removing my active document
  Then: the navigation updates to match the current files and I am switched to the main tab

## Coverage Summary

| Requirement ID | Scenario Count | Scenario IDs |
|---|---:|---|
| `BR-1.1` | 1 | `subdoc_navigation_shows_ordered_tabs` |
| `BR-1.2` | 1 | `subdoc_navigation_shows_ordered_tabs` |
| `BR-1.3` | 1 | `subdoc_navigation_shows_ordered_tabs` |
| `BR-1.4` | 1 | `subdoc_unordered_entries_appended` |
| `BR-1.5` | 1 | `subdoc_navigation_hidden_when_absent` |
| `BR-2.1` | 1 | `subdoc_navigation_shows_ordered_tabs` |
| `BR-2.2` | 1 | `folder_tab_reveals_child_row` |
| `BR-2.3` | 1 | `folder_tab_reveals_child_row` |
| `BR-2.4` | 1 | `grouped_folders_preserve_hierarchy` |
| `BR-2.5` | 1 | `folder_tab_reveals_child_row` |
| `BR-3.1` | 1 | `document_selection_loads_content` |
| `BR-3.2` | 1 | `document_selection_loads_content` |
| `BR-3.3` | 1 | `navigation_remains_visible_while_scrolling` |
| `BR-3.4` | 1 | `navigation_remains_visible_while_scrolling` |
| `BR-4.1` | 1 | `url_hash_updates_on_selection` |
| `BR-4.2` | 1 | `url_hash_updates_on_selection` |
| `BR-4.3` | 1 | `deep_link_restores_target_document` |
| `BR-4.4` | 1 | `deep_link_invalid_hash_falls_back_to_main` |
| `BR-5.1` | 1 | `navigation_updates_on_structure_change` |
| `BR-5.2` | 1 | `navigation_updates_on_structure_change` |
| `BR-5.3` | 1 | `error_displayed_when_document_fails` |
| `BR-5.4` | 1 | `manual_navigation_available_when_realtime_unavailable` |
