# Architecture: MDT-175

> Architecture trace projection: [architecture.trace.md](./architecture.trace.md)

## Overview

MDT-175 adds a frontend-owned page title system. The design keeps the static `index.html` title as first-load fallback and adds one runtime title owner that receives deterministic title parts from existing state owners.

Pattern: derived UI metadata owner. Route, ticket, and document state remain owned where they are today; title formatting and `document.title` writes are centralized to prevent stale or competing title updates.

## Decisions

- Add `src/hooks/usePageTitle.ts` as the single runtime owner for title formatting and `document.title` writes.
- Keep `index.html` as the current first-paint title source until the React title owner replaces it after load.
- Use `{PROJECT_CODE} Board`, `{PROJECT_CODE} Listing`, and `{PROJECT_CODE} Documents` for root project views with no opened content.
- Use `{TICKET_CODE} - {ticket H1/title}` for the main ticket document.
- Use `{TICKET_CODE} - {ticket H1/title} - {subdocument/subtab label}` for ticket subdocuments and special ticket subtabs.
- Use `{PROJECT_CODE} - {document H1/title/name}` for opened project documents.
- Normalize whitespace, omit empty title parts, and use dash-separated title parts without adding a trailing app suffix.
- Do not add a user-configurable title-format setting in this CR.
- `ProjectRouteHandler` derives base project/view title inputs from route state, selected project, and view mode.
- `TicketViewer` may override the base title only while an active ticket or ticket error context is open.
- `DocumentsLayout` may override the documents view title only while a valid document is selected.
- Missing, deleted, loading, failed, malformed, or closed content falls back to the nearest truthful parent context.
- Page title behavior must not add visible UI elements, layout changes, or on-screen title clutter.
- No backend, shared model, MCP, CLI, or schema changes are part of this architecture.

## Runtime Flows

### Base Project View Title

1. `ProjectRouteHandler` resolves `projectCode`, `selectedProject`, and `viewMode`.
2. It builds a base title context for board, listing, or documents root view.
3. `usePageTitle` formats and writes `document.title`.
4. Loading, failed, or invalid project states use the nearest truthful parent or app fallback title.

### Ticket Title Override

1. Ticket routes select a ticket through the existing route effect.
2. `TicketViewer` receives `ticket`, `ticketError`, and `isOpen`.
3. While the main ticket document is open, the title context uses ticket code plus ticket H1/title.
4. While a ticket subdocument or special ticket subtab is active, the title appends the active label such as `Architecture` or `Trace Graph`.
5. Closing the ticket returns to the route-derived parent title.
6. Missing, loading, or failed ticket states do not keep the previous ticket title.

### Document Title Override

1. `DocumentsLayout` derives `selectedFile` from path-style or query-param document routes.
2. When selected file metadata is known, the document title uses project code plus document H1/title/name or useful path segment.
3. Deleted, loading, failed, invalid, or unselected document states return to the documents view title.
4. File selection behavior and URL behavior remain unchanged.

### Modal-Only Context

1. Settings and similar modal-only contexts open without taking durable page title ownership unless implementation explicitly defines a modal title.
2. Closing a modal restores or preserves the underlying route/title context.
3. Modal open/close must not leave an unrelated ticket or document title active.

## Module Boundaries

- `src/hooks/usePageTitle.ts` owns formatting, fallback, empty-source handling, and effect cleanup.
- `src/App.tsx` owns route-level title inputs because `ProjectRouteHandler` already owns project and view state.
- `src/components/TicketViewer/index.tsx` owns ticket title inputs because it already owns active ticket and ticket error state.
- `src/components/DocumentsView/DocumentsLayout.tsx` owns document title inputs because it already owns selected file and deletion/error state.
- `index.html` owns only the initial static fallback.
- Tests own observable title assertions; runtime code must not add hidden DOM just for title testing.

## Structure

Expected implementation paths:

- `src/hooks/usePageTitle.ts`
- `src/hooks/usePageTitle.test.ts`
- `src/App.tsx`
- `src/App.pageTitle.test.tsx`
- `src/components/ProjectView.tsx`
- `src/components/TicketViewer/index.tsx`
- `src/components/TicketViewer/TicketViewer.test.tsx`
- `src/components/DocumentsView/DocumentsLayout.tsx`
- `src/components/DocumentsView/DocumentsLayout.test.tsx`
- `index.html`
- `tests/e2e/navigation/page-title.spec.ts`

## Invariants

- There is one runtime title writer.
- Root project views use project code plus `Board`, `Listing`, or `Documents`.
- Ticket views use ticket code plus ticket H1/title, with optional subcontext suffix.
- Project documents use project code plus document H1/title/name.
- No user-configurable title-format setting is added.
- Title strings normalize whitespace and omit empty parts.
- Title updates do not add visible UI elements or layout changes.
- Navigation state, URL behavior, ticket selection, and document selection stay unchanged.
- Final active context wins after rapid navigation.
- Missing, deleted, loading, or failed content cannot keep stale content titles active.

## Verification Contract

- Unit tests verify title formatting, fallback, length limit, empty-source handling, and cleanup.
- Component/integration tests verify project, ticket, and document title ownership boundaries.
- Playwright verifies browser-level title changes through primary user flows.
- `bun run validate:ts` and focused frontend tests pass.

## Rollout

- Deploy as a normal frontend change.
- No data migration required.
- Rollback by reverting the title hook and integrations.
