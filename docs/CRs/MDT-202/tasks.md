# Tasks: MDT-202

Canonical task rows live in Spec Trace and render to
[`tasks.trace.md`](tasks.trace.md). Order is the implementation order.

| # | Title | Owns | Makes green |
| --- | --- | --- | --- |
| TASK-1 | Add the shared management-service composition seam | ART-shared-mgmt-factory | TEST-factory-wiring, TEST-enable-idempotent, TEST-connect-no-provision |
| TASK-2 | Add cloud command DTO/options parsing + centralized exit-code mapping | ART-cli-cloud-options, ART-cli-cloud-exit | TEST-options-parse, TEST-exit-codes, centralized_exit_codes |
| TASK-3 | Add renderers with redaction, confirm gate, hidden secret prompt | ART-cli-cloud-render, ART-cli-cloud-confirm, ART-cli-cloud-secret | TEST-render-redact, TEST-confirm-gate, TEST-secret-stdin, non_interactive_no_hang, credentials_status_redacted |
| TASK-4 | Register cloud command group + generated guide; wire runCliAction exit mapping; own the e2e dir | ART-cli-cloud, ART-cli-index-register, ART-cli-guide, ART-e2e-cloud | TEST-e2e-help-guide, help_and_guide_surface |
| TASK-5 | Implement enable/login/connect/status/doctor adapters | — | TEST-e2e-*, enable_*, login_*, connect_*, teammate_*, status_states, doctor_redacted |
| TASK-6 | Implement members add/remove/list adapters | — | TEST-e2e-members, members_* |
| TASK-7 | Implement credentials install/status/remove adapters | — | TEST-e2e-credentials, TEST-e2e-redaction-sweep, credentials_* |
| TASK-8 | Implement disable + migrate-legacy with confirmation | — | TEST-e2e-disable, TEST-e2e-migrate, TEST-disable-fail-closed, TEST-migrate-conflict, disable_*, migrate_* |
| TASK-9 | Update docs/CLOUD_COORDINATION_GUIDE.md with owner + teammate journeys | ART-doc-cloud-guide | — |
| TASK-10 | Full verification: builds, lint, changed TS, spec-trace strict, redaction sweep | — | TEST-e2e-output-formats, TEST-e2e-non-interactive, TEST-local-only-unchanged, output_formats |

## Implementation order rationale

1. **TASK-1 first** — the shared seam unblocks every CLI adapter. Without it,
   the CLI cannot construct `CloudProjectManagementService` without dragging
   business wiring into `cli/`.
2. **TASK-2/3** — parsing, exit codes, renderers, confirm, and the secret
   prompt are the presentation primitives every command uses.
3. **TASK-4** — command registration makes `cloud --help` work end-to-end
   (closes the help/guide scenario early).
4. **TASK-5–8** — the adapters, in dependency order: lifecycle first, then
   membership, then credentials (secret path), then destructive ops.
5. **TASK-9** — docs once the command surface is final.
6. **TASK-10** — verification gate before User Review.

## Verification gate (TASK-10)

```bash
bun run build:shared && bun run build:domain-contracts && bun run --cwd cli build
bun test cli/tests/e2e/cloud
bun test shared/services/cloud-sync/__tests__
bun run validate:ts
bun run lint:all
spec-trace validate MDT-202 --stage all --strict
git diff --check
```
