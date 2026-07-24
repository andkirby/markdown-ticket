# Assessment: MDT-199

## Verdict

**Recommendation**: Option 2 — Redesign Inline

The approved cloud-sync direction fits the product and repository, but not as a
local extension of the existing single-process runtime. MDT-199 must define a
bounded cloud coordination subsystem and a narrow shared-service integration
seam before MDT-200 can implement it. The existing ticket scope already names
that redesign, so no scope expansion is required.

## Feature Pressure

### Target Feature Needs

- One stable cloud project UUID shared by clones, independent of local checkout
  identity and ticket worktree routing.
- Cloud-owned membership and monotonic per-project number allocation.
- Markdown-owned ticket bodies and header fields projected one way to a
  versioned cloud mirror.
- Human and machine Access identities with project-scoped roles and audit
  attribution.
- Recoverable reservation, acknowledgement, projection, polling, and
  operational workflows.
- An independently deployable Worker and D1 schema without duplicating ticket
  business rules.

### Current System Assumptions

- `TicketService.createCR()` scans locally visible ticket files, allocates
  `highest + 1`, then writes with `fs.outputFile()`; allocation and persistence
  are not atomic across processes or clones.
- Browser, REST, CLI, stdio MCP, and HTTP MCP ultimately delegate creation to
  the shared `TicketService`, which is the correct business-logic owner.
- Project identity is local configuration plus registry state and can fall back
  to a directory name; documented Git-common-dir canonicalization is not yet
  implemented.
- Backend/browser auth represents an owner, read-only visitors, or local
  no-auth development. MCP HTTP uses a separate optional bearer token; stdio
  trusts the local process.
- Local file watching and SSE provide process-local visibility. The board has
  no cloud projection model.

## Fitness Summary

| Dimension | Verdict | Why |
|---|---|---|
| Structural Fit | Concerning | The shared service is the right entry point, but cloud identity, allocation, projection, and operations need their own bounded subsystem. |
| Extension Fit | Healthy | All current creation adapters already converge on `shared/services/TicketService.ts`. |
| Dependency Fit | Concerning | MDT-200 will add a Worker package, Wrangler workflow, D1 migrations, Access configuration, and cloud credentials. |
| Verification Fit | Concerning | Local allocation and Access-facing contracts need preservation and deployed validation gates; MDT-198 proves only the local D1 batch shape. |
| Redesign Scope | Healthy | The redesign is bounded to an allocator/projection seam plus a new cloud service; no foundational rewrite is needed. |

## Mismatch Points

### Shared ticket creation

- Current system assumes: local file scanning can select the next number.
- Feature needs: a project-selected allocator that can reserve centrally and
  recover after a local write failure.
- Mismatch: `createCR()` owns both number selection and file creation, with no
  injected strategy or durable pending-reservation boundary.
- Adjustment required: define `NumberAllocator` and acknowledgement/recovery
  ports owned by shared ticket orchestration; preserve local scanning as the
  default strategy.
- Scope: bounded.

### Project identity and configuration

- Current system assumes: local `project.id`, path, code, and registry entries
  identify a project on one machine.
- Feature needs: a stable non-secret cloud UUID that binds independent clones
  while leaving checkout/worktree identity unchanged.
- Mismatch: neither the local config contract nor the registry has a cloud
  binding model, and path identity is unsuitable for tenant authorization.
- Adjustment required: define a file-only project binding with cloud UUID,
  service origin, and enablement state; keep credentials in OS/deployment
  secret channels rather than project TOML.
- Scope: bounded.

### Identity and authorization

- Current system assumes: one local owner/admin credential, scoped read-only
  sharing, trusted stdio, or one MCP HTTP bearer token.
- Feature needs: Access-validated human and machine principals plus per-project
  owner, contributor, and viewer membership.
- Mismatch: current local auth principals cannot represent cloud team identity
  and must not be reused as cloud membership.
- Adjustment required: create a separate Worker trust boundary that validates
  Access assertions and checks D1 membership on every project operation.
- Scope: bounded.

### Projection and board state

- Current system assumes: the board renders canonical local tickets and receives
  local file-change events through process-local SSE.
- Feature needs: a read-only, versioned cloud header projection visible before
  Git synchronization.
- Mismatch: merging remote projections into canonical local tickets would blur
  authority and could present derived state as local content.
- Adjustment required: define a projection DTO and merge boundary that marks
  remote-only or stale mirror rows explicitly and never writes them into
  Markdown.
- Scope: bounded.

### Deployment and operations

- Current system assumes: frontend, Express backend, and MCP are local/container
  runtimes with filesystem access.
- Feature needs: an independently deployed Worker with D1, Access, migrations,
  observability, backup, restore, and rollback.
- Mismatch: no current package owns cloud resources or their lifecycle.
- Adjustment required: add a dedicated `cloud-sync-worker/` workspace in
  MDT-200, with its own Wrangler configuration, migrations, contracts, and
  deployment gates.
- Scope: bounded.

## Dependency and Tooling Pressure

- New packages: Worker runtime dependencies and a vetted JWT/JWKS verification
  path; exact dependency choice belongs to MDT-200 after architecture approval.
- Runtime/config impact: Worker, D1, Access application, Wrangler environments,
  non-secret project binding, local credential adapters, and deployment secrets.
- Testing/E2E impact: D1 integration tests, shared allocator preservation tests,
  Access-protected runtime validation, two-client projection tests, migration
  tests, and operational restore/export drills.
- Main risk introduced: a cloud-bound create may reserve a permanent number
  before local persistence. Recovery and idempotency must be explicit so the
  system never silently falls back to local allocation or reuses a number.

## Verification Gaps

- Preservation tests needed:
  - local-only creation remains unchanged;
  - every creation adapter still delegates through the shared service;
  - cloud-bound outage fails recoverably without local fallback;
  - a repeated create intent reuses one reservation;
  - projection merge never mutates Markdown authority.
- E2E/contract drift risks:
  - Access browser, interactive CLI/MCP, and service-token handshakes;
  - generic tenant denial and membership revocation;
  - D1 migration and static batch behavior in a deployment candidate;
  - board distinction between canonical local and derived cloud state;
  - stale projections, abandoned reservations, and disablement.
- Safe-to-refactor now?: Yes, after MDT-199 fixes the ports, ownership,
  configuration, API, data, and verification contracts. Production work remains
  blocked on real Access validation.

## Recommendation

### Option 1: Integrate As-Is

Use when: rejected because the current shared service has no allocator,
acknowledgement, projection, or cloud-binding seam.

Architecture impact: would scatter cloud branching across adapters and blur
authority.

### Option 2: Redesign Inline

Use when: selected because the mismatches are real but localized around shared
ticket orchestration and a new independently deployed cloud subsystem.

Architecture must redesign: allocator/projection ports, cloud identity binding,
Worker/D1 ownership, Access principal mapping, projection merge semantics, and
operational lifecycle.

Expected scope added: none. MDT-199 already owns this architecture-only redesign
and MDT-200 already owns implementation.

### Option 3: Redesign First

Use when: not required because current adapters already converge on shared
services and existing local behavior can remain the default strategy.

Reason redesign cannot wait: not applicable.

Preferred path: continue to the MDT-199 architecture milestone after canonical
constraint bootstrap.
