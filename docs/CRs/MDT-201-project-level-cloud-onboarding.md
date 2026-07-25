---
code: MDT-201
status: Proposed
dateCreated: 2026-07-24T17:06:27.601Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-200,MDT-202,MDT-203
dependsOn: MDT-200
---

# Establish project-level cloud onboarding

## 1. Description

### Requirements Scope

`full`

### Problem

- Cloud sync must be established once for a project, not provisioned independently on every device or clone.
- The existing architecture separates project binding from device-local credentials and recovery state, but the user-facing activation and teammate-join contract is not explicit.
- An implementation could incorrectly treat a device login, local journal, origin allowlist, or local registry entry as cloud project identity.
- Teammates need a defined way to join the same cloud project without sharing passwords, Access tokens, or machine credentials.

### Affected Areas

- Project configuration and shared cloud orchestration: `shared/`
- Cloud project membership and coordination API: planned `cloud/`
- Owner and teammate workflow integration: `server/` and reusable contracts
- Machine-client membership and credentials: `mcp-server/`
- Setup, onboarding, configuration, and security guidance: `docs/`

### Scope

- In scope:
  - project-level cloud activation and stable binding across clones and devices;
  - owner-managed human and machine membership with project roles;
  - teammate authentication and first-use onboarding;
  - multi-device access by the same project member;
  - separation of project identity from device-local credentials, sessions, journals, locks, and caches;
  - project-wide revocation and offboarding behavior;
  - a reusable project-management service/API consumed by presentation adapters;
  - safe service-origin trust without redefining or manually re-enabling the cloud project per device.
- Out of scope:
  - CLI argument parsing, rendering, command help, and CLI E2E coverage, which belong to MDT-202;
  - a browser Project Settings UI in V1;
  - granting or automating Git repository access;
  - shared project passwords, reusable join secrets, or copied human tokens;
  - offline ticket creation, teammate presence, comments, or ticket-body sync;
  - changing Markdown/Git authority for canonical ticket content.

## 2. Desired Outcome

### Success Conditions

- A cloud project is provisioned once and has one stable cloud project UUID, membership set, number counter, and projection namespace.
- Every clone or device opening the bound project resolves the same cloud project without creating another cloud project.
- An owner adds a teammate once at project scope; the teammate may use the project from multiple devices after authenticating as the same human principal.
- Human credentials and sessions remain personal and device-local; they are never copied into project configuration or Git.
- Machine credentials remain runtime secrets while machine membership remains project-scoped.
- Device-local journals, locks, and caches recover operations but never grant membership or establish project identity.
- Removing a member denies that principal from every device on the next protected project operation.
- Separate projects on the same device retain independent bindings, memberships, counters, and projections.
- A supported adapter can activate, inspect, manage, and disable a project
  through one shared management contract without reimplementing lifecycle rules.

### Constraints

- Preserve Cloudflare Access authentication plus cloud-owned project membership authorization.
- Preserve the non-secret project binding and stable cloud project UUID approved by MDT-199.
- Preserve per-device secret storage and operation recovery where technically necessary.
- Do not store human tokens, service-token secrets, JWTs, or shared credentials in project files or the project registry.
- Do not make local path, worktree, branch, device, or clone identity authoritative for cloud membership.
- Local-only projects must retain current behavior.
- Cloud-bound ticket creation continues to require the live coordinator.
- The effective trusted-origin set combines distribution-provided service
  origins with operator-configured extensions; arbitrary repository-provided
  origins remain denied.

### Non-Goals

- No anonymous project discovery or self-service membership escalation.
- No reusable invite credential that grants project access by itself.
- No requirement that all devices share one authentication session or recovery journal.
- No replacement for Git-host permissions or repository onboarding.

## 3. Delivery Ownership

- MDT-201 depends on MDT-200's core coordination API, identity, membership, and
  binding capabilities.
- MDT-201 owns the downstream project-level lifecycle workflow, management
  contracts, reusable orchestration, binding persistence rules, and onboarding
  guidance.
- MDT-202 owns the thin `mdt cloud` CLI adapter, command UX, help, exit codes,
  and CLI-specific tests over MDT-201's management service.
- MDT-201 and MDT-202 do not gate MDT-200; they turn its core capabilities into
  the supported project-management CLI journey.
- MDT-203 owns the browser Project Settings surface and consumes this reusable
  lifecycle contract after MDT-202 proves the CLI journey.

### Decisions

| Area | Decision |
| --- | --- |
| First owner surface | V1 ships the CLI defined by MDT-202; MDT-203 follows with browser Project Settings |
| Binding distribution | The non-secret `[project.cloudSync]` binding is repository-controlled and resolves the same cloud project in every clone |
| Origin trust | Official distributions provide trusted service origins; operators may add exact HTTPS origins for self-hosted/custom services |
| Adapter boundary | Shared services own readiness, provisioning, membership, binding, diagnostics, and disable semantics; adapters only parse and render |
| Provisioning authority | Initial project provisioning requires the operator Access audience; a project owner role alone cannot bootstrap a cloud project |
| Teammate first use | A teammate authenticates against the coordination service through `mdt cloud login` or the first protected command, then the service verifies existing project membership |
| Service endpoints | The project binding stores only the coordination origin; the provisioning origin comes from a trusted distribution/operator service profile, never repository data |

### Open Questions

| Area | Question | Constraints |
| --- | --- | --- |
| Git boundary | How does onboarding explain that cloud membership and Git repository access are separate requirements? | MDT does not provision Git-host permissions |
| Machines | How are named machine members added and secrets installed on multiple runtimes? | Membership is project-scoped; secrets remain runtime-local and expiring |

### Known Constraints

- Cloud project UUID and membership are project-scoped authorities.
- Human identity is the verified Access principal, not a device identifier.
- Device-local recovery state may exist but cannot affect authorization or the allocation namespace.
- Owner-managed membership must preserve final-owner and role-escalation protections.
- Unknown projects and non-members must retain non-disclosing failure behavior.

### Decisions Deferred

- Browser Project Settings design and delivery details are owned by MDT-203.
- Exact interactive authentication UX inside the MDT-202 CLI contract.
- Distribution and update mechanism for the product-controlled trusted-origin set.
- Implementation artifacts and task breakdown.

## 4. Acceptance Criteria

### Functional

- [ ] Provisioning a project from one device allows another legitimate clone to resolve the same cloud project UUID without provisioning again.
- [ ] Initial provisioning succeeds only for a human admitted by the operator
  Access policy; a project owner who is not an operator receives a clear denial.
- [ ] Adding one human member grants that verified principal the assigned project role from multiple devices.
- [ ] A teammate joins through personal Access authentication without entering a shared project password or copied token.
- [ ] Project configuration shared across clones contains only non-secret binding data.
- [ ] Device-local credentials, sessions, journals, locks, and caches do not create projects, grant roles, or define cloud project identity.
- [ ] Revoking one project membership blocks the principal from that project across all devices on the next protected operation.
- [ ] Revocation from one project does not remove the same principal from other projects.
- [ ] A new or replacement device can use an existing project membership after authentication without counter, membership, or projection migration.
- [ ] Machine members use project-scoped roles while each runtime receives its own securely installed credentials.
- [ ] Git repository access remains a separately documented prerequisite for canonical Markdown collaboration.
- [ ] The shipped trusted service origin works from a new clone without
  project reprovisioning or a per-device cloud-enable step.
- [ ] Repository configuration cannot select or redirect the privileged
  provisioning endpoint; it comes from the effective trusted service profile.
- [ ] Readiness, provisioning, membership, binding, diagnostics, and disable
  behavior are exposed through one reusable service/API with no presentation
  logic.

### Non-Functional

- [ ] No cloud credential or reusable join secret is persisted in repository-controlled files, browser storage, logs, or project registry data.
- [ ] Project and membership lookups preserve tenant isolation and non-disclosure behavior.
- [ ] Local-only project creation and existing-ticket editing remain backward compatible.

### Edge Cases

- A user authenticates successfully through Access but is not a member of the project.
- The same user opens the project from two devices concurrently.
- A device is lost while its user remains a valid project member.
- A project member is revoked while another device still has a valid Access session.
- A cloned repository contains a valid project UUID but an untrusted or changed service origin.
- One device opens multiple cloud-bound projects with different memberships.
- A teammate has cloud membership but lacks Git repository access.

## 5. Verification

### How to Verify Success

- Automated integration tests exercise two independent clients resolving one project binding without duplicate provisioning.
- Authorization tests exercise one human principal across multiple device sessions and multiple projects.
- Revocation tests prove the next protected operation fails on every device without relying on local cache expiry.
- Configuration inspection proves project files contain only non-secret binding data and device-local state is non-authoritative.
- End-to-end onboarding verifies owner membership management, teammate Access login, first project operation, and offboarding.
- MDT-202 CLI verification proves the adapter delegates lifecycle behavior to
  the MDT-201 management contract rather than duplicating it.
- Documentation review verifies that cloud membership and Git repository access are presented as separate steps.
