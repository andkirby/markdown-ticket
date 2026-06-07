# Architecture

## Obligations

### OBL-access-control

Unified search must filter results by current session access policy, excluding hidden/unavailable projects, tickets, and documents

- Derived From: [BR-6.2](requirements.trace.md#br-62), [C4](requirements.trace.md#c4)
- Artifacts: [ART-search-controller](#art-search-controller), [ART-unified-search-endpoint](#art-unified-search-endpoint)

### OBL-empty-states

No-results states must identify the active scope and not imply other scopes were searched

- Derived From: [BR-6.3](requirements.trace.md#br-63), [BR-6.4](requirements.trace.md#br-64)
- Artifacts: [ART-quick-search-results](#art-quick-search-results)

### OBL-grouped-results

Restructure QuickSearchResults to render N labeled result groups with per-entity-type row components (ProjectResultRow, DocumentResultRow, existing ticket row)

- Derived From: [BR-2.1](requirements.trace.md#br-21), [BR-2.2](requirements.trace.md#br-22), [BR-2.3](requirements.trace.md#br-23), [BR-2.4](requirements.trace.md#br-24), [BR-2.5](requirements.trace.md#br-25), [BR-6.1](requirements.trace.md#br-61)
- Artifacts: [ART-quick-search-results](#art-quick-search-results), [ART-result-row-project](#art-result-row-project), [ART-result-row-document](#art-result-row-document)

### OBL-keyboard-navigation

Arrow keys navigate all results across grouped sections; Tab cycles scope tabs (All→Tickets→Projects→Documents); Shift+Tab reverses; Enter activates selected result

- Derived From: [BR-5.1](requirements.trace.md#br-51), [BR-5.2](requirements.trace.md#br-52), [BR-5.3](requirements.trace.md#br-53), [BR-1.4](requirements.trace.md#br-14), [C3](requirements.trace.md#c3)
- Artifacts: [ART-quick-search-modal](#art-quick-search-modal), [ART-quick-search-results](#art-quick-search-results)

### OBL-project-matching

Add client-side project matching hook (useProjectSearch) with word-prefix scoring using existing projects prop

- Derived From: [BR-3.1](requirements.trace.md#br-31), [BR-3.2](requirements.trace.md#br-32)
- Artifacts: [ART-project-match](#art-project-match), [ART-use-project-search-test](#art-use-project-search-test)

### OBL-query-classification

Extend QueryMode from 3 ticket modes to 6+ modes (global, projects, documents, tickets, ticket_key, project_scope) with scope-aware classification; extend useCrossProjectSearch to use unified search endpoint when available

- Derived From: [BR-3.1](requirements.trace.md#br-31), [BR-3.2](requirements.trace.md#br-32), [BR-3.3](requirements.trace.md#br-33), [BR-3.4](requirements.trace.md#br-34), [BR-4.1](requirements.trace.md#br-41), [BR-4.2](requirements.trace.md#br-42), [BR-4.3](requirements.trace.md#br-43), [BR-4.4](requirements.trace.md#br-44)
- Artifacts: [ART-query-mode-hook](#art-query-mode-hook), [ART-search-types](#art-search-types), [ART-cross-search-hook](#art-cross-search-hook)

### OBL-scope-controls-ui

Add SearchScopeBar component with tab/button group for scope selection and integrate into QuickSearchInput

- Derived From: [BR-1.2](requirements.trace.md#br-12), [BR-1.3](requirements.trace.md#br-13), [C1](requirements.trace.md#c1), [C2](requirements.trace.md#c2)
- Artifacts: [ART-scope-bar](#art-scope-bar), [ART-quick-search-input](#art-quick-search-input)

### OBL-scope-model

Introduce SearchScope enum (Global, Tickets, Projects, Documents) and scope state management via useSearchScope hook

- Derived From: [BR-1.1](requirements.trace.md#br-11), [BR-1.2](requirements.trace.md#br-12), [BR-1.3](requirements.trace.md#br-13), [BR-1.4](requirements.trace.md#br-14)
- Artifacts: [ART-search-types](#art-search-types), [ART-search-schema](#art-search-schema), [ART-search-mode-hook](#art-search-mode-hook), [ART-scope-bar](#art-scope-bar), [ART-use-search-scope-test](#art-use-search-scope-test)

### OBL-unified-search-endpoint

Create new /api/search endpoint with SearchController for unified search across entity types, preserving existing /api/projects/search endpoint

- Derived From: [C5](requirements.trace.md#c5), [BR-4.1](requirements.trace.md#br-41), [BR-4.2](requirements.trace.md#br-42), [BR-4.3](requirements.trace.md#br-43)
- Artifacts: [ART-unified-search-endpoint](#art-unified-search-endpoint), [ART-search-controller](#art-search-controller)

### OBL-unified-search-schema

Create UnifiedSearchRequest and UnifiedSearchResponse schemas supporting discriminated result types (project, ticket, document) alongside existing SearchResponse for backward compatibility

- Derived From: [BR-2.1](requirements.trace.md#br-21), [BR-2.2](requirements.trace.md#br-22), [C5](requirements.trace.md#c5), [C6](requirements.trace.md#c6)
- Artifacts: [ART-search-types](#art-search-types), [ART-search-schema](#art-search-schema), [ART-search-index](#art-search-index), [ART-search-types-test](#art-search-types-test)

## Artifacts

### ART-cross-search-hook

- Path: `src/hooks/useCrossProjectSearch.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-query-classification](#obl-query-classification)

### ART-project-match

- Path: `src/hooks/useProjectSearch.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-project-matching](#obl-project-matching)

### ART-query-mode-hook

- Path: `src/hooks/useQuickSearch.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-query-classification](#obl-query-classification)

### ART-quick-search-input

- Path: `src/components/QuickSearch/QuickSearchInput.tsx`
- Kind: `runtime`
- Referencing Obligations: [OBL-scope-controls-ui](#obl-scope-controls-ui)

### ART-quick-search-modal

- Path: `src/components/QuickSearch/QuickSearchModal.tsx`
- Kind: `runtime`
- Referencing Obligations: [OBL-keyboard-navigation](#obl-keyboard-navigation)

### ART-quick-search-results

- Path: `src/components/QuickSearch/QuickSearchResults.tsx`
- Kind: `runtime`
- Referencing Obligations: [OBL-empty-states](#obl-empty-states), [OBL-grouped-results](#obl-grouped-results), [OBL-keyboard-navigation](#obl-keyboard-navigation)

### ART-result-row-document

- Path: `src/components/QuickSearch/DocumentResultRow.tsx`
- Kind: `runtime`
- Referencing Obligations: [OBL-grouped-results](#obl-grouped-results)

### ART-result-row-project

- Path: `src/components/QuickSearch/ProjectResultRow.tsx`
- Kind: `runtime`
- Referencing Obligations: [OBL-grouped-results](#obl-grouped-results)

### ART-scope-bar

- Path: `src/components/QuickSearch/SearchScopeBar.tsx`
- Kind: `runtime`
- Referencing Obligations: [OBL-scope-controls-ui](#obl-scope-controls-ui), [OBL-scope-model](#obl-scope-model)

### ART-search-controller

- Path: `server/controllers/SearchController.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-access-control](#obl-access-control), [OBL-unified-search-endpoint](#obl-unified-search-endpoint)

### ART-search-index

- Path: `domain-contracts/src/search/index.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-unified-search-schema](#obl-unified-search-schema)

### ART-search-mode-hook

- Path: `src/hooks/useSearchScope.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-scope-model](#obl-scope-model)

### ART-search-schema

- Path: `domain-contracts/src/search/schema.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-scope-model](#obl-scope-model), [OBL-unified-search-schema](#obl-unified-search-schema)

### ART-search-types

- Path: `domain-contracts/src/search/types.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-query-classification](#obl-query-classification), [OBL-scope-model](#obl-scope-model), [OBL-unified-search-schema](#obl-unified-search-schema)

### ART-search-types-test

- Path: `domain-contracts/src/search/__tests__/search.test.ts`
- Kind: `test`
- Referencing Obligations: [OBL-unified-search-schema](#obl-unified-search-schema)

### ART-unified-search-endpoint

- Path: `server/routes/search.ts`
- Kind: `runtime`
- Referencing Obligations: [OBL-access-control](#obl-access-control), [OBL-unified-search-endpoint](#obl-unified-search-endpoint)

### ART-use-project-search-test

- Path: `src/hooks/__tests__/useProjectSearch.test.ts`
- Kind: `test`
- Referencing Obligations: [OBL-project-matching](#obl-project-matching)

### ART-use-search-scope-test

- Path: `src/hooks/__tests__/useSearchScope.test.ts`
- Kind: `test`
- Referencing Obligations: [OBL-scope-model](#obl-scope-model)


## Derivation Summary

| Requirement ID | Obligation Count | Obligation IDs |
|---|---:|---|
| [BR-1.1](requirements.trace.md#br-11) | 1 | [OBL-scope-model](#obl-scope-model) |
| [BR-1.2](requirements.trace.md#br-12) | 2 | [OBL-scope-controls-ui](#obl-scope-controls-ui), [OBL-scope-model](#obl-scope-model) |
| [BR-1.3](requirements.trace.md#br-13) | 2 | [OBL-scope-controls-ui](#obl-scope-controls-ui), [OBL-scope-model](#obl-scope-model) |
| [BR-1.4](requirements.trace.md#br-14) | 2 | [OBL-keyboard-navigation](#obl-keyboard-navigation), [OBL-scope-model](#obl-scope-model) |
| [BR-2.1](requirements.trace.md#br-21) | 2 | [OBL-grouped-results](#obl-grouped-results), [OBL-unified-search-schema](#obl-unified-search-schema) |
| [BR-2.2](requirements.trace.md#br-22) | 2 | [OBL-grouped-results](#obl-grouped-results), [OBL-unified-search-schema](#obl-unified-search-schema) |
| [BR-2.3](requirements.trace.md#br-23) | 1 | [OBL-grouped-results](#obl-grouped-results) |
| [BR-2.4](requirements.trace.md#br-24) | 1 | [OBL-grouped-results](#obl-grouped-results) |
| [BR-2.5](requirements.trace.md#br-25) | 1 | [OBL-grouped-results](#obl-grouped-results) |
| [BR-3.1](requirements.trace.md#br-31) | 2 | [OBL-project-matching](#obl-project-matching), [OBL-query-classification](#obl-query-classification) |
| [BR-3.2](requirements.trace.md#br-32) | 2 | [OBL-project-matching](#obl-project-matching), [OBL-query-classification](#obl-query-classification) |
| [BR-3.3](requirements.trace.md#br-33) | 1 | [OBL-query-classification](#obl-query-classification) |
| [BR-3.4](requirements.trace.md#br-34) | 1 | [OBL-query-classification](#obl-query-classification) |
| [BR-4.1](requirements.trace.md#br-41) | 2 | [OBL-query-classification](#obl-query-classification), [OBL-unified-search-endpoint](#obl-unified-search-endpoint) |
| [BR-4.2](requirements.trace.md#br-42) | 2 | [OBL-query-classification](#obl-query-classification), [OBL-unified-search-endpoint](#obl-unified-search-endpoint) |
| [BR-4.3](requirements.trace.md#br-43) | 2 | [OBL-query-classification](#obl-query-classification), [OBL-unified-search-endpoint](#obl-unified-search-endpoint) |
| [BR-4.4](requirements.trace.md#br-44) | 1 | [OBL-query-classification](#obl-query-classification) |
| [BR-5.1](requirements.trace.md#br-51) | 1 | [OBL-keyboard-navigation](#obl-keyboard-navigation) |
| [BR-5.2](requirements.trace.md#br-52) | 1 | [OBL-keyboard-navigation](#obl-keyboard-navigation) |
| [BR-5.3](requirements.trace.md#br-53) | 1 | [OBL-keyboard-navigation](#obl-keyboard-navigation) |
| [BR-6.1](requirements.trace.md#br-61) | 1 | [OBL-grouped-results](#obl-grouped-results) |
| [BR-6.2](requirements.trace.md#br-62) | 1 | [OBL-access-control](#obl-access-control) |
| [BR-6.3](requirements.trace.md#br-63) | 1 | [OBL-empty-states](#obl-empty-states) |
| [BR-6.4](requirements.trace.md#br-64) | 1 | [OBL-empty-states](#obl-empty-states) |
| [C1](requirements.trace.md#c1) | 1 | [OBL-scope-controls-ui](#obl-scope-controls-ui) |
| [C2](requirements.trace.md#c2) | 1 | [OBL-scope-controls-ui](#obl-scope-controls-ui) |
| [C3](requirements.trace.md#c3) | 1 | [OBL-keyboard-navigation](#obl-keyboard-navigation) |
| [C4](requirements.trace.md#c4) | 1 | [OBL-access-control](#obl-access-control) |
| [C5](requirements.trace.md#c5) | 2 | [OBL-unified-search-endpoint](#obl-unified-search-endpoint), [OBL-unified-search-schema](#obl-unified-search-schema) |
| [C6](requirements.trace.md#c6) | 1 | [OBL-unified-search-schema](#obl-unified-search-schema) |
