# Testing Infrastructure

## Isolation Contract

- The run wrapper (`scripts/e2e/run.ts`) creates the run-scoped `CONFIG_DIR`
  temp directory **before any process starts** and exports it via the
  environment — backend and workers share it from spawn, so there is no
  import-order dance anymore.
- The backend process (`scripts/e2e/backend.ts`) lazily imports
  `createTestApp()` only after asserting `CONFIG_DIR` is set (belt and braces;
  the env is already present at spawn).
- Workers adopt the same `CONFIG_DIR` via `TestEnvironment({ configDir })`
  (adopted environments are never deleted by the worker — the wrapper owns
  the directory lifecycle).

## Test Environment Lifecycle

1. **Startup (wrapper)**: free ports allocated → `CONFIG_DIR` temp dir
   created → env exported → Playwright spawned.
2. **webServers (Playwright, ordered)**: backend first
   (`scripts/e2e/backend.ts`, health on `/api/status`), then the Vite dev
   server proxying `/api` to the backend (`VITE_BACKEND_URL`).
3. **Per-test**: fresh `page` object (clean localStorage).
4. **Shared state**: the `e2eContext` singleton persists across tests within
   a worker (no teardown needed — workers own nothing).
5. **Shutdown (wrapper, always)**: Playwright exits → leaked listeners on the
   run's ports are killed (safety net) → `CONFIG_DIR` removed → warnings if
   anything survived.

## Worker Rotation Safety

Playwright may replace a worker process at any time (notably after test
failures). This is safe by design now: workers hold no ports and no servers.
The backend is a run-level process and is unaffected by rotation.

## Singleton Behavior

Projects created by any test remain visible to all subsequent tests. Always
navigate directly to your target project to avoid cross-test contamination.

## Admin Seam (MDT-239)

Backend-internal operations are exposed to tests over HTTP on the backend's
`/_e2e/*` routes (mounted pre-auth, reachable only on the backend's own
localhost:port):

- `POST /_e2e/watchers/multi-project` — replaces in-process
  `fileWatcher.initMultiProjectWatcher()`
- `POST /_e2e/watchers/documents` — replaces in-process
  `fileWatcher.initDocumentWatchers()`; awaits the backend's
  `document-ready` event before responding
- `PUT/DELETE /_e2e/runtime-config` — replaces `app.locals.runtimeConfig`
  mutation

Tests access these through `e2eContext.fileWatcher` and
`e2eContext.setRuntimeConfigOverride()` — never import server internals from
a spec.
