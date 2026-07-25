# Tasks: MDT-200

Canonical trace state lives in the Spec Trace tool; the rendered projection is
[`tasks.trace.md`](tasks.trace.md). Tasks are ordered by delivery slice. Each
owns artifacts and makes specific tests/scenarios green. Use
`spec-trace bundle task MDT-200 <id> --format md` for a focused implementation
packet.

## Slice 1 — Protected Worker Skeleton

Exit gate: real human + service-token assertions validated against the live
Access-protected Worker.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-routing** | `ART-cloud-http`, `ART-cloud-worker-entry` | TEST-access-jwt-validation, human_email_attribution |
| **TASK-access** | `ART-cloud-access` | TEST-access-jwt-validation, TEST-machine-attribution, TEST-deployed-access-human, TEST-deployed-access-machine, human_attribution_with_jwks_refresh, machine_attribution_origin_allowlist, machine_common_name_attribution |
| **TASK-boundary** | `ART-cloud-workspace` | TEST-package-boundary, TEST-exclusions-enforced |

Implemented in `cloud/src/cloudflare/worker.ts`, `http/router.ts`, and
`access/jwt.ts`.

## Slice 2 — Membership and Allocation

Exit gate: deployed concurrency, replay, isolation, denial, and recovery pass.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-migrations** | `ART-cloud-migrations`, `ART-cloud-d1` | TEST-migration-apply, TEST-alloc-transaction-shape |
| **TASK-allocation** | `ART-cloud-application` | TEST-alloc-*, TEST-deployed-concurrency, concurrent_creates_unique_numbers, idempotent_replay_one_reservation, idempotency_key_reuse_different_hash, cross_project_isolation, recover_local_write_failure*, coordination_unavailable_no_fallback, offline_existing_tickets_editable, local_only_unchanged |
| **TASK-membership** | `ART-cloud-application` | TEST-membership-roles, TEST-tenant-isolation, role_permissions_*, unknown_project_non_disclosure, revocation_blocks_next_op |
| **TASK-scheduled** | `ART-cloud-scheduled`, `ART-cloud-rate-limit` | TEST-audit-redacted, TEST-rate-limit-abuse, audit_records_structured, audit_records_scheduled_expiry |

`TASK-migrations` applies the first migration to the live production D1
(`02996cfe…`) — record a Time Travel bookmark first (operations.md).

## Slice 3 — Shared Local Orchestration

Exit gate: local-only regressions green; cloud create has no local fallback.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-local-orchestration** | `ART-domain-cloud-sync` | TEST-no-fallback-local, TEST-opt-in-binding, TEST-config-no-secrets, TEST-origin-allowlist |

Lands `shared/services/cloud-sync/`, the local/cloud branch in
`shared/services/TicketService.ts`, the operation journal, credential providers,
and the config schema additions.

## Slice 4 — Projection and Board

Exit gate: two independent clients observe changes within `pollIntervalSeconds`.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-projection** | `ART-cloud-application`, `ART-domain-cloud-sync` | TEST-projection-*, TEST-board-stub-render, projection_excludes_body, stale_projection_rejected, polling_sees_changes_within_interval, board_distinguishes_projected_state |

Board stubs per [`ux-design.md`](ux-design.md): read-only, labeled, non-draggable.
The browser polls through the owner-only local server adapter; credentials do
not cross into the frontend.

## Slice 5 — Operations and Documentation

Exit gate: operations release gate recorded against production.

| Task | Owns | Makes green |
| --- | --- | --- |
| **TASK-operations** | `ART-cloud-wrangler` | TEST-disable-markdown, TEST-restore-export-drill, disable_leaves_markdown_usable |

Reconciles `docs/CONFIG_SPECIFICATION.md`,
`docs/CONFIG_GLOBAL_SPECIFICATION.md`, `docs/CONFIG_INSPECTION.md`, creates
`docs/CLOUD_COORDINATION_GUIDE.md`, and reconciles MCP/CLI/server docs and the
permanent cloud-sync owner docs.

Project-onboarding and management-CLI implementation remain downstream in
MDT-201 and MDT-202. MDT-200 exposes the core contracts and runtime they
consume without duplicating their task ownership.

## Reconciliation Tasks

The UAT-added tasks in `tasks.trace.md` closed the concrete integration gaps:
runtime `TicketService` wiring, HTTP clients/credentials, atomic
acknowledgement/projection, route-level rate limits, real browser polling,
config inspection, and production-shaped concurrency. Remaining manual release
evidence is tracked in `verification.md`, not as work owned by MDT-201/202.
