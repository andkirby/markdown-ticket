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

## UAT 2026-10-24 — collision stabilization

These remain normative acceptance scenarios. Local automated evidence is
recorded in [verification.md](verification.md); production repair/acceptance
remains open and is not inferred from a scenario definition.

### stale_cloud_counter_skips_local_high_water

- **Covers**: BR-1.1,BR-1.8
- **Given** Counter is 258 and canonical local keys extend through 262.
- **When** a fresh cloud-bound CLI, MCP, or HTTP create requests allocation.
- **Then** the coordinator reserves at least 263 and exactly one canonical key is written and acknowledged.

### different_slug_same_key_rejected

- **Covers**: BR-1.1,BR-1.4
- **Given** a reservation or recovery intent targets a key occupied by another creation under another slug.
- **When** the shared writer attempts creation or acknowledgement.
- **Then** it reports a recoverable conflict, preserves both existing bytes and the held reservation, and never reports creation success.

### floor_identity_replay_stable

- **Covers**: BR-1.2,BR-1.4,BR-1.8
- **Given** a journaled create already has immutable allocation inputs and the counter has subsequently advanced.
- **When** the intent is retried or its floor or creation identity is changed under the same idempotency key.
- **Then** an unchanged retry returns the original reservation without advancing; changed immutable inputs are rejected.

### manual_file_uses_other_reservation

- **Covers**: BR-1.9
- **Given** a manually added file uses a key already reserved or acknowledged for a different proven creation.
- **When** the watcher or startup inventory classifies the file.
- **Then** it retains the file, reports conflict, and makes no reservation, acknowledgement, projection, rename, or delete mutation.

### manual_file_without_proof_pending

- **Covers**: BR-1.9
- **Given** a local file has no verifiable creation provenance or coordination evidence cannot be read.
- **When** the file is observed.
- **Then** the file remains inspectable with an unmanaged or verification-pending diagnostic and no automatic cloud mutation.

### verified_git_file_is_same_creation

- **Covers**: BR-1.9
- **Given** a ticket arrives through Git with creationId matching its acknowledged coordinator claim.
- **When** the watcher or startup inventory observes the file.
- **Then** it identifies the same existing creation without reserving or acknowledging again.

### duplicate_key_access_is_ambiguous

- **Covers**: BR-1.10
- **Given** two local files claim MDT-258.
- **When** CLI, MCP, or HTTP resolves MDT-258 for reading or mutation.
- **Then** it reports ambiguity and authorized relative paths rather than selecting or mutating either file.

### operator_repair_is_monotonic

- **Covers**: BR-4.3
- **Given** coordination is suspended and reviewed files, reservations, projections, and pending intents are inventoried.
- **When** an authorized operator previews and applies the explicit repair twice.
- **Then** the counter never decreases, prior allocation history remains, the second apply is idempotent, and unresolved identity conflicts keep resumption blocked.

## Review regressions 2026-10-25 — locally verified 2026-10-26

These scenarios close existing behavior requirements. Their repository
regressions and independent local review passed; see verification.md.
Isolated/local results do not accept deployment or production incident repair.

### pending_creation_inspected_and_resumed

**Covers**: BR-1.4, BR-1.5

- Given A valid v2 creation journal survives a process exit with its original draft, identity, floor and reservation.
- When The owner inspects it and explicitly resumes it through a shipped adapter without reconstructing create arguments.
- Then The shared recovery service verifies the current file and held reservation, reuses the original intent, acknowledges at most once and retains evidence on failure.

### legacy_creation_journal_requires_reviewed_resolution

**Covers**: BR-1.4

- Given An active or legacy routing location contains a legacy, corrupt or schema-invalid creation journal.
- When The owner requests inspection or a new create is attempted.
- Then Inspection reports bounded redacted state, original routing and remediation; no automatic deletion, identity invention, replacement reservation or startup write occurs; reconciliation requires explicit reviewed proof and expected journal state.

### uncertain_creation_lock_is_actionable

**Covers**: BR-1.4

- Given A retained creation lock has an ambiguous owner or a PID now belonging to another process.
- When The owner inspects recovery state or attempts explicit resume.
- Then The outcome reports available PID and creation time and a safe verification path; age alone never authorizes lock theft and no overlapping create runs.

### lowercase_project_code_uses_canonical_identity

**Covers**: BR-1.1, BR-1.4, BR-1.7, BR-1.8

- Given A supported local project config spells its code mdt and is connected to cloud project code MDT.
- When A supported create and its same-intent recovery run.
- Then The canonical project/key identity is consistent before reservation, writing and verification; creation succeeds with strict Worker identity checks and no automatic renaming of existing files.

### inventory_failure_reports_actionable_paths

**Covers**: BR-1.8, BR-1.9

- Given A known worktree is unavailable, a canonical root is unreadable or a filename contains an unsupported number.
- When Inventory is used by create or explicit observation.
- Then Creation stays blocked and available inventory evidence is retained; diagnostics name authorized relative paths, typed causes and safe operator steps without silently skipping roots or mutating files.

### bounded_claim_rotation_preserves_diagnostics

**Covers**: BR-1.9

- Given More than64 eligible canonical creations have matching acknowledged cloud claims.
- When Repeated event-triggered observations rotate a maximum64 claim probes per pass.
- Then An unchanged file is not demoted solely because it is outside this pass; last verification and freshness remain explicit, duplicate notifications are coalesced and no timer or cloud mutation is added.

### identity_diagnostic_cache_invalidates_on_change

**Covers**: BR-1.9

- Given Last verified claim evidence exists for a file in a particular local project, binding and principal context.
- When The file identity changes, a duplicate appears, the binding or principal changes, or a probe returns an authorization failure.
- Then Affected cached evidence is invalidated or explicitly stale; a previous verified outcome cannot authorize adoption or publication, and current membership remains enforced on mutations.
