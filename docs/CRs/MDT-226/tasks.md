# Tasks: MDT-226

Canonical trace state lives in the Spec Trace tool; the rendered projection is
[`tasks.trace.md`](tasks.trace.md). Tasks are ordered by the goal-prompt
dependency slices. Each owns architecture artifacts and makes specific
scenarios/test plans green. Use
`spec-trace bundle task MDT-226 <id> --format md` for a focused implementation
packet.

## Slice 1 — Contracts and migration

Exit gate: stream envelopes validated; unified ticket-view contract enforces no
cloud transport fields; v1→v2 config migration is atomic and `pollIntervalSeconds`
is out of active use; compatibility behavior preserved.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-contracts-migration** | `ART-stream-contract`, `ART-ticket-view-contract`, `ART-project-state` | TEST-stream-contract-shape, TEST-ticket-view-contract, TEST-config-v2-migration |

Lands `domain-contracts/src/cloud-sync/projection-stream.ts` (catchup/delta/
ready/ack/stale/error discriminated union), `domain-contracts/src/ticket/view.ts`
(unified `kind/readOnly/stale` item, no revision/transport/credential fields),
and the version-2 connection schema in `project-state-store.ts` + `config.ts`
(atomic v1→v2 migration discarding `pollIntervalSeconds`). Compatibility cursor
endpoint and rollback flag stay bounded.

## Slice 2 — Cloud project hub

Exit gate: deterministic routing, explicit operation serialization, catch-up/
high-water protocol, commit-before-broadcast, per-socket ack, alarm recovery,
hibernation, and revocation all pass in the Workers-runtime DO harness.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-project-hub** | `ART-project-hub`, `ART-worker-router`, `ART-worker-config`, `ART-projection-usecase`, `ART-projection-repository` | TEST-hub-operation-serialization, TEST-hub-commit-before-broadcast, TEST-hub-ack-and-alarm, TEST-hub-revocation-redaction |

Lands `cloud/src/cloudflare/durable/ProjectProjectionHub.ts` (hibernating
sockets, explicit async op queue, sparse catch-up to `ready` high-water,
commit-before-broadcast, per-socket acknowledged revisions, pre-armed alarm
recovery, post-hibernation bounded reauth, revocation close-before-delivery).
Adds the DO binding + class migration to `cloud/wrangler.jsonc` (validate with
`deploy:dry-run` only). Worker authenticates the upgrade and routes by exact
cloud project UUID. Reuses the existing projection use case/repository behind
the hub for D1 transactions.

## Slice 3 — Local projection runtime

Exit gate: one stream client per project, atomic
read-model/cursor persistence before ack, sparse catch-up, live-gap resync,
duplicate/old ignored, and stale state all pass against the controllable WS peer.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-local-runtime** | `ART-stream-client`, `ART-stream-manager`, `ART-projection-read-model` | TEST-stream-client-transport, TEST-stream-manager-single-flight, TEST-stream-manager-ack-persistence, TEST-stream-manager-stale, TEST-read-model-merge |

Lands `shared/services/cloud-sync/CloudProjectionStreamClient.ts` (Access headers
on upgrade, bounded backoff + jitter, token refresh, catch-up from cursor,
envelope validation, ping that does not wake the hub for an app request),
`server/services/cloud-sync/ProjectionStreamManager.ts` (exactly one client per
enabled project, server-lifecycle owned, catch-up intent, ack only after
atomic persistence), and `shared/services/cloud-sync/CloudProjectionReadModel.ts`
(projected header cache, applied cursor, atomic persistence, local-wins merge,
duplicate/gap decisions, no transport state to React).

## Slice 4 — Unified local delivery

Exit gate: unified ticket API returns canonical + projection-only read-only
entries; local wins on number; ordinary SSE fan-out; browser capability
rendering; no browser projection polling ownership.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-unified-delivery** | `ART-ticket-service`, `ART-local-sse`, `ART-sse-client`, `ART-use-sse-events` | TEST-unified-ticket-api, TEST-sse-fanout, TEST-e2e-local-wins-stale |

Wires `server/services/TicketService.ts` to return the unified list from
`GET /api/projects/:id/tickets/unified` (canonical Markdown + read-model entries
with no canonical match). The read model publishes an ordinary ticket-view
change through the existing `SSEBroadcaster`; `src/services/sseClient.ts` and
`src/hooks/useSSEEvents.ts` map it to the existing ticket bus. The browser
preserves and renders `kind/readOnly/stale` + the project sync-status chip per
[`ux-design.md`](ux-design.md).

## Slice 5 — Rollout and proof

Exit gate: feature flag, compatibility removal gate, observability, idle-D1
test, browser-visible latency probe, owner docs, and rollback verification.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-rollout-proof** | `ART-cloud-tests`, `ART-local-tests`, `ART-e2e-tests`, `ART-owner-docs`, `ART-data-doc`, `ART-identity-doc`, `ART-operations-doc` | TEST-e2e-no-polling-push, TEST-idle-zero-d1, TEST-delivery-latency-slo, TEST-deployed-hibernation-alarm, TEST-deployed-revocation |

Adds the per-installation feature flag and compatibility removal gate. Makes
`useCloudProjectionFeed.ts` and `/api/projects/:id/cloud-projections` removal a
deliberate step **after** the push path is green (kept as compatibility until
then). Reconciles permanent owner docs (`docs/architecture/cloud-sync/*`) and
the cloud runtime README. Records the idle-D1 and latency evidence as external
manual gates; removal of legacy polling and v1 retirement happen only after
telemetry confirms the migration gate.

## Slice 6 — Projection write retry isolation

Exit gate: projection writes never drain from a read path, retry only when due,
and stop safely for authorization, conflict, and missing-projection outcomes.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-write-journal-retry** | `ART-projection-write-journal`, `ART-shared-ticket-service` | TEST-write-journal-retry-classification, TEST-idle-zero-d1 |

Persists retry state/backoff (`attemptCount`, `nextAttemptAt`, typed last
error), attempts only due entries, uses the known projection version for one
conditional write, distinguishes `projection_not_found`, and quarantines
unmanaged tickets until reservation recovery or explicit import.

## Slice 7 — Local stream and credential resource bounds

Status: completed 2026-08-14.

Exit gate: compound transport termination, catch-up replacement, and concurrent
connect/manager-start calls produce one connection lane; background refresh is
non-interactive and accepts service credentials; valid human credentials are
reused; child acquisition is serialized and timeout-bounded.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-local-resource-bounds** | `ART-stream-client`, `ART-stream-manager`, `ART-access-credential-broker`, `ART-credential-provider`, `ART-server-bootstrap` | TEST-stream-client-transport, TEST-stream-manager-single-flight, TEST-credential-broker-resource-bounds |

Make `CloudProjectionStreamClient` the sole per-project connection state
machine. Add a process-scoped `AccessCredentialBroker`, inject it into every
server cloud path, serialize `cloudflared` children, signal deadline overruns
without admitting a replacement before exit, keep background refresh
non-interactive, support service credentials, and refresh headers plus expiry
together.

## Slice 8 — Incident recovery: failed stream containment

Status: implemented 2026-08-15, pending User Review. Automated incident tests
green; deployed gates below remain explicitly UNVERIFIED.

Exit gate: one typed session request performs one membership decision and
creates a short-lived hub grant; grant-bearing upgrade returns `101`; reconnect
adds no membership read; terminal state persists across restart; route
telemetry is accurate; rollout can be disabled; and 30 idle minutes produce
zero retry-driven D1 statements.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-stream-incident-recovery** | `ART-stream-contract`, `ART-worker-router`, `ART-project-hub`, `ART-stream-session-client`, `ART-stream-client`, `ART-stream-state-store`, `ART-stream-manager`, `ART-server-bootstrap`, `ART-cloud-tests`, `ART-local-tests`, `ART-owner-docs`, `ART-data-doc`, `ART-identity-doc`, `ART-operations-doc` | TEST-stream-session-client, TEST-stream-handshake-failure-classification, TEST-stream-status-local-only, TEST-worker-hub-upgrade-forwarding, TEST-deployed-stream-handshake, TEST-idle-zero-d1 |

Split typed HTTPS session authorization from the WebSocket data plane. Store
short-lived grant digests in the hub, persist local activation state, move all
retry policy into the manager, preserve upgrade headers, add the rollout flag
and accurate route telemetry, and expose the state through backend diagnostics.
Do not re-enable automatic streams until the deployed grant/handshake and
idle-D1 gates pass.

## Slice 9 — Scheduled-maintenance read amplification fix

Status: implemented and deployed 2026-08-26. Local: migrations apply in
order, retention plan `SEARCH audit_events USING INDEX audit_by_time`,
cloud suite 87/87. Production: `0003` applied via
`wrangler d1 migrations apply --remote` (2 commands, 9.28ms); EXPLAIN shows
`SEARCH audit_events USING INDEX audit_by_time (occurred_at<?)`; measured
retention SELECT `rows_read: 1` (was 12,714), results empty as expected.

Production evidence: the 15-minute audit-retention SELECT full-scanned
`audit_events` (12,714 rows) 96×/day ≈ 1.22M rows/day against the 5M/day D1
free-tier read budget, returning zero rows until events age past the 180-day
retention (oldest event was 32 days old). Root cause: no index leads with
`occurred_at`; both existing audit indexes lead with tenant columns.

Decisions: retention stays 180 days (whole database ≈ 6 MB; forensic window
kept — the quota defect is fixed with an index, not a shorter policy).
Reservation expiry stays an eager idempotent transition (34 rows read/day;
lazy expiry rejected — it would smear the TTL rule across every reader).

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-audit-retention-index** | `ART-audit-migration`, `ART-maintenance-tests`, `ART-data-doc` | TEST-audit-retention-index |

Add one forward-only migration creating `audit_by_time ON
audit_events(occurred_at)` so the retention scan reads only its bounded
working set. No behavior change to maintenance logic.

## Scenario closure

All eight BDD scenarios are made green by these tasks:

| Scenario | Made green by |
| --- | --- |
| `project_stream_live_after_catchup` | TASK-project-hub, TASK-local-runtime |
| `committed_projection_without_polling` | TASK-project-hub, TASK-unified-delivery |
| `tabs_share_cloud_stream` | TASK-local-runtime, TASK-unified-delivery |
| `reconnect_catches_up` | TASK-project-hub, TASK-local-runtime |
| `disconnected_board_stale` | TASK-local-runtime, TASK-unified-delivery |
| `revoked_member_disconnected` | TASK-project-hub |
| `post_commit_delivery_recovers` | TASK-project-hub, TASK-local-runtime |
| `local_ticket_wins` | TASK-local-runtime, TASK-unified-delivery |
