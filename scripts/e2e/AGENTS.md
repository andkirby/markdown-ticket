# AGENTS.md — E2E Run Infrastructure

Design rationale for the three files that own every e2e run.
For running tests see `tests/AGENTS.md`; for writing specs see `tests/e2e/AGENTS.md`.

## The problem this solves

The root cause was a **lifetime mismatch**: the test backend is a *run-scoped* resource (the vite proxy targets exactly one backend for the whole run), but it used to live inside a **per-worker process**, on a **fixed port** (4001), with **no teardown**. Playwright rotates workers after failures by design, so every rotation raced the port against the retired worker's never-draining event loop. Measured consequences (2026-08-28 audit, `research/e2e-suite-audit-2026-08-28/`):

- one genuine test failure → 83 collateral `EADDRINUSE` failures across 22 files (a full run reported 64 passed / 265 failed)
- finished runs leaked processes holding both ports, breaking the *next* run
- concurrent runs (agent + human) poisoned each other over the shared ports
- one `mdt-test-*` temp dir leaked per worker (3,700+ accumulated)

## The design

**One backend per run, out-of-process, on an ephemeral port, owned by a wrapper that owns the temp `CONFIG_DIR` and teardown. Workers hold no ports.**

| File | Role |
|---|---|
| `run.ts` | The wrapper — every `package.json` `test:e2e*` entrypoint. Allocates two free ports (bind `:0`; backend port held open until just before spawn to shrink the rebind race), creates the run-scoped `CONFIG_DIR`, exports `TEST_BACKEND_PORT` / `TEST_FRONTEND_PORT` / `TEST_FRONTEND_URL` / `VITE_BACKEND_URL` / `PUBLIC_ORIGIN` / `MDT_ALLOWED_ORIGINS`, spawns Playwright, and **always** tears down: safety-net kill of listeners on our ports + temp dir removal. Strips a leading `--` from passthrough args (a forwarded `--` would turn Playwright flags into test filters). |
| `backend.ts` | The backend as Playwright `webServer[0]` (never inside a worker). `createTestApp()` + the `/_e2e/*` admin seam + shutdown that **destroys open SSE sockets** — `server.close()` alone hangs forever while any SSE stream is open. Requires `TEST_BACKEND_PORT`/`CONFIG_DIR`; exits with a clear error when absent. |
| `clean-leaked-temp-dirs.ts` | One-time cleanup of the pre-MDT-239 temp-dir backlog (dry-run by default, skips dirs modified < 1h ago). |

## Rejected alternatives (the design defense)

- **Wire teardown only** (`teardownE2EContext` existed, zero callers): rotation overlap has no synchronization hook — the new worker starts while the old one is still draining forever-open SSE. Converts EADDRINUSE from *certain* to *occasional* — nondeterministic races that destroy suite trust.
- **Ephemeral port per worker**: the vite proxy needs one stable target for the run's lifetime. A port file the proxy re-reads is hot-path coupling plus last-writer-wins races during rotation overlap.
- **Preflight port check + `globalTimeout` only** (globalTimeout *did* land): containment, not repair — a single real failure still avalanches.

## Rules

- **Never run tests with raw `bunx playwright test`** — it lacks the env contract and fails fast *by design*. Raw Playwright remains fine for `show-report`, `--list`, and `PWTEST_SKIP_WEB_SERVER=1` with env you orchestrate yourself.
- **The `/_e2e` seam is test-only**: mounted via `createTestApp({ preAuthRouter })`, reachable only on the backend's `localhost:ephemeral-port`, never in the production server. Specs reach it through `e2eContext.fileWatcher.*` and `e2eContext.setRuntimeConfigOverride()` — never import server internals from a spec.
- The `document-ready` await in the seam uses `on` + explicit removal, not `once` — a `once` listener is consumed by any non-matching event and silently falls to the timeout.
- Workers adopt (never delete) the wrapper's `CONFIG_DIR` — `TestEnvironment({ configDir })` adopt-mode; the wrapper is the sole owner of the directory lifecycle.
