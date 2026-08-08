# Assess: MDT-226

Pipeline stage: Assess (mdt-pipeline-e2e, Pipeline 2 schema v4).

## Scope statement

Replace browser-owned, timer-driven cloud projection polling with one
backend-owned, event-driven projection stream per cloud project. D1 stays
authoritative. One hibernating `ProjectProjectionHub` Durable Object per cloud
project orders and delivers complete projection deltas; the local server
materializes them into a unified read model and fans ordinary ticket events to
browsers via existing SSE. This is one ticket (MDT-226), phase epic MDT-227.

## What is already approved and locked

- Requirements (9 BR + 11 C + 4 Edge), 8 BDD scenarios, and 11 obligations / 24
  artifacts pass strict validation. Architecture baseline commit `ab3468d4`.
- Fixed decisions in the goal prompt are not reopened: cloud endpoint is
  backend-only, one upstream stream per local project, browsers consume only the
  unified ticket API + SSE + sync status, D1 authoritative (no KV/Queue/replica/
  body-store/D1-delivery-migration), commit-before-broadcast, ack only after
  state+cursor persistence, pre-armed alarm recovery, sparse catch-up, v1→v2
  atomic config migration removing active `pollIntervalSeconds`.
- Canonical Markdown wins over same-number projections. The local write journal
  is preserved as the independent mutation-retry path.

## Dependencies (downstream → upstream of implementation)

| Depends on | Status | Risk |
| --- | --- | --- |
| D1 projection repo + use case (`cloud/.../d1/projection.ts`, `application/projection-usecase.ts`) | Implemented (MDT-200) | Reused as-is; add cursor high-water query shape if needed |
| Access JWT validation + credential provider | Implemented (MDT-200) | WebSocket upgrade must attach same Access headers; hibernation recheck |
| Local SSE broadcaster + sseClient + useSSEEvents | Implemented (file/project events only) | Add ordinary ticket-view change fan-out; no new transport |
| Local write journal (`projection-sync.ts`) | Implemented | Untouched; remains independent retry path |
| Connection schema v1 (`config.ts`, `project-state-store.ts`) | Implemented (v1) | Atomic v1→v2 migration; `pollIntervalSeconds` discarded |
| Durable Object binding + class migration in `wrangler.jsonc` | Not present | First DO in this project; add binding + `migrations` script id |
| `domain-contracts/src/ticket/view.ts` | Not present | New unified ticket-view contract |

## Cloudflare / runtime assumptions

1. The Hibernation WebSocket API (`webSocket`, `state.acceptWebSocket`,
   `onMessage`/`onClose`/`onError`, hibernation-aware `state.getWebSockets`) is
   supported by the installed Wrangler/runtime (`wrangler ^4.24.0`).
2. Durable Object alarms (`state.setAlarm`/`alarm()`) are supported for bounded
   recovery replay.
3. The local `ws`/WebSocket client can attach Cloudflare Access headers on the
   upgrade handshake (same headers already used over HTTPS by
   `CloudProjectionClient`).
4. No D1 delivery-schema migration is added; the existing
   `ticket_projections` table (latest row per ticket) is the catch-up source.

**POC gate:** If assumption 1, 2, or 3 is not provable against the installed
runtime before implementation, run a focused `mdt:poc` and record evidence.
Do not silently change the architecture or move the WebSocket into the browser.
The cloud test harness today uses plain SQLite via
`cloud/test/helpers/projection-d1-adapter.ts`; Durable Object behavior requires
a Workers-runtime/Miniflare harness, not that adapter.

## Rollout risks

- **Idle-D1 proof (C-1)** needs observable D1 statement/request counts against a
  connected idle project for ≥5 former poll intervals. Unit tests cannot prove
  the absence of timer-driven reads; this is an external gate reported at User
  Review if no safe limited-production probe exists.
- **Latency SLOs (C-8)** (2s p95 commit-to-render, 5s p95 reconnect catch-up)
  require a documented test load and browser-visible measurement; unit timing
  cannot accept them.
- **WebSocket Access headers on upgrade** may need a runtime check; the local
  Bun WebSocket client may not support custom headers on the handshake in all
  versions.
- **First Durable Object** in this repo: binding, migration script id, and DO
  class migration are new operational surface; validate with `deploy:dry-run`
  only.
- **Revocation while connected (Edge-4)** and **commit-ack gap (Edge-1)** depend
  on alarm timing and per-socket acknowledged revisions; these are the most
  failure-prone runtime behaviors and need explicit tests.

## Migration and rollback

- Version 1 connection files migrate atomically to version 2 on read; active use
  of `pollIntervalSeconds` is removed without changing cloud project identity,
  trusted origin, or credential reference.
- Rollback disables the local push flag and returns compatible clients to the
  bounded cursor endpoint (`GET /v1/projects/:id/projections`). It does not roll
  back D1 data or reuse ticket numbers. The DO binding is removed only after all
  sockets and alarms drain.
- The compatibility cursor endpoint and rollback flag stay bounded rollout
  mechanisms, never a periodic delivery path.

## Non-goals (this ticket)

- Presence, active-editor indicators, ticket-body sync, collaborative editing.
- Offline cloud-bound ticket creation.
- Removing the compatibility cursor endpoint before telemetry confirms the gate.
- Deploying to production, mutating production D1, or changing Access policy.

## Confidence

High for contracts, read model, SSE fan-out, config migration, and unit-level
hub/manager behavior. Medium for Durable Object hibernation/alarm behavior and
WebSocket Access-header upgrade until a runtime POC confirms the assumptions.
The idle-D1 and latency SLOs are explicitly external gates.
