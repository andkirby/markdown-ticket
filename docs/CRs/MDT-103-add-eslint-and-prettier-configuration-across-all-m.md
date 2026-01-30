---
code: MDT-103
status: Implemented
dateCreated: 2025-12-24T14:16:29.160Z
implementationDate: 2025-12-24
type: Technical Debt
priority: Medium
---

# Add ESLint and Prettier configuration across all monorepo packages

## 1. Description

### Problem
- Root `package.json` contains `eslint . --ext ts,tsx` command that only lints root/frontend files
- Workspace packages (`server/`, `mcp-server/`, `shared/`, `domain-contracts/`) lack ESLint configuration files
- Running `npm run lint` in workspace packages falls back to ESLint defaults (no rules)
- No Prettier configuration exists for consistent code formatting across monorepo
- Different packages have different linting needs (React frontend vs Node.js backend)

### Affected Artifacts
- `package.json` (root) - contains frontend-only lint script
- `server/package.json` - has `npm run lint` but no ESLint config
- `mcp-server/package.json` - has `npm run lint` but no ESLint config
- `shared/package.json` - has tests but no lint configuration
- `domain-contracts/package.json` - has tests but no lint configuration
- `.eslintrc.cjs` (root) - legacy config, should be replaced

### Scope
- **Changes**: Add ESLint configs to each workspace package, add root lint scripts for all packages, add Prettier config
- **Unchanged**: Existing lint behavior for root/frontend, existing package structures

## 2. Decision

### Chosen Approach
Use Sheriff (eslint-config-sheriff) with per-package ESLint configs and shared root Prettier config.

### Rationale
- Sheriff provides pre-configured ESLint rules for TypeScript, React, and Jest
- Per-package configs allow different rules (React for frontend, Node.js for backend)
- Root Prettier config ensures consistent formatting across all packages
- Single hoisted Sheriff dependency reduces duplication
- `tsconfigRootDir: import.meta.dirname` ensures each package uses its own tsconfig

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Sheriff with per-package configs | **ACCEPTED** - Balances consistency with package-specific needs |
| Base ESLint configs | Manual rule configuration for each package | Too much maintenance, Sheriff provides opinionated defaults |
| Single root config only | One eslint.config.ts for entire monorepo | React rules incorrectly applied to Node.js packages |
| No Prettier, ESLint format only | Use ESLint for both linting and formatting | Less flexible formatting, team may prefer Prettier |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `eslint.config.ts` (root) | ESLint config | React + Playwright rules for frontend |
| `server/eslint.config.ts` | ESLint config | Jest rules for Express.js backend |
| `mcp-server/eslint.config.ts` | ESLint config | Jest rules for MCP server |
| `shared/eslint.config.ts` | ESLint config | Jest rules for shared TypeScript library |
| `domain-contracts/eslint.config.ts` | ESLint config | Jest rules for Zod schema package |
| `.prettierrc.json` (root) | Prettier config | Shared formatting rules for all packages |
| `.prettierignore` (root) | Prettier ignore | Exclude build artifacts and dependencies |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `package.json` (root) | Script added | `lint:all`, `lint:server`, `lint:mcp`, `lint:domain`, `lint:shared` |
| `package.json` (root) | Dependency added | `eslint-config-sheriff`, `prettier` |
| `.eslintrc.cjs` (root) | Deprecated | Replace with `eslint.config.ts` |

## 5. Acceptance Criteria

### Functional
- [x] `eslint.config.ts` exists at root with `react: true, playwright: true`
- [x] `eslint.config.ts` exists in `server/` with `jest: true, react: false`
- [x] `eslint.config.ts` exists in `mcp-server/` with `jest: true, react: false`
- [x] `eslint.config.ts` exists in `shared/` with `jest: true, react: false`
- [x] `eslint.config.ts` exists in `domain-contracts/` with `jest: true, react: false`
- [x] `.prettierrc.json` exists at root
- [x] `.prettierignore` exists at root
- [x] Root `package.json` contains lint scripts for all packages

### Non-Functional
- [x] ESLint recognizes Jest globals in backend packages
- [x] ESLint recognizes React globals in frontend

## 6. Verification

### Metrics
- ESLint's configs: 0 → 5 (root + 4 workspaces)
- Packages with working lint: 1/5 → 5/5
- Prettier configs: 0 → 1
