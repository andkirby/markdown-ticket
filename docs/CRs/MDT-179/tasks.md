# Tasks: MDT-179

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **domain-contracts/src/search/**: New module — search scope enums, request/response schemas. Must not modify existing `domain-contracts/src/ticket/search.ts`.
- **QuickSearch components**: Bounded redesign of modal, input, results. Must preserve existing ticket-key and project-scope behavior.
- **Server search endpoint**: New route/controller at `/api/search`. Must not modify existing `POST /api/projects/search`.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Scope state management | `src/hooks/useSearchScope.ts` | N/A — new module |
| Project matching logic | `src/hooks/useProjectSearch.ts` | N/A — new module |
| Query mode classification | `src/hooks/useQuickSearch.ts` | N/A — extending existing |
| N-section keyboard nav | `src/components/QuickSearch/QuickSearchModal.tsx` | N/A — extending existing |
| Unified search API | `server/controllers/SearchController.ts` | N/A — new module |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 2, Task 5 |
| C2 | Task 2 |
| C3 | Task 5 |
| C4 | Task 6 |
| C5 | Task 1, Task 6 |
| C6 | Task 1 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|--------------|-------|------------|
| M0: Walking Skeleton | — | Task 1 | Builds, schemas validate |
| M1: Scope Model | scope_controls_visible, scope_switch_via_click, scope_switch_via_keyboard, shortcut_cycles_scopes | Task 2 | Scope scenarios GREEN |
| M2: Project Matching & Query | partial_project_name_matching, ticket_key_priority, project_scope_ticket_search, project_scope_returns_tickets, scoped_search_filters_entity_type | Task 3 | Query/matching scenarios GREEN |
| M3: Grouped Results | global_search_grouped_results, ambiguous_query_separate_groups, empty_state_shows_active_scope | Task 4 | Grouped rendering scenarios GREEN |
| M4: Keyboard Integration | keyboard_navigation_grouped, enter_activates_result, select_project_navigates, select_ticket_or_document, select_document_navigates | Task 5 | Navigation scenarios GREEN |
| M5: Backend Endpoint | — | Task 6 | API integration tests GREEN |

## Tasks

### Task 1: Walking Skeleton — Search Types, Schemas, and Tests (M0)

**Skills**: mdt-frontend

**Milestone**: M0 — Walking Skeleton

**Structure**: `domain-contracts/src/search/`

**Makes GREEN (Automated Tests)**:
- `TEST-search-schema` → `domain-contracts/src/search/__tests__/search.test.ts`: Schema validation tests

**Scope**: Create the new search module in domain-contracts with SearchScope enum, SearchResultType enum, UnifiedSearchRequest and UnifiedSearchResponse schemas.
**Boundary**: Types and schemas only. No hooks, no components, no server code.

**Creates**:
- `domain-contracts/src/search/types.ts` — SearchScope, SearchResultType enums
- `domain-contracts/src/search/schema.ts` — UnifiedSearchRequest, UnifiedSearchResponse Zod schemas
- `domain-contracts/src/search/index.ts` — Barrel export
- `domain-contracts/src/search/__tests__/search.test.ts` — Schema validation tests

**Modifies**:
- `domain-contracts/src/index.ts` — Add search module export

**Must Not Touch**:
- `domain-contracts/src/ticket/search.ts` — Existing search contracts remain unchanged (C5)
- Any frontend or server files

**Anti-duplication**: Import existing `SearchMode` from `domain-contracts/src/ticket/search.ts` if needed for backward compat — do NOT copy.

**Duplication Guard**:
- Check that `SearchScope` is the ONLY scope enum — no duplicate in ticket/search.ts
- Verify `UnifiedSearchResponse` is the only multi-entity response type

**Verify**:
```bash
bun test domain-contracts/src/search/__tests__/search.test.ts
```

**Done when**:
- [x] Schema tests GREEN (were RED)
- [x] `bun run build:shared` succeeds
- [x] No duplicated types from existing ticket/search.ts

---

### Task 2: Scope State Hook and Scope Bar Component (M1)

**Skills**: mdt-frontend

**Milestone**: M1 — Scope Model (BR-1.1, BR-1.2, BR-1.3, BR-1.4)

**Structure**: `src/hooks/useSearchScope.ts`, `src/components/QuickSearch/SearchScopeBar.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-search-scope-hook` → `src/hooks/__tests__/useSearchScope.test.ts`: Scope state tests
- `TEST-scope-bar` → `src/components/QuickSearch/__tests__/SearchScopeBar.test.tsx`: Scope bar rendering tests

**Makes GREEN (Behavior)**:
- `scope_controls_visible` (BR-1.1, BR-1.2)
- `scope_switch_via_click` (BR-1.3)
- `scope_switch_via_keyboard` (BR-1.4)

**Scope**: Create the useSearchScope hook for scope state management and the SearchScopeBar component for scope tab rendering.
**Boundary**: Hook + component only. Do not wire into QuickSearchModal yet (Task 5).

**Creates**:
- `src/hooks/useSearchScope.ts` — SearchScope state, switch function, keyboard handler
- `src/hooks/__tests__/useSearchScope.test.ts` — Scope state tests
- `src/components/QuickSearch/SearchScopeBar.tsx` — Scope tab strip
- `src/components/QuickSearch/__tests__/SearchScopeBar.test.tsx` — Scope bar tests

**Modifies**: None (standalone new files)

**Must Not Touch**:
- `src/components/QuickSearch/QuickSearchModal.tsx` — Integration in Task 5
- `src/components/QuickSearch/QuickSearchInput.tsx` — Integration in Task 5
- `src/hooks/useQuickSearch.ts` — Extended in Task 3

**Anti-duplication**: Import `SearchScope` from `@mdt/domain-contracts` — do NOT define a local scope enum.

**Duplication Guard**:
- Verify SearchScope enum is imported from domain-contracts, not re-declared
- Check that no other hook manages scope state

**Verify**:
```bash
bun test src/hooks/__tests__/useSearchScope.test.ts
bun test src/components/QuickSearch/__tests__/SearchScopeBar.test.tsx
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] Scope bar renders tabs for Global, Tickets, Projects, Documents
- [x] No layout jumps on scope change (C1)
- [x] No duplicated scope enum

---

### Task 3: Client-Side Project Matching and Extended Query Mode (M2)

**Skills**: mdt-frontend

**Milestone**: M2 — Project Matching & Query (BR-3.1, BR-3.2, BR-3.3, BR-3.4, BR-4.1–BR-4.4)

**Structure**: `src/hooks/useProjectSearch.ts`, `src/hooks/useQuickSearch.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-project-search-hook` → `src/hooks/__tests__/useProjectSearch.test.ts`: Project matching tests
- `TEST-query-mode-extended` → `src/hooks/useQuickSearch.test.ts`: Extended query mode tests

**Makes GREEN (Behavior)**:
- `partial_project_name_matching` (BR-3.1, BR-3.2)
- `ticket_key_priority` (BR-3.3)
- `project_scope_ticket_search` (BR-3.4, BR-6.4)
- `project_scope_returns_tickets` (BR-3.4)
- `scoped_search_filters_entity_type` (BR-4.1–BR-4.4)

**Scope**: Create useProjectSearch hook for client-side project matching. Extend QueryMode with scope-aware classification in useQuickSearch.
**Boundary**: Hooks only. No component changes.

**Creates**:
- `src/hooks/useProjectSearch.ts` — Client-side project matching with word-prefix scoring
- `src/hooks/__tests__/useProjectSearch.test.ts` — Project matching tests

**Modifies**:
- `src/hooks/useQuickSearch.ts` — Add new QueryMode values, update parseQueryMode to be scope-aware
- `src/hooks/useQuickSearch.test.ts` — Add tests for new query modes

**Must Not Touch**:
- `src/components/QuickSearch/*` — Components integrated in Tasks 4–5
- `src/hooks/useCrossProjectSearch.ts` — Extended in Task 6
- `domain-contracts/src/ticket/search.ts` — Backward compat (C5)

**Anti-duplication**: Import `filterTickets` scoring pattern from `useQuickSearch.ts` as reference — do NOT copy scoring logic into useProjectSearch; implement project-specific scoring from scratch.

**Duplication Guard**:
- Verify `QueryMode` type is defined in only one file (useQuickSearch.ts)
- Check that project matching does not re-implement ticket filtering

**Verify**:
```bash
bun test src/hooks/__tests__/useProjectSearch.test.ts
bun test src/hooks/useQuickSearch.test.ts
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] "task ma" matches project "Task Manager"
- [x] Exact ticket key still prioritizes ticket lookup
- [x] No duplicated scoring logic

---

### Task 4: Grouped Results Rendering with Entity Type Row Components (M3)

**Skills**: mdt-frontend

**Milestone**: M3 — Grouped Results (BR-2.1, BR-2.2, BR-2.3–BR-2.5, BR-6.1, BR-6.3)

**Structure**: `src/components/QuickSearch/QuickSearchResults.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-quick-search-results-grouped` → `src/components/QuickSearch/__tests__/QuickSearchResults.test.tsx`: Grouped rendering tests

**Makes GREEN (Behavior)**:
- `global_search_grouped_results` (BR-2.1, BR-2.2)
- `ambiguous_query_separate_groups` (BR-6.1)
- `empty_state_shows_active_scope` (BR-6.3)

**Enables (BDD)**:
- `select_project_navigates` (BR-2.3) — needs Task 5 for modal wiring
- `select_ticket_or_document` (BR-2.4, BR-2.5) — needs Task 5 for modal wiring

**Scope**: Restructure QuickSearchResults for N labeled groups. Create ProjectResultRow and DocumentResultRow components.
**Boundary**: Results rendering only. Keyboard nav stays in Task 5.

**Creates**:
- `src/components/QuickSearch/ProjectResultRow.tsx` — Project result row
- `src/components/QuickSearch/DocumentResultRow.tsx` — Document result row
- `src/components/QuickSearch/__tests__/QuickSearchResults.test.tsx` — Grouped rendering tests

**Modifies**:
- `src/components/QuickSearch/QuickSearchResults.tsx` — Restructure for N groups
- `src/components/QuickSearch/index.ts` — Export new components

**Must Not Touch**:
- `src/components/QuickSearch/QuickSearchModal.tsx` — Modal integration in Task 5
- `src/hooks/*` — Hook logic already done

**Anti-duplication**: Import `SearchResultType` from `@mdt/domain-contracts` — do NOT re-declare entity type enum.

**Duplication Guard**:
- Each entity type has exactly one result row component
- Verify no ticket rendering logic is duplicated between existing and new code

**Verify**:
```bash
bun test src/components/QuickSearch/__tests__/QuickSearchResults.test.tsx
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] Results render in 3 labeled groups (Projects, Tickets, Documents)
- [x] Entity types have visually distinct styling (BR-2.2)
- [x] Empty states show active scope label (BR-6.3)

---

### Task 5: Keyboard Navigation and Modal Integration (M4)

**Skills**: mdt-frontend

**Milestone**: M4 — Keyboard Integration (BR-5.1–BR-5.3, BR-2.3–BR-2.5)

**Structure**: `src/components/QuickSearch/QuickSearchModal.tsx`, `src/components/QuickSearch/QuickSearchInput.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-keyboard-navigation` → `src/components/QuickSearch/__tests__/QuickSearchModal.keyboard.test.tsx`: Keyboard nav tests
- `TEST-e2e-scoped-search` → `tests/e2e/scoped-search.spec.ts`: Full E2E scenarios

**Makes GREEN (Behavior)**:
- `keyboard_navigation_grouped` (BR-5.1, BR-5.2)
- `enter_activates_result` (BR-5.3)
- `select_project_navigates` (BR-2.3)
- `select_ticket_or_document` (BR-2.4)
- `select_document_navigates` (BR-2.5)
- `project_scope_returns_tickets` (BR-3.4)
- `shortcut_cycles_scopes` (BR-1.4)

**Scope**: Integrate scope hook, scope bar, and grouped results into the modal. Generalize keyboard navigation for N sections. Wire result selection.
**Boundary**: Modal integration layer only. Core logic stays in hooks (Tasks 2–3).

**Creates**:
- `src/components/QuickSearch/__tests__/QuickSearchModal.keyboard.test.tsx` — Keyboard nav tests
- `tests/e2e/scoped-search.spec.ts` — E2E test file

**Modifies**:
- `src/components/QuickSearch/QuickSearchModal.tsx` — Integrate scope, generalize keyboard, wire selection
- `src/components/QuickSearch/QuickSearchInput.tsx` — Add SearchScopeBar integration

**Must Not Touch**:
- `src/hooks/useSearchScope.ts` — Already done
- `src/hooks/useProjectSearch.ts` — Already done
- `src/hooks/useQuickSearch.ts` — Already done
- `domain-contracts/*` — Already done

**Anti-duplication**: Import `useSearchScope` from `src/hooks/useSearchScope.ts` — do NOT create scope state inside the modal.

**Duplication Guard**:
- Keyboard nav logic lives in QuickSearchModal only — no duplicate nav handlers in child components
- Selection logic is centralized in the modal, not distributed to result rows

**Verify**:
```bash
bun test src/components/QuickSearch/__tests__/QuickSearchModal.keyboard.test.tsx
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] Arrow keys navigate across all grouped sections (C3)
- [x] Tab jumps between groups
- [x] Enter activates result and closes modal
- [x] Scope bar wired into modal
- [x] Focus stays inside modal (C3)
- [x] No duplicated nav/selection logic

---

### Task 6: Unified Search Backend Endpoint (M5)

**Milestone**: M5 — Backend Endpoint

**Structure**: `server/controllers/SearchController.ts`, `server/routes/search.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-unified-search-endpoint` → `server/tests/api/search.test.ts`: API integration tests

**Scope**: Create new unified search endpoint at POST /api/search that dispatches across entity types based on scope. Add access control filtering. Extend useCrossProjectSearch to use the new endpoint.
**Boundary**: Server-side search dispatch only. Frontend integration already done.

**Creates**:
- `server/controllers/SearchController.ts` — Unified search handler
- `server/routes/search.ts` — POST /api/search route
- `server/tests/api/search.test.ts` — Integration tests

**Modifies**:
- `src/hooks/useCrossProjectSearch.ts` — Add support for unified endpoint when scoped

**Must Not Touch**:
- `server/routes/projects.ts` — Existing /api/projects/search route untouched (C5)
- `server/controllers/ProjectController.ts` — Existing search logic untouched
- `src/components/QuickSearch/*` — Already done

**Anti-duplication**: Import `UnifiedSearchRequest` from `@mdt/domain-contracts` — do NOT re-declare request schema in server code.

**Duplication Guard**:
- Verify no duplicate search dispatch logic between SearchController and ProjectController
- SearchController delegates to existing services (TicketService, ProjectService) — does not re-implement search

**Verify**:
```bash
bun run --cwd server jest -- tests/api/search.test.ts
```

**Done when**:
- [x] Integration tests GREEN (were RED)
- [x] Access control filters results correctly (C4)
- [x] Existing /api/projects/search still works (C5)
- [x] No duplicated search logic between controllers

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| domain-contracts/search/ | 4 | 4 | 0 | ✅ |
| src/hooks/ | 4 | 4 | 0 | ✅ |
| QuickSearch components | 7 | 7 | 0 | ✅ |
| server/ | 3 | 3 | 0 | ✅ |

## Post-Implementation

- [ ] No duplication (grep check: no second SearchScope enum, no second UnifiedSearchResponse)
- [ ] Scope boundaries respected (existing ticket search unchanged)
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Smoke test: Cmd+K opens search, scope tabs visible, project search works
- [ ] E2E tests pass

## Post-Verify Fixes

_(appended by implement-agentic if needed)_
