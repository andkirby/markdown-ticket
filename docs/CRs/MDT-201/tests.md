# Tests: MDT-201

Canonical plans live in Spec Trace and render to
[`tests.trace.md`](tests.trace.md). Executable files are created during
implementation.

## Required Proof

| Area | Plans |
| --- | --- |
| CONFIG_DIR state | `TEST-binding-writer`, `TEST-pm-enable-commit-last`, `TEST-pm-disable-no-local-resume`, `TEST-local-only-compat` |
| Provision retry | `TEST-provision-idempotency` |
| Credential safety | `TEST-credential-store`, `TEST-machine-credential-local`, `TEST-binding-no-persisted-secret` |
| Origin and audience | `TEST-trusted-service-profile`, `TEST-credential-audience`, `TEST-mgmt-coordinator-envelope` |
| Authorization | `TEST-mgmt-coordinator-authorization`, `TEST-device-state-non-authoritative`, `TEST-multi-project-isolation` |
| Migration | `TEST-legacy-binding-migration` |
| Multi-client | `TEST-two-client-onboarding` |
| Real deployment | `TEST-live-access-onboarding` |
| Documentation | `TEST-onboarding-docs` |

## Non-Negotiable Assertions

- No connection record selects local allocation unless the record is absent.
- Disabled, malformed, or untrusted state fails closed.
- An identical provisioning retry returns the same UUID; conflicting reuse
  fails.
- Repository and project-registry files contain no cloud connection or
  credential fields.
- Machine credentials are atomic, owner-only, per-runtime, redacted, and absent
  from membership requests and browser-facing DTOs.
- Connect verifies membership before writing state and never calls provision.
- Legacy migration rejects conflicts and never silently modifies the repository.
- Revocation blocks the next protected operation despite a valid local session.

## Harness Decision

The local D1/Workers harness proves deterministic behavior. It cannot prove
Cloudflare Access configuration, so `TEST-live-access-onboarding` is a required
manual gate using the reusable management service—not the future CLI or UI.

## Commands

```bash
bun test shared/services/cloud-sync/__tests__/
bun test --cwd cloud
spec-trace validate MDT-201 --stage tests
```
