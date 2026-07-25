# Cloud Coordination Guide

This guide covers setup, onboarding, credentials, recovery, and disablement for
Markdown Ticket's opt-in cloud coordination (MDT-200). The permanent
architecture lives in
[`docs/architecture/cloud-sync/`](architecture/cloud-sync/README.md); this is the
operator and user-facing how-to.

## What cloud coordination does

Two outcomes only:

1. Allocates collision-free ticket numbers across separate clones and processes.
2. Exposes a versioned, read-only projection of ticket headers between Git
   synchronizations.

It does **not** make the cloud a ticket-content authority. Markdown/Git remains
authoritative for ticket bodies and the projected header fields.

## Opt-in per project

Cloud binding is opt-in per project. A project with no `[project.cloudSync]`
section behaves exactly as before — local `highest + 1` allocation, no cloud
calls. See [`docs/CONFIG_SPECIFICATION.md`](CONFIG_SPECIFICATION.md) for the
binding schema.

Enable a binding only after the project is provisioned and a membership probe
succeeds:

```toml
# .mdt-config.toml
[project.cloudSync]
enabled = true
projectId = "018f5e6c-6f32-7c5b-9e76-97c7c769c123"
serviceUrl = "https://mdt-sync.example.com"
pollIntervalSeconds = 15
```

## Canonical project activation procedure

MDT-201 owns this reusable procedure. MDT-202 presents it through the CLI, and
MDT-203 presents it through Project Settings after approved UI designs exist.
Adapters may change presentation, but must not change the ordered lifecycle or
implement it independently.

### Enable cloud sync (operator and initial owner)

1. Resolve the local project and determine a starting number greater than every
   existing ticket number.
2. Verify the trusted service profile, deployment readiness, and compatible
   coordination capabilities.
3. Authenticate the human against the operator Access application.
4. Begin or resume one idempotent provisioning operation.
5. Provision the cloud project, initial owner membership, counter, and
   projection namespace.
6. Validate the returned cloud project UUID.
7. Authenticate against the coordination application and verify the initial
   owner membership.
8. Atomically write the non-secret project binding as the final step.
9. Report the project as ready only after a final status probe succeeds.

Failure before step 8 leaves project configuration unchanged. A timeout after
provisioning resumes the same provisioning operation; it must not create a
second cloud project. Tokens and assertions remain inside the credential
provider throughout the procedure.

### Connect an existing clone or teammate

1. Read the existing non-secret project binding from the repository.
2. Validate the coordination origin against the trusted service profile.
3. Authenticate the person through the coordination Access application.
4. Probe the bound cloud project and verify existing membership.
5. Report ready, forbidden, unavailable, suspended, or incompatible without
   changing the binding or provisioning another project.

Connecting never calls the operator provisioning endpoint. Cloud membership
and Git repository access remain separate prerequisites.

### Procedure ownership

- This guide is the durable source of truth for user-visible step order,
  prerequisites, recovery, and completion outcomes.
- [`docs/architecture/cloud-sync/`](architecture/cloud-sync/README.md) owns
  identity, authorization, data, consistency, and operational invariants.
- Approved MDT-203 design artifacts own UI layout, interaction, copy,
  accessibility behavior, responsive behavior, and visual states.
- Ticket recommendations and adapter help must refer to these owners instead of
  creating competing procedures.

## Operator setup

Until MDT-201/202 provide the supported orchestration and CLI, the following is
the manual operator fallback for establishing the same binding.

### 1. Configure the origin allowlist (global)

Before any client can reach a coordination service, the operator allowlists the
origin in the global `CONFIG_DIR/config.toml`:

```toml
[cloudSync]
allowedOrigins = ["https://mdt-sync.example.com"]
```

The default denies custom origins. The distribution-provided coordination
origin remains trusted; project files cannot expand the trusted set.

### 2. Provision a cloud project (operator)

Call the operator endpoint with the operator Access audience:

```bash
POST https://mdt-sync-admin.example.com/v1/admin/projects
{
  "projectCode": "MDT",
  "initialOwnerEmail": "owner@example.com",
  "initialNextTicketNumber": 201
}
```

`initialNextTicketNumber` must be greater than the highest ticket number in the
local repository. The Worker returns the cloud project UUID once; the local
owner writes the non-secret binding only after a membership probe succeeds.

### 3. Onboard members

- **Human**: an owner adds the normalized email. The member authenticates
  through Cloudflare Access (IdP login).
- **Machine**: an Access administrator creates a named, expiring service token;
  an owner adds its verified client ID (`common_name`) as a machine member.

Roles: `viewer` (read + poll), `contributor` (reserve + publish), `owner`
(membership management). The final owner cannot be removed or demoted.

## Credentials

Credentials never live in `.mdt-config.toml` or the registry.

| Caller | Credential | Channel |
| --- | --- | --- |
| Browser (human) | short-lived Access app token | `cloudflared` obtains it; local server holds it in memory only |
| Interactive CLI / stdio MCP (human) | same | `cloudflared access token -app=<origin>` |
| Headless MCP / automation (machine) | Access service token | `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` in the process secret channel |

Every adapter requires the project `serviceUrl` to exactly match an
`allowedOrigins` entry before attaching any credential, and rejects redirects.

Existing browser, CLI, and MCP ticket-create operations all enter the same
shared `TicketService` orchestration. MDT-202 adds dedicated `mdt cloud`
management commands; it is not required for normal ticket creation once the
project binding exists.

The browser polls header projections through
`GET /api/projects/{projectId}/cloud-projections`. That local endpoint is
owner-only and keeps Access credentials on the server side.

## Recovery

Cloud-bound creation is online-only. If coordination is unavailable, creation
stops with a recoverable error and **never** falls back to a local number.
Existing Markdown tickets remain readable and editable during an outage.

The local operation journal (`CONFIG_DIR/cloud-sync/journals/`, mode `0600`,
atomic write-and-rename) survives these boundaries:

| Last durable point | Recovery |
| --- | --- |
| Intent exists, no reservation response | Retry the same idempotency key |
| Reservation exists, no local file | Retry the same atomic file creation |
| Local file exists, no acknowledgement | Re-read header and retry acknowledgement |
| Acknowledgement done, journal not cleared | Replay acknowledgement, then clear |

## Disable a project

Disabling one client does not stop allocations by others. Follow the
project-wide suspend + detach sequence (see
[`architecture/cloud-sync/data-and-consistency.md`](architecture/cloud-sync/data-and-consistency.md))
before resuming local numbering. After detach, all ticket files remain usable
from Markdown/Git.

## Vendor exit

See [`architecture/cloud-sync/operations.md`](architecture/cloud-sync/operations.md)
§ Disable and Vendor Exit. The cloud export (projects, memberships, reservations,
projections, audit) must be taken **before** decommissioning Access apps,
service tokens, Worker routes, and D1.

## Deployment

The Worker is `cloud/` in this repository; `cloud/wrangler.jsonc` is the
deployment source of truth. Migrations are forward-only and applied with
`wrangler d1 migrations apply`. See
[`architecture/cloud-sync/operations.md`](architecture/cloud-sync/operations.md)
for the full release, rollback, backup, and restore procedures.
