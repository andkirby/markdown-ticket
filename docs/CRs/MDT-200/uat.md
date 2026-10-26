# UAT Refinement Brief

## Objective

Stabilize MDT-200 after the 2026-10-24 ticket-key collisions: no supported create
or key-based mutation may accept a duplicate identity; manual files must be
observed safely even when their number is already reserved in the cloud.
Status: review fixes locally accepted on 2026-10-26; independent completion review passed. The
October25 challenge findings are addressed in source and regressions. Production
deployment and incident repair remain pending. Previous UAT evidence is archived in
[uat-history-2026-07.md](uat-history-2026-07.md).

## Approved Changes

1. Refine BR-1.1 and BR-1.4 to require key-wide collision checks, verified same-
   creation recovery, no false create success, and all-adapter evidence.
2. Align BR-1.7's connection wording with MDT-201 CONFIG_DIR semantics.
3. Add a journaled local allocation minimum enforced by the coordinator without
   replacing its authority; persist durable non-secret creationId across Git,
   journal, and reservation. Add protocol gating and server-verified idempotency.
4. Observe manual files and classify verified/conflict/unmanaged/pending. An
   existing cloud reservation is never free or adoptable by number alone. Keep
   files in place and provide actionable diagnostics; no automatic renumber,
   reserve, acknowledgement, publish, delete, or interactive watcher login.
5. Detect duplicate-key reads/mutations before first-match lookup can change the
   wrong ticket. Preserve authorized path inspection and offline local edits.
6. Define explicit audited idempotent operator reconciliation on the existing
   cloud project, including affected identity/projection associations, not only
   a counter bump. Production changes remain separately authorized execution.
7. Keep a full import CLI and commit enforcement as follow-up capabilities;
   this round adds no new ticket through the affected live allocator.
8. Close the corrected October25 technical-review gaps under existing requirements: explicit creation recovery/inspection, consistent canonical project codes, actionable fail-closed inventory, and stable bounded diagnostics. This is a follow-up in the current round, not another UAT acceptance run.

## Changed Requirement IDs

- `refine_in_place`: BR-1.1, BR-1.4, BR-1.7.
- `additive_change`: BR-1.8, BR-1.9, BR-1.10, BR-4.3, C9, C10, C11,
  Edge-7, Edge-8, Edge-9.
- Review follow-up: no further requirement ID or meaning changes; existing BR-1.4, BR-1.8, BR-1.9 and related identity/compatibility constraints already cover these gaps.
- No replacement, deletion, route-policy workaround, or scope removal.

## Affected Downstream Trace

- Requirements: preserve IDs, refine three, add the ten stated behaviors/rules.
- BDD: eight focused acceptance scenarios, covering allocation, replay, manual
  conflict/pending/Git identity, ambiguity, and operator repair.
- Architecture: guarded transactional floor allocation; durable creation identity;
  shared path-aware classifier; claim lookup; fail-closed compatibility; operator
  correction. PoC constraints are mandatory implementation inputs.
- Tests: seven new verification plans; every requirement remains covered.
- Tasks: three implementation execution slices. Existing TASK-projection gains the
  already-registered deletion regression to repair baseline missing task closure.

## Execution Slices

### A — Allocation, identity and explicit recovery — locally complete

- Objective: preserve the implemented collision guards and close F2/F3/F4: explicit owner-invoked inspection/resume/reviewed journal resolution, safe lock-owner diagnosis and canonical project-code normalization.
- Direct artifacts: shared `creation-recovery.ts`, owner-only server `cloudCreationRecovery.ts`, `domain-contracts/src/{project,cloud-sync,ticket}/`,
  `cloud/migrations/`, `cloud/src/cloudflare/{application,d1}/`,
  `shared/services/TicketService.ts`, `shared/services/{cloud-sync,ticket}/`,
  CLI create, MCP CR service, server TicketService/controllers.
- Direct GREEN targets: TEST-uat-allocation-floor, TEST-uat-key-identity,
  TEST-uat-create-adapters; stale_cloud_counter_skips_local_high_water,
  different_slug_same_key_rejected, floor_identity_replay_stable,
  duplicate_key_access_is_ambiguous.
- Canonical task: TASK-uat-allocation-identity.
- Additional direct GREEN targets: TEST-review-creation-recovery, TEST-review-legacy-journal-inspection, TEST-review-lock-owner-diagnostics, TEST-review-project-code-normalization, TEST-review-canonical-code-ack, TEST-review-recovery-adapter, TEST-review-recovery-http-integration, pending_creation_inspected_and_resumed, legacy_creation_journal_requires_reviewed_resolution, uncertain_creation_lock_is_actionable, lowercase_project_code_uses_canonical_identity.
- Result: explicit stored-intent recovery and canonical project-code handling are shipped in source. Acknowledged journals require terminal reconciliation; receipt-less state stays inspectable. Original same-intent retries remain supported.

### B — Safe manual-file observation and diagnostics — locally complete

- Objective: preserve safe observation and close F1/F5: named actionable inventory failures and stable last verified evidence across bounded claim windows with safe invalidation and explicit freshness.
- Direct artifacts: shared identity/classification contract and service;
  `server/services/fileWatcher/`, `server/services/cloud-sync/` observation and
  startup/error recovery integration; authorized diagnostic API/event boundaries.
- Direct GREEN targets: TEST-uat-manual-observation, TEST-uat-watcher-paths;
  manual_file_uses_other_reservation, manual_file_without_proof_pending,
  verified_git_file_is_same_creation.
- Canonical task: TASK-uat-observation-conflicts.
- Additional direct GREEN targets: TEST-review-inventory-diagnostics, TEST-review-observation-stability, inventory_failure_reports_actionable_paths, bounded_claim_rotation_preserves_diagnostics, identity_diagnostic_cache_invalidates_on_change.
- Result: inventory retains named failure causes/remedies and valid scanned entries; cached claim evidence stays stable outside the64-probe window and invalidates safely on content, identity, binding, credential or observed authorization changes.

### C — Incident reconciliation and operational acceptance

- Objective: preview/verify/apply an audited monotonic repair and explicit legacy
  identity correction, preserve history, and verify before resuming coordination.
- Direct artifacts: operator/application and D1 contracts, required forward-only
  migrations, `cloud/test/counter-reconciliation.test.ts`, and
  `cloud/test/operations/counter-reconciliation.md` (implemented local runbook).
- Direct GREEN targets: TEST-uat-counter-repair,
  TEST-uat-production-reconciliation; operator_repair_is_monotonic.
- Canonical task: TASK-uat-operator-reconciliation.
- Why: local repairs 257→261 and 258→262 did not move cloud reservations or
  projections. A counter-only change leaves incorrect associations unresolved.
- Operational boundary: implementation/fixture proof does not authorize a live
  mutation; preserve and inspect production rows before a reviewed repair.

## Validation

- Review documentation/trace pass:7 scenarios,3 artifact records,3 obligations,8 test plans and3 task records synchronized; requirement meanings unchanged. This remains the October24 round. A/B source fixes now have local regression evidence; C remains the separate operational gate.
- Current review status: A/B implementation and independent review passed. The focused suites total912 passes; five affected package builds, scoped lint and all-stage trace validation passed. See [verification.md](verification.md) for immutable checkpoint digests, baseline failures and remaining live gates. Earlier1068-test evidence remains historical.

- Baseline: all stages except tasks passed; tasks had one pre-existing missing
  closure for TEST-projection-sync-deletion. Resolved through TASK-projection; its link remains intact.
- PoC: [poc.md](poc.md). Candidate guarded batch passed isolated differing-floor
  concurrency, replay, operator-advance, and rollback checks; naive max-only
  change failed. Direct watcher handler proved path loss. No production fix,
  real D1 concurrency, Access, or live watcher delivery is claimed.
- Canonical trace: requirements → BDD → architecture → tests → tasks were
  validated and rendered in order. Final `spec-trace validate MDT-200 --stage
  all --format json` passed all five stages with zero issues. This validates
  trace structure and coverage, not implementation readiness.
- Strict drift/lock: not enabled; this is a non-strict same-ticket UAT delta.
- Implementation acceptance: run the package-specific cases in tests.md and
  require separate authorized live incident and multi-client evidence.

## Watchlist

- Do not replace the old number with local max+1 on failure. The observed local
  maximum is only a lower bound for authoritative cloud allocation.
- Do not mutate floor/creationId on a retry; do not trust an unchanged opaque
  client hash as proof those fields are unchanged.
- Guard reservation INSERT as well as counter UPDATE against the observed
  counter. Differing floors defeat a uniqueness-only race argument.
- New protocol support must precede client enforcement; old writers must not
  continue silently without identity/floor protections. Handle legacy pending
  journals explicitly, rather than inventing an identity during retry.
- Known matching Git identity is not a new creation. Unknown legacy identity
  is unverified, not automatically conflicting or safe. Cloud `reserved` rows
  may have no projection and still own their number.
- Existing files remain in place. No watcher can guarantee prevention of raw
  filesystem writes or detect files in disconnected clones before observation.
- MDT-226 owns projection delivery. This allocation correction adds no polling
  loop and does not reopen its Durable Object or browser-feed architecture.


## Review watchlist

- F6 authorization-bypass claim is retracted: both Worker paths call the
  authorized projection use case. Do not plan a workaround for a nonexistent bug.
- F2 is an explicit recovery/inspection gap; identical create retry works across
  processes. Never describe journal deletion as the normal remedy.
- F3 PID reuse is confirmed; the zombie subcase is unproven. No age-only lock theft.
- Keep incomplete inventory fail-closed; unavailable worktrees may be offline
  mounts. Add typed cause/path/remediation, not automatic skipping or pruning.
- Canonicalize project identity upstream; keep Worker project/code/creation
  checks strict and existing file/config bytes unchanged unless explicitly edited.
- Cached claim evidence is last verified evidence, never membership or adoption
  authority. Invalidate on meaningful identity/connection/auth changes; no timers.
