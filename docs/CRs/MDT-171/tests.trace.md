# Test Plan

## Test Plans By Kind

### unit

- Document fav schema validates ordered file and folder records and falls back for invalid state (`TEST-document-fav-state-schema`)
  Covers: `C4`, `C7`, `Edge-4`, `OBL-document-fav-state-schema`
  File: `src/config/documentFavs.test.ts`
- Frontend document fav API writes complete ordered lists through the narrow fav endpoint only (`TEST-document-favs-api-client`)
  Covers: `BR-3.2`, `C4`, `C9`, `OBL-document-fav-state-schema`, `OBL-documents-fav-write-route`
  File: `src/config/documentFavs.test.ts`

### integration

- DocumentFavStateService persists only CONFIG_DIR project fav state and resolves project id or code (`TEST-document-fav-storage-owner`)
  Covers: `BR-2.3`, `BR-3.2`, `C1`, `C2`, `C3`, `C9`, `Edge-5`, `OBL-document-fav-storage-owner`
  File: `server/tests/api/document-favs.test.ts`
- PUT /api/documents/favs validates complete ordered fav writes and rejects unsafe or unknown targets (`TEST-document-fav-write-route`)
  Covers: `BR-1.1`, `BR-1.2`, `BR-1.6`, `BR-3.2`, `C3`, `C4`, `C5`, `C7`, `C9`, `Edge-5`, `OBL-documents-fav-write-route`
  File: `server/tests/api/document-favs.test.ts`
- GET /api/documents enriches eligible nodes and reconciles deleted outside-root ticket-path and malformed favs (`TEST-document-tree-fav-reconciliation`)
  Covers: `BR-2.3`, `BR-3.1`, `BR-3.3`, `C5`, `C7`, `C9`, `Edge-1`, `Edge-2`, `Edge-3`, `Edge-4`, `OBL-document-tree-reconciliation`, `OBL-documents-read-enrichment`
  File: `server/tests/api/documents.test.ts`
- FavDocuments renders compact Favs rows active star removal accessibility five-row preview and Show all or Show less behavior (`TEST-fav-documents-component`)
  Covers: `BR-1.3`, `BR-1.4`, `BR-1.5`, `BR-1.6`, `C6`, `C8`, `C10`, `OBL-document-star-visual-contract`, `OBL-documents-view-favs-section`
  File: `src/components/DocumentsView/FavDocuments.test.tsx`
- FileTree renders reusable fav star controls isolates star clicks and locates folder favorites (`TEST-file-tree-fav-controls`)
  Covers: `BR-1.1`, `BR-1.2`, `BR-1.5`, `BR-2.1`, `BR-2.2`, `C6`, `C8`, `OBL-document-fav-navigation-flow`, `OBL-document-star-visual-contract`
  File: `src/components/DocumentsView/FileTree.test.tsx`

### e2e

- Documents favs support add remove reload document open folder locate and preserve Recent and All Documents (`TEST-documents-favs-e2e`)
  Covers: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-1.5`, `BR-1.6`, `BR-2.1`, `BR-2.2`, `BR-2.3`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `C6`, `C8`, `C10`, `OBL-document-fav-navigation-flow`, `OBL-document-favs-verification-contract`, `OBL-documents-view-favs-section`, `OBL-existing-navigation-preservation`
  File: `tests/e2e/documents/favs.spec.ts`

## Requirement Coverage Summary

| Requirement ID | Route Policy | Direct Test Plans | Indirect Test Plans |
|---|---|---|---|
| `C1` | tests | `TEST-document-fav-storage-owner` | `TEST-document-fav-state-schema`, `TEST-document-fav-storage-owner`, `TEST-document-favs-api-client`, `TEST-documents-favs-e2e` |
| `C2` | tests | `TEST-document-fav-storage-owner` | `TEST-document-fav-storage-owner`, `TEST-documents-favs-e2e` |
| `C3` | tests | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route` | `TEST-document-fav-state-schema`, `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-documents-favs-e2e` |
| `C4` | tests | `TEST-document-fav-state-schema`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client` | `TEST-document-fav-state-schema`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-documents-favs-e2e` |
| `C5` | tests | `TEST-document-fav-write-route`, `TEST-document-tree-fav-reconciliation` | `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-document-tree-fav-reconciliation`, `TEST-documents-favs-e2e` |
| `C6` | tests | `TEST-documents-favs-e2e`, `TEST-fav-documents-component`, `TEST-file-tree-fav-controls` | `TEST-documents-favs-e2e`, `TEST-fav-documents-component`, `TEST-file-tree-fav-controls` |
| `C7` | tests | `TEST-document-fav-state-schema`, `TEST-document-fav-write-route`, `TEST-document-tree-fav-reconciliation` | `TEST-document-fav-state-schema`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-document-tree-fav-reconciliation`, `TEST-documents-favs-e2e` |
| `C8` | tests | `TEST-documents-favs-e2e`, `TEST-fav-documents-component`, `TEST-file-tree-fav-controls` | `TEST-documents-favs-e2e`, `TEST-fav-documents-component`, `TEST-file-tree-fav-controls` |
| `C9` | tests | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-document-tree-fav-reconciliation` | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-document-tree-fav-reconciliation`, `TEST-documents-favs-e2e` |
| `C10` | tests | `TEST-documents-favs-e2e`, `TEST-fav-documents-component` | `TEST-documents-favs-e2e`, `TEST-fav-documents-component` |
| `Edge-1` | tests | `TEST-document-tree-fav-reconciliation` | `TEST-document-tree-fav-reconciliation`, `TEST-documents-favs-e2e` |
| `Edge-2` | tests | `TEST-document-tree-fav-reconciliation` | `TEST-document-tree-fav-reconciliation`, `TEST-documents-favs-e2e` |
| `Edge-3` | tests | `TEST-document-tree-fav-reconciliation` | `TEST-document-tree-fav-reconciliation`, `TEST-documents-favs-e2e` |
| `Edge-4` | tests | `TEST-document-fav-state-schema`, `TEST-document-tree-fav-reconciliation` | `TEST-document-fav-state-schema`, `TEST-document-favs-api-client`, `TEST-document-tree-fav-reconciliation`, `TEST-documents-favs-e2e` |
| `Edge-5` | tests | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route` | `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-documents-favs-e2e` |

## Obligation Coverage Summary

| Obligation ID | Derived Requirement IDs | Test Plan IDs |
|---|---|---|
| `OBL-document-fav-navigation-flow` | `BR-2.1`, `BR-2.2`, `BR-3.3`, `C8` | `TEST-documents-favs-e2e`, `TEST-file-tree-fav-controls` |
| `OBL-document-fav-state-schema` | `BR-3.2`, `C1`, `C3`, `C4`, `C7`, `Edge-4` | `TEST-document-fav-state-schema`, `TEST-document-favs-api-client` |
| `OBL-document-fav-storage-owner` | `BR-2.3`, `BR-3.2`, `C1`, `C2`, `C3`, `C9`, `Edge-5` | `TEST-document-fav-storage-owner` |
| `OBL-document-favs-verification-contract` | `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-1.5`, `BR-1.6`, `BR-2.1`, `BR-2.2`, `BR-2.3`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `C1`, `C2`, `C3`, `C4`, `C5`, `C6`, `C7`, `C8`, `C9`, `C10`, `Edge-1`, `Edge-2`, `Edge-3`, `Edge-4`, `Edge-5` | `TEST-documents-favs-e2e` |
| `OBL-document-star-visual-contract` | `BR-1.1`, `BR-1.2`, `BR-1.5`, `BR-1.6`, `C6` | `TEST-fav-documents-component`, `TEST-file-tree-fav-controls` |
| `OBL-document-tree-reconciliation` | `BR-2.3`, `BR-3.1`, `C5`, `C7`, `Edge-1`, `Edge-2`, `Edge-3`, `Edge-4` | `TEST-document-tree-fav-reconciliation` |
| `OBL-documents-fav-write-route` | `BR-1.1`, `BR-1.2`, `BR-1.6`, `BR-3.2`, `C3`, `C4`, `C5`, `C7`, `C9`, `Edge-5` | `TEST-document-fav-write-route`, `TEST-document-favs-api-client` |
| `OBL-documents-read-enrichment` | `BR-2.3`, `BR-3.1`, `BR-3.3`, `C5`, `C9` | `TEST-document-tree-fav-reconciliation` |
| `OBL-documents-view-favs-section` | `BR-1.3`, `BR-1.4`, `BR-3.3`, `C8`, `C10` | `TEST-documents-favs-e2e`, `TEST-fav-documents-component` |
| `OBL-existing-navigation-preservation` | `BR-3.3`, `C8`, `C9` | `TEST-documents-favs-e2e` |
