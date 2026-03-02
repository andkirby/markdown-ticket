# Architecture: MDT-093

**Source**: [MDT-093](../MDT-093-add-sub-document-support-with-sticky-tabs-in-ticke.md)
**Generated**: 2026-03-02

## Overview

This architecture adds hierarchical sub-document navigation to ticket view without changing the underlying CR file format or markdown rendering pipeline. The design keeps one backend authority for discovery and ordering, one frontend authority for selected path and hash state, and uses grouped `shadcn` tab rows to expose files, folders, and nested folders without flattening the hierarchy.

## Constraint Carryover

| Constraint ID | Enforcement |
|---------------|-------------|
| C1 | Canonical Runtime Flows / Module Boundaries: discovery comes only from filesystem-backed ticket artifacts |
| C2 | Canonical Runtime Flows / Module Boundaries: ordering is computed on the server and consumed as delivered |
| C3 | Key Dependencies / Module Boundaries: navigation rows render with `shadcn` Tabs |
| C4 | Canonical Runtime Flows / Runtime Prerequisites: selected relative document path is mirrored in the URL hash |
| C5 | Runtime Prerequisites / Error Philosophy: SSE absence degrades to manual navigation with last loaded structure |
| C6 | Key Dependencies / Module Boundaries: content rendering continues through `MarkdownContent` and shared markdown services |
| C7 | Runtime Prerequisites / Error Philosophy: selection keeps load-start latency within the required window |
| C8 | Runtime Prerequisites / Error Philosophy: discovery and retrieval support markdown files up to 1MB |
| C9 | Module Boundaries / Error Philosophy: sticky rows remain visible without disruptive layout shift |
| C10 | Structure / Module Boundaries: API additions are documented in `server/openapi.yaml` |

## Pattern

**Hierarchical Navigation with Server-Owned Discovery** — The server returns a hierarchical document tree and ordered metadata, while the frontend renders one `Tabs` row per active folder level and resolves the selected file path. This fits because ordering, grouping, and missing-path fallback must stay deterministic across reloads, deep links, and realtime updates.

## Canonical Runtime Flows

| Critical Behavior | Canonical Runtime Flow (single path) | Owner Module |
|-------------------|--------------------------------------|--------------|
| Discover ordered document tree | `Project routes -> ProjectController.getCR -> TicketService.getCR -> shared ticket lookup + sub-document discovery -> CR response includes hierarchical subdocuments` | `server/services/TicketService.ts` |
| Select folder and reveal next row | `TicketDocumentTabs -> useTicketDocumentNavigation.selectFolder(relativePath) -> active folder stack recalculated -> next Tabs row rendered while current document stays visible` | `src/components/TicketViewer/useTicketDocumentNavigation.ts` |
| Select file and render content | `TicketDocumentTabs -> useTicketDocumentContent.selectFile(relativePath) -> dataLayer fetches CR sub-document endpoint -> response normalized -> MarkdownContent renders selected document -> hash updated` | `src/components/TicketViewer/useTicketDocumentContent.ts` |
| Apply realtime structure changes | `/api/events -> useSSEEvents -> useTicketDocumentRealtime -> dataLayer refetches CR tree -> navigation state reconciled -> missing active path falls back to main` | `src/components/TicketViewer/useTicketDocumentRealtime.ts` |
| Render sticky multi-row tab UI | `TicketViewer/index.tsx -> TicketDocumentTabs renders primary and nested tab rows with shadcn Tabs -> sticky container remains visible during scroll` | `src/components/TicketViewer/TicketDocumentTabs.tsx` |

Rules:
- One behavior = one canonical flow
- One behavior = one owner module
- No duplicate owners

## Key Dependencies

| Capability | Decision | Scope | Rationale |
|------------|----------|-------|-----------|
| Hierarchical tab primitive | Use existing `shadcn` Tabs | runtime | Required by C3 and supports one row per active folder level without inventing custom focus behavior |
| Markdown rendering | Use existing `src/components/MarkdownContent.tsx` with shared markdown services | runtime | Preserves the current rendering pipeline required by C6 |
| Realtime transport | Use existing `/api/events` SSE stream and `useSSEEvents` integration | runtime | Reuses current file-change delivery instead of adding a feature-specific transport |

## Runtime Prerequisites

| Dependency | Type | Required | When Absent |
|------------|------|----------|-------------|
| `.mdt-config.toml` `project.ticketSubdocuments` | project config | No | Server uses the default ordered set, then appends remaining entries in natural ascending name order |
| Ticket-related sub-document files and directories | filesystem convention | No | Ticket view shows only `main` and behaves as before the feature |
| `/api/events` | SSE endpoint | No | Navigation remains usable with the last loaded structure but does not auto-refresh |
| CR sub-document retrieval endpoint | API endpoint | Yes | File selection cannot load non-main documents |

## Test vs Runtime Separation

| Runtime Module | Test Scaffolding | Separation Rule |
|----------------|------------------|-----------------|
| `src/components/TicketViewer/index.tsx` | `tests/e2e/subdocument-tabs.spec.ts` | E2E covers user-visible hierarchy and deep-link flows; no test-only branching in the viewer |
| `src/components/TicketViewer/useTicketDocumentNavigation.ts` | `src/components/TicketViewer/useTicketDocumentNavigation.test.ts` | Hash parsing and folder-stack reconciliation stay pure and testable outside runtime wiring |
| `src/components/TicketViewer/useTicketDocumentRealtime.ts` | `src/components/TicketViewer/useTicketDocumentRealtime.test.ts` | SSE reconciliation logic is isolated; transport mocks stay in tests only |
| `server/services/TicketService.ts` | `server/tests/api/ticket-subdocuments.test.ts` | Discovery and ordering logic stay in the service; fixtures and filesystem mocks stay in tests |

## Structure

```text
/Users/kirby/home/markdown-ticket/
├── src/App.tsx                                    # runtime entry that mounts TicketViewer for the selected CR
├── src/components/TicketViewer/                   # ticket document navigation runtime package
│   ├── index.tsx                                  # composes tab rows, content area, and sticky container
│   ├── TicketDocumentTabs.tsx                     # renders one shadcn Tabs row per active hierarchy level
│   ├── useTicketDocumentNavigation.ts             # owns selected relative path, folder stack, and hash sync
│   ├── useTicketDocumentContent.ts                # loads individual sub-documents and exposes loading/error state
│   └── useTicketDocumentRealtime.ts               # reconciles SSE updates against the current navigation state
├── src/components/MarkdownContent.tsx             # existing markdown renderer for main and sub-document content
├── src/services/dataLayer.ts                      # GET /api/projects/:projectId/crs/:crId and GET /api/projects/:projectId/crs/:crId/documents/*documentPath
├── server/routes/projects.ts                      # project/CR routes including hierarchical sub-document retrieval
├── server/controllers/ProjectController.ts        # HTTP translation for CR tree and document content responses
├── server/services/TicketService.ts               # server authority for discovery, ordering, and sub-document reads
├── shared/models/SubDocument.ts                   # hierarchical file/folder metadata contract shared by client and server
└── server/openapi.yaml                            # public API schema for CR tree and sub-document retrieval
```

## Module Boundaries

| Module | Owns | Must Not |
|--------|------|----------|
| `src/components/TicketViewer/index.tsx` | Composition of navigation rows, content panel, and sticky layout | Discovery logic, ordering rules, or raw fetch orchestration |
| `src/components/TicketViewer/TicketDocumentTabs.tsx` | Rendering primary and nested tab rows with `shadcn` Tabs | URL hash parsing, content fetching, or filesystem semantics |
| `src/components/TicketViewer/useTicketDocumentNavigation.ts` | Selected relative path, active folder stack, and hash synchronization | HTTP I/O or SSE subscription setup |
| `src/components/TicketViewer/useTicketDocumentContent.ts` | Loading selected file content and surfacing loading/error state | Ordering decisions or sticky layout behavior |
| `src/components/TicketViewer/useTicketDocumentRealtime.ts` | Reconciling live tree updates with current selection | Initial tree discovery or content rendering |
| `src/services/dataLayer.ts` | Frontend HTTP calls and response normalization for CR tree and document content | UI state decisions or folder-stack reconciliation |
| `server/services/TicketService.ts` | Filesystem discovery, default/configured ordering, hierarchical metadata, and sub-document reads | HTTP response formatting or frontend state semantics |
| `server/controllers/ProjectController.ts` | Mapping CR/tree service results into API responses | Discovery rules or frontend navigation logic |
| `shared/models/SubDocument.ts` | Shared hierarchical metadata shape for files and folders | Rendering policy or transport behavior |

## Architecture Invariants

- `one transition authority`: `useTicketDocumentNavigation.ts` is the only frontend module that decides selected path and folder-stack transitions.
- `one processing orchestration path`: all discovery and ordering logic flows through `server/services/TicketService.ts` before the frontend renders navigation.
- `no test-only logic in runtime files`: mocks, fixture trees, and SSE simulation stay in test files only.

## Error Philosophy

The degraded state must never be worse than the current pre-feature ticket view. If sub-document discovery yields nothing, config is absent, or SSE delivery is unavailable, the viewer still renders `main` content and manual navigation continues from the last successfully loaded tree. Invalid hashes, missing active documents, and removed nodes recover to `main`, while document-load failures stay localized to the content area so the navigation structure remains available.

## Extension Rule

To add another ordered top-level document family or grouped folder convention: extend `shared/models/SubDocument.ts` only if the metadata shape changes, update `server/services/TicketService.ts` to classify and order the new entries, and keep `TicketDocumentTabs.tsx` rendering generic so it can display any additional hierarchy level without new special-case UI branches.

---
*Generated by /mdt:architecture*
