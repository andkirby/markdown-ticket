# Architecture: MDT-202

Canonical artifacts and obligations live in Spec Trace and render to
[`architecture.trace.md`](architecture.trace.md).

## Overview

MDT-202 adds one `cloud` command group in `cli/` and one small shared
composition seam. The CLI is a presentation adapter: it parses argv, asks for
confirmation, renders redacted output, and maps failures to exit codes. Every
lifecycle rule belongs to the implemented MDT-201 `CloudProjectManagementService`.

No provider framework. No speculative abstraction.

## Data Model

MDT-202 introduces **no new authority**. All cloud state authority is owned by
MDT-201:

| Data | Authority (unchanged) |
| --- | --- |
| Project UUID, membership, counter, projections | Cloud D1 |
| Installation connection | `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml` |
| Machine credential | `CONFIG_DIR/cloud-sync/credentials/{credentialRef}.toml` |
| Human Access session | `cloudflared` in-memory |
| `.mdt-config.toml`, global registry | Project discovery + Markdown metadata only — **no cloud state** |

CLI-only data is ephemeral: parsed options, rendered strings, exit codes.

## Module Boundaries

| Module | Responsibility | New? |
| --- | --- | --- |
| `cli/src/commands/cloud.ts` | Parse cloud subcommands; render redacted outcomes | **new** |
| `cli/src/commands/cloud/exit-codes.ts` | One centralized, documented exit-code mapping | **new** |
| `cli/src/commands/cloud/options.ts` | DTO types for parsed options (no logic) | **new** |
| `cli/src/commands/cloud/render.ts` | Human/JSON/YAML formatters with redaction | **new** |
| `cli/src/commands/cloud/confirm.ts` | TTY-aware confirmation; never hangs non-interactive | **new** |
| `cli/src/commands/cloud/secret-prompt.ts` | Hidden stdin/prompt reader for the client secret | **new** |
| `shared/services/cloud-sync/create-management-service.ts` | Compose `CloudProjectManagementService` from existing parts | **new** |
| `cli/src/index.ts` | Register the `cloud` group; route through `runCliAction` | modified |
| `cli/src/output/guide.ts` | Include cloud commands in generated guide | modified |
| `docs/CLOUD_COORDINATION_GUIDE.md` | Owner + teammate journeys | modified |

Everything below the CLI seam is existing MDT-201 code, unchanged:
`CloudProjectManagementService`, `ManagementCoordinator`,
`ProjectStateStore`, `MachineCredentialStore`, `TrustedServiceProfile`,
`AudienceAwareCredentialResolver`, `LegacyBindingMigration`.

## The Shared Composition Seam

**Problem.** `CloudProjectManagementService` is declared but never
instantiated. The CLI cannot `new` it inline without dragging business wiring
(allocation, persistence, profiles, resolvers) into `cli/`, which would
violate C-2.

**Solution.** One factory in shared, ~40 lines, no framework:

```text
createManagementService({
  localProjectId,          // from ProjectService.resolveCurrentProject()
  operatorOrigins,         // from global config cloudSync.allowedOrigins
  credentialProvider,      // AudienceAwareCredentialProvider (existing)
  fetchImpl?,              // injected for tests
  configDirRoot?,          // injected for tests; defaults to CONFIG_DIR
  legacyMigrationSource?,  // optional, for migrate-legacy
}): {
  service: CloudProjectManagementService
  credentialStore: MachineCredentialStore
  profile: TrustedServiceProfile
}
```

The factory wires existing constructors in the order MDT-201 already
documents. It owns **no** lifecycle rules. It is reusable by the MDT-203
browser adapter later.

This is not a provider framework. It is a constructor call hidden behind a
function so the CLI does not import five collaborators to build one service.

## Runtime Flows

### `cloud enable --owner <email>`

1. Resolve current project via `ProjectService` (BR-1.1). Refuse if none.
2. Compute `initialNextTicketNumber` via shared logic (max existing ticket +1).
3. `service.enable({ projectCode, initialOwnerEmail, initialNextTicketNumber, idempotencyKey, requestHash })`.
4. Render the returned UUID + `replayed` flag. Map `CoordinatorError` to exit code.

The MDT-201 service does readiness → journal key → require operator credential
→ provision → probe coordination membership → write CONFIG_DIR commit-last. A
failure at any step throws before the commit-last write (Edge-1).

### `cloud connect <cloud-project-uuid>`

1. Resolve current project.
2. `service.connect({ cloudProjectId: uuid })`.
3. Render the verified role.

The service does coordination credential → probe membership → write CONFIG_DIR
commit-last. **Zero provision calls anywhere on this path.**

### `cloud login`

1. Resolve current project (informational).
2. Invoke the human credential provider against the coordination origin to
   obtain/refresh the Access session.
3. Render success. Do not touch CONFIG_DIR connection state or membership.

### `cloud status` / `cloud doctor`

1. `service.diagnostics()` returns `{ ready, reason, connection, probe }`.
2. `status` renders the discriminated state; `doctor` adds reachability +
   credential-availability checks. Both redact.

### `cloud members ...` / `cloud credentials ...` / `cloud disable` / `cloud migrate-legacy`

Thin delegation to the corresponding service method. Confirmation flows
through `confirm.ts` for remove/disable/migrate. Credentials install reads
the secret via `secret-prompt.ts`.

## Exit-Code Mapping (C-7)

One table in `cli/src/commands/cloud/exit-codes.ts`:

| Code | Exit | Source |
| --- | --- | --- |
| `NO_PROJECT_CONTEXT` | 2 | no current project |
| `AUTHENTICATION_REQUIRED` | 3 | `CoordinatorError authentication_required` |
| `FORBIDDEN` | 4 | `CoordinatorError forbidden` / owner role missing |
| `NOT_FOUND` | 5 | `CoordinatorError project_not_found` |
| `CONFLICT` | 6 | `CoordinatorError *_conflict` / `last_owner_required` |
| `COORDINATION_SUSPENDED` | 7 | `CoordinatorError coordination_suspended` |
| `COORDINATION_UNAVAILABLE` | 8 | `CoordinatorError coordination_unavailable` (incl. real 503) |
| `RATE_LIMITED` | 9 | `CoordinatorError rate_limited` |
| `CONFIG_INVALID` | 10 | `ProjectStateFormatError` / `MachineCredentialFormatError` |
| `UNTRUSTED_ORIGIN` | 11 | `UntrustedServiceOriginError` |
| `CONFIRMATION_REQUIRED` | 12 | non-interactive + no `--yes` on a destructive command |
| `CLI_ERROR` | 1 | anything else |

`runCliAction` is extended so cloud commands supply this mapping instead of
the default `process.exit(1)`. **No inline `process.exit` in any cloud
handler.**

## Redaction (C-5, C-6)

- The client secret is read from stdin or a hidden prompt only. It is never an
  argv value (commander would otherwise echo it in `--help`/history).
- `render.ts` projects every response through allow-list field selection. The
  credential store's `describeLoaded` already drops the secret; render uses
  only that view.
- `--guide` and `--help` text are static strings reviewed to contain no
  secret, token, or header names beyond the public command surface.
- A dedicated redaction test (Edge-4, C-5, C-6) greps stdout/stderr/JSON/YAML
  and written files for known secret-shaped substrings.

## Two-Client Journey (Edge-2)

Two isolated `CONFIG_DIR` temp directories + a fake coordinator prove:

1. Client A enables → one provision call → connection written under A's CONFIG_DIR.
2. Client B receives the UUID out-of-band, runs `connect` → zero provision
   calls → connection written under B's CONFIG_DIR.
3. Both target the same cloud UUID.

This is the linchpin of the "login ≠ bound" fix.

## Non-Interactive Safety (Edge-5)

`confirm.ts` checks `process.stdin.isTTY` (and `process.stdout.isTTY`). If a
destructive command requires confirmation and the session is not interactive,
it exits `CONFIRMATION_REQUIRED` (12) immediately. It never awaits input.

## Rollback

Remove the `cloud` command registration from `cli/src/index.ts`. The shared
seam is dead code with no callers; safe to leave or delete. MDT-201 services,
existing ticket/project commands, and local-only behavior are untouched.

## Verification

- Unit: option parsing → typed request; render redaction; exit-code mapping;
  confirm gating; secret-prompt stdin path.
- Integration: `createManagementService` wiring against a fake coordinator.
- E2E: black-box CLI tests in `cli/tests/e2e/cloud/` with isolated CONFIG_DIR,
  fake coordinator, fake `cloudflared`, redaction sweep.
