# Tests: MDT-159

## Overview

Test plan for centralizing CR key formatting into `formatCrKey()`. Two executable test files (unit) and two manual verification steps (structural audit).

## Module → Test Mapping

| Module | Test File | Tests | Status |
|--------|-----------|-------|--------|
| `shared/utils/keyNormalizer.ts` | `shared/utils/__tests__/formatCrKey.test.ts` | 19 | RED (TDD) |
| `src/utils/routing.ts` | `src/utils/__tests__/routing.normalizeTicketKey.test.ts` | 9 | GREEN (regression) |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Boundary: 3-digit minimum (number 1 → 001) | `formatCrKey` | at 1, at 999, at 1000, at 10000 |
| Boundary: 3→4 digit transition (999→1000) | `formatCrKey` | at 999 (3-digit), at 1000 (4-digit) |
| Backward compatibility: 1-999 range | `formatCrKey` | Exhaustive loop: n ∈ [1, 999] |
| Purity: no side effects | `formatCrKey` | Type check, input immutability, idempotency |

## External Dependency Tests

None. `formatCrKey` is a pure string operation with no external dependencies (C4).

## Edge-2 Coverage Justification: useQuickSearch.ts

`useQuickSearch.ts` (call site #9) contains a private `normalizeTicketKeyTerm()` function that currently uses inline `padStart(3, '0')`. After implementation, this function will delegate to `formatCrKey()` for the padding step.

**No dedicated test file is created for useQuickSearch.ts** because:
1. The padding behavior is fully covered by `TEST-formatcrkey-unit` (19 tests including boundary and backward compatibility)
2. The `filterTickets()` matching logic is already tested in the existing `src/hooks/useQuickSearch.test.ts` (MDT-136)
3. After migration, `normalizeTicketKeyTerm()` becomes a thin wrapper: regex extraction → `formatCrKey()` → lowercase
4. The remaining logic (regex matching, case folding) is unrelated to MDT-159's scope

Edge-2 compliance for useQuickSearch is verified through the combination of `formatCrKey.test.ts` (padding correctness) and the existing `useQuickSearch.test.ts` (matching logic).

## Constraint Coverage

| Constraint ID | Test File / Verification | Tests |
|---------------|--------------------------|-------|
| C1 | Manual audit: `git diff --name-only` after migration | No ticket files renamed or moved |
| C2 | `formatCrKey.test.ts` | Exhaustive: n ∈ [1, 999] matches `padStart(3, '0')` |
| C3 | Manual audit: `grep "padStart(3" --include="*.ts"` after migration | Zero matches (all 10 sites replaced) |
| C4 | `formatCrKey.test.ts` | Returns string, no input mutation, idempotent |

## Structural Verification (Manual)

### TEST-call-site-audit (BR-3, C3)
After implementation, verify all 10 sites are migrated:

```bash
# Should return zero matches
grep -rn "padStart(3" --include="*.ts" shared/ src/ server/
```

Expected 10 replacements:
1. `shared/services/TicketService.ts:307`
2. `shared/utils/keyNormalizer.ts:54`
3. `shared/utils/keyNormalizer.ts:76`
4. `shared/test-lib/ticket/test-ticket-builder.ts:135`
5. `shared/test-lib/ticket/helpers/TicketCodeHelper.ts:55`
6. `shared/services/__tests__/WorktreeService.test.ts:419`
7. `shared/tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts:214-215`
8. `src/utils/routing.ts:15`
9. `src/hooks/useQuickSearch.ts:93`
10. `server/tests/mocks/shared/services/TicketService.ts:181`

### TEST-no-migration-audit (C1)
After implementation, verify no ticket files changed:

```bash
# Should show zero changes in docs/CRs/
git diff --name-only -- docs/CRs/
```

## Verify

```bash
# Shared tests (Jest via bun)
bun run --cwd server jest shared/utils/__tests__/formatCrKey.test.ts

# Frontend routing regression (Jest)
bun run --cwd server jest src/utils/__tests__/routing.normalizeTicketKey.test.ts

# Full test suite
bun run --cwd server jest
bun run lint
bun run validate:ts
```
