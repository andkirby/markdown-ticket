# UAT Refinement Brief

## Objective

Recover from the 2026-08-15 production D1 amplification incident and prevent a
failed stream handshake from becoming an unbounded cloud retry loop.

## Approved Changes

- Split typed HTTPS stream-session authorization from the WebSocket data plane.
- Issue one short-lived hub grant after one D1 membership decision; grant
  reconnects perform no membership read.
- Persist `401`/`403`/`404` authorization pause and `426` incompatibility across
  time, browser activity, and server restart.
- Put re-arm and bounded transient reconnect policy solely in the stream manager;
  the WebSocket transport owns no timer.
- Keep automatic streams behind a per-installation rollout flag until deployed
  `101`, catch-up, route telemetry, and idle-D1 gates pass.
- Expose live/paused/failed stream state in backend diagnostics; the frontend
  status surface remains owned by MDT-203 and CLI output fidelity by MDT-223.

## Changed Requirement IDs

- Refined `BR-1.5`, `C-1`, `C-10`, and `C-14`; added `C-15`.
- `Edge-8` remains the concrete upgrade-preservation failure.
- `C-1` now covers settled live and terminal states and has failed production
  evidence.
- Refined `disconnected_board_stale` to distinguish transient reconnect from a
  terminal pause with an explicit next action.

## Affected Downstream Trace

- Refine `OBL-stream-failure-containment` across the stream contract, Worker,
  hub, session client, state store, stream client/manager, server bootstrap,
  tests, and durable owners.
- Add `TEST-stream-session-client`, `TEST-worker-hub-upgrade-forwarding`,
  `TEST-stream-handshake-failure-classification`,
  `TEST-stream-status-local-only`, and `TEST-deployed-stream-handshake`.
- Add `TASK-stream-incident-recovery`; reopen `TEST-idle-zero-d1` as failed.

## Execution Slices

1. **Contain failed handshakes**
   - Objective: authorize once, reconnect without D1, and make terminal failure
     state-driven rather than timer-driven.
   - Direct artifacts: stream contract, Worker, hub, session client, activation
     state store, transport client, manager, server bootstrap, and owners.
   - Direct GREEN targets: one typed authorization; grant-bearing `101`; grant
     reconnect with no membership read; persisted pause; accurate telemetry;
     zero retry-driven D1 statements.
   - Canonical task: `TASK-stream-incident-recovery`.

## Validation

- RED production evidence: MDT handshake returns `426`; unauthorized VOC
  handshake returns `404`; neither stream becomes live.
- In a 14-minute-25-second sample, VOC produced 54 denied attempts, 54
  membership reads, and 54 audit inserts; MDT added a similar membership-read
  cadence. Observed total was approximately 170 D1 statements per 15 minutes.
- A later idle 30-minute sample recorded 238 membership reads and 111 denied
  audit inserts: 349 D1 statements with no project activity. The near 2:1
  read/write ratio supports one denied loop plus one authorized failing loop.
- The 2026-08-14 focused tests remain valid only for local process bounds. They
  are not evidence for deployed handshake success or D1 request containment.
- Required GREEN evidence is the new incident-recovery tests plus a deployed
  session/grant handshake and a 30-minute zero-idle-D1 probe.

## Watchlist

- D1 traffic remains active while the affected server runs automatic streams.
- No containment action was taken during documentation repair.
- Disabling a binding or stopping the server is immediate containment but also
  disables cloud delivery; perform it only as an explicit operator action.
- Correct the `project.probe` route label before using route metrics as proof.
