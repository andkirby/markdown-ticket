---
code: MDT-223
status: Proposed
dateCreated: 2026-08-02T00:00:00.000Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-202
dependsOn: MDT-202
---

# Surface full connection state in `cloud status` and `cloud doctor`

## 1. Description

### Requirements Scope

`full`

### Problem

- MDT-202 acceptance criterion #13 requires `mdt-cli cloud status` to
  distinguish absent/local-only, enabled-ready, disabled, malformed, untrusted,
  authentication-required, forbidden, unavailable, suspended, stale, and
  incompatible states. MDT-202 acceptance criterion #14 requires
  `mdt-cli cloud doctor` to report checks for project context, CONFIG_DIR
  connection state, trusted origin, credential availability, service readiness,
  membership, and coordinator reachability.
- Both criteria are open because the CLI renderers under-report the state the
  shared contract already exposes. This is a CLI presentation gap, not a
  contract or testing gap — the underlying `ProjectConnectionRead` and
  `CloudConnectionDiagnostics` already carry the discriminated state.

### Current Behavior

`cli/src/commands/cloud/render.ts:118` (`formatStatusHuman`) collapses the
connection into four strings: `not ready`, `local-only`, `disabled`, and
`enabled`. The `malformed`, `untrusted`, authentication-required, forbidden,
unavailable, and suspended states are not surfaced as distinct `status` output;
they appear only as exit codes when a command fails.

`cli/src/commands/cloud.ts` `cloudDoctorAction` emits four checks: project
context, CONFIG_DIR connection, trusted origin, and membership probe. It does
not emit distinct checks for credential availability, service readiness, or
coordinator reachability.

### Available Contract

`domain-contracts/src/cloud-sync/config.ts:60` defines the full
`ProjectConnectionRead` discriminated union:

```typescript
type ProjectConnectionRead
  = | { kind: 'absent' }
    | { kind: 'enabled', connection: CloudSyncConnection }
    | { kind: 'disabled', connection: CloudSyncConnection }
    | { kind: 'malformed', reason: string }
    | { kind: 'untrusted', connection: CloudSyncConnection, reason: string }
```

`domain-contracts/src/cloud-sync/project-management.ts:95` defines
`CloudConnectionDiagnostics` (extends `ReadinessProbe`, carries `connection`
and `probe`). `domain-contracts/src/cloud-sync/errors.ts` defines the full
`CoordinationErrorCode` set (`authentication_required`, `forbidden`,
`coordination_suspended`, `coordination_unavailable`, etc.).

### Affected Artifacts

- `cli/src/commands/cloud/render.ts` — extend `formatStatusHuman` to render
  each `ProjectConnectionRead` kind distinctly and surface probe failure modes.
- `cli/src/commands/cloud.ts` — extend `cloudDoctorAction` to emit the missing
  checks (credential availability, service readiness, coordinator reachability).
- `cli/src/commands/cloud/__tests__/` — render and doctor tests covering each
  rendered state.
- `docs/CLOUD_COORDINATION_GUIDE.md` — update the `status` / `doctor` output
  examples if the rendered text changes shape.

## 2. Decision

### Chosen Approach

Extend the two renderers to consume the discriminated state the shared
contract already produces. No shared-service change, no new contract fields,
no business logic added to the CLI.

### Rationale

- The state already exists in `ProjectConnectionRead` and `CloudConnectionDiagnostics`; only the renderers throw it away.
- Keeping the change in the render layer preserves the CLI business-logic
  boundary (MDT-202 criterion #29): the CLI still only parses and renders.
- Each named state maps to an actionable operator response (fix the TOML for
  `malformed`, re-trust the origin for `untrusted`, authenticate for
  `authentication-required`, etc.), which is the whole point of `status` and
  `doctor`.

### CLI Business-Logic Boundary

All work stays in `cli/src/commands/cloud/`. The shared `diagnostics()` call is
unchanged. No readiness, provisioning, membership, or credential logic moves
into the CLI.

## 3. Acceptance Criteria

### `cloud status`

- [ ] `formatStatusHuman` renders a distinct, actionable string for each
  `ProjectConnectionRead` kind: absent (local-only), enabled-ready, disabled,
  malformed (with reason), and untrusted (with reason).
- [ ] Probe failure modes are surfaced distinctly: authentication-required,
  forbidden, unavailable (coordination_unavailable), and suspended
  (coordination_suspended), where supported by the shared contract.
- [ ] Stale and incompatible states render distinctly where the shared contract
  exposes them; states the contract does not expose are explicitly noted as
  not-applicable rather than invented.
- [ ] `--json` and `--yaml` output carry the discriminated `kind` and probe
  state, not a collapsed string.

### `cloud doctor`

- [ ] `cloudDoctorAction` emits checks for: project context, CONFIG_DIR
  connection state, trusted origin, credential availability, service
  readiness, membership, and coordinator reachability.
- [ ] Each check reports `ok` / `warn` / `fail` with a redacted, actionable
  detail; no credential, token, or secret appears in any check detail.
- [ ] `--json` and `--yaml` output carry the full check list with stable field
  names.

### Non-Functional

- [ ] No new business logic in the CLI; all state comes from the existing
  shared `diagnostics()` and credential-store calls.
- [ ] No credential, token, or secret appears in `status` or `doctor` output
  (human, JSON, or YAML).
- [ ] Existing exit-code mapping is reused; no new exit codes unless a new
  state genuinely requires one, documented in `exit-codes.ts`.

## 4. Verification

- Unit: render tests assert each `ProjectConnectionRead` kind and each probe
  failure mode produces the expected distinct string.
- Unit: doctor tests assert the seven named checks are present and that each
  returns `ok`/`warn`/`fail` for seeded fixture states.
- Unit: redaction tests assert no credential/token/secret leaks across all
  rendered states.
- Manual: run `mdt-cli cloud status` and `mdt-cli cloud doctor` against the
  bound production project (`35863af3-…`) and confirm the output reflects real
  state.
- `docs/CLOUD_COORDINATION_GUIDE.md` examples match the rendered output.

## 5. Deployment

CLI-only change; no Worker, D1, or shared-service deployment. Rollback by
reverting the renderer extension; the underlying diagnostics call is unchanged.
