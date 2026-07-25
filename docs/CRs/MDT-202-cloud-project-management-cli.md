---
code: MDT-202
status: Proposed
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

- `docs/CRs/MDT-200-cloud-sync-first-slice.md` requires opt-in project binding and onboarding, but no supported CLI operation enables or assigns a project.
- `cloud/src/cloudflare/worker.ts` currently returns `503 service_not_ready`; manual TOML editing can incorrectly mark an unavailable service as enabled.
- `cli/src/index.ts` exposes ticket and project commands but no cloud project, authentication, membership, diagnostic, or disable commands.
- Manual Wrangler, HTTP, UUID, and credential steps are operator concerns and are not an acceptable teammate onboarding flow.

### Affected Artifacts

- `cli/src/index.ts`: register the `cloud` command group and generated help.
- `cli/src/commands/cloud.ts`: parse cloud management intent and render results.
- MDT-201 shared cloud management service/contracts: consume typed project
  lifecycle operations without duplicating them.
- `docs/CLOUD_COORDINATION_GUIDE.md`: add the owner and teammate CLI journeys
  to the guide owned by the integrated cloud-sync delivery.

### Scope

- Changes:
  - add `mdt cloud enable`, `login`, `status`, `members`, `doctor`, and `disable` commands;
  - detect the current project through existing project services;
  - invoke MDT-201 operations for authentication, activation, status,
    membership, diagnostics, and disablement;
  - render safe, actionable results and stable exit codes;
  - document the CLI owner and teammate journeys.
- Unchanged:
  - Wrangler remains an operator deployment tool;
  - CLI remains a thin presentation shell;
  - MDT-201 owns project lifecycle rules, management contracts, shared
    orchestration, and binding persistence;
  - Markdown/Git remains authoritative for ticket content;
  - Git-host repository access remains out of scope;
  - no shared password, reusable join secret, or credential is stored in project configuration.

## 2. Decision

### Chosen Approach

Add a thin `mdt cloud` command group that delegates every cloud workflow to shared cloud-sync services.

### Rationale

- The existing CLI boundary requires reusable orchestration and validation to live in `shared/`, not `cli/`.
- One command can perform readiness, Access login, project provisioning, membership probe, and atomic binding without exposing intermediate UUID or token handling.
- Enablement uses the operator Access audience for bootstrap, then verifies the
  initial owner through the normal coordination audience; ordinary teammate
  login never receives provisioning authority.
- Project configuration is written only after the coordinator proves the requested project and owner membership are usable.
- The same shared services support the MDT-203 Project Settings UI without
  duplicating activation or authorization rules.
- Explicit status and doctor commands provide actionable diagnostics without treating HTTP or Wrangler output as the user interface.

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
| `cli/src/commands/cloud.ts` | CLI adapter | Parse cloud subcommands, invoke shared services, and render redacted outcomes |
| `cli/tests/e2e/cloud.spec.ts` | CLI E2E tests | Verify command UX, exit codes, redaction, idempotent enablement, and failure recovery |

### Modified Artifacts

| Artifact | Change Type | Modification |
| --- | --- | --- |
| `cli/src/index.ts` | Command registration | Add the `cloud` group and its subcommands without adding business rules |
| `cli/src/output/guide.ts` | Help generation | Include cloud command discovery and examples |
| MDT-201 management contracts/service | Adapter integration | Consume typed enable, status, membership, doctor, and disable operations |
| `docs/CLOUD_COORDINATION_GUIDE.md` | CLI documentation | Add commands and examples to the integrated guide |

- MDT-203 consumes the same MDT-201 contract after this CLI journey is proven;
  it does not depend on CLI implementation details.

### Integration Points

| From | To | Interface |
| --- | --- | --- |
| `cli/src/commands/cloud.ts` | MDT-201 project-management service | Typed enable, login, status, member, doctor, and disable requests |
| CLI result renderer | MDT-201 stable results/errors | Redacted messages and stable process exit codes |

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

- [ ] `mdt cloud enable` detects the current project and refuses execution outside a configured project.
- [ ] `mdt cloud enable` resolves a trusted service profile, authenticates to
  the operator audience, and checks service readiness and compatible
  capabilities before provisioning or writing project configuration.
- [ ] A `503 service_not_ready` response leaves `.mdt-config.toml` unchanged and exits with an actionable message.
- [ ] Successful enablement launches interactive Access authentication without printing or persisting the human token.
- [ ] Enablement requires operator-policy admission and reports a clear denial
  when a project owner lacks cloud-service operator authority.
- [ ] Successful enablement provisions one cloud project using the project code, initial owner identity, and a next number above existing tickets.
- [ ] The returned project identifier is validated as a cloud UUID and membership is probed before binding is written.
- [ ] Successful enablement atomically writes the approved non-secret `[project.cloudSync]` binding.
- [ ] Re-running enable for a valid binding reports the existing cloud project and does not provision another one.
- [ ] `mdt cloud login` establishes or refreshes the personal Access session without changing project binding or membership.
- [ ] Teammate login authenticates only to the coordination audience and cannot
  call project-provisioning routes.
- [ ] `mdt cloud status` distinguishes disabled, enabled-ready, authentication-required, forbidden, unavailable, stale, and incompatible states.
- [ ] `mdt cloud members list` shows project members and roles only to an authorized owner.
- [ ] `mdt cloud members add <email> --role <role>` adds or updates normalized human membership without accepting a password or token.
- [ ] `mdt cloud members remove <email>` revokes project membership and requires explicit confirmation unless a non-interactive confirmation flag is supplied.
- [ ] Machine membership accepts a verified machine principal ID but never accepts or prints its client secret.
- [ ] `mdt cloud doctor` checks local binding, trusted origin, credential provider, service readiness, membership, and coordinator reachability with redacted output.
- [ ] `mdt cloud disable` follows the approved project disable procedure and never silently resumes local number allocation.
- [ ] A teammate who pulls a bound project authenticates and uses the existing cloud UUID without running enable or provisioning again.
- [ ] Every command provides stable non-zero exit codes for authentication, authorization, configuration, readiness, network, and coordinator failures.
- [ ] Every lifecycle operation is delegated to the MDT-201 management
  service/API; CLI code does not independently implement readiness,
  provisioning, membership, binding, or disable rules.

### Non-Functional

- [ ] No Access token, service-token secret, JWT, cookie, authorization header, or reusable join credential appears in CLI output, arguments, history guidance, logs, project files, or browser storage.
- [ ] CLI commands contain no allocation, membership, retry, project-binding, or authorization business logic.
- [ ] Local-only project commands retain current behavior when the cloud command group is unused.
- [ ] Command help identifies Wrangler as an operator tool and does not instruct teammates to edit UUIDs manually.

### Testing

- Unit: command parsing maps every cloud subcommand and option to typed shared requests.
- Unit: output formatting redacts configured credential and token header names from success and error objects.
- Unit: enablement rejects `503`, incompatible capabilities, invalid UUID, failed membership probe, and untrusted origin without changing project configuration.
- Unit: repeated enablement with one valid binding performs no provisioning mutation.
- Integration: successful provisioning and membership probe produce one atomic project binding update.
- Integration: member add, role change, list, and removal preserve project isolation and owner authorization.
- Integration: disablement never switches a cloud-bound project to local allocation without the approved detach procedure.
- E2E: two independent CLI clients use one bound project, authenticate separately, allocate distinct ticket numbers, and observe projected updates.
- Manual: owner enables a project, adds a teammate, teammate pulls and authenticates, then owner revokes access.

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
