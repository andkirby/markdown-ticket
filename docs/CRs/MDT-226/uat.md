# UAT Refinement Brief

## Objective

Close delivery-protocol drift before MDT-226 implementation: make catch-up
compatible with the latest-row D1 projection table, prove per-active-socket
at-least-once delivery, and measure freshness through the browser-visible
ticket read model.

## Approved Changes

- Catch-up captures an authoritative high-water revision, accepts sparse
  projection rows, and advances the local cursor only after the full batch and
  `ready(highWaterRevision)` are applied.
- Live deltas remain contiguous. Duplicate/older live deltas are ignored; a
  non-contiguous live delta triggers one cursor catch-up.
- The local server sends `ack(projectRevision)` only after projection state and
  cursor are atomically persisted.
- The hub tracks acknowledged revision per active socket. A pre-armed alarm
  replays bounded catch-up to active lagging sockets; disconnected servers
  recover from their persisted cursor on reconnect.
- Project subscription, membership mutation, and projection mutation use an
  explicit per-instance async operation queue around D1 awaits.
- The connected-delivery SLO ends at the unified ticket read model and connected
  browser, not at WebSocket receipt by the local server.

## Changed Requirement IDs

- Refined in place: `C-6`, `C-8`, `Edge-1`, `Edge-2`.
- No behavior requirement or BDD scenario ID changed.

## Affected Downstream Trace

- Requirements and architecture canonical state were updated and rendered.
- Existing BDD scenarios remain valid and were strictly revalidated.
- Test specifications and implementation tasks remain pending; they must use
  acknowledgement and sparse-catch-up semantics from this round.
- MDT-200 remains the historical implemented polling baseline; MDT-226 owns its
  replacement.

## Execution Slices

1. **Cloud protocol correctness**
   - Objective: serialize hub operations and recover active unacknowledged
     revisions.
   - Direct artifacts: `ProjectProjectionHub.ts`, `projection-stream.ts`,
     `projection.ts`.
   - Direct GREEN targets: operation-queue race, sparse catch-up, per-socket
     acknowledgement, alarm replay, disconnect/reconnect.
   - Canonical task IDs: none yet; generate after the test stage.
   - Why: D1 latest-row storage and WebSocket send semantics otherwise violate
     the previous gap and at-least-once claims.

2. **Local apply and browser-visible freshness**
   - Objective: persist state/cursor before acknowledgement and publish the
     unified ticket change.
   - Direct artifacts: `CloudProjectionStreamClient.ts`,
     `ProjectionStreamManager.ts`, `CloudProjectionReadModel.ts`,
     `server/services/TicketService.ts`, and the local SSE consumers.
   - Direct GREEN targets: no early acknowledgement, one catch-up on live gap,
     ordinary ticket event, end-to-end p95 measurement.
   - Canonical task IDs: none yet; generate after the test stage.
   - Why: transport receipt is not durable application or user-visible delivery.

## Validation

- `spec-trace validate MDT-226 --stage requirements --strict`: passed.
- `spec-trace validate MDT-226 --stage bdd --strict`: passed.
- `spec-trace validate MDT-226 --stage architecture --strict`: passed.
- Runtime tests remain pending implementation; no production behavior is
  claimed by this documentation round.

## Watchlist

- Alarm tests must include two active sockets where only one acknowledges.
- Catch-up tests must include multiple updates collapsed into one latest ticket
  row and must not classify the missing historical revisions as a live gap.
- Operation-queue tests must force D1 awaits to interleave without the queue.
- Browser timing must start at committed D1 revision and end after the unified
  ticket update renders.

---

## Round 2 — Projection write journal isolation

### Objective

Stop projection write-journal read amplification and define terminal behavior
for an authorized project with no projection for a journaled ticket.

### Approved Changes

- Reads and browser activity never drain the write journal.
- One bounded single-flight runner retries only due transient work with
  persisted capped backoff and jitter.
- Authorization failures pause the project; a stale local version may adopt a
  positive `currentVersion` and retry once; conflicts that remain after that and
  missing projections stop as terminal states.
- Missing projections require reservation recovery or explicit import; they are
  never created implicitly during retry.
- Eligible updates use one conditional write without a preflight projection read.

### Changed Requirement IDs

- Added `C-12` and `Edge-5`.

### Affected Downstream Trace

- BDD scenarios are unchanged.
- Architecture, one focused test plan, and one implementation task are added.

### Execution Slices

1. **Projection write retry isolation**
   - Objective: classify and schedule journal work without read amplification.
   - Direct artifacts: `projection-sync.ts`, shared `TicketService.ts`.
   - Direct GREEN targets: no read-triggered drain, due-only backoff, terminal
     conflict/unmanaged, project auth pause, no preflight GET.
   - Canonical task: `TASK-write-journal-retry`.
   - Why: missing projections currently retry forever from the read path,
     causing per-ticket D1 read amplification on every poll.

### Validation

- Strict Spec Trace validation is required through Tasks.
- Runtime implementation remains required for due-only persisted backoff and
  browser preservation of projected `kind/readOnly/stale`.

### Watchlist

- Do not map non-disclosing `project_not_found` (hidden project) to a missing
  ticket — they are distinct error codes (`projection_not_found`).
- Do not delete existing journal entries before snapshot/classification.
- A later edit must not reactivate `unmanaged` without eligibility.
