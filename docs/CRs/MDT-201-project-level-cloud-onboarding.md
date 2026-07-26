---
code: MDT-201
status: In Progress
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
- Repository-controlled `.mdt-config.toml` is unsuitable for cloud enablement,
  cloud project identifiers, or credentials in public and forkable repositories.
- The cloud project is project-scoped, while each installation keeps its own
  connection state and credentials under `CONFIG_DIR`.
- An implementation could incorrectly treat a device login, local journal, origin allowlist, or local registry entry as cloud project identity.
- Teammates need a defined way to join the same cloud project without sharing passwords, Access tokens, or machine credentials.

### Affected Areas

- CONFIG_DIR project state, credential storage, and shared cloud orchestration: `shared/`
- Idempotent project provisioning and membership API: `cloud/`
- Owner and teammate workflow integration: `server/` and reusable contracts
- Machine-client membership and credentials: `mcp-server/`
- Setup, onboarding, configuration, and security guidance: `docs/`

### Scope

- In scope:
  - project-level cloud activation and stable binding across clones and devices;
  - explicit `connect` of each installation or clone to an existing cloud
    project UUID without provisioning another project;
  - device-local enablement and connection state under
    `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`;
  - owner-managed human and machine membership with project roles;
  - teammate authentication and first-use onboarding;
  - multi-device access by the same project member;
  - separation of project identity from device-local credentials, sessions, journals, locks, and caches;
  - project-wide revocation and offboarding behavior;
  - a reusable project-management service/API consumed by presentation adapters;
  - safe service-origin trust without project reprovisioning; each installation
    still performs one explicit `connect`;
  - idempotent retries of the one initial provisioning operation;
  - owner-only CONFIG_DIR credential storage for machine runtimes;
  - explicit migration from the legacy repository `[project.cloudSync]`
    binding without silently dirtying the repository.
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
- Every clone or device connects explicitly to that UUID and never provisions
  implicitly while opening the repository.
- An owner adds a teammate once at project scope; the teammate may use the project from multiple devices after authenticating as the same human principal.
- Human credentials and sessions remain personal and device-local; MDT does not
  persist short-lived human Access tokens.
- Machine credentials remain per-runtime secrets in owner-only CONFIG_DIR files
  while machine membership remains project-scoped.
- Device-local journals, locks, and caches recover operations but never grant membership or establish project identity.
- Removing a member denies that principal from every device on the next protected project operation.
- Separate projects on the same device retain independent bindings, memberships, counters, and projections.
- Disabling a cloud-bound project retains a disabled connection record and
  blocks new ticket creation; absence of a connection record alone identifies a
  genuinely local-only project.
- A supported adapter can activate, inspect, manage, and disable a project
  through one shared management contract without reimplementing lifecycle rules.

### Constraints

- Preserve Cloudflare Access authentication plus cloud-owned project membership authorization.
- Preserve the stable cloud project UUID approved by MDT-199 while moving the
  local connection record out of repository-controlled configuration.
- Preserve per-device secret storage and operation recovery where technically necessary.
- Do not store cloud enablement, cloud project identifiers, human tokens,
  service-token secrets, JWTs, or shared credentials in project files or the
  project registry.
- Store machine credentials only under
  `CONFIG_DIR/cloud-sync/credentials/` with owner-only permissions and atomic
  writes; never log or expose their values.
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
- No automatic cloud-project discovery from public repository contents.
- No silent return to local numbering when a cloud connection is disabled.

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
| Connection storage | Cloud connection state is local to each installation under `CONFIG_DIR`; `.mdt-config.toml` contains no cloud enablement, project UUID, service origin, or credential |
| Clone onboarding | The owner shares the non-secret cloud project UUID separately; each clone uses `connect`, which verifies membership and never provisions |
| Origin trust | Official distributions provide trusted service origins; operators may add exact HTTPS origins for self-hosted/custom services |
| Adapter boundary | Shared services own readiness, provisioning, membership, connection state, diagnostics, and disable semantics; adapters only parse and render |
| Provisioning authority | Initial project provisioning requires the operator Access audience; a project owner role alone cannot bootstrap a cloud project |
| Provisioning retry | The client persists an idempotency key before the first request; the cloud returns the same project UUID for a matching retry and rejects key reuse with a different request |
| Teammate first use | A teammate authenticates against the coordination service through `mdt cloud login` or the first protected command, then the service verifies existing project membership |
| Credential storage | Human Access tokens remain managed by `cloudflared`; machine service-token credentials are installed per runtime in owner-only CONFIG_DIR storage |
| Disable | Disable suspends cloud coordination and retains a disabled local connection record, so ticket creation remains fail-closed |
| Service endpoints | The local connection record stores the coordination origin; the provisioning origin comes from a trusted distribution/operator service profile, never repository data |

### Open Questions

| Area | Question | Constraints |
| --- | --- | --- |
| Git boundary | How does onboarding explain that cloud membership and Git repository access are separate requirements? | MDT does not provision Git-host permissions |

### Known Constraints

- Cloud project UUID and membership are project-scoped authorities.
- Human identity is the verified Access principal, not a device identifier.
- Device-local recovery state may exist but cannot affect authorization or the allocation namespace.
- CONFIG_DIR connection state selects local versus cloud operation but never
  grants membership; the cloud verifies membership on protected operations.
- Owner-managed membership must preserve final-owner and role-escalation protections.
- Unknown projects and non-members must retain non-disclosing failure behavior.

### Decisions Deferred

- Browser Project Settings design and delivery details are owned by MDT-203.
- Exact interactive authentication UX inside the MDT-202 CLI contract.
- Distribution and update mechanism for the product-controlled trusted-origin set.
- Implementation artifacts and task breakdown.

## 4. Acceptance Criteria

### Functional

- [x] Provisioning a project from one device returns one stable cloud project
  UUID; another clone connects explicitly to that UUID without provisioning.
- [x] Retrying the same provisioning request after a timeout returns the same
  cloud project UUID and does not create a duplicate project.
- [x] Initial provisioning succeeds only for a human admitted by the operator
  Access policy; a project owner who is not an operator receives a clear denial.
- [ ] Adding one human member grants that verified principal the assigned project role from multiple devices.
- [ ] A teammate joins through personal Access authentication without entering a shared project password or copied token.
- [x] Repository-controlled files and the project registry entry
  `CONFIG_DIR/projects/{localProjectId}.toml` contain no cloud enablement, cloud
  project UUID, service origin, or credential.
- [x] Each installation stores its connection state under
  `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`; connecting verifies
  the existing UUID and membership before enabling cloud operations.
- [x] Device-local credentials, sessions, journals, locks, and caches do not create projects, grant roles, or define cloud project identity.
- [x] Revoking one project membership blocks the principal from that project across all devices on the next protected operation.
- [x] Revocation from one project does not remove the same principal from other projects.
- [ ] A new or replacement device can use an existing project membership after authentication without counter, membership, or projection migration.
- [x] Machine members use project-scoped roles while each runtime stores its own
  service-token credentials in an owner-only CONFIG_DIR credential file; the
  secret never enters repository configuration or the membership API.
- [x] Git repository access remains a separately documented prerequisite for canonical Markdown collaboration.
- [x] The shipped trusted service profile lets a new clone connect without
  project reprovisioning or repository configuration changes.
- [x] Repository configuration cannot select or redirect the privileged
  provisioning endpoint; it comes from the effective trusted service profile.
- [x] Disabling a connection retains a disabled CONFIG_DIR record and blocks new
  ticket creation; only the separately acknowledged permanent-detach procedure
  may remove the record and resume local numbering.
- [x] A legacy repository `[project.cloudSync]` binding can be imported
  explicitly into CONFIG_DIR; migration never silently edits repository files.
- [x] Readiness, provisioning, membership, binding, diagnostics, and disable
  behavior are exposed through one reusable service/API with no presentation
  logic.

### Non-Functional

- [x] No cloud credential or reusable join secret is persisted in
  repository-controlled files, browser storage, logs, or project registry
  data; machine secrets are limited to owner-only CONFIG_DIR credential files.
- [x] Project and membership lookups preserve tenant isolation and non-disclosure behavior.
- [x] Local-only project creation and existing-ticket editing remain backward compatible.

### Edge Cases

- A user authenticates successfully through Access but is not a member of the project.
- The same user opens the project from two devices concurrently.
- An initial provisioning response times out and the client retries.
- A device is lost while its user remains a valid project member.
- A project member is revoked while another device still has a valid Access session.
- A cloned repository contains a valid project UUID but an untrusted or changed service origin.
- One device opens multiple cloud-bound projects with different memberships.
- A teammate has cloud membership but lacks Git repository access.
- A legacy `.mdt-config.toml` contains `[project.cloudSync]` while CONFIG_DIR
  contains no connection or a conflicting connection.

## 5. Verification

### How to Verify Success

- Automated integration tests exercise one idempotent provisioning request and
  two independent clients connecting to the returned project UUID.
- Authorization tests exercise one human principal across multiple device sessions and multiple projects.
- Revocation tests prove the next protected operation fails on every device without relying on local cache expiry.
- Configuration inspection proves repository files contain no cloud connection
  or credential data and CONFIG_DIR files have the required permissions.
- A live Access-protected onboarding smoke verifies owner provisioning,
  membership management, teammate login/connect, first protected operation,
  disable, and offboarding through the reusable management service.
- MDT-202 CLI verification proves the adapter delegates lifecycle behavior to
  the MDT-201 management contract rather than duplicating it.
- Documentation review verifies that cloud membership and Git repository access are presented as separate steps.
