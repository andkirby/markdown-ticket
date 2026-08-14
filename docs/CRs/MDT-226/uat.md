# UAT Refinement Brief

## Objective

Prevent local process exhaustion by making projection-stream reconnect and
Cloudflare Access credential acquisition explicitly single-flight and bounded.

## Approved Changes

- One project has at most one connection attempt and one reconnect/expiry timer.
- `error` plus `close`, intentional catch-up close, and stale callbacks coalesce
  into one replacement connection.
- One process-scoped credential broker serves every server cloud path, reuses a
  valid token by trusted origin, and shares concurrent resolution.
- `cloudflared` acquisitions are serialized; deadline overruns signal the child,
  return unavailable, and block replacement acquisition until exit.
- Startup/reconnect never launches human login; it uses cached human or service
  credentials and keeps one stale read model/reconnect owner when unavailable.
- Authorization headers and token expiry refresh together; the stream
  reconnects before expiry from its applied cursor.

## Changed Requirement IDs

- Added `C-13`, `Edge-6`, and `Edge-7`.
- Existing behavior requirements and BDD scenarios remain unchanged.

## Affected Downstream Trace

- Add stream manager, credential broker, provider, and server bootstrap
  artifacts.
- Add `OBL-local-resource-bounds`.
- Refine `TEST-stream-client-transport`; add
  `TEST-credential-broker-resource-bounds`.
- Add `TASK-local-resource-bounds`.

## Execution Slices

1. **Local resource bounds**
   - Objective: make stream and credential acquisition concurrency bounded.
   - Direct artifacts: `CloudProjectionStreamClient.ts`,
     `access-credential-broker.ts`, `credential-providers.ts`, `server.ts`.
   - Direct GREEN targets: compound termination, catch-up replacement,
     concurrent connect/start, token/expiry refresh, non-interactive machine
     auth, cache reuse, serialized child, and timeout signaling.
   - Canonical task: `TASK-local-resource-bounds`.
   - Why: reconnect fan-out multiplied uncached child-process credential
     resolution until the workstation could no longer fork.

## Validation

- RED: focused shared tests failed on the absent broker, credential deadline,
  and authorization-refresh contract.
- GREEN: 34 focused shared tests and 8 stream-manager tests passed.
- `bun run validate:ts`, shared/server lint, and `bun run build:all` passed.
- Strict Spec Trace validation passed through Tasks; nine changed Markdown
  owner/workflow files passed markdownlint.
- Broader suites exposed unrelated baseline failures: the shared version-1
  trusted-profile fixtures no longer type-check against connection version 2;
  server has an existing `PinStateService.ts` environment-boundary failure and
  one worktree-SSE timeout.

## Watchlist

- A timed-out child must receive termination and block any replacement until its
  callback confirms exit.
- Replaced transport callbacks must not clear the active connection.
- No token, Access header, or trusted origin may be logged.
- No Cloudflare infrastructure or D1 schema change is required.
