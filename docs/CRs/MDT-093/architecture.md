# Architecture

## Rationale

This architecture adds hierarchical sub-document navigation to ticket view without changing the underlying CR file format or markdown rendering pipeline. The design keeps one backend authority for discovery and ordering, one frontend authority for selected path and hash state, and uses grouped `shadcn` tab rows to expose files, folders, and nested folders without flattening the hierarchy.

## Pattern

**Hierarchical Navigation with Server-Owned Discovery** — The server returns a hierarchical document tree and ordered metadata, while the frontend renders one `Tabs` row per active folder level and resolves the selected file path. This fits because ordering, grouping, and missing-path fallback must stay deterministic across reloads, deep links, and realtime updates.

## Key Dependencies

| Capability | Decision | Rationale |
|------------|----------|-----------|
| Hierarchical tab primitive | Use existing `shadcn` Tabs | Required by C3; supports one row per active folder level without custom focus behavior |
| Markdown rendering | Use existing `MarkdownContent.tsx` | Preserves current rendering pipeline required by C6 |
| Realtime transport | Use existing `/api/events` SSE stream | Reuses current file-change delivery instead of adding feature-specific transport |

## Runtime Prerequisites

| Dependency | Required | When Absent |
|------------|----------|-------------|
| `.mdt-config.toml` `project.ticketSubdocuments` | No | Server uses default order, then appends remaining entries |
| Ticket-related sub-document files/directories | No | Ticket view shows only `main` |
| `/api/events` SSE endpoint | No | Navigation remains usable but does not auto-refresh |
| CR sub-document retrieval endpoint | Yes | File selection cannot load non-main documents |

## Architecture Invariants

- `one transition authority`: `useTicketDocumentNavigation.ts` is the only frontend module that decides selected path and folder-stack transitions.
- `one processing orchestration path`: all discovery and ordering logic flows through `server/services/TicketService.ts` before the frontend renders navigation.
- `no test-only logic in runtime files`: mocks, fixture trees, and SSE simulation stay in test files only.

## Error Philosophy

The degraded state must never be worse than the current pre-feature ticket view. If sub-document discovery yields nothing, config is absent, or SSE delivery is unavailable, the viewer still renders `main` content and manual navigation continues from the last successfully loaded tree. Invalid hashes, missing active documents, and removed nodes recover to `main`, while document-load failures stay localized to the content area so the navigation structure remains available.

## Extension Rule

To add another ordered top-level document family or grouped folder convention: extend `shared/models/SubDocument.ts` only if the metadata shape changes, update `server/services/TicketService.ts` to classify and order the new entries, and keep `TicketDocumentTabs.tsx` rendering generic so it can display any additional hierarchy level without new special-case UI branches.

## Obligations

- API returns hierarchical sub-document metadata with CR; individual retrieval returns code, content, dates (`OBL-api-subdocument-endpoints`)
  Derived From: `BR-6.1`, `BR-6.2`
  Artifacts: `ART-server-project-controller`, `ART-server-ticket-service`, `ART-data-layer`
- File selection triggers lazy content load via dataLayer; loading/error states surface in content area (`OBL-content-loading-pipeline`)
  Derived From: `BR-3.1`, `BR-3.2`, `BR-5.3`, `C6`, `C7`, `C8`
  Artifacts: `ART-use-ticket-document-content`, `ART-data-layer`, `ART-markdown-content`
- One shadcn Tabs row per active folder level; folders reveal children in next row without flattening (`OBL-hierarchical-tab-rows`)
  Derived From: `BR-2.1`, `BR-2.2`, `BR-2.3`, `BR-2.4`, `BR-2.5`, `C3`
  Artifacts: `ART-ticket-document-tabs`, `ART-ticket-viewer-index`
- useTicketDocumentNavigation is the sole frontend authority for selected path and folder-stack transitions (`OBL-navigation-transition-authority`)
  Derived From: `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`, `C4`
  Artifacts: `ART-use-ticket-document-navigation`, `ART-ticket-document-tabs`
- Hide tab navigation when no sub-documents exist; show only main ticket content (`OBL-no-nav-when-empty`)
  Derived From: `BR-1.5`
  Artifacts: `ART-ticket-document-tabs`, `ART-ticket-viewer-index`
- Sub-document API changes published to openapi.yaml (`OBL-openapi-documentation`)
  Derived From: `BR-6.3`, `C10`
  Artifacts: `ART-openapi-spec`, `ART-server-project-controller`
- SSE updates reconcile tree structure; removed active document falls back to main; manual navigation continues if SSE unavailable (`OBL-realtime-reconciliation`)
  Derived From: `BR-5.1`, `BR-5.2`, `BR-5.4`, `C5`
  Artifacts: `ART-use-ticket-document-realtime`, `ART-ticket-viewer-index`
- Server owns sub-document discovery and ordering; frontend consumes as delivered (`OBL-server-discovery-authority`)
  Derived From: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `C1`, `C2`
  Artifacts: `ART-server-ticket-service`, `ART-shared-subdocument-model`, `ART-data-layer`
- Tab navigation remains visible during scroll without disruptive layout shift (`OBL-sticky-navigation-layout`)
  Derived From: `BR-3.3`, `BR-3.4`, `C9`
  Artifacts: `ART-ticket-document-tabs`, `ART-ticket-viewer-index`
- Test scaffolding stays separate from runtime; no test-only logic in production code (`OBL-test-runtime-separation`)
  Derived From: `C1`, `C2`, `C5`
  Artifacts: `ART-e2e-subdocument-tests`, `ART-nav-hook-unit-tests`, `ART-realtime-hook-tests`, `ART-api-subdocument-tests`

## Artifacts

| Artifact ID | Path | Kind | Referencing Obligations |
|---|---|---|---|
| `ART-api-subdocument-tests` | `server/tests/api/ticket-subdocuments.test.ts` | test | `OBL-test-runtime-separation` |
| `ART-data-layer` | `src/services/dataLayer.ts` | runtime | `OBL-api-subdocument-endpoints`, `OBL-content-loading-pipeline`, `OBL-server-discovery-authority` |
| `ART-e2e-subdocument-tests` | `tests/e2e/subdocument-tabs.spec.ts` | test | `OBL-test-runtime-separation` |
| `ART-markdown-content` | `src/components/MarkdownContent.tsx` | runtime | `OBL-content-loading-pipeline` |
| `ART-nav-hook-unit-tests` | `src/components/TicketViewer/useTicketDocumentNavigation.test.ts` | test | `OBL-test-runtime-separation` |
| `ART-openapi-spec` | `server/openapi.yaml` | config | `OBL-openapi-documentation` |
| `ART-realtime-hook-tests` | `src/components/TicketViewer/useTicketDocumentRealtime.test.ts` | test | `OBL-test-runtime-separation` |
| `ART-server-project-controller` | `server/controllers/ProjectController.ts` | runtime | `OBL-api-subdocument-endpoints`, `OBL-openapi-documentation` |
| `ART-server-ticket-service` | `server/services/TicketService.ts` | runtime | `OBL-api-subdocument-endpoints`, `OBL-server-discovery-authority` |
| `ART-shared-subdocument-model` | `shared/models/SubDocument.ts` | runtime | `OBL-server-discovery-authority` |
| `ART-ticket-document-tabs` | `src/components/TicketViewer/TicketDocumentTabs.tsx` | runtime | `OBL-hierarchical-tab-rows`, `OBL-navigation-transition-authority`, `OBL-no-nav-when-empty`, `OBL-sticky-navigation-layout` |
| `ART-ticket-viewer-index` | `src/components/TicketViewer/index.tsx` | runtime | `OBL-hierarchical-tab-rows`, `OBL-no-nav-when-empty`, `OBL-realtime-reconciliation`, `OBL-sticky-navigation-layout` |
| `ART-use-ticket-document-content` | `src/components/TicketViewer/useTicketDocumentContent.ts` | runtime | `OBL-content-loading-pipeline` |
| `ART-use-ticket-document-navigation` | `src/components/TicketViewer/useTicketDocumentNavigation.ts` | runtime | `OBL-navigation-transition-authority` |
| `ART-use-ticket-document-realtime` | `src/components/TicketViewer/useTicketDocumentRealtime.ts` | runtime | `OBL-realtime-reconciliation` |

## Derivation Summary

| Requirement ID | Obligation Count | Obligation IDs |
|---|---:|---|
| `BR-1.1` | 1 | `OBL-server-discovery-authority` |
| `BR-1.2` | 1 | `OBL-server-discovery-authority` |
| `BR-1.3` | 1 | `OBL-server-discovery-authority` |
| `BR-1.4` | 1 | `OBL-server-discovery-authority` |
| `BR-1.5` | 1 | `OBL-no-nav-when-empty` |
| `BR-2.1` | 1 | `OBL-hierarchical-tab-rows` |
| `BR-2.2` | 1 | `OBL-hierarchical-tab-rows` |
| `BR-2.3` | 1 | `OBL-hierarchical-tab-rows` |
| `BR-2.4` | 1 | `OBL-hierarchical-tab-rows` |
| `BR-2.5` | 1 | `OBL-hierarchical-tab-rows` |
| `BR-3.1` | 1 | `OBL-content-loading-pipeline` |
| `BR-3.2` | 1 | `OBL-content-loading-pipeline` |
| `BR-3.3` | 1 | `OBL-sticky-navigation-layout` |
| `BR-3.4` | 1 | `OBL-sticky-navigation-layout` |
| `BR-4.1` | 1 | `OBL-navigation-transition-authority` |
| `BR-4.2` | 1 | `OBL-navigation-transition-authority` |
| `BR-4.3` | 1 | `OBL-navigation-transition-authority` |
| `BR-4.4` | 1 | `OBL-navigation-transition-authority` |
| `BR-5.1` | 1 | `OBL-realtime-reconciliation` |
| `BR-5.2` | 1 | `OBL-realtime-reconciliation` |
| `BR-5.3` | 1 | `OBL-content-loading-pipeline` |
| `BR-5.4` | 1 | `OBL-realtime-reconciliation` |
| `BR-6.1` | 1 | `OBL-api-subdocument-endpoints` |
| `BR-6.2` | 1 | `OBL-api-subdocument-endpoints` |
| `BR-6.3` | 1 | `OBL-openapi-documentation` |
| `C1` | 2 | `OBL-server-discovery-authority`, `OBL-test-runtime-separation` |
| `C2` | 2 | `OBL-server-discovery-authority`, `OBL-test-runtime-separation` |
| `C3` | 1 | `OBL-hierarchical-tab-rows` |
| `C4` | 1 | `OBL-navigation-transition-authority` |
| `C5` | 2 | `OBL-realtime-reconciliation`, `OBL-test-runtime-separation` |
| `C6` | 1 | `OBL-content-loading-pipeline` |
| `C7` | 1 | `OBL-content-loading-pipeline` |
| `C8` | 1 | `OBL-content-loading-pipeline` |
| `C9` | 1 | `OBL-sticky-navigation-layout` |
| `C10` | 1 | `OBL-openapi-documentation` |
