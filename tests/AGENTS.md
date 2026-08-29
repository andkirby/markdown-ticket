# AGENTS.md — Running E2E Tests

## Testing Strategy

Frontend testing uses **Playwright E2E exclusively**. No unit tests, integration
tests, or other E2E frameworks (Cypress, Selenium, Jest, Vitest, etc.) are
supported or should be introduced.

## Ports

**Ephemeral by default (MDT-239).** Every run allocates free frontend/backend
ports itself, so concurrent runs (agent + human + CI) cannot collide:

| Service | Test run (default fallback) | Dev |
|---------|------|-----|
| Frontend (Vite) | ephemeral (6173) | 3075 |
| Backend (Express, out-of-process) | ephemeral (4001) | 3001 |

The wrapper (`scripts/e2e/run.ts`) exports `TEST_BACKEND_PORT`,
`TEST_FRONTEND_PORT`, `TEST_FRONTEND_URL`, `VITE_BACKEND_URL`, `PUBLIC_ORIGIN`
(ephemeral frontend origin must be an allowed SSE origin), and a run-scoped
`CONFIG_DIR`. The fixed 6173/4001 values only apply when Playwright runs
directly without the wrapper.

## Architecture (MDT-239)

- The test backend runs as **one process per run** (`scripts/e2e/backend.ts`,
  a Playwright `webServer`), never inside a Playwright worker. Workers hold no
  ports, so Playwright's worker rotation after failures cannot cause
  `EADDRINUSE` cascades.
- Tests reach backend-only operations through the `/_e2e/*` admin seam on the
  backend (`e2eContext.fileWatcher.*`, `e2eContext.setRuntimeConfigOverride`)
  — there is no in-process `app`/`fileWatcher` access anymore.
- The wrapper always tears down: kills leaked listeners on its ports and
  removes the run's temp `CONFIG_DIR`.

Design rationale (why out-of-process, why ephemeral, rejected alternatives):
`scripts/e2e/AGENTS.md`.

## Commands

```bash
# Run all E2E tests (wrapper: ports, config dir, teardown)
bun run test:e2e

# Run specific files / pass Playwright args through
bun run test:e2e -- tests/e2e/smoke/infrastructure.spec.ts
bun scripts/e2e/run.ts tests/e2e/board --grep "drag"

# Visible browser / UI mode (also wrapper-based)
bun run test:e2e:headed
bun run test:e2e:ui

# Emergency: raw Playwright without the wrapper (requires manual env — rarely
# what you want; fails fast with a clear error if the env is missing)
bun run test:e2e:raw
```

`PWTEST_SKIP_WEB_SERVER=1` skips the wrapper's orchestration entirely; the
current environment must already provide `TEST_*_PORT`/`TEST_FRONTEND_URL`
and `CONFIG_DIR` (e.g. reuse a run started another way).

## Isolation

Each run gets a fresh temp directory as `CONFIG_DIR` — only projects created
during that run are visible. Real user projects are never exposed to the test
backend. The Vite proxy routes all `/api` calls to the run's backend via
`VITE_BACKEND_URL`.

## Writing tests

See `tests/e2e/AGENTS.md`.
