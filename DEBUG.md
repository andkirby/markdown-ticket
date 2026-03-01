# DEBUG.md

Operational debugging contract for the markdown-ticket repository.
All procedures have been verified with evidence.

---

## Runtime Coverage Index

| Runtime | Class | OBSERVE | CONTROL | ROLLOUT | TEST | INJECT | STATE |
|---------|-------|---------|---------|---------|------|--------|-------|
| frontend-vite | frontend | VERIFIED | VERIFIED | VERIFIED | PARTIAL | VERIFIED | - |
| backend-express | backend | VERIFIED | VERIFIED | VERIFIED | VERIFIED | VERIFIED | BLOCKED |
| mcp-server | backend | VERIFIED | VERIFIED | VERIFIED | VERIFIED | VERIFIED | - |
| shared-lib | library | - | - | VERIFIED | PARTIAL | - | - |
| domain-contracts | library | - | - | VERIFIED | VERIFIED | - | - |

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
                              ▼                     ▼
                        ┌─────────────────────────────┐
                        │     File System             │
                        │  docs/CRs/*.md (tickets)    │
                        │  .mdt-config.toml (config)  │
                        └─────────────────────────────┘
```

---

## Validation Evidence

### Runtime `frontend-vite` / OBSERVE / VERIFIED

- **Action**: `npm run dev`
- **Signal**:
  ```
  VITE v7.3.1  ready in 206 ms
    ➜  Local:   http://localhost:5173/
    ➜  Network: http://192.168.3.1:5173/
  ```
- **Constraints**: Requires `shared/dist` to exist for `@mdt/shared` imports

### Runtime `frontend-vite` / CONTROL / VERIFIED

- **Action**: `npm run dev` starts server, `Ctrl+C` stops it
- **Signal**: Server starts on port 5173, graceful shutdown on SIGINT
- **Constraints**: Port configurable via `PORT` environment variable

### Runtime `frontend-vite` / ROLLOUT / VERIFIED

- **Action**: Vite HMR automatically reloads on file changes
- **Signal**: Browser refreshes with updated code without full page reload
- **Constraints**: HMR works for most React components; some edge cases require full refresh

### Runtime `frontend-vite` / TEST / PARTIAL

- **Action**: `npm run fe:test`
- **Signal**:
  - Some tests pass
  - Known failures:
    1. `src/types/__tests__/ticket.worktree.test.ts` - `TicketWithWorktreeSchema` undefined
    2. `src/utils/__tests__/linkNormalization.test.ts` - Module `@mdt/shared/utils/path-browser.js` not found
- **Constraints**: Requires `shared/dist` to exist; some test files have broken imports

### Runtime `frontend-vite` / INJECT / VERIFIED

- **Action**: Browser DevTools console at `http://localhost:5173/`
- **Signal**: Can execute JavaScript, inspect React state, view network requests
- **Constraints**: Only available when dev server is running

---

### Runtime `backend-express` / OBSERVE / VERIFIED

- **Action**: `npm run dev:server`
- **Signal**:
  ```
  [INFO] 🚀 Ticket board server running on port 3001
  [INFO] 📁 Tasks directory: /Users/kirby/home/markdown-ticket/server/sample-tasks
  [INFO] 🌐 API endpoints:
  [INFO]    GET  /api/tasks - List all task files
  ...
  ```
- **Constraints**: Logs prefixed with `[INFO]`, `[WARN]`, `[ERROR]`

### Runtime `backend-express` / CONTROL / VERIFIED

- **Action**: `npm run dev:server` to start, `Ctrl+C` or SIGTERM to stop
- **Signal**:
  ```
  [INFO] Received SIGTERM, shutting down gracefully...
  Stopping file watcher for project: ...
  Server startup test completed (timeout expected)
  ```
- **Constraints**: Graceful shutdown stops all file watchers

### Runtime `backend-express` / ROLLOUT / VERIFIED

- **Action**: `cd server && npm run build && npm start`
- **Signal**: Server restarts with new code from `dist/`
- **Constraints**: Requires TypeScript build before production start

### Runtime `backend-express` / TEST / VERIFIED

- **Action**: `npm run server:test`
- **Signal**:
  ```
  Test Suites: 9 passed, 9 total
  Tests:       8 skipped, 212 passed, 220 total
  Time:        12.522 s
  ```
- **Constraints**: Some tests may leak handles (worker process warning)

### Runtime `backend-express` / INJECT / VERIFIED

- **Action**: `cd server && npm run dev:watch` for watch mode, or attach Node.js debugger
- **Signal**: tsx watch automatically restarts on file changes
- **Constraints**: None

### Runtime `backend-express` / STATE / BLOCKED

- **Attempted**: API calls to seed test data programmatically
- **Failure**: No dedicated state seeding endpoint exists
- **Next action**: Use `shared/test-lib` TestEnvironment for isolated test state

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
- **Constraints**: Output uses emoji markers for visibility

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
  PASS src/tools/handlers/__tests__/sectionHandlers.test.ts
  PASS src/tools/handlers/__tests__/crHandlers.test.ts
  PASS tests/e2e/tools/rate-limiting.spec.ts
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

### Runtime `shared-lib` / TEST / PARTIAL

- **Action**: `npm run shared:test`
- **Signal**:
  - Most tests pass
  - Known failure: `WorktreeService.test.ts` - mock initialization error (`ReferenceError: Cannot access 'node_util_1' before initialization`)
- **Constraints**: Pretest script rebuilds before running

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
  Time:        0.787 s
  ```
- **Constraints**: None - all tests pass

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
| backend-express | `npm run dev:server` | `Ctrl+C` | `npm run server:test` |
| mcp-server | `cd mcp-server && npm run dev` | `Ctrl+C` | `npm run mcp:test` |
| shared-lib | `npm run build:shared` | N/A | `npm run shared:test` |

### MCP Server Modes

```bash
# Stdio mode (default)
cd mcp-server && npm run dev

# HTTP mode (port 3002)
MCP_HTTP_ENABLED=true cd mcp-server && npm run dev

# With MCP Inspector
npx @modelcontextprotocol/inspector --transport stdio --server "npx tsx mcp-server/src/index.ts"
```

---

## Known Issues

1. **Frontend Tests** (`ticket.worktree.test.ts`): `TicketWithWorktreeSchema` is undefined - schema export issue
2. **Frontend Tests** (`linkNormalization.test.ts`): Missing module `@mdt/shared/utils/path-browser.js`
3. **Shared Tests** (`WorktreeService.test.ts`): Mock initialization error with promisify
4. **Backend Tests**: Worker process force exit warning (timer leak in tests)

---

*Generated by validation-protocol on 2026-02-24*
*Evidence collected through direct execution and verification*
