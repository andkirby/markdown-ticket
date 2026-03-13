# Architecture: MDT-098

**Source**: [MDT-098](../MDT-098.md)
**Generated**: 2026-03-13
**Status**: Normal mode (canonical)

## Overview

MDT-098 establishes a **single-entrypoint pattern** for all TOML operations in the codebase. The root cause of the path persistence bug is inconsistent TOML parsers: `ProjectConfigService` writes configuration with `smol-toml`, but `ConfigRepository` reads with the `toml` package, producing incompatible internal representations.

The fix is architectural: centralize all TOML operations through `@mdt/shared/utils/toml.ts`, which wraps `smol-toml` and exports `parseToml()` and `stringify()` functions.

## Pattern: Single-Entrypoint Utilities

```
┌─────────────────────────────────────────────────────────┐
│              Single Source of Truth                     │
│  shared/utils/toml.ts (exports smol-toml functions)    │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌──────▼──────┐
    │  SHARED  │          │   SERVER    │
    │          │          │             │
    │ Project  │          │ Controllers │
    │ Services │          │ Routes      │
    │          │          │ Repositories │
    └──────────┘          └──────┬──────┘
                                 │
                    ┌────────────┴────────────┐
                    │ NO DIRECT TOML IMPORTS  │
                    └─────────────────────────┘
```

## Module Boundaries

### shared/utils/toml.ts (Owner)
**Role**: Single entrypoint for all TOML operations
**Responsibilities**:
- Export `parseToml(content: string): unknown`
- Export `stringify(obj: unknown): string`
- Wrap `smol-toml` library
- No direct usage of other TOML libraries

### Consuming Modules
**Rule**: All TOML operations MUST import from `@mdt/shared/utils/toml.js`

| Module | Current State | Target State |
|--------|---------------|--------------|
| `shared/services/project/ProjectConfigService.ts` | ✅ Uses shared utils | No change |
| `server/repositories/ConfigRepository.ts` | ⚠️ Verify import | Use `parseToml` from shared |
| `server/routes/system.ts` | ❌ Uses `toml` package | Switch to shared utils |
| `shared/tools/config-cli.ts` | ❌ Uses `toml` package | Switch to shared utils |

## Canonical Runtime Flow

### Reading Configuration

```
File (.mdt-config.toml)
    ↓
ConfigRepository.getConfig()
    ↓
parseToml(content) from @mdt/shared/utils/toml.ts
    ↓
ProjectConfiguration object
    ↓
Services/Controllers
```

### Writing Configuration

```
Service (e.g., ProjectConfigService.configureDocumentsByPath())
    ↓
Modify config object
    ↓
stringify(config) from @mdt/shared/utils/toml.ts
    ↓
File (.mdt-config.toml)
```

## Architecture Invariants

1. **Single Parser Rule**: All TOML operations use `smol-toml` via `@mdt/shared/utils/toml.ts`
2. **Import Ban**: No direct imports of `toml` package in `server/` or `shared/` directories
3. **Dependency Cleanup**: `toml` v3.0.0 removed from `package.json` after verification
4. **Data Integrity**: Parse → Modify → Stringify roundtrip preserves data structure

## Runtime Prerequisites

- `smol-toml` v1.5.2 must be installed in `shared/package.json`
- `@mdt/shared` must be built before server/CLI can import from it

## Error Philosophy

TOML parse errors are handled at the call site:
- `ConfigRepository`: Returns default config on parse failure (lines 70-73)
- CLI: Reports validation errors to user
- API: Returns 400 Bad Request for invalid TOML

## Extension Rule

New TOML operations MUST:
1. Import from `@mdt/shared/utils/toml.js`
2. Never import `toml` or `@iarna/toml` directly
3. Use `parseToml()` for reading, `stringify()` for writing

## Verification

### Grep Validation (C1 enforcement)

```bash
# 1. No direct toml imports remain (except shared/utils/toml.ts)
grep -r "from 'toml'" server/ shared/ --include="*.ts" | grep -v "shared/utils/toml"

# 2. Only shared/utils/toml.ts imports smol-toml
grep -r "from 'smol-toml'" shared/ --include="*.ts"

# 3. All imports use @mdt/shared/utils/toml.js
grep -r "@mdt/shared/utils/toml" server/ shared/ --include="*.ts"
```

### E2E Validation (BR-5 enforcement)

```bash
# Run path persistence test
bunx playwright test tests/e2e/documents/path-persistence.spec.ts --project=chromium

# Expected: PASS after TOML standardization complete
```

---
*Canonical artifacts and obligations: [architecture.trace.md](./architecture.trace.md)*
*Rendered by /mdt:architecture via spec-trace*
