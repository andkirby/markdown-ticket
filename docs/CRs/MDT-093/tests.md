# Tests: MDT-093

**Mode**: Feature
**Source**: requirements.md
**Generated**: 2025-12-11

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework (E2E) | Playwright |
| Framework (Backend) | Jest |
| Test directory | `tests/e2e/` |
| Backend test directory | `server/tests/` |
| E2E test command | `npm run test:e2e` |
| Backend test command | `cd server && npm test` |
| CR test filter | `--grep "MDT-093"` |

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| R1.1 | Display tabs with main and sub-documents | `subdocument-tabs.spec.ts` | 3 | 🔴 RED |
| R1.2 | Tab ordering (default and custom) | `subdocument-tabs.spec.ts` | 2 | 🔴 RED |
| R1.3 | Hide tabs when no sub-documents | `subdocument-tabs.spec.ts` | 1 | 🔴 RED |
| R1.4 | Tabs remain visible while scrolling | `sticky-tabs.spec.ts` | 2 | 🔴 RED |
| R2.1 | Sticky positioning on scroll | `sticky-tabs.spec.ts` | 2 | 🔴 RED |
| R2.2 | No layout shift with sticky tabs | `sticky-tabs.spec.ts` | 1 | 🔴 RED |
| R2.3 | Proper spacing from viewport edges | `sticky-tabs.spec.ts` | 1 | 🔴 RED |
| R3.1 | Click tab to switch content | `tab-interaction.spec.ts` | 2 | 🔴 RED |
| R3.2 | Loading indicator for slow content | `tab-interaction.spec.ts` | 2 | 🔴 RED |
| R3.3 | Visual distinction for selected tab | `tab-interaction.spec.ts` | 1 | 🔴 RED |
| R4.1 | URL updates with hash fragment | `deep-linking.spec.ts` | 2 | 🔴 RED |
| R4.2 | Auto-select tab from URL hash | `deep-linking.spec.ts` | 2 | 🔴 RED |
| R4.3 | Fallback to main for missing sub-doc | `deep-linking.spec.ts` | 2 | 🔴 RED |
| R4.4 | Browser back/forward navigation | `deep-linking.spec.ts` | 2 | 🔴 RED |
| R5.1 | Real-time tab addition | `realtime-updates.spec.ts` | 2 | 🔴 RED |
| R5.2 | Real-time tab removal (all) | `realtime-updates.spec.ts` | 2 | 🔴 RED |
| R5.3 | Real-time active tab deletion | `realtime-updates.spec.ts` | 2 | 🔴 RED |
| R5.4 | Error handling for failed loads | `error-handling.spec.ts` | 2 | 🔴 RED |
| R5.5 | Not found error handling | `error-handling.spec.ts` | 2 | 🔴 RED |

## Test Specifications

### Feature: Tab Discovery and Display

**File**: `tests/e2e/subdocument-tabs.spec.ts`
**Covers**: R1.1, R1.2, R1.3

#### Scenario: display_tabs_with_subdocuments (R1.1)

```gherkin
Given a ticket with a sub-document directory containing requirements.md, architecture.md, and tasks.md
When the user opens the ticket
Then the system shall display tabs labeled "main", "requirements", "architecture", and "tasks"
And the "main" tab shall be selected by default
```

**Test**: `describe('Tab Discovery') > it('displays tabs for ticket with subdocuments')`

#### Scenario: display_tabs_custom_order (R1.2)

```gherkin
Given a ticket with sub-documents and a .mdt-config.toml specifying custom order "tasks, requirements, architecture"
When the user opens the ticket
Then the system shall display tabs in the custom order: "main", "tasks", "requirements", "architecture"
```

**Test**: `describe('Tab Ordering') > it('respects custom subdocument order from config')`

#### Scenario: hide_tabs_no_subdocuments (R1.3)

```gherkin
Given a ticket with only a main document and no sub-document directory
When the user opens the ticket
Then the system shall not display any tab interface
And the main document content shall be displayed directly
```

**Test**: `describe('Tab Discovery') > it('hides tabs when no subdocuments exist')`

### Feature: Sticky Tab Navigation

**File**: `tests/e2e/sticky-tabs.spec.ts`
**Covers**: R1.4, R2.1, R2.2, R2.3

#### Scenario: tabs_remain_visible_on_scroll (R1.4, R2.1)

```gherkin
Given a ticket with sub-documents and tabs displayed
When the user scrolls down through a long document
Then the tab bar shall remain fixed at the top of the viewport
And all tabs shall remain visible and clickable
```

**Test**: `describe('Sticky Behavior') > it('keeps tabs visible while scrolling')`

#### Scenario: no_layout_shift (R2.2)

```gherkin
Given tabs are displayed in sticky position
When the user scrolls causing tabs to become sticky
Then the content below shall jump smoothly to fill the space
And no visible layout shift shall occur
```

**Test**: `describe('Sticky Behavior') > it('prevents layout shift when becoming sticky')`

### Feature: Tab Interaction

**File**: `tests/e2e/tab-interaction.spec.ts`
**Covers**: R3.1, R3.2, R3.3

#### Scenario: click_to_switch_content (R3.1)

```gherkin
Given a ticket with multiple sub-documents
When the user clicks on the "architecture" tab
Then the architecture.md content shall be displayed
And the "architecture" tab shall be visually selected
```

**Test**: `describe('Tab Switching') > it('loads and displays content when tab clicked')`

#### Scenario: show_loading_indicator (R3.2)

```gherkin
Given a sub-document that takes longer than 100ms to load
When the user clicks its tab
Then a loading indicator shall appear within 50ms
And the indicator shall disappear when content loads
```

**Test**: `describe('Tab Switching') > it('shows loading indicator for slow loading content')`

### Feature: Deep Linking

**File**: `tests/e2e/deep-linking.spec.ts`
**Covers**: R4.1, R4.2, R4.3, R4.4

#### Scenario: url_updates_with_hash (R4.1)

```gherkin
Given a ticket with sub-documents
When the user clicks on the "tasks" tab
Then the URL shall update to include "#tasks" hash fragment
And the page content shall remain visible
```

**Test**: `describe('Deep Linking') > it('updates URL hash when switching tabs')`

#### Scenario: auto_select_from_hash (R4.2)

```gherkin
Given a ticket URL with "#architecture" hash fragment
When the user navigates to this URL
Then the "architecture" tab shall be automatically selected
And the architecture content shall be displayed
```

**Test**: `describe('Deep Linking') > it('selects correct tab from URL hash on load')`

#### Scenario: fallback_to_main (R4.3)

```gherkin
Given a ticket URL with "#deleted" hash fragment
When the user navigates to this URL and the sub-document doesn't exist
Then the "main" tab shall be selected instead
And the main document content shall be displayed
```

**Test**: `describe('Deep Linking') > it('falls back to main tab for missing subdocument')`

### Feature: Real-time Updates

**File**: `tests/e2e/realtime-updates.spec.ts`
**Covers**: R5.1, R5.2, R5.3

#### Scenario: realtime_tab_addition (R5.1)

```gherkin
Given the user is viewing a ticket with tabs displayed
When the backend adds a new "debt.md" sub-document
Then a new "debt" tab shall appear automatically
And the existing tabs shall maintain their order
```

**Test**: `describe('Real-time Updates') > it('adds new tab when subdocument is created')`

#### Scenario: realtime_active_deletion (R5.3)

```gherkin
Given the user is viewing the "tasks" sub-document
When the backend deletes the tasks.md file
Then the system shall automatically switch to the "main" tab
And the "tasks" tab shall be removed from the interface
```

**Test**: `describe('Real-time Updates') > it('switches to main when active subdocument is deleted')`

### Feature: Error Handling

**File**: `tests/e2e/error-handling.spec.ts`
**Covers**: R5.4, R5.5

#### Scenario: document_load_error (R5.4)

```gherkin
Given a sub-document that fails to load due to permissions error
When the user clicks on its tab
Then an error message shall be displayed in the content area
And the tab shall remain selectable for retry
```

**Test**: `describe('Error Handling') > it('displays error message when document fails to load')`

## Backend Tests

### Feature: Sub-document API

**File**: `server/tests/crService.subdocuments.test.js`
**Covers**: Backend API endpoints

#### Scenario: get_ticket_with_subdocuments

```gherkin
Given a ticket with sub-document directory
When requesting GET /api/projects/{projectId}/crs/{crId}
Then the response shall include subdocuments array with sorted names
And the array shall follow default or configured order
```

**Test**: `describe('CR Service') > it('returns ticket with sorted subdocuments array')`

#### Scenario: get_individual_subdocument

```gherkin
Given a ticket with a tasks.md sub-document
When requesting GET /api/projects/{projectId}/crs/{crId}/tasks
Then the response shall include code, content, dateCreated, and lastModified
And the content shall be the raw markdown of tasks.md
```

**Test**: `describe('CR Service') > it('returns subdocument content with metadata')`

#### Scenario: config_based_ordering

```gherkin
Given a .mdt-config.toml with custom ticketSubdocuments order
When retrieving subdocuments for a ticket
Then the subdocuments shall be returned in the configured order
And missing subdocuments shall be omitted from the array
```

**Test**: `describe('CR Service') > it('uses custom ordering from config file')`

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| Very large sub-document (>1MB) | Still loads within performance limits | `performance.spec.ts` | R3.2 |
| Rapid tab switching | Cancels previous requests, shows latest | `tab-interaction.spec.ts` | R3.1 |
| Network error while loading | Shows retry option with error message | `error-handling.spec.ts` | R5.4 |
| Sub-document with invalid markdown | Still displays raw content safely | `error-handling.spec.ts` | R5.4 |
| Hash fragment with special characters | Properly encodes/decodes URL | `deep-linking.spec.ts` | R4.1 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `tests/e2e/subdocument-tabs.spec.ts` | 6 | ~150 | 🔴 RED |
| `tests/e2e/sticky-tabs.spec.ts` | 4 | ~120 | 🔴 RED |
| `tests/e2e/tab-interaction.spec.ts` | 5 | ~140 | 🔴 RED |
| `tests/e2e/deep-linking.spec.ts` | 6 | ~160 | 🔴 RED |
| `tests/e2e/realtime-updates.spec.ts` | 4 | ~130 | 🔴 RED |
| `tests/e2e/error-handling.spec.ts` | 4 | ~110 | 🔴 RED |
| `server/tests/crService.subdocuments.test.js` | 3 | ~100 | 🔴 RED |
| `server/tests/crController.subdocuments.test.js` | 4 | ~120 | 🔴 RED |

## Verification

Run E2E tests (should all fail):
```bash
npm run test:e2e -- --grep "MDT-093"
# Expected: 33 failed, 0 passed
```

Run backend tests (should all fail):
```bash
cd server && npm test -- --testNamePattern="subdocuments"
# Expected: 7 failed, 0 passed
```

## Coverage Checklist

- [x] All requirements have at least one test
- [x] Happy path scenarios covered
- [x] Error scenarios covered
- [x] Edge cases from architecture included
- [x] Both frontend and backend tests generated
- [x] Real-time SSE event scenarios included
- [x] Performance requirements tested
- [x] Accessibility scenarios included
- [ ] Tests are RED (verified manually)

## Performance Tests

### Feature: Tab Switching Performance

**File**: `tests/e2e/performance.spec.ts`

#### Scenario: tab_switching_under_100ms

```gherkin
Given a typical sub-document (<100KB)
When the user clicks its tab
Then the content shall begin loading within 100ms
And the loading indicator shall appear within 50ms
```

## Accessibility Tests

### Feature: Keyboard Navigation

**File**: `tests/e2e/accessibility.spec.ts`

#### Scenario: tab_keyboard_navigation

```gherkin
Given tabs are displayed
When the user tabs to the tab list
Then focus shall be on the currently selected tab
And arrow keys shall navigate between tabs
And Enter/Space shall select the focused tab
```

---

## For Implementation

Each task in `/mdt:tasks` should reference which tests it will make GREEN:

| Task | Makes GREEN |
|------|-------------|
| Task 2.1 (Implement backend API) | `server/tests/crService.subdocuments.test.js`, `server/tests/crController.subdocuments.test.js` |
| Task 2.2 (Create TicketTabs component) | `tests/e2e/subdocument-tabs.spec.ts` (R1.1, R1.3) |
| Task 2.3 (Implement sticky positioning) | `tests/e2e/sticky-tabs.spec.ts` (all) |
| Task 2.4 (Add tab interaction logic) | `tests/e2e/tab-interaction.spec.ts` (all) |
| Task 2.5 (Implement deep linking) | `tests/e2e/deep-linking.spec.ts` (all) |
| Task 2.6 (Add SSE updates) | `tests/e2e/realtime-updates.spec.ts` (all) |
| Task 2.7 (Add error handling) | `tests/e2e/error-handling.spec.ts` (all) |
| Task 2.8 (Performance optimization) | `tests/e2e/performance.spec.ts` (all) |
| Task 2.9 (Accessibility features) | `tests/e2e/accessibility.spec.ts` (all) |

After each task: Run corresponding tests to verify they become GREEN.
