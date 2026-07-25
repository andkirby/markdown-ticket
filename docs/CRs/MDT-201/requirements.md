# Requirements: MDT-201

Canonical requirement rows live in Spec Trace and render to
[`requirements.trace.md`](requirements.trace.md). This document records the
chosen semantics that downstream stages must preserve.

## Scope

MDT-201 provides one reusable cloud project management service for readiness,
provisioning, explicit connect, membership, diagnostics, disable, credential
installation, and legacy migration. MDT-202 and MDT-203 remain thin
presentation adapters.

## Authority and Storage

| Data | Authority and location |
| --- | --- |
| Project UUID, membership, counter, projections, coordination state | Cloud D1 |
| Installation connection | `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml` |
| Machine Access credential | `CONFIG_DIR/cloud-sync/credentials/{credentialRef}.toml` |
| Human Access session | Managed by `cloudflared`; MDT does not persist the short-lived token |
| Repository `.mdt-config.toml` and `CONFIG_DIR/projects/{localProjectId}.toml` registry entry | Project discovery and Markdown metadata only; no cloud connection or credential |

The connection record has exactly these fields:

- `version`;
- `state = "enabled" | "disabled"`;
- `cloudProjectId`;
- `serviceOrigin`;
- `pollIntervalSeconds`.

The machine credential record contains the service-token client ID and secret,
is written atomically, and is readable only by its owner. It is never returned
through browser-facing management DTOs.

## State Selection

| Local state | Ticket creation |
| --- | --- |
| Connection absent | Existing local-only behavior |
| Connection enabled and verified | Cloud coordinator allocation |
| Connection disabled | Fail closed |
| Connection malformed or untrusted | Fail closed |

This state table is the design. Do not infer “formerly cloud-bound” from logs,
journals, Git history, or caches.

## Lifecycle Decisions

- `enable` is the single explicit operation that provisions a new cloud
  project.
- The client journals an idempotency key before provisioning. Matching retries
  return the same UUID; changed request content with the same key fails.
- `connect` accepts an existing cloud project UUID, authenticates against the
  coordination audience, verifies membership, and then writes CONFIG_DIR state.
  It never provisions.
- `disable` suspends coordination first and retains the local connection as
  disabled.
- Returning to local numbering is a separate permanent-detach procedure with
  explicit acknowledgement and counter reconciliation.
- Legacy repository cloud bindings are migration input only. Import is explicit,
  conflict-safe, and never silently edits repository files.

## Security Decisions

- The privileged provisioning origin and operator audience come only from the
  trusted service profile.
- Repository data cannot add trust or select the provisioning endpoint.
- Human authentication uses personal Access sessions.
- Machine membership requests contain the non-secret machine principal ID, not
  the client secret.
- Cloud membership and Git repository access remain independent.

## Open Documentation Details

- Exact Git-host prerequisite wording.
- Distribution/update mechanism for product-controlled trusted profiles.

Neither changes the behavioral contract.
