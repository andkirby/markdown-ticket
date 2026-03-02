# BDD Acceptance Tests: MDT-128

**Mode**: Prep (Behavior Lock)
**Source**: existing system analysis + CR requirements
**Generated**: 2025-03-02

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Playwright |
| Directory | `tests/e2e/` |
| Command | `npm run test:e2e` |
| Filter | `n/a` |

## User Journeys

### Journey 1: Board View Rendering
**User Goal**: View tickets organized by status columns
**Entry Point**: Navigate to project board view

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| Board displays all status columns | Happy path | BR-1.1 |
| Tickets appear in correct columns | Happy path | BR-1.2 |
| Filter controls reduce visible tickets | Interaction | BR-1.3 |

### Journey 2: Board Drag-and-Drop
**User Goal**: Move tickets between status columns
**Entry Point**: Drag ticket card to different column

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| Drag ticket between columns | Happy path | BR-2.1 |
| Ticket persists after page refresh | Persistence | BR-2.2 |
| SSE event received after drop | Real-time | BR-2.3 |

### Journey 3: Navigation Flow
**User Goal**: Navigate between views and projects
**Entry Point**: Click navigation tabs or project selector

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| Root path redirects to first project | Redirect | BR-3.1 |
| View mode switching works | Navigation | BR-3.2 |
| Project selector switches projects | Navigation | BR-3.3 |
| Direct ticket URL opens modal | Deep link | BR-3.4 |

### Journey 4: List View
**User Goal**: View tickets in tabular format
**Entry Point**: Navigate to list view

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| Table renders with tickets | Happy path | BR-4.1 |
| Sort changes ticket order | Interaction | BR-4.2 |
| Click row opens ticket detail | Navigation | BR-4.3 |

### Journey 5: Documents View
**User Goal**: Browse and view markdown documents
**Entry Point**: Navigate to documents view

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| File tree renders | Happy path | BR-5.1 |
| Folder expansion works | Interaction | BR-5.2 |
| File content displays | Happy path | BR-5.3 |
| Document metadata displays for direct document links | Rendering | BR-5.4 |

### Journey 6: Ticket Detail Modal
**User Goal**: View full ticket details
**Entry Point**: Click ticket card or list row

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| Click card opens modal | Happy path | BR-6.1 |
| All attributes display | Rendering | BR-6.2 |
| Markdown content renders | Rendering | BR-6.3 |
| Close button returns to view | Navigation | BR-6.4 |

### Journey 7: SSE Real-time Updates
**User Goal**: See external changes reflected immediately
**Entry Point**: External ticket file modification (file system → chokidar → SSE → UI)

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| File content update reflects immediately | Real-time | BR-7.1 |
| Status change moves ticket via SSE | Real-time | BR-7.2 |
| Bulk updates appear synchronously | Real-time | BR-7.3 |
| Modal remains usable during external file change | Real-time | BR-7.4 |

### Journey 8: Project Management
**User Goal**: Create and switch between projects
**Entry Point**: Project selector and add project modal

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| Add project modal opens | Interaction | BR-8.1 |
| Project path folder browser loads directories | Interaction | BR-8.2 |
| Create new project | Creation | BR-8.3 |
| Switch projects via selector | Navigation | BR-8.4 |

## Scenario Specifications

### Feature: Board Rendering
**File**: `tests/e2e/board/rendering.spec.ts`
**Covers**: BR-1.1, BR-1.2, BR-1.3

```gherkin
Feature: Board View Rendering
  As a user
  I want to see tickets organized by status columns
  So that I can quickly understand project status

  @requirement:BR-1.1 @priority:high
  Scenario: Board displays all status columns
    Given I have created a project with tickets
    When I navigate to the project board view
    Then I should see columns for "Implemented", "In Progress", and "Proposed" statuses
    And each column should be visible on the page

  @requirement:BR-1.2 @priority:high
  Scenario: Tickets appear in correct columns
    Given I have a project with tickets in different statuses
    When I navigate to the project board view
    Then tickets with "Implemented" status should appear in the Implemented column
    And tickets with "In Progress" status should appear in the In Progress column
    And tickets with "Proposed" status should appear in the Proposed column

  @requirement:BR-1.3 @priority:medium
  Scenario: Filter controls reduce visible tickets
    Given I have a project with multiple tickets
    When I navigate to the project board view
    And I enter a search term in the filter input
    Then only tickets matching the search term should be visible
    And other tickets should be hidden
```

### Feature: Board Drag-Drop
**File**: `tests/e2e/board/drag-drop.spec.ts`
**Covers**: BR-2.1, BR-2.2, BR-2.3

```gherkin
Feature: Board Drag-and-Drop
  As a user
  I want to drag tickets between status columns
  So that I can update ticket status efficiently

  @requirement:BR-2.1 @priority:critical
  Scenario: Drag ticket between columns
    Given I have a ticket in the "Proposed" column
    When I drag the ticket to the "In Progress" column
    Then the ticket should appear in the "In Progress" column
    And the ticket should no longer appear in the "Proposed" column

  @requirement:BR-2.2 @priority:critical
  Scenario: Ticket persists after page refresh
    Given I have moved a ticket to the "In Progress" column
    When I refresh the page
    Then the ticket should still appear in the "In Progress" column
    And the ticket status should be "In Progress"

  @requirement:BR-2.3 @priority:critical
  Scenario: SSE event received after drop
    Given I have two browser tabs open to the same project
    And I have moved a ticket to the "In Progress" column in tab 1
    When I observe tab 2
    Then the ticket should appear in the "In Progress" column in tab 2
    And the change should be visible without a page refresh
```

### Feature: Navigation Flow
**File**: `tests/e2e/smoke/navigation.spec.ts`
**Covers**: BR-3.1, BR-3.2, BR-3.3, BR-3.4

```gherkin
Feature: Navigation Flow
  As a user
  I want to navigate between views and projects
  So that I can access different parts of the application

  @requirement:BR-3.1 @priority:high
  Scenario: Root path redirects to first project
    Given I have created a project
    When I navigate to the root path "/"
    Then I should be redirected to the project board view
    And the URL should contain the project code

  @requirement:BR-3.2 @priority:high
  Scenario: View mode switching works
    Given I am viewing the project board
    When I click the "List" tab
    Then I should see the list view of tickets
    When I click the "Documents" tab
    Then I should see the documents view

  @requirement:BR-3.3 @priority:high
  Scenario: Project selector switches projects
    Given I have created two projects
    When I click the project selector for the second project
    Then I should see the board view for the second project
    And the tickets should belong to the second project

  @requirement:BR-3.4 @priority:medium
  Scenario: Direct ticket URL opens modal
    Given I have a ticket with code "PROJ-1"
    When I navigate directly to "/prj/PROJ/ticket/PROJ-1"
    Then the ticket detail modal should be open
    And the modal should display ticket PROJ-1
```

### Feature: List View
**File**: `tests/e2e/list/view.spec.ts`
**Covers**: BR-4.1, BR-4.2, BR-4.3

```gherkin
Feature: List View
  As a user
  I want to view tickets in a tabular format
  So that I can compare and sort tickets easily

  @requirement:BR-4.1 @priority:high
  Scenario: Table renders with tickets
    Given I have a project with multiple tickets
    When I navigate to the list view
    Then I should see a table with ticket rows
    And each row should contain ticket code, title, status, type, and priority

  @requirement:BR-4.2 @priority:medium
  Scenario: Sort changes ticket order
    Given I am viewing the list view with multiple tickets
    When I click the "Priority" column header
    Then tickets should be ordered by priority
    When I click the "Status" column header
    Then tickets should be ordered by status

  @requirement:BR-4.3 @priority:high
  Scenario: Click row opens ticket detail
    Given I am viewing the list view
    When I click on a ticket row
    Then the ticket detail modal should open
    And the modal should display the clicked ticket
```

### Feature: Documents View
**File**: `tests/e2e/documents/view.spec.ts`
**Covers**: BR-5.1, BR-5.2, BR-5.3, BR-5.4

```gherkin
Feature: Documents View
  As a user
  I want to browse and view markdown documents
  So that I can read project documentation

  @requirement:BR-5.1 @priority:high
  Scenario: File tree renders
    Given I have a project with documents
    When I navigate to the documents view
    Then I should see a file tree structure
    And folders and files should be visually distinct

  @requirement:BR-5.2 @priority:medium
  Scenario: Folder expansion works
    Given I am viewing the documents view with a collapsed folder
    When I click on the folder
    Then the folder should expand
    And I should see its child files and folders

  @requirement:BR-5.3 @priority:high
  Scenario: File content displays
    Given I am viewing the documents view
    When I click on a markdown file
    Then the file content should appear in a content viewer
    And markdown should be rendered correctly

  @requirement:BR-5.4 @priority:high
  Scenario: Document metadata displays for direct document links
    Given I have a project with documents
    When I navigate directly to a document in the documents view
    Then I should see the document content
    And I should see created metadata for the selected document
    And I should see updated metadata for the selected document
    And neither metadata value should be "Unknown"
```

### Feature: Ticket Detail Modal
**File**: `tests/e2e/ticket/detail.spec.ts`
**Covers**: BR-6.1, BR-6.2, BR-6.3, BR-6.4

```gherkin
Feature: Ticket Detail Modal
  As a user
  I want to view full ticket details
  So that I can understand all ticket information

  @requirement:BR-6.1 @priority:high
  Scenario: Click card opens modal
    Given I am viewing the board view
    When I click on a ticket card
    Then a modal should appear
    And the modal should be overlaying the board

  @requirement:BR-6.2 @priority:high
  Scenario: All attributes display
    Given I have opened a ticket modal
    Then I should see the ticket title
    And I should see the ticket code
    And I should see status, type, and priority badges
    And I should see the assignee if set

  @requirement:BR-6.3 @priority:high
  Scenario: Markdown content renders
    Given I have a ticket with markdown content including headers and lists
    When I open the ticket modal
    Then headers should be rendered with correct styling
    And lists should be formatted correctly

  @requirement:BR-6.4 @priority:high
  Scenario: Close button returns to view
    Given I have opened a ticket modal from the board view
    When I click the close button
    Then the modal should close
    And I should return to the board view
```

### Feature: SSE Real-time Updates
**File**: `tests/e2e/sse/updates.spec.ts`
**Covers**: BR-7.1, BR-7.2, BR-7.3, BR-7.4
**SSE Utilities**: `tests/e2e/utils/sse-helpers.ts` (`modifyTicketFile()`, `waitForSSEEvent()`)

```gherkin
Feature: SSE Real-time Updates
  As a user
  I want to see external changes reflected immediately
  So that I can collaborate with others in real-time

  @requirement:BR-7.1 @priority:critical
  Scenario: File content update reflects immediately
    Given I have a browser tab open to the board view
    And a ticket with title "Original Title"
    When I modify the ticket markdown file on disk to change title to "Updated Title"
    Then the ticket title on the board should change to "Updated Title" within 2 seconds
    And no page refresh should be required
    And the change flows through: file system → chokidar → backend → SSE → UI

  @requirement:BR-7.2 @priority:critical
  Scenario: Status change moves ticket via SSE
    Given I have a browser tab open to the board view
    And a ticket in the "Proposed" column
    When I modify the ticket status in the frontmatter to "In Progress" on disk
    Then the ticket should move to the "In Progress" column within 2 seconds
    And the move should happen without page refresh
    And the change flows through: file system → chokidar → backend → SSE → UI

  @requirement:BR-7.3 @priority:high
  Scenario: Bulk updates appear synchronously
    Given I have a browser tab open to the board view
    And 3 tickets with status "Proposed"
    When I modify all 3 ticket files on disk to change status to "Implemented" in quick succession
    Then all 3 tickets should move to the "Implemented" column
    And all moves should complete within 5 seconds
    And each change flows through: file system → chokidar → backend → SSE → UI

  @requirement:BR-7.4 @priority:high
  Scenario: Modal remains usable during external file change
    Given I have a ticket modal open for ticket "PROJ-1"
    And the ticket has title "Original Title"
    When I modify the ticket file on disk to change title to "New Title"
    Then the board should reflect "New Title" without a page refresh
    And the modal should remain open and usable
    When I close and reopen the ticket
    Then the modal should display "New Title"
    And the change flows through: file system → chokidar → backend → SSE → UI
```

### Feature: Project Management
**File**: `tests/e2e/project/management.spec.ts`
**Covers**: BR-8.1, BR-8.2, BR-8.3, BR-8.4

```gherkin
Feature: Project Management
  As a user
  I want to create and switch between projects
  So that I can manage multiple projects

  @requirement:BR-8.1 @priority:medium
  Scenario: Add project modal opens
    Given I am viewing the application
    When I click the "Add Project" button
    Then a modal should appear with project creation form
    And the form should have inputs for name and code

  @requirement:BR-8.2 @priority:medium
  Scenario: Project path folder browser loads directories
    Given I have opened the add project modal
    When I click the browse button for project path
    Then the folder browser modal should appear
    And I should see the current directory path
    And I should see available folders to select

  @requirement:BR-8.3 @priority:high
  Scenario: Create new project
    Given I have opened the add project modal
    When I enter "My Test Project" as the name
    And I click the create button
    Then the project should be created
    And the project should appear in the project selector

  @requirement:BR-8.4 @priority:high
  Scenario: Switch projects via selector
    Given I have two projects created
    And I am viewing the first project
    When I click the second project button in the nav bar
    Then I should see the board for the second project
    And the URL should reflect the second project code
```

## Generated Test Files

| File | Scenarios |
|------|-----------|
| `tests/e2e/board/rendering.spec.ts` | 3 |
| `tests/e2e/board/drag-drop.spec.ts` | 3 |
| `tests/e2e/smoke/navigation.spec.ts` | 4 |
| `tests/e2e/list/view.spec.ts` | 3 |
| `tests/e2e/documents/view.spec.ts` | 4 |
| `tests/e2e/ticket/detail.spec.ts` | 4 |
| `tests/e2e/sse/updates.spec.ts` | 4 |
| `tests/e2e/project/management.spec.ts` | 4 |

## Requirement Coverage

| Req ID | Scenarios | Routed To | Covered? |
|--------|-----------|-----------|----------|
| BR-1.1 | Board displays all status columns | bdd | ✅ |
| BR-1.2 | Tickets appear in correct columns | bdd | ✅ |
| BR-1.3 | Filter controls reduce visible tickets | bdd | ✅ |
| BR-2.1 | Drag ticket between columns | bdd | ✅ |
| BR-2.2 | Ticket persists after page refresh | bdd | ✅ |
| BR-2.3 | SSE event received after drop | bdd | ✅ |
| BR-3.1 | Root path redirects to first project | bdd | ✅ |
| BR-3.2 | View mode switching works | bdd | ✅ |
| BR-3.3 | Project selector switches projects | bdd | ✅ |
| BR-3.4 | Direct ticket URL opens modal | bdd | ✅ |
| BR-4.1 | Table renders with tickets | bdd | ✅ |
| BR-4.2 | Sort changes ticket order | bdd | ✅ |
| BR-4.3 | Click row opens ticket detail | bdd | ✅ |
| BR-5.1 | File tree renders | bdd | ✅ |
| BR-5.2 | Folder expansion works | bdd | ✅ |
| BR-5.3 | File content displays | bdd | ✅ |
| BR-5.4 | Document metadata displays for direct document links | bdd | ✅ |
| BR-6.1 | Click card opens modal | bdd | ✅ |
| BR-6.2 | All attributes display | bdd | ✅ |
| BR-6.3 | Markdown content renders | bdd | ✅ |
| BR-6.4 | Close button returns to view | bdd | ✅ |
| BR-7.1 | External update reflects immediately | bdd | ✅ |
| BR-7.2 | Status change moves ticket via SSE | bdd | ✅ |
| BR-7.3 | Bulk updates appear synchronously | bdd | ✅ |
| BR-7.4 | Modal remains usable during external change | bdd | ✅ |
| BR-8.1 | Add project modal opens | bdd | ✅ |
| BR-8.2 | Project path folder browser loads directories | bdd | ✅ |
| BR-8.3 | Create new project | bdd | ✅ |
| BR-8.4 | Switch projects via selector | bdd | ✅ |

## Verification

In prep mode, tests will be created to document existing behavior. Once implementation is complete:

```bash
npm run test:e2e
```

**Expected Result**: All 29 scenarios pass (0 failed)

## Acceptance Gating

| Field | Value |
|-------|-------|
| Executable Required | true |
| Waiver Granted | false |
| Waiver Reason | n/a |

## Implementation Handoff

For implementation:
1. Each test file corresponds to a feature area
2. Tests use `buildScenario()` for test data
3. All selectors should use `data-testid` attributes from `tests/e2e/utils/selectors.ts`
4. Missing `data-testid` attributes need to be added to components (see `architecture.md` Phase 1 & 2)
5. Tests should run independently (navigate directly to project via `/prj/{code}`)
6. **SSE tests require file-system-based utilities** in `tests/e2e/utils/sse-helpers.ts`:
   - `modifyTicketFile()` — Modify ticket file on disk to trigger chokidar
   - `waitForSSEEvent()` — Wait for specific SSE event type
   - `captureSSEEvents()` — Capture all SSE events during test

**SSE Testing Requirement**: SSE tests must use file system changes (not API calls) to test the full production flow: file change → chokidar detection → backend broadcast → SSE → UI update.

*Generated by /mdt:bdd v2*
