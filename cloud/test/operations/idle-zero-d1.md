# Idle Zero-D1 Evidence — MDT-226

Manual evidence target for `TEST-idle-zero-d1` (C-1, C-7, C-15). This file
defines the deployed check; it does not claim the check has run.

REOPENED 2026-08-15: the production incident recorded 238 membership reads and
111 denied audit inserts over an idle 30-minute window (349 D1 statements with
no project activity) from retry loops that predate the session/grant split.
The incident-recovery slice bounds every activation to one cached D1 decision
and removes timer-driven retries; this gate proves it on a deployment.

## Requirement

After stream activation settles into `live` or a terminal paused state, an
enabled local server SHALL perform zero D1 statements solely because time
passes without project, connection, credential, network, or operator change
(C-1). The hub uses the Hibernation WebSocket API and alarms; it SHALL NOT stay
active through polling timers or application-level keepalive loops (C-7).
Elapsed time, browser activity, and local server restart SHALL NOT reset the
per-fingerprint authorization budget (C-15).

## Procedure

1. Deploy the push-path Worker (session route + DO binding) and connect one
   local server to an enabled, idle cloud project. Run the probe with
   `MDT_PROJECTION_STREAM_ROLLOUT=true` only for the window; disable it after.
2. Confirm the stream is live (one session authorization, a `101` upgrade, a
   `ready` high-water cursor received and acknowledged).
3. Enable D1 statement/request observability (Workers Analytics / D1 query
   counts) for the project's binding.
4. Hold the connection open for 30 minutes.
5. Make NO projection mutations, membership changes, or credential changes
   during the window. Grant/credential rotation inside the window is allowed
   only if it occurs; record it separately (it must produce zero membership
   reads — the hub caches the decision).
6. In parallel, keep a second project in a TERMINAL state (e.g. denied
   membership or `426`-classified incompatibility) with its local server
   running, and confirm it also produces zero D1 statements over the window.
7. Restart the local server once mid-window and confirm no additional
   membership decision or denial audit follows the restart (unchanged
   activation fingerprint).
8. Record the D1 projection and membership read counts over the window.

## Required evidence

- [ ] Deployment version and timestamp recorded.
- [ ] Stream confirmed live (ready cursor + ack observed) before the idle
      window; terminal project's paused state confirmed via
      `GET /api/projects/:id/cloud-sync/status`.
- [ ] Idle window duration recorded (30 minutes).
- [ ] Live AND terminal projects: D1 projection/membership/audit counts over
      the window = 0 (observed statement/request counts, NOT absence of logged
      errors).
- [ ] Mid-window server restart added no membership decision or audit.
- [ ] No protocol-level keepalive or timer woke the hub for an application D1
      request.
- [ ] Rollout flag disabled again after the probe unless all gates pass.

## Result

UNVERIFIED — requires an explicitly authorized deployed limited-production
probe with D1 statement instrumentation. Local tests cannot prove the absence
of timer-driven reads; this is an external gate.
