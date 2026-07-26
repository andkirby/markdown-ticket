---
code: MDT-202
status: In Progress
dateCreated: 2026-07-24T18:55:29.766Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-200,MDT-201,MDT-203
dependsOn: MDT-200,MDT-201
---

# Add cloud project management CLI

## 1. Description

### Requirements Scope

`full`

### Problem

- `docs/CRs/MDT-200-cloud-sync-first-slice.md` requires opt-in project binding
  and onboarding, but no supported CLI operation enables or assigns a project.
  MDT-201 has since shipped the reusable `CloudProjectManagementService`; this
  ticket consumes that service from the CLI.
- `cli/src/index.ts` exposes ticket and project commands but no cloud project,
  authentication, membership, diagnostic, credential, or disable commands.
- Manual Wrangler, HTTP, UUID, and credential steps are operator concerns and
  are not an acceptable teammate onboarding flow.

### Reconciliation with MDT-201 (implemented)

The following premises in earlier drafts of this ticket are stale and are
corrected here. MDT-201 is implemented and its cloud endpoint integration
works.

- The canonical executable is `mdt-cli`. Document and implement
  `mdt-cli cloud ...`. Do not invent an unverified `mdt` binary.
- The Cloudflare Worker is no longer a `503 service_not_ready` skeleton. A real
  `503 service_not_ready` response remains a handled failure case that must
  leave connection state unchanged; it is not the current default state.
- Cloud connection state lives only in
  `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`. Active cloud state,
  service origin, UUID, or credentials must never be written into
  `.mdt-config.toml` or the global project registry.
- `enable` provisions a new cloud project exactly once and reports its
  non-secret UUID.
- `connect <cloud-project-uuid>` is an explicit, separate journey: it consumes
  an existing UUID, verifies membership, writes CONFIG_DIR state commit-last,
  and never provisions. **Login alone does not assign a clone to a project.**
  A teammate or new clone must run `mdt-cli cloud connect <uuid>`.
- MDT-202 depends on MDT-200 and MDT-201. It must not become a dependency of
  either core ticket.

### Affected Artifacts

- `cli/src/index.ts`: register the `cloud` command group and generated help.
- `cli/src/commands/cloud.ts`: parse cloud subcommands, invoke shared services,
  and render redacted outcomes.
- `shared/services/cloud-sync/`: a small composition seam that wires
  `CloudProjectManagementService` from existing stores/profiles/coordinator if
  one does not yet exist for adapter construction. No provider framework.
- `docs/CLOUD_COORDINATION_GUIDE.md`: add the owner and teammate CLI journeys
  to the guide owned by the integrated cloud-sync delivery.

### Scope

- Changes:
  - add the `mdt-cli cloud` command group: `enable`, `login`, `connect`,
    `status`, `doctor`, `members list/add/remove`, `disable`, `migrate-legacy`,
    and a safe `credentials install/status/remove` subset;
  - detect the current project through existing project services;
  - invoke MDT-201 operations for readiness, provisioning, explicit connect,
    authentication, status, membership, diagnostics, credential management,
    and disablement;
  - render safe, actionable results and one centralized exit-code mapping;
  - document the CLI owner and teammate journeys, including the explicit
    `connect` step.
- Unchanged:
  - Wrangler remains an operator deployment tool;
  - CLI remains a thin presentation shell;
  - MDT-201 owns project lifecycle rules, management contracts, shared
    orchestration, CONFIG_DIR connection persistence, and credential storage;
  - Markdown/Git remains authoritative for ticket content;
  - Git-host repository access remains out of scope;
  - no shared password, reusable join secret, or credential is stored in
    project configuration.

## 2. Decision

### Chosen Approach

Add a thin `mdt-cli cloud` command group that delegates every cloud workflow
to the MDT-201 shared cloud-sync services.

### Rationale

- The existing CLI boundary requires reusable orchestration and validation to
  live in `shared/`, not `cli/`.
- `enable` performs readiness, Access login, project provisioning, membership
  probe, and atomic CONFIG_DIR binding without exposing intermediate UUID or
  token handling to the operator.
- `connect <cloud-project-uuid>` is the explicit second journey: it consumes an
  existing UUID, verifies membership, and writes CONFIG_DIR state. A teammate
  who clones a bound repository authenticates and runs `connect`; they never
  run `enable` and never provision a second project.
- Enablement uses the operator Access audience for bootstrap, then verifies the
  initial owner through the normal coordination audience; ordinary teammate
  login never receives provisioning authority.
- CONFIG_DIR connection state is written only after the coordinator proves the
  requested project and owner membership are usable. `.mdt-config.toml` and the
  global registry never hold active cloud state.
- The same shared services support the MDT-203 Project Settings UI without
  duplicating activation or authorization rules.
- Explicit `status` and `doctor` commands provide actionable diagnostics
  without treating HTTP or Wrangler output as the user interface.

### Dependency and Ownership

- MDT-202 depends on MDT-200's core cloud capability and MDT-201's reusable
  project-onboarding workflow.
- MDT-201 provides the project-management service/API and all reusable
  lifecycle behavior.
- MDT-202 owns only command parsing, interactive terminal UX, redacted output,
  help, exit-code mapping, and CLI-specific tests.
- MDT-200 remains independently completable as the core; MDT-202 validates the
  downstream CLI journey against its compatible coordination endpoints.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
| --- | --- | --- |
| Thin `mdt cloud` commands over shared services | CLI owns parsing/rendering; shared owns workflows | **ACCEPTED** - preserves the CLI business-logic boundary and supports later UI reuse |
| Manual TOML plus HTTP calls | User writes UUID and service URL after direct API calls | Allows partial or invalid binding and exposes infrastructure details |
| Wrangler-based user workflow | Users provision and inspect resources with Cloudflare tooling | Couples project onboarding to operator credentials and one provider |
| CLI-only business logic | Cloud orchestration implemented directly in `cli/` | Duplicates rules needed by browser, MCP, and server consumers |
| UI-only activation | Project Settings is the only management surface | Blocks terminal and headless project owners and delays the minimum usable workflow |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
| --- | --- | --- |
| `cli/src/commands/cloud.ts` | CLI adapter | Parse cloud subcommands, invoke shared services, render redacted outcomes |
| `cli/src/commands/cloud/exit-codes.ts` | CLI exit mapping | One centralized, documented exit-code mapping |
| `shared/services/cloud-sync/create-management-service.ts` | Shared seam | Compose `CloudProjectManagementService` from existing stores/profiles/coordinator |
| `cli/tests/e2e/cloud/*.spec.ts` | CLI E2E tests | Black-box command UX, exit codes, redaction, idempotent enablement, two-client connect |

### Modified Artifacts

| Artifact | Change Type | Modification |
| --- | --- | --- |
| `cli/src/index.ts` | Command registration | Add the `cloud` group and its subcommands without adding business rules |
| `cli/src/output/guide.ts` | Help generation | Include cloud command discovery and examples |
| `docs/CLOUD_COORDINATION_GUIDE.md` | CLI documentation | Add commands and the explicit owner/teammate journeys |

- MDT-203 consumes the same MDT-201 contract after this CLI journey is proven;
  it does not depend on CLI implementation details.

### Integration Points

| From | To | Interface |
| --- | --- | --- |
| `cli/src/commands/cloud.ts` | MDT-201 `CloudProjectManagementService` | Typed enable, connect, status, member, doctor, disable, migrate operations |
| `cli/src/commands/cloud/credentials.ts` | MDT-201 `MachineCredentialStore` | install/status/remove with secret from stdin or hidden prompt only |
| CLI result renderer | MDT-201 stable results/errors | Redacted messages and stable process exit codes from one mapping |

### Key Patterns

- Thin CLI shell: argument parsing and rendering stay in `cli/`; reusable behavior stays in `shared/`.
- Readiness gate: after resolving a trusted service profile and authenticating
  to the required audience, enablement rejects unavailable, incompatible, or
  skeleton deployments before provisioning or writing configuration.
- Commit-last binding: persist the project UUID only after provisioning and membership verification succeed.
- Idempotent enablement: rerunning enable on an existing valid binding never provisions a second cloud project.
- Secret-safe authentication: tokens remain in the credential provider and are never printed, logged, or written to project files.
- Project-scoped authority: cloud UUID and membership belong to the project; device state only holds personal credentials and recovery data.
- Trusted service default: the shipped service origin requires no per-device
  allowlist edit; custom/self-hosted `--service` values must already be trusted
  through MDT-201's operator-controlled extension mechanism.
- Split-audience bootstrap: `enable` obtains an operator-authorized assertion
  for the trusted provisioning endpoint, while `login` and normal project
  commands use the coordination audience.
- Endpoint confinement: the repository binding stores only the coordination
  origin; the CLI resolves any privileged provisioning origin from the trusted
  service profile and rejects redirects.

## 5. Acceptance Criteria

### Functional

- [ ] `mdt-cli cloud enable --owner <email>` detects the current project and refuses execution outside a configured project.
- [ ] `mdt-cli cloud enable` resolves a trusted service profile, authenticates
  to the operator audience, and checks service readiness and compatible
  capabilities before provisioning or writing CONFIG_DIR connection state.
- [ ] A real `503 service_not_ready` response leaves CONFIG_DIR connection
  state unchanged and exits with an actionable message. (503 is a failure
  case, not the default Worker state — MDT-201 is implemented.)
- [ ] Successful enablement launches interactive Access authentication without printing or persisting the human token.
- [ ] Enablement requires operator-policy admission and reports a clear denial
  when a project owner lacks cloud-service operator authority.
- [ ] Successful enablement provisions one cloud project using the project code, initial owner identity, and a next number above existing tickets.
- [ ] The returned project identifier is validated as a cloud UUID and membership is probed before CONFIG_DIR connection state is written.
- [ ] Successful enablement atomically writes the non-secret
  `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml` connection. It never
  writes active cloud state, the UUID, or credentials to `.mdt-config.toml` or
  the global project registry.
- [ ] Re-running `enable` for a valid connection reports the existing cloud project UUID and performs no second provisioning mutation.
- [ ] `mdt-cli cloud login` obtains or refreshes the personal Access session
  without modifying connection state or membership. **Login alone does not
  assign this clone to a project.**
- [ ] `mdt-cli cloud connect <cloud-project-uuid>` is an explicit journey that
  consumes an existing UUID, authenticates to the coordination audience,
  verifies membership, writes CONFIG_DIR connection state commit-last, and
  reports the verified role. It never provisions.
- [ ] Teammate login and connect authenticate only to the coordination audience
  and cannot call project-provisioning routes.
- [ ] `mdt-cli cloud status` distinguishes absent/local-only, enabled-ready,
  disabled, malformed, untrusted, authentication-required, forbidden,
  unavailable, suspended, stale, and incompatible states where supported by
  the shared contract.
- [ ] `mdt-cli cloud doctor` reports redacted, actionable checks for project
  context, CONFIG_DIR connection state, trusted origin, credential
  availability, service readiness, membership, and coordinator reachability.
- [ ] `mdt-cli cloud members list` shows project members and roles only to an authorized owner.
- [ ] `mdt-cli cloud members add <principal> --kind human|machine --role <role>`
  adds or updates normalized membership without accepting a password or token.
  For `--kind machine` the principal is the non-secret machine principal ID;
  the client secret is never accepted here.
- [ ] `mdt-cli cloud members remove <principal> --kind human|machine` revokes
  project membership and requires confirmation unless `--yes` is supplied.
- [ ] `mdt-cli cloud credentials install <credential-ref> --client-id <id>`
  reads the client secret from a hidden interactive prompt or stdin, never
  from argv. The secret is never printed, logged, returned in structured
  output, or written outside the owner-only CONFIG_DIR credential store.
- [ ] `mdt-cli cloud credentials status <credential-ref>` and
  `mdt-cli cloud credentials remove <credential-ref> [--yes]` expose only
  redacted diagnostic views and require confirmation for removal unless
  `--yes` is supplied.
- [ ] `mdt-cli cloud disable [--yes]` follows the approved disable procedure,
  retains the connection as `disabled`, keeps ticket creation fail-closed,
  and never silently resumes local number allocation. There is no
  permanent-detach command in this ticket.
- [ ] `mdt-cli cloud migrate-legacy [--yes]` explicitly imports a legacy
  repository `[project.cloudSync]` binding into CONFIG_DIR, rejects conflicts,
  and leaves repository files unchanged unless a separate explicit cleanup is
  acknowledged. Requires confirmation unless `--yes` is supplied.
- [ ] A teammate who clones a bound project authenticates, runs
  `mdt-cli cloud connect <uuid>`, and uses the existing cloud UUID without
  running `enable` or provisioning again.
- [ ] Every command supports human, `--json`, and `--yaml` output conventions.
- [ ] Every command provides stable non-zero exit codes for authentication,
  authorization, configuration, readiness, network, and coordinator failures
  through one centralized, documented exit-code mapping. `process.exit()`
  decisions are not scattered across command handlers.
- [ ] Confirmation is required for member removal, credential removal, disable,
  and legacy migration unless `--yes` is supplied.
- [ ] Non-interactive execution never hangs waiting for input.
- [ ] Every lifecycle operation is delegated to the MDT-201 management
  service/API; CLI code does not independently implement readiness,
  provisioning, membership, binding, credential, or disable rules.

### Non-Functional

- [ ] No Access token, service-token secret, JWT, cookie, authorization header,
  client secret, or reusable join credential appears in CLI output (human,
  JSON, or YAML), arguments, `--guide` output, logs, repository files, the
  global registry, or CONFIG_DIR files outside the owner-only credential store.
- [ ] CLI commands contain no allocation, membership, retry, project-binding,
  credential-storage, or authorization business logic.
- [ ] Local-only project commands retain current behavior when the cloud
  command group is unused.
- [ ] Command help identifies Wrangler as an operator tool and does not
  instruct teammates to edit UUIDs manually.
- [ ] `mdt-cli cloud --help` and the generated guide expose all approved
  subcommands and no provider-specific user workflow.

### Testing

- Unit: command parsing maps every cloud subcommand and option to typed shared requests.
- Unit: output formatting redacts configured credential and token header names from success and error objects.
- Unit: enablement rejects `503`, incompatible capabilities, invalid UUID, failed membership probe, and untrusted origin without changing CONFIG_DIR connection state.
- Unit: repeated enablement with one valid connection performs no provisioning mutation.
- Unit: `connect` verifies membership and writes CONFIG_DIR state without ever calling provision.
- Unit: two independent CONFIG_DIR clients connect to the same cloud UUID without a second provisioning.
- Unit: member add/update/list/remove preserve owner authorization and never accept or print a machine secret.
- Unit: credential install reads the secret from stdin or a hidden prompt only, never argv; status/remove expose redacted views only.
- Unit: disabled, malformed, and untrusted connections fail closed.
- Integration: successful provisioning and membership probe produce one atomic CONFIG_DIR connection update.
- Integration: disablement retains a `disabled` connection and does not resume local numbering.
- E2E: black-box CLI tests using the real child-process runner with isolated temporary CONFIG_DIR directories, a fake coordinator, and a fake `cloudflared`.
- E2E: verify no token, client secret, authorization header, cookie, or JWT appears in stdout, stderr, JSON, YAML, `--guide` output, logs, or written files.
- Live smoke (where credentials are available): existing enabled project reports ready; `doctor` passes without exposing credentials; owner lists members; a second isolated CONFIG_DIR connects using the existing UUID without provisioning; both installations operate against the same cloud project; revocation denies the second principal on the next protected operation; disable retains a `disabled` record and does not resume local numbering.

## 6. Verification

### Feature Verification

- `mdt cloud --help` exposes all approved subcommands and no provider-specific user workflow.
- CLI unit and E2E suites pass with real non-zero failure assertions rather than accepting missing tests.
- Changed TypeScript validation, shared and CLI builds, lint, and affected regression suites pass.
- A real Access-protected deployment proves human login, project provisioning, member onboarding, two-client creation, projection visibility, and revocation.
- Configuration inspection classifies project binding as non-secret and confirms no credentials are repository-controlled.
- `docs/CLOUD_COORDINATION_GUIDE.md` reproduces the successful owner and teammate journeys.

## 7. Deployment

| Part | Artifacts Deployed | Rollback |
| --- | --- | --- |
| CLI command group | `cli/src/commands/cloud.ts`, `cli/src/index.ts` | Remove command registration; existing ticket/project commands remain unchanged |
| MDT-201 dependency | Project-management contracts and shared service | Keep the CLI command group unavailable until the compatible service is present |
| MDT-200 dependency | Cloud readiness and management endpoints | Keep enablement blocked until the compatible capability set is deployed |
| Documentation | CLI sections of the cloud coordination guide | Restore prior CLI docs with the command group disabled |
