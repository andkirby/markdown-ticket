# Tests: MDT-226

Canonical trace state lives in the Spec Trace tool; the rendered projection is
[`tests.trace.md`](tests.trace.md). Each requirement, edge case, and scenario
maps to exact verification. Kinds: `unit` (pure logic + Workers-runtime DO
harness), `integration` (local server manager + read model + controllable WS
peer + fake clock), `e2e` (Playwright against real board + local server),
`manual` (deployed limited-production probe / live Access-protected Worker /
operator procedure — the external SLO and idle-D1 gates).

The cloud Durable Object tests require a Workers-runtime/Miniflare harness with
D1 + DO bindings, **not** the plain SQLite `projection-d1-adapter.ts` used by
the existing MDT-200 projection tests. Local server tests use a controllable
WebSocket peer and a fake clock to make hibernation, alarm, and backoff
deterministic.

## Unit (Workers-runtime DO + pure logic)

| Plan | Covers | File |
| --- | --- | --- |
| TEST-hub-operation-serialization | C-5, C-6, Edge-2 | `cloud/test/project-projection-hub.test.ts` — explicit async op queue serializes subscribe/mutate across forced async D1 waits; sparse catch-up rows advance only to `ready` high-water |
| TEST-hub-commit-before-broadcast | C-2, C-4 | `cloud/test/project-projection-hub.test.ts` — D1 mutation failure broadcasts nothing; commit success broadcasts one complete delta; delta has header+metadata only, no body |
| TEST-hub-ack-and-alarm | Edge-1, C-7 | `cloud/test/project-projection-hub.test.ts` — two sockets, only one acks; pre-armed alarm replays bounded catch-up to the lagging socket; hibernation restore + alarm recovery |
| TEST-hub-revocation-redaction | C-10, Edge-4, C-3 | `cloud/test/project-projection-hub.test.ts` — membership revoke closes socket before later delivery; close/error envelopes carry no secret/body fields; token expiry + bounded reauth |
| TEST-stream-contract-shape | C-4, C-2 | `domain-contracts/src/cloud-sync/__tests__/projection-stream.test.ts` — envelope discriminated union validates catchup/delta/ready/ack/stale/error; rejects body/credential fields |
| TEST-read-model-merge | C-2, C-6, BR-1.9 | `shared/services/cloud-sync/__tests__/CloudProjectionReadModel.test.ts` — local-wins merge, projection-only entries, duplicate/old revision ignored, sparse accepted in catch-up, live gap triggers resync |
| TEST-ticket-view-contract | C-11, C-3 | `domain-contracts/src/ticket/__tests__/view.test.ts` — unified item has kind/readOnly/stale, no projectRevision/projectionVersion/cursor/cloudUrl/credential |

## Integration (local server + controllable WS peer + fake clock)

| Plan | Covers | File |
| --- | --- | --- |
| TEST-stream-client-transport | C-6, C-10, C-3 | `shared/services/cloud-sync/__tests__/CloudProjectionStreamClient.test.ts` — Access headers on upgrade, bounded exponential backoff + jitter, token refresh, catch-up request from last cursor, envelope validation, ping does not wake hub for app request |
| TEST-stream-manager-single-flight | C-5, C-1, BR-1.6 | `server/tests/services/cloud-sync/ProjectionStreamManager.test.ts` — exactly one client per enabled project; tab mounts do not add streams; single-flight reconnect; stop is clean |
| TEST-stream-manager-ack-persistence | C-6, Edge-1 | `server/tests/services/cloud-sync/ProjectionStreamManager.test.ts` — read-model + cursor persisted atomically before ack; failed apply does not ack or advance |
| TEST-stream-manager-stale | BR-1.5, SC-5 | `server/tests/services/cloud-sync/ProjectionStreamManager.test.ts` — disconnect keeps last projection + marks stale; bounded reconnect; catch-up in revision order before live |
| TEST-config-v2-migration | Edge-3, C-9 | `shared/services/cloud-sync/__tests__/project-state-store.test.ts` — v1 with pollIntervalSeconds migrates atomically to v2; identity/origin/credential unchanged; pollIntervalSeconds discarded from active use |
| TEST-unified-ticket-api | BR-1.9, C-11, C-2 | `server/tests/services/cloud-sync/SSEProjectionFanout.test.ts` — unified ticket endpoint returns canonical + projection-only read-only entries with kind/readOnly/stale; local wins on number; no cloud transport fields |
| TEST-sse-fanout | BR-1.3, C-11 | `server/tests/services/cloud-sync/SSEProjectionFanout.test.ts` — read-model change emits an ordinary ticket-view change via existing SSEBroadcaster; browser gets no projection protocol |

## E2E (Playwright, real board + local server)

| Plan | Covers | File |
| --- | --- | --- |
| TEST-e2e-no-polling-push | C-3, C-11, BR-1.2, BR-1.3 | `tests/e2e/cloud-sync-board.spec.ts` — remote projection appears without any `/cloud-projections` request; arrives as ordinary ticket update; additional tabs add no cloud traffic; no direct cloud socket in the browser |
| TEST-e2e-local-wins-stale | BR-1.9, BR-1.5 | `tests/e2e/cloud-sync-board.spec.ts` — same-number local ticket wins; disconnected board keeps projection visible + stale; local use unblocked |

## Manual (deployed limited-production probe / live Worker / operator)

These cannot be automated locally — they require a deployed Access-protected
Worker with real D1 statement-count instrumentation and browser-visible
latency measurement. They are the runtime gates for slice exit.

| Plan | Covers | Evidence file |
| --- | --- | --- |
| TEST-idle-zero-d1 | C-1, C-7 | `cloud/test/operations/idle-zero-d1.md` — hold a connected project idle for ≥5 former poll intervals; observe zero timer-caused projection/membership D1 reads (statement/request counts, not absence of logs) |
| TEST-delivery-latency-slo | C-8 | `cloud/test/operations/delivery-latency.md` — p50/p95/p99 commit-to-rendered-browser under documented load ≤2s p95; reconnect catch-up ≤5s p95 |
| TEST-deployed-hibernation-alarm | C-7, Edge-1 | `cloud/test/operations/hub-recovery.md` — live hibernation restore + alarm replay + reconnect catch-up on a deployed Worker |
| TEST-deployed-revocation | Edge-4, C-10 | `cloud/test/operations/revocation.md` — live membership revoke closes socket before next delivery |

## Coverage invariant

Every tests-routed requirement (C-1..C-11, Edge-1..Edge-4) has at least one
test-plan coverage entry, validated by
`spec-trace validate MDT-226 --stage tests --strict`. The `manual` plans are
the deployment/idle/latency evidence gates; the rest run in CI against the
Workers-runtime DO harness, controllable WS peer, and Playwright.

Coverage routing is not completion evidence. The idle-D1 and latency SLOs are
explicitly external gates (C-1, C-7, C-8): unit tests cannot prove the absence
of timer-driven reads or accept a p95 latency. If no safe limited-production
probe is available, those gates are reported as unverified at User Review.
