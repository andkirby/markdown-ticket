---
code: MDT-199
status: Implemented
dateCreated: 2026-07-24T09:15:41.695Z
type: Architecture
priority: High
dependsOn: MDT-198
---

# Define cloud sync coordination architecture

## 1. Description

### Requirements Scope

`none`

### Problem

- `docs/CRs/MDT-198/research.md` proves the reduced-scope direction but is a research record, not the permanent architecture owner.
- The repository has no canonical architecture namespace for cloud project binding, centralized ticket allocation, team identity, or header projection.
- `shared/services/TicketService.ts` has the allocation seam, while current authentication and project-identity owner documents describe local single-owner behavior.

### Affected Artifacts

- `docs/architecture/cloud-sync/` — permanent cloud-sync architecture namespace.
- `docs/architecture/auth-and-sharing-architecture.md` — local authentication boundary and cloud-team identity cross-reference.
- `docs/architecture/project-identity-and-worktrees.md` — local checkout identity and cloud project UUID boundary.
- `docs/CRs/MDT-198/research.md` and `docs/CRs/MDT-198/poc.md` — source evidence.
- `shared/services/TicketService.ts`, `domain-contracts/`, `server/`, `mcp-server/`, `cli/`, and `src/` — integration boundaries to design.

### Scope

- Changes:
  - Define the target Workers, D1, and Cloudflare Access architecture.
  - Define project binding, membership, roles, allocation, acknowledgement, projection, recovery, and audit contracts.
  - Define the production package boundary and deployment topology.
  - Define the phased delivery plan for the dependent Feature CR.
  - Create and reconcile permanent owner documentation under `docs/architecture/cloud-sync/`.
- Unchanged:
  - Markdown/Git remains authoritative for ticket bodies and projected headers.
  - Local-only projects retain current numbering and creation behavior.
  - Presence, offline allocation, full ticket-body sync, and Durable Objects remain out of scope.

## 2. Decision

### Chosen Approach

Use an opt-in Workers plus D1 coordination service protected by Cloudflare Access.

### Rationale

- MDT-198's local D1-binding POC passed 50 concurrent unique allocations and 10 concurrent idempotent replays.
- D1 owns per-project allocation and the derived header projection; Markdown/Git owns content.
- Cloudflare Access distinguishes human identities from service-token machine identities.
- Polling satisfies first-slice visibility without introducing a realtime stateful subsystem.
- Cloud-bound creation requires connectivity; no local fallback number can collide with the cloud sequence.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|---|---|---|
| Workers + D1 + Access | Central allocation, derived projection, opt-in binding | **ACCEPTED** — matches MDT-198 evidence and scope |
| Durable Object baseline | Per-project stateful actor and realtime channel | No approved presence or stateful-coordination requirement |
| Cloud-authoritative headers | Cloud writes canonical ticket metadata | Conflicts with Markdown/Git authority and increases drift |
| Git-only coordination | Allocate through repository synchronization | Does not prevent pre-push cross-clone collisions |
| Offline local allocation with rename | Create locally and reconcile keys later | Deferred due rename and reference-rewrite complexity |

## 4. Durable Documentation Contract

### New Owner Documents

| Artifact | Purpose |
|---|---|
| `docs/architecture/cloud-sync/README.md` | Canonical overview, system context, component boundaries, decisions, and phased plan |
| `docs/architecture/cloud-sync/identity-and-access.md` | Access handshake, membership, roles, human/machine attribution, revocation |
| `docs/architecture/cloud-sync/data-and-consistency.md` | D1 schema, static allocation batch, idempotency, versioning, lifecycle |
| `docs/architecture/cloud-sync/operations.md` | Deployment, observability, rate limits, backup, recovery, retention, vendor exit |

### Modified Owner Documents

| Artifact | Required reconciliation |
|---|---|
| `docs/architecture/auth-and-sharing-architecture.md` | Preserve local single-owner model and link to cloud team identity architecture |
| `docs/architecture/project-identity-and-worktrees.md` | Separate canonical checkout identity from stable cloud project UUID binding |

### Implementation Documentation Required by the Feature CR

| Artifact | Required outcome |
|---|---|
| `docs/CONFIG_SPECIFICATION.md` | Cloud-binding configuration and exposure rules |
| `docs/CLOUD_COORDINATION_GUIDE.md` | Setup, onboarding, credentials, recovery, and disabling cloud sync |
| `docs/MCP_SERVER_GUIDE.md` and CLI guidance | Cloud-bound creation and failure behavior |
| `server/docs/ARCHITECTURE.md` | Update only if the local server gains synchronization ownership |

## 5. General Delivery Plan

| Phase | Outcome | Gate |
|---|---|---|
| A. Access validation | Human and service-token requests reach a protected Worker with correct attribution | Real Access environment test passes |
| B. Coordination core | D1 migrations, project membership, static allocation batch, reservation and acknowledgement APIs | Concurrency, replay, isolation, and failure tests pass |
| C. Local integration | Shared allocator seam supports local and cloud strategies without CLI/MCP duplication | Existing local behavior remains green; cloud create is recoverable |
| D. Projection visibility | Versioned Markdown-to-cloud header projection and polling read path | Two clients observe status/header changes within configured polling interval |
| E. Operations and rollout | Opt-in configuration, audit, monitoring, backup, restore, and disable path | Runbook and rollback verification pass |

## 6. Acceptance Criteria

### Architecture

- [x] `docs/architecture/cloud-sync/README.md` defines system context, containers, components, trust boundaries, and delivery phases.
- [x] Identity, data consistency, and operations owner documents exist and contain no unresolved ownership conflicts.
- [x] D1 schema and static prepared-statement allocation batch preserve per-project uniqueness and idempotent replay.
- [x] API contracts define reservation, acknowledgement, projection, membership, error, and precondition semantics.
- [x] Human and machine Access flows define validation, attribution, expiry, revocation, and secret handling.
- [x] Local project identity and cloud project UUID binding remain explicitly separate.
- [x] The shared-service integration seam keeps CLI, MCP, server, and frontend consumers free of duplicated ticket business logic.
- [x] The dependent Feature CR is reconciled with the approved architecture before implementation.

### Verification

- [x] Mermaid diagrams render successfully.
- [x] Modified Markdown passes project Markdown lint.
- [x] Architecture claims are checked against current code and current official Cloudflare documentation.
- [x] No production behavior is claimed until the Feature CR implements and validates it.

## 7. Deployment

- Architecture-only CR; no production deployment.
- Production rollout and rollback contracts are outputs consumed by the dependent Feature CR.
