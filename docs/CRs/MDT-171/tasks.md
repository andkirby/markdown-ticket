# Tasks: MDT-171

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- Backend state: `DocumentFavStateService` is the only persistence and reconciliation owner for `CONFIG_DIR/projects/{project.id}/document-favs.json`.
- Backend routes: `GET /api/documents` may enrich eligible tree nodes; `PUT /api/documents/favs` is the only fav write route.
- Frontend state: `DocumentsLayout` orchestrates loading, optimistic writes, Favs placement, and document/folder selection.
- UI contract: preserve the existing project favorite star active/inactive/hover/focus/accessibility pattern for C6.
- Sidebar layout: show a five-row fav preview with `Show all` / `Show less` for six or more favs.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Fav JSON state path and reconciliation | `server/services/DocumentFavStateService.ts` | Task 2 or Task 3 |
| Eligible document tree rules | `server/services/TreeService.ts` | Task 3 |
| Fav write API | `server/routes/documents.ts`, `server/controllers/DocumentController.ts` | Task 2 |
| Documents sidebar composition | `src/components/DocumentsView/DocumentsLayout.tsx` | Task 5 or Task 6 |
| Fav row rendering | `src/components/DocumentsView/FavDocuments.tsx` | Task 5 |
| Tree row star controls and folder locate | `src/components/DocumentsView/FileTree.tsx` | Task 4 or Task 6 |
| Recent behavior | `src/config/documentNavigation.ts`, `src/components/DocumentsView/RecentDocuments.tsx` | Task 6 |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 1, Task 2, Task 7 |
| C2 | Task 2, Task 7 |
| C3 | Task 1, Task 2, Task 7 |
| C4 | Task 1, Task 2, Task 7 |
| C5 | Task 2, Task 3, Task 7 |
| C6 | Task 4, Task 5, Task 6, Task 7 |
| C7 | Task 1, Task 2, Task 3, Task 7 |
| C8 | Task 4, Task 5, Task 6, Task 7 |
| C9 | Task 1, Task 2, Task 3, Task 6, Task 7 |
| C10 | Task 5, Task 6, Task 7 |
| Edge-1 | Task 3, Task 7 |
| Edge-2 | Task 3, Task 7 |
| Edge-3 | Task 3, Task 7 |
| Edge-4 | Task 1, Task 3, Task 7 |
| Edge-5 | Task 2, Task 7 |

## Milestones

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint |
|-----------|------------------------|-------|------------|
| M0: Walking Skeleton | - | Task 0 | Missing files exist, runners work, stubs compile |
| M1: Durable backend state and read enrichment | BR-2.3, BR-3.1, BR-3.2 | Task 1-3 | Storage, write route, and enriched reads test GREEN |
| M2: Reusable Documents View fav UI | BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-1.5, BR-1.6, BR-2.1, BR-2.2 | Task 4-5 | Component and FileTree tests GREEN |
| M3: Full user workflow | BR-1.1 through BR-3.3 | Task 6-7 | E2E scenario set and full verification GREEN |

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------:|---------:|----:|--------|
| domain-contracts/src/app-config/ | 2 | 2 | 0 | ✅ |
| server/services/ | 3 | 3 | 0 | ✅ |
| server/controllers/ | 1 | 1 | 0 | ✅ |
| server/routes/ | 1 | 1 | 0 | ✅ |
| server/tests/api/ | 2 | 2 | 0 | ✅ |
| src/config/ | 3 | 3 | 0 | ✅ |
| src/components/DocumentsView/ | 7 | 7 | 0 | ✅ |
| src/styles/entities/ | 1 | 1 | 0 | ✅ |
| src/components/shared/ | 1 | 1 | 0 | ✅ |
| src/components/ProjectSelector/ | 1 | 1 | 0 | ✅ |
| tests/e2e/ | 2 | 2 | 0 | ✅ |

No orphaned architecture files remain.

## Tasks

### Task 0: Create missing document fav stubs and test shells

**Milestone**: M0 - Walking Skeleton

**Structure**: `server/services/DocumentFavStateService.ts`; `src/config/documentFavs.ts`; `src/components/DocumentsView/FavDocuments.tsx`; `server/tests/api/document-favs.test.ts`; `src/config/documentFavs.test.ts`; `src/components/DocumentsView/FavDocuments.test.tsx`; `tests/e2e/documents/favs.spec.ts`

**Makes GREEN (Automated Tests)**:
- None. This task proves missing files and runners exist before feature implementation.

**Scope**: Create minimal compile-safe stubs for missing architecture files and RED/skip-free test shells that name the canonical test plans.
**Boundary**: Do not implement behavior beyond type-safe placeholders and wiring required for the test runner to discover files.

**Creates**:
- `server/services/DocumentFavStateService.ts`
- `src/config/documentFavs.ts`
- `src/components/DocumentsView/FavDocuments.tsx`
- `server/tests/api/document-favs.test.ts`
- `src/config/documentFavs.test.ts`
- `src/components/DocumentsView/FavDocuments.test.tsx`
- `tests/e2e/documents/favs.spec.ts`

**Modifies**:
- `tests/e2e/utils/selectors.ts` only if the E2E shell needs exported placeholder selectors

**Must Not Touch**:
- `.mdt-config.toml`
- `/api/documents/configure` behavior
- Project selector state routes
- Runtime server startup scripts

**Create/Move**:
- Add missing backend service, frontend API, component, and test entry files.
- Keep test files in the architecture-specified locations.

**Exclude**: No storage writes, no route behavior, no UI styling changes.

**Anti-duplication**: Import existing document tree, icon, and fav-star primitives where possible - do not copy project selector star logic.

**Duplication Guard**:
- Check existing Documents View and project selector star modules before adding stubs.
- If a second fav-state service or client already exists, stop and convert this into a merge/refactor task.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bun run --cwd server jest --runInBand --listTests
bun test src/config/documentFavs.test.ts src/components/DocumentsView/FavDocuments.test.tsx
bunx playwright test --list tests/e2e/documents/favs.spec.ts --project=chromium
```

**Done when**:
- [ ] Missing architecture files exist.
- [ ] Targeted test runners discover the new MDT-171 test files without command-not-found or module-not-found errors.
- [ ] No duplicated fav owner was introduced.
- [ ] Smoke test commands can start.

### Task 1: Add typed document fav state contracts and client API

**Skills**: frontend-react-component

**Milestone**: M1 - Durable backend state and read enrichment (BR-3.2)

**Structure**: `domain-contracts/src/app-config/schema.ts`; `domain-contracts/src/app-config/validation.ts`; `src/config/documentFavs.ts`; `src/config/documentFavs.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-fav-state-schema` -> `src/config/documentFavs.test.ts`: document fav schema validates ordered file and folder records and falls back for invalid state
- `TEST-document-favs-api-client` -> `src/config/documentFavs.test.ts`: frontend document fav API writes complete ordered lists through the narrow fav endpoint only

**Enables (BDD)**:
- `ordered_write_preserves_existing_navigation` (BR-3.2, BR-3.3) - needs Task 6 to complete

**Scope**: Define the shared Zod JSON shape for `favItems` and add a narrow frontend client for `PUT /api/documents/favs`.
**Boundary**: Keep persistence ownership out of the frontend and out of `.mdt-config.toml`.

**Creates**:
- `src/config/documentFavs.ts`
- `src/config/documentFavs.test.ts`

**Modifies**:
- `domain-contracts/src/app-config/schema.ts`
- `domain-contracts/src/app-config/validation.ts`

**Must Not Touch**:
- `server/services/DocumentFavStateService.ts` implementation beyond imports needed by later tasks
- `src/config/documentNavigation.ts`
- `.mdt-config.toml`

**Create/Move**:
- Add Zod schemas, inferred typed fav item/state exports, and validators.
- Add frontend API helpers for complete ordered writes.

**Exclude**: No backend route registration, no localStorage persistence, no browser-only fallback.

**Anti-duplication**: Import Zod app-config schema/validation helpers from `domain-contracts/src/app-config/*` - do not create parallel validators in `src/config/documentFavs.ts`.

**Duplication Guard**:
- Check app-config schema/validation for existing project-scoped JSON state helpers before coding.
- If document fav types exist elsewhere, merge into the canonical schema exports.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bun test src/config/documentFavs.test.ts
```

**Done when**:
- [ ] Unit tests GREEN.
- [ ] Fav records require project-relative path, `file` or `folder` type, and ISO `favoritedAt`.
- [ ] Client writes only to `PUT /api/documents/favs`.
- [ ] No duplicated logic.

### Task 2: Implement backend fav state owner and write endpoint

**Milestone**: M1 - Durable backend state and read enrichment (BR-1.1, BR-1.2, BR-1.6, BR-2.3, BR-3.2)

**Structure**: `server/services/DocumentFavStateService.ts`; `server/controllers/DocumentController.ts`; `server/routes/documents.ts`; `server/tests/api/document-favs.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-fav-storage-owner` -> `server/tests/api/document-favs.test.ts`: DocumentFavStateService persists only CONFIG_DIR project fav state and resolves project id or code
- `TEST-document-fav-write-route` -> `server/tests/api/document-favs.test.ts`: PUT /api/documents/favs validates complete ordered fav writes and rejects unsafe or unknown targets

**Enables (BDD)**:
- `folder_fav_appears_active` (BR-1.1, BR-1.3, BR-1.5) - needs Task 6 to complete
- `markdown_fav_appears_active` (BR-1.2, BR-1.3, BR-1.5) - needs Task 6 to complete
- `active_star_removes_fav` (BR-1.6, BR-1.4) - needs Task 6 to complete
- `reload_restores_reconciled_favs` (BR-2.3, BR-3.1) - needs Task 6 to complete

**Scope**: Add `DocumentFavStateService` as the sole owner of `CONFIG_DIR/projects/{project.id}/document-favs.json`, project resolution, validation, and complete-list writes.
**Boundary**: Writes must stay in the documents namespace and must not touch document root configuration or project selector state.

**Creates**:
- `server/services/DocumentFavStateService.ts`
- `server/tests/api/document-favs.test.ts`

**Modifies**:
- `server/controllers/DocumentController.ts`
- `server/routes/documents.ts`

**Must Not Touch**:
- `.mdt-config.toml`
- `/api/documents/configure`
- `/api/documents/content`
- Project config routes
- `/api/config/selector`

**Create/Move**:
- Register `PUT /api/documents/favs`.
- Add controller status mapping for invalid path, unknown project, and accepted writes.

**Exclude**: No generic user-state endpoint, no manual-order UI controls, no migration of Recent storage.

**Anti-duplication**: Use existing project resolution and config directory helpers - do not copy project registry lookup logic into route handlers.

**Duplication Guard**:
- Check existing document services and route handlers before adding path validation or project lookup logic.
- If an equivalent project-scoped JSON state helper exists, reuse it rather than adding a parallel owner.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bun run --cwd server jest tests/api/document-favs.test.ts --runInBand
```

**Done when**:
- [ ] Integration tests GREEN.
- [ ] Writes use `CONFIG_DIR/projects/{project.id}/document-favs.json`.
- [ ] Unknown projects create no state file.
- [ ] `.mdt-config.toml` and rejected routes are untouched.
- [ ] No duplicated logic.

### Task 3: Enrich document reads with reconciled fav metadata

**Milestone**: M1 - Durable backend state and read enrichment (BR-2.3, BR-3.1, BR-3.3)

**Structure**: `server/services/DocumentFavStateService.ts`; `server/services/DocumentService.ts`; `server/services/TreeService.ts`; `server/controllers/DocumentController.ts`; `server/routes/documents.ts`; `server/tests/api/documents.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-tree-fav-reconciliation` -> `server/tests/api/documents.test.ts`: GET /api/documents enriches eligible nodes and reconciles deleted outside-root ticket-path and malformed favs

**Enables (BDD)**:
- `reload_restores_reconciled_favs` (BR-2.3, BR-3.1) - needs Task 6 to complete
- `ordered_write_preserves_existing_navigation` (BR-3.2, BR-3.3) - needs Task 6 to complete

**Scope**: Reconcile stored favs against the eligible tree and enrich `GET /api/documents` nodes with `favorite` and `favoritedAt`.
**Boundary**: `TreeService` remains the eligibility source; `DocumentService` coordinates enrichment only.

**Creates**:
- No new files

**Modifies**:
- `server/services/DocumentFavStateService.ts`
- `server/services/DocumentService.ts`
- `server/services/TreeService.ts`
- `server/controllers/DocumentController.ts`
- `server/routes/documents.ts`
- `server/tests/api/documents.test.ts`

**Must Not Touch**:
- Frontend component behavior
- `src/config/documentNavigation.ts`
- Document root configuration write paths
- Ticket files under `docs/CRs`

**Create/Move**:
- Add read-time reconciliation for deleted, outside-root, non-markdown, ticket-path, malformed, and missing state cases.

**Exclude**: No frontend-side eligibility reimplementation, no content route changes, no recent-list merge.

**Anti-duplication**: Call `TreeService` eligibility/tree output - do not copy root/max-depth/exclude/ticketsPath logic into `DocumentFavStateService`.

**Duplication Guard**:
- Check `TreeService` and `DocumentService` for existing eligibility helpers before coding.
- If reconciliation logic starts appearing in more than one service, extract it back into `DocumentFavStateService`.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bun run --cwd server jest tests/api/documents.test.ts --runInBand
```

**Done when**:
- [ ] Integration tests GREEN.
- [ ] GET enrichment preserves non-favorite node behavior.
- [ ] Deleted, outside-root, `docs/CRs`, and malformed stored favs are ignored or removed.
- [ ] No duplicated logic.

### Task 4: Add tree row fav controls and folder locate behavior

**Skills**: frontend-react-component, playwright-skill

**Milestone**: M2 - Reusable Documents View fav UI (BR-1.1, BR-1.2, BR-1.5, BR-2.1, BR-2.2)

**Structure**: `src/components/DocumentsView/FileTree.tsx`; `src/components/DocumentsView/FileTree.test.tsx`; `src/styles/entities/fav-star.css`; `src/components/shared/Icon.tsx`; `src/components/ProjectSelector/ProjectSelectorCard.tsx`; `tests/e2e/utils/selectors.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-file-tree-fav-controls` -> `src/components/DocumentsView/FileTree.test.tsx`: FileTree renders reusable fav star controls isolates star clicks and locates folder favorites

**Enables (BDD)**:
- `folder_fav_appears_active` (BR-1.1, BR-1.3, BR-1.5) - needs Task 6 to complete
- `markdown_fav_appears_active` (BR-1.2, BR-1.3, BR-1.5) - needs Task 6 to complete
- `document_fav_opens_document` (BR-2.1) - needs Task 6 to complete
- `folder_fav_locates_folder` (BR-2.2) - needs Task 6 to complete

**Scope**: Add file and folder row star controls, click isolation, active/inactive state, and locate-by-path behavior needed for folder favs.
**Boundary**: Preserve existing row compactness and existing file/folder selection semantics.

**Creates**:
- No new files

**Modifies**:
- `src/components/DocumentsView/FileTree.tsx`
- `src/components/DocumentsView/FileTree.test.tsx`
- `src/styles/entities/fav-star.css`
- `src/components/shared/Icon.tsx`
- `src/components/ProjectSelector/ProjectSelectorCard.tsx` only if reusable star extraction is required
- `tests/e2e/utils/selectors.ts`

**Must Not Touch**:
- `src/config/documentNavigation.ts`
- `src/components/DocumentsView/RecentDocuments.tsx`
- Backend persistence routes

**Create/Move**:
- Add selectors for tree fav stars and located folder rows.
- Add focus/title/accessibility assertions matching the project favorite star pattern.

**Exclude**: No Favs section rendering, no new row height.

**Anti-duplication**: Reuse `src/styles/entities/fav-star.css` and existing star/icon patterns from `src/components/ProjectSelector/ProjectSelectorCard.tsx` - do not duplicate icon SVG or CSS states.

**Duplication Guard**:
- Check `ProjectSelectorCard` and shared icon styles before adding visual state code.
- If another fav-star helper exists, route FileTree through that helper.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bun test src/components/DocumentsView/FileTree.test.tsx
```

**Done when**:
- [ ] FileTree tests GREEN.
- [ ] C6 active/inactive/hover/focus/title/accessibility pattern is preserved.
- [ ] Folder locate expands ancestors without treating folders as content.
- [ ] Sidebar row height stays compact.
- [ ] No duplicated logic.

### Task 5: Render compact Favs section above Recent

**Skills**: frontend-react-component

**Milestone**: M2 - Reusable Documents View fav UI (BR-1.3, BR-1.4, BR-1.5, BR-1.6, BR-3.3)

**Structure**: `src/components/DocumentsView/FavDocuments.tsx`; `src/components/DocumentsView/FavDocuments.test.tsx`; `src/components/DocumentsView/DocumentsLayout.tsx`; `src/components/DocumentsView/documents-view.css`; `src/components/DocumentsView/RecentDocuments.tsx`; `src/config/documentNavigation.ts`; `src/styles/entities/fav-star.css`

**Makes GREEN (Automated Tests)**:
- `TEST-fav-documents-component` -> `src/components/DocumentsView/FavDocuments.test.tsx`: FavDocuments renders compact Favs rows active star removal accessibility five-row preview and Show all or Show less behavior

**Enables (BDD)**:
- `empty_favs_section_is_hidden` (BR-1.4) - needs Task 6 to complete
- `active_star_removes_fav` (BR-1.6, BR-1.4) - needs Task 6 to complete
- `ordered_write_preserves_existing_navigation` (BR-3.2, BR-3.3) - needs Task 6 to complete

**Scope**: Render Favs above Recent only when reconciled favs exist, with active star removal controls, a five-row preview, and inline `Show all` / `Show less` for six or more favs.
**Boundary**: Favs and Recent stay outside the All Documents scroll area; Recent remains automatic and browser-local.

**Creates**:
- `src/components/DocumentsView/FavDocuments.tsx`
- `src/components/DocumentsView/FavDocuments.test.tsx`

**Modifies**:
- `src/components/DocumentsView/DocumentsLayout.tsx`
- `src/components/DocumentsView/documents-view.css`
- `src/components/DocumentsView/RecentDocuments.tsx`
- `src/config/documentNavigation.ts`
- `src/styles/entities/fav-star.css`

**Must Not Touch**:
- Backend write route ownership
- `server/services/DocumentFavStateService.ts`
- `/api/documents/configure`
- Project selector state

**Create/Move**:
- Add Favs section layout above Recent.
- Add row removal action for active star controls.
- Add five-row preview and trailing `Show all` / `Show less` header action for overflow favs.

**Exclude**: No manual sorting UI, no drag reorder, no empty Favs placeholder, no nested scroll or popover overflow.

**Anti-duplication**: Import existing document navigation helpers from `src/config/documentNavigation.ts` only for Recent behavior - do not merge favs into Recent storage.

**Duplication Guard**:
- Check `RecentDocuments.tsx` and `DocumentsLayout.tsx` for existing sidebar section primitives before adding markup.
- If Favs rendering duplicates Recent internals, extract shared presentational helpers only when it reduces duplication without merging state.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bun test src/components/DocumentsView/FavDocuments.test.tsx
```

**Done when**:
- [ ] Component tests GREEN.
- [ ] Empty Favs is hidden.
- [ ] Populated Favs appears above Recent.
- [ ] C10 caps the preview at five rows and exposes `Show all` / `Show less` for overflow.
- [ ] Existing Recent behavior remains unchanged.
- [ ] No duplicated logic.

### Task 6: Wire end-to-end document fav workflows

**Skills**: frontend-react-component, playwright-skill

**Milestone**: M3 - Full user workflow (BR-1.1 through BR-3.3)

**Structure**: `src/components/DocumentsView/DocumentsLayout.tsx`; `src/components/DocumentsView/FileTree.tsx`; `src/components/DocumentsView/FavDocuments.tsx`; `src/config/documentFavs.ts`; `src/components/DocumentsView/RecentDocuments.tsx`; `src/config/documentNavigation.ts`; `tests/e2e/documents/favs.spec.ts`; `tests/e2e/utils/selectors.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-documents-favs-e2e` -> `tests/e2e/documents/favs.spec.ts`: Documents favs support add remove reload document open folder locate and preserve Recent and All Documents

**Makes GREEN (Behavior)**:
- `folder_fav_appears_active` -> `tests/e2e/documents/favs.spec.ts` (BR-1.1, BR-1.3, BR-1.5)
- `markdown_fav_appears_active` -> `tests/e2e/documents/favs.spec.ts` (BR-1.2, BR-1.3, BR-1.5)
- `empty_favs_section_is_hidden` -> `tests/e2e/documents/favs.spec.ts` (BR-1.4)
- `active_star_removes_fav` -> `tests/e2e/documents/favs.spec.ts` (BR-1.6, BR-1.4)
- `document_fav_opens_document` -> `tests/e2e/documents/favs.spec.ts` (BR-2.1)
- `folder_fav_locates_folder` -> `tests/e2e/documents/favs.spec.ts` (BR-2.2)
- `reload_restores_reconciled_favs` -> `tests/e2e/documents/favs.spec.ts` (BR-2.3, BR-3.1)
- `ordered_write_preserves_existing_navigation` -> `tests/e2e/documents/favs.spec.ts` (BR-3.2, BR-3.3)

**Scope**: Wire read metadata, optimistic updates, complete-list writes, document opening, folder locating, reload restore, and preservation of Recent/All Documents.
**Boundary**: This is the first task that may claim executable BDD coverage because UI, backend, routes, and E2E selectors are integrated.

**Creates**:
- `tests/e2e/documents/favs.spec.ts`

**Modifies**:
- `src/components/DocumentsView/DocumentsLayout.tsx`
- `src/components/DocumentsView/FileTree.tsx`
- `src/components/DocumentsView/FavDocuments.tsx`
- `src/config/documentFavs.ts`
- `src/components/DocumentsView/RecentDocuments.tsx`
- `src/config/documentNavigation.ts`
- `tests/e2e/utils/selectors.ts`

**Must Not Touch**:
- `.mdt-config.toml`
- `/api/documents/configure`
- `/api/documents/content`
- Project config routes
- Project selector state routes

**Create/Move**:
- Add E2E data setup for eligible folders, markdown documents, excluded ticket paths, and reload checks.
- Add selectors for fav section, fav rows, fav stars, tree stars, and located folder rows.

**Exclude**: No full-text search, no ticket navigation changes, no document root configuration changes.

**Anti-duplication**: Use `src/config/documentFavs.ts` for API writes and existing Documents View navigation helpers for document/folder selection - do not create ad hoc fetches inside components.

**Duplication Guard**:
- Check `DocumentsLayout`, `FileTree`, and `FavDocuments` ownership before adding state transitions.
- If write orchestration appears in more than one component, keep it in `DocumentsLayout` and pass callbacks down.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bunx playwright test tests/e2e/documents/favs.spec.ts --project=chromium
```

**Done when**:
- [ ] E2E scenario tests GREEN.
- [ ] All listed BDD scenarios GREEN.
- [ ] C6 star state pattern is visible in E2E.
- [ ] C10 five-row preview and `Show all` / `Show less` are verified.
- [ ] Recent and All Documents still work.
- [ ] No duplicated logic.

### Task 7: Run full verification and guard against ownership drift

**Skills**: playwright-skill

**Milestone**: M3 - Full user workflow verification

**Structure**: `server/tests/api/document-favs.test.ts`; `server/tests/api/documents.test.ts`; `src/config/documentFavs.test.ts`; `src/components/DocumentsView/FavDocuments.test.tsx`; `src/components/DocumentsView/FileTree.test.tsx`; `tests/e2e/documents/favs.spec.ts`; `tests/e2e/utils/selectors.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-fav-state-schema` -> `src/config/documentFavs.test.ts`: schema and fallback
- `TEST-document-fav-storage-owner` -> `server/tests/api/document-favs.test.ts`: CONFIG_DIR owner and project resolution
- `TEST-document-fav-write-route` -> `server/tests/api/document-favs.test.ts`: complete-list writes and unsafe target rejection
- `TEST-document-favs-api-client` -> `src/config/documentFavs.test.ts`: narrow frontend endpoint
- `TEST-document-tree-fav-reconciliation` -> `server/tests/api/documents.test.ts`: read enrichment and reconciliation
- `TEST-fav-documents-component` -> `src/components/DocumentsView/FavDocuments.test.tsx`: compact Favs rows, five-row preview, and Show all or Show less behavior
- `TEST-file-tree-fav-controls` -> `src/components/DocumentsView/FileTree.test.tsx`: tree row stars and folder locate
- `TEST-documents-favs-e2e` -> `tests/e2e/documents/favs.spec.ts`: full workflow

**Scope**: Run the focused regression set and inspect for ownership drift against the architecture decisions.
**Boundary**: Fix only MDT-171 regressions found by these tests; unrelated failures become blockers with evidence.

**Creates**:
- No new files

**Modifies**:
- `server/tests/api/document-favs.test.ts`
- `server/tests/api/documents.test.ts`
- `src/config/documentFavs.test.ts`
- `src/components/DocumentsView/FavDocuments.test.tsx`
- `src/components/DocumentsView/FileTree.test.tsx`
- `tests/e2e/documents/favs.spec.ts`
- `tests/e2e/utils/selectors.ts`

**Must Not Touch**:
- Unrelated runtime code not listed in MDT-171 architecture
- Server restart scripts
- Project configuration persistence routes

**Create/Move**:
- Update assertions only to reflect final implementation behavior and stable selectors.

**Exclude**: No broad refactors, no new feature scope beyond inline `Show all` / `Show less`, no generic user-state endpoint.

**Anti-duplication**: Use the same test utilities and selectors from `tests/e2e/utils/selectors.ts` - do not define parallel selector strings in specs.

**Duplication Guard**:
- Check the final diff for multiple fav persistence owners, multiple frontend API clients, or copied star styles.
- If duplicated logic exists, add or perform a merge/refactor before declaring completion.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bun run --cwd server jest tests/api/document-favs.test.ts tests/api/documents.test.ts --runInBand
bun test src/config/documentFavs.test.ts src/components/DocumentsView/FavDocuments.test.tsx src/components/DocumentsView/FileTree.test.tsx
bunx playwright test tests/e2e/documents/favs.spec.ts --project=chromium
spec-trace validate MDT-171 --stage tasks
```

**Done when**:
- [ ] All unit/integration tests GREEN.
- [ ] All BDD scenarios GREEN.
- [ ] No duplicated logic.
- [ ] Smoke test passes with real execution.
- [ ] Fallback/absence paths match requirements.
- [ ] Ownership boundaries match architecture.

## Post-Implementation

- [ ] No duplication (service, API client, selectors, star styles)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Smoke test passes
- [ ] Fallback/absence paths match requirements
- [ ] No fav writes through `.mdt-config.toml`, `/api/documents/configure`, content route, project config route, or selector route

## Post-Verify Fixes (appended by implement-agentic)

- Added only if `/mdt:verify-complete` finds CRITICAL/HIGH issues.
- Each fix references issue evidence and required action.
