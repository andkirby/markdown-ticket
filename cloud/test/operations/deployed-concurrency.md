# Deployed Concurrency Evidence — MDT-200

Manual evidence target for `TEST-deployed-concurrency` (BR-1.1). This file
defines the production check; it does not claim the check has run.

## Procedure

1. Provision a disposable cloud project and record its starting counter.
2. Send concurrent authenticated reservation requests with unique idempotency
   keys through the deployed Worker.
3. Retry one request with the same key and request hash.
4. Query D1 for the counter, reservations, idempotency rows, and redacted audit
   outcomes.
5. Remove the disposable project and its related rows after recording
   aggregate evidence.

## Required evidence

- [ ] Deployment version and timestamp recorded.
- [ ] Request count, concurrency level, latency summary, and response counts
      recorded.
- [ ] Every unique request returned a distinct, monotonic ticket number.
- [ ] The retried idempotency key returned one stable reservation.
- [ ] The counter advanced once per unique request and not for the replay.
- [ ] D1 rows and audit outcomes agree with the responses.
- [ ] No credentials, assertions, emails, titles, or request bodies copied into
      this file.

## Result

Not run against the reconciled deployment candidate.
