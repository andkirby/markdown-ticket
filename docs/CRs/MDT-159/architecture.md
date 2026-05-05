# Architecture

## Overview

MDT-159 centralizes CR key number formatting into a single `formatCrKey()` function in `shared/utils/keyNormalizer.ts`, replacing 10 hardcoded `padStart(3, '0')` call sites across shared, frontend, server, and test code. The change is a pure utility extraction with no structural modifications — one new exported function, 10 mechanical import-and-replace operations, zero new dependencies.

## Pattern: Single Source of Truth Utility

**Pattern**: Centralized formatting function in an existing utility module.

**Rationale**: `keyNormalizer.ts` already owns all CR key formatting responsibility and is imported across every layer (shared services, frontend, server, MCP server, CLI). Adding `formatCrKey()` as a sibling export avoids import fragmentation while maintaining a single source of truth. No new file, no new module, no new dependency.

## Module Boundaries

### Owner: `shared/utils/keyNormalizer.ts`

`keyNormalizer.ts` is the sole owner of CR key formatting. It exports:

| Function | Purpose |
|----------|---------|
| `formatCrKey(projectCode, number)` | **New** — Format a CR key with dynamic zero-padding. Pure function. |
| `normalizeKey(key, projectCode)` | Existing — Normalize arbitrary key input to standard format. Will internally delegate to `formatCrKey` for padding. |
| `KeyNormalizationError` | Existing — Error class for normalization failures. |

**C1 (no filename migration)**: `formatCrKey` only affects the *display* and *generation* of keys. It does not touch the filesystem. Existing ticket files (`MDT-001.md` through `MDT-159.md`) remain untouched.

**C4 (pure string operation)**: The function body consists solely of `String()`, `Math.max()`, and `padStart()` — no I/O, no async, no side effects.

### Consumer layers (no ownership, import-and-call only)

| Layer | Files | What changes |
|-------|-------|-------------|
| **Shared services** | `TicketService.ts` | Import `formatCrKey`, replace inline `padStart(3,'0')` in `createCR()` |
| **Frontend** | `routing.ts`, `useQuickSearch.ts` | Import `formatCrKey`, replace inline `padStart(3,'0')` in key normalization |
| **Test helpers** | `test-ticket-builder.ts`, `TicketCodeHelper.ts` | Import `formatCrKey`, replace inline `padStart(3,'0')` in code generation |
| **Test fixtures** | `WorktreeService.test.ts`, `MarkdownService.scanTicketMetadata.test.ts` | Import `formatCrKey`, replace inline `padStart(3,'0')` in data generation |
| **Server mocks** | `TicketService.ts` (mock) | Import `formatCrKey`, replace inline `padStart(3,'0')` in mock key generation |

## Canonical Runtime Flow

### Flow: CR Key Formatting

```text
formatCrKey(projectCode, number)
  └─ String(number)          → convert to string
  └─ Math.max(3, length)     → compute padding width (min 3)
  └─ padStart(width, '0')    → apply zero-padding
  └─ return `${projectCode}-${padded}`
```

This is the single canonical flow for all CR key formatting. Every call site delegates to this function. There is no alternative path.

## Frontend Integration

### Routing (`src/utils/routing.ts`)
`normalizeTicketKey()` currently uses `padStart(3, '0')` to normalize ticket numbers in URL paths. After migration, it calls `formatCrKey()` for the padding step. URLs like `/prj/MDT/ticket/MDT-1000` must resolve correctly — the regex `(\d+)` already extracts variable-length numbers, so only the padding call changes.

### Quick Search (`src/hooks/useQuickSearch.ts`)
`normalizeTicketKeyTerm()` currently uses `padStart(3, '0')` to match user input against stored keys. After migration, it calls `formatCrKey()` for padding. Partial input like "1000" must correctly pad to match stored keys. Since stored keys are already zero-padded by `formatCrKey`, the matching logic is preserved.

**Edge-2 compliance**: Neither component performs layout-sensitive rendering of key width. Keys are rendered as text strings in existing flex/grid layouts that accommodate variable-width content. No layout changes required.

## Invariants

1. **Backward compatibility (C2)**: `formatCrKey('MDT', n)` for n ∈ [1, 999] produces identical output to `padStart(3, '0')`. No existing behavior changes.
2. **No filesystem side effects (C1)**: `formatCrKey` is a pure function. It never reads, writes, renames, or moves files.
3. **Single formatting path (C3)**: After migration, every `padStart(3, '0')` for CR key formatting is replaced by `formatCrKey`. No duplicate padding logic remains.
4. **Import direction**: All consumers import from `shared/utils/keyNormalizer.ts`. The import direction is always shared → consumer. No circular dependencies.

## Extension Rule

If future ticket numbering schemes require different padding (e.g., hexadecimal, alphanumeric), `formatCrKey` is the single point to modify. The function signature `formatCrKey(projectCode, number)` is intentionally simple — additional formatting options (prefix patterns, separators) should be new parameters with sensible defaults, not new functions.

## Assessed Mismatch Resolution

Assess recommended **Option 1: Integrate As-Is**. All mismatches from the assess stage are addressed:

| Assess Finding | Architecture Response |
|----------------|----------------------|
| 10 call sites (not 7) | All 10 included in obligations OBL-replace-production-sites and OBL-replace-test-sites |
| Two `normalizeKey` patterns | Both sites in `keyNormalizer.ts` will internally use `formatCrKey` |
| Test fixture assumptions | Test helpers and mocks explicitly included in OBL-replace-test-sites |
| No dependency pressure | No new packages, no config changes |

## Constraint Carryover Addressed

| Constraint | Architecture Response |
|------------|----------------------|
| C1 | OBL-no-filename-migration — `formatCrKey` is pure, no FS operations |
| C2 | OBL-formatcrkey-impl — `Math.max(3, ...)` preserves 3-digit behavior for numbers < 1000 |
| C3 | OBL-replace-production-sites + OBL-replace-test-sites — all 10 sites covered |
| C4 | OBL-formatcrkey-impl — function body is pure `String()/Math.max()/padStart()` only |

## E2E Decision

No E2E test required. BDD explicitly noted `framework: "none"` for this technical debt change — the behavior is a pure utility function verified through unit tests. Manual verification: create a test ticket at number 1000+ and confirm key format in UI.
