---
code: MDT-128
status: Proposed
dateCreated: 2026-03-01T22:00:35.008Z
type: Feature Enhancement
priority: High
---

# E2E Smoke Tests for Critical UI Paths

## 1. Description

### Problem Statement
Currently, the E2E test suite only covers infrastructure verification (backend health, frontend loading, scenario creation). There is no coverage for the core user-facing features and critical UI paths. This means regressions in key functionality could go undetected until manual testing.

### Current State
- `tests/e2e/smoke/infrastructure.spec.ts` verifies backend health and basic frontend loading
- No tests for board view rendering, drag-and-drop (core interaction)
- No tests for list view sorting/filtering
- No tests for documents view navigation
- No tests for ticket detail modal
- No tests for SSE real-time updates (key differentiator)
- No tests for navigation flow or project switching

### Desired State
Comprehensive E2E smoke tests covering all critical user paths:
- **Board View**: Rendering, drag-and-drop, filtering, sorting
- **List View**: Table display, sorting, click-to-view
- **Documents View**: File tree navigation, content viewing
- **Ticket Detail**: Modal open/close, attributes, markdown rendering
- **SSE Real-time Updates**: External changes reflect immediately
- **Navigation**: Routing, redirects, view switching, project switching

### Rationale
- **Regression Prevention**: Catch UI/UX regressions before they reach production
- **Confidence in Deployments**: Automated verification that core functionality works
- **Documentation**: Tests serve as executable documentation of expected behavior
- **Refactoring Safety**: Enable confident refactoring with automated safety net
- **SSE Coverage**: Real-time updates are a key product differentiator
### Desired State
Critical path E2E tests covering:
- **Drag-and-Drop**: Tickets move between columns, status persists
- **SSE Real-time Updates**: External file changes reflect immediately on board
- **Navigation Flow**: Basic routing and modal interactions work

### Rationale
- **High-Risk Areas**: DnD and SSE are complex, high-regression-risk features
- **Key Differentiator**: Real-time SSE updates are a core product feature
- **User Happiness**: Broken DnD or SSE immediately impacts user experience
- **Quick Feedback**: Focused tests run faster, provide faster regression detection
### Desired State
Comprehensive E2E smoke tests covering all critical user paths:
- Navigation and routing work correctly
- Board view renders and allows ticket movement
- List view displays and sorts tickets
- Documents view browses file tree
- Ticket details open and display correctly
- Project switching functions properly

### Rationale
- **Regression Prevention**: Catch UI/UX regressions before they reach production
- **Confidence in Deployments**: Automated verification that core functionality works
- **Documentation**: Tests serve as executable documentation of expected behavior
- **Refactoring Safety**: Enable confident refactoring with automated safety net

### Impact Areas
- `tests/e2e/` - New test files for each feature area
- `tests/e2e/smoke/` - Navigation and UI tests
- `tests/e2e/board/` - Rendering and drag-drop tests
- `tests/e2e/list/` - List view tests
- `tests/e2e/documents/` - Documents view tests
- `tests/e2e/ticket/` - Ticket detail tests
- `tests/e2e/sse/` - Real-time update tests
- `tests/e2e/project/` - Project management tests
- `tests/e2e/navigation/` - URL routing tests
- `tests/e2e/utils/selectors.ts` - May need new selectors
- `src/components/` - May require additional `data-testid` attributes
## 2. Solution Analysis

### Approaches Considered

**Feature-Based Test Organization**:
- Group tests by UI feature (board, list, documents, ticket, navigation)
- Each feature gets its own spec file
- Tests are independent and can run in parallel

**User Journey-Based Organization**:
- Group tests by complete user workflows
- Tests cover end-to-end journeys across multiple features
- More realistic but harder to isolate failures

**Layered Testing**:
- Unit tests for components
- Integration tests for API endpoints
- E2E tests only for critical paths
- More comprehensive but higher maintenance

### Trade-offs Analysis
| Approach | Pros | Cons |
|----------|------|------|
| Feature-Based | Easy to find failing tests, parallel execution | May miss journey-level bugs |
| Journey-Based | Realistic coverage | Harder to debug, slower |
| Layered | Comprehensive coverage | High maintenance burden |

### Decision Factors
- **Maintainability**: Feature-based tests are easier to update when UI changes
- **Execution Speed**: Smaller, focused tests run faster
- **Debugging**: Feature-based tests pinpoint the failing component
- **Parallelization**: Independent tests can run concurrently

### Chosen Approach
**Feature-Based Test Organization** with comprehensive coverage:

```
tests/e2e/
├── smoke/
│   ├── infrastructure.spec.ts    (existing - backend health, frontend loading)
│   ├── navigation.spec.ts        (new - routing, redirects, view switching)
│   └── ui.spec.ts                (new - theme, responsive)
├── board/
│   ├── rendering.spec.ts         (new - columns, tickets, filters)
│   └── drag-drop.spec.ts         (new - DnD + SSE confirmation)
├── list/
│   └── view.spec.ts              (new - table rendering, sorting)
├── documents/
│   └── view.spec.ts              (new - file tree, content viewer)
├── ticket/
│   └── detail.spec.ts            (new - modal, attributes, markdown)
├── sse/
│   └── updates.spec.ts           (new - real-time update scenarios)
├── project/
│   └── management.spec.ts        (new - add, edit, switch projects)
└── navigation/
    └── routing.spec.ts           (new - URL patterns, deep links)
```

**Out of Scope**:
- ~~`ticket/crud.spec.ts`~~ — No editing UI implemented (OOS)

**Priority Focus** (run first, catch regressions fastest):
1. **board/drag-drop.spec.ts** — Core interaction, high regression risk
2. **sse/updates.spec.ts** — Real-time updates are key differentiator
3. **smoke/navigation.spec.ts** — Basic app flow must work
### Rejected Alternatives
- **Journey-Based**: Too complex for initial smoke test coverage
- **Layered**: Existing unit and integration tests exist; E2E should focus on UI paths

## 3. Implementation Specification
### Technical Requirements

**Testing Framework**:
- Playwright for E2E testing
- Existing test fixtures in `tests/e2e/fixtures/test-fixtures.ts`
- Existing scenario builder for test data

**Test Data**:
- Use `buildScenario()` for creating isolated test projects
- Simple (3 tickets), Medium (7 tickets), Complex (12 tickets) scenarios
- Each test runs in isolated temp directory

**Selectors**:
- Use `data-testid` attributes for all testable elements
- Centralize selectors in `tests/e2e/utils/selectors.ts`

### Test Coverage Requirements

**Navigation & Routing** (`tests/e2e/smoke/navigation.spec.ts`):
- Root path `/` redirects to first project
- View mode switching (Board ↔ List ↔ Documents)
- Project selector switches projects
- Direct ticket URL `/:ticketKey` opens ticket modal

**Board View** (`tests/e2e/board/rendering.spec.ts`):
- All status columns render correctly
- Tickets appear in correct columns
- Filter controls work (search/filter tickets)
- Sort controls change ticket order

**Board Drag-Drop** (`tests/e2e/board/drag-drop.spec.ts`):
- Drag ticket between columns
- Verify ticket appears in destination column immediately
- Verify ticket status persists after page refresh
- Verify SSE event is received after drop
- Verify optimistic UI update before server response

**List View** (`tests/e2e/list/view.spec.ts`):
- Table renders with tickets
- Sort by priority, type, date
- Click row opens ticket detail
- Filter controls work

**Documents View** (`tests/e2e/documents/view.spec.ts`):
- File tree renders
- Folder expansion works
- File content displays correctly
- Path selector works

**Ticket Detail** (`tests/e2e/ticket/detail.spec.ts`):
- Click card opens modal
- All attributes display (status, type, priority, assignee)
- Markdown content renders
- Close button returns to previous view

**SSE Real-time Updates** (`tests/e2e/sse/updates.spec.ts`):
- External ticket update via API → board reflects immediately
- External status change → ticket moves to new column via SSE
- Bulk external updates → synchronous board updates
- Ticket view open during external update → modal updates

**Project Management** (`tests/e2e/project/management.spec.ts`):
- Add project modal opens
- Create new project
- Edit existing project
- Switch projects via selector

**URL Routing** (`tests/e2e/navigation/routing.spec.ts`):
- Deep linking to specific views `/prj/:code/list`
- Deep linking to tickets `/prj/:code/ticket/:key`
- Browser back/forward navigation works

**UI / Theme** (`tests/e2e/smoke/ui.spec.ts`):
- Dark/light toggle works
- Responsive layout (mobile vs desktop)

### Configuration Changes
No configuration changes required. Existing Playwright config supports the test structure.

### Dependencies
- Existing: `@playwright/test`, `test-fixtures.ts`, `scenario-builder.ts`
- May need: Additional `data-testid` attributes on components
- New: SSE event monitoring utilities in test helpers
## 4. Acceptance Criteria
### Functional Requirements

**Priority Tests** (Critical Path):
- [ ] **Board DnD**: Drag ticket between columns, verify move persists
- [ ] **SSE - Ticket View**: External update reflects on board immediately
- [ ] **SSE - Status Change**: External status change moves ticket via SSE
- [ ] **SSE - Bulk Updates**: Multiple external updates appear synchronously
- [ ] **Navigation**: Root redirect, view switching, modal flow

**Secondary Tests** (Full Coverage):
- [ ] **Board Rendering**: Columns, tickets, filters, sort controls work
- [ ] **List View**: Table renders, sorting, click-to-view
- [ ] **Documents View**: File tree, content viewer, path selector
- [ ] **Ticket Detail**: Modal opens, attributes display, markdown renders
- [ ] **Project Management**: Add project, edit project, switch projects
- [ ] **URL Routing**: Deep links, browser back/forward work
- [ ] **UI/Theme**: Dark/light toggle, responsive layout

### Non-Functional Requirements
- [ ] Tests run in under 5 minutes total
- [ ] Tests can run in parallel where possible
- [ ] Each test is independent (can run alone)
- [ ] All selectors use `data-testid` (no fragile CSS selectors)
- [ ] SSE events are captured and verified in tests
- [ ] DnD tests verify optimistic UI + server confirmation

### Definition of Done
- [ ] All test files created and passing
- [ ] New selectors added to `tests/e2e/utils/selectors.ts`
- [ ] Missing `data-testid` attributes added to components
- [ ] Documentation updated in `tests/e2e/AGENTS.md` if needed
- [ ] All tests pass with `npm run test:e2e`
- [ ] Tests can run individually without side effects

### Success Metrics
- **Coverage**: All critical UI paths have at least one smoke test
- **Execution time**: Full suite completes in under 5 minutes
- **Reliability**: Tests pass consistently (no flaky tests, no SSE race conditions)
- **Maintainability**: Adding new tests follows established patterns