# Requirements: MDT-098

**Source**: [MDT-098](../MDT-098.md)
**Type**: Bug Fix
**Generated**: 2026-03-13

## Bug

The codebase uses **TWO different TOML parsers** inconsistently:
- `shared/utils/toml.ts` uses `smol-toml` v1.5.2 ✅ (correct entrypoint)
- `server/repositories/ConfigRepository.ts` uses `toml` v3.0.0 ❌ (bypasses shared utils)
- `server/routes/system.ts` uses `toml` v3.0.0 ❌ (bypasses shared utils)
- `shared/tools/config-cli.ts` uses `toml` ❌ (bypasses shared utils)

**Impact**: Different internal representations cause data corruption when `configureDocumentsByPath()` writes with `smol-toml` but `ConfigRepository` reads with `toml` package.

## Fix Requirements

1. WHEN `ConfigRepository` reads TOML files, the system shall use `@mdt/shared/utils/toml.ts` `parseToml` function
2. WHEN `server/routes/system.ts` reads TOML files, the system shall use `@mdt/shared/utils/toml.ts` `parseToml` function
3. WHEN `shared/tools/config-cli.ts` reads TOML files, the system shall use `@mdt/shared/utils/toml.ts` `parseToml` function
4. AFTER all TOML operations are standardized, the system shall remove the `toml` v3.0.0 package from dependencies

## Constraints

| ID | Constraint | Must Appear In |
|----|------------|----------------|
| C1 | No direct imports of `toml` package shall remain in `server/` or `shared/` (except `shared/utils/toml.ts`) | tasks.md (Verify: `grep` validation) |

## Delivery Timing

- BR-1: In This Ticket
- BR-2: In This Ticket
- BR-3: In This Ticket
- BR-4: In This Ticket

## Semantic Decisions

None - this is a straightforward refactoring with clear technical specification.

## Verification

After changes, verify:

```bash
# 1. No direct toml imports remain (except `shared/utils/toml.ts`)
grep -r "from 'toml'" server/ shared/ --include="*.ts" | grep -v "shared/utils/toml"

# 2. Only `shared/utils/toml.ts` imports smol-toml
grep -r "from 'smol-toml'" shared/ --include="*.ts"

# 3. All imports use `@mdt/shared/utils/toml.js`
grep -r "@mdt/shared/utils/toml" server/ shared/ --include="*.ts"
```

---
*Canonical requirements and route summaries: [requirements.trace.md](./requirements.trace.md)*
*Rendered by /mdt:requirements via spec-trace*
