# BDD Scenarios: MDT-200

Canonical trace state lives in the Spec Trace tool; the rendered projection is
[`bdd.trace.md`](bdd.trace.md). Scenarios cover behavior requirements (BR-*);
constraint/edge-case items are tracked in requirements and routed to tests,
not BDD, per spec-trace policy.

## Allocation and Recovery

- **concurrent_creates_unique_numbers** (BR-1.1) — Two concurrent creates to one
  project return distinct numbers; no duplicate row.
- **idempotent_replay_one_reservation** (BR-1.2) — Retry with same key/hash
  returns the original reservation; counter advances once.
- **idempotency_key_reuse_different_hash** (BR-1.2) — Same key, different hash →
  `409 idempotency_key_reused`, no new number.
- **cross_project_isolation** (BR-1.3) — Two projects allocate from own
  counters without collision.
- **recover_local_write_failure_and_orphan** (BR-1.4) — Failed local write
  retries same reservation; retired numbers never reused.
- **coordination_unavailable_no_fallback** (BR-1.5) — Coordination down →
  recoverable failure, no local fallback number/key/range/lease.
- **offline_existing_tickets_editable** (BR-1.6) — Outage keeps existing tickets
  editable; new cloud creation blocked.
- **local_only_unchanged** (BR-1.7) — Local-only project uses existing scan; no
  cloud call.

## Identity and Isolation

- **human_attribution_with_jwks_refresh** (BR-2.1) — Verified email → human
  principal; unknown kid refreshes JWKS once.
- **machine_attribution_origin_allowlist** (BR-2.2) — Verified common_name →
  machine principal; off-allowlist origins rejected.
- **role_permissions_enforced** (BR-2.3) — Viewer/contributor/owner enforced
  per operation.
- **role_permissions_protect_final_owner** (BR-2.3) — Final owner cannot be
  removed/demoted.
- **unknown_project_non_disclosure** (BR-2.4) — Unknown and hidden projects
  return identical `404 project_not_found`.
- **revocation_blocks_next_op** (BR-2.5) — Revoked membership blocks the next
  request; no authz cache.

## Projection and Board

- **projection_excludes_body** (BR-3.1) — Projection exposes only approved
  headers, never a body.
- **stale_projection_rejected** (BR-3.2) — Stale expected-version rejected; newer
  projection not overwritten.
- **polling_sees_changes_within_interval** (BR-3.3) — Second client observes a
  change within `pollIntervalSeconds`.
- **board_distinguishes_projected_state** (BR-3.4) — Projected stubs render
  read-only, clearly labeled, no ownership/presence implication.

## Operations

- **audit_records_structured** (BR-4.1) — Allocation/projection/membership/
  denial/recovery each write a structured redacted audit record.
- **audit_records_scheduled_expiry** (BR-4.1) — Scheduled handler marks stale
  reservations abandoned in bounded batches with audit, counter untouched.
- **disable_leaves_markdown_usable** (BR-4.2) — Disabling cloud binding leaves
  all ticket content usable from Markdown/Git.
