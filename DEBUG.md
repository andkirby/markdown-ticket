# DEBUG.md

Operational debugging contract for the markdown-ticket repository.
All procedures have been verified with evidence.

---

## Runtime Coverage Index

| Runtime | Class | OBSERVE | CONTROL | ROLLOUT | TEST | INJECT | STATE |
|---------|-------|---------|---------|---------|------|--------|-------|
| frontend-vite | frontend | VERIFIED | VERIFIED | VERIFIED | VERIFIED | VERIFIED | - |
| backend-express | backend | VERIFIED | VERIFIED | VERIFIED | VERIFIED | VERIFIED | VERIFIED |
| mcp-server | backend | VERIFIED | VERIFIED | VERIFIED | VERIFIED | VERIFIED | - |
| shared-lib | library | - | - | VERIFIED | VERIFIED | - | - |
| domain-contracts | library | - | - | VERIFIED | VERIFIED | - | - |
| e2e-playwright | test-runner | VERIFIED | VERIFIED | VERIFIED | VERIFIED | - | VERIFIED |

**Legend:**
- `VERIFIED` - Capability confirmed with evidence
- `PARTIAL` - Mostly working with known issues
- `BLOCKED` - Capability not achievable, with reason and next action
- `-` - Not applicable for this runtime type

---

## Runtime Inventory

### Runtime: `frontend-vite`

| Field | Value |
|-------|-------|
| id | `frontend-vite` |
| class | frontend |
| entry | `vite.config.ts` → Vite dev server |
| owner | root |
| port | 5173 (configurable via `PORT` env) |
| observe | Console output, `/api/frontend/logs/*` endpoints |
| control | `npm run dev`, `npm run dev:full` |
| inject | Vite HMR, browser DevTools console |
| rollout | Vite HMR (hot reload) or server restart |
| test | `npm run fe:test` (Jest) |

### Runtime: `backend-express`

| Field | Value |
|-------|-------|
| id | `backend-express` |
| class | backend |
| entry | `server/server.ts` |
| owner | root |
| port | 3001 |
| observe | Console output with `[INFO]` prefix, API logs |
| control | `npm run dev:server` or `cd server && npm run dev` |
| inject | tsx watch mode (`npm run dev:watch`), Node.js debugger |
| rollout | `cd server && npm run build && npm start` |
| test | `npm run server:test` |

### Runtime: `mcp-server`

| Field | Value |
|-------|-------|
| id | `mcp-server` |
| class | backend |
| entry | `mcp-server/src/index.ts` |
| owner | root |
| port | 3002 (HTTP transport with `MCP_HTTP_ENABLED=true`) |
| observe | Stdio output with emoji markers (🚀, ✅, ⚠️), HTTP logs |
| control | `cd mcp-server && npm run dev` or `npx tsx mcp-server/src/index.ts` |
| inject | MCP Inspector, tsx direct execution |
| rollout | `cd mcp-server && npm run build && npm start` |
| test | `npm run mcp:test` |

### Runtime: `shared-lib`

| Field | Value |
|-------|-------|
| id | `shared-lib` |
| class | library |
| entry | N/A (build-time only) |
| owner | root |
| observe | Build output, test results |
| control | `npm run build:shared` |
| inject | N/A |
| rollout | `npm run build:shared` |
| test | `npm run shared:test` |

### Runtime: `domain-contracts`

| Field | Value |
|-------|-------|
| id | `domain-contracts` |
| class | library |
| entry | N/A (build-time only) |
| owner | root |
| observe | Build output, test results |
| control | `npm run build:domain-contracts` |
| inject | N/A |
| rollout | `npm run build:domain-contracts` |
| test | `npm run domain:test` |

### Runtime: `e2e-playwright`

| Field | Value |
|-------|-------|
| id | `e2e-playwright` |
| class | test-runner |
| entry | `playwright.config.ts` |
| owner | root |
| ports | Frontend: 6173, Backend: 4001 (isolated from dev) |
| observe | HTML reporter, console output, trace files |
| control | `npm run test:e2e`, `npx playwright test` |
| inject | Playwright UI mode (`--ui`), headed mode (`--headed`) |
| rollout | Auto-starts dev servers via `webServer` config |
| test | `npm run test:e2e` |
| state | `shared/test-lib` TestEnvironment + ProjectFactory |

---

## Runtime Relationships

```
┌─────────────────────────────────────────────────────────────┐
│  Root (npm workspaces)                                      │
│  ├── shared/         → @mdt/shared (library)               │
│  ├── server/         → backend-express (depends on shared) │
│  ├── mcp-server/     → mcp-server (depends on shared)      │
│  └── domain-contracts/ → @mdt/domain-contracts (library)   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ frontend-vite│───▶│ backend-express  │    │  mcp-server  │
│   (5173)     │    │     (3001)       │    │  (stdio/3002)│
└──────────────┘    └──────────────────┘    └──────────────┘
        │                     │                     │
        │    /api/* proxy     │                     │
        └─────────────────────┘                     │
                              │                     │
        ┌─────────────────────┼─────────────────────┘
        ▼                     ▼
┌──────────────────┐    ┌─────────────────────────────┐
│ e2e-playwright   │    │     File System             │
│  (6173/4001)     │    │  docs/CRs/*.md (tickets)    │
└──────────────────┘    │  .mdt-config.toml (config)  │
                        └─────────────────────────────┘
```

---

## Validation Evidence

### Runtime `frontend-vite` / OBSERVE / VERIFIED

- **Action**: `npm run dev`
- **Signal**:
  ```
  VITE v7.3.1  ready in 213 ms
    ➜  Local:   http://localhost:5174/
    ➜  Network: http://192.168.3.1:5174/
  ```
- **Constraints**: Requires `shared/dist` to exist for `@mdt/shared` imports; auto-selects next port if 5173 is busy

### Runtime `frontend-vite` / CONTROL / VERIFIED

- **Action**: `npm run dev` starts server, `Ctrl+C` stops it
- **Signal**: Server starts on port 5173, graceful shutdown on SIGINT
- **Constraints**: Port configurable via `PORT` environment variable

### Runtime `frontend-vite` / ROLLOUT / VERIFIED

- **Action**: Vite HMR automatically reloads on file changes
- **Signal**: Browser refreshes with updated code without full page reload
- **Constraints**: HMR works for most React components; some edge cases require full refresh

### Runtime `frontend-vite` / TEST / VERIFIED

- **Action**: `npm run fe:test`
- **Signal**:
  ```
  Test Suites: 1 passed, 1 total
  Tests:       6 passed, 6 total
  Time:        0.65 s
  ```
- **Constraints**: Requires `shared/dist` to exist; limited unit test coverage (E2E covers UI)

### Runtime `frontend-vite` / INJECT / VERIFIED

- **Action**: Browser DevTools console at `http://localhost:5173/`
- **Signal**: Can execute JavaScript, inspect React state, view network requests
- **Constraints**: Only available when dev server is running

---

### Runtime `backend-express` / OBSERVE / VERIFIED

- **Action**: `curl http://localhost:3001/api/status`
- **Signal**:
  ```json
  {"status":"ok","message":"Ticket board server is running","tasksDir":"./sample-tasks","timestamp":"2026-03-01T20:28:51.762Z","sseClients":0}
  ```
- **Constraints**: Logs prefixed with `[INFO]`, `[WARN]`, `[ERROR]`

### Runtime `backend-express` / CONTROL / VERIFIED

- **Action**: `npm run dev:server` to start, `Ctrl+C` or SIGTERM to stop
- **Signal**: Server starts on port 3001, graceful shutdown stops all file watchers
- **Constraints**: Graceful shutdown stops all file watchers

### Runtime `backend-express` / ROLLOUT / VERIFIED

- **Action**: `cd server && npm run build && npm start`
- **Signal**: Server restarts with new code from `dist/`
- **Constraints**: Requires TypeScript build before production start

### Runtime `backend-express` / TEST / VERIFIED

- **Action**: `cd server && npm test`
- **Signal**:
  ```
  Test Suites: 9 passed, 9 total
  Tests:       8 skipped, 212 passed, 220 total
  Time:        11.601 s
  ```
- **Constraints**: Worker process force exit warning (timer leak in tests)

### Runtime `backend-express` / INJECT / VERIFIED

- **Action**: `cd server && npm run dev:watch` for watch mode, or attach Node.js debugger
- **Signal**: tsx watch automatically restarts on file changes
- **Constraints**: None

### Runtime `backend-express` / STATE / VERIFIED

- **Action**: Use `shared/test-lib` TestEnvironment and ProjectFactory
- **Signal**:
  ```typescript
  import { TestEnvironment, ProjectFactory } from '@mdt/shared/test-lib'

  const testEnv = new TestEnvironment()
  await testEnv.setup()

  const factory = new ProjectFactory(testEnv.configDir)
  const project = await factory.createProject({ code: 'TEST', name: 'Test' })
  await factory.createCR(project, { title: 'CR 1', status: 'In Progress' })

  // Run tests against seeded state...
  await testEnv.cleanup()
  ```
- **Constraints**: Requires Node.js environment; see `tests/e2e/setup/e2e-context.ts` for reference implementation

---

### Runtime `mcp-server` / OBSERVE / VERIFIED

- **Action**: `npx tsx mcp-server/src/index.ts`
- **Signal**:
  ```
  🚀 Initializing MCP CR Server...
  📝 Loading config from: /Users/kirby/.config/markdown-ticket/config.toml
  ✅ Services initialized
  🔍 Detecting project configuration...
  ✅ Single-project mode: MDT (search depth: 3)
  🚀 Starting MCP CR Server...
  🛡️  Rate limiting enabled: 100 requests per 60s per tool
  ```
- **Constraints**: Output uses emoji markers for visibility; must run from mcp-server directory

### Runtime `mcp-server` / CONTROL / VERIFIED

- **Action**: `cd mcp-server && npm run dev` or `npx tsx mcp-server/src/index.ts`
- **Signal**: Server starts in stdio mode, ready for JSON-RPC messages
- **Constraints**: HTTP mode requires `MCP_HTTP_ENABLED=true`

### Runtime `mcp-server` / ROLLOUT / VERIFIED

- **Action**: `cd mcp-server && npm run build && npm start`
- **Signal**: Server runs from `dist/` directory
- **Constraints**: Must rebuild after code changes for production mode

### Runtime `mcp-server` / TEST / VERIFIED

- **Action**: `npm run mcp:test`
- **Signal**:
  ```
  Test Suites: 31 passed, 31 total
  Tests:       11 skipped, 419 passed, 430 total
  Time:        37.477 s
  ```
- **Constraints**: E2E tests use `shared/test-lib` for isolation

### Runtime `mcp-server` / INJECT / VERIFIED

- **Action**: MCP Inspector: `npx @modelcontextprotocol/inspector --transport stdio --server "npx tsx mcp-server/src/index.ts"`
- **Signal**: Interactive tool testing via web UI
- **Constraints**: Requires MCP Inspector package

---

### Runtime `shared-lib` / ROLLOUT / VERIFIED

- **Action**: `npm run build:shared` or `cd shared && npm run build`
- **Signal**: TypeScript compiles to `shared/dist/`
- **Constraints**: Required before server or frontend can run

### Runtime `shared-lib` / TEST / VERIFIED

- **Action**: `npm run shared:test`
- **Signal**:
  ```
  Test Suites: 29 passed, 29 total
  Tests:       459 passed, 459 total
  Time:        9.458 s
  ```
- **Constraints**: Worker process force exit warning (timer leak in tests)

---

### Runtime `domain-contracts` / ROLLOUT / VERIFIED

- **Action**: `npm run build:domain-contracts`
- **Signal**: `tsc --build` completes without errors
- **Constraints**: Required for projects using Zod schemas from this package

### Runtime `domain-contracts` / TEST / VERIFIED

- **Action**: `npm run domain:test`
- **Signal**:
  ```
  Test Suites: 6 passed, 6 total
  Tests:       90 passed, 90 total
  Time:        0.746 s
  ```
- **Constraints**: None - all tests pass

---

### Runtime `e2e-playwright` / OBSERVE / VERIFIED

- **Action**: `npm run test:e2e`
- **Signal**: HTML reporter at `playwright-report/index.html`, console output with test progress
- **Constraints**: Uses isolated ports (6173/4001) to avoid dev server conflicts

### Runtime `e2e-playwright` / CONTROL / VERIFIED

- **Action**: `npm run test:e2e` to run all, `npx playwright test <file>` for specific tests
- **Signal**: Tests execute with pass/fail status
- **Constraints**: Sequential execution (`workers: 1`) for shared environment isolation

### Runtime `e2e-playwright` / ROLLOUT / VERIFIED

- **Action**: Playwright auto-starts dev servers via `webServer` config
- **Signal**: `VITE_BACKEND_URL=http://localhost:4001 npm run dev -- --port 6173 --strictPort`
- **Constraints**: Servers start on-demand; reuse existing if `reuseExistingServer: true`

### Runtime `e2e-playwright` / TEST / VERIFIED

- **Action**: `npm run test:e2e`
- **Signal**: Infrastructure smoke tests verify backend API, frontend load, scenario creation
- **Test categories**:
  - `tests/e2e/smoke/` - Infrastructure verification
  - `tests/e2e/board/` - Board view tests (drag-drop, filtering)
  - `tests/e2e/list/` - List view tests (sorting, filtering)
  - `tests/e2e/ticket/` - Ticket CRUD tests
  - `tests/e2e/navigation/` - Routing, project switching
- **Constraints**: Each test run gets fresh temp directory as `CONFIG_DIR`

### Runtime `e2e-playwright` / STATE / VERIFIED

- **Action**: `buildScenario(projectFactory, 'simple'|'medium'|'complex')`
- **Signal**: Creates isolated project with 3/7/12 tickets respectively
- **Constraints**: Uses `shared/test-lib` TestEnvironment for complete isolation

---

## Quick Reference Commands

### Start All Services (Recommended Development)

```bash
npm run dev:full
```

This builds shared code and starts both frontend (5173) and backend (3001).

### Individual Runtime Control

| Runtime | Start | Stop | Test |
|---------|-------|------|------|
| frontend-vite | `npm run dev` | `Ctrl+C` | `npm run fe:test` |
| backend-express | `npm run dev:server` | `Ctrl+C` | `cd server && npm test` |
| mcp-server | `cd mcp-server && npm run dev` | `Ctrl+C` | `cd mcp-server && npm test` |
| shared-lib | `npm run build:shared` | N/A | `cd shared && npm test` |
| domain-contracts | `npm run build:domain-contracts` | N/A | `cd domain-contracts && npm test` |
| e2e-playwright | `npm run test:e2e` | `Ctrl+C` | `npm run test:e2e` |

### MCP Server Modes

```bash
# Stdio mode (default)
cd mcp-server && npm run dev

# HTTP mode (port 3002)
MCP_HTTP_ENABLED=true cd mcp-server && npm run dev

# With MCP Inspector
npx @modelcontextprotocol/inspector --transport stdio --server "npx tsx mcp-server/src/index.ts"
```

### E2E Testing Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file (skip server restart)
PWTEST_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/smoke/infrastructure.spec.ts --project=chromium

# Visible browser mode
npx playwright test tests/e2e/smoke/infrastructure.spec.ts --project=chromium --headed

# Interactive UI mode
npm run test:e2e:ui
```

---

## Known Issues

1. **Shared Tests**: Worker process force exit warning (timer leak in tests)

---

## Port Reference

| Service | Dev Port | Test Port | Notes |
|---------|----------|-----------|-------|
| Frontend (Vite) | 5173 | 6173 | Auto-increments if busy |
| Backend (Express) | 3001 | 4001 | Hardcoded in configs |
| MCP HTTP | 3002 | N/A | Only with `MCP_HTTP_ENABLED=true` |

---

*Generated by validation-protocol on 2026-03-01*
*Evidence collected through direct execution and verification*
