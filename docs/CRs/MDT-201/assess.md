# Assessment: MDT-201

## Verdict

**Recommendation: redesign the client lifecycle inline.**

MDT-200 provides the cloud coordination runtime, but its local binding and
credential assumptions are not suitable for public or forkable repositories.
MDT-201 should correct that boundary while adding the reusable project
management lifecycle.

## Current Facts

- `[project.cloudSync]` currently lives in repository-local
  `.mdt-config.toml`.
- The allocator currently treats a missing or `enabled = false` binding as a
  local-only project.
- `ServiceTokenCredentialProvider` reads credentials from the process
  environment; it does not install or persist them.
- `POST /v1/admin/projects` creates a fresh UUID for every request and has no
  retry-idempotency contract.
- The cloud already owns project UUIDs, membership, counters, projections, and
  coordination state.

## Corrected Model

| Concern | Decision |
| --- | --- |
| Cloud authority | D1 remains authoritative for project identity, membership, numbering, projections, and coordination state |
| Local connection | `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml` |
| Machine credential | `CONFIG_DIR/cloud-sync/credentials/{credentialRef}.toml`, atomic and owner-only |
| Repository config | Contains no cloud enablement, cloud UUID, service origin, or credential |
| New clone | Uses explicit `connect` with the existing cloud project UUID; connect never provisions |
| Local selection | No connection means local-only; enabled means cloud; disabled remains fail-closed |
| Disable | Suspend cloud coordination and retain the disabled connection |
| Permanent detach | Separate acknowledged procedure; ordinary disable never resumes local numbering |
| Provision retry | Journal one idempotency key before the request; identical retries return the same UUID |

This keeps the data structure simple. There is no repository-derived cloud
identity, device-derived authorization, provider registry, or implicit project
discovery.

## Required Changes

1. Add CONFIG_DIR project-state and machine-credential stores.
2. Change allocator selection to distinguish absent from disabled state.
3. Add a shared management coordinator and lifecycle service.
4. Add provisioning retry idempotency to the Worker and D1.
5. Support explicit, non-destructive migration from legacy
   `[project.cloudSync]`.
6. Verify the service both locally and against the live Access-protected Worker.

## Scope Boundary

- MDT-201 owns reusable contracts, shared lifecycle behavior, CONFIG_DIR
  storage, provisioning idempotency, migration, and durable onboarding docs.
- MDT-202 owns CLI parsing, output, help, and CLI E2E.
- MDT-203 owns browser Project Settings and its approved UI/UX source of truth.
- Git-host access remains separate from cloud membership.

## Principal Risks

- A disabled connection accidentally selecting local numbering.
- A timed-out provisioning request creating a duplicate project.
- Machine secrets leaking through repository state, API DTOs, or logs.
- A repository-controlled origin redirecting privileged provisioning.
- Legacy binding migration silently dirtying an OSS checkout.

Every risk has an explicit architecture obligation and test plan.
