# Delivery Latency SLO Evidence — MDT-226

Manual evidence target for `TEST-delivery-latency-slo` (C-8). This file defines
the production check; it does not claim the check has run.

## Requirement

For a healthy connected stream, a committed projection change SHALL appear in
the unified local ticket read model and connected browser within 2 seconds at
p95; reconnect catch-up SHALL complete within 5 seconds at p95 under the
documented test load (C-8).

## Procedure

1. Deploy the push path and connect a local server + one browser tab.
2. Publish a sequence of projection mutations (PUT
   `/v1/projects/{id}/tickets/{n}/projection`) at a documented load (e.g. 1/s
   for 60s, or a representative burst).
3. Measure end-to-end latency from the D1 commit timestamp to the rendered
   browser ticket update, for each mutation.
4. For reconnect catch-up: disconnect the local server, commit N revisions
   (N ≥ 10), reconnect, and measure time from reconnect to the `ready`
   high-water cursor applied in the browser.
5. Record p50/p95/p99 for both connected delivery and reconnect catch-up.

## Required evidence

- [ ] Deployment version and timestamp recorded.
- [ ] Documented test load (mutation rate, revision count) recorded.
- [ ] Connected-delivery p50/p95/p99 ≤ 2s p95 (commit → rendered browser).
- [ ] Reconnect-catch-up p50/p95/p99 ≤ 5s p95 (reconnect → ready applied).
- [ ] Browser-visible measurement (not unit timing).

## Result

Not run against the reconciled deployment candidate. Unit timing alone cannot
accept the freshness SLO.
