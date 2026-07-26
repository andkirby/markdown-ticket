# Tests: MDT-202

Canonical test-plan rows live in Spec Trace and render to
[`tests.trace.md`](tests.trace.md). Every requirement (BR/C/Edge) and every
BDD scenario maps to an exact verification path.

## Test layers

| Layer | Where | What |
| --- | --- | --- |
| Unit | `cli/src/commands/cloud/__tests__/*.test.ts` | option parsing, render redaction, exit-code mapping, confirm gating, secret-prompt stdin path |
| Integration | `shared/services/cloud-sync/__tests__/create-management-service.test.ts` | factory wiring against a fake coordinator |
| E2E (black-box) | `cli/tests/e2e/cloud/*.spec.ts` | real `mdt-cli` child process, isolated CONFIG_DIR, fake coordinator + fake cloudflared |

## Unit coverage

- **TEST-options-parse** — every subcommand and option maps to a typed
  request DTO; unknown options rejected; mutually exclusive `--json`/`--yaml`.
- **TEST-render-redact** — success and error renderers (human/JSON/YAML) emit
  none of: `clientSecret`, `authorization`, `cookie`, `jwt`, token substrings.
  Covers C-5, C-6, Edge-8.
- **TEST-exit-codes** — each `CoordinatorError` code, `ProjectStateFormatError`,
  `UntrustedServiceOriginError`, `NO_PROJECT_CONTEXT`, and
  non-interactive-confirmation map to the documented exit number. Covers
  BR-5.2, C-7, Edge-5.
- **TEST-confirm-gate** — non-TTY + destructive command without `--yes` →
  `CONFIRMATION_REQUIRED` (12), no prompt attempted. Covers Edge-5.
- **TEST-secret-stdin** — secret read from stdin when non-TTY; from hidden
  prompt when TTY (mocked); empty/whitespace secret fails closed, no file
  written. Covers BR-3.1, C-6, Edge-8.

## Integration coverage

- **TEST-factory-wiring** — `createManagementService` produces a service whose
  `enable`/`connect`/`disable` call the injected fake coordinator the expected
  number of times; state lands under the injected `configDirRoot`. Covers
  OBL-1, OBL-2.
- **TEST-enable-idempotent** — second `enable` with a valid connection → zero
  provision calls, existing UUID returned. Covers BR-1.5, Edge-6.
- **TEST-connect-no-provision** — `connect` path issues zero provision calls
  under all inputs. Covers BR-1.7, Edge-9.
- **TEST-disable-fail-closed** — after `disable`, the store reads `disabled`;
  allocator selection fails closed (verified through the existing allocator
  strategy contract). Covers BR-4.1, Edge-3.
- **TEST-migrate-conflict** — migrate-legacy against an existing non-absent
  connection exits non-zero, writes nothing. Covers BR-4.2, Edge-7.

## E2E (black-box) coverage

Run with `bun test cli/tests/e2e/cloud`. Each spec uses
`@mdt/shared/test-lib` for an isolated temp CONFIG_DIR and project.

- **TEST-e2e-enable** — `cloud enable --owner` in a temp project: one
  provision (fake coordinator records call count), connection file written
  under CONFIG_DIR, `.mdt-config.toml` and registry unchanged. Covers
  BR-1.1, BR-1.2, BR-1.4, C-1, Edge-1, Edge-4.
- **TEST-e2e-enable-503** — fake coordinator returns 503
  `service_not_ready`; exit code 8 (`COORDINATION_UNAVAILABLE`); no
  connection file. Covers BR-1.3, Edge-4.
- **TEST-e2e-enable-idempotent** — second enable → exit 0, same UUID,
  fake coordinator provision count stays at 1. Covers BR-1.5, Edge-6.
- **TEST-e2e-login** — `cloud login` obtains a session (fake cloudflared);
  connection file unchanged. Covers BR-1.6.
- **TEST-e2e-connect** — `cloud connect <uuid>` → connection written,
  fake coordinator provision count zero, role printed. Covers BR-1.7.
- **TEST-e2e-two-clients** — two isolated CONFIG_DIR temp dirs; client A
  enables, client B connects to the same UUID; B's provision count zero;
  both target the same cloud project id. Covers BR-1.8, Edge-2.
- **TEST-e2e-status-states** — drive absent/enabled/disabled/malformed/untrusted
  fixtures + coordinator authentication-required/forbidden/unavailable/suspended;
  assert distinct messages + exit codes. Covers BR-1.9.
- **TEST-e2e-doctor-redacted** — `cloud doctor` output contains no secret
  substring; checks listed. Covers BR-1.10, C-5.
- **TEST-e2e-members** — list (owner ok / non-owner forbidden), add (no
  secret in argv or body), remove (prompts unless `--yes`). Covers BR-2.1,
  BR-2.2, BR-2.3, BR-2.4.
- **TEST-e2e-credentials** — install via stdin (secret never in argv),
  status redacted, remove prompts. Covers BR-3.1, BR-3.2, C-6, Edge-8.
- **TEST-e2e-disable** — `cloud disable --yes` → state disabled; subsequent
  ticket create fails closed; local numbering does not resume. Covers
  BR-4.1, Edge-3.
- **TEST-e2e-migrate** — migrate-legacy conflict rejected; success imports
  CONFIG_DIR only, repo file unchanged. Covers BR-4.2, Edge-7.
- **TEST-e2e-output-formats** — every command with `--json` and `--yaml`
  emits valid structured output with no secret. Covers BR-5.1.
- **TEST-e2e-non-interactive** — destructive commands without `--yes` in a
  non-TTY harness exit 12 immediately. Covers Edge-5.
- **TEST-e2e-help-guide** — `cloud --help` and generated guide list the
  approved command set; no provider-specific workflow. Covers BR-6.1, C-4.
- **TEST-e2e-redaction-sweep** — for a matrix of commands and outputs,
  grep stdout/stderr/JSON/YAML/written files for a known secret sentinel
  injected via the fake credential; assert zero matches. Covers C-5, C-6.

## Verification commands

```bash
bun run build:shared
bun run build:domain-contracts
bun run --cwd cli build
bun test cli/tests/e2e/cloud          # E2E
bun test shared/services/cloud-sync/__tests__  # integration
bun run validate:ts                   # changed TS
bun run lint:all
spec-trace validate MDT-202 --stage all --strict
```

## Live smoke (where credentials are available)

Manual, against the Access-protected deployment. Not gated by automated CI.
Each item must be exercised to be claimed:

1. Existing enabled project reports `ready` under `cloud status`.
2. `cloud doctor` passes without exposing credentials.
3. Owner runs `cloud members list`.
4. A second isolated CONFIG_DIR connects using the existing UUID without
   provisioning.
5. Both installations operate against the same cloud project.
6. Revocation denies the second principal on the next protected operation.
7. `cloud disable --yes` retains a `disabled` record and does not resume
   local numbering.
