---
code: MDT-128
status: Implemented
dateCreated: 2026-03-01T22:00:35.008Z
type: Technical Debt
priority: High
relatedTickets: MDT-092
---

# E2E Smoke Tests for Critical UI Paths

## 1. Description
### Problem Statement
The E2E test suite has accumulated **technical debt** with minimal coverage of critical user paths. Only infrastructure verification exists (backend health, frontend loading). Core features like drag-and-drop, SSE real-time updates, and navigation have no automated regression tests, creating significant risk of undetected regressions.

### Current State (Debt Assessment)
- `tests/e2e/smoke/infrastructure.spec.ts` — Only existing test file
- **Missing coverage** (high-risk debt):
  - Board view rendering and drag-and-drop (core interaction)
  - SSE real-time updates (key differentiator, complex implementation)
  - List view sorting/filtering
  - Documents view navigation
  - Ticket detail modal
  - Navigation flow and project switching

### Debt Impact
- **Regressions go undetected** until manual testing discovers them
- **Refactoring is risky** without automated safety net
- **Core features unverified** — DnD and SSE are complex, high-regression-risk
- **Deployment confidence is low** — no automated verification of user-facing functionality

### Remediation Goal
Pay down test debt by implementing comprehensive E2E smoke tests for all critical user paths:
- **Board View**: Rendering, drag-and-drop, filtering, sorting
- **List View**: Table display, sorting, click-to-view
- **Documents View**: File tree navigation, content viewing
- **Ticket Detail**: Modal open/close, attributes, markdown rendering
- **SSE Real-time Updates**: External changes reflect immediately
- **Navigation**: Routing, redirects, view switching, project switching

### Impact Areas
- `tests/e2e/` — New test files for each feature area
- `tests/e2e/smoke/` — Navigation and UI tests
- `tests/e2e/board/` — Rendering and drag-drop tests
- `tests/e2e/sse/` — Real-time update tests
- `src/components/` — May require additional `data-testid` attributes
## 2. Rationale
### Why Address This Debt Now
- **E2E infrastructure is now stable** (MDT-092) — foundation exists for expansion
- **Feature velocity is increasing** — more changes mean higher regression risk
- **SSE is a key differentiator** — untested = vulnerable to silent breakage
- **DnD is high-complexity** — most regression-prone feature needs coverage

### Debt Payoff Value
| Metric | Before | After |
|--------|--------|-------|
| Critical path coverage | ~5% | ~90% |
| Regression detection | Manual only | Automated |
| Refactoring confidence | Low | High |
| Deployment verification | None | Automated |

## 3. Solution Analysis

### Chosen Approach
**Feature-Based Test Organization** — proven pattern from MDT-092 infrastructure:

```text
tests/e2e/
├── smoke/
│   ├── infrastructure.spec.ts    (existing)
│   └── navigation.spec.ts        (new)
├── board/
│   ├── rendering.spec.ts         (new)
│   └── drag-drop.spec.ts         (new — priority)
├── list/
│   └── view.spec.ts              (new)
├── documents/
│   └── view.spec.ts              (new)
├── ticket/
│   └── detail.spec.ts            (new)
├── sse/
│   └── updates.spec.ts           (new — priority)
└── project/
    └── management.spec.ts        (new)
```

### Priority Order (highest debt first)
1. `board/drag-drop.spec.ts` — Core interaction, highest regression risk
2. `sse/updates.spec.ts` — Key differentiator, complex SSE logic
3. `smoke/navigation.spec.ts` — Basic app flow must work
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
