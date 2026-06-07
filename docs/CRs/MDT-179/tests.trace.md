# Test Plan

## Test Plans By Kind

### unit

#### TEST-keyboard-navigation

Keyboard navigation across N grouped sections

- Covers: [BR-5.1](requirements.trace.md#br-51), [BR-5.2](requirements.trace.md#br-52), [BR-5.3](requirements.trace.md#br-53), [C3](requirements.trace.md#c3)
- File: `src/components/QuickSearch/__tests__/QuickSearchModal.keyboard.test.tsx`

#### TEST-project-search-hook

useProjectSearch hook tests - client-side project matching

- Covers: [BR-3.1](requirements.trace.md#br-31), [BR-3.2](requirements.trace.md#br-32), [BR-6.4](requirements.trace.md#br-64)
- File: `src/hooks/__tests__/useProjectSearch.test.ts`

#### TEST-query-mode-extended

Extended query mode parsing with scope-aware classification

- Covers: [BR-3.3](requirements.trace.md#br-33), [BR-3.4](requirements.trace.md#br-34), [BR-4.1](requirements.trace.md#br-41), [BR-4.2](requirements.trace.md#br-42), [BR-4.3](requirements.trace.md#br-43)
- File: `src/hooks/useQuickSearch.test.ts`

#### TEST-quick-search-results-grouped

QuickSearchResults grouped rendering tests

- Covers: [BR-2.1](requirements.trace.md#br-21), [BR-2.2](requirements.trace.md#br-22), [BR-6.1](requirements.trace.md#br-61), [BR-6.3](requirements.trace.md#br-63)
- File: `src/components/QuickSearch/__tests__/QuickSearchResults.test.tsx`

#### TEST-scope-bar

SearchScopeBar component tests

- Covers: [BR-1.2](requirements.trace.md#br-12), [BR-1.3](requirements.trace.md#br-13), [C1](requirements.trace.md#c1), [C2](requirements.trace.md#c2)
- File: `src/components/QuickSearch/__tests__/SearchScopeBar.test.tsx`

#### TEST-search-schema

Unified search request/response schema validation

- Covers: [BR-2.1](requirements.trace.md#br-21), [BR-2.2](requirements.trace.md#br-22), [C5](requirements.trace.md#c5), [C6](requirements.trace.md#c6)
- File: `domain-contracts/src/search/__tests__/search.test.ts`

#### TEST-search-scope-hook

useSearchScope hook tests

- Covers: [BR-1.1](requirements.trace.md#br-11), [BR-1.2](requirements.trace.md#br-12), [BR-1.3](requirements.trace.md#br-13), [BR-1.4](requirements.trace.md#br-14), [BR-4.4](requirements.trace.md#br-44)
- File: `src/hooks/__tests__/useSearchScope.test.ts`


### integration

#### TEST-unified-search-endpoint

Unified search API endpoint integration tests

- Covers: [BR-4.1](requirements.trace.md#br-41), [BR-4.2](requirements.trace.md#br-42), [BR-4.3](requirements.trace.md#br-43), [BR-6.2](requirements.trace.md#br-62), [C4](requirements.trace.md#c4), [C5](requirements.trace.md#c5)
- File: `server/tests/api/search.test.ts`


### e2e

#### TEST-e2e-scoped-search

E2E: Scoped global search scenarios

- Covers: [BR-1.1](requirements.trace.md#br-11), [BR-1.2](requirements.trace.md#br-12), [BR-1.3](requirements.trace.md#br-13), [BR-2.1](requirements.trace.md#br-21), [BR-2.2](requirements.trace.md#br-22), [BR-2.3](requirements.trace.md#br-23), [BR-2.4](requirements.trace.md#br-24), [BR-3.1](requirements.trace.md#br-31), [BR-3.2](requirements.trace.md#br-32), [BR-3.3](requirements.trace.md#br-33), [BR-5.1](requirements.trace.md#br-51), [BR-5.2](requirements.trace.md#br-52), [BR-5.3](requirements.trace.md#br-53), [BR-6.1](requirements.trace.md#br-61), [BR-6.3](requirements.trace.md#br-63)
- File: `tests/e2e/scoped-search.spec.ts`


## Requirement Coverage Summary

| Requirement ID | Route Policy | Direct Test Plans | Indirect Test Plans |
|---|---|---|---|
| [BR-6.2](requirements.trace.md#br-62) | tests | [TEST-unified-search-endpoint](#test-unified-search-endpoint) | - |
| [C1](requirements.trace.md#c1) | tests | [TEST-scope-bar](#test-scope-bar) | - |
| [C2](requirements.trace.md#c2) | tests | [TEST-scope-bar](#test-scope-bar) | - |
| [C3](requirements.trace.md#c3) | tests | [TEST-keyboard-navigation](#test-keyboard-navigation) | - |
| [C4](requirements.trace.md#c4) | tests | [TEST-unified-search-endpoint](#test-unified-search-endpoint) | - |
| [C5](requirements.trace.md#c5) | tests | [TEST-search-schema](#test-search-schema), [TEST-unified-search-endpoint](#test-unified-search-endpoint) | - |
| [C6](requirements.trace.md#c6) | tests | [TEST-search-schema](#test-search-schema) | - |
