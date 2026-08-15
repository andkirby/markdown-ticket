# MDT-226 — Complete Issue Log (All Issues Found Through 2026-08-15)

A consolidated record of every defect, gap, and architecture issue found during
the MDT-226 cloud projection push-delivery implementation. Issues are grouped by
category, ordered by severity within each group. Each entry includes: root cause,
evidence (file:line), status (FIXED / OPEN / DEFERRED), and how it was found.

---

## A. Write-Path Defects (local edit → D1)

These blocked ticket status updates from reaching D1. A1-A5 are fixed in the
current code. A6 remains open because the implemented runner is interval-based,
not the documented due-only persisted backoff contract.

### A1. `reservationId: ''` rejected by publish validation — FIXED (commit c6cdfbce)

**Root cause:** The journal sends `reservationId: ''` (conditional PUT, no GET).
The publish use case validated it with `requireText`, which rejects `length < 1`.
Every journal PUT died at validation → `invalid_request` → never reached D1.

**Evidence:** `shared/services/cloud-sync/projection-sync.ts:179` sends `''`;
`cloud/src/cloudflare/application/projection-usecase.ts:51` called `requireText`;
`cloud/src/cloudflare/application/validation.ts:12` rejects `< 1`.

**Fix:** Added `optionalText()` to `validation.ts`; publish use case uses it for
`reservationId`. The D1 UPDATE never binds `reservationId` — it keys on
`(cloud_project_id, ticket_number, projection_version)`.

**Why tests missed it:** Mock `ProjectionClientPort.publish` doesn't run
`requireText`. Test at `projection-sync.test.ts:69-70` explicitly asserts
`reservationId: ''` is sent — blessing the payload the real worker rejects.

### A2. `expectedProjectionVersion: 0` rejected — FIXED (commit c6cdfbce)

**Root cause:** The journal sends version 0 for pre-cloud tickets (never observed
a cloud projection). `requirePositiveSafeInteger` rejects `< 1`. The exact valid
sentinel was blocked.

**Evidence:** `projection-sync.ts:97` sets `projectionVersion ?? 0`;
`validation.ts:27` rejects `< 1`.

**Fix:** Added `requireNonNegativeSafeInteger()` to `validation.ts`; publish use
case uses it for `expectedProjectionVersion`.

**Why tests missed it:** Same as A1 — mock doesn't validate.

### A3. `projection_not_found` unreachable from publish path — FIXED (commit c6cdfbce)

**Root cause:** `publishProjection`'s UPDATE keys on version. Zero rows affected =
both "missing row" and "stale version" → `{ conflict: true, currentVersion: 0 }` →
use case throws `projection_version_conflict`. `projection_not_found` is thrown
ONLY on the GET read path. The journal's `projection_not_found → unmanaged`
classification was dead code from the publish path.

**Evidence:** `cloud/src/cloudflare/d1/projection.ts:397-414` (conflict return);
`projection-usecase.ts:89` (GET-only throw).

**Fix:** In the publish use case, when `result.conflict && result.currentVersion
=== 0`, throw `projection_not_found` instead of `projection_version_conflict`.
`projection_version` starts at 1 on INSERT, so 0 unambiguously means absent. No
new D1 query — the conflict path already re-reads the version.

**Why tests missed it:** Test at `projection-sync.test.ts:99` hand-injects
`projection_not_found` from the mock. The real publish path can't produce it
(before the fix).

### A4. `projection_version_conflict` missing from client error code set — FIXED (commit dfde5de9)

**Root cause:** `CloudProjectionClient.envelopeToCode` has a `known` set of error
codes it passes through from the server envelope. `projection_version_conflict`
was NOT in the set. So a 409 response was silently remapped via `statusToCode`
to `authentication_required`. Version conflicts looked like auth failures — the
journal never saw the real error code.

**Evidence:** `shared/services/cloud-sync/CloudProjectionClient.ts:117-125`
(`known` set missing the code); `statusToCode` line 108 returns
`authentication_required` for unrecognized 4xx.

**Fix:** Added `projection_version_conflict`, `reservation_state_conflict`,
`reservation_not_found`, `idempotency_key_reused`, and `invalid_request` to the
`known` set.

**Why tests missed it:** Tests throw `CoordinatorError` directly at the journal,
bypassing the client's envelope parsing entirely.

### A5. No conflict recovery — journal gave up on version mismatch — FIXED (commit dfde5de9)

**Root cause:** On `projection_version_conflict`, the journal marked the entry
terminal `conflict` and never retried — even when the server returned the
authoritative `currentVersion`. This is the cold-start problem: the journal has
version 0, D1 has version N, and no mechanism adopts N.

**Evidence:** `projection-sync.ts:207-209` (old code marked conflict terminal
immediately).

**Fix:** In `attempt()`, on `projection_version_conflict` with `currentVersion >
0` that differs from the stored version, adopt it and retry the PUT once. On
second failure, classify as `conflict` with the adopted version preserved. Also:
`conflict` entries now reset to `pending` on a new edit (only `unmanaged` is
truly terminal).

**Why tests missed it:** No test exercised the cold-start version-mismatch
scenario. All tests either succeeded or threw a terminal conflict without
`currentVersion`.

### A6. No retry trigger after amplification fix — OPEN

**Root cause:** The amplification fix (correctly) removed `sync.flush()` from the
read path (it caused ~300/min D1 reads). But nothing replaced it as a retry
trigger. `authentication_paused` and `transient` entries were stuck forever —
nothing called `flush()`.

**Current state:** Added `startRetryRunner(intervalMs)` / `stopRetryRunner()` to
`CloudProjectionSync` and wired it from `server.ts`, but this is not enough. The
runner wakes every 60s and calls `flush()`. `PendingProjection` does not persist
`attemptCount`, `nextAttemptAt`, or a typed last error. That violates the owner
doc contract: retry only when an entry is due, with capped persisted backoff and
no request when no eligible operation is due.

**Needed:** Implement durable retry state, skip non-due entries, and prove
transient work backs off without read/browser triggers.

---

## B. Server Wiring Gaps (push path was structurally inert)

All FIXED (commit 79cf728b). The components existed and passed their tests, but
nothing assembled them into a running system.

### B1. ProjectionStreamManager never instantiated — FIXED

**Root cause:** `new ProjectionStreamManager(...)` appeared only in a test file.
`server/server.ts` never constructed it. No upstream WebSocket was ever opened.

**Fix:** Instantiated in `server.ts` after `TicketService` construction, with a
credential-aware `clientFactory` and `onChange` SSE fan-out callback.

### B2. Read model `stale` accessor missing — FIXED

**Root cause:** `CloudProjectionReadModel` exposed `get live()` but no `get
stale()`. The `ProjectionReadModelProvider` contract requires `{ entries, stale
}`. No adapter bridged them.

**Fix:** Added `get stale(): boolean { return !this.state.live }`. Provider
adapter is a 4-line closure in the bootstrap.

### B3. `setProjectionReadModelProvider` never called — FIXED

**Root cause:** The method existed on `TicketService` but was never called from
the bootstrap. `getUnifiedTickets` always returned canonical-only.

**Fix:** `ticketService.setProjectionReadModelProvider((localProjectId) => {...
streamManager.getReadModel(localProjectId) ...})`.

### B4. No start/stop lifecycle for streams — FIXED

**Fix:** `startProjectionStreams()` enumerates enabled cloud-sync projects via
`ProjectStateStore`, resolves credentials, opens one stream per project. Called
after `initializeMultiProjectWatchers()` on startup. `stopAll()` on SIGTERM/
SIGINT.

### B5. No SSE fan-out for projection changes — FIXED

**Fix:** Added `FileWatcherService.broadcastProjectionChange(projectId)` —
broadcasts a `file-change` SSE event so browsers refetch unified tickets through
the existing refresh path.

### B6. Frontend fetched `/crs` (canonical-only) not `/tickets/unified` — FIXED

**Root cause:** `dataLayer.fetchTickets` and `fetchTicketsMetadata` were
hardcoded to `/crs`. The unified endpoint existed but zero frontend code consumed
it.

**Fix:** Switched both to `/tickets/unified`. `normalizeTicket` handles the
`UnifiedTicketItem` shape gracefully (projected items render as regular cards).

---

## C. Transport Defects

### C1. WebSocket header signature wrong for Bun — FIXED (commit 79cf728b)

**Root cause:** The default transport used `new WebSocket(url, undefined, {
headers })` (3rd arg — the `ws`-module convention). Bun takes headers in the
2nd arg: `new WebSocket(url, { headers })`. The 3rd-arg form silently dropped
headers — the CF Access token never reached the cloud worker and every handshake
401'd.

**Evidence:** `CloudProjectionStreamClient.ts:235` (old code); verified by
round-trip POC: 3rd-arg FAIL, 2nd-arg PASS.

**Why tests missed it:** Tests inject a controllable transport (`opts.transport`)
that doesn't use the runtime WebSocket.

---

## D. Cloud Worker Hub Defects

### D1. `revokeSockets` fire-and-forget despite Worker awaiting it — FIXED (commit c6cdfbce)

**Root cause:** `revokeSockets` called `this.enqueue(...)` without returning the
promise. The Worker `await stub.revokeSockets(...)` resolved before sockets were
actually closed. Edge-4 (close before delivering later projection) was a timing
assumption, not a guarantee.

**Fix:** Changed to `return this.enqueueResult(async () => { ... })`.

### D2. `sendCatchup` can spin if cursor doesn't advance — FIXED (commit c6cdfbce)

**Root cause:** `cursor = page.nextCursor ?? cursor` with no guard that
`nextCursor > cursor`. Safe only because of a repository invariant (D1
`pollProjections` sets nextCursor to the last item's strictly-greater revision).
The hub trusted a contract it didn't enforce.

**Fix:** Added `if (cursor <= previousCursor) break` after advancing.

---

## E. Spec / Trace Honesty Gaps

These are documentation claims that overstate what the automated suite verifies.
Some were fixed in earlier commits; the current review reopens stale status and
evidence notes that no longer match the code.

### E1. Verification Architecture over-promised Miniflare/DO coverage

`architecture.md:295-299` claimed "Worker runtime tests use Miniflare/Workers
test support with D1 and Durable Object bindings to prove hibernation, alarm
replay, revocation." The actual `project-projection-hub.test.ts` tests only pure
helpers + a re-implemented queue pattern. Hibernation/alarm/revocation are
deferred to manual gates.

### E2. C-1 (zero idle D1 reads) vacuous note became stale — FIXED IN DOCS

The operations doc asserted a property of code paths that never ran (no stream
was wired). Current `server/server.ts` now instantiates
`ProjectionStreamManager`, wires the read-model provider, opens streams, and
starts retry runners. The remaining C-1 gap is deployed D1 statement/request
evidence, not absent local wiring.

### E3. Acceptance criteria status drift — FIXED IN DOCS

The ticket had stale notes claiming the push path was structurally inert and the
provider was not wired. Current frontmatter is `Approved`, and current code has
server wiring. Acceptance notes now distinguish local wiring from the still-open
deployed/SLO/UAT gates.

---

## F. Architecture Design Gaps (OPEN)

These are design-level issues, not implementation bugs. They require decisions,
not just code changes.

### F1. No automated initial-sync / bootstrapping for existing tickets — OPEN

The write journal only UPDATEs existing projections. It can't CREATE them. The
reservation/acknowledgement workflow is the designed creation path, but it's
wired only for NEW ticket creation (via `createCR`). For the hundreds of existing
local tickets created before cloud sync, there's no automated bootstrap. Each
becomes `unmanaged` (terminal) because D1 has no projection row.

**Needed:** A one-time bulk import operation — for each local ticket with no D1
projection, reserve its number and acknowledge it (creating the v1 projection
from the local header). CLI command, not runtime path.

### F2. Write journal and stream read model don't share version state — OPEN

The stream's read model learns the current projection version from deltas. The
write journal has its own separate `projectionVersion`. They could share — the
stream could feed the journal the current version, eliminating the cold-start
version mismatch. Current code partially mitigates this by adopting a positive
`currentVersion` from `projection_version_conflict` and retrying once, but the
read model still does not proactively seed the journal.

### F3. No integration test against the real round-trip — OPEN

Every test mocks the cloud worker. No test exercises: real `CloudProjectionSync`
→ real `CloudProjectionClient` → real worker validation → real D1 → real error
envelope parsing → real journal classification. This is why all five write-path
bugs (A1-A5) were invisible to the test suite.

**Needed:** An integration test using Miniflare + D1 binding (or the `bun:sqlite`
+ `asD1` harness extended through the HTTP client layer) that exercises the full
journal → client → worker → D1 round-trip with real validation gates and real
error codes.

### F4. Multi-server concurrent edit UX undefined — DEFERRED

Two local servers editing the same cloud-projected ticket. D1's version conflict
handles correctness. The UX (both journals retry, one wins, the other conflicts)
isn't designed. Not blocking for single-server operation.

### F5. Projected ticket read-only/stale UX not rendered — OPEN

The `UnifiedTicketItem` carries `kind: 'projected'`, `readOnly: true`, `stale`
fields. `server/services/TicketService.ts` returns them, but the frontend
normalizer path drops those capability fields before the board's
`isProjectedStub()` check. Projected items can therefore render as ordinary
editable cards. The `mdt-ux-designer` gate for projected/read-only/stale browser
states has not been run.

---

## G. Root Cause Pattern

Every defect in this log shares one root cause: **components designed and tested
in isolation, seams never verified end-to-end**. Each component passed its unit
tests against mocks. The gaps were all at the boundaries — where one component's
output meets another's input, or where the mock's behavior diverges from the real
server's contract.

The architecture doc described WHAT each component does but never traced
interface contracts through the full path: request/response shapes, error code
flows, validation rules, and platform-specific runtime behavior. A single
integration test exercising the real round-trip would have caught A1-A5, B1-B3,
and C1 simultaneously.

---

## H. Production Incident 2026-08-15 (CONTAINED in code; deployed gates pending)

Incident recovery implemented 2026-08-15 (TASK-stream-incident-recovery). The
fixes below are proven by the automated incident tests; the deployed
`TEST-deployed-stream-handshake` and `TEST-idle-zero-d1` gates remain UNVERIFIED
until an explicitly authorized limited-production probe runs, and automatic
streams stay behind `MDT_PROJECTION_STREAM_ROLLOUT` (default off).

### H1. Worker drops the WebSocket upgrade before the Durable Object — FIXED (2026-08-15)

`buildHubForwardedHeaders` (cloud/src/cloudflare/durable/projection-hub-helpers.ts)
now preserves every client header — including `Upgrade: websocket` and
`Sec-WebSocket-*` — and appends the internal context instead of replacing the
header set. Proven by TEST-worker-hub-upgrade-forwarding; deployed `101`
confirmation is the manual gate.

`cloud/src/cloudflare/worker.ts` replaces the request headers while adding
internal principal context. That removes `Upgrade: websocket`, so
`ProjectProjectionHub` returns `426 Expected WebSocket`. The authorized MDT
project therefore never establishes its stream.

### H2. Terminal handshake failures retry forever — FIXED (2026-08-15)

The transport owns no retry timer (CloudProjectionStreamClient reports one
coalesced termination). ProjectionStreamManager persists
`paused_authorization` (401/403/404) and `paused_incompatible` (426/protocol)
with the activation fingerprint in projection-stream-state.json; time passage,
browser activity, and server restart cannot re-arm them. Proven by
TEST-stream-handshake-failure-classification.

`CloudProjectionStreamClient` treats handshake `404` and `426` as generic
transport failures. Full-jitter backoff caps at 30 seconds but never pauses or
opens a circuit. The enabled VOC binding has no current membership and retries
`404`; MDT retries the protocol `426`.

### H3. Reconnect traffic caused continuous D1 reads and writes — FIXED in code (2026-08-15); deployed proof pending

One typed session request per activation performs at most one D1 membership
decision and one denial audit (hub-cached decisions); grant-bearing
reconnects perform no membership read; the manager reuses a valid grant and
stops after a persisted bounded budget. Automated proof:
TEST-stream-session-client, TEST-worker-hub-upgrade-forwarding,
TEST-stream-handshake-failure-classification. The 30-minute zero-idle-D1
statement count remains the deployed TEST-idle-zero-d1 gate.

From 09:08:55 to 09:23:20 CEST, the VOC stream recorded 54 denied
`projection.stream` attempts. Each attempt performed one membership `SELECT`
and one denied audit `INSERT`. The MDT stream retried at a similar cadence and
performed its membership `SELECT` before failing with `426`. This accounts for
approximately 162 stream-attributable D1 statements and matches the observed
approximately 170 statements per 15 minutes. No data loss was observed, but
push delivery was unavailable for both configured projects.

A later idle 30-minute window recorded 238 membership reads and 111 denied
audit inserts: 349 D1 statements without project activity. This independently
supports the same two-loop diagnosis and proves the incident remained active.

### H4. Rollout and telemetry controls were not delivered — FIXED (2026-08-15)

Automatic streams now require `MDT_PROJECTION_STREAM_ROLLOUT=true`
(default off) in server/server.ts. Route telemetry distinguishes
`projection.stream.session` from `projection.stream` before the generic
`project.probe` fallthrough, and
`GET /api/projects/:id/cloud-sync/status` exposes local-only
state/reason/timestamps/next action with zero cloud traffic.

The ticket requires a per-installation feature flag, deployed handshake gate,
idle-D1 proof, and observability before automatic rollout. The running server
started automatic streams without that flag or proof. Stream requests are also
mislabelled as `project.probe`, obscuring the failing route. Application status
shows configuration/auth reachability, not whether a projection stream is
live, paused, or failed.

### H5. The 2026-08-14 update overstated readiness — CORRECTED IN DOCS

The last update correctly proved bounded local WebSocket and `cloudflared`
resources, but focused mocked tests and a build did not prove a deployed
Worker-to-hub handshake or bounded cloud request volume. `C-1` is now a
production failure, not merely an unverified external gate. `C-14`, `Edge-8`,
and the incident recovery slice make those missing seams explicit.

### H6. Direct authorization inside every WebSocket attempt — IMPLEMENTED (2026-08-15)

`CloudProjectionSessionClient` owns the single typed HTTPS authorization;
the Worker session route asks the hub for a cached decision before any D1;
the hub issues short-lived opaque grants stored as SHA-256 digests
(StreamGrantRegistry, DO-storage persisted, bounded 256 entries, revoked with
sockets on membership mutation); the grant-bearing upgrade validates without
a membership query and the manager owns the only re-arm policy.

The current upgrade mixes control-plane authorization with data-plane transport.
Bun exposes a generic WebSocket error rather than the Worker's typed denial, so
the client cannot reliably distinguish membership, protocol, and network
failures. Every reconnect repeats the D1 membership decision and denial audit.

**Target:** authorize once through a typed HTTPS stream-session request. The
project hub issues a short-lived opaque grant, stored as a digest; grant-bearing
WebSocket upgrade/reconnect performs no membership read. The manager persists
terminal activation state and owns the only re-arm policy. The transport owns
no retry timer.
