# Test Plan

## Test Plans By Kind

### unit

- Selector API Endpoint Tests (`TEST-selector-api`)
  Covers: `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-7.4`, `BR-7.5`, `BR-8.1`, `BR-8.2`, `BR-8.3`, `BR-8.4`, `BR-8.5`, `BR-8.6`, `BR-8.7`, `BR-10.1`, `BR-10.2`, `BR-10.3`, `BR-10.4`, `BR-10.5`, `BR-10.6`, `BR-10.7`, `C1`, `C2`, `C3`, `C5`, `C6`, `C10`
  File: `server/tests/api/selector.test.ts`
- Selector Data Hook Tests (`TEST-selector-data-hook`)
  Covers: `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-7.4`, `BR-7.5`, `BR-8.1`, `BR-8.2`, `BR-8.3`, `BR-8.4`, `BR-8.5`, `BR-8.6`, `BR-8.7`, `BR-10.1`, `BR-10.2`, `BR-10.3`, `BR-10.4`, `BR-10.5`, `BR-10.6`, `BR-10.7`, `C1`, `C2`, `C3`, `C5`, `C6`, `C10`
  File: `src/components/ProjectSelector/useSelectorData.test.ts`
- Selector Ordering Logic Tests (`TEST-selector-ordering`)
  Covers: `BR-6.1`, `BR-6.2`, `BR-6.3`, `BR-6.4`, `BR-4.3`, `BR-4.4`
  File: `src/utils/selectorOrdering.test.ts`

### e2e

- Project Selector E2E Tests (`TEST-project-selector-e2e`)
  Covers: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-2.1`, `BR-2.3`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `BR-3.4`, `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`, `BR-4.5`, `BR-5.1`, `BR-5.2`, `BR-5.3`, `BR-5.4`, `BR-5.5`, `BR-6.1`, `BR-6.2`, `BR-6.3`, `BR-6.4`, `BR-6.5`, `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-7.4`, `BR-7.5`, `BR-8.1`, `BR-8.2`, `BR-8.3`, `BR-8.4`, `BR-8.5`, `BR-8.6`, `BR-8.7`, `BR-9.1`, `BR-9.3`, `C5`, `C7`, `C9`

## Requirement Coverage Summary

| Requirement ID | Route Policy | Direct Test Plans | Indirect Test Plans |
|---|---|---|---|
| `BR-10.1` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `BR-10.2` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `BR-10.3` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `BR-10.4` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `BR-10.5` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `BR-10.6` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `BR-10.7` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `C1` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `C2` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `C3` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `C5` | tests | `TEST-project-selector-e2e`, `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `C6` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
| `C7` | tests | `TEST-project-selector-e2e` | - |
| `C9` | tests | `TEST-project-selector-e2e` | - |
| `C10` | tests | `TEST-selector-api`, `TEST-selector-data-hook` | - |
