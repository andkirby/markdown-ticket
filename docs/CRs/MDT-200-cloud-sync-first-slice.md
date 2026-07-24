---
code: MDT-200
status: Proposed
dateCreated: 2026-07-24T09:16:41.530Z
type: Feature Enhancement
priority: High
dependsOn: MDT-199
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

| Area | Approved decision |
|---|---|
| Service boundary | Add `cloud-sync-worker/` as one deployable root workspace; share only pure contracts through `domain-contracts` |
| Identity | Two Access audiences; Worker JWT validation; email human and `common_name` machine principals; D1 project roles |
| Data | One D1 database per environment; static transactional allocation batch; monotonic non-reuse; versioned projection and tombstones |
| Integration | `shared/services/cloud-sync/` owns strategy, journal recovery, projection, and polling; all transports remain thin |
| Configuration | Non-secret `[project.cloudSync]` binding; credentials stay in interactive or backend secret providers |
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

MDT-200 remains `Proposed` until MDT-199 receives User Review approval. MDT-200
owns all requirements, BDD, test, task, implementation, and runtime trace work.

## 4. Acceptance Criteria

### Allocation and Recovery

- [ ] Concurrent create requests for one project return unique ticket numbers with no duplicate ticket rows.
- [ ] Concurrent requests sharing one idempotency key return one stable reservation and advance the counter once.
- [ ] Different cloud projects allocate independently.
- [ ] Failed local creation can retry the same reservation and acknowledge it without number reuse.
- [ ] A cloud-bound create fails recoverably when the coordination service is unavailable; it does not allocate locally.
- [ ] Local-only project creation remains backward compatible.

### Identity and Isolation

- [ ] A real Access-protected environment validates browser and interactive CLI human attribution.
- [ ] A real Access-protected environment validates service-token machine attribution.
- [ ] Viewer, contributor, and owner permissions are enforced per cloud project.
- [ ] Unauthorized project references do not disclose project existence.
- [ ] Revoked membership blocks the next protected project operation.

### Projection and Board

- [ ] Acknowledged tickets expose only the approved header projection, not ticket bodies.
- [ ] Stale projection writes are rejected through version/precondition semantics.
- [ ] Another authorized client sees projected create and status changes within the configured polling interval.
- [ ] The board distinguishes cloud-projected state from canonical local ticket state without implying teammate ownership.

### Operations and Documentation

- [ ] Allocation, projection, membership, denial, and recovery actions produce structured audit records.
- [ ] Rate limits and failure telemetry cover runaway clients and abandoned reservations.
- [ ] Backup, restore, export, disable, and vendor-exit procedures are exercised.
- [ ] `docs/CONFIG_SPECIFICATION.md` documents cloud binding and exposure rules.
- [ ] `docs/CLOUD_COORDINATION_GUIDE.md` documents setup, onboarding, credentials, recovery, and disablement.
- [ ] MCP, CLI, and server architecture documentation is reconciled wherever behavior or ownership changes.
- [ ] Permanent architecture documentation under `docs/architecture/cloud-sync/` matches implemented behavior.

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
