# Tests: MDT-152

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `domain-contracts/src/ticket/search.ts` | `domain-contracts/src/ticket/__tests__/search.test.ts` | SearchMode enum, SearchRequestSchema validation, SearchResponseSchema validation, SearchErrorCode enum |
| `server/controllers/ProjectController.ts` | `server/tests/api/projects.search.test.ts` | POST /api/projects/search ticket_key mode, project_scope mode, request validation, result-limit boundaries, response shape |
| `server/services/TicketService.ts` | `server/tests/api/projects.search.test.ts` | Cross-project orchestration, project resolution, scoped lookup |
| `src/hooks/useQuickSearch.ts` | `src/hooks/useQuickSearch.test.ts` | parseQueryMode, parseQueryParts, filterTickets current-project preservation |
| `src/hooks/useCrossProjectSearch.ts` | `src/hooks/useCrossProjectSearch.test.ts` | Debounce timing, cache TTL, loading state, request deduplication, retry |
| `src/components/ProjectSelector/ProjectBrowserPanel.tsx` | `tests/e2e/selector/project-browser.spec.ts` | E2E: search input, filtering, current-project exclusion, empty state, Escape close |
| `src/components/QuickSearch/*` | `tests/e2e/quick-search/modal.spec.ts` | E2E: ticket-key lookup, @syntax search, mode indicators, keyboard navigation, edge cases |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| "limitPerProject <= 5" boundary | `domain-contracts/search.ts` | at 5 (valid), at 6 (rejected) |
| "limitTotal <= 15" boundary | `domain-contracts/search.ts` | at 15 (valid), at 16 (rejected) |
| "300ms debounce" boundary | `useCrossProjectSearch` | at 200ms (not triggered), at 300ms (triggered), rapid keystrokes (reset timer) |
| "5 min cache TTL" boundary | `useCrossProjectSearch` | within TTL (cached), after TTL (expired) |
| Ticket key pattern "2-5 letters, 1-5 digits" | `useQuickSearch` | valid: MDT-1, ABC-42, XY-99999; invalid: A-42, ABCDEF-42, abc-42 |
| @syntax trigger "requires space after code" | `useQuickSearch` | "@ABC login" → project_scope, "@ABC" → current_project |

## External Dependency Tests

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|----------------------|
| POST /api/projects/search | `server/tests/api/projects.search.test.ts` | 500 error with retry option (tested via route abort in E2E) |
| Cross-project fetch network | `tests/e2e/quick-search/modal.spec.ts` | Network error message with retry button |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `tests/e2e/selector/project-browser.spec.ts` | No backend requests during project browser search filtering |
| C2 | `src/hooks/useCrossProjectSearch.test.ts` | Debounce not triggered before 300ms, triggered after 300ms |
| C3 | `domain-contracts/src/ticket/__tests__/search.test.ts`, `server/tests/api/projects.search.test.ts` | limitPerProject/limitTotal boundary validation |
| C4 | `src/hooks/useCrossProjectSearch.test.ts`, `tests/e2e/quick-search/modal.spec.ts` | Loading state set immediately on fetch start |
| C5 | `tests/e2e/quick-search/modal.spec.ts` | No layout shift when results load (E2E visual check) |
| C6 | `tests/e2e/quick-search/modal.spec.ts` | Modal integration with existing QuickSearch infrastructure |
| C7 | `tests/e2e/selector/project-browser.spec.ts` | ProjectBrowserPanel integration with existing selector |
| C8 | `tests/e2e/quick-search/modal.spec.ts` | Modal/overlay patterns (Escape close, backdrop click) |
| C9 | `src/hooks/useCrossProjectSearch.test.ts` | Cache TTL 5-minute expiry, cache key includes mode+code+query |

## BDD E2E Trace Continuity

BDD scenarios from `bdd.trace.md` are covered by E2E test plans:

| BDD Scenario ID | E2E Test File | Test Plan ID |
|-----------------|---------------|--------------|
| `project_browser_search_filters` | `tests/e2e/selector/project-browser.spec.ts` | `TEST-e2e-project-browser-search` |
| `project_browser_search_empty` | `tests/e2e/selector/project-browser.spec.ts` | `TEST-e2e-project-browser-search` |
| `project_browser_escape_closes` | `tests/e2e/selector/project-browser.spec.ts` | `TEST-e2e-project-browser-search` |
| `cross_project_key_search_loads` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |
| `cross_project_key_not_found` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |
| `cross_project_network_error` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |
| `project_scoped_invalid_code` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |
| `project_scoped_search_valid` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |
| `current_project_search_preserved` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |
| `mode_indicator_changes` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |
| `keyboard_navigation_arrows` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |
| `keyboard_tab_sections` | `tests/e2e/quick-search/modal.spec.ts` | `TEST-e2e-quicksearch-crossproject` |

## Architecture Obligation Coverage

| Obligation ID | Test Files |
|---------------|------------|
| OBL-backend-search-endpoint | `server/tests/api/projects.search.test.ts` |
| OBL-client-cache | `src/hooks/useCrossProjectSearch.test.ts` |
| OBL-crossproject-debounce | `src/hooks/useCrossProjectSearch.test.ts` |
| OBL-current-project-exclusion | `src/hooks/useQuickSearch.test.ts`, `tests/e2e/selector/project-browser.spec.ts` |
| OBL-e2e-tests | `tests/e2e/selector/project-browser.spec.ts`, `tests/e2e/quick-search/modal.spec.ts` |
| OBL-empty-states | `tests/e2e/selector/project-browser.spec.ts`, `tests/e2e/quick-search/modal.spec.ts` |
| OBL-keyboard-nav | `tests/e2e/quick-search/modal.spec.ts` |
| OBL-loading-skeleton | `src/hooks/useCrossProjectSearch.test.ts`, `tests/e2e/quick-search/modal.spec.ts` |
| OBL-mode-indicator | `tests/e2e/quick-search/modal.spec.ts` |
| OBL-project-browser-search | `tests/e2e/selector/project-browser.spec.ts` |
| OBL-project-scoped-search | `server/tests/api/projects.search.test.ts`, `tests/e2e/quick-search/modal.spec.ts` |
| OBL-query-mode-detector | `src/hooks/useQuickSearch.test.ts` |
| OBL-search-contract | `domain-contracts/src/ticket/__tests__/search.test.ts`, `server/tests/api/projects.search.test.ts` |
| OBL-unit-tests | `src/hooks/useQuickSearch.test.ts`, `src/hooks/useCrossProjectSearch.test.ts`, `server/tests/api/projects.search.test.ts` |

## Verify

```bash
# Unit tests
bun run --cwd domain-contracts jest
npx jest src/hooks/useQuickSearch.test.ts
npx jest src/hooks/useCrossProjectSearch.test.ts

# Integration tests
npx jest server/tests/api/projects.search.test.ts

# E2E tests
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/selector/project-browser.spec.ts --project=chromium
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/quick-search/modal.spec.ts --project=chromium

# Spec-trace validation
spec-trace validate MDT-152 --stage tests
```
