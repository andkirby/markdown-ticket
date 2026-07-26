---
code: MDT-212
status: Proposed
dateCreated: 2026-07-26T09:45:39.731Z
type: Technical Debt
priority: Medium
relatedTickets: MDT-201,MDT-202
dependsOn: MDT-202
---

# Harden and complete multi-user cloud onboarding verification

## Problem

MDT-201 delivered working project-level cloud onboarding and a live cloud integration, but its final teammate verification exposed two follow-up gaps:

- the automated two-client test reuses the owner credential and its mock probe does not enforce caller identity or assigned role;
- the required live Access smoke has not yet exercised a second human principal connecting from an independent installation.

The implementation can ship, but these hardening and real-team validation steps need an explicit owner rather than remaining as ambiguous unchecked work in MDT-201.

## Scope

- Strengthen the two-client onboarding test with distinct owner and teammate principals.
- Make the fake coordinator resolve membership and role from the presented principal instead of accepting every credential as owner.
- Prove the teammate receives the configured role from two isolated client installations.
- Prove explicit connect reuses the existing cloud UUID, counter, memberships, and projections without provisioning or migration.
- Prove revocation blocks the teammate on the next protected operation from both installations.
- Run the live Cloudflare Access journey with a real second human when a teammate is available.
- Reconcile the live-onboarding evidence so PASS, deferred steps, and conclusion cannot contradict one another.
- Exercise the supported MDT-202 CLI journey when available.

## Out of Scope

- Redesigning MDT-201 onboarding or authorization.
- Shared passwords, copied human tokens, or reusable join secrets.
- Automating Git repository access.
- Treating Wrangler or direct D1 edits as the teammate workflow.

## Acceptance Criteria

- [ ] Automated onboarding tests use distinct owner and teammate credentials and validate identity-to-role mapping.
- [ ] One teammate principal connects from two isolated CONFIG_DIR installations to the same existing cloud project UUID.
- [ ] Both installations receive the teammate's assigned role and no additional cloud project is provisioned.
- [ ] Connect performs no counter, membership, or projection migration.
- [ ] Revoking the teammate blocks the next protected operation from both installations.
- [ ] A live second-human Access login and connect succeeds without a shared password or copied token.
- [ ] Live evidence records the Access identity, project role, connection result, first protected operation, and revocation using redacted output.
- [ ] `cloud/test/operations/live-onboarding.md` contains one unambiguous final status with no deferred step described as passed.
- [ ] Relevant shared, cloud, CLI, and Spec Trace validations pass.

## Verification Notes

A second physical device is not required. Two isolated CONFIG_DIR roots and separate personal Access sessions are sufficient. The live step requires a distinct human Access identity; a machine service token does not satisfy it.
