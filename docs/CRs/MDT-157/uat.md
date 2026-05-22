# UAT Refinement Brief

## Objective

Lock Vite dev-server frontend logging endpoints to localhost because they bypass backend API auth and are intended only for local debugging.

## Approved Changes

- `/api/frontend/logs*` endpoints served by Vite must accept only localhost/loopback clients.
- Non-loopback LAN, tunnel, or proxy callers must receive a generic 403 before body parsing or logging state changes.
- `X-Forwarded-*` headers must not be trusted as localhost identity.
- Malformed JSON submitted to `POST /api/frontend/logs` must return a controlled 400.

## Changed Requirement IDs

- Added `C10`: Vite-only frontend logging endpoints must be localhost-only because they bypass backend auth middleware.

## Affected Downstream Trace

- Architecture: add Vite frontend logging boundary owned by `vite.config.ts`.
- Tests: add `TEST-vite-frontend-logs-localhost`.
- Tasks: add Task 5 as the current remaining UAT execution slice.

## Execution Slices

### Slice 1: Vite Frontend Logging Localhost Gate

Objective: enforce loopback-only access on all Vite `/api/frontend/logs*` endpoints.

Direct artifacts/files:

- `vite.config.ts`
- `tests/vite-frontend-logs-security.test.ts`

Direct GREEN targets:

- `TEST-vite-frontend-logs-localhost`

Impacted canonical task IDs:

- `TASK-5`

Why this slice exists:

- The endpoint is not a backend route and therefore bypasses MDT-157 backend auth. UAT approved keeping it local-only rather than exposing it as an unauthenticated dev API.

## Validation

```bash
bun test tests/vite-frontend-logs-security.test.ts
bun run test:e2e
```

## Watchlist

- Preserve existing Playwright E2E behavior, which uses Vite on localhost.
- Do not trust reverse-proxy headers as proof of localhost.
- Avoid widening this into backend devtools auth or MDT-172 sharing work.
