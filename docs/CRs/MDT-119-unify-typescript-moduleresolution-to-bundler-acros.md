---
code: MDT-119
status: Proposed
dateCreated: 2026-01-20T15:02:26.313Z
type: Architecture
priority: Medium
phaseEpic: Build infrastructure
---

# Unify TypeScript moduleResolution to bundler across all packages

## 1. Description

### Requirements Scope
`none` — Skip requirements, use /mdt:architecture

### Problem

- `mcp-server/tsconfig.json` uses legacy `moduleResolution: "node"` with `allowImportingTsExtensions: false`, requiring `.js` extensions in ESM imports for Node.js runtime
- `shared/tsconfig.json` uses legacy `moduleResolution: "node"` without `allowImportingTsExtensions` setting
- `server/tsconfig.json` uses `moduleResolution: "bundler"` but has `allowImportingTsExtensions: false`, creating inconsistency
- Mixed moduleResolution strategies across packages cause import path inconsistencies when packages reference each other

### Affected Artifacts

- `tsconfig.json` (frontend — already optimal, no changes)
- `server/tsconfig.json` (has bundler but inconsistent allowImportingTsExtensions)
- `mcp-server/tsconfig.json` (uses node resolution, needs migration)
- `shared/tsconfig.json` (uses node resolution, needs migration)

### Scope

**Changes**:
- `server/tsconfig.json`: Change `allowImportingTsExtensions: false` to `true`
- `mcp-server/tsconfig.json`: Change `moduleResolution: "node"` to `"bundler"`, set `allowImportingTsExtensions: true`
- `shared/tsconfig.json`: Change `moduleResolution: "node"` to `"bundler"`, add `allowImportingTsExtensions: true`

**Unchanged**:
- Root `tsconfig.json` (frontend — already optimal configuration)
- All source code files (no import statement changes required)

## 2. Decision

### Chosen Approach

Unify all packages to use `moduleResolution: "bundler"` with `allowImportingTsExtensions: true` where `noEmit: true`, enabling extension-free imports across the codebase.

### Rationale

- **Consistency**: All packages use the same moduleResolution strategy, eliminating cross-package import inconsistencies
- **Simplified imports**: No need for `.js` extensions in import statements across all packages
- **Frontend already optimal**: Root `tsconfig.json` already uses this pattern successfully
- **Tool compatibility**: Vite, esbuild, and ts-node all support bundler resolution

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Unified bundler resolution** | All packages use moduleResolution: bundler | **ACCEPTED** - Provides consistency and eliminates .js extension requirement |
| Hybrid approach | Keep bundler for frontend, node for backend | Different resolution strategies complicate cross-package imports and project references |
| NodeNext migration | Migrate all to Node16/NodeNext with .js extensions in imports | Requires modifying all import statements to add .js extensions, high refactoring cost |
| Status quo | Accept current inconsistency | Ongoing maintenance burden, unclear import rules for developers |

## 4. Artifact Specifications

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/tsconfig.json` | Config value changed | `allowImportingTsExtensions: false` → `true` |
| `mcp-server/tsconfig.json` | Config value changed | `moduleResolution: "node"` → `"bundler"`, add `allowImportingTsExtensions: true` |
| `shared/tsconfig.json` | Config value changed | `moduleResolution: "node"` → `"bundler"`, add `allowImportingTsExtensions: true` |

### New Artifacts

None (configuration changes only)

### Integration Points

| From | To | Interface |
|------|-----|-----------|
| Frontend | Shared | `@mdt/shared/*` path alias |
| Server | Shared | `@mdt/shared/*` path alias |
| MCP Server | Shared | `@mdt/shared/*` path alias |

### Key Patterns

- **Bundler resolution**: Applied to all `tsconfig.json` files (root, server, mcp-server, shared)
- **Extension-free imports**: Enabled via `allowImportingTsExtensions: true` where `noEmit: true`

## 5. Acceptance Criteria

### Functional

- [ ] `server/tsconfig.json` has `moduleResolution: "bundler"` and `allowImportingTsExtensions: true`
- [ ] `mcp-server/tsconfig.json` has `moduleResolution: "bundler"` and `allowImportingTsExtensions: true`
- [ ] `shared/tsconfig.json` has `moduleResolution: "bundler"` and `allowImportingTsExtensions: true`
- [ ] All tsconfig files compile without errors
- [ ] `npm run build:all` completes successfully

### Non-Functional

- [ ] `npm run lint:all` completes successfully
- [ ] All npm test commands pass (`npm run test:e2e`, `npm run mcp:test`, `npm run test:domain-contracts`)
- [ ] No changes required to any source code import statements

### Testing

- Build: `npm run build:all` — verifies all packages compile with new configuration
- Lint: `npm run lint:all` — verifies ESLint works with new module resolution
- E2E: `npm run test:e2e` — verifies frontend application runs correctly
- MCP Server: `npm run mcp:test` — verifies MCP server builds and tests pass
- Domain Contracts: `npm run test:domain-contracts` — verifies shared types work correctly

## 6. Verification

### By CR Type

- **Architecture**: All tsconfig files use `moduleResolution: "bundler"` configuration and all build/test commands pass

### Metrics

Verifiable artifacts that exist after implementation:
- `server/tsconfig.json` with updated configuration
- `mcp-server/tsconfig.json` with updated configuration
- `shared/tsconfig.json` with updated configuration
- Successful `npm run build:all` execution
- Successful `npm run lint:all` execution
- All tests passing

## 7. Deployment

### Simple Changes

- Update `server/tsconfig.json`, `mcp-server/tsconfig.json`, and `shared/tsconfig.json`
- Run `npm run build:all` to verify all packages compile
- Run `npm run lint:all` to verify ESLint compatibility
- Run full test suite to verify no runtime issues
