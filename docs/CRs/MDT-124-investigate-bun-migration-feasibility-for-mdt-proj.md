---
code: MDT-124
status: Proposed
dateCreated: 2026-02-08T20:44:03.189Z
type: Research
priority: Medium
---

# Investigate Bun migration feasibility for MDT project

## 1. Description

Investigate whether the MDT monorepo can migrate from npm (package manager) and Node.js (runtime) to Bun, and document the effort, risks, and benefits.

The project currently uses:
- **npm** for package management with workspaces (root + shared, server, mcp-server, domain-contracts)
- **Node.js 20** as the runtime
- **tsx** for TypeScript execution in dev mode across all workspaces
- **ts-jest** with Jest for testing across 4 workspace configs
- **Vite** for frontend bundling
- **Express** for backend HTTP servers
- **Docker** with `node:20-alpine` base images (3 Dockerfiles)

### Motivation

Bun offers significant developer experience improvements:
- ~5-10x faster package installs
- Native TypeScript execution (eliminates tsx dependency)
- Built-in test runner (potential Jest replacement)
- Faster script execution

## 2. Rationale

The project has accumulated complexity in its build/test toolchain (ts-jest ESM presets, build-fix-imports.js for ESM import patching, tsx as a dev dependency). Bun could simplify this while improving DX speed.

This research will determine whether migration is viable, what the migration path looks like, and whether it should be done incrementally or all-at-once.

## 3. Research Questions

### 3.1 Package Management (Low Risk)
- Does `bun install` correctly resolve npm workspaces with the current structure?
- Are all dependencies compatible (no npm-only post-install scripts)?
- Can `bun.lock` replace `package-lock.json` cleanly?

### 3.2 Runtime Compatibility (Medium Risk)
- Do all `node:*` built-in module imports work under Bun?
  - server/ uses: `node:path`, `node:fs`, `node:http`, `node:child_process`, `node:events`, `node:url`
  - mcp-server/: standard Node APIs only (no child_process usage in src/)
- Does Express 4.x (server) and Express 5.x (mcp-server) work correctly under Bun?
- Does `chokidar` file watching work under Bun on macOS and Linux?
- Does the MCP SDK (`@modelcontextprotocol/sdk`) stdio transport work under Bun?

### 3.3 Test Infrastructure (High Risk — Main Friction)
- **4 Jest configs** with complex setups:
  - Root: `jsdom` environment, `ts-jest` ESM preset, `@testing-library/react`
  - server/: custom `jest-resolver.cjs`, complex `moduleNameMapper` with mocks
  - mcp-server/: `ts-jest` ESM preset, dynamic tsconfig selection, E2E tests spawning server processes
  - shared/: `ts-jest` ESM preset, `forceExit: true` for process cleanup
- Migration paths to evaluate:
  1. Keep Jest, replace `ts-jest` with `@swc/jest` or Bun's native TS transformer
  2. Switch to `bun test` — assess Jest API compatibility (mocks, custom environments, moduleNameMapper)
  3. Hybrid: `bun test` for unit tests, Jest for integration/E2E

### 3.4 Build Toolchain
- Can `build-fix-imports.js` (mcp-server) run under Bun? (uses `child_process.execSync` + `glob`)
- Does `tsc` compilation work when invoked via Bun?
- Does `tsc-alias` (server build) work under Bun?
- Is Vite fully compatible with Bun as the runtime?

### 3.5 Docker
- Evaluate `oven/bun:latest` vs `oven/bun:alpine` base images
- Replace `npm ci` with `bun install --frozen-lockfile`
- Assess image size differences
- Verify health checks work (`node -e "..."` → `bun -e "..."`)

### 3.6 CI/CD & Developer Tooling
- Husky git hooks compatibility
- Playwright E2E tests under Bun
- ESLint execution under Bun
- `knip` dead code detection under Bun

## 4. Proposed Investigation Steps

1. **Spike: Package manager only** — Run `bun install` in the repo, verify workspace resolution, run existing npm scripts with `bun run`
2. **Spike: Runtime swap** — Run `bun server/server.ts` directly, test Express + chokidar behavior
3. **Spike: Test runner** — Try `bun test` on the simplest test suite (shared/), document what breaks
4. **Spike: Docker** — Build one Dockerfile with Bun base image, compare size and build time
5. **Document findings** — Produce migration plan with effort estimates per workspace

## 5. Expected Deliverables

- Feasibility verdict: Go / No-Go / Incremental
- Risk matrix per workspace (root, shared, server, mcp-server)
- Recommended migration path (incremental vs big-bang)
- List of blockers (if any) with workarounds
- Effort estimate per phase

## 6. Acceptance Criteria

- [ ] All research questions in Section 3 have documented answers
- [ ] At least one spike (Section 4) has been executed with results
- [ ] A clear recommendation is provided with justification
- [ ] Any blockers are identified with severity assessment

## 7. Initial Findings (Pre-Research)

Preliminary analysis from codebase review:

| Area | Compatibility | Risk | Notes |
|------|--------------|------|-------|
| Package install | High | Low | Bun supports npm workspaces natively |
| Express 4.x/5.x | High | Low | Well-tested on Bun |
| Vite | High | None | Officially supported |
| chokidar | High | Low | Uses native fs events |
| tsx removal | High | None | Bun runs TS natively |
| Jest + ts-jest | Low | **High** | 4 complex configs with ESM presets, mocks, custom resolvers |
| Docker images | High | Low | `oven/bun:alpine` available |
| MCP SDK stdio | Unknown | Medium | Needs testing — stdio transport relies on Node process model |
| Playwright | High | Low | Runtime-agnostic |
| Husky | High | Low | Needs minor config change |
| build-fix-imports.js | High | Low | Uses child_process + glob, both Bun-compatible |

### Recommended Incremental Approach

**Phase 1 (Zero risk):** Use Bun as package manager only (`bun install`), keep Node as runtime
**Phase 2 (Low risk):** Replace `tsx` dev scripts with `bun` runtime (`bun server.ts` instead of `tsx server.ts`)
**Phase 3 (Medium risk):** Migrate Dockerfiles to Bun base images
**Phase 4 (High risk):** Migrate test infrastructure from Jest+ts-jest to bun test or Jest+@swc/jest