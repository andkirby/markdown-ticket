# Test Plan

## Test Plans By Kind

### unit

- Single source of truth for badge variants (`TEST-badge-single-source`)
  Covers: `C3`, `C5`
- Badge variants color mappings (`TEST-badge-variants`)
  Covers: `BR-2`, `BR-6`, `BR-7`, `C3`, `C5`
  File: `src/components/Badge/badgeVariants.test.ts`
- ContextBadge component tests (`TEST-context-badge`)
  Covers: `BR-8`
  File: `src/components/Badge/ContextBadge.test.tsx`
- No duplicate color functions remain (`TEST-no-duplicate-funcs`)
  Covers: `C4`
- PriorityBadge component tests (`TEST-priority-badge`)
  Covers: `BR-4`, `BR-6`
  File: `src/components/Badge/PriorityBadge.test.tsx`
- RelationshipBadge component tests (`TEST-relationship-badge`)
  Covers: `BR-8`
  File: `src/components/Badge/RelationshipBadge.test.tsx`
- StatusBadge component tests (`TEST-status-badge`)
  Covers: `BR-1`, `BR-2`, `BR-3`
  File: `src/components/Badge/StatusBadge.test.tsx`
- TypeBadge component tests (`TEST-type-badge`)
  Covers: `BR-5`, `BR-7`
  File: `src/components/Badge/TypeBadge.test.tsx`

### e2e

- Verify existing E2E tests pass (`TEST-badge-e2e-compat`)
  Covers: `C1`

### manual

- TypeScript validation passes (`TEST-typescript-validation`)
  Covers: `C2`

## Requirement Coverage Summary

| Requirement ID | Route Policy | Direct Test Plans | Indirect Test Plans |
|---|---|---|---|
| `C1` | tests | `TEST-badge-e2e-compat` | - |
| `C2` | tests | `TEST-typescript-validation` | - |
| `C3` | tests | `TEST-badge-single-source`, `TEST-badge-variants` | - |
| `C4` | tests | `TEST-no-duplicate-funcs` | - |
| `C5` | tests | `TEST-badge-single-source`, `TEST-badge-variants` | - |
