---
code: MDT-200
status: In Progress
dateCreated: 2026-07-24T09:16:41.530Z
type: Feature Enhancement
priority: High
dependsOn: MDT-199
relatedTickets: MDT-201,MDT-202,MDT-203
---

# Implement cloud sync first slice

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
| Configuration | Non-secret `[project.cloudSync]` binding plus global file-only `cloudSync.allowedOrigins`; credentials stay in interactive or backend secret providers |
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
- [ ] A real Access-protected environment validates service-token machine attribution.
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
