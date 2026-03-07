# Architecture

## Rationale

## Worktree Path Resolution for Sub-Document Discovery

### Problem Statement

The server-side `TicketService` discovers sub-documents by constructing file paths directly from the project path and ticket ID. This fails in git worktree scenarios where tickets live in worktree directories instead of the main project directory. The shared `TicketService` already implements worktree resolution (MDT-095), but the server adapter does not use this capability.

### Solution Pattern

**Constructor Injection with Path Resolution** — Inject `WorktreeService` into `server/services/TicketService.ts` and call `resolvePath()` before constructing file paths for sub-document discovery. This mirrors the pattern already established in `shared/services/TicketService.ts`, ensuring consistency across the codebase.

### Modified Components

#### 1. `server/services/TicketService.ts`

**Changes:**
- Add `WorktreeService` import from `@mdt/shared/services/WorktreeService.js`
- Inject `WorktreeService` via constructor (already receives `projectDiscovery`)
- Modify `discoverSubDocuments()` to resolve worktree path before file system operations
- Modify `getSubDocument()` to resolve worktree path before reading file content

**Implementation Pattern:**
```typescript
// In constructor
this.worktreeService = new WorktreeService()

// In discoverSubDocuments()
const config = this.projectService.getProjectConfig(project.project.path)
const resolvedPath = await this.worktreeService.resolvePath(
  project.project.path,
  crId,
  config.project?.ticketsPath || 'docs/CRs',
  config.project?.code || 'MDT'
)
const subdocDir = join(resolvedPath, ticketsPath, crId)
```

#### 2. `server/controllers/ProjectController.ts`

**Changes:**
- No direct changes needed (delegates to `TicketService`)

#### 3. `server/server.ts`

**Changes:**
- No changes needed (instantiation already uses constructor injection pattern)

### Data Flow

```
API Request
  → ProjectController.getCR()
    → TicketService.getCR()
      → SharedTicketService.getCR() [already has worktree support]
    → TicketService.discoverSubDocuments()
      → WorktreeService.resolvePath(projectPath, ticketCode, ticketsPath, projectCode)
        → Checks cache for worktree mapping
        → Returns worktree path if ticket file exists there
        → Falls back to main project path if no worktree or missing file
      → Constructs file path using resolved path
      → Reads directory structure
    → Returns CR with sub-document metadata
  → Response to client
```

### Error Handling

- **Worktree resolution fails**: Falls back to main project path (silent degradation per MDT-095)
- **WorktreeService unavailable**: System continues with main path (feature flag can disable worktrees)
- **File system errors**: Existing error handling remains unchanged
- **Cache miss**: `WorktreeService` detects worktrees on-demand and caches results

### Runtime Prerequisites

| Dependency | Required | When Absent |
|------------|----------|-------------|
| `WorktreeService` initialized | Yes | System falls back to main path behavior |
| Git worktree present | No | Main path used (pre-existing behavior) |
| Ticket file in worktree | No | Falls back to main path if worktree file missing |
| `.mdt-config.toml` with worktree config | No | Uses defaults (enabled=true, code from project config) |

### Architecture Invariants

- **single worktree authority**: `WorktreeService` is the only component that detects worktrees and resolves paths
- **path resolution before file ops**: All file system access for ticket content must go through `resolvePath()` first
- **fallback to main**: If worktree resolution fails or file not found, system gracefully degrades to main project path
- **consistent pattern**: Server-side `TicketService` mirrors the worktree pattern from shared `TicketService`

### Extension Rule

To extend worktree support to other server-side services:
1. Import `WorktreeService` from `@mdt/shared/services/WorktreeService.js`
2. Inject via constructor (or use singleton pattern)
3. Call `resolvePath(projectPath, ticketCode, ticketsPath, projectCode)` before file operations
4. Handle fallback to main path gracefully
5. Add tests for both worktree and non-worktree scenarios

### Related Tickets

- **MDT-095**: Initial worktree support in shared `TicketService`
- **MDT-093**: Sub-document navigation feature (this fix enables it in worktrees)

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
| `ART-e2e-subdocument-tests` | `tests/e2e/ticket/subdoc-navigation.spec.ts` | test | `OBL-test-runtime-separation` |
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
