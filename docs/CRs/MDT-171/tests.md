# Tests: MDT-171

> Canonical test-plan projection: [tests.trace.md](./tests.trace.md)

## Overview

MDT-171 test coverage verifies document favs as durable project-scoped user state owned by `DocumentFavStateService`, enriched through `GET /api/documents`, and written only through `PUT /api/documents/favs`.

Executable test files were not authored in this run because the requested write scope is limited to `docs/CRs/MDT-171/` and `docs/CRs/.trace/MDT-171/`. The test plans below define the RED tests expected for implementation.

## Module -> Test Mapping

| Module | Test File | Test Plan |
|--------|-----------|-----------|
| `domain-contracts/src/app-config/schema.ts` | `src/config/documentFavs.test.ts` | `TEST-document-fav-state-schema` |
| `domain-contracts/src/app-config/validation.ts` | `src/config/documentFavs.test.ts` | `TEST-document-fav-state-schema` |
| `server/services/DocumentFavStateService.ts` | `server/tests/api/document-favs.test.ts` | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route` |
| `server/controllers/DocumentController.ts` | `server/tests/api/document-favs.test.ts` | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route` |
| `server/routes/documents.ts` | `server/tests/api/document-favs.test.ts` | `TEST-document-fav-write-route` |
| `server/services/DocumentService.ts` | `server/tests/api/documents.test.ts` | `TEST-document-tree-fav-reconciliation` |
| `server/services/TreeService.ts` | `server/tests/api/documents.test.ts` | `TEST-document-tree-fav-reconciliation` |
| `src/config/documentFavs.ts` | `src/config/documentFavs.test.ts` | `TEST-document-favs-api-client` |
| `src/components/DocumentsView/DocumentsLayout.tsx` | `tests/e2e/documents/favs.spec.ts` | `TEST-documents-favs-e2e` |
| `src/components/DocumentsView/FavDocuments.tsx` | `src/components/DocumentsView/FavDocuments.test.tsx` | `TEST-fav-documents-component` |
| `src/components/DocumentsView/FileTree.tsx` | `src/components/DocumentsView/FileTree.test.tsx` | `TEST-file-tree-fav-controls` |
| `src/components/DocumentsView/RecentDocuments.tsx` | `tests/e2e/documents/favs.spec.ts` | `TEST-documents-favs-e2e` |
| `src/config/documentNavigation.ts` | `tests/e2e/documents/favs.spec.ts` | `TEST-documents-favs-e2e` |
| `src/components/DocumentsView/documents-view.css` | `src/components/DocumentsView/FavDocuments.test.tsx` | `TEST-fav-documents-component` |
| `src/styles/entities/fav-star.css` | `src/components/DocumentsView/FavDocuments.test.tsx`, `src/components/DocumentsView/FileTree.test.tsx` | `TEST-fav-documents-component`, `TEST-file-tree-fav-controls` |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Persistence path | `DocumentFavStateService` | writes and reads `CONFIG_DIR/projects/{project.id}/document-favs.json` only |
| Project identity | `DocumentFavStateService`, `DocumentController` | API lookup by id or code resolves to canonical `project.id`; unknown project writes create no state |
| State schema | app-config schema/validation, `documentFavs.ts` | ordered `favItems` with project-relative `path`, `type` of `file` or `folder`, and ISO `favoritedAt`; malformed state falls back empty |
| Path validation | write route and state service | rejects empty, absolute, non-normalized, and parent-traversal paths before persistence |
| Eligibility reconciliation | `DocumentService`, `TreeService`, state service | ignores deleted paths, outside-root paths, non-markdown files, and configured ticket path such as `docs/CRs` |
| Endpoint separation | documents routes/client | fav writes use `PUT /api/documents/favs`; no writes through `.mdt-config.toml`, `/api/documents/configure`, content, project config, or selector routes |

## UI Contract Tests

| Contract | Test Plan(s) |
|----------|--------------|
| Existing project favorite star pattern is preserved for inactive, active, hover, focus, title text, and accessible label behavior | `TEST-fav-documents-component`, `TEST-file-tree-fav-controls`, `TEST-documents-favs-e2e` |
| Active stars remove favs from persisted state and visible Favs rows | `TEST-fav-documents-component`, `TEST-file-tree-fav-controls`, `TEST-documents-favs-e2e` |
| Empty Favs section is hidden; populated Favs appears above Recent and outside the tree scroll area | `TEST-fav-documents-component`, `TEST-documents-favs-e2e` |
| Initial Favs section shows a five-row preview; six or more favs expose `Show all`; `Show all` renders every fav inline and changes to `Show less` | `TEST-fav-documents-component`, `TEST-documents-favs-e2e` |
| Document fav opens the markdown document; folder fav expands ancestors and locates the folder row | `TEST-file-tree-fav-controls`, `TEST-documents-favs-e2e` |
| Existing Recent and All Documents behavior remains unchanged | `TEST-documents-favs-e2e` |

## External Dependency Tests

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|----------------------|
| Filesystem-backed `CONFIG_DIR` project state | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route` | Missing state reads as empty favs; unknown project writes fail without creating state |
| Project `.mdt-config.toml` document roots and ticket path | `TEST-document-tree-fav-reconciliation` | Ineligible roots and configured ticket path entries are not exposed as usable favs |
| Browser document navigation state | `TEST-documents-favs-e2e` | Existing Recent and All Documents behavior remains available when favs are empty or invalid |

## Constraint Coverage

| Constraint ID | Test Plan(s) |
|---------------|--------------|
| `C1` | `TEST-document-fav-storage-owner` |
| `C2` | `TEST-document-fav-storage-owner` |
| `C3` | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route` |
| `C4` | `TEST-document-fav-state-schema`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client` |
| `C5` | `TEST-document-fav-write-route`, `TEST-document-tree-fav-reconciliation` |
| `C6` | `TEST-fav-documents-component`, `TEST-file-tree-fav-controls`, `TEST-documents-favs-e2e` |
| `C7` | `TEST-document-fav-state-schema`, `TEST-document-fav-write-route`, `TEST-document-tree-fav-reconciliation` |
| `C8` | `TEST-fav-documents-component`, `TEST-file-tree-fav-controls`, `TEST-documents-favs-e2e` |
| `C9` | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-document-tree-fav-reconciliation` |
| `C10` | `TEST-fav-documents-component`, `TEST-documents-favs-e2e` |
| `Edge-1` | `TEST-document-tree-fav-reconciliation` |
| `Edge-2` | `TEST-document-tree-fav-reconciliation` |
| `Edge-3` | `TEST-document-tree-fav-reconciliation` |
| `Edge-4` | `TEST-document-fav-state-schema`, `TEST-document-tree-fav-reconciliation` |
| `Edge-5` | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route` |

## Verify

```bash
bun run --cwd server jest tests/api/document-favs.test.ts tests/api/documents.test.ts --runInBand
bun test src/config/documentFavs.test.ts src/components/DocumentsView/FavDocuments.test.tsx src/components/DocumentsView/FileTree.test.tsx
bunx playwright test tests/e2e/documents/favs.spec.ts --project=chromium
spec-trace validate MDT-171 --stage tests
spec-trace render tests MDT-171
```
