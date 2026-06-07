# Tests: MDT-179

**Source**: [MDT-179](../MDT-179-scoped-global-search.md)
**Generated**: 2026-06-05

## Overview

Tests verify the scoped global search feature across unit, integration, and E2E layers. Unit tests cover search hooks, scope state, project matching, and UI components. Integration tests cover the unified search API endpoint. E2E tests cover the full user journey via Playwright.

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | SearchScopeBar.test.tsx | No layout jump on scope change |
| C2 | SearchScopeBar.test.tsx | Tab strip readable at 320px and 1920px viewport |
| C3 | QuickSearchModal.keyboard.test.tsx | Focus remains inside modal during keyboard nav |
| C4 | server/tests/api/search.test.ts | Access-controlled sessions filtered from results |
| C5 | server/tests/api/search.test.ts | Existing /api/projects/search endpoint unchanged |
| C6 | search.test.ts | Schema extensible without modifying existing types |

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| domain-contracts/search/schema | search.test.ts | Schema validation, discriminated union parsing |
| useSearchScope | useSearchScope.test.ts | Scope init, switch, keyboard shortcut |
| useProjectSearch | useProjectSearch.test.ts | Word-prefix matching, code prefix, empty query |
| useQuickSearch (extended) | useQuickSearch.test.ts | New QueryMode values, scope-aware classification |
| QuickSearchResults | QuickSearchResults.test.tsx | N-group rendering, entity type distinction, empty state |
| SearchScopeBar | SearchScopeBar.test.tsx | Tab rendering, click/keyboard selection, layout stability |
| QuickSearchModal (keyboard) | QuickSearchModal.keyboard.test.tsx | ArrowDown/Up across all sections, Tab cycles scope, Shift+Tab reverses, Enter activates |
| SearchController | server/tests/api/search.test.ts | Endpoint routing, scope filtering, access control |
| E2E scoped search | tests/e2e/scoped-search.spec.ts | Full user journeys from BDD scenarios |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Word-prefix matching | useProjectSearch | Single word, multi-word ("task ma"), case-insensitive, no match |
| Code prefix matching | useProjectSearch | Full code, partial prefix, case-insensitive, no match |
| Scope state transition | useSearchScope | Global→Projects, Projects→Tickets, keyboard shortcut |
| Result group limit | QuickSearchResults | Max items per group, overflow behavior |

## Verify

```bash
# Unit tests
bun test src/hooks/__tests__/useSearchScope.test.ts
bun test src/hooks/__tests__/useProjectSearch.test.ts
bun test src/hooks/useQuickSearch.test.ts
bun test src/components/QuickSearch/__tests__/

# Integration tests
bun run --cwd server jest -- tests/api/search.test.ts

# E2E tests
bun run test:e2e -- --grep "scoped global search"
```

---
*Rendered by mdt:tests via spec-trace*
