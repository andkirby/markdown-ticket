# Architecture: MDT-094

**Source**: [MDT-094](../MDT-094-optimize-cr-listing-api-to-remove-content-payload.md)
**Updated**: 2026-03-02

## Overview

Optimize the CR listing endpoint to return metadata-only responses, reducing payload size by >90%. The architecture introduces `TicketMetadata` as a distinct type from `Ticket`, with list operations returning metadata and detail operations returning full content.

## Pattern

**Data Transfer Optimization** — Separate list operations (metadata-only) from detail operations (full content) to minimize bandwidth while maintaining functional equivalence.

## Canonical Runtime Flows

| Critical Behavior | Canonical Runtime Flow | Owner Module |
|-------------------|------------------------|--------------|
| List CRs | `GET /api/projects/:id/crs` → `ProjectController.getProjectCRs()` → `ProjectService.getProjectCRsMetadata()` → `MarkdownService.scanTicketMetadata()` → `TicketMetadata[]` | `shared/services/MarkdownService.ts` |
| Get CR Detail | `GET /api/projects/:id/crs/:code` → `ProjectController.getCR()` → `server/TicketService.getCR()` → `shared/TicketService.getCR()` → `MarkdownService.parseMarkdownFile()` → `Ticket` | `shared/services/TicketService.ts` |
| Frontend List View | `List.tsx` → `dataLayer.fetchTicketsMetadata()` → `TicketMetadata[]` → render list | `src/services/dataLayer.ts` |
| Frontend Detail View | `List.tsx` (on select) → `dataLayer.fetchTicket()` → `Ticket` → render detail | `src/services/dataLayer.ts` |

Rules:
- List and Detail are separate flows with separate types
- `TicketMetadata` never includes `content`
- `Ticket` always includes `content`

## Key Dependencies

| Capability | Decision | Scope | Rationale |
|------------|----------|-------|-----------|
| Metadata extraction | Build custom | runtime | YAML-only parsing, no markdown body processing |

## Test vs Runtime Separation

| Runtime Module | Test Scaffolding | Separation Rule |
|----------------|------------------|-----------------|
| `shared/services/MarkdownService.ts` | `server/tests/mocks/shared/services/` | Mock returns predefined metadata, no file I/O |
| `server/controllers/ProjectController.ts` | `server/tests/integration/api.test.ts` | Integration tests use test app factory |
| `src/services/dataLayer.ts` | Frontend unit tests | Mock fetch responses, no real HTTP |

## Structure

```
shared/
├── models/
│   └── Ticket.ts              # Add TicketMetadata interface
│                              # Fields: code, title, status, type, priority, dateCreated, lastModified
│                              # Explicitly EXCLUDES: content
└── services/
    ├── MarkdownService.ts     # Add scanTicketMetadata() - YAML-only parsing
    └── ProjectService.ts      # Add getProjectCRsMetadata() - returns TicketMetadata[]

server/
├── controllers/
│   └── ProjectController.ts   # getProjectCRs() returns TicketMetadata[]
└── tests/
    └── integration/
        └── api.test.ts        # Extend existing 'GET /api/projects/:projectId/crs' tests
                                # Add: verify no content field, required fields, payload size

src/
└── services/
    └── dataLayer.ts           # fetchTicketsMetadata() for list, fetchTicket() for detail
```

## Module Boundaries

| Module | Owns | Must Not |
|--------|------|----------|
| `MarkdownService.scanTicketMetadata()` | Extract YAML frontmatter only, return `TicketMetadata[]` | Parse markdown body, read full file content |
| `ProjectService.getProjectCRsMetadata()` | Orchestrate metadata scanning, handle worktree resolution | Return `content` field |
| `dataLayer.fetchTicketsMetadata()` | Fetch and normalize `TicketMetadata[]` from list endpoint | Fetch full `Ticket` objects |
| `dataLayer.fetchTicket()` | Fetch full `Ticket` with content | Be used for list views |

## Architecture Invariants

- `metadata never includes content`: `TicketMetadata` type excludes `content` field by definition
- `one scan path for metadata`: `scanTicketMetadata()` is the only way to get metadata efficiently
- `detail endpoint unchanged`: `GET /api/projects/:id/crs/:code` returns identical structure

## Error Philosophy

File system errors during metadata scan log warnings and skip problematic files. Invalid YAML uses default values (empty strings, null dates) and continues. Network errors in frontend show user-facing error message with retry option.

## Extension Rule

To add a new metadata field:
1. Add field to `TicketMetadata` interface in `shared/models/Ticket.ts`
2. Extract field in `MarkdownService.scanTicketMetadata()` from YAML frontmatter
3. Update API test to verify new field presence
