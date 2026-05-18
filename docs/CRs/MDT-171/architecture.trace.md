# Architecture

## Obligations

- Document fav selection opens and selects markdown documents; folder fav selection expands ancestors and locates the folder row through FileTree without turning folders into content views. (`OBL-document-fav-navigation-flow`)
  Derived From: `BR-2.1`, `BR-2.2`, `BR-3.3`, `C8`
  Artifacts: `ART-src-documents-layout`, `ART-src-document-favs-component`, `ART-src-file-tree`, `ART-src-file-tree-test`, `ART-e2e-document-favs-spec`, `ART-e2e-selectors`
- Document fav state is a typed JSON object with favItems ordered by array position and records containing project-relative path, file-or-folder type, and favoritedAt. (`OBL-document-fav-state-schema`)
  Derived From: `BR-3.2`, `C1`, `C3`, `C4`, `C7`, `Edge-4`
  Artifacts: `ART-domain-contracts-app-config-schema`, `ART-domain-contracts-app-config-validation`, `ART-server-document-fav-state-service`, `ART-src-document-favs-api`, `ART-src-document-favs-api-test`
- DocumentFavStateService owns CONFIG_DIR/projects/{project.id}/document-favs.json, resolves lookup input to canonical project.id, creates no state for unknown projects, and never writes .mdt-config.toml. (`OBL-document-fav-storage-owner`)
  Derived From: `BR-2.3`, `BR-3.2`, `C1`, `C2`, `C3`, `C9`, `Edge-5`
  Artifacts: `ART-server-document-fav-state-service`, `ART-server-document-controller`, `ART-server-documents-route`, `ART-server-document-favs-api-test`
- Tests must cover API persistence and reconciliation, schema fallback, endpoint separation, star states, five-row preview, `Show all` / `Show less`, reload persistence, document open, folder locate, and existing Recent/All Documents preservation. (`OBL-document-favs-verification-contract`)
  Derived From: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-1.5`, `BR-1.6`, `BR-2.1`, `BR-2.2`, `BR-2.3`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `C1`, `C2`, `C3`, `C4`, `C5`, `C6`, `C7`, `C8`, `C9`, `C10`, `Edge-1`, `Edge-2`, `Edge-3`, `Edge-4`, `Edge-5`
  Artifacts: `ART-server-document-favs-api-test`, `ART-server-documents-api-test`, `ART-src-document-favs-test`, `ART-src-file-tree-test`, `ART-src-document-favs-api-test`, `ART-e2e-document-favs-spec`, `ART-e2e-selectors`
- Document tree and fav row star controls reuse the project favorite star active, inactive, hover, focus, title, and accessible-label pattern; active stars remove favs. (`OBL-document-star-visual-contract`)
  Derived From: `BR-1.1`, `BR-1.2`, `BR-1.5`, `BR-1.6`, `C6`
  Artifacts: `ART-src-file-tree`, `ART-src-document-favs-component`, `ART-src-fav-star-css`, `ART-src-shared-icon`, `ART-src-project-selector-card`, `ART-src-document-favs-test`, `ART-src-file-tree-test`, `ART-e2e-selectors`
- Fav reads and writes reconcile stored paths against TreeService document eligibility so only eligible folders and markdown documents remain usable. (`OBL-document-tree-reconciliation`)
  Derived From: `BR-2.3`, `BR-3.1`, `C5`, `C7`, `Edge-1`, `Edge-2`, `Edge-3`, `Edge-4`
  Artifacts: `ART-server-document-fav-state-service`, `ART-server-document-service`, `ART-server-tree-service`, `ART-server-documents-api-test`, `ART-server-document-favs-api-test`
- PUT /api/documents/favs is the narrow documents-namespace write endpoint for complete ordered fav state and must not use /api/documents/configure, content, project config, or selector endpoints. (`OBL-documents-fav-write-route`)
  Derived From: `BR-1.1`, `BR-1.2`, `BR-1.6`, `BR-3.2`, `C3`, `C4`, `C5`, `C7`, `C9`, `Edge-5`
  Artifacts: `ART-server-documents-route`, `ART-server-document-controller`, `ART-server-document-fav-state-service`, `ART-src-document-favs-api`, `ART-server-document-favs-api-test`
- GET /api/documents remains the tree read endpoint and may enrich eligible nodes with favorite and favoritedAt metadata without changing non-favorite tree behavior. (`OBL-documents-read-enrichment`)
  Derived From: `BR-2.3`, `BR-3.1`, `BR-3.3`, `C5`, `C9`
  Artifacts: `ART-server-documents-route`, `ART-server-document-controller`, `ART-server-document-service`, `ART-server-tree-service`, `ART-src-documents-layout`, `ART-server-documents-api-test`
- DocumentsLayout owns the sidebar composition, renders Favs above Recent only when reconciled favs exist, keeps Favs and Recent outside the tree scroll area, and uses a five-row Favs preview with inline `Show all` / `Show less` for overflow favs. (`OBL-documents-view-favs-section`)
  Derived From: `BR-1.3`, `BR-1.4`, `BR-3.3`, `C8`, `C10`
  Artifacts: `ART-src-documents-layout`, `ART-src-document-favs-component`, `ART-src-documents-css`, `ART-src-recent-documents`, `ART-src-document-navigation`, `ART-src-document-favs-test`, `ART-e2e-document-favs-spec`
- Recent remains browser-local and All Documents remains the complete eligible tree; document fav state is additive and must not change existing Recent, content, sort, search, or configure behavior. (`OBL-existing-navigation-preservation`)
  Derived From: `BR-3.3`, `C8`, `C9`
  Artifacts: `ART-src-documents-layout`, `ART-src-recent-documents`, `ART-src-document-navigation`, `ART-src-file-tree`, `ART-server-documents-route`, `ART-server-document-service`, `ART-server-documents-api-test`, `ART-e2e-document-favs-spec`

## Artifacts

| Artifact ID | Path | Kind | Referencing Obligations |
|---|---|---|---|
| `ART-domain-contracts-app-config-schema` | `domain-contracts/src/app-config/schema.ts` | runtime | `OBL-document-fav-state-schema` |
| `ART-domain-contracts-app-config-validation` | `domain-contracts/src/app-config/validation.ts` | runtime | `OBL-document-fav-state-schema` |
| `ART-e2e-document-favs-spec` | `tests/e2e/documents/favs.spec.ts` | test | `OBL-document-fav-navigation-flow`, `OBL-document-favs-verification-contract`, `OBL-documents-view-favs-section`, `OBL-existing-navigation-preservation` |
| `ART-e2e-selectors` | `tests/e2e/utils/selectors.ts` | test | `OBL-document-fav-navigation-flow`, `OBL-document-favs-verification-contract`, `OBL-document-star-visual-contract` |
| `ART-server-document-controller` | `server/controllers/DocumentController.ts` | runtime | `OBL-document-fav-storage-owner`, `OBL-documents-fav-write-route`, `OBL-documents-read-enrichment` |
| `ART-server-document-fav-state-service` | `server/services/DocumentFavStateService.ts` | runtime | `OBL-document-fav-state-schema`, `OBL-document-fav-storage-owner`, `OBL-document-tree-reconciliation`, `OBL-documents-fav-write-route` |
| `ART-server-document-favs-api-test` | `server/tests/api/document-favs.test.ts` | test | `OBL-document-fav-storage-owner`, `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation`, `OBL-documents-fav-write-route` |
| `ART-server-document-service` | `server/services/DocumentService.ts` | runtime | `OBL-document-tree-reconciliation`, `OBL-documents-read-enrichment`, `OBL-existing-navigation-preservation` |
| `ART-server-documents-api-test` | `server/tests/api/documents.test.ts` | test | `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation`, `OBL-documents-read-enrichment`, `OBL-existing-navigation-preservation` |
| `ART-server-documents-route` | `server/routes/documents.ts` | runtime | `OBL-document-fav-storage-owner`, `OBL-documents-fav-write-route`, `OBL-documents-read-enrichment`, `OBL-existing-navigation-preservation` |
| `ART-server-tree-service` | `server/services/TreeService.ts` | runtime | `OBL-document-tree-reconciliation`, `OBL-documents-read-enrichment` |
| `ART-src-document-favs-api` | `src/config/documentFavs.ts` | runtime | `OBL-document-fav-state-schema`, `OBL-documents-fav-write-route` |
| `ART-src-document-favs-api-test` | `src/config/documentFavs.test.ts` | test | `OBL-document-fav-state-schema`, `OBL-document-favs-verification-contract` |
| `ART-src-document-favs-component` | `src/components/DocumentsView/FavDocuments.tsx` | runtime | `OBL-document-fav-navigation-flow`, `OBL-document-star-visual-contract`, `OBL-documents-view-favs-section` |
| `ART-src-document-favs-test` | `src/components/DocumentsView/FavDocuments.test.tsx` | test | `OBL-document-favs-verification-contract`, `OBL-document-star-visual-contract`, `OBL-documents-view-favs-section` |
| `ART-src-document-navigation` | `src/config/documentNavigation.ts` | runtime | `OBL-documents-view-favs-section`, `OBL-existing-navigation-preservation` |
| `ART-src-documents-css` | `src/components/DocumentsView/documents-view.css` | runtime | `OBL-documents-view-favs-section` |
| `ART-src-documents-layout` | `src/components/DocumentsView/DocumentsLayout.tsx` | runtime | `OBL-document-fav-navigation-flow`, `OBL-documents-read-enrichment`, `OBL-documents-view-favs-section`, `OBL-existing-navigation-preservation` |
| `ART-src-fav-star-css` | `src/styles/entities/fav-star.css` | runtime | `OBL-document-star-visual-contract` |
| `ART-src-file-tree` | `src/components/DocumentsView/FileTree.tsx` | runtime | `OBL-document-fav-navigation-flow`, `OBL-document-star-visual-contract`, `OBL-existing-navigation-preservation` |
| `ART-src-file-tree-test` | `src/components/DocumentsView/FileTree.test.tsx` | test | `OBL-document-fav-navigation-flow`, `OBL-document-favs-verification-contract`, `OBL-document-star-visual-contract` |
| `ART-src-project-selector-card` | `src/components/ProjectSelector/ProjectSelectorCard.tsx` | runtime | `OBL-document-star-visual-contract` |
| `ART-src-recent-documents` | `src/components/DocumentsView/RecentDocuments.tsx` | runtime | `OBL-documents-view-favs-section`, `OBL-existing-navigation-preservation` |
| `ART-src-shared-icon` | `src/components/shared/Icon.tsx` | runtime | `OBL-document-star-visual-contract` |

## Derivation Summary

| Requirement ID | Obligation Count | Obligation IDs |
|---|---:|---|
| `BR-1.1` | 3 | `OBL-document-favs-verification-contract`, `OBL-document-star-visual-contract`, `OBL-documents-fav-write-route` |
| `BR-1.2` | 3 | `OBL-document-favs-verification-contract`, `OBL-document-star-visual-contract`, `OBL-documents-fav-write-route` |
| `BR-1.3` | 2 | `OBL-document-favs-verification-contract`, `OBL-documents-view-favs-section` |
| `BR-1.4` | 2 | `OBL-document-favs-verification-contract`, `OBL-documents-view-favs-section` |
| `BR-1.5` | 2 | `OBL-document-favs-verification-contract`, `OBL-document-star-visual-contract` |
| `BR-1.6` | 3 | `OBL-document-favs-verification-contract`, `OBL-document-star-visual-contract`, `OBL-documents-fav-write-route` |
| `BR-2.1` | 2 | `OBL-document-fav-navigation-flow`, `OBL-document-favs-verification-contract` |
| `BR-2.2` | 2 | `OBL-document-fav-navigation-flow`, `OBL-document-favs-verification-contract` |
| `BR-2.3` | 4 | `OBL-document-fav-storage-owner`, `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation`, `OBL-documents-read-enrichment` |
| `BR-3.1` | 3 | `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation`, `OBL-documents-read-enrichment` |
| `BR-3.2` | 4 | `OBL-document-fav-state-schema`, `OBL-document-fav-storage-owner`, `OBL-document-favs-verification-contract`, `OBL-documents-fav-write-route` |
| `BR-3.3` | 5 | `OBL-document-fav-navigation-flow`, `OBL-document-favs-verification-contract`, `OBL-documents-read-enrichment`, `OBL-documents-view-favs-section`, `OBL-existing-navigation-preservation` |
| `C1` | 3 | `OBL-document-fav-state-schema`, `OBL-document-fav-storage-owner`, `OBL-document-favs-verification-contract` |
| `C2` | 2 | `OBL-document-fav-storage-owner`, `OBL-document-favs-verification-contract` |
| `C3` | 4 | `OBL-document-fav-state-schema`, `OBL-document-fav-storage-owner`, `OBL-document-favs-verification-contract`, `OBL-documents-fav-write-route` |
| `C4` | 3 | `OBL-document-fav-state-schema`, `OBL-document-favs-verification-contract`, `OBL-documents-fav-write-route` |
| `C5` | 4 | `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation`, `OBL-documents-fav-write-route`, `OBL-documents-read-enrichment` |
| `C6` | 2 | `OBL-document-favs-verification-contract`, `OBL-document-star-visual-contract` |
| `C7` | 4 | `OBL-document-fav-state-schema`, `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation`, `OBL-documents-fav-write-route` |
| `C8` | 4 | `OBL-document-fav-navigation-flow`, `OBL-document-favs-verification-contract`, `OBL-documents-view-favs-section`, `OBL-existing-navigation-preservation` |
| `C9` | 5 | `OBL-document-fav-storage-owner`, `OBL-document-favs-verification-contract`, `OBL-documents-fav-write-route`, `OBL-documents-read-enrichment`, `OBL-existing-navigation-preservation` |
| `C10` | 2 | `OBL-document-favs-verification-contract`, `OBL-documents-view-favs-section` |
| `Edge-1` | 2 | `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation` |
| `Edge-2` | 2 | `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation` |
| `Edge-3` | 2 | `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation` |
| `Edge-4` | 3 | `OBL-document-fav-state-schema`, `OBL-document-favs-verification-contract`, `OBL-document-tree-reconciliation` |
| `Edge-5` | 3 | `OBL-document-fav-storage-owner`, `OBL-document-favs-verification-contract`, `OBL-documents-fav-write-route` |
