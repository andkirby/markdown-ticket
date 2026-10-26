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

## UAT 2026-10-24 — current execution state

The tasks below define October source scope. Initial local checks are historical
evidence. The October25 review fixes were locally accepted on 2026-10-26: A/B
are done; C retains production incident acceptance. See [uat.md](uat.md) and
[verification.md](verification.md); preserve existing historical trace IDs.

| Task | Objective | Direct GREEN targets |
| --- | --- | --- |
| TASK-uat-allocation-identity | Locally complete: allocation/identity guards, explicit owner recovery, terminal-proof archival and canonical code normalization | TEST-uat-allocation-floor,TEST-uat-key-identity,TEST-uat-create-adapters,stale_cloud_counter_skips_local_high_water,different_slug_same_key_rejected,floor_identity_replay_stable,duplicate_key_access_is_ambiguous |
| TASK-uat-observation-conflicts | Locally complete: manual/Git classification, actionable fail-closed inventory and stable bounded verification evidence | TEST-uat-manual-observation,TEST-uat-watcher-paths,manual_file_uses_other_reservation,manual_file_without_proof_pending,verified_git_file_is_same_creation |
| TASK-uat-operator-reconciliation | Production acceptance open: local repair code/tests exist; execute separately authorized incident repair and retain before/after evidence | TEST-uat-counter-repair,TEST-uat-production-reconciliation,operator_repair_is_monotonic |


Baseline trace repair: the already-registered `TEST-projection-sync-deletion` had
no task closure before this round. Its link was restored in `TASK-projection`;
this does not claim new test execution or alter its requirements.

## Implementation execution — 2026-10-25

The three UAT tasks below are the current implementation tracker. All July
tasks above remain historical. Production deployment and remote D1 repair are
not part of this local implementation command.

### Task 1: Allocation and creation identity

**Canonical Task**: TASK-uat-allocation-identity

- [x] Initial implementation and scoped local checks completed before the GLM challenge.
- [x] Close F2/F3 through shared inspect/resume/reviewed resolution and a shipped explicit owner-only adapter; preserve legacy/corrupt evidence and safe lock ownership.
- [x] Close F4 by normalizing canonical project/key identity before writes and strict cloud ACK; preserve local-only compatibility.
- [x] Prove new recovery, lock, adapter and code-normalization regressions RED → GREEN; rerun retained allocation/identity/adapter coverage.
- Independent local completion review: verdict is recorded in the immutable completion evidence; no full-ticket release claim follows from these checks.

**Current status**: locally complete; independent completion review passed. Full-ticket operational/release gates remain open.

### Task 2: Manual-file observation

**Canonical Task**: TASK-uat-observation-conflicts

- [x] Initial observation implementation and scoped local checks completed before the GLM challenge.
- [x] Close F1 with typed per-path inventory causes and safe remediation while keeping unavailable/invalid inventory fail-closed.
- [x] Close F5 with bounded stable last verified claim evidence, explicit freshness and safe invalidation on meaningful changes.
- [x] Prove real130-file rotation, invalidation and named-inventory-error regressions RED → GREEN; rerun watcher/auth/path-leak checks.
- Independent local completion review: verdict is recorded in the immutable completion evidence; no full-ticket release claim follows from these checks.

**Current status**: locally complete; independent completion review passed. Full-ticket operational/release gates remain open.

### Task 3: Operator reconciliation

Production TEST-uat-production-reconciliation remains open after local code
verification; execute only as the separately reviewed incident operation.

**Canonical Task**: TASK-uat-operator-reconciliation

- [x] Implement the corresponding current UAT slice and preserve prior behavior outside it.
- [x] Prove owned regressions RED → GREEN and local adapter acceptance.
- [x] Review mutation scope, test integrity, and local evidence; retain full-ticket release gates.

**Mutation intent**: create `domain-contracts/src/cloud-sync/identity.ts`, `shared/services/ticket/TicketIdentityService.ts`, `shared/services/cloud-sync/__tests__/ticket-identity.test.ts`, `cloud/src/cloudflare/application/counter-reconciliation.ts`, `cloud/migrations/0005_creation_identity.sql`, `cloud/test/identity-allocation.test.ts`, `cloud/test/counter-reconciliation.test.ts`, `cloud/test/helpers/identity-d1.ts`, `cloud/test/operations/counter-reconciliation.md`, `server/services/cloud-sync/TicketIdentityObservation.ts`, `server/routes/ticketIdentities.ts`, `server/tests/services/cloud-sync/TicketIdentityObservation.test.ts`; modify `domain-contracts/src/cloud-sync/coordinator.ts`, `domain-contracts/src/cloud-sync/projection.ts`, `domain-contracts/src/cloud-sync/persisted.ts`, `domain-contracts/src/cloud-sync/index.ts`, `domain-contracts/src/ticket/entity.ts`, `domain-contracts/src/ticket/frontmatter.ts`, `domain-contracts/src/ticket/persisted-frontmatter.ts`, `shared/models/Ticket.ts`, `shared/services/MarkdownService.ts`, `shared/services/TicketService.ts`, `shared/services/cloud-sync/create-orchestrator.ts`, `shared/services/cloud-sync/operation-journal.ts`, `shared/services/cloud-sync/CloudSyncCoordinator.ts`, `shared/services/cloud-sync/recovery.ts`, `shared/services/cloud-sync/__tests__/create-orchestrator.test.ts`, `shared/services/cloud-sync/__tests__/ticketservice-config-dir-cutover.test.ts`, `shared/services/cloud-sync/__tests__/CloudSyncCoordinator.test.ts`, `shared/services/cloud-sync/__tests__/recovery.test.ts`, `cloud/src/cloudflare/worker.ts`, `cloud/src/cloudflare/application/reservation.ts`, `cloud/src/cloudflare/application/validation.ts`, `cloud/src/cloudflare/application/projection-usecase.ts`, `cloud/src/cloudflare/d1/statements.ts`, `cloud/src/cloudflare/d1/projection.ts`, `server/services/fileWatcher/PathWatcherService.ts`, `server/services/fileWatcher/index.ts`, `server/services/TicketService.ts`, `server/server.ts`, `server/security/accessPolicy.ts`, `server/controllers/ProjectController.ts`, `server/tests/unit/PathWatcherService.test.ts`, `server/tests/security/apiAuth.test.ts`, `server/tests/unit/ProjectController.boundaries.test.ts`, `server/tests/services/cloud-sync/SSEProjectionFanout.test.ts`, `cli/tests/e2e/ticket/create.spec.ts`, `mcp-server/src/tools/handlers/__tests__/crHandlers.test.ts`, `docs/CRs/MDT-200/uat.md`, `docs/CRs/MDT-200/verification.md`, `docs/CRs/MDT-200/architecture.md`, `docs/CRs/MDT-200-cloud-sync-first-slice.md`, `docs/architecture/cloud-sync/data-and-consistency.md`, `docs/architecture/cloud-sync/operations.md`, `docs/architecture/cloud-sync/README.md`, `cloud/test/ack.projection.test.ts`, `cloud/test/alloc.concurrency.test.ts`, `cloud/test/alloc.integration.test.ts`, `cloud/test/publish.usecase.test.ts`, `cloud/test/maintenance.test.ts`, `cloud/test/audit.test.ts`, `cloud/test/membership.roles.test.ts`, `cloud/test/projection.test.ts`, `cloud/test/membership.isolation.test.ts`, `cloud/test/provisioning.idempotency.test.ts`, `cloud/test/ratelimit.wiring.test.ts`; delete none. Any necessary concrete path amendment is recorded here before its edit.

**Verify / Observe**: cloud `bun test ./cloud/test/identity-allocation.test.ts ./cloud/test/counter-reconciliation.test.ts`; shared `bun run --cwd shared jest services/cloud-sync --runInBand`; server `bun run --cwd server jest tests/unit/PathWatcherService.test.ts tests/security/apiAuth.test.ts tests/services/cloud-sync/TicketIdentityObservation.test.ts --runInBand`; CLI `bun run --cwd cli test:e2e -- tests/e2e/ticket/create.spec.ts`; MCP `bun run --cwd mcp-server jest src/tools/handlers/__tests__/crHandlers.test.ts --runInBand`; `bun run build:all`; `spec-trace validate MDT-200 --stage all --format json`. All commands run against isolated fixtures. Observe: same-key different-slug and duplicate-key mutation rejection; no watcher cloud mutation; real SQLite counter/identity replay and repair dry-run idempotency.

**Parallel boundary**: lead owns domain contracts except the new cloud identity schema file, shared, CLI/MCP, docs and acceptance. Cloud worker owns cloud/ plus that one pure schema file; server worker owns server/. Shared contract signatures are settled before dependent runtime work. No concurrent spec-trace writes or production mutation.

Implementation scope amendment (2026-10-25): adapter acceptance creates
`mcp-server/src/services/__tests__/crService.identity.test.ts` and modifies
`mcp-server/src/services/crService.ts` only to allow injecting the existing
shared TicketService into the thin adapter. Extend CLI create acceptance with
a temporary loopback TLS coordinator and subprocess-only fixture credentials;
no production requests or persistent global TLS setting. RecoveryRunner also
requires a current-file verifier before acknowledgement of a retained write.
Existing regression fixtures are upgraded to versioned protocol inputs while
retaining their behavioral assertions. No requirement or trace link changes.

Review amendment: extend `shared/services/cloud-sync/__tests__/operation-journal.test.ts`
for incomplete/live/stale lock ownership and lock-release identity; require
explicit recovery for an unverifiable lock. Serialize verified dead-owner
reclamation and preserve ownership tokens. Inventory also covers noncanonical
root Markdown files that claim a project key, so first-match scans cannot
bypass ambiguity. Transport errors preserve the new typed protocol/state codes.

Verification boundary amendment: `build:all` was executed and failed in two
unchanged frontend test-setup type declarations; both failures reproduce from
a clean HEAD source export using the installed toolchain. Keep that failed run
as a full-repository release gate. Source acceptance separately builds every
affected package (domain-contracts, shared, server, MCP, cloud, CLI), runs the
cloud suite, shared cloud-sync suite, CLI/MCP suites, focused server integration
and security coverage, changed-file lint, and all-stage trace validation. The
original sealed RED plan is retained unchanged; a post-implementation acceptance
snapshot does not replace or retroactively rewrite its baseline. Test files
already authored before that first snapshot are not reclassified as production
source creations. Broad-suite failures are recorded separately in verification.md.

Final compatibility amendment: preserve explicitly configured absolute or
relative external ticket roots accepted by project setup. Inventory such a
configured root once across linked worktrees, keep external diagnostic labels
relative under `tickets-root/`, and use path.resolve consistently for ticket
writers/readers. Add local-only and cloud-bound create/read/edit/delete
regressions; this resolves an existing join/resolve inconsistency without
changing binding authority or accepting arbitrary unconfigured directories.

Final entrypoint amendment: modify
`mcp-server/src/services/SectionManagement/SectionRepository.ts` and extend the
real-service MCP identity regression so a warmed section cache cannot bypass a
fresh key-ambiguity check. Cache reads must re-resolve the ticket before reuse.
Configured shared external-root lookup selects the physical ticket directory,
not whichever worktree happened to be inventoried first.


## Review closure 2026-10-25 — original assignment (now locally accepted)

This is technical-review closure within the existing October24 UAT round. No
new acceptance session, feature ticket, requirement ID or meaning is introduced.
The original task list was A→B→C: reopen the two existing code tasks, retain the
separate production operation gate, and preserve every previous Makes GREEN
link. Spec Trace owns canonical task/test closure; this checklist owns execution
status. Earlier checked local milestones do not mean the new fixes are complete.

| Task | Review objective (A/B locally complete) | Direct GREEN targets |
| --- | --- | --- |
| TASK-uat-allocation-identity | Explicit shared creation recovery + owner adapter, inspectable uncertain locks, canonical project-code normalization | TEST-review-creation-recovery,TEST-review-legacy-journal-inspection,TEST-review-lock-owner-diagnostics,TEST-review-project-code-normalization,TEST-review-canonical-code-ack,TEST-review-recovery-adapter,TEST-review-recovery-http-integration,pending_creation_inspected_and_resumed,legacy_creation_journal_requires_reviewed_resolution,uncertain_creation_lock_is_actionable,lowercase_project_code_uses_canonical_identity |
| TASK-uat-observation-conflicts | Actionable fail-closed inventory and stable bounded identity diagnostics | TEST-review-inventory-diagnostics,TEST-review-observation-stability,inventory_failure_reports_actionable_paths,bounded_claim_rotation_preserves_diagnostics,identity_diagnostic_cache_invalidates_on_change |
| TASK-uat-operator-reconciliation | Retain locally verified repair code; separately authorized deployed incident acceptance | Existing TEST-uat-counter-repair,TEST-uat-production-reconciliation,operator_repair_is_monotonic |

### Review implementation boundary

Planned new files: `shared/services/cloud-sync/creation-recovery.ts`,
`server/routes/cloudCreationRecovery.ts`,
`server/tests/services/cloud-sync/CloudCreationRecovery.test.ts`; a pure
creation-recovery contract may be added under `domain-contracts/src/cloud-sync/`
with its exact filename declared before coding. Expected modifications: existing
shared journal/recovery/orchestrator and TicketService; project/key identity
contracts and shared normalization owner; shared identity inventory/classifier;
server observation/routes/access policy/wiring; corresponding tests listed in
tests.md; existing cloud identity tests; this ticket's workflow docs. No new
migration or Worker behavior change is presumed. Any such need requires an
explicit architecture/scope amendment before coding.

No CLI business logic, automatic startup recovery writes, generic import UI,
implicit legacy identity adoption, journal deletion, file renumbering, worktree
pruning, age-only lock theft or production mutation is authorized by this plan.
CLI presentation extensions belong to MDT-202. Shared TicketService/journal
ownership overlaps A and B, so implement these tasks sequentially unless a later
assignment gives disjoint paths. Do not run concurrent Spec Trace writes.

### Verify / Observe review fixes

Run targeted shared Jest suites for create-orchestrator, recovery,
operation-journal and ticket-identity; cloud `identity-allocation.test.ts`; server
owner-only recovery adapter plus existing identity-observation/security suites.
Use isolated CONFIG_DIR, SQLite, Git repos, ports and caches. Before source edits,
author repository regression cases, capture meaningful RED evidence, declare
exact mutation paths and seal the verification plan. Observe: explicit restart
recovery without repeated CLI payload, one held identity/number and ACK at most
once; legacy/corrupt state inspectable with no implicit write; canonical lowercase
create verified by Worker;130-file passes <=64 claims with stable unchanged
state and invalidation; unavailable roots still block creates with named safe
remediation. No passing execution of these new repository cases is claimed yet.

After fixes, rerun affected-package builds/lint, retained adapter acceptance,
non-strict all-stage trace validation and independent review. Earlier immutable
source-check records remain historical; changed docs/trace supersede their
artifact bindings and require a new acceptance snapshot after implementation.

## Implementation assignment 2026-10-26

The user authorized the review fixes using subthreads. Production operations
remain excluded. Lead owns shared TicketService integration, project-code
normalization, inventory/claim-cache diagnostics, domain identity diagnostic
fields, cloud identity acceptance tests, docs/trace and final evidence. Recovery
worker owns operation-journal.ts, recovery.ts when required, the new shared
creation-recovery.ts policy and new pure
`domain-contracts/src/cloud-sync/creation-recovery.ts` plus its index export,
and journal/recovery tests. Server worker owns the new recovery route/test,
server facade/wiring/access policy and its relevant auth tests. These paths are
disjoint; shared TicketService edits remain with the lead, so no concurrent
writes cross the A/B integration boundary. Both workers first prepare regression
tests only; production edits begin only after the lead captures RED and seals
exact mutation intent. No other source files may be edited without a recorded
scope amendment. No nested worker delegation.

Concrete recovery interface: owner-only GET
`/api/projects/:projectId/cloud-sync/creation-recovery`, explicit POST at
`.../resume` and `.../reconcile`. Shared TicketService exposes
inspectCreationRecovery(project), resumeCreationRecovery(project,input), and
reconcileCreationRecovery(project,input); the server facade takes projectId.
Requests identify a discovered journalId and expected content digest. Reconcile
uses a fresh operation UUID and reviewed reason. Its minimum safe disposition is
archive-terminal: only after current coordinator/canonical evidence verifies
that original held receipt is terminal, preserve original bytes and an immutable
local decision record under user-only permissions, and remove it from active
routing without deleting history. Unknown/unprovable state remains inspectable
manual-review-required. Resume uses the original stored draft and held identity
through RecoveryRunner, never a new reservation/identity. Live or unverifiable
locks are not stolen. This is explicit reviewed resolution, not automatic
startup recovery, import, generic force-clear or blanket journal deletion.

Lead exact additional mutation intent: modify
`domain-contracts/src/project/schema.ts` to expose a pure canonical project-code
boundary schema, `domain-contracts/src/cloud-sync/identity.ts` for typed diagnostic
cause/action/freshness, `shared/services/TicketService.ts`,
`shared/services/ticket/TicketIdentityService.ts`,
`server/services/cloud-sync/TicketIdentityObservation.ts`, and corresponding
owned create/identity/observation and cloud identity tests. Cloud tests consume
only the pure domain canonical-code contract and real Worker application/SQL;
no filesystem-aware monorepo import is added to cloud. Recovery may add an
optional expectedDigest to the existing runner and check/hash/parse the same
bytes under its own lock before replay.

Acceptance scope amendment: the lead also extends the existing real-service
`server/tests/unit/TicketService.boundary-compatibility.test.ts` to prove the
owner HTTP route reaches the shared journal, stored-draft replay and canonical
file verification. This supplements the adapter's mocked-port unit tests.

## Review-fix local acceptance boundary (2026-10-26)

The prepared recovery/journal assertions and HTTP/auth assertions were frozen
before source implementation. Original sealed RED plan and the additional
real shared-facade RED plan remain immutable. Spec-trace task titles now
reflect implemented source; IDs, ownership and Makes GREEN links are retained.
A final current-source acceptance snapshot records the updated docs/trace and
actual command outcomes; it does not retroactively replace the pre-edit
baselines or declare all initial dirty paths as changes from this follow-up.

Affected builds domain-contracts/shared/server/MCP/cloud pass. CLI build and
full CLI suite remain blocked by missing cloud-management exports already in
HEAD56987b5 (reproduced in an isolated clean source export); the exact CLI
create acceptance passes18/18. The full server suite has15 failures in8 suites
and8 pre-existing skips; all15 reproduce in those8 HEAD suites. Full shared
has3 integration project-discovery failures; unrelated integration failures
are not silently converted into success. Scope acceptance uses the existing
focused source checks plus their explicit failing full-suite release gates.
No production incident check is counted as complete and no live data changes
are authorized by these local results.

Final review amendment: an acknowledged journal is not resumable through the
new owner API. Its next action is archive-terminal only when a held receipt is
parseable, otherwise manual-review-required. Current coordinator/canonical
terminal proof is mandatory before removing this active entry; the historical
low-level runner cleanup branch is not exposed as a bypass. Two actual HTTP
regressions in the already-owned boundary-compatibility test reproduce silent
cleanup before the fix. Lead modifies the already-owned shared recovery policy
and journal inspection; no requirement meaning or new runtime owner changes.

## Documentation alignment — 2026-10-26

A/B execution trackers are done and the read-only completion review passed.
C stays in progress for production acceptance. The existing actual
HTTP/shared recovery test is registered as TEST-review-recovery-http-integration; retain
all earlier task targets, including TEST-projection-sync-deletion. This changes
verification trace completeness, not requirement or scenario meanings. Durable
rule/operations/guide updates describe source behavior and residual fail-closed
manual-review states; no new runtime capability is claimed.
