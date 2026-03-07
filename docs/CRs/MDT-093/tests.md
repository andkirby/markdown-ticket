# Test Plan

## Test Plans By Kind

### unit

- useTicketDocumentNavigation: selected path, folder stack, URL hash sync, fallback to main (`TEST-nav-hook-unit`)
  Covers: `C4`, `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`
  File: `src/components/TicketViewer/useTicketDocumentNavigation.test.ts`
- useTicketDocumentRealtime: SSE reconciliation, active-removed callback, degraded-mode safety (`TEST-realtime-hook-unit`)
  Covers: `C5`, `BR-5.1`, `BR-5.2`, `BR-5.4`
  File: `src/components/TicketViewer/useTicketDocumentRealtime.test.ts`

### integration

- Sub-document API endpoints: subdocuments list ordering, individual retrieval, OpenAPI compliance (`TEST-api-subdocuments`)
  Covers: `BR-6.1`, `BR-6.2`, `BR-6.3`, `BR-1.1`, `BR-1.2`, `BR-1.4`, `BR-1.5`, `C1`, `C2`, `C8`, `C10`
  File: `server/tests/api/ticket-subdocuments.test.ts`

### e2e

- Sticky tabs and content loading (folded into subdoc-navigation spec) (`TEST-sticky-tabs-e2e`)
  Covers: `C6`, `C7`, `C9`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `BR-3.4`
  File: `tests/e2e/ticket/subdoc-navigation.spec.ts`
- Sub-document navigation E2E: tabs, ordering, folder rows, sticky, deep link, SSE, error (`TEST-subdoc-navigation`)
  Covers: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-1.5`, `BR-2.1`, `BR-2.2`, `BR-2.3`, `BR-2.4`, `BR-2.5`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `BR-3.4`, `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`, `BR-5.1`, `BR-5.2`, `BR-5.3`, `C3`, `C6`, `C7`, `C9`
  File: `tests/e2e/ticket/subdoc-navigation.spec.ts`

## Requirement Coverage Summary

| Requirement ID | Route Policy | Direct Test Plans | Indirect Test Plans |
|---|---|---|---|
| `BR-6.1` | tests | `TEST-api-subdocuments` | - |
| `BR-6.2` | tests | `TEST-api-subdocuments` | - |
| `BR-6.3` | tests | `TEST-api-subdocuments` | - |
| `C1` | tests | `TEST-api-subdocuments` | - |
| `C2` | tests | `TEST-api-subdocuments` | - |
| `C3` | tests | `TEST-subdoc-navigation` | - |
| `C4` | tests | `TEST-nav-hook-unit` | - |
| `C5` | tests | `TEST-realtime-hook-unit` | - |
| `C6` | tests | `TEST-sticky-tabs-e2e`, `TEST-subdoc-navigation` | - |
| `C7` | tests | `TEST-sticky-tabs-e2e`, `TEST-subdoc-navigation` | - |
| `C8` | tests | `TEST-api-subdocuments` | - |
| `C9` | tests | `TEST-sticky-tabs-e2e`, `TEST-subdoc-navigation` | - |
| `C10` | tests | `TEST-api-subdocuments` | - |
