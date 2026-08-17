# Team Sync Use Cases

## Purpose

This document answers one question: when two or three team members work on
tickets at the same time, what does the system synchronize, through which
transport, and with what expectation. It is the scenario catalog that sits
above the rule documents; when this document and a rule document disagree,
the rule document wins and this one must be fixed.

Rule owners:

- Allocation, projection writes, stream, and journal contracts:
  [Data and consistency](data-and-consistency.md)
- Membership, roles, credential flows: [Identity and access](identity-and-access.md)
- Gates, alerts, and incident runbooks: [Operations](operations.md)

## Team Model

Each member runs their own installation (browser + local server + clone) against
one shared Git remote and one cloud project. There is no shared application
server. The design scale is a small team; nothing here assumes more than a
handful of concurrent installations per cloud project.

Three transports carry synchronization, and they are not interchangeable:

| Transport | Carries | Direction | Authority |
| --- | --- | --- | --- |
| Local server events (SSE, poll backup) | Everything, within one installation | Tabs of one installation | Local Markdown |
| Git | Ticket bodies and canonical headers, between installations | Clone to clone | Markdown/Git |
| Cloud coordination | Ticket-number allocation and read-only header projections, between installations | Installation to installation | D1 for numbers and projection versions |

Projected headers are the full set `code`, `title`, `status`, `type`,
`priority`, `assignee`, `date_created`, `last_modified`. Column and status
changes are projected. Bodies, subdocuments, and everything else in the
Markdown file are never projected and never leave Git.

## Use Case Catalog

| # | Scenario | Status |
| --- | --- | --- |
| UC-1 | One member, several browser tabs | Live |
| UC-2 | Canonical content between members | Live (Git) |
| UC-3 | Concurrent ticket creation | Implemented; deployed drills pending |
| UC-4 | Header change visible before Git sync (push) | Implemented; production-blocked, see Known Gaps |
| UC-5 | Remote header change appears locally (stream) | Implemented behind rollout flag, default off |
| UC-6 | Same header edited on two clones | Implemented; reconciliation is explicit |
| UC-7 | Delete and restore | Implemented |
| UC-8 | Cloud unreachable or disabled | Implemented (fail-closed) |
| UC-9 | Credential absent or expired | Implemented; recovery is an owner action |
| UC-10 | Membership revoked or project suspended | Implemented; deployed revocation gate pending |
| UC-11 | Adding the second and third member | Onboarding implemented; hardening proposed |
| UC-12 | Editing a ticket that predates cloud sync | Gap: operator import not implemented |

### UC-1: One member, several browser tabs

One installation serves any number of tabs. Edits go through the local API,
the file watcher broadcasts ordinary ticket events over SSE, and polling is the
backup. Cloud behavior is irrelevant here: tabs of one installation never open
cloud connections, and additional tabs add no cloud traffic.

### UC-2: Canonical content between members

Ticket bodies, workflow subdocuments, and every canonical header field travel
through Git and only Git. The cloud never stores or transfers a body and never
writes a projected value back into Markdown. When two members edit the same
body, they reconcile the same way any Git repository does. This is a design
boundary, not a missing feature.

### UC-3: Concurrent ticket creation

Two or three members press "create" at the same time. Each installation
journals its intent and idempotency key, then reserves a number through one
D1 transaction. Numbers never collide and are never reused; abandoned
reservations leave gaps, which is accepted. Creation requires a live
coordinator: an offline member cannot create a cloud-bound ticket, and there
is no local fallback numbering while a project is connected. The contract is
[Data and consistency](data-and-consistency.md); the operational drill
coverage is still pending (`MDT-222`, Proposed).

### UC-4: Header change visible before Git sync (push)

A member changes a ticket's status, title, priority, or assignee. Expected
chain: the local edit succeeds immediately; a journal entry records the
desired header; a drain performs one conditional `PUT` with the last known
projection version; D1 commits a new projection version and project revision;
the project hub broadcasts the delta. Teammates' installations apply the delta
to their read models (UC-5) and their boards show the new status before any
Git push/pull happens.

Failure modes are the journal states: transient failures retry with bounded
backoff; authentication failures pause the project; version conflicts go to
UC-6; a ticket with no D1 row becomes `unmanaged` (UC-12). A local edit never
blocks on the cloud, and the cloud state never overwrites the local file.

Production note: on 2026-08-15 pushes are not flowing on either deployed
project — no valid credential in the server process, and the journal retry
runner is currently started only inside the rollout-gated stream bootstrap
(see Known Gaps). The journal entry for a status change sitting at `pending`
or `authentication_paused` is the system working as fail-closed designed, not
data loss.

### UC-5: Remote header change appears locally (stream)

Each installation holds at most one Access-authenticated WebSocket per cloud
project, opened with a short-lived hub grant and the last applied project
revision. The hub sends catch-up deltas then `ready`; live deltas follow
commits. The local server applies revisions idempotently, persists the cursor
only after applying, fans out an ordinary local ticket event, and the board
refetches unified tickets. A projection for a ticket the installation has
never seen (no local file) appears as a read-only, clearly labeled stub; the
local canonical ticket always wins on the same number. A disconnected board
keeps the last projection and marks it stale.

Status: implemented and component-tested, but automatic streams stay behind
`MDT_PROJECTION_STREAM_ROLLOUT` (default off) until the deployed handshake
and idle-D1 gates pass; the 2-second p95 delivery and 5-second p95 catch-up
SLOs are not yet measured. Until the flag is enabled after those gates, UC-5
degrades to stale projections.

### UC-6: Same header edited on two clones

Both members change the same header field before either syncs. Both pushes
carry versions; exactly one conditional write wins; the loser receives
`projection_version_conflict`, records a `conflict` journal entry, and the
cloud never auto-resolves it. A cold-start stale local version may adopt the
server's version and retry once; everything else requires explicit
reconciliation — showing both versions and confirming which header to
republish. Canonical truth is still reconciled in Git; the projection follows
whoever republishes last, by explicit choice, not by silent last-writer-wins.

### UC-7: Delete and restore

Deleting a local ticket publishes a `deleted` tombstone with an expected
version; stream clients drop the stub and keep their cursor. A clone that
still has the file cannot silently resurrect it: its next push conflicts.
Restore is an explicit `lifecycle = active` mutation and requires the local
canonical file to exist.

### UC-8: Cloud unreachable or disabled

Existing Markdown stays readable and editable. Cloud-bound creation is blocked
and keeps its journaled intent; eligible projection pushes queue with bounded
backoff; terminal entries do not spin; the board shows the last projection as
stale. Setting the local connection to `disabled` detaches delivery and
publishing but does not restore safe local numbering — only the owner-run
detach procedure does. No caller ever allocates a local fallback number.

### UC-9: Credential absent or expired

Background paths never launch an interactive login. With no installed service
token and no cached human token, pushes classify `authentication_paused`,
stream activation stays `authentication_required`, and no timer probes the
cloud. Recovery is an owner action: perform one interactive cloud operation
(seeding the process credential cache) or install an Access service token in
the CONFIG_DIR credential store. Until then, D1 is intentionally stale.

### UC-10: Membership revoked or project suspended

Membership mutation invalidates cached session decisions, grants, and
sockets; suspended projects return `423 coordination_suspended` for writes.
Revoked members keep working locally on Markdown and lose coordination. The
deployed revocation disconnect remains a manual gate.

### UC-11: Adding the second and third member

An owner provisions the cloud project once; each additional member connects
their installation to it and authenticates through Cloudflare Access
(`MDT-201`, Implemented). Multi-user hardening — the accumulated second-user
friction: journal blockage recovery, disable semantics, doctor output — is
`MDT-212`, Proposed.

### UC-12: Editing a ticket that predates cloud sync

Tickets that were never created through the coordinator have no reservation
and no D1 projection row. Editing one journals the change, the drain receives
`projection_not_found`, and the entry becomes terminal `unmanaged`: the cloud
does not implicitly create rows, because the journal is not allowed to invent
reservations. The only supported bootstrap is an explicit, idempotent
operator import/backfill that reserves and acknowledges each legacy ticket.
That import is not implemented yet, so on a project connected after the fact,
every pre-connection ticket number is unmanaged-on-edit. This is the single
largest coverage gap for real boards.

## Diagnosis Quick Reference

Timeless mapping from observation to cause. `CONFIG_DIR` below is the local
installation's configuration directory.

| Observation | Where to look | Typical cause |
| --- | --- | --- |
| Local edit works, D1 row never changes | `CONFIG_DIR/cloud-sync/projection-journal/{repoHash}/{cloudProjectId}/{ticketNumber}.json` | Entry at `pending` (never drained: no runner, see Known Gaps), `authentication_paused` (UC-9), `conflict` (UC-6), or `unmanaged` (UC-12) |
| Board shows stale projections | `GET /api/projects/{id}/cloud-sync/status` | Rollout flag off, terminal stream pause, or transport down; stale is displayed, not hidden |
| Status endpoint 404 "cloud sync is not enabled" | Rollout flag and connection file both | Message conflates several states; verify `cloud-sync.toml` before trusting it (Known Gaps) |
| Teammate cannot create a ticket | Reservation journal + cloud reachability | Fail-closed creation: offline, unauthenticated, or suspended (UC-3, UC-8) |
| A ticket number can never sync | D1 `ticket_projections` row exists? | No row means pre-cloud ticket: `unmanaged` until operator import (UC-12) |

## Known Gaps

Dated inventory; strike items as they close.

1. **2026-08-15 — Rollout flag gates the write path too.** The server creates
   the journal retry runner inside the rollout-gated stream bootstrap. With
   `MDT_PROJECTION_STREAM_ROLLOUT` unset, journal entries get only the single
   enqueue-time attempt and no periodic drain, stranding `pending` entries
   indefinitely. The write journal's documented lifecycle is independent of
   the stream; either the runner moves out of the gated path or the coupling
   becomes documented containment with an accurate status surface.
2. **2026-08-15 — The status endpoint lies.** It returns
   `404 cloud sync is not enabled` for every condition where the stream
   manager was never started, including rollout-flag-off on an enabled,
   connected project. Operators cannot distinguish disabled, gated, and
   never-started. The runtime state exists (MDT-223 consumes it); the message
   must distinguish.
3. **UC-12 — Legacy import is unimplemented.** No operator backfill exists,
   so pre-cloud tickets are permanently `unmanaged`.
4. **Deployed evidence gates pending.** Deployed handshake/`101`, 30-minute
   idle-zero-D1, revocation disconnect, and delivery-latency SLOs are
   unmeasured; until they pass, UC-5 stays flag-off and UC-4's end-to-end
   freshness in production is unproven.
