# Assessment: MDT-159

## Verdict

**Recommendation**: Option 1 — Integrate As-Is

## Resolved Open Questions

The ticket listed two open questions. Both are resolved as follows:

| Question | Decision | Rationale |
|----------|----------|----------|
| Naming: `formatCrKey` or `formatTicketKey`? | **`formatCrKey`** | Aligns with existing `keyNormalizer.ts` naming conventions — the module uses "key" terminology (e.g., `normalizeKey`, `KeyNormalizationError`). The CR domain term matches the codebase's `CR`, `CRStatus`, `CRType` naming pattern. |
| Location: `keyNormalizer.ts` or new file? | **`keyNormalizer.ts`** | Already imported across all layers (shared, frontend, server, MCP, CLI). Adding a new sibling file would fragment imports without benefit. The function is small enough to coexist. |

## Feature Pressure

### Target Feature Needs
- Single `formatCrKey(projectCode, number)` function producing correct keys for any ticket number (3-digit through 5-digit+)
- Dynamic padding: `Math.max(3, String(num).length)` replaces hardcoded `padStart(3, '0')`
- All 10 hardcoded `padStart(3, '0')` sites replaced with centralized call
- Existing tickets (MDT-001 through MDT-157) completely unaffected

### Current System Assumptions
- CR numbers are always zero-padded to exactly 3 digits
- Keys are stored as `{CODE}-{3-digit-number}` (e.g., `MDT-005`)
- Regex parsing already uses `(\d+)` — variable-length number extraction
- Sort is by parsed integer, not lexicographic string
- Test helpers generate keys with `padStart(3, '0')` matching production code
- `keyNormalizer.ts` is the existing canonical source for key formatting logic

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | Feature fits naturally into existing `shared/utils/` module; `keyNormalizer.ts` already owns key formatting responsibility |
| Extension Fit | Healthy | Single insertion point: add `formatCrKey()` to `keyNormalizer.ts` (or new sibling file); all 10 call sites import and call it |
| Dependency Fit | Healthy | No new packages, no runtime changes, no config changes — pure string utility refactoring |
| Verification Fit | Healthy | Existing `keyNormalizer.test.ts` has 30+ test cases; `TicketService` tests cover key generation; test helpers can be updated alongside |
| Redesign Scope | Healthy | Change is local: 1 new function + 10 import-and-replace call sites, zero structural changes |

## Mismatch Points

No concerning or critical mismatches identified. The feature maps cleanly onto existing architecture.

### Scope correction: 10 call sites, not 7

The ticket's acceptance criteria reference "7 hardcoded `padStart(3)` sites." Codebase grep found **10 sites** (3 additional in test fixtures and mocks). All 10 are in scope and must be replaced. The acceptance criteria should be updated to reflect the actual count.

### Additional observations
- **Test fixture assumptions**: `WorktreeService.test.ts` line 419 generates keys with inline `padStart(3, '0')` — must also be updated but is test-only code.
- **Two `normalizeKey` patterns in `keyNormalizer.ts`**: Lines 54 and 76 each have their own `padStart(3, '0')`. Both should use the new `formatCrKey()` internally for consistency.

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: none
- Testing/E2E impact: none (existing tests updated in-place, no new test harness needed)
- Main risk introduced: none — backward compatible by design (`Math.max(3, ...)` preserves 3-digit padding for numbers < 1000)

## Verification Gaps

- Preservation tests needed: none — existing `keyNormalizer.test.ts` already covers normalization with edge cases (large numbers like `999999` pass through correctly)
- E2E/contract drift risks: none — key format is internal, URLs and API responses already use string keys
- Safe-to-refactor now?: yes — all call sites are findable via `grep "padStart(3"`, all have tests

## Recommendation

### Option 1: Integrate As-Is
Use when: The feature is a pure utility extraction with well-defined boundaries. No structural changes needed. All 10 call sites are mechanical replacements. The `keyNormalizer.ts` module already owns this responsibility.

Architecture impact: minimal — add one function, replace 10 call sites

### Option 2: Redesign Inline
Not needed. No bounded redesign required.

### Option 3: Redesign First
Not needed. No foundational redesign required.

## Acceptance Criteria Traceability

| Functional AC | How `Math.max(3, String(num).length)` satisfies it |
|---------------|-----------------------------------------------------|
| `formatCrKey('MDT', 1)` → `MDT-001` | `String(1).length` = 1, `Math.max(3, 1)` = 3 → pad to 3 digits |
| `formatCrKey('MDT', 999)` → `MDT-999` | `String(999).length` = 3, `Math.max(3, 3)` = 3 → pad to 3 digits (no change) |
| `formatCrKey('MDT', 1000)` → `MDT-1000` | `String(1000).length` = 4, `Math.max(3, 4)` = 4 → pad to 4 digits (identity, already 4) |
| `formatCrKey('MDT', 10000)` → `MDT-10000` | `String(10000).length` = 5, `Math.max(3, 5)` = 5 → pad to 5 digits (identity, already 5) |

All 10 call sites are in scope for replacement (see Implementation Notes below).

## Verification Approach

The ticket specifies these verification steps. All are sufficient with no additions needed:

| Verification Step | Status | Notes |
|-------------------|--------|-------|
| `bun run validate:ts` passes | Sufficient | Catches type errors from import changes |
| `bun run --cwd server jest` passes | Sufficient | Covers shared unit tests including `keyNormalizer.test.ts` |
| `bun run lint` passes | Sufficient | Catches unused imports from removed `padStart` calls |
| Manual: create test ticket at number 1000+ | Sufficient | Confirms end-to-end key format correctness |

No additional verification steps are needed beyond what the ticket already specifies.

## Implementation Notes

### Preferred location
Place `formatCrKey()` in `shared/utils/keyNormalizer.ts` — it already owns key formatting and is imported across all layers (shared, frontend, server, MCP, CLI). Adding a new sibling file (`crKeyFormatter.ts`) would add import fragmentation without benefit.

### Actual call sites (10 found, not 7)

| # | File | Line | Context |
|---|------|------|---------|
| 1 | `shared/services/TicketService.ts` | 307 | New ticket key generation |
| 2 | `shared/utils/keyNormalizer.ts` | 54 | Numeric key normalization |
| 3 | `shared/utils/keyNormalizer.ts` | 76 | Full-format key normalization |
| 4 | `shared/test-lib/ticket/test-ticket-builder.ts` | 135 | Test helper |
| 5 | `shared/test-lib/ticket/helpers/TicketCodeHelper.ts` | 55 | Test helper |
| 6 | `shared/services/__tests__/WorktreeService.test.ts` | 419 | Test fixture |
| 7 | `shared/tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts` | 214-215 | Test fixture |
| 8 | `src/utils/routing.ts` | 15 | Frontend URL routing |
| 9 | `src/hooks/useQuickSearch.ts` | 93 | Quick search input |
| 10 | `server/tests/mocks/shared/services/TicketService.ts` | 181 | Server test mock |

### Key design decision
- `formatCrKey(code, num)` in `keyNormalizer.ts` (not new file)
- Internal use by `normalizeKey()` for the two padding sites
- Export for direct use by all other call sites
- `keyNormalizer.test.ts` extended with formatCrKey-specific tests (4-digit, 5-digit boundaries)
