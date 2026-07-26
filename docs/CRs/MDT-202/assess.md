# Assess: MDT-202 — Cloud project management CLI

## Scope

Ship a thin `mdt-cli cloud` command group as a presentation adapter over the
implemented MDT-201 `CloudProjectManagementService`. The CLI must make cloud
onboarding usable without manual HTTP, UUID file editing, credential-file
editing, or Wrangler as an end-user interface.

## Reconciliation with MDT-201 (implemented)

Earlier drafts of this ticket assumed MDT-201 was a `503` skeleton and that
cloud state lived in `.mdt-config.toml`. Both are stale. Corrected premises:

- Canonical executable: `mdt-cli`. No invented `mdt` binary.
- Worker is implemented; a real `503 service_not_ready` is a failure case, not
  the default state.
- Connection state lives only in
  `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`.
- `.mdt-config.toml` and the global registry hold no active cloud state,
  UUID, origin, or credentials.
- `enable` provisions exactly once; `connect <uuid>` is a separate journey
  that verifies membership and never provisions.
- A teammate/new clone must run `connect` explicitly. Login alone does not
  assign a clone to a project.
- MDT-202 depends on MDT-200/MDT-201 and must not become a dependency of
  either.

## Command surface (required)

- `mdt-cli cloud enable --owner <email>`
- `mdt-cli cloud login`
- `mdt-cli cloud connect <cloud-project-uuid>`
- `mdt-cli cloud status`
- `mdt-cli cloud doctor`
- `mdt-cli cloud members list`
- `mdt-cli cloud members add <principal> --kind human|machine --role <role>`
- `mdt-cli cloud members remove <principal> --kind human|machine [--yes]`
- `mdt-cli cloud disable [--yes]`
- `mdt-cli cloud migrate-legacy [--yes]`
- `mdt-cli cloud credentials install <credential-ref> --client-id <id>`
- `mdt-cli cloud credentials status <credential-ref>`
- `mdt-cli cloud credentials remove <credential-ref> [--yes]`

## Non-goals

- No permanent-detach command (separate counter-reconciliation procedure).
- No provider-neutral framework or speculative abstraction.
- No Wrangler-based user workflow; Wrangler stays operator tooling.
- No business logic in `cli/` (allocation, membership rules, retries,
  provisioning, CONFIG_DIR persistence, credential storage all live in
  shared/MDT-201).
- No Git-host repository access work.

## Dependencies

- **MDT-200**: core cloud capability.
- **MDT-201**: reusable project-management service/contracts, CONFIG_DIR
  state store, credential store, trusted service profile, coordinator.
- **MDT-203** (downstream): consumes the same MDT-201 contract later.

## Critical risks

1. **Missing composition root.** `CloudProjectManagementService` is declared
   but never instantiated anywhere in the repo. There is no factory that wires
   it from `ProjectStateStore` + `TrustedServiceProfile` +
   `ManagementCoordinator` + credential resolver. We must add one small shared
   seam — not a provider framework.
2. **Secret leakage surface.** The client secret must never appear in argv,
   stdout, stderr, JSON, YAML, `--guide`, logs, or any non-credential-store
   file. Redaction is a hard gate with explicit tests.
3. **Two journeys, not one.** Owners run `enable`; everyone else runs
   `connect`. Conflating them re-introduces the "login = bound" bug.
4. **Exit-code sprawl.** Without one centralized mapping, `process.exit()`
   decisions will scatter across handlers.

## Confidence

High. MDT-201 is implemented and the contract is clean. The work is adapter
plumbing plus one small shared seam. The risk is presentation discipline, not
unknown cloud behavior.
