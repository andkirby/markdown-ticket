# Research: Document Search Integration into QuickSearch

**CR**: MDT-179
**Date**: 2026-06-07
**Status**: Research complete, awaiting implementation decision

---

## 1. Problem Statement

MDT-179 implemented scoped global search with four scope tabs (All / Tickets / Projects / Documents), but the **Documents** scope returns zero results. The infrastructure is scaffolded — `DocumentResultRow`, `SearchScope` enum, `QuickSearchResults` grouping — but no actual document search logic or data flow exists.

The DocumentsView already has a working client-side search that filters a document tree by name, title, and path. This research investigates how to bridge that capability into the QuickSearch modal.

---

## 2. Current State Audit

### 2.1 What Exists

| Artifact | Location | Status |
|----------|----------|--------|
| `SearchScope.DOCUMENTS` enum value | `domain-contracts/src/search/types.ts` | ✅ Defined |
| `DocumentResultItemSchema` (Zod) | `domain-contracts/src/search/schema.ts` | ✅ Defined |
| `DocumentResultRow` component | `src/components/QuickSearch/DocumentResultRow.tsx` | ✅ Renders doc items |
| `QuickSearchResults` documents section | `src/components/QuickSearch/QuickSearchResults.tsx` | ✅ Groups + renders |
| `SearchScopeBar` "Documents" tab | `src/components/QuickSearch/SearchScopeBar.tsx` | ✅ Visible |
| `QuickSearchModal` scope filtering | `src/components/QuickSearch/QuickSearchModal.tsx` | ✅ Filters by scope |
| Backend `SearchController.searchDocuments` | `server/controllers/SearchController.ts` | ⬜ Stub — empty |
| `useDocumentSearch` hook | `src/hooks/useDocumentSearch.ts` | ❌ Does not exist |
| `QuickSearchModal` → document data flow | `QuickSearchModal.tsx` | ❌ Passes `[]` |
| `onSelectDocument` callback | `App.tsx` → `QuickSearchModal` | ❌ Not wired |

### 2.2 What's Missing (the gap)

1. **No `useDocumentSearch` hook** — the modal has no way to fetch or filter documents.
2. **Backend stub** — `SearchController.search()` skips documents entirely (`// Document search will be implemented when document content search is added`).
3. **No `documentResults` wiring** — `QuickSearchModal` passes `documentResults={}` (empty default) to `QuickSearchResults`.
4. **No document selection handler** — `App.tsx` does not pass `onSelectDocument` to the modal.
5. **No keyboard Enter dispatch for documents** — the `handleKeyDown` Enter handler checks projects and tickets but not documents.
6. **No `totalSelectableResults` offset for documents** — the flat index calculation excludes documents.

---

## 3. How DocumentsView Search Works (Reference Model)

The existing DocumentsView (`src/components/DocumentsView/DocumentsLayout.tsx`) performs **pure client-side filtering** on an already-loaded document tree.

### 3.1 Data Loading

```
GET /api/documents?projectId=XYZ → TreeNode[] (nested tree)
```

The backend `DocumentController.getDocuments()` calls `DocumentService.discoverDocuments()`, which uses `TreeService.getDocumentTree()` to scan configured document paths and return a nested `TreeNode[]`.

### 3.2 TreeNode Structure

```typescript
// server/types/tree.ts
interface TreeNode {
  name: string       // filename or folder name
  path: string       // relative path from project root
  type: 'file' | 'folder'
  children?: TreeNode[]
  favorite?: boolean
  favoritedAt?: string
}
```

The frontend extends this with optional metadata:

```typescript
// src/components/DocumentsView/FileTree.tsx
interface DocumentFile {
  name: string
  path: string
  type: 'file' | 'folder'
  title?: string           // from YAML frontmatter
  children?: DocumentFile[]
  dateCreated?: Date | string
  lastModified?: Date | string
  favorite?: boolean
  favoritedAt?: string
}
```

### 3.3 Search Algorithm

```typescript
// Simplified from DocumentsLayout.tsx filteredFiles
const searchTerms = query.toLowerCase().trim().split(/\s+/)

// AND logic: every term must match at least one field
const matchesSearch = searchTerms.every(term =>
  fileName.includes(term) ||
  fileTitle.includes(term) ||
  filePath.includes(term)
)
```

Key characteristics:
- **AND logic** across whitespace-delimited terms
- **Three match fields**: `name`, `title`, `path` (all case-insensitive `includes`)
- **Folder propagation**: folders appear if they have matching children
- **No scoring**: simple boolean match (first-match display order)
- **No backend round-trip**: filters the already-loaded tree in memory

---

## 4. How Project Search Works (Existing Pattern)

`useProjectSearch` (`src/hooks/useProjectSearch.ts`) provides the closest parallel pattern:

```typescript
// Hook signature
useProjectSearch({ projects: Project[], query: string, maxResults?: number })
  → { matches: ScoredProject[], isEmpty: boolean }
```

Architecture:
1. **Input**: takes `projects[]` already loaded by the parent (`App.tsx`)
2. **Matching**: pure function `matchProjects()` — scores by code prefix and name word-prefix
3. **Output**: `ScoredProject[]` sorted by score
4. **Integration**: `QuickSearchModal` calls the hook, passes results to `QuickSearchResults`

This is a **client-side-only** approach with no backend involvement.

---

## 5. Approaches

### Approach A: Client-Side Document Search (Recommended)

Mirror the `useProjectSearch` pattern: load documents for the current project, filter client-side.

#### Data Flow

```
QuickSearchModal
  │
  ├── useDocumentSearch({ projectId, projects, query })
  │     ├── Load: GET /api/documents?projectId=X  (one project)
  │     ├── Flatten TreeNode[] → flat file list (skip folders)
  │     ├── Score: match by name / title / path (AND logic)
  │     └── Return: ScoredDocument[] (max 10)
  │
  ├── QuickSearchResults(documentResults=[...])
  │     └── Renders "Documents" group with DocumentResultRow items
  │
  └── Enter handler → onSelectDocument(projectId, path)
        └── navigate(/prj/CODE/documents?file=PATH)
```

#### Required Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/useDocumentSearch.ts` | **New file** — hook + `matchDocuments()` + `flattenTree()` pure functions |
| 2 | `src/hooks/__tests__/useDocumentSearch.test.ts` | **New file** — unit tests |
| 3 | `src/components/QuickSearch/QuickSearchModal.tsx` | Add `useDocumentSearch` hook, wire `documentResults`, add Enter dispatch for documents, add offset to `totalSelectableResults` |
| 4 | `src/App.tsx` | Add `onSelectDocument` callback → navigate to document |
| 5 | `src/components/QuickSearch/QuickSearchModalProps` | Add `onSelectDocument` prop |
| 6 | `src/components/QuickSearch/DocumentResultRow.tsx` | No change needed (already renders `DocumentResultItem`) |

**Estimated complexity**: Small (1 new hook, 3 integration edits)

#### Scoring Design

```
Priority: exact name > name prefix > title match > path segment match > substring
```

| Match type | Score |
|------------|-------|
| Exact filename match (no extension) | 100 |
| Filename prefix match | 90 |
| Title word-prefix match | 80 |
| Title substring match | 60 |
| Path segment prefix match | 50 |
| Name substring match | 40 |
| Path substring match | 20 |

#### Cross-Project Consideration

For `scope === 'global'`, the hook should:
1. Search current-project documents (already loaded via `GET /api/documents?projectId=X`)
2. **Not** load documents for all projects (would be too expensive)
3. Cross-project document search is deferred to the backend approach (Approach B)

For `scope === 'documents'` (documents-only scope), the same behavior — current project only.

#### Caching

- Cache the `GET /api/documents` response per `projectId` for the modal's lifetime
- Invalidate on modal close (documents may change between searches)
- Alternative: reuse the `createSearchCache()` from `useCrossProjectSearch` with a short TTL

#### Pros / Cons

| Pros | Cons |
|------|------|
| Consistent with project search pattern | Current-project only (no cross-project doc search) |
| No backend changes | Must load full document tree per query |
| Fast for single project | Tree may be large for projects with many docs |
| Low implementation risk | Does not search document content (title/path only) |

---

### Approach B: Backend Document Search via Unified Endpoint

Implement the `SearchController.searchDocuments()` stub to search documents server-side.

#### Data Flow

```
QuickSearchModal
  │
  ├── useUnifiedSearch({ query, scope: 'documents' })
  │     └── POST /api/search { query, scope: 'documents' }
  │           └── SearchController.searchDocuments()
  │                 ├── For each project: TreeService.getDocumentTree()
  │                 ├── Flatten + filter by name/title/path
  │                 └── Return DocumentResultItem[]
  │
  ├── QuickSearchResults(documentResults=[...])
  └── Enter handler → onSelectDocument(projectId, path)
```

#### Required Changes

| # | File | Change |
|---|------|--------|
| 1 | `server/controllers/SearchController.ts` | Implement `searchDocuments()` — iterate projects, call `TreeService.getDocumentTree()`, flatten, filter |
| 2 | `server/tests/api/search.test.ts` | Add document search integration tests |
| 3 | `src/hooks/useDocumentSearch.ts` | **New file** — calls `POST /api/search` with `scope: 'documents'` |
| 4 | `src/hooks/__tests__/useDocumentSearch.test.ts` | **New file** — unit tests |
| 5 | `src/components/QuickSearch/QuickSearchModal.tsx` | Wire `useDocumentSearch` + Enter dispatch |
| 6 | `src/App.tsx` | Add `onSelectDocument` callback |
| 7 | `src/services/dataLayer.ts` | Add `searchDocuments()` method |

**Estimated complexity**: Medium (backend + frontend changes, I/O-heavy search)

#### Performance Concerns

The backend must call `TreeService.getDocumentTree()` for **each visible project**, which:
- Reads the filesystem for each project's configured document paths
- Builds and filters a tree
- Is I/O-bound and could be slow for many projects

Mitigations:
- Cache document trees per project (in-memory, TTL-based)
- Limit to current project by default, cross-project only on explicit request
- Async parallel scanning with `Promise.all()` and timeout

#### Pros / Cons

| Pros | Cons |
|------|------|
| Cross-project document search | Backend changes required |
| Server-side caching opportunities | I/O-heavy, needs perf analysis |
| Consistent with `POST /api/search` architecture | More integration test surface |
| Scales to content search later | Higher implementation risk |

---

### Approach C: Hybrid — Client-Side Now, Backend Later

Implement Approach A immediately for current-project document search, then migrate to Approach B when cross-project or content search is needed.

The `SearchController` stub already exists and is correctly commented — it serves as the migration point.

---

## 6. Recommendation

**Approach C (Hybrid)** is recommended:

1. **Ship Approach A now** — unblocks the Documents scope tab with current-project search
2. **Defer Approach B** — when cross-project document search or content search is needed, implement the backend endpoint
3. **Keep the backend stub** — `SearchController.searchDocuments()` placeholder is already correctly positioned

### Rationale

| Factor | Approach A | Approach B | Approach C |
|--------|-----------|-----------|-----------|
| Implementation speed | Fast | Medium | Fast (phased) |
| Risk | Low | Medium | Low |
| Feature coverage | Current-project only | Cross-project | Phased |
| Backend changes | None | Required | Deferred |
| Consistency with project search | ✅ Same pattern | ❌ Different pattern | ✅ Starts same |
| Future-proof | Needs refactor for cross-project | Ready for content search | Migrates cleanly |

---

## 7. Implementation Checklist (Approach A)

### Phase 1: Hook + Pure Functions

- [ ] Create `src/hooks/useDocumentSearch.ts`
  - [ ] `flattenTree(nodes: TreeNode[]): FlatDocument[]` — recurse tree, return file-only nodes
  - [ ] `scoreDocument(query: string, doc: FlatDocument): number` — score by name/title/path
  - [ ] `matchDocuments(options): ScoredDocument[]` — AND logic, sorted by score
  - [ ] `useDocumentSearch({ projectId, query, maxResults? }): UseDocumentSearchResult`
  - [ ] Fetch `GET /api/documents?projectId=X` with caching (ref-based, not state-triggered)
  - [ ] Return `{ matches, isEmpty, loading }`

### Phase 2: Unit Tests

- [ ] Create `src/hooks/__tests__/useDocumentSearch.test.ts`
  - [ ] `flattenTree` — nested tree → flat list, skips folders
  - [ ] `scoreDocument` — exact name > prefix > title > path > substring
  - [ ] `matchDocuments` — AND logic, maxResults, empty query returns empty
  - [ ] Hook — fetches on mount, filters on query change

### Phase 3: Modal Integration

- [ ] Edit `src/components/QuickSearch/QuickSearchModal.tsx`
  - [ ] Add `useDocumentSearch` hook call
  - [ ] Pass `documentResults` to `QuickSearchResults`
  - [ ] Add document offset to `totalSelectableResults`
  - [ ] Add document Enter handler (before/after project check)
  - [ ] Add `onSelectDocument` prop to interface
  - [ ] Scope filtering: only show documents when scope is `global` or `documents`

### Phase 4: App Wiring

- [ ] Edit `src/App.tsx`
  - [ ] Add `onSelectDocument` callback to `QuickSearchModal`
  - [ ] Navigate to `/prj/${code}/documents?file=${encodedPath}`

### Phase 5: Verify

- [ ] Cmd+K → type doc name → Documents group appears
- [ ] Scope "Documents" tab → only document results
- [ ] Enter on document → navigates to document view
- [ ] Empty state shows "No results found in documents"
- [ ] Arrow keys navigate across all groups (tickets → projects → documents)

---

## 8. Open Questions for Implementation

| # | Question | Options | Default |
|---|----------|---------|---------|
| 1 | Should document search load on modal open or on first query? | Eager (preload) vs Lazy (on query) | Lazy — avoid unnecessary API calls |
| 2 | Should the Documents scope search across all projects or current only? | Current only vs All projects | Current only (consistent with ticket default) |
| 3 | Should the `DocumentResultItem` interface match `domain-contracts` schema exactly? | Yes (reuse) vs Local (simpler) | Reuse `DocumentResultItem` from schema |
| 4 | Should document results appear in "global" scope alongside tickets and projects? | Yes vs No (documents scope only) | Yes — global shows all entity types |
| 5 | Should the document tree be cached across modal open/close cycles? | Yes (session cache) vs No (fresh each open) | Fresh each open (stale data risk is low, simplicity wins) |

---

## 9. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      QuickSearchModal                    │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Tickets  │  │   Projects   │  │    Documents     │  │
│  │ useQuick │  │ useProject   │  │ useDocument      │  │
│  │ Search   │  │ Search       │  │ Search           │  │
│  │ (local)  │  │ (local)      │  │ (fetch + local)  │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       │               │                    │             │
│       └───────────────┼────────────────────┘             │
│                       ▼                                  │
│            ┌─────────────────────┐                      │
│            │  QuickSearchResults │                      │
│            │  ┌───────────────┐  │                      │
│            │  │ Tickets group │  │                      │
│            │  ├───────────────┤  │                      │
│            │  │ Projects group│  │                      │
│            │  ├───────────────┤  │                      │
│            │  │ Documents grp │  │  ← NEW               │
│            │  └───────────────┘  │                      │
│            └─────────────────────┘                      │
│                       │                                  │
│                       ▼                                  │
│            ┌─────────────────────┐                      │
│            │   Selection Router   │                      │
│            │  ticket → navigate   │                      │
│            │  project → navigate  │                      │
│            │  document → navigate │ ← NEW                │
│            └─────────────────────┘                      │
└─────────────────────────────────────────────────────────┘

Data Sources:
  Tickets:   useQuickSearch (local filter on tickets[] prop)
  Projects:  useProjectSearch (local filter on projects[] prop)
  Documents: useDocumentSearch (fetch GET /api/documents → local filter) ← NEW
```

---

## 10. Future Extensions

These are explicitly **out of scope** for the initial implementation but documented for traceability:

| Extension | Description | Depends On |
|-----------|-------------|------------|
| Cross-project document search | Search documents across all projects | Backend `SearchController.searchDocuments()` |
| Document content search | Full-text search inside markdown files | Backend indexing (e.g., ripgrep, SQLite FTS) |
| Recent documents | Show recently opened documents when query is empty | `documentNavigation` localStorage |
| Pinned/favorite documents | Show favorited documents in quick search | `DocumentFavStateService` |
| Document preview | Inline preview of matched document on hover | New component |
