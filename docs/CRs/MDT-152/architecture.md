# Architecture: Cross-Project Search

## Overview

MDT-152 adds cross-project ticket discovery without changing the default project-scoped board model. The design keeps current-project search synchronous and local, while routing explicit cross-project modes through a single backend search endpoint with typed request/response contracts.

The core pattern is a query-orchestrated search adapter: `useQuickSearch` classifies the query, `useCrossProjectSearch` owns async state and cache timing, `dataLayer` owns HTTP/dedupe, and the backend resolves project/ticket data without preloading all project tickets into the browser.

## Pattern Reference

**Pattern name**: Query-Orchestrated Search Adapter

**Rationale**: The existing QuickSearch modal already owns keyboard navigation and current-project filtering. MDT-152 should extend that surface by adding a new async lane, not by turning QuickSearch into a backend-aware component or by duplicating project discovery rules in the frontend.

**Build vs use decision**: Build on existing React hooks, `dataLayer`, Express routes, shared services, and domain-contract Zod schemas. Do not add a search-index dependency for this ticket; the in-scope behavior is ticket-key lookup and single-project scoped search, not full-text global search.

## API Contract

Single endpoint:

```text
POST /api/projects/search
```

Request body:

```json
{
  "mode": "ticket_key",
  "query": "ABC-42",
  "projectCode": "ABC",
  "limitPerProject": 5,
  "limitTotal": 15
}
```

Rules:

- `mode: "ticket_key"` requires a `{CODE}-{NUMBER}` query and resolves the project by code before looking up the ticket.
- `mode: "project_scope"` requires `projectCode` and searches only that project.
- The backend enforces `limitPerProject <= 5` and `limitTotal <= 15`.
- Invalid project codes return a typed not-found response; network/server failures remain retryable client errors.

Response shape:

```json
{
  "results": [
    {
      "ticket": { "code": "ABC-42", "title": "Auth service refactor" },
      "project": { "code": "ABC", "name": "Another Project" }
    }
  ],
  "total": 1
}
```

## Canonical Runtime Flows

### Flow 1: ProjectBrowserPanel Search

Owner module: `src/components/ProjectSelector/ProjectBrowserPanel.tsx`

```text
Panel opens
-> focus "Search projects..." input
-> user types query
-> filter preloaded project list by case-insensitive code OR name
-> exclude current project only when the browser-panel query matches it
-> render matching cards or "No projects match your search"
```

No backend call and no debounce are allowed in this flow.

### Flow 2: Current Project QuickSearch

Owner module: `src/hooks/useQuickSearch.ts`

```text
QuickSearch opens
-> user types text without special syntax
-> parser returns current_project mode
-> filter current project tickets locally by key number, full code, or title
-> QuickSearchResults renders existing MDT-136 result behavior
```

This flow must not use cross-project cache or backend fetch.

### Flow 3: Cross-Project Ticket-Key Lookup

Owner modules: `src/hooks/useQuickSearch.ts`, `src/hooks/useCrossProjectSearch.ts`, `server/services/TicketService.ts`

```text
User types ABC-42
-> useQuickSearch recognizes exact ticket-key pattern
-> mode indicator shows "Searching: ABC-42"
-> useCrossProjectSearch starts loading state and 300ms debounce
-> dataLayer POSTs /api/projects/search with mode "ticket_key"
-> ProjectController validates request shape
-> server TicketService resolves project ABC and reads the requested ticket
-> QuickSearchResults renders project context or "Ticket ABC-42 not found"
```

The backend may target the resolved project directly; it must not ask the browser to preload every project's tickets.

### Flow 4: Project-Scoped QuickSearch

Owner modules: `src/hooks/useQuickSearch.ts`, `src/hooks/useCrossProjectSearch.ts`, `server/services/TicketService.ts`

```text
User types @ABC login
-> parser requires @CODE followed by a space and search text
-> validate ABC exists
-> invalid code renders "Project ABC not found" without fetch
-> valid code shows "In: ABC"
-> debounce for 300ms
-> POST /api/projects/search with mode "project_scope"
-> backend searches only project ABC
-> render scoped results with project context
```

Explicit `@MDT ...` while currently in MDT is allowed and must not be treated as a browser-panel exclusion case.

### Flow 5: Async State and Cache

Owner module: `src/hooks/useCrossProjectSearch.ts`

```text
Mode enters async search
-> loading state renders within 50ms of fetch start
-> debounce waits up to 300ms before network call
-> dataLayer dedupes identical in-flight requests
-> hook caches successful search payloads for 5 minutes
-> retry clears error state and reuses the same typed request
```

Cache keys must include mode, project code, query, and result limits.

## Structure

```text
domain-contracts/src/ticket/search.ts
  Search mode enum, request schema, response schema, error codes

server/routes/projects.ts
  Route registration for POST /api/projects/search

server/controllers/ProjectController.ts
  HTTP request validation, response shaping, status mapping

server/services/TicketService.ts
  Cross-project orchestration, project resolution, scoped ticket lookup

shared/services/TicketService.ts
  Reusable per-project ticket read/search primitives

src/services/dataLayer.ts
  searchProjects request, response normalization, request dedupe

src/hooks/useQuickSearch.ts
  Query parser, current-project filtering, selected-index model

src/hooks/useCrossProjectSearch.ts
  Debounce, loading/error state, 5-minute cache, retry

src/components/QuickSearch/*
  Modal shell, input, mode indicator, result sections, empty/loading states

src/components/ProjectSelector/ProjectBrowserPanel.tsx
  Client-side project filtering and browser-panel empty state

docs/design/specs/*.md and docs/design/mockups/*.md
  UX contract for implementers and reviewers
```

## Module Boundaries

`ProjectBrowserPanel` owns only project-list filtering, focus on open, Escape close, current-project exclusion for browser-panel results, and panel empty state.

`useQuickSearch` owns query classification and current-project filtering. It must not call `fetch`, manage TTL, or know backend route details.

`useCrossProjectSearch` owns async search state. It must not decide whether a raw query is `ticket_key`, `project_scope`, or `current_project`; it consumes a parsed search request.

`dataLayer` owns HTTP details and request dedupe. It returns normalized typed data and throws typed errors; components do not parse raw `fetch` responses.

`ProjectController` owns HTTP validation and status codes. It delegates search orchestration rather than reading files directly.

`server/services/TicketService.ts` owns project discovery plus cross-project orchestration. `shared/services/TicketService.ts` owns reusable per-project ticket operations that can be reused by CLI, MCP, and server.

`domain-contracts` owns the search request/response schemas because the route is consumed by frontend and server and should not have duplicated mode strings or result-limit rules.

## Runtime vs Test Scaffolding

Runtime files must not import E2E helpers or test fixtures. Test artifacts are separated by layer:

- API contract tests: `server/tests/api/projects.search.test.ts`
- Query parser tests: `src/hooks/useQuickSearch.test.ts`
- Async/cache tests: `src/hooks/useCrossProjectSearch.test.ts`
- QuickSearch E2E: `tests/e2e/quick-search/modal.spec.ts`
- Project browser E2E: `tests/e2e/selector/project-browser.spec.ts`

E2E tests verify visible states and keyboard behavior. Unit/API tests verify parser, validation, limits, cache TTL, and backend result shaping.

## Architecture Invariants

- Current-project QuickSearch remains local and synchronous.
- ProjectBrowserPanel search never calls the backend.
- Cross-project modes never preload all tickets into the browser.
- `@CODE` project-scoped mode requires a space and search text before backend search.
- Result limits are enforced server-side even if the client sends larger limits.
- Current project exclusion applies only to ProjectBrowserPanel search results.
- Loading skeletons render only after async fetch start, not during the debounce wait.
- Modal overlay behavior remains aligned with `src/MODALS.md`.
- Shared query contract strings live in `domain-contracts`, not duplicated as ad hoc frontend/server literals.

## Error Philosophy

User-correctable misses use specific empty states: invalid project code, ticket key not found, and no scoped results. Transport/server failures use a retry action and must not collapse into "no results", because a retryable failure is operationally different from a successful empty search.

## Extension Rule

Future full-text search across all projects must add a new mode and architecture decision. Do not overload `project_scope` or `ticket_key` with global full-text behavior, and do not introduce a browser-side all-project ticket cache as a shortcut.

## UX Specification Alignment

The human-facing UX contract lives in:

- `docs/design/surfaces/quick-search.spec.md`
- `docs/design/surfaces/project-browser.spec.md`
- `docs/design/surfaces/quick-search.mockups.md`
- `docs/design/surfaces/project-browser.mockups.md`

These docs must stay aligned with the canonical rules above: `@CODE query` syntax, `POST /api/projects/search`, 300ms debounce for async modes, browser-panel-only current-project exclusion, and mode-specific empty/loading states.
