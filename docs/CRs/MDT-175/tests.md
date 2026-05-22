# Tests: MDT-175

> Canonical test-plan projection: [tests.trace.md](./tests.trace.md)

## Overview

MDT-175 test coverage verifies that browser title behavior follows active frontend context and does not leave stale ticket or document titles behind.

Executable test files were not authored in this pipeline run because the requested pipeline scope is limited to MDT spec artifacts. The plans below define the RED tests expected during implementation.

## Module -> Test Mapping

| Module | Test File | Test Plan |
|--------|-----------|-----------|
| `src/hooks/usePageTitle.ts` | `src/hooks/usePageTitle.test.ts` | `TEST-page-title-formatting` |
| `src/App.tsx` | `src/App.pageTitle.test.tsx` | `TEST-project-view-title-context` |
| `src/components/TicketViewer/index.tsx` | `src/components/TicketViewer/TicketViewer.test.tsx` | `TEST-ticket-title-context` |
| `src/components/DocumentsView/DocumentsLayout.tsx` | `src/components/DocumentsView/DocumentsLayout.test.tsx` | `TEST-document-title-context` |
| `tests/e2e/navigation/page-title.spec.ts` | `tests/e2e/navigation/page-title.spec.ts` | `TEST-page-title-e2e` |

## Test Contracts

### Title Formatting

- Root project views format as `{PROJECT_CODE} Board`, `{PROJECT_CODE} Listing`, and `{PROJECT_CODE} Documents`.
- Main ticket titles format as `{TICKET_CODE} - {ticket H1/title}`.
- Ticket subdocument and special subtab titles append the active label after the main ticket title.
- Project document titles format as `{PROJECT_CODE} - {document H1/title/name}`.
- Title strings normalize whitespace and omit empty parts.
- No title-format Settings item is rendered.
- Malformed or empty title sources do not produce blank `document.title`.
- Loading or failed active context data does not retain prior content title.
- Cleanup restores the previous or fallback title according to architecture.

### Project and Route Context

- Board title is `{PROJECT_CODE} Board`.
- List title is `{PROJECT_CODE} Listing`.
- Documents root title is `{PROJECT_CODE} Documents`.
- Project switching updates title to the new project.
- Settings open/close does not leave stale ticket or document context.
- Loading or failed project context uses the nearest truthful parent or app fallback title.

### Ticket Context

- Opening a ticket sets title from ticket code plus ticket H1/title.
- Opening a ticket subdocument or special subtab appends the active label.
- Closing a ticket restores board/list parent title from `?view=` or route context.
- Missing ticket error does not keep a previous ticket title active.
- Loading or failed ticket data does not keep a previous ticket title active.

### Document Context

- Opening a project document sets title from project code plus document H1/title/name or path segment.
- Clearing selection restores documents view title.
- Deleted or unavailable selected document does not keep stale document title.
- Loading or failed document data does not keep stale document title.

### E2E Browser Contract

- Playwright asserts `page.title()` for board, listing, documents root, ticket, ticket subdocument/subtab, document, settings, and project switch flows.
- E2E verifies URL and visible navigation behavior remain unchanged while titles update.
- E2E verifies title behavior does not add visible UI elements or layout changes.

## Constraint Coverage

| Constraint ID | Test Plan(s) |
|---------------|--------------|
| `C1` | `TEST-project-view-title-context` |
| `C2` | `TEST-page-title-formatting`, `TEST-page-title-e2e` |
| `C3` | `TEST-page-title-formatting`, `TEST-page-title-e2e` |
| `C4` | `TEST-project-view-title-context`, `TEST-page-title-e2e` |
| `C5` | `TEST-page-title-formatting`, `TEST-project-view-title-context`, `TEST-page-title-e2e` |
| `Edge-1` | `TEST-ticket-title-context`, `TEST-page-title-e2e` |
| `Edge-2` | `TEST-document-title-context`, `TEST-page-title-e2e` |
| `Edge-3` | `TEST-project-view-title-context`, `TEST-ticket-title-context`, `TEST-document-title-context`, `TEST-page-title-e2e` |
| `Edge-4` | `TEST-page-title-formatting`, `TEST-page-title-e2e` |
| `Edge-5` | `TEST-page-title-formatting`, `TEST-project-view-title-context`, `TEST-ticket-title-context`, `TEST-document-title-context`, `TEST-page-title-e2e` |

## Verify

```bash
bun test src/hooks/usePageTitle.test.ts src/App.pageTitle.test.tsx src/components/TicketViewer/TicketViewer.test.tsx src/components/DocumentsView/DocumentsLayout.test.tsx
bunx playwright test tests/e2e/navigation/page-title.spec.ts --project=chromium
spec-trace validate MDT-175 --stage tests
spec-trace render tests MDT-175
```
