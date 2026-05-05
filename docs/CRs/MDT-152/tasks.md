# Tasks: MDT-152

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **Frontend QuickSearch**: Extend existing `src/components/QuickSearch/*` components with cross-project modes, mode indicators, loading/error/empty states, and multi-section keyboard navigation. Must preserve existing MDT-136 current-project search behavior.
- **Frontend ProjectBrowserPanel**: Add client-side search filtering, autofocus, Escape close, current-project exclusion, and empty state to `src/components/ProjectSelector/ProjectBrowserPanel.tsx`.
- **Backend**: Add `POST /api/projects/search` endpoint to existing route/controller/service stack. Must not preload all project tickets.
- **Shared Contracts**: Define typed search request/response schemas in `domain-contracts/src/ticket/search.ts`.
- **No full-text search**: Only ticket-key lookup and single-project scoped search. Future full-text requires a new mode and ADR.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|---|---|---|
| Query classification (mode detection) | `src/hooks/useQuickSearch.ts` | N/A — single owner |
| Async search state (debounce, cache, dedupe) | `src/hooks/useCrossProjectSearch.ts` | N/A — single owner |
| HTTP transport + request dedupe | `src/services/dataLayer.ts` | N/A — single owner |
| Search request/response schemas | `domain-contracts/src/ticket/search.ts` | N/A — single owner |
| Cross-project search orchestration | `server/services/TicketService.ts` | N/A — single owner |
| HTTP validation + response shaping | `server/controllers/ProjectController.ts` | N/A — single owner |
| Project list filtering | `src/components/ProjectSelector/ProjectBrowserPanel.tsx` | N/A — single owner |

## Constraint Coverage

| Constraint ID | Tasks |
|---|---|
| C1 (backend fetch required) | Task 3, Task 5, Task 6 |
| C2 (300ms debounce) | Task 5, Task 6 |
| C3 (result limits 5/15) | Task 2, Task 3 |
| C4 (loading skeleton within 50ms) | Task 5, Task 6 |
| C5 (no layout shift) | Task 6, Task 7, Task 8 |
| C6 (integrate with QuickSearch) | Task 6, Task 7, Task 8 |
| C7 (integrate with ProjectBrowserPanel) | Task 1 |
| C8 (follow MODALS.md patterns) | Task 6, Task 7, Task 8 |
| C9 (5-min cache TTL) | Task 5 |

## Milestones

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint |
|---|---|---|---|
| M0: Walking Skeleton | — | Task 0 | Builds, stubs render, tests import without errors |
| M1: Project Browser Search | BR-1.1–BR-1.6 | Task 1 | `project_browser_search_filters`, `project_browser_search_empty`, `project_browser_escape_closes` GREEN |
| M2: Search Contract + Backend | — | Task 2, Task 3 | `TEST-search-schema-validation` GREEN, `TEST-api-search-endpoint` GREEN |
| M3: Query Detection + Cross-Project Hook | — | Task 4, Task 5 | `TEST-query-mode-detection` GREEN, `TEST-crossproject-hook-async` GREEN |
| M4: Ticket Key + Current Project + Mode Indicators | BR-2.1–BR-2.7, BR-4.1–BR-4.2, BR-5.1–BR-5.2 | Task 6 | `cross_project_key_search_loads`, `cross_project_key_not_found`, `cross_project_network_error`, `current_project_search_preserved`, `mode_indicator_changes` GREEN |
| M5: Project-Scoped + Keyboard Navigation | BR-3.1–BR-3.5, BR-6.1–BR-6.3 | Task 7, Task 8 | `project_scoped_search_valid`, `project_scoped_invalid_code`, `keyboard_navigation_arrows`, `keyboard_tab_sections` GREEN |

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|---|---|---|---|---|
| domain-contracts/src/ticket/ | 1 | 1 | 0 | ✅ |
| server/routes/ | 1 | 1 | 0 | ✅ |
| server/controllers/ | 1 | 1 | 0 | ✅ |
| server/services/ | 1 | 1 | 0 | ✅ |
| shared/services/ | 1 | 1 | 0 | ✅ |
| src/services/ | 1 | 1 | 0 | ✅ |
| src/hooks/ | 2 | 2 | 0 | ✅ |
| src/components/QuickSearch/ | 3 | 3 | 0 | ✅ |
| src/components/ProjectSelector/ | 1 | 1 | 0 | ✅ |

All doc artifacts (specs, mockups) exist on disk — no task creation needed.

## Tasks

### Task 0: Create Missing Infrastructure Stubs + Verify Builds (M0)

**Structure**: `domain-contracts/src/ticket/search.ts`, `src/hooks/useCrossProjectSearch.ts`

**Makes GREEN (Automated Tests)**: *(none — infrastructure prep)*

**Scope**: Create minimal stub files so that existing RED test files can import without errors. Verify that the shared build pipeline compiles and unit test runners can discover (and fail) the RED tests.

**Boundary**: Stubs only — no real logic, no real types beyond what tests import. Task 2 and Task 5 will replace stubs with full implementations.

**Creates**:
- `domain-contracts/src/ticket/search.ts` (stub exports: SearchMode, SearchRequestSchema, SearchResponseSchema, SearchErrorCode)
- `src/hooks/useCrossProjectSearch.ts` (stub exports: createSearchDebouncer, createSearchCache, createSearchState, createRequestDeduper)

**Modifies**:
- (none — purely additive)

**Must Not Touch**:
- Any existing runtime logic in useQuickSearch, dataLayer, controllers, or services
- Any test files

**Exclude**: Real implementation, real Zod schemas, real React hooks

**Anti-duplication**: Import types from `domain-contracts` — do NOT inline schema definitions

**Duplication Guard**:
- Check that no other file already exports SearchMode or SearchRequestSchema
- Verify useCrossProjectSearch.ts does not exist before creating

**Verify**:

```bash
bun run build:shared
bun run --cwd domain-contracts build
bun run --cwd domain-contracts jest --passWithNoTests 2>&1 | head -5
npx jest src/hooks/useCrossProjectSearch.test.ts --no-coverage 2>&1 | head -10
```

**Done when**:
- [x] `domain-contracts/src/ticket/search.ts` exists and exports stubs
- [x] `src/hooks/useCrossProjectSearch.ts` exists and exports stubs
- [x] `bun run build:shared` exits without error
- [x] `bun run --cwd domain-contracts build` exits without error
- [x] RED test files can import the stubs (tests fail, not crash on import)

---

### Task 1: ProjectBrowserPanel Client-Side Search (M1)

**Structure**: `src/components/ProjectSelector/ProjectBrowserPanel.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-project-browser-search` → `tests/e2e/selector/project-browser.spec.ts`: all project browser search tests

**Makes GREEN (Behavior)**:
- `project_browser_search_filters` → `tests/e2e/selector/project-browser.spec.ts` (BR-1.1, BR-1.2, BR-1.3)
- `project_browser_search_empty` → `tests/e2e/selector/project-browser.spec.ts` (BR-1.2, BR-1.4)
- `project_browser_escape_closes` → `tests/e2e/selector/project-browser.spec.ts` (BR-1.5, BR-1.6)

**Enables (BDD)**: *(none — this milestone is self-contained)*

**Scope**: Add search input with autofocus, case-insensitive filtering by project code OR name, current-project exclusion when query matches, empty state message, and Escape key to close panel. All filtering is client-side — no backend calls allowed.

**Boundary**: Only ProjectBrowserPanel's search behavior. Does not touch the project selector rail or project switching logic.

**Creates**:
- (none — modifies existing component)

**Modifies**:
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx`

**Must Not Touch**:
- `src/hooks/useQuickSearch.ts` (query classification belongs there, not here)
- Any backend routes or services
- `src/services/dataLayer.ts`

**Exclude**: Backend fetch, debounce, loading states — this is purely client-side filtering against preloaded project list

**Anti-duplication**: Import `Project` type from shared models — do NOT redefine project shape

**Duplication Guard**:
- Check ProjectBrowserPanel for existing search/filter logic before coding
- If filtering logic exists elsewhere (e.g., a utility), import it rather than reimplementing

**Verify**:

```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/selector/project-browser.spec.ts --project=chromium
```

**Done when**:
- [x] E2E tests GREEN (were RED)
- [x] Search input visible with autofocus on panel open
- [x] Filtering by code and name (case-insensitive) works
- [x] Current project excluded when query matches
- [x] Empty state shows "No projects match your search"
- [x] Escape closes panel
- [x] No network requests during filtering (C1)

---

### Task 2: Search Contract Schemas (M2)

**Structure**: `domain-contracts/src/ticket/search.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-search-schema-validation` → `domain-contracts/src/ticket/__tests__/search.test.ts`: SearchMode enum, request/response schema validation, error codes, result-limit boundaries

**Scope**: Implement the full search contract module with Zod schemas for request/response, SearchMode enum (ticket_key, project_scope), SearchErrorCode enum, and enforce limitPerProject ≤ 5 and limitTotal ≤ 15 at the schema level.

**Boundary**: Only the contract module — no HTTP, no React, no service logic. Follow domain-contracts AGENTS.md conventions (schema first, then type export, pure contracts only).

**Creates**:
- (none — replaces Task 0 stub in existing file)

**Modifies**:
- `domain-contracts/src/ticket/search.ts` (replace stubs with full Zod schemas and enum definitions)

**Must Not Touch**:
- Any controller, service, hook, or component files
- Any test files

**Exclude**: Service logic, fetch implementations, React hooks

**Anti-duplication**: Follow domain-contracts AGENTS.md module conventions (entity.ts / schema.ts / validation.ts pattern). Import Zod from existing domain-contracts setup — do NOT add Zod as a new dependency.

**Duplication Guard**:
- Check domain-contracts/src/ticket/ for existing search-related schemas
- Verify no other module already defines SearchMode or SearchRequest

**Verify**:

```bash
bun run --cwd domain-contracts jest
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] SearchMode enum has exactly ticket_key and project_scope
- [x] SearchRequestSchema validates modes, requires query, enforces limits
- [x] SearchResponseSchema validates results array + total count
- [x] SearchErrorCode enum has PROJECT_NOT_FOUND, TICKET_NOT_FOUND, VALIDATION_ERROR
- [x] limitPerProject > 5 and limitTotal > 15 are rejected

---

### Task 3: POST /api/projects/search Backend Endpoint (M2)

**Structure**: `server/routes/projects.ts`, `server/controllers/ProjectController.ts`, `server/services/TicketService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-api-search-endpoint` → `server/tests/api/projects.search.test.ts`: ticket_key mode, project_scope mode, request validation, result limits, response shape, project resolution, error handling

**Scope**: Implement the search endpoint: register route, add controller handler with request validation using domain-contracts schemas, implement cross-project ticket lookup in server TicketService. For ticket_key mode, resolve project from CODE in query then look up ticket. For project_scope mode, validate project code exists then search within it. Enforce server-side result limits even if client sends larger values.

**Boundary**: Backend HTTP layer only. The controller validates and shapes responses; TicketService orchestrates; shared TicketService provides per-project read primitives if needed.

**Creates**:
- (none — modifies existing files)

**Modifies**:
- `server/routes/projects.ts` (register POST /api/projects/search)
- `server/controllers/ProjectController.ts` (add search handler)
- `server/services/TicketService.ts` (add cross-project search orchestration method)
- `shared/services/TicketService.ts` (add per-project ticket search primitive if not already present)

**Must Not Touch**:
- Frontend files (hooks, components, services/dataLayer.ts)
- Test files

**Exclude**: Frontend integration, caching, debounce — those are client concerns

**Anti-duplication**: Import SearchRequestSchema and SearchResponseSchema from `domain-contracts/src/ticket/search` — do NOT redeclare request/response shapes in the controller. Reuse existing project resolution logic in TicketService rather than duplicating file-system reads.

**Duplication Guard**:
- Check server/services/TicketService.ts for existing ticket lookup methods
- Check shared/services/TicketService.ts for reusable search primitives
- If shared already has a `searchTickets` or `findTicket` method, call it instead of reimplementing

**Verify**:

```bash
npx jest server/tests/api/projects.search.test.ts --no-coverage
```

**Done when**:
- [x] Integration tests GREEN (were RED)
- [x] POST /api/projects/search returns 200 with results for valid ticket_key
- [x] POST /api/projects/search returns 200 with empty results for non-existent ticket
- [x] POST /api/projects/search returns 404 for invalid project code (project_scope)
- [x] Request validation rejects missing mode, missing query, invalid mode
- [x] limitPerProject > 5 and limitTotal > 15 rejected (400)
- [x] Results include ticket.code, ticket.title, project.code, project.name
- [x] Server-side limits enforced even if client sends higher values

---

### Task 4: Query Mode Detection in useQuickSearch (M3)

**Structure**: `src/hooks/useQuickSearch.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-query-mode-detection` → `src/hooks/useQuickSearch.test.ts`: parseQueryMode for ticket_key, @syntax, current_project; parseQueryParts extraction; Edge-5 and Edge-6 exclusivity

**Scope**: Add `parseQueryMode(query: string)` and `parseQueryParts(query: string)` pure functions to useQuickSearch. parseQueryMode classifies input as 'current_project' (plain text), 'ticket_key' (CODE-NUMBER with 2-5 uppercase letters, 1-5 digits), or 'project_scope' (@CODE followed by space and search text). parseQueryParts extracts structured fields (projectCode, searchText, ticketCode) from the parsed mode.

**Boundary**: Only query classification and parsing — no async logic, no fetch calls, no state management. These are pure functions exported for unit testing.

**Creates**:
- (none — extends existing hook module)

**Modifies**:
- `src/hooks/useQuickSearch.ts` (add parseQueryMode and parseQueryParts exports)

**Must Not Touch**:
- `src/hooks/useCrossProjectSearch.ts` (async state management)
- `src/services/dataLayer.ts` (HTTP transport)
- Any component files
- Any test files

**Exclude**: Async search execution, React state, debouncing, caching

**Anti-duplication**: The ticket key regex pattern must be defined once in useQuickSearch — do NOT duplicate it in components or other hooks.

**Duplication Guard**:
- Check useQuickSearch for existing mode detection logic
- Verify no other file already classifies queries into ticket_key / project_scope / current_project

**Verify**:

```bash
npx jest src/hooks/useQuickSearch.test.ts --no-coverage
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] `parseQueryMode('ABC-42')` returns 'ticket_key'
- [x] `parseQueryMode('@ABC login')` returns 'project_scope'
- [x] `parseQueryMode('badge fix')` returns 'current_project'
- [x] `parseQueryMode('@ABC')` returns 'current_project' (no space + text)
- [x] Lowercase codes rejected as ticket_key
- [x] Codes < 2 or > 5 letters rejected
- [x] Numbers > 5 digits rejected
- [x] Edge-5: own-project ticket key still returns 'ticket_key'
- [x] Edge-6: @current-project returns 'project_scope'
- [x] `parseQueryParts` extracts projectCode, searchText, ticketCode correctly

---

### Task 5: useCrossProjectSearch Hook + DataLayer (M3)

**Structure**: `src/hooks/useCrossProjectSearch.ts`, `src/services/dataLayer.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-crossproject-hook-async` → `src/hooks/useCrossProjectSearch.test.ts`: debounce timing (C2), cache TTL (C9), loading state (C4), request deduplication, retry (Edge-4)

**Scope**: Implement the useCrossProjectSearch hook with extracted pure utility functions (createSearchDebouncer, createSearchCache, createSearchState, createRequestDeduper) plus the React hook itself. Add `searchProjects` method to dataLayer that POSTs to /api/projects/search with request dedupe via existing dedupe infrastructure.

**Boundary**: useCrossProjectSearch owns async search state management. It must NOT decide query mode — it consumes a parsed search request from useQuickSearch. dataLayer owns HTTP details and returns normalized typed data.

**Creates**:
- (none — replaces Task 0 stub in existing file)

**Modifies**:
- `src/hooks/useCrossProjectSearch.ts` (replace stubs with full debounce/cache/dedupe/retry implementation)
- `src/services/dataLayer.ts` (add searchProjects method)

**Must Not Touch**:
- `src/hooks/useQuickSearch.ts` (query classification — Task 4 owns this)
- Any component files
- Any test files

**Exclude**: Query mode detection, UI rendering, mode indicators

**Anti-duplication**: Use dataLayer's existing `dedupe` method for request deduplication — do NOT implement a separate dedupe mechanism in the hook. Import SearchRequest/SearchResponse types from `domain-contracts/src/ticket/search`.

**Duplication Guard**:
- Check dataLayer for existing search-related methods
- Verify the hook does not duplicate dataLayer's dedupe logic
- Check that debounce timing constant (300ms) is defined in one place only

**Verify**:

```bash
npx jest src/hooks/useCrossProjectSearch.test.ts --no-coverage
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] Debounce not triggered before 300ms, triggered after 300ms
- [x] Rapid keystrokes reset debounce timer
- [x] Cache returns cached results within 5-minute TTL
- [x] Cache expires after TTL
- [x] Cache key includes mode, projectCode, and query
- [x] Loading state set immediately on search start
- [x] Error state set on fetch failure, cleared on retry
- [x] Request deduplication prevents duplicate in-flight calls
- [x] dataLayer.searchProjects POSTs to /api/projects/search

---

### Task 6: QuickSearch Ticket Key + Current Project + Mode Indicators (M4)

**Structure**: `src/components/QuickSearch/QuickSearchModal.tsx`, `src/components/QuickSearch/QuickSearchResults.tsx`, `src/components/QuickSearch/QuickSearchInput.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-quicksearch-crossproject` → `tests/e2e/quick-search/modal.spec.ts`: ticket key lookup, loading/error/empty states, current project mode, mode indicators

**Makes GREEN (Behavior)**:
- `cross_project_key_search_loads` → `tests/e2e/quick-search/modal.spec.ts` (BR-2.1, BR-2.2, BR-2.3, BR-2.4)
- `cross_project_key_not_found` → `tests/e2e/quick-search/modal.spec.ts` (BR-2.7)
- `cross_project_network_error` → `tests/e2e/quick-search/modal.spec.ts` (BR-2.5, BR-2.6)
- `current_project_search_preserved` → `tests/e2e/quick-search/modal.spec.ts` (BR-4.1, BR-4.2)
- `mode_indicator_changes` → `tests/e2e/quick-search/modal.spec.ts` (BR-5.1, BR-5.2)

**Enables (BDD)**:
- `project_scoped_search_valid` (BR-3.1–BR-3.5) — needs Task 7 to complete
- `keyboard_navigation_arrows` (BR-6.1, BR-6.3) — needs Task 8 to complete
- `keyboard_tab_sections` (BR-6.2) — needs Task 8 to complete

**Scope**: Wire the QuickSearch modal to support three search modes: (1) current project (existing MDT-136 behavior), (2) ticket-key cross-project lookup with loading spinner + skeleton cards + error/retry states, (3) current project mode with "In: {CODE}" indicator. Add mode indicator display to QuickSearchInput. Add cross-project results section with project context labels to QuickSearchResults. Integrate useCrossProjectSearch and parseQueryMode into QuickSearchModal.

**Boundary**: QuickSearch components only. Must preserve existing modal overlay behavior (Escape close, backdrop click, Cmd+K open). Loading skeletons render only after async fetch start (not during debounce wait).

**Creates**:
- (none — modifies existing components)

**Modifies**:
- `src/components/QuickSearch/QuickSearchModal.tsx` (integrate useCrossProjectSearch, parseQueryMode, cross-project state)
- `src/components/QuickSearch/QuickSearchResults.tsx` (add cross-project results section, loading skeletons, error/retry states, project context labels)
- `src/components/QuickSearch/QuickSearchInput.tsx` (add mode indicator display)

**Must Not Touch**:
- `src/hooks/useQuickSearch.ts` (Task 4 owns query parsing)
- `src/hooks/useCrossProjectSearch.ts` (Task 5 owns async state)
- `src/services/dataLayer.ts` (Task 5 owns HTTP)
- Backend files
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx`

**Exclude**: @syntax project-scoped rendering (Task 7), multi-section keyboard navigation (Task 8)

**Anti-duplication**: Import parseQueryMode from useQuickSearch, useCrossProjectSearch from its module, dataLayer.searchProjects from dataLayer — do NOT inline any of this logic in components.

**Duplication Guard**:
- Check QuickSearchModal for existing cross-project logic
- Verify mode indicator rendering is in QuickSearchInput only (not duplicated in modal or results)
- Check that loading skeleton component is defined once and reused

**Verify**:

```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/quick-search/modal.spec.ts --project=chromium --grep "ticket key|Ticket Key|not found|network error|current project|mode indicator|In:|Searching:|Edge-5|Edge-6|Edge-3"
```

**Done when**:
- [x] BDD scenarios GREEN (were RED)
- [x] Ticket key pattern triggers cross-project fetch with loading spinner
- [x] Loading skeleton renders within 50ms of fetch start (C4)
- [x] No layout shift when results load (C5)
- [x] Results show project context (code + name)
- [x] "Ticket {CODE}-{NUMBER} not found" shown for non-existent key
- [x] Network error shows retry button
- [x] Current project search preserves MDT-136 behavior
- [x] Mode indicator shows "In: {CODE}" for current project
- [x] Mode indicator shows "Searching: {CODE}-{NUMBER}" during ticket-key fetch
- [x] Edge-5: own-project ticket key shows in current section
- [x] Edge-3: empty cross-project results show appropriate empty state

---

### Task 7: QuickSearch Project-Scoped Search (M5)

**Structure**: `src/components/QuickSearch/QuickSearchResults.tsx`, `src/components/QuickSearch/QuickSearchModal.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-quicksearch-crossproject` → `tests/e2e/quick-search/modal.spec.ts`: @syntax tests

**Makes GREEN (Behavior)**:
- `project_scoped_search_valid` → `tests/e2e/quick-search/modal.spec.ts` (BR-3.1, BR-3.2, BR-3.4, BR-3.5)
- `project_scoped_invalid_code` → `tests/e2e/quick-search/modal.spec.ts` (BR-3.2, BR-3.3)

**Scope**: Wire @CODE-space-text syntax in QuickSearch. When parseQueryMode returns 'project_scope', validate the project code exists (show "Project {CODE} not found" if not), then trigger cross-project search scoped to that project. Display results only from the specified project. Mode indicator shows "In: {CODE}" for the target project.

**Boundary**: Only the @syntax rendering path in QuickSearch components. The parser (Task 4), hook (Task 5), and backend (Task 3) are already implemented.

**Creates**:
- (none — modifies existing components)

**Modifies**:
- `src/components/QuickSearch/QuickSearchResults.tsx` (add project-scoped results rendering, invalid-project-code state)
- `src/components/QuickSearch/QuickSearchModal.tsx` (wire project_scope mode through to hook and results)

**Must Not Touch**:
- `src/hooks/useQuickSearch.ts` (parser already done)
- `src/hooks/useCrossProjectSearch.ts` (hook already done)
- Backend files
- `src/components/QuickSearch/QuickSearchInput.tsx` (mode indicator already done)

**Exclude**: Keyboard navigation changes (Task 8), new search modes

**Anti-duplication**: Reuse the same cross-project results section from Task 6 — add project-scoped rendering as a variant, not a duplicate section.

**Duplication Guard**:
- Check QuickSearchResults for existing project-scoped rendering
- Verify "Project not found" state is not duplicated across components

**Verify**:

```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/quick-search/modal.spec.ts --project=chromium --grep "project.scoped|@|Project not found|Edge-6"
```

**Done when**:
- [x] BDD scenarios GREEN (were RED)
- [x] @CODE search text triggers project-scoped search
- [x] "Project {CODE} not found" shown for invalid code without triggering fetch
- [x] Results only from specified project
- [x] Mode indicator shows "In: {CODE}" for target project
- [x] Edge-6: @current-project while in current project shows results without exclusion

---

### Task 8: Keyboard Navigation Across Sections (M5)

**Structure**: `src/components/QuickSearch/QuickSearchModal.tsx`, `src/components/QuickSearch/QuickSearchResults.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-quicksearch-crossproject` → `tests/e2e/quick-search/modal.spec.ts`: keyboard navigation tests

**Makes GREEN (Behavior)**:
- `keyboard_navigation_arrows` → `tests/e2e/quick-search/modal.spec.ts` (BR-6.1, BR-6.3)
- `keyboard_tab_sections` → `tests/e2e/quick-search/modal.spec.ts` (BR-6.2)

**Scope**: Extend keyboard navigation to work across merged current-project and cross-project result sections. Arrow keys navigate through all results across sections. Tab cycles focus between sections. Enter opens the selected ticket (current project) or switches to the project (cross-project). Must preserve existing Escape-to-close and single-section arrow behavior from MDT-136.

**Boundary**: Only keyboard event handling in QuickSearch modal and results. Does not change how results are fetched or rendered — only how keyboard events navigate them.

**Creates**:
- (none — modifies existing components)

**Modifies**:
- `src/components/QuickSearch/QuickSearchModal.tsx` (extend handleKeyDown for multi-section navigation)
- `src/components/QuickSearch/QuickSearchResults.tsx` (support section-aware selected index, aria attributes for sections)

**Must Not Touch**:
- `src/hooks/useQuickSearch.ts` (selectedIndex model may need extending, but core filter logic is Task 4's)
- `src/hooks/useCrossProjectSearch.ts`
- Backend files

**Exclude**: New search modes, new visual elements

**Anti-duplication**: Extend existing handleKeyDown in QuickSearchModal — do NOT create a parallel keyboard handler. Reuse existing selectedIndex pattern from useQuickSearch.

**Duplication Guard**:
- Check QuickSearchModal for existing keyboard navigation logic
- Verify no separate keyboard handler is created in QuickSearchResults

**Verify**:

```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/quick-search/modal.spec.ts --project=chromium --grep "keyboard|arrow|Tab|Enter|BR-6"
```

**Done when**:
- [x] BDD scenarios GREEN (were RED)
- [x] Arrow keys navigate across current-project and cross-project sections
- [x] Tab cycles between result sections
- [x] Enter on selected result opens ticket or switches project
- [x] Escape still closes modal
- [x] No layout shift during navigation (C5)
- [x] Existing MDT-136 single-section keyboard behavior preserved

## Post-Implementation

- [ ] No duplication (grep check)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Smoke test passes (feature works with real execution)
- [ ] Fallback/absence paths match requirements
