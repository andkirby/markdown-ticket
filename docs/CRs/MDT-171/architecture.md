# Architecture

> Architecture trace projection: [architecture.trace.md](./architecture.trace.md)

## Overview

MDT-171 adds durable, project-scoped document favs without changing document root configuration or Recent behavior. The design keeps document eligibility owned by the existing document tree pipeline, adds a small backend owner for mutable fav state, and keeps Documents View responsible for sidebar composition and interaction flow.

Pattern: bounded feature state owner with read enrichment. `DocumentFavStateService` owns persistence and reconciliation, `GET /api/documents` remains the canonical tree read path, and a narrow documents-namespace write endpoint owns fav mutations.

## Decisions

- Storage convention is `CONFIG_DIR/projects/{project.id}/{name}.json`; for this feature `{name}` is `document-favs`, so the state file is `CONFIG_DIR/projects/{project.id}/document-favs.json`.
- The persisted state shape is an object with `favItems`, an ordered array of records. Each record has project-relative `path`, `type` as `file` or `folder`, and `favoritedAt` as an ISO timestamp.
- API lookup input may be project id or project code, but the backend must resolve it to the canonical `project.id` before selecting the state file.
- `GET /api/documents?projectId=...` remains the read path and may add optional `favorite` and `favoritedAt` metadata to eligible tree nodes.
- `PUT /api/documents/favs` owns writes of the complete ordered fav list. It must not use `/api/documents/configure`, `/api/documents/content`, project config routes, or `/api/config/selector`.
- `.mdt-config.toml` remains the source for project behavior such as `ticketsPath` and document roots. It is read for eligibility and ticket-path exclusion, but document fav state is never stored there.
- Initial UI shows a five-row fav preview. When six or more reconciled favs exist, the Favs header shows a trailing `Show all` action; selecting it expands all favs inline and changes the action to `Show less`.

## Runtime Flows

### Load Documents With Favs

1. `DocumentsLayout` calls `GET /api/documents?projectId=...`.
2. `DocumentController` delegates to `DocumentService`.
3. `DocumentService` gets the eligible tree from `TreeService`.
4. `DocumentFavStateService` resolves the project, reads `CONFIG_DIR/projects/{project.id}/document-favs.json`, validates shape, and falls back to an empty list for missing, malformed, or invalid JSON.
5. The service reconciles stored favs against the eligible tree, excluding deleted paths, outside-root paths, non-markdown files, and paths under the configured ticket path such as `docs/CRs`.
6. The response returns the normal tree plus optional fav metadata for eligible nodes. Non-favorite tree behavior stays unchanged.

### Write Favs

1. `DocumentsLayout` updates UI state optimistically when a tree or fav-row star is selected.
2. The frontend writes the complete ordered list through `PUT /api/documents/favs`.
3. The backend resolves the project to canonical `project.id`, validates every path as project-relative, normalized, non-empty, non-absolute, and free of parent traversal.
4. The backend reconciles entries against the eligible document tree before writing the JSON state file.
5. Unknown projects are rejected without creating a state file.

### Use Favs

1. `FavDocuments` renders only when reconciled favs exist, above Recent and outside the document tree scroll area.
2. Selecting a document fav opens the markdown document and selects the matching tree row.
3. Selecting a folder fav asks `FileTree` to expand ancestors and scroll or locate the folder row. Folder favs do not open a document preview.
4. Selecting an active star removes the fav and writes the updated complete list.
5. Favs expanded/collapsed state and `Show all` / `Show less` state are browser-local, per-project document navigation preferences. They are not stored in `document-favs.json`.

## Module Boundaries

- `server/services/DocumentFavStateService.ts` is the sole persistence and reconciliation owner for document fav state.
- `domain-contracts/src/app-config/schema.ts` and `validation.ts` own the Zod JSON state schema, inferred types, and validators.
- `server/routes/documents.ts` exposes the documents read route and the narrow fav write route.
- `server/controllers/DocumentController.ts` owns HTTP request validation and status mapping for document fav reads/writes.
- `server/services/DocumentService.ts` coordinates document tree read enrichment. It must not own file-path eligibility independently from `TreeService`.
- `server/services/TreeService.ts` remains the source of document-tree eligibility, configured roots, max depth, exclude folders, and ticket-path exclusion.
- `src/config/documentFavs.ts` owns frontend API calls and client-side normalization needed for optimistic updates.
- `src/components/DocumentsView/DocumentsLayout.tsx` owns data loading, mutation orchestration, Favs placement, and document/folder selection routing.
- `src/components/DocumentsView/FavDocuments.tsx` owns compact fav section rendering and active star removal controls.
- `src/components/DocumentsView/FileTree.tsx` owns row star controls, click isolation, expansion state, and locate-by-path for both files and folders.
- `src/config/documentNavigation.ts` owns browser-local per-project section presentation state for Favs and Recent, including Favs expanded/collapsed, Favs show-all, and Recent expanded/collapsed. It must not store durable fav targets.

## Structure

Expected implementation paths:

- `domain-contracts/src/app-config/schema.ts`
- `domain-contracts/src/app-config/validation.ts`
- `server/services/DocumentFavStateService.ts`
- `server/controllers/DocumentController.ts`
- `server/services/DocumentService.ts`
- `server/services/TreeService.ts`
- `server/routes/documents.ts`
- `src/config/documentFavs.ts`
- `src/components/DocumentsView/DocumentsLayout.tsx`
- `src/components/DocumentsView/FavDocuments.tsx`
- `src/components/DocumentsView/FileTree.tsx`
- `src/components/DocumentsView/RecentDocuments.tsx`
- `src/config/documentNavigation.ts`
- `src/components/DocumentsView/documents-view.css`
- `src/styles/entities/fav-star.css`
- `src/components/shared/Icon.tsx`
- `src/components/ProjectSelector/ProjectSelectorCard.tsx`

Test scaffolding stays separate:

- `server/tests/api/document-favs.test.ts`
- `server/tests/api/documents.test.ts`
- `src/config/documentFavs.test.ts`
- `src/components/DocumentsView/FavDocuments.test.tsx`
- `src/components/DocumentsView/FileTree.test.tsx`
- `tests/e2e/documents/favs.spec.ts`
- `tests/e2e/utils/selectors.ts`

## UI Contract

The document fav star must preserve the project favorite star pattern from project selector cards: inactive, active, hover, focus, title text, and accessible label behavior. Use the existing `fav-star` icon/style language unless implementation discovers a concrete incompatibility, in which case that incompatibility must be documented before changing the pattern.

Fav rows use the same compact sidebar row density as the tree. Favs and Recent sit outside the tree scroll area; only All Documents uses the tree scroll area. Empty Favs is hidden. Overflow favs expand inline through `Show all`; Favs does not get a nested scrollbar or popover.

## Invariants

- Document fav state is user state, not project behavior.
- No document fav write may touch `.mdt-config.toml`.
- No document fav write may route through `/api/documents/configure`.
- The complete ordered fav list is the write unit.
- Stored paths are project-relative and normalized.
- Eligibility is tree-derived, not independently reimplemented in the frontend.
- Deleted, excluded, outside-root, ticket-area, and malformed favs are not usable favs.
- Recent and All Documents behavior remains backward compatible.

## Error Philosophy

Malformed or missing state is not fatal to Documents View; it falls back to empty favs. Invalid write input is rejected before persistence. Unknown projects return a not-found style failure and must not create `CONFIG_DIR/projects/{unresolved}/document-favs.json`.

## Extension Rule

Do not generalize this into a generic user-state endpoint yet. Add a generic `CONFIG_DIR/projects/{project.id}/{name}.json` abstraction only after another backend-persisted per-project UI state needs the same owner pattern.

## Verification Contract

Tests must cover persistence path, no `.mdt-config.toml` writes, project id/code resolution, schema fallback, path traversal rejection, eligible-tree reconciliation, endpoint separation from `/api/documents/configure`, C6 star states, the five-row preview, `Show all` / `Show less`, browser-local section-state reload persistence, document open, folder locate, and unchanged Recent/All Documents behavior.
