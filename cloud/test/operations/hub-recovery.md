# Deployed Hibernation + Alarm Recovery Evidence — MDT-226

Manual evidence target for `TEST-deployed-hibernation-alarm` (C-7, Edge-1). This
file defines the production check; it does not claim the check has run.

## Requirement

`ProjectProjectionHub` uses the Durable Objects Hibernation WebSocket API and
alarms; it SHALL NOT stay active through polling timers or application-level
keepalive loops (C-7). If the Worker or Durable Object fails after the D1 commit
and before an active local server acknowledges the revision, a pre-armed alarm
replays committed state to each still-active lagging socket; disconnected
servers recover from their persisted cursor on reconnect (Edge-1).

## Procedure

1. Deploy the push path and connect a local server; confirm `ready` + live.
2. Commit a projection mutation whose delta is delivered but NOT acknowledged
   by the active socket (simulate a missed ack).
3. Observe the pre-armed alarm fire and replay the bounded catch-up to the
   lagging socket within the alarm window.
4. Force the Durable Object to hibernate (idle beyond eviction), then commit a
   mutation; confirm post-hibernation reauthorization + delivery resumes.
5. Disconnect the local server, commit revisions, reconnect, and confirm
   catch-up from the persisted cursor.

## Required evidence

- [ ] Deployment version and timestamp recorded.
- [ ] Hibernation restore observed (no application keepalive kept the hub
      active).
- [ ] Alarm replay delivered the committed revision to a lagging socket.
- [ ] Reconnect recovered from the persisted cursor without polling.

## Result

Not run against the reconciled deployment candidate. Requires the deployed
Workers runtime DO harness.
