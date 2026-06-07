# Tasks

## Task List

### TASK-1

Walking skeleton: search types, scope enum, schemas, and tests

- Owns: [ART-search-index](architecture.trace.md#art-search-index), [ART-search-schema](architecture.trace.md#art-search-schema), [ART-search-types](architecture.trace.md#art-search-types), [ART-search-types-test](architecture.trace.md#art-search-types-test)
- Makes Green: [TEST-search-schema](tests.trace.md#test-search-schema)
- Skills: `mdt-frontend`

### TASK-2

Scope state hook, scope bar component, and scope bar tests

- Owns: [ART-scope-bar](architecture.trace.md#art-scope-bar), [ART-search-mode-hook](architecture.trace.md#art-search-mode-hook), [ART-use-search-scope-test](architecture.trace.md#art-use-search-scope-test)
- Makes Green: [scope_controls_visible](bdd.trace.md#scopecontrolsvisible), [scope_switch_via_click](bdd.trace.md#scopeswitchviaclick), [scope_switch_via_keyboard](bdd.trace.md#scopeswitchviakeyboard), [TEST-scope-bar](tests.trace.md#test-scope-bar), [TEST-search-scope-hook](tests.trace.md#test-search-scope-hook)
- Skills: `mdt-frontend`

### TASK-3

Client-side project matching and extended query mode

- Owns: [ART-project-match](architecture.trace.md#art-project-match), [ART-query-mode-hook](architecture.trace.md#art-query-mode-hook), [ART-use-project-search-test](architecture.trace.md#art-use-project-search-test)
- Makes Green: [partial_project_name_matching](bdd.trace.md#partialprojectnamematching), [project_scope_returns_tickets](bdd.trace.md#projectscopereturnstickets), [project_scope_ticket_search](bdd.trace.md#projectscopeticketsearch), [scoped_search_filters_entity_type](bdd.trace.md#scopedsearchfiltersentitytype), [TEST-project-search-hook](tests.trace.md#test-project-search-hook), [TEST-query-mode-extended](tests.trace.md#test-query-mode-extended), [ticket_key_priority](bdd.trace.md#ticketkeypriority)
- Skills: `mdt-frontend`

### TASK-4

Grouped results rendering with entity type row components

- Owns: [ART-quick-search-results](architecture.trace.md#art-quick-search-results), [ART-result-row-document](architecture.trace.md#art-result-row-document), [ART-result-row-project](architecture.trace.md#art-result-row-project)
- Makes Green: [ambiguous_query_separate_groups](bdd.trace.md#ambiguousqueryseparategroups), [empty_state_shows_active_scope](bdd.trace.md#emptystateshowsactivescope), [global_search_grouped_results](bdd.trace.md#globalsearchgroupedresults), [TEST-quick-search-results-grouped](tests.trace.md#test-quick-search-results-grouped)
- Skills: `mdt-frontend`

### TASK-5

Keyboard navigation across N grouped sections and modal integration

- Owns: [ART-quick-search-input](architecture.trace.md#art-quick-search-input), [ART-quick-search-modal](architecture.trace.md#art-quick-search-modal)
- Makes Green: [enter_activates_result](bdd.trace.md#enteractivatesresult), [keyboard_navigation_grouped](bdd.trace.md#keyboardnavigationgrouped), [project_scope_returns_tickets](bdd.trace.md#projectscopereturnstickets), [select_document_navigates](bdd.trace.md#selectdocumentnavigates), [select_project_navigates](bdd.trace.md#selectprojectnavigates), [select_ticket_or_document](bdd.trace.md#selectticketordocument), [shortcut_cycles_scopes](bdd.trace.md#shortcutcyclesscopes), [TEST-e2e-scoped-search](tests.trace.md#test-e2e-scoped-search), [TEST-keyboard-navigation](tests.trace.md#test-keyboard-navigation)
- Skills: `mdt-frontend`

### TASK-6

Unified search backend endpoint with access control

- Owns: [ART-cross-search-hook](architecture.trace.md#art-cross-search-hook), [ART-search-controller](architecture.trace.md#art-search-controller), [ART-unified-search-endpoint](architecture.trace.md#art-unified-search-endpoint)
- Makes Green: [TEST-unified-search-endpoint](tests.trace.md#test-unified-search-endpoint)

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| [ART-cross-search-hook](architecture.trace.md#art-cross-search-hook) | [TASK-6](#task-6) |
| [ART-project-match](architecture.trace.md#art-project-match) | [TASK-3](#task-3) |
| [ART-query-mode-hook](architecture.trace.md#art-query-mode-hook) | [TASK-3](#task-3) |
| [ART-quick-search-input](architecture.trace.md#art-quick-search-input) | [TASK-5](#task-5) |
| [ART-quick-search-modal](architecture.trace.md#art-quick-search-modal) | [TASK-5](#task-5) |
| [ART-quick-search-results](architecture.trace.md#art-quick-search-results) | [TASK-4](#task-4) |
| [ART-result-row-document](architecture.trace.md#art-result-row-document) | [TASK-4](#task-4) |
| [ART-result-row-project](architecture.trace.md#art-result-row-project) | [TASK-4](#task-4) |
| [ART-scope-bar](architecture.trace.md#art-scope-bar) | [TASK-2](#task-2) |
| [ART-search-controller](architecture.trace.md#art-search-controller) | [TASK-6](#task-6) |
| [ART-search-index](architecture.trace.md#art-search-index) | [TASK-1](#task-1) |
| [ART-search-mode-hook](architecture.trace.md#art-search-mode-hook) | [TASK-2](#task-2) |
| [ART-search-schema](architecture.trace.md#art-search-schema) | [TASK-1](#task-1) |
| [ART-search-types](architecture.trace.md#art-search-types) | [TASK-1](#task-1) |
| [ART-search-types-test](architecture.trace.md#art-search-types-test) | [TASK-1](#task-1) |
| [ART-unified-search-endpoint](architecture.trace.md#art-unified-search-endpoint) | [TASK-6](#task-6) |
| [ART-use-project-search-test](architecture.trace.md#art-use-project-search-test) | [TASK-3](#task-3) |
| [ART-use-search-scope-test](architecture.trace.md#art-use-search-scope-test) | [TASK-2](#task-2) |

## Makes Green Summary

| ID | Task IDs |
|---|---|
| [ambiguous_query_separate_groups](bdd.trace.md#ambiguousqueryseparategroups) | [TASK-4](#task-4) |
| [empty_state_shows_active_scope](bdd.trace.md#emptystateshowsactivescope) | [TASK-4](#task-4) |
| [enter_activates_result](bdd.trace.md#enteractivatesresult) | [TASK-5](#task-5) |
| [global_search_grouped_results](bdd.trace.md#globalsearchgroupedresults) | [TASK-4](#task-4) |
| [keyboard_navigation_grouped](bdd.trace.md#keyboardnavigationgrouped) | [TASK-5](#task-5) |
| [partial_project_name_matching](bdd.trace.md#partialprojectnamematching) | [TASK-3](#task-3) |
| [project_scope_returns_tickets](bdd.trace.md#projectscopereturnstickets) | [TASK-3](#task-3), [TASK-5](#task-5) |
| [project_scope_ticket_search](bdd.trace.md#projectscopeticketsearch) | [TASK-3](#task-3) |
| [scope_controls_visible](bdd.trace.md#scopecontrolsvisible) | [TASK-2](#task-2) |
| [scope_switch_via_click](bdd.trace.md#scopeswitchviaclick) | [TASK-2](#task-2) |
| [scope_switch_via_keyboard](bdd.trace.md#scopeswitchviakeyboard) | [TASK-2](#task-2) |
| [scoped_search_filters_entity_type](bdd.trace.md#scopedsearchfiltersentitytype) | [TASK-3](#task-3) |
| [select_document_navigates](bdd.trace.md#selectdocumentnavigates) | [TASK-5](#task-5) |
| [select_project_navigates](bdd.trace.md#selectprojectnavigates) | [TASK-5](#task-5) |
| [select_ticket_or_document](bdd.trace.md#selectticketordocument) | [TASK-5](#task-5) |
| [shortcut_cycles_scopes](bdd.trace.md#shortcutcyclesscopes) | [TASK-5](#task-5) |
| [TEST-e2e-scoped-search](tests.trace.md#test-e2e-scoped-search) | [TASK-5](#task-5) |
| [TEST-keyboard-navigation](tests.trace.md#test-keyboard-navigation) | [TASK-5](#task-5) |
| [TEST-project-search-hook](tests.trace.md#test-project-search-hook) | [TASK-3](#task-3) |
| [TEST-query-mode-extended](tests.trace.md#test-query-mode-extended) | [TASK-3](#task-3) |
| [TEST-quick-search-results-grouped](tests.trace.md#test-quick-search-results-grouped) | [TASK-4](#task-4) |
| [TEST-scope-bar](tests.trace.md#test-scope-bar) | [TASK-2](#task-2) |
| [TEST-search-schema](tests.trace.md#test-search-schema) | [TASK-1](#task-1) |
| [TEST-search-scope-hook](tests.trace.md#test-search-scope-hook) | [TASK-2](#task-2) |
| [TEST-unified-search-endpoint](tests.trace.md#test-unified-search-endpoint) | [TASK-6](#task-6) |
| [ticket_key_priority](bdd.trace.md#ticketkeypriority) | [TASK-3](#task-3) |
