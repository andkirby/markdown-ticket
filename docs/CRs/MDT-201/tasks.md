# Tasks: MDT-201

Canonical task ownership and GREEN links live in Spec Trace and render to
[`tasks.trace.md`](tasks.trace.md). Scope is `domain-contracts/`, `shared/`,
the narrow provisioning change in `cloud/`, and durable docs. No CLI or browser
implementation belongs here.

## Delivery Order

1. **TASK-1 — contracts and skeletons**
   - Define connection state, credential status, audience, provisioning, and
     management DTOs.
   - Verify shared build and existing suites.

2. **TASK-2 — credential store**
   - Implement atomic owner-only CONFIG_DIR machine credential files.
   - Evolve providers to resolve by audience without exposing secrets.

3. **TASK-3 — trusted service profile**
   - Compose distribution defaults and operator exact-HTTPS extensions.
   - Repository data supplies no trust or endpoint.

4. **TASK-4 — project state store**
   - Implement `project-state-store.ts`.
   - Encode absent, enabled, disabled, malformed, and untrusted outcomes.

5. **TASK-5 — management HTTP coordinator**
   - Implement probe, members, coordination-state, and provision calls.
   - Preserve allowlist-before-credential, redirect denial, and typed errors.

6. **TASK-provision-idempotency — cloud retry safety**
   - Add the D1 provisioning-idempotency migration.
   - Make provisioning atomically replay identical requests and reject
     conflicting key reuse.

7. **TASK-6 — enable and connect**
   - Enable: journal key → operator provision → coordination probe → state write.
   - Connect: coordination auth → membership probe → state write; never provision.

8. **TASK-7 — membership and revocation**
   - Manage human and machine principal IDs through the existing members API.
   - Keep machine secrets out of membership requests.

9. **TASK-8 — identity and isolation**
   - Cloud checks remain authoritative on every protected operation.
   - Preserve non-disclosure for unknown and non-member lookups.

10. **TASK-9 — disable**
    - Suspend coordination and retain state disabled.
    - Update allocator selection so only absent state is local.

11. **TASK-10 — compatibility and legacy migration**
    - Explicitly import legacy repository bindings into CONFIG_DIR.
    - Reject conflicts and avoid hidden repository edits.
    - Preserve genuine local-only and multi-project behavior.

12. **TASK-11 — integration and live smoke**
    - Prove one provision plus explicit second-client connect locally.
    - Complete the deployed Access onboarding evidence.

13. **TASK-12 — durable docs**
    - Reconcile `CLOUD_COORDINATION_GUIDE.md`,
      `docs/architecture/cloud-sync/`, and configuration specifications.
    - Document connect, credential installation, disable, migration, Git
      separation, and permanent detach.

## Implementation Gates

- Every canonical test plan is GREEN.
- Normal and strict Spec Trace validation pass.
- No repository cloud binding is written.
- No disabled connection can select local allocation.
- No machine secret appears in logs, API DTOs, membership requests, or project
  files.
- `cloud/**` changes are limited to provisioning idempotency.
- MDT-202 and MDT-203 remain presentation-only handoffs.
