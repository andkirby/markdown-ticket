# Architecture: MDT-179 — Scoped Global Search

## Overview

MDT-179 extends the QuickSearch command palette from ticket-only search to scoped multi-entity search across projects, tickets, and documents. The architecture follows the assess recommendation (Option 2: Redesign Inline) — bounded restructuring of the QuickSearch module, new search types in domain-contracts, and a new unified search endpoint, while preserving the existing search API for backward compatibility.

## Design Decisions

### D1: Separate SearchScope from QueryMode

**Decision**: Introduce a new `SearchScope` enum (`Global`, `Tickets`, `Projects`, `Documents`) independent of the existing `QueryMode` type.

**Rationale**: `QueryMode` classifies *what the user typed* (ticket key, project-scoped, free text). `SearchScope` classifies *which entity types the system searches*. These are orthogonal: a user in Projects scope typing `MDT-179` should still match by project name, not auto-switch to ticket mode. Keeping them separate avoids coupling scope selection to query parsing.

### D2: New Unified Search Endpoint

**Decision**: Create `POST /api/search` alongside the existing `POST /api/projects/search`. The new endpoint accepts `UnifiedSearchRequest` with a `scope` field and returns `UnifiedSearchResponse` with typed result groups.

**Rationale**: The existing endpoint is consumed by the frontend and MCP tools. Changing its schema risks breaking MCP consumers. A parallel endpoint allows clean extension while the old one continues to work. The old endpoint can be deprecated later.

### D3: Client-Side Project Matching

**Decision**: Project search is primarily client-side, using the `projects` prop already available in `QuickSearchModal`. Backend search is reserved for future document content search and large project sets.

**Rationale**: The frontend already receives the full project list. Project data is small (typically <100 projects). Client-side matching gives instant results without network latency. The `useProjectSearch` hook implements word-prefix matching using the same scoring pattern as `filterTickets`.

### D4: Scope Bar as Tab Strip

**Decision**: Add a `SearchScopeBar` component as a horizontal tab strip above the results area, with tabs for Global, Tickets, Projects, and Documents.

**Rationale**: Tabs are the most common scope-selector pattern in command palettes (VS Code, Raycast, Spotlight). They support both click and keyboard selection. They're visible and discoverable without hidden shortcuts.

## Module Boundaries

```
domain-contracts/src/search/       ← New module: search types and schemas
  ├── types.ts                      ← SearchScope, SearchResultType enums
  ├── schema.ts                     ← UnifiedSearchRequest/Response schemas
  └── index.ts                      ← Barrel export

src/hooks/
  ├── useQuickSearch.ts             ← Modified: extended QueryMode parsing
  ├── useSearchScope.ts             ← New: scope state management
  ├── useProjectSearch.ts           ← New: client-side project matching
  └── useCrossProjectSearch.ts      ← Modified: use unified endpoint when scoped

src/components/QuickSearch/
  ├── QuickSearchModal.tsx          ← Modified: integrate scope, generalize keyboard nav
  ├── QuickSearchInput.tsx          ← Modified: integrate SearchScopeBar
  ├── QuickSearchResults.tsx        ← Modified: N-group rendering
  ├── SearchScopeBar.tsx            ← New: scope tab strip component
  ├── ProjectResultRow.tsx          ← New: project result row
  └── DocumentResultRow.tsx         ← New: document result row

server/
  ├── controllers/SearchController.ts  ← New: unified search handler
  └── routes/search.ts                 ← New: POST /api/search
```

### Ownership

| Module | Owner | Responsibility |
|--------|-------|---------------|
| domain-contracts/src/search/ | domain-contracts | Search scope enums, request/response schemas |
| useSearchScope | frontend hooks | Scope selection state, keyboard shortcuts |
| useProjectSearch | frontend hooks | Client-side project matching and scoring |
| QuickSearchModal | QuickSearch module | Scope integration, keyboard navigation, result orchestration |
| SearchScopeBar | QuickSearch module | Scope tab rendering and interaction |
| SearchController | server controllers | Unified search dispatch across entity types |

## Canonical Runtime Flow

```
User opens Cmd+K
  → QuickSearchModal mounts
  → useSearchScope(default=Global) initializes scope state
  → SearchScopeBar renders tabs with Global active

User types query
  → parseQueryMode classifies query (ticket_key, project_scope, free text)
  → useProjectSearch filters projects by word-prefix (client-side)
  → useCrossProjectSearch dispatches to backend if needed
  → Results collected per entity type

Scope selection changes
  → SearchScopeBar fires scope change
  → useSearchScope updates active scope
  → Results re-filtered to active scope's entity types
  → QuickSearchResults re-renders with filtered groups

Keyboard navigation
  → ArrowUp/Down: linear across all visible items in all groups
  → Tab/Shift+Tab: jump to first item of next/previous group
  → Ctrl+1-4 (or equivalent): switch scope directly
  → Enter: activate selected result, close modal
```

## Assess Mismatch Responses

| Assess Mismatch | Architecture Response |
|----------------|----------------------|
| Query Mode Classification | OBL-query-classification: Extend QueryMode to include scope-aware modes alongside existing 3 ticket modes |
| SearchResponse Schema | OBL-unified-search-schema: New UnifiedSearchResponse with discriminated result types; old schema untouched |
| Result Rendering | OBL-grouped-results: Restructure QuickSearchResults for N labeled groups with per-type row components |
| Keyboard Navigation | OBL-keyboard-navigation: Arrow keys navigate all results across grouped sections; Tab cycles scope tabs (All→Tickets→Projects→Documents); Shift+Tab reverses; Enter activates |
| Scope Controls UI | OBL-scope-controls-ui: New SearchScopeBar tab strip integrated into modal |
| Project Data Availability | OBL-project-matching: New useProjectSearch hook using existing projects prop |

## Invariants

1. **Scope orthogonality**: Query parsing (QueryMode) and scope selection (SearchScope) are independent. Changing scope does not change query parsing behavior.
2. **Backward compatibility**: Existing `POST /api/projects/search` endpoint and `SearchResponse` schema remain unchanged.
3. **Single owner per result type**: Each entity type has exactly one result row component.
4. **No layout jumps**: Scope changes update content only; modal structure and input position remain stable (C1).
5. **Access filtering**: All search results pass through session access policy (C4).

## Extension Rule

To add a new entity type to search:
1. Add value to `SearchResultType` enum in `domain-contracts/src/search/types.ts`
2. Add value to `SearchScope` enum
3. Add tab to `SearchScopeBar`
4. Create result row component
5. Add matching logic (hook or backend extension)
6. Add result type to `UnifiedSearchResponse` schema

This follows the same pattern as adding document search — no command palette redesign needed (C6).

## Error Philosophy

- **Network errors**: Show retry banner within the affected result group, not globally. Other groups remain interactive.
- **Empty results**: Per-scope empty states with scope label. Never show "no results" without identifying which scope was searched.
- **Invalid queries**: Treat as free-text matching. Never block input or show error for unrecognized syntax.

---
Use `architecture.trace.md` for canonical artifact/obligation records and derivation summaries.
