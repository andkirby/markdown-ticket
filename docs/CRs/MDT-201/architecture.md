# Architecture: MDT-201

Canonical artifacts and obligations live in Spec Trace and render to
[`architecture.trace.md`](architecture.trace.md).

## Overview

MDT-201 adds one `CloudProjectManagementService` in `shared/`. It owns
readiness, initial provisioning, explicit connect, membership, diagnostics,
disable, and legacy migration. CLI and browser adapters only parse and render.

The architecture uses concrete files and functions. There is no provider
framework or repository-derived cloud identity.

## Data Model

### Cloud authority

`CloudProject` and `MembershipRecord` remain in D1. D1 owns the UUID, ticket
counter, projection revision, coordination state, roles, and revocation.

### Installation connection

`CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`:

```toml
version = 1
state = "enabled"
cloudProjectId = "8a4d..."
serviceOrigin = "https://mdt-sync.example.com"
pollIntervalSeconds = 15
```

The file is non-secret but device-local. Writes are atomic. Absence means a
genuinely local-only project; `state = "disabled"` is retained and fail-closed.

### Machine credential

`CONFIG_DIR/cloud-sync/credentials/{credentialRef}.toml`:

```toml
version = 1
kind = "cloudflare-service-token"
clientId = "..."
clientSecret = "..."
```

The containing directory and file are owner-only. The store returns credentials
only to backend/headless transports. Browser-facing DTOs expose status and the
non-secret principal ID, never secret values.

Human Access tokens remain managed by `cloudflared` and in memory.

## Module Boundaries

| Module | Responsibility |
| --- | --- |
| `project-management.ts` | One lifecycle contract; orchestration only |
| `management-coordinator.ts` | Management HTTP calls, audience routing, error envelopes, redirect denial |
| `project-state-store.ts` | Atomic CONFIG_DIR connection read/write and absent/enabled/disabled semantics |
| `credential-store.ts` | Owner-only machine credential installation and retrieval |
| `trusted-service-profile.ts` | Distribution defaults plus operator exact-HTTPS extensions |
| `legacy-binding-migration.ts` | Explicit import from repository binding; no hidden repository writes |
| `allocator-strategy.ts` | Absent → local; enabled → cloud; disabled/invalid → fail closed |

## Provisioning Idempotency

Before the first provisioning request, the client persists an idempotency key in
the existing CONFIG_DIR operation journal. The request includes that key and a
canonical request hash.

D1 stores a provisioning record keyed by the idempotency key:

- identical key and request hash returns the existing cloud project UUID;
- identical key with different content returns `idempotency_conflict`;
- first use creates the cloud project, initial owner membership, audit event,
  and idempotency record atomically;
- a uniqueness race re-reads the winning record.

This protects retries. It does not invent an unreliable repository fingerprint.
Only `enable` provisions; `connect` never does.

## Runtime Flows

### Enable

1. Resolve the trusted service profile.
2. Authenticate to the operator audience.
3. Persist the provisioning idempotency key.
4. Provision or recover the same cloud UUID.
5. Authenticate to the coordination audience and verify owner membership.
6. Write the CONFIG_DIR connection last.

### Connect

1. Accept the existing non-secret cloud project UUID.
2. Resolve the trusted coordination origin.
3. Authenticate personally or with the runtime machine credential.
4. Verify existing membership.
5. Write CONFIG_DIR connection state last.

### Machine installation

1. Create the Cloudflare service token through the operator-controlled
   Cloudflare procedure.
2. On the target runtime, install the client ID and secret into the CONFIG_DIR
   credential store.
3. Add only the verified non-secret machine principal ID to project membership.
4. Verify a protected coordination request.

MDT does not claim `ServiceTokenCredentialProvider` creates Cloudflare tokens.

### Disable

1. Suspend cloud coordination.
2. Atomically change local connection state to `disabled`.
3. Keep the UUID and origin for diagnostics and recovery.
4. Block ticket creation through allocator fail-closed selection.

Permanent detach is separate and follows the durable counter-reconciliation
procedure before deleting the connection.

### Legacy migration

1. Read legacy `[project.cloudSync]` only as migration input.
2. Reject a conflict with existing CONFIG_DIR state.
3. Verify origin and membership.
4. Import CONFIG_DIR state.
5. Leave repository files unchanged unless a separate explicit cleanup is
   acknowledged.

## Verification

- Local unit/integration tests cover state selection, credential permissions,
  provisioning retries, origin confinement, migration conflicts, revocation,
  and compatibility.
- The two-client harness proves provision-once plus explicit connect.
- A manual live smoke proves real Access audiences and the shared management
  service against the deployed Worker.
