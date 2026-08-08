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

Exit gate: one stream per project, single-flight reconnect, atomic
read-model/cursor persistence before ack, sparse catch-up, live-gap resync,
duplicate/old ignored, and stale state all pass against the controllable WS peer.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-local-runtime** | `ART-stream-client`, `ART-stream-manager`, `ART-projection-read-model` | TEST-stream-client-transport, TEST-stream-manager-single-flight, TEST-stream-manager-ack-persistence, TEST-stream-manager-stale, TEST-read-model-merge |

Lands `shared/services/cloud-sync/CloudProjectionStreamClient.ts` (Access headers
on upgrade, bounded backoff + jitter, token refresh, catch-up from cursor,
envelope validation, ping that does not wake the hub for an app request),
`server/services/cloud-sync/ProjectionStreamManager.ts` (exactly one client per
enabled project, server-lifecycle owned, single-flight reconnect, ack only after
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

Wires `server/services/TicketService.ts` to return the unified list from the
existing project-ticket endpoint (canonical Markdown + read-model entries with
no canonical match). The read model publishes an ordinary ticket-view change
through the existing `SSEBroadcaster`; `src/services/sseClient.ts` and
`src/hooks/useSSEEvents.ts` map it to the existing ticket bus. The browser
renders `kind/readOnly/stale` + the project sync-status chip per
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
