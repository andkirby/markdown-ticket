---
code: MDT-092
status: Implemented
dateCreated: 2025-12-15T21:48:50.978Z
implementationDate: 2026-03-01
type: Architecture
priority: Medium
---

# Define isolated test environment with custom ports

## 1. Description

E2E tests could not run concurrently with development servers — port conflicts caused failures
when dev servers occupied the default ports (5173, 3001). There was no isolated config directory,
so tests could see and mutate real user projects.

**Scope**: E2E Playwright tests + shared test library. MCP server tests are out of scope.

## 2. Solution

Two-layer isolation:

1. **`CONFIG_DIR` isolation** — `TestEnvironment` creates a temp directory and sets
   `process.env.CONFIG_DIR` before any backend code loads. All services read config
   dynamically via `getConfigDir()`, so only projects created during the test run are visible.

2. **Port isolation** — static ports (frontend `:6173`, backend `:4001`) avoid clashing with
   dev servers (`:5173`, `:3001`). Vite proxy routes all `/api` calls to the test backend via
   `VITE_BACKEND_URL`.

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| Static ports (6173, 4001) | Eliminates race conditions; simpler than dynamic allocation |
| In-process Express backend | No child process overhead; `createTestApp()` lazy-loaded after `CONFIG_DIR` is set |
| `setCacheTTL(0)` on test backend | Projects created mid-test visible immediately |
| `shared/test-lib` as shared library | Reusable across E2E and Jest integration tests |

## 3. Implementation

### shared/test-lib

| File | Purpose |
|------|---------|
| `index.ts` | Public API exports |
| `types.ts` | TypeScript interfaces |
| `config/ports.ts` | Static port definitions (6173, 4001, 4002) |
| `core/test-environment.ts` | Sets up `CONFIG_DIR` temp directory |
| `core/project-factory.ts` | Creates projects and CRs via direct file I/O |
| `core/test-server.ts` | Server lifecycle (used by MCP/Jest tests) |
| `core/process-*.ts` | Process spawning helpers |
| `core/health-check-manager.ts` | Waits for server ready |
| `ticket/ticket-creator.ts` | Ticket creation interface |
| `ticket/file-ticket-creator.ts` | Direct file-based ticket creation |
| `ticket/test-project-builder.ts` | Fluent builder for test projects |
| `ticket/test-ticket-builder.ts` | Fluent builder for test tickets |
| `utils/temp-dir.ts` | Temp directory management |
| `utils/process-helper.ts`, `retry-helper.ts`, `timeout.ts` | Supporting utilities |

### tests/e2e (Playwright infrastructure)

| File | Purpose |
|------|---------|
| `setup/e2e-context.ts` | Singleton: `TestEnvironment` + `ProjectFactory` + in-process Express on `:4001` |
| `setup/scenario-builder.ts` | Named datasets: `simple` (3), `medium` (7), `complex` (12) tickets |
| `fixtures/test-fixtures.ts` | Playwright fixture extending base test with `e2eContext` |
| `utils/selectors.ts` | Centralized `data-testid` selectors (source of truth) |
| `utils/helpers.ts` | `waitForBoardReady`, `verifyApiHealth`, etc. |
| `smoke/infrastructure.spec.ts` | Verifies the full isolated stack end-to-end |
| `AGENTS.md` | Write manual for LLMs |

### Other files

| File | Change |
|------|--------|
| `playwright.config.ts` | Vite on `:6173`, `VITE_BACKEND_URL=http://localhost:4001` |
| `vite.config.ts` | Proxy checks `VITE_BACKEND_URL` first |
| `server/tests/api/test-app-factory.ts` | Fixed ESM `.js` extensions; `setCacheTTL(0)` |
| `src/components/Board.tsx` | Added `data-testid="kanban-board"` |
| `src/components/ProjectSelector.tsx` | Added `data-testid="project-option-{CODE}"` |

## 4. Acceptance Criteria

- [x] Tests run with dev servers active on default ports (no conflicts)
- [x] Only isolated test projects visible in the backend API during test runs
- [x] Projects created mid-test are immediately visible (cache disabled)
- [x] 6 smoke tests pass: backend health, frontend load, scenario creation (simple/medium/complex), project in frontend
- [ ] Multiple concurrent test sessions — not tested (static ports make this inherently single-session)

## 5. See Also

- `tests/AGENTS.md` — how to run E2E tests
- `tests/e2e/AGENTS.md` — how to write E2E tests
- `shared/test-lib/README.md` — test-lib API reference
- `shared/test-lib/write-tests-guide.md` — guide for Jest integration tests
