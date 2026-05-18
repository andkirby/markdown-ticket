# Tasks

## Task List

- Create missing document fav stubs and test shells (`TASK-0`)
  Owns: `ART-e2e-document-favs-spec`, `ART-server-document-fav-state-service`, `ART-server-document-favs-api-test`, `ART-src-document-favs-api`, `ART-src-document-favs-api-test`, `ART-src-document-favs-component`, `ART-src-document-favs-test`
  Makes Green: -
- Add typed document fav state contracts and client API (`TASK-1`)
  Owns: `ART-domain-contracts-app-config-schema`, `ART-domain-contracts-app-config-validation`, `ART-src-document-favs-api`, `ART-src-document-favs-api-test`
  Makes Green: `TEST-document-fav-state-schema`, `TEST-document-favs-api-client`
  Skills: `frontend-react-component`
- Implement backend fav state owner and write endpoint (`TASK-2`)
  Owns: `ART-server-document-controller`, `ART-server-document-fav-state-service`, `ART-server-document-favs-api-test`, `ART-server-documents-route`
  Makes Green: `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route`
- Enrich document reads with reconciled fav metadata (`TASK-3`)
  Owns: `ART-server-document-controller`, `ART-server-document-fav-state-service`, `ART-server-document-service`, `ART-server-documents-api-test`, `ART-server-documents-route`, `ART-server-tree-service`
  Makes Green: `TEST-document-tree-fav-reconciliation`
- Add tree row fav controls and folder locate behavior (`TASK-4`)
  Owns: `ART-e2e-selectors`, `ART-src-fav-star-css`, `ART-src-file-tree`, `ART-src-file-tree-test`, `ART-src-project-selector-card`, `ART-src-shared-icon`
  Makes Green: `TEST-file-tree-fav-controls`
  Skills: `frontend-react-component`, `playwright-skill`
- Render compact Favs section above Recent (`TASK-5`)
  Owns: `ART-src-document-favs-component`, `ART-src-document-favs-test`, `ART-src-document-navigation`, `ART-src-documents-css`, `ART-src-documents-layout`, `ART-src-fav-star-css`, `ART-src-recent-documents`
  Makes Green: `TEST-fav-documents-component`
  Skills: `frontend-react-component`
- Wire end-to-end document fav workflows (`TASK-6`)
  Owns: `ART-e2e-document-favs-spec`, `ART-e2e-selectors`, `ART-src-document-favs-api`, `ART-src-document-favs-component`, `ART-src-document-navigation`, `ART-src-documents-layout`, `ART-src-file-tree`, `ART-src-recent-documents`
  Makes Green: `active_star_removes_fav`, `document_fav_opens_document`, `empty_favs_section_is_hidden`, `folder_fav_appears_active`, `folder_fav_locates_folder`, `markdown_fav_appears_active`, `ordered_write_preserves_existing_navigation`, `reload_restores_reconciled_favs`, `TEST-documents-favs-e2e`
  Skills: `frontend-react-component`, `playwright-skill`
- Run full verification and guard against ownership drift (`TASK-7`)
  Owns: `ART-e2e-document-favs-spec`, `ART-e2e-selectors`, `ART-server-document-favs-api-test`, `ART-server-documents-api-test`, `ART-src-document-favs-api-test`, `ART-src-document-favs-test`, `ART-src-file-tree-test`
  Makes Green: `TEST-document-fav-state-schema`, `TEST-document-fav-storage-owner`, `TEST-document-fav-write-route`, `TEST-document-favs-api-client`, `TEST-document-tree-fav-reconciliation`, `TEST-documents-favs-e2e`, `TEST-fav-documents-component`, `TEST-file-tree-fav-controls`
  Skills: `playwright-skill`

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| `ART-domain-contracts-app-config-schema` | `TASK-1` |
| `ART-domain-contracts-app-config-validation` | `TASK-1` |
| `ART-e2e-document-favs-spec` | `TASK-0`, `TASK-6`, `TASK-7` |
| `ART-e2e-selectors` | `TASK-4`, `TASK-6`, `TASK-7` |
| `ART-server-document-controller` | `TASK-2`, `TASK-3` |
| `ART-server-document-fav-state-service` | `TASK-0`, `TASK-2`, `TASK-3` |
| `ART-server-document-favs-api-test` | `TASK-0`, `TASK-2`, `TASK-7` |
| `ART-server-document-service` | `TASK-3` |
| `ART-server-documents-api-test` | `TASK-3`, `TASK-7` |
| `ART-server-documents-route` | `TASK-2`, `TASK-3` |
| `ART-server-tree-service` | `TASK-3` |
| `ART-src-document-favs-api` | `TASK-0`, `TASK-1`, `TASK-6` |
| `ART-src-document-favs-api-test` | `TASK-0`, `TASK-1`, `TASK-7` |
| `ART-src-document-favs-component` | `TASK-0`, `TASK-5`, `TASK-6` |
| `ART-src-document-favs-test` | `TASK-0`, `TASK-5`, `TASK-7` |
| `ART-src-document-navigation` | `TASK-5`, `TASK-6` |
| `ART-src-documents-css` | `TASK-5` |
| `ART-src-documents-layout` | `TASK-5`, `TASK-6` |
| `ART-src-fav-star-css` | `TASK-4`, `TASK-5` |
| `ART-src-file-tree` | `TASK-4`, `TASK-6` |
| `ART-src-file-tree-test` | `TASK-4`, `TASK-7` |
| `ART-src-project-selector-card` | `TASK-4` |
| `ART-src-recent-documents` | `TASK-5`, `TASK-6` |
| `ART-src-shared-icon` | `TASK-4` |

## Makes Green Summary

| ID | Task IDs |
|---|---|
| `active_star_removes_fav` | `TASK-6` |
| `document_fav_opens_document` | `TASK-6` |
| `empty_favs_section_is_hidden` | `TASK-6` |
| `folder_fav_appears_active` | `TASK-6` |
| `folder_fav_locates_folder` | `TASK-6` |
| `markdown_fav_appears_active` | `TASK-6` |
| `ordered_write_preserves_existing_navigation` | `TASK-6` |
| `reload_restores_reconciled_favs` | `TASK-6` |
| `TEST-document-fav-state-schema` | `TASK-1`, `TASK-7` |
| `TEST-document-fav-storage-owner` | `TASK-2`, `TASK-7` |
| `TEST-document-fav-write-route` | `TASK-2`, `TASK-7` |
| `TEST-document-favs-api-client` | `TASK-1`, `TASK-7` |
| `TEST-document-tree-fav-reconciliation` | `TASK-3`, `TASK-7` |
| `TEST-documents-favs-e2e` | `TASK-6`, `TASK-7` |
| `TEST-fav-documents-component` | `TASK-5`, `TASK-7` |
| `TEST-file-tree-fav-controls` | `TASK-4`, `TASK-7` |
