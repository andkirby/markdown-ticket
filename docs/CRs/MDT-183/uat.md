# UAT Refinement Brief

## Objective

Close the runtime-registration defect in the lazy watcher lifecycle: a project registered in the global registry while the server is running never receives watchers, so its boards never get `file-change` SSE updates until a backend restart. Captured 2026-09-02 from a production observation (GPDE project: disk and REST said `Implemented`, board said `In Progress`), confirmed by a live A/B SSE probe against the running dev server.

## Approved Changes

1. **BR-2 refined in place** — SSE-triggered watcher creation applies to any project discoverable from the global registry, whether registered before or after server start.
2. **BR-7 added (behavior)** — runtime registration makes a project watchable without restart: `registry-change` events feed `WatcherLifecycleManager`; late registration immediately provisions projects that already have SSE subscribers; `ensureWatchers` never silently skips an unknown project.
3. Fail-loud principle: an unknown projectId in `ensureWatchers` logs (visible in server logs) instead of incrementing a refcount with no watcher behind it.
4. E2E regression added on the **production** SSE path — no `/_e2e/watchers/*` manual init — because the existing SSE spec exercises only the admin seam and masked this defect.

## Changed Requirement IDs

| ID | Change | Kind |
|----|--------|------|
| BR-2 | refine_in_place | clarified scope (registration time is irrelevant) |
| BR-7 | additive_change | runtime registration → watchable |

## Affected Downstream Trace

- Architecture: `OBL-runtime-registration` (new), `ART-e2e-late-registration` (new); `ART-watcher-lifecycle`, `ART-server-entry` extended
- Tests: `TEST-late-registration` (new, covers BR-2 + BR-7)
- Tasks: `TASK-4` (new; owns the artifacts above, makes the test plans green)
- `architecture.md`: state machine gains `Registered` states + decision D5 + invariant 5
- CR Section 4: one new acceptance criterion (unchecked until TASK-4 verified)

## Execution Slices

### Slice 1 — Server: late registration provisioning + fail-loud skip

- **Objective**: a runtime-registered project with waiting subscribers gets watchers immediately; unknown projects are logged, never silently skipped.
- **Direct artifacts/files**: `server/services/fileWatcher/WatcherLifecycleManager.ts` (extract `provisionWatchers`, register-then-provision), `server/server.ts` (registry-change listener → re-discover → registerProject; extract single-project registration helper from `initializeMultiProjectWatchers`).
- **Direct GREEN targets**: `server/tests/watcherLifecycle.test.ts` — new tests "late registration provisions waiting subscribers" and "unknown project logs, never silently skipped"; all 12 existing lifecycle tests stay green.
- **Impacted canonical task IDs**: TASK-4.
- **Why**: this is the root-cause fix; the refcount-without-watcher state also made `activeWatcherCount()` lie.

### Slice 2 — E2E: production SSE path for runtime-created projects

- **Objective**: prove the production path end to end — project created against a running server (registry `.toml` written), board opened, ticket file edited on disk, board updates via SSE — with **no** manual watcher initialization anywhere.
- **Direct artifacts/files**: `tests/e2e/sse/late-registration.spec.ts` (new spec; do not extend `sse/updates.spec.ts` — its `beforeAll` manually inits watchers and would mask the production path).
- **Direct GREEN targets**: `TEST-late-registration`.
- **Impacted canonical task IDs**: TASK-4.
- **Why**: the existing SSE suite reaches for the `/_e2e/watchers/multi-project` seam, which bypasses the lazy lifecycle — the exact mask that let this defect ship.

## Validation

- `spec-trace validate MDT-183 --stage requirements|architecture|tests|tasks` — all pass after this round's upserts
- `bunx jest tests/watcherLifecycle.test.ts` (server) — Slice 1 GREEN + regression
- `bun run test:e2e -- tests/e2e/sse/late-registration.spec.ts` — Slice 2 GREEN
- Manual re-probe of the original reproduction: register a project against a running server, SSE connect, `touch` a ticket → `file-change` arrives

## Watchlist

- **registry unlink/update lifecycle**: `project-deleted` / `project-updated` registry events do not yet stop or reconfigure watchers for already-watched projects (stale watchers on deleted projects, config changes need restart). Symmetric follow-up, deliberately out of this round's slice.
- **Pre-existing bdd-stage validation failures** (BR-1..6 have no recorded scenarios) — unchanged by this round.
- **AGENTS.md Data Flow** still claims "Frontend polls as backup (1s interval)"; that poller does not exist. Being corrected in the docs-architecture polish pass accompanying this round.
- Existing SSE e2e specs remain on the admin seam; consider migrating them to the production path over time (new specs should follow `late-registration.spec.ts`).

## Open Decisions

None — fix design approved in session 2026-09-02.
