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
