---
code: MDT-200
status: In Progress
dateCreated: 2026-07-24T09:16:41.530Z
type: Feature Enhancement
priority: High
dependsOn: MDT-199
relatedTickets: MDT-201,MDT-202,MDT-203,MDT-226
phaseEpic: MDT-227
---

# Implement cloud sync first slice

> **Historical implementation baseline.** MDT-200 records the polling-based
> slice that was implemented. `MDT-226` supersedes only its projection-delivery
> and browser-feed architecture with a backend-managed Durable Object stream and
> unified local ticket API/events. MDT-200's allocation, authority, identity,
> membership, projection-write, and audit decisions remain in force.

> **Open UAT correction — 2026-10-24.** The historical Implemented baseline has
> a confirmed duplicate-key defect. [Current UAT brief](MDT-200/uat.md) defines
> allocation/identity, manual-file observation, and operator-repair work.
> [PoC](MDT-200/poc.md) validates an isolated candidate. Initial source changes
> passed scoped local checks; the October25 independent challenge reopened
> recovery/normalization and diagnostic fixes. Those review fixes are now
> locally accepted:912 focused tests and independent completion review passed.
> [Verification](MDT-200/verification.md) records evidence and residual limits.
> Production deployment/incident acceptance and repository-wide release checks
> remain open. Production has not been repaired by this procedure.

## 1. Description

### Requirements Scope

`full`

### Problem

- Teammates using separate clones can allocate the same ticket number before Git synchronization.
- Ticket headers and status changes are invisible to teammates until repository changes are shared.
- Existing owner authentication represents one administrator and does not attribute collaborative writes to human or machine team principals.

### Affected Areas

- Shared services: ticket allocation and creation orchestration.
- Cloud service: project membership, number reservation, acknowledgement, and header projection.
- Database: per-project counters, reservations, projections, idempotency, membership, and audit.
- Authentication: browser, interactive CLI/MCP, and service-token clients.
- Frontend: cloud-bound state and polling-based teammate header visibility.
- Configuration and documentation: opt-in project binding, setup, recovery, and operations.

### Scope

- In scope:
  - Opt-in cloud binding for a project.
  - Cloudflare Access validation for human and machine principals.
  - Project-scoped membership and contributor/viewer authorization.
  - Collision-free D1 ticket-number reservation with idempotent replay.
  - Recoverable local Markdown creation followed by acknowledgement.
  - One-way, versioned Markdown-to-cloud header projection.
  - Polling-based teammate visibility on the existing board.
  - Audit, rate limiting, observability, backup, restore, and disable paths required for the first slice.
  - Durable user, configuration, integration, and operations documentation.
- Out of scope:
  - Teammate presence or activity indicators.
  - Offline allocation, temporary local keys, or automatic ticket renaming.
  - Durable Objects, WebSockets, and cross-instance realtime fan-out.
  - Cloud editing of ticket bodies or cloud-authoritative header fields.
  - Jira-style comments, workflow administration, notifications, or reporting.

### V1 Product Decisions

#### Ticket Creation Requires the Cloud

A cloud-bound project may read and edit existing Markdown tickets while
offline, but creating a ticket requires a live cloud coordinator. If allocation
is unavailable, creation stops with a recoverable error and never assigns a
local fallback number, temporary key, offline range, or lease.

This clarifies the existing outage contract; it does not add an offline
reconciliation design. Online creation still requires the counter,
reservations, idempotency key and request hash, acknowledgement state,
membership, and audit data because concurrent requests, retries, and a local
write failure remain possible.

#### Header Projection Remains in V1

The first slice retains cloud header projection because teammate visibility
before Git synchronization is an explicit product outcome. Therefore
`ticket_projections`, projection and project revisions, operation and content
hashes, tombstones, and polling remain in scope. They protect stale online
clients and derived cloud visibility; they are not support for offline ticket
creation.

## 2. Desired Outcome

### Success Conditions

- Two or more teammates can create tickets for one cloud-bound project without receiving duplicate numbers.
- Retrying one create intent returns the original reservation and does not advance the counter twice.
- A failed local file write leaves a recoverable reservation that can be retried and acknowledged.
- Local-only projects behave exactly as they do before this feature.
- Markdown/Git remains authoritative for title, status, type, priority, and assignee.
- Authorized teammates can see projected headers and status changes within the configured polling interval.
- Human operations are audited as human identities and automation as machine identities.
- Disabling cloud binding leaves all durable ticket content usable from Markdown/Git.

### Constraints

- Depends on `MDT-199` and must implement its approved architecture and documentation contracts.
- Must preserve the shared-service business-logic boundary; CLI and MCP remain presentation adapters.
- Must use the static D1 batch shape proven by MDT-198 or an equivalently verified design approved in MDT-199.
- Must not infer project identity, membership, or ticket ownership from Git branches or worktrees.
- Must not fall back to local numbering for a cloud-bound project when coordination is unavailable.
- Must keep cloud adoption opt-in per project.

### Non-Goals

- No generic SaaS issue-tracking platform.
- No second canonical source for ticket content.
- No first-slice optimization for unmeasured high-scale or sub-second delivery requirements.

## 3. Architecture Gate

MDT-199 resolves the architecture gate. Implementation must follow:

- [`docs/CRs/MDT-199/architecture.md`](MDT-199/architecture.md)
- [`docs/architecture/cloud-sync/README.md`](../architecture/cloud-sync/README.md)
- [`identity-and-access.md`](../architecture/cloud-sync/identity-and-access.md)
- [`data-and-consistency.md`](../architecture/cloud-sync/data-and-consistency.md)
- [`operations.md`](../architecture/cloud-sync/operations.md)
- [`cloud-package-boundary.md`](MDT-200/cloud-package-boundary.md)

| Area | Approved decision |
|---|---|
| Service boundary | Add one Cloudflare Worker workspace at `cloud/`; keep its runtime implementation under `cloud/src/cloudflare/`; share only pure contracts through `domain-contracts` |
| Identity | Two Access audiences; Worker JWT validation; email human and `common_name` machine principals; D1 project roles |
| Data | One D1 database per environment; static transactional allocation batch; monotonic non-reuse; versioned projection and tombstones |
| Integration | `shared/services/cloud-sync/` owns strategy, journal recovery, projection, and polling; all transports remain thin |
| Configuration | MDT-201 device-local `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`; repository `[project.cloudSync]` is migration input only; credentials stay in credential providers |
| Delivery | Polling defaults to 15 seconds; real Access, deployed concurrency, migration, restore, and rollback gates are mandatory |

### Known Constraints

- Cloud owns membership and per-project ticket-number allocation.
- Markdown/Git owns ticket bodies and projected header fields.
- Presence and offline allocation are deferred.
- Permanent architecture documentation lives under `docs/architecture/cloud-sync/`.

### Deployment Inputs

Cloudflare account IDs, custom hostnames, Access audience values, D1 IDs,
rate-limit namespace IDs, IdP groups, and production service-token owners are
environment inputs. They do not reopen the approved architecture.

MDT-199 received User Review approval after its completed architecture package
was independently reconciled. MDT-200 is `In Progress` and owns all
requirements, BDD, test, task, implementation, and runtime trace work.

## 4. Acceptance Criteria

Historical first-slice checks below do not accept the October deployment or
incident repair. The current same-round status is recorded in Section8 and
[verification.md](MDT-200/verification.md).

### Allocation and Recovery

- [x] Concurrent create requests for one project return unique ticket numbers with no duplicate ticket rows.
- [x] Concurrent requests sharing one idempotency key return one stable reservation and advance the counter once.
- [x] Different cloud projects allocate independently.
- [x] Failed local creation can retry the same reservation and acknowledge it without number reuse.
- [x] A cloud-bound create fails recoverably when the coordination service is unavailable; it does not allocate locally.
- [x] Existing Markdown tickets remain readable and editable during an outage while new cloud-bound ticket creation remains blocked.
- [x] Local-only project creation remains backward compatible.

### Identity and Isolation

- [x] A real Access-protected environment validates browser and interactive CLI human attribution.
- [ ] A real Access-protected environment validates service-token machine attribution. _(Live drill deferred to [MDT-224](MDT-224-verify-service-token-machine-attribution.md); JWT machine-principal derivation is unit-tested and deployed, but the live service-token request and audit record have not been run.)_
- [x] Viewer, contributor, and owner permissions are enforced per cloud project.
- [x] Unauthorized project references do not disclose project existence.
- [x] Revoked membership blocks the next protected project operation.

### Projection and Board

- [x] Acknowledged tickets expose only the approved header projection, not ticket bodies.
- [x] Stale projection writes are rejected through version/precondition semantics.
- [x] Another authorized client sees projected create and status changes within the configured polling interval.
- [x] The board distinguishes cloud-projected state from canonical local ticket state without implying teammate ownership.

### Operations and Documentation

- [x] Allocation, projection, membership, denial, and recovery actions produce structured audit records.
- [x] Rate limits and failure telemetry cover runaway clients and abandoned reservations.
- [ ] Backup, restore, export, disable, and vendor-exit procedures are exercised. _(Deferred to [MDT-222](MDT-222-exercise-cloud-sync-operational-drills.md); procedures are documented under `cloud/test/operations/` but the live drills have not been run and recorded.)_
- [x] `docs/CONFIG_SPECIFICATION.md` documents cloud binding and exposure rules.
- [x] `docs/CLOUD_COORDINATION_GUIDE.md` documents setup, onboarding, credentials, recovery, and disablement.
- [x] MCP, CLI, and server architecture documentation is reconciled wherever behavior or ownership changes.
- [x] Permanent architecture documentation under `docs/architecture/cloud-sync/` matches implemented behavior.

## 5. Verification

### Automated

- D1 integration tests cover concurrency, idempotency, project isolation, rollback, version conflicts, and reservation recovery.
- Shared-service tests cover local strategy preservation and cloud strategy failure behavior.
- Authorization tests cover roles, tenant isolation, revocation, and human/machine audit attribution.
- Frontend tests cover projection polling, stale state, cloud/local distinction, and degraded behavior.
- End-to-end tests exercise two independent clients against one cloud-bound project.

### Runtime

- Validate both human and service-token flows against an actual Access-protected Worker.
- Run the approved concurrency scenario against the deployment candidate and record D1 query/write evidence.
- Exercise export-before-restore, restore, cloud-binding disablement, and local Markdown continuity.

### Documentation

- Render all Mermaid diagrams.
- Run project Markdown lint on every changed durable document.
- Reconcile requirements, architecture, tests, tasks, implementation, runtime behavior, and owner docs before closure.

## 8. Clarifications

### UAT Session 2026-07-25

Post-implementation review found the cloud coordination service (Worker + D1)
deployed and proven in isolation, but several acceptance criteria were met only
by isolated tests, not through the real application path. Treated as a
same-ticket spec delta; no requirement meaning changed.

**Approved changes**:

- Refined in place: `BR-1.5` (no-fallback through `TicketService.createCR`),
  `BR-1.7` (local-only with seam wired in), `BR-3.3` (polling end-to-end).
- Added 7 focused execution tasks: `TASK-app-strategy-wiring`,
  `TASK-cloud-client`, `TASK-ack-projection-wiring`, `TASK-ratelimit-wiring`,
  `TASK-board-projection`, `TASK-config-inspection-registry`,
  `TASK-concurrency-real-proof`.
- Fixed drift: unmasked `cloud` test script exit code; fixed domain-contracts
  lint; corrected stale "migrations not applied" note.

**Changed requirement IDs**: BR-1.5, BR-1.7, BR-3.3 (refined in place).

**Updated workflow documents**: `uat.md` (current-round brief), `requirements.md`
trace projection, `tasks.md` trace projection.

**`uat.md` written**: yes.
**Strict drift/lock used**: no (non-blocking validation; requirements re-rendered).

### UAT Session 2026-10-24 — ticket-key collision stabilization

User approved same-ticket UAT and a focused PoC after the October24 collision
investigation. Supported adapters already share create orchestration; the defect
is stale allocation versus externally assigned keys plus filename-only write
protection. The watcher follow-up is accepted: an observed file must not claim a
number already reserved for another creation or treat unavailable evidence as
proof that the number is free.

**Approved changes**:

- Refine BR-1.1 and BR-1.4 for key-wide collision protection and identity-aware
  recovery; align BR-1.7 with CONFIG_DIR connection semantics.
- Add journaled coordinator-enforced minimum allocation, durable non-secret
  creationId, server-verified immutable allocation inputs, safe manual-file
  classification, ambiguous-key adapter rejection, and audited incident repair.
- Preserve files and cloud allocation history; no automatic watcher allocation,
  acknowledgement, publishing, deletion, or renumbering. Full import CLI and
  commit enforcement remain follow-up work, not promised here.
- PoC: max-only patch fails; guarded candidate passes isolated differing-floor,
  operator-advance, replay, and rollback checks. Current watcher loses slugged
  path identity. Production implementation/live verification remain pending.
- Archive earlier UAT briefs/evidence in `MDT-200/uat-history-2026-07.md`; replace
  `uat.md` with this current round. Prior ticket clarification history remains.

**Changed requirement IDs**: refined BR-1.1, BR-1.4, BR-1.7; added BR-1.8,
BR-1.9, BR-1.10, BR-4.3, C9, C10, C11, Edge-7, Edge-8, Edge-9.

**Updated workflow documents**: requirements.md, bdd.md, architecture.md,
tests.md, tasks.md, uat.md; added poc.md and collision-investigation.md.

**Execution tasks**: TASK-uat-allocation-identity,
TASK-uat-observation-conflicts, TASK-uat-operator-reconciliation (pending).
Existing TASK-projection receives the already-registered deletion regression to
resolve the baseline MISSING_TASK_CLOSURE; no unrelated requirement is changed.

**`uat.md` written**: yes. **Strict drift/lock used**: no; no approval baseline
was minted. **Trace validation**: all five stages validated and rendered in
order; `spec-trace validate MDT-200 --stage all --format json` passed with zero
issues. This is structural trace validation, not implementation acceptance.
**Production changes**: none; live counter/claim/projection inspection and repair
remain explicitly separate execution.


#### Review follow-up 2026-10-25 — within the October24 UAT round

The user approved following the same documentation/trace procedure after the
corrected GLM adversarial review. This is technical-review closure, not another
UAT acceptance session or a new feature ticket. No requirement ID, kind, route
or approved meaning changes.

**Remaining fixes**: explicit shared creation inspection/resume/reviewed journal
resolution and a shipped owner-only adapter; consistent canonical project-code
identity; actionable fail-closed inventory errors; stable bounded claim evidence
with safe invalidation. PID reuse needs inspectable safe ownership handling;
the zombie subcase is unproven. F6 authorization-bypass claim is retracted.
Original same-intent create recovery across processes already works.

**Workflow updates**: verification.md stores corrected verdict/evidence;
requirements.md maps gaps to existing IDs; bdd.md, architecture.md, tests.md and
tasks.md define pending closure; uat.md is refreshed as the current execution
brief. Reopen TASK-uat-allocation-identity and TASK-uat-observation-conflicts;
retain TASK-uat-operator-reconciliation and its unexecuted production gate.
Canonical trace gains review scenarios/test plans and planned recovery artifacts,
without removing prior targets or TASK-projection's deletion regression.

**`uat.md` updated**: yes. **Strict drift/lock**: unchanged, no new approval
baseline. **Validation**: all five stages validated and rendered in order; final all-stage
non-strict validation passed with zero issues. Seven scenarios, three planned
artifacts, three obligations and eight test plans were added; three existing task
records were updated without removing prior targets. Trace validation proves
coverage structure, not that the pending fixes are complete.
No source fix, deployment, ticket allocation or production repair occurs in
this documentation/trace follow-up.

#### Implementation and documentation closure 2026-10-26 — same UAT round

Allocation/recovery and observation/diagnostic tasks A/B are locally complete;
independent completion review passed with no in-scope issues. Focused acceptance
recorded 912 tests, five package builds, scoped lint and non-strict trace validation.
The terminal-journal bypass found during review is regression-locked: acknowledged
entries require verified terminal reconciliation and preserve their evidence.

Requirements/scenario IDs and meanings are unchanged. Current workflow docs
and cloud-sync rule, operations, user/MCP/server guides are aligned. Canonical
trace also registers the already-implemented actual HTTP→shared recovery test;
TASK-projection retains TEST-projection-sync-deletion. No requirements lock
was created. This documentation pass is not another UAT session or test run.

Task C remains open: production migration/deployment compatibility, reviewed
reservation/identity/projection/counter repair and live multi-client acceptance.
Full-suite/CLI baseline failures remain release gates; machine-attribution and
operational drills remain with MDT-224/MDT-222. MDT-200 stays In Progress.
See [verification.md](MDT-200/verification.md) for evidence, review limits and
residual manual-review states. No commit, deployment or production mutation
was performed by this follow-up.
