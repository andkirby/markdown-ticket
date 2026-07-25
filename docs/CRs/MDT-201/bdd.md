# BDD: MDT-201

Canonical scenarios live in Spec Trace and render to
[`bdd.trace.md`](bdd.trace.md).

## Acceptance Strategy

- Twelve principal-facing scenarios cover every BDD-routed behavior.
- Scenarios describe cloud UUIDs, CONFIG_DIR connection state, membership, and
  Access audiences—not internal class layouts.
- Initial activation is one explicit operator action. Retry idempotency protects
  a lost response; it does not pretend two unrelated enable commands identify
  the same repository.
- Every other installation uses explicit `connect`, which never provisions.

## Journeys

| Journey | Scenarios |
| --- | --- |
| Provision and connect | `provision_once_resolves_same_uuid`, `non_operator_owner_cannot_provision`, `repo_cannot_redirect_provisioning_endpoint` |
| Membership | `owner_adds_human_and_machine_members`, `teammate_joins_by_personal_auth`, `revocation_project_scoped_and_protects_final_owner` |
| Identity | `device_local_state_never_grants_identity`, `unknown_or_non_member_non_disclosure` |
| Lifecycle | `one_management_contract_no_presentation_logic`, `disable_never_resumes_local_numbering` |
| Compatibility | `local_only_unchanged_with_capability_present`, `legacy_binding_migrates_explicitly` |

## Verification Decision

MDT-201 has no browser or CLI surface, so Playwright and CLI E2E belong to
MDT-203 and MDT-202. MDT-201 uses:

1. a local two-client integration contract against the Workers/D1 harness; and
2. a required manual smoke through the reusable management service against the
   deployed Access-protected Worker.

The decision is closed. It is not “spec-only” and is not deferred to a later
stage.
