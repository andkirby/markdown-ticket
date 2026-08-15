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

UNVERIFIED — requires an explicitly authorized deployed probe. Local
integration tests (`cloud/test/projection-stream-upgrade.test.ts`,
`server/tests/services/cloud-sync/ProjectionStreamManager.test.ts`) prove the
component contracts only; they are NOT evidence for this gate.
