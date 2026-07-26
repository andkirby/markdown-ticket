# Requirements: MDT-202

Canonical requirement rows live in Spec Trace and render to
[`requirements.trace.md`](requirements.trace.md). This document records the
chosen semantics that downstream stages must preserve.

## Scope

MDT-202 is a thin `mdt-cli cloud` command group over the implemented MDT-201
`CloudProjectManagementService`. The CLI owns parsing, confirmation UX,
redacted output, help, exit codes, and CLI tests. All lifecycle logic is
delegated to shared/MDT-201.

## Command surface

| Command | Delegates to MDT-201 |
| --- | --- |
| `cloud enable --owner <email>` | `enable` (provision once; idempotent on retry) |
| `cloud login` | Access session obtain/refresh; no state change |
| `cloud connect <cloud-project-uuid>` | `connect` (verify membership, never provision) |
| `cloud status` | `diagnostics` projection |
| `cloud doctor` | `diagnostics` + reachability checks |
| `cloud members list` | `listMembers` |
| `cloud members add <principal> --kind --role` | `upsertMember` |
| `cloud members remove <principal> --kind [--yes]` | `removeMember` |
| `cloud disable [--yes]` | `disable` (retain disabled; fail-closed) |
| `cloud migrate-legacy [--yes]` | `migrateLegacyBinding` |
| `cloud credentials install <ref> --client-id <id>` | `MachineCredentialStore.install` (secret via stdin/prompt) |
| `cloud credentials status <ref>` | `MachineCredentialStore.describeLoaded` (redacted) |
| `cloud credentials remove <ref> [--yes]` | `MachineCredentialStore.remove` |

## Behavioral requirements (BR)

- **BR-1.1–1.5** Enable: project detection, trusted profile + operator audience
  + readiness gate, single provisioning, CONFIG_DIR commit-last, idempotent
  rerun. `503` is a failure case (Edge-4), not the default state.
- **BR-1.6** Login: obtain/refresh personal Access session. **Login alone does
  not assign a clone to a project.**
- **BR-1.7 / 1.8** Connect: explicit second journey. Existing UUID, membership
  verification, CONFIG_DIR commit-last, never provisions. Teammates run
  `connect`, never `enable`.
- **BR-1.9 / 1.10** Status and doctor: redacted, actionable, all
  contract-supported states.
- **BR-2.x** Membership: owner-only list; add/remove with role; machine
  principal id only, never the secret; confirmation on remove.
- **BR-3.x** Credentials: secret via stdin or hidden prompt only (C-6);
  redacted status; confirmation on remove.
- **BR-4.x** Disable retains `disabled` and stays fail-closed; no
  permanent-detach in this ticket. Migrate-legacy is explicit, conflict-safe,
  and leaves repository files unchanged.
- **BR-5.x / 6.x** Output formats, one centralized exit-code mapping (C-7),
  confirmation semantics, and `--help`/guide surface.

## Constraints (C)

- **C-1** Active cloud state, UUID, origin, and credentials live only in
  CONFIG_DIR. `.mdt-config.toml` and the global registry hold none of it.
- **C-2** No lifecycle business logic in `cli/`.
- **C-3** Local-only behavior is unchanged when cloud is unused/absent.
- **C-5 / C-6** No secret appears in any non-credential-store output path; the
  client secret is never an argv value.
- **C-7** One centralized, documented exit-code mapping.

## Edge cases (Edge)

Failed steps leave state unchanged (Edge-1); two clients share one UUID
(Edge-2); disabled/malformed/untrusted fail closed (Edge-3); 503 is surfaced
not persisted (Edge-4); non-interactive never hangs (Edge-5); repeated enable
is a no-op (Edge-6); migrate rejects conflicts (Edge-7); malformed secret
fails closed (Edge-8); unknown/revoked UUID on connect writes nothing (Edge-9).

## Out of scope

- Permanent detach (separate counter-reconciliation procedure).
- Provider-neutral framework or speculative abstraction.
- Git-host repository access.
- Wrangler as a user workflow.
