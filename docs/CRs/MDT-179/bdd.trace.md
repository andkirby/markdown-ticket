# BDD

## Scenarios By Requirement Family

### BR-1

#### [BR-1.1](requirements.trace.md#br-11)

WHEN user activates quick search, the system shall present a visible scope indicator showing the active search scope (Global, Tickets, Projects, or Documents)

##### scope_controls_visible

Scope controls are visible when quick search opens
- Also Covers: [BR-1.2](requirements.trace.md#br-12)
- Given: the quick search modal is opened via Cmd+K
- When: the modal finishes rendering
- Then: a scope indicator shows 'Global' as active scope AND scope control buttons/tabs for Global, Tickets, Projects, and Documents are visible


#### [BR-1.2](requirements.trace.md#br-12)

WHEN user activates quick search, the system shall display visible scope controls allowing selection of Global, Tickets, Projects, or Documents scope

##### scope_controls_visible

Scope controls are visible when quick search opens
- Also Covers: [BR-1.1](requirements.trace.md#br-11)
- Given: the quick search modal is opened via Cmd+K
- When: the modal finishes rendering
- Then: a scope indicator shows 'Global' as active scope AND scope control buttons/tabs for Global, Tickets, Projects, and Documents are visible


#### [BR-1.3](requirements.trace.md#br-13)

WHEN user activates a scope control, the system shall switch the search scope to the selected entity type and update the scope indicator within 100ms

##### scope_switch_via_click

User switches scope by clicking a scope control
- Given: the quick search modal is open with Global scope active
- When: the user clicks the 'Projects' scope control
- Then: the scope indicator updates to 'Projects' within 100ms AND the results area filters to show only project-type results


#### [BR-1.4](requirements.trace.md#br-14)

WHEN user presses Tab (or Shift+Tab) in the search modal, the system shall cycle the search scope (All → Tickets → Projects → Documents) without requiring pointer input

##### scope_switch_via_keyboard

User switches scope via Tab key
- Given: the quick search modal is open with any scope active
- When: the user presses the Tab key
- Then: the scope cycles to the next tab (All→Tickets→Projects→Documents→All)

##### shortcut_cycles_scopes

Repeated Tab presses cycle scopes with visible indicator; Shift+Tab reverses
- Given: the quick search modal is open on Global scope
- When: the user presses Tab multiple times
- Then: the scope cycles through All→Tickets→Projects→Documents→All and the active tab indicator updates each time; Shift+Tab cycles backwards



### BR-2

#### [BR-2.1](requirements.trace.md#br-21)

WHEN user types a query in Global scope, the system shall display results grouped into separate labeled sections for Projects, Tickets, and Documents

##### global_search_grouped_results

Global search displays grouped results for all entity types
- Also Covers: [BR-2.2](requirements.trace.md#br-22)
- Given: the quick search modal is open in Global scope
- When: the user types a query matching at least one project, one ticket, and one document
- Then: results are displayed in three separate labeled groups (Projects, Tickets, Documents) AND each group has visually distinct styling (icon, color, or badge)


#### [BR-2.2](requirements.trace.md#br-22)

WHEN search results include multiple entity types, the system shall render each entity type with visually distinct styling (icon, color, or badge)

##### global_search_grouped_results

Global search displays grouped results for all entity types
- Also Covers: [BR-2.1](requirements.trace.md#br-21)
- Given: the quick search modal is open in Global scope
- When: the user types a query matching at least one project, one ticket, and one document
- Then: results are displayed in three separate labeled groups (Projects, Tickets, Documents) AND each group has visually distinct styling (icon, color, or badge)


#### [BR-2.3](requirements.trace.md#br-23)

WHEN user selects a project result, the system shall navigate to the selected project and close the search modal

##### select_project_navigates

Selecting a project result navigates to that project
- Given: the quick search modal shows grouped results including a project named 'Task Manager'
- When: the user clicks the project result for 'Task Manager'
- Then: the search modal closes AND the application navigates to the 'Task Manager' project


#### [BR-2.4](requirements.trace.md#br-24)

WHEN user selects a ticket result, the system shall navigate to the selected ticket and close the search modal

##### select_ticket_or_document

Selecting a ticket result navigates to that ticket
- Given: the quick search modal shows grouped results including tickets
- When: the user clicks a ticket result
- Then: the search modal closes AND the application navigates to the ticket


#### [BR-2.5](requirements.trace.md#br-25)

WHEN user selects a document result, the system shall navigate to the selected document and close the search modal

##### select_document_navigates

Selecting a document result navigates to that document
- Given: the quick search modal shows grouped results including documents
- When: the user clicks a document result
- Then: the search modal closes AND the application navigates to the document



### BR-3

#### [BR-3.1](requirements.trace.md#br-31)

WHEN user types a partial project name query (e.g., 'task ma'), the system shall match and return projects whose name contains word prefixes matching each query term

##### partial_project_name_matching

Partial project name query matches by word prefix
- Also Covers: [BR-3.2](requirements.trace.md#br-32)
- Given: a project named 'Task Manager' with code 'TMGR' exists
- When: the user types 'task ma' in the search input
- Then: the 'Task Manager' project appears in the Projects result group


#### [BR-3.2](requirements.trace.md#br-32)

WHEN user types a project code query, the system shall match and return projects whose code matches the query as a case-insensitive prefix

##### partial_project_name_matching

Partial project name query matches by word prefix
- Also Covers: [BR-3.1](requirements.trace.md#br-31)
- Given: a project named 'Task Manager' with code 'TMGR' exists
- When: the user types 'task ma' in the search input
- Then: the 'Task Manager' project appears in the Projects result group


#### [BR-3.3](requirements.trace.md#br-33)

WHEN user types an exact ticket key (e.g., 'MDT-179'), the system shall prioritize the ticket lookup over project and document matching

##### ticket_key_priority

Exact ticket key prioritizes ticket lookup
- Given: a ticket with key 'MDT-179' exists AND a project containing 'MDT' in its name exists
- When: the user types 'MDT-179' in the search input
- Then: the ticket result for MDT-179 appears with higher prominence than project results


#### [BR-3.4](requirements.trace.md#br-34)

WHEN user types a project-scoped ticket query (e.g., '@CODE text'), the system shall search for tickets within the specified project and display results as ticket results, not project results

##### project_scope_returns_tickets

Project-scoped ticket query (@CODE text) returns ticket results not project results
- Given: the quick search modal is open
- When: the user types '@MDT search term' to search tickets in the MDT project
- Then: results display tickets from the MDT project in a Tickets section, not the MDT project itself

##### project_scope_ticket_search

Project-scoped ticket query returns tickets and invalid code does not block project name lookup
- Also Covers: [BR-6.4](requirements.trace.md#br-64)
- Given: the quick search modal is open in Projects scope
- When: the user types an invalid project-code pattern followed by a name
- Then: the system performs project name lookup without blocking on the invalid code syntax



### BR-4

#### [BR-4.1](requirements.trace.md#br-41)

WHEN search scope is set to Projects, the system shall display only project results matching the query

##### scoped_search_filters_entity_type

Scoped search filters to one entity type and preserves query on scope switch
- Also Covers: [BR-4.2](requirements.trace.md#br-42), [BR-4.3](requirements.trace.md#br-43), [BR-4.4](requirements.trace.md#br-44)
- Given: the quick search modal is open
- When: the user types a query matching projects and tickets, then switches scope from Global to Projects
- Then: the query text is preserved AND only project results are displayed


#### [BR-4.2](requirements.trace.md#br-42)

WHEN search scope is set to Tickets, the system shall display only ticket results matching the query

##### scoped_search_filters_entity_type

Scoped search filters to one entity type and preserves query on scope switch
- Also Covers: [BR-4.1](requirements.trace.md#br-41), [BR-4.3](requirements.trace.md#br-43), [BR-4.4](requirements.trace.md#br-44)
- Given: the quick search modal is open
- When: the user types a query matching projects and tickets, then switches scope from Global to Projects
- Then: the query text is preserved AND only project results are displayed


#### [BR-4.3](requirements.trace.md#br-43)

WHEN search scope is set to Documents, the system shall display only document results matching the query

##### scoped_search_filters_entity_type

Scoped search filters to one entity type and preserves query on scope switch
- Also Covers: [BR-4.1](requirements.trace.md#br-41), [BR-4.2](requirements.trace.md#br-42), [BR-4.4](requirements.trace.md#br-44)
- Given: the quick search modal is open
- When: the user types a query matching projects and tickets, then switches scope from Global to Projects
- Then: the query text is preserved AND only project results are displayed


#### [BR-4.4](requirements.trace.md#br-44)

WHEN user switches search scope, the system shall either preserve the current query text or clear it according to a visible predictable rule displayed to the user

##### scoped_search_filters_entity_type

Scoped search filters to one entity type and preserves query on scope switch
- Also Covers: [BR-4.1](requirements.trace.md#br-41), [BR-4.2](requirements.trace.md#br-42), [BR-4.3](requirements.trace.md#br-43)
- Given: the quick search modal is open
- When: the user types a query matching projects and tickets, then switches scope from Global to Projects
- Then: the query text is preserved AND only project results are displayed



### BR-5

#### [BR-5.1](requirements.trace.md#br-51)

WHEN keyboard focus is inside the search modal, Arrow Up and Arrow Down keys shall navigate across all visible result items in grouped sections sequentially

##### keyboard_navigation_grouped

Arrow keys navigate across grouped sections, Tab jumps between groups
- Also Covers: [BR-5.2](requirements.trace.md#br-52)
- Given: the quick search modal shows grouped results with Projects (2 items) and Tickets (3 items)
- When: the user presses ArrowDown from the last project item
- Then: focus moves to the first ticket item AND pressing Tab from the Tickets group jumps focus to the first item of the Projects group


#### [BR-5.2](requirements.trace.md#br-52)

WHEN keyboard focus is inside the search modal, Tab key shall jump to the first item of the next result group and Shift+Tab shall jump to the first item of the previous group

##### keyboard_navigation_grouped

Arrow keys navigate across grouped sections, Tab jumps between groups
- Also Covers: [BR-5.1](requirements.trace.md#br-51)
- Given: the quick search modal shows grouped results with Projects (2 items) and Tickets (3 items)
- When: the user presses ArrowDown from the last project item
- Then: focus moves to the first ticket item AND pressing Tab from the Tickets group jumps focus to the first item of the Projects group


#### [BR-5.3](requirements.trace.md#br-53)

WHEN user presses Enter on a selected result, the system shall activate that result (navigate to project/ticket/document) and close the modal

##### enter_activates_result

Enter activates the selected result and closes modal
- Given: the quick search modal shows grouped results AND a project result is selected via keyboard
- When: the user presses Enter
- Then: the modal closes AND the application navigates to the selected project



### BR-6

#### [BR-6.1](requirements.trace.md#br-61)

WHEN a query matches both a project name and a ticket title, the system shall display separate project results and ticket results in their respective groups

##### ambiguous_query_separate_groups

Query matching project name and ticket title shows separate groups
- Given: a project named 'Test' exists AND a ticket titled 'Test feature' exists
- When: the user types 'test' in the search input
- Then: the project appears in the Projects group AND the ticket appears in the Tickets group as separate, labeled results


#### [BR-6.3](requirements.trace.md#br-63)

WHEN search results are empty for the active scope, the system shall display a no-results state that identifies the active scope and does not imply other scopes were searched

##### empty_state_shows_active_scope

No-results state identifies the active scope
- Given: the quick search modal is open in Projects scope
- When: the user types a query that matches no projects
- Then: a no-results message shows the active scope as 'Projects' AND does not imply tickets or documents were searched


#### [BR-6.4](requirements.trace.md#br-64)

WHEN user enters invalid project-code syntax in the project scope, the system shall not block project name lookup

##### project_scope_ticket_search

Project-scoped ticket query returns tickets and invalid code does not block project name lookup
- Also Covers: [BR-3.4](requirements.trace.md#br-34)
- Given: the quick search modal is open in Projects scope
- When: the user types an invalid project-code pattern followed by a name
- Then: the system performs project name lookup without blocking on the invalid code syntax



## Coverage Summary

| Requirement ID | Scenario Count | Scenario IDs |
|---|---:|---|
| [BR-1.1](requirements.trace.md#br-11) | 1 | [scope_controls_visible](#scopecontrolsvisible) |
| [BR-1.2](requirements.trace.md#br-12) | 1 | [scope_controls_visible](#scopecontrolsvisible) |
| [BR-1.3](requirements.trace.md#br-13) | 1 | [scope_switch_via_click](#scopeswitchviaclick) |
| [BR-1.4](requirements.trace.md#br-14) | 2 | [scope_switch_via_keyboard](#scopeswitchviakeyboard), [shortcut_cycles_scopes](#shortcutcyclesscopes) |
| [BR-2.1](requirements.trace.md#br-21) | 1 | [global_search_grouped_results](#globalsearchgroupedresults) |
| [BR-2.2](requirements.trace.md#br-22) | 1 | [global_search_grouped_results](#globalsearchgroupedresults) |
| [BR-2.3](requirements.trace.md#br-23) | 1 | [select_project_navigates](#selectprojectnavigates) |
| [BR-2.4](requirements.trace.md#br-24) | 1 | [select_ticket_or_document](#selectticketordocument) |
| [BR-2.5](requirements.trace.md#br-25) | 1 | [select_document_navigates](#selectdocumentnavigates) |
| [BR-3.1](requirements.trace.md#br-31) | 1 | [partial_project_name_matching](#partialprojectnamematching) |
| [BR-3.2](requirements.trace.md#br-32) | 1 | [partial_project_name_matching](#partialprojectnamematching) |
| [BR-3.3](requirements.trace.md#br-33) | 1 | [ticket_key_priority](#ticketkeypriority) |
| [BR-3.4](requirements.trace.md#br-34) | 2 | [project_scope_returns_tickets](#projectscopereturnstickets), [project_scope_ticket_search](#projectscopeticketsearch) |
| [BR-4.1](requirements.trace.md#br-41) | 1 | [scoped_search_filters_entity_type](#scopedsearchfiltersentitytype) |
| [BR-4.2](requirements.trace.md#br-42) | 1 | [scoped_search_filters_entity_type](#scopedsearchfiltersentitytype) |
| [BR-4.3](requirements.trace.md#br-43) | 1 | [scoped_search_filters_entity_type](#scopedsearchfiltersentitytype) |
| [BR-4.4](requirements.trace.md#br-44) | 1 | [scoped_search_filters_entity_type](#scopedsearchfiltersentitytype) |
| [BR-5.1](requirements.trace.md#br-51) | 1 | [keyboard_navigation_grouped](#keyboardnavigationgrouped) |
| [BR-5.2](requirements.trace.md#br-52) | 1 | [keyboard_navigation_grouped](#keyboardnavigationgrouped) |
| [BR-5.3](requirements.trace.md#br-53) | 1 | [enter_activates_result](#enteractivatesresult) |
| [BR-6.1](requirements.trace.md#br-61) | 1 | [ambiguous_query_separate_groups](#ambiguousqueryseparategroups) |
| [BR-6.3](requirements.trace.md#br-63) | 1 | [empty_state_shows_active_scope](#emptystateshowsactivescope) |
| [BR-6.4](requirements.trace.md#br-64) | 1 | [project_scope_ticket_search](#projectscopeticketsearch) |
