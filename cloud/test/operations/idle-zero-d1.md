# Idle Zero-D1 Evidence — MDT-226

Manual evidence target for `TEST-idle-zero-d1` (C-1, C-7). This file defines the
production check; it does not claim the check has run.

## Requirement

A healthy connected local server SHALL perform zero D1 reads solely because
time passes without project changes, reconnects, or authorization changes
(C-1). The hub uses the Hibernation WebSocket API and alarms; it SHALL NOT stay
active through polling timers or application-level keepalive loops (C-7).

## Procedure

1. Deploy the push-path Worker (DO binding + stream endpoint) and connect one
   local server to an enabled, idle cloud project.
2. Confirm the stream is live (a `ready` high-water cursor was received and
   acknowledged).
3. Enable D1 statement/request observability (Workers Analytics / D1 query
   counts) for the project's binding.
4. Hold the connection open for at least five former poll intervals (5 × 15s =
   75s minimum; use 5 minutes for margin).
5. Make NO projection mutations, membership changes, or reconnects during the
   window.
6. Record the D1 projection and membership read counts over the window.

## Required evidence

- [ ] Deployment version and timestamp recorded.
- [ ] Stream confirmed live (ready cursor + ack observed) before the idle window.
- [ ] Idle window duration recorded (≥5 former poll intervals).
- [ ] D1 projection/membership read count over the window = 0 (observed
      statement/request counts, NOT absence of logged errors).
- [ ] No protocol-level keepalive or timer woke the hub for an application D1
      request.

## Result

Not run against the reconciled deployment candidate. Unit tests cannot prove the
absence of timer-driven reads; this is an external gate.
