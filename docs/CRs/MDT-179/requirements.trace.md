# Requirements

Ticket: `MDT-179`

## Behavioral Requirements

### BR-1

#### BR-1.1

Route: `bdd`

WHEN user activates quick search, the system shall present a visible scope indicator showing the active search scope (Global, Tickets, Projects, or Documents)

#### BR-1.2

Route: `bdd`

WHEN user activates quick search, the system shall display visible scope controls allowing selection of Global, Tickets, Projects, or Documents scope

#### BR-1.3

Route: `bdd`

WHEN user activates a scope control, the system shall switch the search scope to the selected entity type and update the scope indicator within 100ms

#### BR-1.4

Route: `bdd`

WHEN user presses Tab (or Shift+Tab) in the search modal, the system shall cycle the search scope (All → Tickets → Projects → Documents) without requiring pointer input

### BR-2

#### BR-2.1

Route: `bdd`

WHEN user types a query in Global scope, the system shall display results grouped into separate labeled sections for Projects, Tickets, and Documents

#### BR-2.2

Route: `bdd`

WHEN search results include multiple entity types, the system shall render each entity type with visually distinct styling (icon, color, or badge)

#### BR-2.3

Route: `bdd`

WHEN user selects a project result, the system shall navigate to the selected project and close the search modal

#### BR-2.4

Route: `bdd`

WHEN user selects a ticket result, the system shall navigate to the selected ticket and close the search modal

#### BR-2.5

Route: `bdd`

WHEN user selects a document result, the system shall navigate to the selected document and close the search modal

### BR-3

#### BR-3.1

Route: `bdd`

WHEN user types a partial project name query (e.g., 'task ma'), the system shall match and return projects whose name contains word prefixes matching each query term

#### BR-3.2

Route: `bdd`

WHEN user types a project code query, the system shall match and return projects whose code matches the query as a case-insensitive prefix

#### BR-3.3

Route: `bdd`

WHEN user types an exact ticket key (e.g., 'MDT-179'), the system shall prioritize the ticket lookup over project and document matching

#### BR-3.4

Route: `bdd`

WHEN user types a project-scoped ticket query (e.g., '@CODE text'), the system shall search for tickets within the specified project and display results as ticket results, not project results

### BR-4

#### BR-4.1

Route: `bdd`

WHEN search scope is set to Projects, the system shall display only project results matching the query

#### BR-4.2

Route: `bdd`

WHEN search scope is set to Tickets, the system shall display only ticket results matching the query

#### BR-4.3

Route: `bdd`

WHEN search scope is set to Documents, the system shall display only document results matching the query

#### BR-4.4

Route: `bdd`

WHEN user switches search scope, the system shall either preserve the current query text or clear it according to a visible predictable rule displayed to the user

### BR-5

#### BR-5.1

Route: `bdd`

WHEN keyboard focus is inside the search modal, Arrow Up and Arrow Down keys shall navigate across all visible result items in grouped sections sequentially

#### BR-5.2

Route: `bdd`

WHEN keyboard focus is inside the search modal, Tab key shall jump to the first item of the next result group and Shift+Tab shall jump to the first item of the previous group

#### BR-5.3

Route: `bdd`

WHEN user presses Enter on a selected result, the system shall activate that result (navigate to project/ticket/document) and close the modal

### BR-6

#### BR-6.1

Route: `bdd`

WHEN a query matches both a project name and a ticket title, the system shall display separate project results and ticket results in their respective groups

#### BR-6.2

Route: `tests`

WHEN a query matches only hidden or inaccessible entities, the system shall not expose those entity names in search results

#### BR-6.3

Route: `bdd`

WHEN search results are empty for the active scope, the system shall display a no-results state that identifies the active scope and does not imply other scopes were searched

#### BR-6.4

Route: `bdd`

WHEN user enters invalid project-code syntax in the project scope, the system shall not block project name lookup

## Constraints

### C1

Route: `tests`

Search scope changes shall not cause visible layout jumps in the command palette (reflow must be bounded to content area)

### C2

Route: `tests`

Result grouping shall remain readable on viewports from 320px to 1920px width

### C3

Route: `tests`

Keyboard focus shall remain inside the command palette while it is open

### C4

Route: `tests`

Search shall not reveal entities unavailable to the current access mode (read-only sessions, token-scoped sessions)

### C5

Route: `tests`

Existing ticket search behavior (current_project mode, ticket_key mode, project_scope mode) shall be preserved without breaking changes

### C6

Route: `tests`

The search interaction model shall be extensible to document content search without requiring a command palette redesign

## Edge Cases

_No edge cases recorded._

## Route Policy Summary

| Route | Count | IDs |
|---|---:|---|
| bdd | 23 | [BR-1.1](#br-11), [BR-1.2](#br-12), [BR-1.3](#br-13), [BR-1.4](#br-14), [BR-2.1](#br-21), [BR-2.2](#br-22), [BR-2.3](#br-23), [BR-2.4](#br-24), [BR-2.5](#br-25), [BR-3.1](#br-31), [BR-3.2](#br-32), [BR-3.3](#br-33), [BR-3.4](#br-34), [BR-4.1](#br-41), [BR-4.2](#br-42), [BR-4.3](#br-43), [BR-4.4](#br-44), [BR-5.1](#br-51), [BR-5.2](#br-52), [BR-5.3](#br-53), [BR-6.1](#br-61), [BR-6.3](#br-63), [BR-6.4](#br-64) |
| tests | 7 | [BR-6.2](#br-62), [C1](#c1), [C2](#c2), [C3](#c3), [C4](#c4), [C5](#c5), [C6](#c6) |
| clarification | 0 | - |
| not_applicable | 0 | - |
