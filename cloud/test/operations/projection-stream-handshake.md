# Deployed Stream-Session Handshake Evidence — MDT-226

Manual evidence target for `TEST-deployed-stream-handshake`
(C-10, C-14, C-15, Edge-8). This file defines the deployed limited-production
procedure; it does not claim the check has run. Do not enable automatic
streams (`MDT_PROJECTION_STREAM_ROLLOUT=true`) for an installation until every
item below is recorded.

## Requirement

The deployed Worker and `ProjectProjectionHub` SHALL complete the split
control-plane/data-plane handshake: one typed session authorization performs
exactly one D1 membership decision (and at most one denial audit) per unchanged
activation fingerprint; the grant-bearing WebSocket upgrade returns
`101 Switching Protocols` with the client's upgrade headers preserved; grant
reconnects add no membership read; terminal session outcomes persist across
local server restart with zero further traffic; and route telemetry records
`projection.stream.session` and `projection.stream` accurately (Edge-8, C-15).

## Preconditions

- Access-protected Worker deployed with the session route
  (`POST /v1/projects/{projectId}/projection-stream-sessions`) and the
  deterministic `PROJECT_HUB` Durable Object binding.
- One local server with an enabled cloud connection, run with
  `MDT_PROJECTION_STREAM_ROLLOUT=true` ONLY for the probe window.
- D1 statement/request observability (Workers Analytics or D1 query counts)
  available for the binding.
- A second principal (or the ability to revoke) for the revocation check.

## Procedure

1. **Session authorization (one decision).** Start the local server for the
   probe. Observe exactly one `POST …/projection-stream-sessions` request and
   one membership `SELECT` in D1 telemetry for that activation fingerprint.
   Record the request id, activation fingerprint (first 12 hex chars are
   sufficient), and grant expiry returned.
2. **101 upgrade.** Observe the subsequent WebSocket upgrade to
   `…/projection-stream` returning `101 Switching Protocols` (not `426`), with
   `Upgrade: websocket` and `Sec-WebSocket-*` headers preserved end-to-end.
   Confirm route telemetry labels the request `projection.stream`.
3. **Catch-up ready.** Observe catch-up envelopes (when the cursor is behind)
   followed by `ready(highWaterRevision)` and the client `ack`.
4. **Reconnect without membership read.** Force one transport drop (network
   interruption or local server restart within the grant lifetime). Confirm the
   reconnect reuses the valid grant — zero membership `SELECT` and zero
   `projection-stream-sessions` D1-attributable statements for the reconnect.
5. **Terminal pause persistence.** Revoke the probe principal's membership (or
   point the project at a credential without membership). Confirm the session
   denial is classified locally (`authorization_required` via
   `GET /api/projects/:id/cloud-sync/status`), and that 30 minutes of elapsed
   time plus a local server restart produce zero further session requests,
   upgrades, membership reads, or denial audits for the unchanged fingerprint.
6. **Re-arm check.** Trigger an operator retry (or membership reconciliation)
   and confirm exactly ONE new session authorization + membership decision for
   the new activation fingerprint.
7. **Route telemetry accuracy.** Confirm `cloud_sync_request` logs distinguish
   `projection.stream.session` from `projection.stream`, and that neither is
   labelled `project.probe`.

## Required evidence

- [ ] Deployment version and timestamp recorded.
- [ ] One session authorization + one membership decision per unchanged
      fingerprint (D1 telemetry counts, not log absence).
- [ ] `101 Switching Protocols` observed on the grant-bearing upgrade
      (Edge-8).
- [ ] Catch-up `ready` + `ack` observed before the stream was marked live.
- [ ] Grant-bearing reconnect added no membership read (D1 telemetry).
- [ ] Terminal outcome persisted across ≥30 minutes and a server restart with
      zero session/upgrade/membership/audit traffic.
- [ ] Operator retry produced exactly one new D1 membership decision.
- [ ] Route telemetry labels verified for both planes.
- [ ] Rollout flag disabled again after the probe unless all gates pass.

## Result

PARTIAL → substantially verified 2026-08-15 (~21:20 CEST) against version
`abc75d0f-01f0-4249-b710-6603f30c13c4`, via curl/bun probes AND the real
local server (`MDT_PROJECTION_STREAM_ROLLOUT=true bash start-dev.sh`):

- [x] `GET /healthz` through Access → `200 {"status":"ok"}`.
- [x] One typed session authorization per activation fingerprint → `201`
      with an opaque grant, `grantExpiresAt`, `streamProtocol: 2`; wrangler
      tail showed `projection.stream.session` (distinct from
      `projection.stream` and `projection.publish`).
- [x] Grant-bearing WebSocket upgrade → `101`; catch-up delivered complete
      deltas followed by `ready` → local status `live/stream_live` (Edge-8).
- [x] Push delivery: journal publishes committed in D1 arrived as live
      deltas; the local read-model cursor advanced 39→44 with the stream
      continuously live.
- [x] Terminal pause persistence: after a REAL server restart, the paused
      project produced ZERO cloud requests for 70+ s; one owner action
      (ticket edit → credential resolution) re-armed to live. The
      authorization-paused project (no D1 membership) stayed terminal across
      restarts with zero traffic.
- [x] Idle containment: 3-minute window with one live and one terminal
      project → ZERO worker requests (the 2026-08-15 incident produced ~349
      D1 statements in the same shape of window).
- [x] Route telemetry: `projection.stream.session`, `projection.stream`
      (101s), `projection.publish` (200/409-typed/503-pre-fix) all distinct.
- [x] Reconnect: multiple 101 upgrades observed across transport drops and
      re-arms; the hub answered renewed sessions from its cached decision
      (component-tested zero-D1 path; exact D1 statement counts still need
      the observability dashboard for formal sign-off).
- [ ] Formal 30-minute zero-idle-D1 statement count from D1 observability
      (TEST-idle-zero-d1) — the local zero-request windows are necessary but
      not the formal instrumented count.
- [ ] Operator re-arm via the future dedicated surface (currently exercised
      through the credential-resolution owner action).

Issues found during the deployed validation and fixed (see
issues-found.md §I): missing credential re-arm hook; empty-allowlist wiring
crashing the server; 201-vs-200 session response mismatch; concurrent
read-model persist ENOENT; DO RPC dropping typed publish errors.

## Live local-server validation (2026-08-15, later the same day)

Rollout-flag probe with the real local server
(`MDT_PROJECTION_STREAM_ROLLOUT=true bash start-dev.sh`): see the checklist
above — the recorded outcome is live/stream_live with a drained write journal
and zero idle traffic.
