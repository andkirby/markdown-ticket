# Tasks: MDT-159

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **Core function**: `shared/utils/keyNormalizer.ts` — add `formatCrKey()` export
- **Production call sites**: TicketService, routing.ts, useQuickSearch.ts — replace inline `padStart(3, '0')`
- **Test call sites**: test helpers, fixtures, mocks — replace inline `padStart(3, '0')`
- **Out of scope**: Folder restructuring, archive functionality, counter file changes, ticket file renaming

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| CR key number formatting | `shared/utils/keyNormalizer.ts` | N/A — single owner |
| Key normalization (parsing + formatting) | `shared/utils/keyNormalizer.ts` | N/A — single owner |

## Constraint Coverage

| Constraint ID | Tasks | Verification |
|---------------|-------|-------------|
| C1 | Task 3 | `git diff --name-only -- docs/CRs/` shows zero changes |
| C2 | Task 1 | Exhaustive unit test n∈[1,999] matches `padStart(3, '0')` |
| C3 | Task 2, Task 3 | `grep "padStart(3" --include="*.ts" shared/ src/ server/` returns zero |
| C4 | Task 1 | Unit tests verify return type, input immutability, idempotency |

## Milestones

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint |
|-----------|------------------------|-------|------------|
| M1: Core Function | BR-1, BR-2 | Task 1 | `TEST-formatcrkey-unit` GREEN, all 5 BDD scenarios satisfied |
| M2: Production Migration | Edge-2 | Task 2 | `TEST-routing-keys` GREEN, routing/quick search handle 4-5 digit keys |
| M3: Test Migration + Audit | BR-3, C1, C3 | Task 3 | `TEST-call-site-audit` GREEN, `TEST-no-migration-audit` GREEN |

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| shared/utils/ (runtime) | 1 | 1 | 0 | ✅ |
| shared/services/ (runtime) | 1 | 1 | 0 | ✅ |
| src/utils/ (runtime) | 1 | 1 | 0 | ✅ |
| src/hooks/ (runtime) | 1 | 1 | 0 | ✅ |
| shared/test-lib/ (test) | 2 | 2 | 0 | ✅ |
| shared/tests/ (test) | 1 | 1 | 0 | ✅ |
| shared/services/__tests__/ (test) | 1 | 1 | 0 | ✅ |
| server/tests/mocks/ (test) | 1 | 1 | 0 | ✅ |

## Tasks

### Task 1: Implement formatCrKey in keyNormalizer.ts (M1)

**Structure**: `shared/utils/keyNormalizer.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-formatcrkey-unit` → `shared/utils/__tests__/formatCrKey.test.ts`: 19 tests covering BR-1, BR-2, C2, C4, Edge-1

**Makes GREEN (Behavior)**:
- `cr_key_3digit_boundary` → BR-1, BR-2
- `cr_key_3digit_padding` → BR-1, BR-2
- `cr_key_4digit` → BR-1, BR-2
- `cr_key_5digit` → BR-1, BR-2
- `cr_key_different_project` → BR-2

**Scope**: Implement the `formatCrKey(projectCode, number)` function as a new export from `keyNormalizer.ts`

**Boundary**: Only adds the new function — does not modify existing `normalizeKey()` behavior yet

**Creates**:
- `formatCrKey(projectCode: string, number: number): string` export in `shared/utils/keyNormalizer.ts`

**Modifies**:
- `shared/utils/keyNormalizer.ts` — add `formatCrKey` export

**Must Not Touch**:
- `normalizeKey()` function (no changes to existing normalization logic in this task)
- Any call sites (handled in Task 2 and Task 3)
- Any files outside `shared/utils/keyNormalizer.ts`

**Exclude**:
- No changes to `normalizeKey()` — that migration is part of Task 2
- No new files — function lives in existing module
- No new dependencies

**Anti-duplication**: This is the single source of truth for CR key formatting. No other module should implement padding logic.

**Duplication Guard**:
- Check `keyNormalizer.ts` for existing padding logic before writing `formatCrKey`
- The two existing `padStart(3, '0')` calls in `normalizeKey()` (lines 54, 76) should remain untouched in this task — they will be refactored to call `formatCrKey` internally in Task 2

**Verify**:

```bash
bun run --cwd server jest shared/utils/__tests__/formatCrKey.test.ts
```

**Done when**:
- [ ] `formatCrKey` exported from `shared/utils/keyNormalizer.ts`
- [ ] `TEST-formatcrkey-unit` passes (19 tests GREEN — were RED)
- [ ] Function body is pure: only `String()`, `Math.max()`, `padStart()` (C4)
- [ ] `formatCrKey('MDT', 1)` → `'MDT-001'`, `formatCrKey('MDT', 1000)` → `'MDT-1000'`

---

### Task 2: Replace padStart(3, '0') in production call sites (M2)

**Structure**: `shared/services/TicketService.ts`, `src/utils/routing.ts`, `src/hooks/useQuickSearch.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-routing-keys` → `src/utils/__tests__/routing.normalizeTicketKey.test.ts`: 9 tests covering Edge-2

**Scope**: Replace all 3 production `padStart(3, '0')` call sites with `formatCrKey()`, including the 2 internal sites in `keyNormalizer.ts`'s own `normalizeKey()`

**Boundary**: Only production code — test helpers and mocks are Task 3

**Creates**:
- Nothing new

**Modifies**:
- `shared/utils/keyNormalizer.ts` — refactor `normalizeKey()` to call `formatCrKey()` internally (lines 54, 76)
- `shared/services/TicketService.ts` — replace inline `padStart(3, '0')` in `createCR()` with `formatCrKey(project.project.code, nextNumber)`
- `src/utils/routing.ts` — replace inline `padStart(3, '0')` in `normalizeTicketKey()` with `formatCrKey()`
- `src/hooks/useQuickSearch.ts` — replace inline `padStart(3, '0')` in `normalizeTicketKeyTerm()` with `formatCrKey()`

**Must Not Touch**:
- Any test files (Task 3)
- Any other source files
- Ticket files on disk (C1)

**Exclude**:
- No new test files — existing `TEST-routing-keys` provides regression coverage
- No API contract changes — function return type is identical for n < 1000
- No layout changes — keys are rendered as text strings in existing flex/grid layouts

**Anti-duplication**: Import `formatCrKey` from `shared/utils/keyNormalizer.ts` — do NOT re-implement padding in any consumer.

**Duplication Guard**:
- Each modified file must import `formatCrKey` from `@mdt/shared/utils/keyNormalizer` (or the appropriate import path)
- Verify no new `padStart(3` calls introduced — only removals
- After migration, `normalizeKey()` in `keyNormalizer.ts` should call `formatCrKey` internally for padding (no duplicate padding logic)

**Verify**:

```bash
bun run --cwd server jest src/utils/__tests__/routing.normalizeTicketKey.test.ts
bun run --cwd server jest shared/utils/__tests__/keyNormalizer.test.ts
```

**Done when**:
- [ ] All 5 production sites use `formatCrKey` (TicketService + 2 in keyNormalizer + routing + useQuickSearch)
- [ ] `TEST-routing-keys` GREEN
- [ ] Existing `keyNormalizer.test.ts` still passes (backward compatibility preserved)
- [ ] `grep "padStart(3" shared/services/TicketService.ts shared/utils/keyNormalizer.ts src/utils/routing.ts src/hooks/useQuickSearch.ts` returns zero matches

---

### Task 3: Replace padStart(3, '0') in test helpers/mocks + structural audits (M3)

**Structure**: `shared/test-lib/ticket/test-ticket-builder.ts`, `shared/test-lib/ticket/helpers/TicketCodeHelper.ts`, `shared/services/__tests__/WorktreeService.test.ts`, `shared/tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts`, `server/tests/mocks/shared/services/TicketService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-call-site-audit` → structural audit: `grep "padStart(3" --include="*.ts" shared/ src/ server/` returns zero matches
- `TEST-no-migration-audit` → structural audit: `git diff --name-only -- docs/CRs/` shows zero changes

**Scope**: Replace all 5 test/mock `padStart(3, '0')` call sites with `formatCrKey()`, then run structural verification audits

**Boundary**: Only test helpers, fixtures, and mocks — no production code changes

**Creates**:
- Nothing new

**Modifies**:
- `shared/test-lib/ticket/test-ticket-builder.ts` — replace `padStart(3, '0')` in `generateTicketCode()` (line 135)
- `shared/test-lib/ticket/helpers/TicketCodeHelper.ts` — replace `padStart(3, '0')` in `generateCode()` (line 55)
- `shared/services/__tests__/WorktreeService.test.ts` — replace `padStart(3, '0')` in worktree generation (line 419)
- `shared/tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts` — replace `padStart(3, '0')` in batch file creation (lines 214-215)
- `server/tests/mocks/shared/services/TicketService.ts` — replace `padStart(3, '0')` in mock key generation (line 181)

**Must Not Touch**:
- Any production source files
- Any test files not listed above
- Ticket files on disk (C1)

**Exclude**:
- No new test logic — only mechanical replacements
- No behavioral changes to test assertions

**Anti-duplication**: Import `formatCrKey` from `shared/utils/keyNormalizer.ts` — do NOT re-implement padding.

**Duplication Guard**:
- Each modified test file must import `formatCrKey` from the shared module
- Verify no new `padStart(3` calls introduced
- Verify existing tests still pass after replacement

**Verify**:

```bash
# Structural audit: zero padStart(3,'0') remaining in entire codebase
grep -rn "padStart(3" --include="*.ts" shared/ src/ server/ | grep -v "node_modules" | grep -v ".gitWT"
# Expected: zero matches

# Migration audit: no ticket files changed
git diff --name-only -- docs/CRs/
# Expected: empty output

# Full test suite
bun run --cwd server jest
bun run lint
bun run validate:ts
```

**Done when**:
- [ ] All 5 test/mock sites use `formatCrKey`
- [ ] `grep "padStart(3" --include="*.ts" shared/ src/ server/` returns zero matches (C3 satisfied)
- [ ] `git diff --name-only -- docs/CRs/` shows zero changes (C1 satisfied)
- [ ] Full test suite passes (`bun run --cwd server jest`)
- [ ] Lint passes (`bun run lint`)
- [ ] TypeScript validation passes (`bun run validate:ts`)

## Post-Implementation

- [ ] No duplication (grep check for `padStart(3` across codebase)
- [ ] Scope boundaries respected (no production files touched in Task 3, no test files touched in Task 2)
- [ ] All unit tests GREEN
- [ ] All BDD scenarios satisfied (via unit test coverage)
- [ ] Smoke test passes: `bun run dev:full` starts, tickets display correctly
- [ ] Manual verification: create a test ticket at number 1000+ and verify key format
