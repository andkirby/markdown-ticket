# MDT-226 Requirements

## Scope

Replace periodic cloud projection polling with event-triggered delivery. D1
remains authoritative; one project-scoped Durable Object coordinates delivery
to one upstream stream per local server, and the local server fans out through
existing SSE.

## Terms and Semantics

- **Project stream**: one cloud WebSocket owned by a local server for one cloud
  project. Browser tabs do not own cloud streams.
- **Unified ticket read model**: the backend-owned list of canonical local
  tickets plus projection-only read-only entries. The browser consumes this
  model without owning projection transport or revision state.
- **Applied revision**: the highest `projectRevision` whose projection state was
  successfully merged locally and persisted.
- **Complete delta**: the full approved projection header for one ticket plus
  `cloudProjectId`, `ticketNumber`, `projectionVersion`, `projectRevision`, and
  lifecycle metadata. It is not a field patch and contains no ticket body.
- **Live**: catch-up through the hub's current committed revision completed.
- **Stale**: the last applied projection is available, but the stream is not
  currently live.
- **Delivery semantics**: transport is at-least-once; revision-aware application
  is idempotent and converges to the latest D1 projection state.
- **In time**: commit-to-rendered-ticket delivery is at most 2 seconds at p95 for
  a healthy connected stream; reconnect catch-up is at most 5 seconds at p95
  under the documented test load.

## Behavior Requirements

### BR-1.1 One project stream

WHEN an enabled cloud project has a valid cloud credential available to the
local server, THE SYSTEM SHALL establish exactly one authenticated projection
stream for that local server and cloud project.

### BR-1.2 Commit-triggered delivery

WHEN a projection mutation commits in D1, THE SYSTEM SHALL deliver a complete
approved projection delta to every authorized connected local server without
waiting for a periodic poll.

### BR-1.3 Unified local ticket delivery

WHEN the local server applies a cloud projection delta, THE SYSTEM SHALL update
its unified ticket read model and publish an ordinary local ticket change to
connected browser tabs through the existing event stream.

### BR-1.4 Cursor catch-up

WHEN a projection stream connects or reconnects with an `afterRevision` cursor,
THE SYSTEM SHALL deliver the missing projection state before marking the stream
live.

### BR-1.5 Disconnected state

WHILE the projection stream is unavailable, THE SYSTEM SHALL keep the last
applied projection visible as stale and reconnect with bounded backoff.

### BR-1.6 Tab-independent cloud traffic

WHEN another browser tab opens for the same local project, THE SYSTEM SHALL
reuse the local server projection stream and SHALL NOT open another cloud
connection.

### BR-1.7 Revocation

WHEN a project membership is revoked or suspended, THE SYSTEM SHALL stop
delivering new projection events to that principal's active project streams.

### BR-1.8 Post-commit recovery

WHEN D1 commits a projection but immediate stream delivery fails, THE SYSTEM
SHALL retry delivery from the committed revision without requiring client
polling.

### BR-1.9 Local authority

WHEN a cloud projection and a canonical local ticket have the same ticket
number, THE SYSTEM SHALL keep local Markdown authoritative and SHALL NOT
overwrite the local ticket from the projection.

## Constraints

### C-1 Zero idle D1 reads

A healthy connected local server SHALL perform zero D1 reads solely because
time passes without project changes, reconnects, or authorization changes.

### C-2 Authority boundary

D1 SHALL remain authoritative for memberships, projection versions, and project
revisions; the Durable Object SHALL coordinate ordering and delivery only.

### C-3 Credential boundary

The browser SHALL NOT receive Cloudflare credentials or open a direct cloud
projection connection.

### C-4 Projection payload

Projection stream messages SHALL contain only the approved complete projection
header and delivery metadata; they SHALL NOT contain ticket bodies.

### C-5 Single project sequencer

The Worker SHALL route every project stream and projection mutation through one
deterministically named `ProjectProjectionHub` Durable Object per cloud project.

### C-6 Cursor acknowledgement and gap semantics

Cloud projection transport SHALL be at-least-once: sparse revisions are valid
during catch-up and advance only to the `ready` cursor after the batch is
applied; during live delivery the local read model SHALL ignore revisions at or
below its cursor, resynchronize on a non-contiguous revision, and acknowledge a
revision only after applying and persisting it.

### C-7 Hibernation

`ProjectProjectionHub` SHALL use the Durable Objects Hibernation WebSocket API
and alarms; it SHALL NOT stay active through polling timers or application-level
keepalive loops.

### C-8 End-to-end freshness SLO

For a healthy connected stream, a committed projection change SHALL appear in
the unified local ticket read model and connected browser within 2 seconds at
p95; reconnect catch-up SHALL complete within 5 seconds at p95 under the
documented test load.

### C-9 Storage scope

The design SHALL add no KV, Queue, D1 replica, ticket-body store, or second
projection authority.

### C-10 Stream authorization

A stream SHALL be authorized at handshake, re-authorized after Durable Object
hibernation before delivery, and reconnected no later than Access token expiry.

### C-11 Browser read-model boundary

The browser-facing API SHALL expose one unified ticket read model and local
ticket event stream; it SHALL NOT expose cloud projection cursors, revisions,
catch-up, reconnect, or the cloud projection stream endpoint.

## Edge Cases

### Edge-1 Commit-acknowledgement gap

If the Worker or Durable Object fails after the D1 commit and before an active
local server acknowledges the revision, a pre-armed alarm SHALL replay committed
state to each still-active lagging socket; disconnected servers SHALL recover
from their persisted cursor on reconnect.

### Edge-2 Sparse catch-up and live gap

Sparse project revisions SHALL be accepted during a bounded catch-up batch; a
duplicate or older revision SHALL be ignored, and only a non-contiguous live
revision SHALL trigger one catch-up from the last applied cursor.

### Edge-3 Connection migration

Existing version 1 cloud connections with `pollIntervalSeconds` SHALL migrate
to version 2 push configuration without changing cloud project identity or
credentials.

### Edge-4 Open-stream revocation

If membership changes while a stream is open, the project hub SHALL exclude and
close unauthorized sockets before delivering a later projection.

## Assumptions

- The local server runtime can open a WebSocket with the same Cloudflare Access
  headers already used for HTTPS coordination calls.
- Projection changes continue to pass through the coordination Worker; direct
  D1 writers are outside the supported architecture.
- The latest projection state is the product requirement. Recovery need not
  replay every intermediate edit to the same ticket.

## Deferred Requirements

- Presence and active-editor indicators.
- Direct hosted-browser access to project streams.
- Ticket-body synchronization or collaborative editing.
- Offline cloud-bound ticket creation.
