# BDD: MDT-202

Canonical scenarios live in Spec Trace and render to
[`bdd.trace.md`](bdd.trace.md). Each behavior requirement (BR-*) has at least
one testable scenario. Constraints (C-*) and edge cases (Edge-*) are verified
in the test stage, not here.

## Enable journey (owner)

- **enable_detects_project** — refuses outside a configured project; `NO_PROJECT_CONTEXT`.
- **enable_readiness_gate** — trusted profile + operator audience + readiness
  gate before provisioning; a real `503 service_not_ready` leaves state
  unchanged. (Covers BR-1.2 and BR-1.3.)
- **enable_provisions_once_writes_config_dir** — exactly one provision call;
  CONFIG_DIR written commit-last; `.mdt-config.toml` and registry untouched.
- **enable_idempotent_rerun** — repeated `enable` reports the existing UUID,
  zero provision calls.

## Login journey

- **login_no_state_change** — obtain/refresh Access session; connection and
  membership unchanged. Login alone does not bind a clone.

## Connect journey (teammate / new clone)

- **connect_verifies_membership_no_provision** — coordination audience,
  membership probe, CONFIG_DIR commit-last, role reported, zero provision calls.
- **connect_revoked_uuid** — forbidden/not-found UUID exits non-zero, writes
  nothing.
- **teammate_connect_journey** — two isolated CONFIG_DIR clients share one
  UUID; the second performs zero provisions.

## Status / doctor

- **status_states** — distinct actionable output + exit code for each
  contract-supported state.
- **doctor_redacted** — actionable checks, no secret value in output.

## Membership

- **members_list_owner_only** — non-owner gets `forbidden`, no list.
- **members_add_no_secret** — machine principal id only; secret never accepted
  or printed.
- **members_remove_confirms** — prompts unless `--yes`.

## Credentials

- **credentials_install_secret_from_stdin** — secret from stdin or hidden
  prompt, never argv; owner-only store; empty secret fails closed.
- **credentials_status_redacted** — principal id + kind only.
- **credentials_remove_confirms** — prompts unless `--yes`.

## Disable / migrate

- **disable_retains_disabled_fail_closed** — state → `disabled`; ticket
  creation stays fail-closed; local numbering does not resume.
- **migrate_legacy_conflict_safe** — conflict rejected, nothing written; on
  success, only CONFIG_DIR imported, repository files untouched.

## Cross-cutting

- **output_formats** — every command honors `--json`/`--yaml`.
- **centralized_exit_codes** — one mapping, no inline `process.exit`.
- **non_interactive_no_hang** — no TTY + confirmation required → non-zero
  exit, no hang.
- **help_and_guide_surface** — `--help` and generated guide list the approved
  command set with no provider-specific workflow.

## Full Given/When/Then

The canonical Given/When/Then text for every scenario is in
[`bdd.trace.md`](bdd.trace.md).
