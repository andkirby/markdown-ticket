# Tasks: MDT-098

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking
**Generated**: 2026-03-13

## Overview

MDT-098 establishes a single-entrypoint pattern for TOML operations. **The code has already been standardized** - investigation confirmed all files correctly use `@mdt/shared/utils/toml.ts`. The remaining work is cleanup (removing unused dependencies) and validation.

## Scope Boundaries

- **TOML Operations**: Single entrypoint via `@mdt/shared/utils/toml.ts`
- **Excluded**: Modifying TOML file format, changing configuration structure

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 2 |

## Tasks

### Task 1: Remove unused toml package dependencies

**Structure**: `package.json`

**Makes GREEN (Automated Tests)**:
- `TEST-toml-standardization` → `server/tests/unit/toml-standardization.test.ts`: "shall not have direct imports of 'toml' in server/ or shared/'"

**Scope**: Remove unused `toml` v3.0.0 package from dependency manifests
**Boundary**: Does NOT modify any code files (already standardized)

**Creates**: None

**Modifies**:
- `server/package.json` — Remove `"toml": "^3.0.0"` from dependencies (line 49)
- `shared/package.json` — Remove `"toml": "^3.0.0"` from dependencies (line 65)

**Must Not Touch**:
- Any source code files (already using correct entrypoint)
- `smol-toml` dependency (keep this)

**Exclude**: No code changes, dependency removal only

**Duplication Guard**:
- Check that `toml` package is not imported anywhere before removal (grep verification)

**Verify**:
```bash
# 1. Confirm toml removed from package.json
grep "toml" server/package.json shared/package.json || echo "✅ toml removed"

# 2. Run unit tests
bun run --cwd server jest tests/unit/toml-standardization.test.ts
```

**Done when**:
- [x] `toml` package removed from both `package.json` files
- [x] Unit test passes (confirms no direct imports remain)
- [x] `bun install` completes without errors

**Status**: ✅ COMPLETED (2026-03-13)

---

### Task 2: Verify TOML standardization and run validation tests

**Structure**: `server/`, `shared/`, `tests/`

**Makes GREEN (Automated Tests)**:
- `TEST-toml-standardization` → `server/tests/unit/toml-standardization.test.ts`: All TOML standardization tests

**Scope**: Validate that TOML standardization is complete and all tests pass
**Boundary**: Verification only - no code changes expected

**Creates**: None

**Modifies**: None (verification task)

**Must Not Touch**:
- Any production code (already standardized)

**Exclude**: No implementation work, only validation. E2E testing is out of scope due to separate test infrastructure timing issues.

**Duplication Guard**:
- Verify all consuming modules import from `@mdt/shared/utils/toml.ts` (no direct `toml` imports)

**Verify**:
```bash
# 1. Run unit tests
bun run --cwd server jest tests/unit/toml-standardization.test.ts

# 2. Verify grep validation (from tests)
grep -r "from 'toml'" server/ shared/ --include="*.ts" | grep -v "shared/utils/toml" || echo "✅ No direct toml imports"
```

**Done when**:
- [x] All unit tests GREEN (TEST-toml-standardization)
- [x] Grep validation passes (no direct `toml` imports)

**Status**: ✅ COMPLETED (2026-03-13)

---

## Post-Implementation

- [x] No duplication (grep check confirms single entrypoint)
- [x] Scope boundaries respected (only dependency cleanup)
- [x] All unit tests GREEN (TEST-toml-standardization)

## Implementation Notes

**Status**: Code is already standardized. Tasks 1 and 2 are cleanup/validation only.

**Background Agent Findings**:
- ✅ `ConfigRepository` uses `@mdt/shared/utils/toml.js`
- ✅ `system.ts` uses `@mdt/shared/utils/toml.js`
- ✅ `config-cli.ts` uses `../utils/toml.js`
- ✅ `ProjectConfigService` uses `../../utils/toml.js`
- ✅ No direct `toml` imports found in codebase

**Remaining Work**:
1. Remove unused `toml` package from 2 `package.json` files
2. Run validation tests to confirm everything works

---
*Canonical tasks and ownership: [tasks.trace.md](./tasks.trace.md)*
*Rendered by /mdt:tasks via spec-trace*
