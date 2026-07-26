# UAT Refinement Brief

## Objective

Close the integration gap between the proven cloud service and the local
Markdown Ticket application, plus the remaining Worker wiring and operational
drills, so that MDT-200's acceptance criteria hold end-to-end — not only in
isolated cloud-side tests.

The cloud coordination service (Worker + D1) is deployed and proven for
allocation, identity, projection, and audit. The review found that several
acceptance criteria were satisfied only by isolated tests, not through the real
application path. This brief defines the focused slices that finish the work on
this same CR.

## Approved Changes

The review's findings are accepted as a same-ticket spec delta. No requirement
*meaning* changed; three were **refined in place** to make "through the real
path" explicit, and seven **focused execution tasks** were added to canonical
trace as current remaining work.

1. **BR-1.5 (refined)** — no-fallback must hold through `TicketService.createCR`
   (strategy selection), not only the isolated allocator unit test.
2. **BR-1.7 (refined)** — local-only backward compatibility must be proven with
   the strategy seam wired in (a project with no `[project.cloudSync]` selects
   `LocalTicketNumberAllocator` and makes no cloud call).
3. **BR-3.3 (refined)** — polling visibility must be proven end-to-end with a
   local projection poller, not only the cloud polling endpoint.

Drift defects already fixed this round:
- `cloud/package.json` test script unmasked (was hiding exit-1 as "no tests yet").
- `domain-contracts` lint fixed (12 errors → 0).
- `deployed-access.md` stale "migrations not applied" note corrected (they are applied).

## Changed Requirement IDs

- `BR-1.5` — refined in place (same ID, meaning narrowed to "through the app path").
- `BR-1.7` — refined in place.
- `BR-3.3` — refined in place.

No IDs added or removed at the requirement level (intent unchanged; execution
scope tightened). Seven additive task IDs added (see below).

## Affected Downstream Trace

- **requirements** — re-rendered; BR-1.5/1.7/3.3 text tightened.
- **tasks** — 7 new focused tasks added; all validate.
- bdd, architecture, tests — unchanged this round (scenarios/obligations/test-plans already cover the refined meanings).

## Execution Slices

This is the historical execution plan captured when the gaps were discovered;
all seven slices are now closed in source as recorded under Re-verification
below. They are ordered by dependency: slices 1–3 are the integration core;
4–7 are wiring and proof.

### Slice U1 — Application strategy wiring

- **Objective**: `TicketService.createCR` selects `LocalTicketNumberAllocator`
  vs `CloudTicketNumberAllocator` from validated `[project.cloudSync]` config.
  This is the single change that makes the real app cloud-aware and unblocks
  U2–U5.
- **Direct files**: `shared/services/TicketService.ts` (createCR + getNextCRNumber seam), `shared/services/cloud-sync/allocator-strategy.ts` (exists).
- **Direct GREEN targets**: `coordination_unavailable_no_fallback`, `local_only_unchanged`, `offline_existing_tickets_editable`, `TEST-no-fallback-local`.
- **Impacted tasks**: `TASK-app-strategy-wiring`, `TASK-local-orchestration`.
- **Why**: the review's blocking finding #1 — the app always allocates locally today.

### Slice U2 — Local cloud client

- **Objective**: build the runtime `CloudSyncCoordinator` HTTP implementation
  (fetch + origin-allowlist enforcement + redirect rejection), credential
  providers (cloudflared human + service-token machine), acknowledgement
  orchestration, and the recovery runner that consumes the operation journal.
- **Direct files**: `shared/services/cloud-sync/CloudSyncCoordinator.ts`, `credential-providers.ts`, `recovery.ts` (new).
- **Direct GREEN targets**: `recover_local_write_failure`, `polling_sees_changes_within_interval`.
- **Impacted tasks**: `TASK-cloud-client`.
- **Why**: original blocking finding #2 — only interfaces and isolated classes
  existed at discovery.

### Slice U3 — Acknowledgement → projection wiring

- **Objective**: the Worker `/acknowledge` route must call
  `createInitialProjection()` so acknowledgement creates projection v1 at
  runtime (test-only at discovery). Requires the acknowledgement body to carry
  the projected header + content hash.
- **Direct files**: `cloud/src/cloudflare/application/reservation.ts` (acknowledge), `cloud/src/cloudflare/worker.ts`.
- **Direct GREEN targets**: `projection_excludes_body`.
- **Impacted tasks**: `TASK-ack-projection-wiring`, `TASK-projection`.
- **Why**: blocking finding #3.

### Slice U4 — Rate-limit wiring

- **Objective**: call the rate-limit guard in the Worker reservation/publish
  routes (it was built and tested but not invoked at discovery).
- **Direct files**: `cloud/src/cloudflare/worker.ts`, `cloud/src/cloudflare/rate-limit/guard.ts`.
- **Direct GREEN targets**: `TEST-rate-limit-abuse`.
- **Impacted tasks**: `TASK-ratelimit-wiring`, `TASK-scheduled`.
- **Why**: blocking finding #6.

### Slice U5 — Board projection stub + two-client E2E

- **Objective**: React projection-stub rendering (read-only, labeled,
  non-draggable per `ux-design.md`) + a local projection poller +
  `tests/e2e/cloud-sync-board.spec.ts` (two clients).
- **Direct files**: `src/components/` (new stub), `shared/services/cloud-sync/CloudProjectionClient.ts` (poller), `tests/e2e/cloud-sync-board.spec.ts`.
- **Direct GREEN targets**: `TEST-board-stub-render`, `board_distinguishes_projected_state`, `polling_sees_changes_within_interval`.
- **Impacted tasks**: `TASK-board-projection`, `TASK-projection`.
- **Why**: blocking findings #4.

### Slice U6 — Real concurrency proof

- **Objective**: prove allocation concurrency against the actual D1 batch. The
  production `allocateReservation` pre-reads the counter outside the batch
  (statements.ts:72); the current test uses a sync loop on different code.
  Either move the read into the batch, or add a Workers-runtime concurrency
  test that exercises the real path.
- **Direct files**: `cloud/src/cloudflare/d1/statements.ts`, `cloud/test/alloc.integration.test.ts`.
- **Direct GREEN targets**: `TEST-alloc-concurrency`, `concurrent_creates_unique_numbers`, `TEST-deployed-concurrency`.
- **Impacted tasks**: `TASK-concurrency-real-proof`, `TASK-allocation`.
- **Why**: blocking finding #7.

### Slice U7 — Config inspection registry

- **Objective**: register the `cloudSync` selectors so
  `bun run inspect:config --filter cloudSync` returns them (it returned 0 at
  discovery).
- **Direct files**: the config-inspection registry source (per `docs/CONFIG_INSPECTION.md`).
- **Direct GREEN targets**: `TEST-opt-in-binding`, `TEST-config-no-secrets`, `TEST-origin-allowlist`.
- **Impacted tasks**: `TASK-config-inspection-registry`, `TASK-local-orchestration`.
- **Why**: drift finding — docs describe selectors that the registry doesn't expose.

## Validation

After each slice: `bun run cloud:test`, `bun run --cwd shared jest services/cloud-sync`,
`bun run validate:ts:all cloud shared domain-contracts`, `bun run lint:cloud`,
`spec-trace validate MDT-200 --stage all`. Slice U5 additionally runs the E2E.

Operational gates that remain manual and must be exercised before closure
(blocking finding #8):

- Real machine service-token attribution (BR-2.2).
- Live export-before-restore, restore, and project-wide disable drills (BR-4.2).

## Watchlist

- The `fetch` illegal-invocation bug class (Slice 1) — any new global stored
  detached from `globalThis` will regress. Prefer `globalThis.fetch.bind(globalThis)`.
- The counter-on-replay bug class (Slice 2) — any change to the allocation
  batch must re-run the idempotent-replay integration test.
- Projection row mapping (snake_case → camelCase) — polling returns raw DB rows;
  keep the `rowToProjection` mapper in sync with schema changes.

## Deployment Decision

V1 is production-only by explicit user decision; no long-lived staging
environment is required. Deployment uses limited production rollout and a
temporary isolated D1 database for destructive restore verification.

## Re-verification 2026-07-25

The implementation was reconciled again against the approved architecture,
canonical Spec Trace state, local runtime adapters, Worker routes and
transactions, frontend data flow, automated tests, and the active deployment.

Result: **source implementation accepted for deployment-candidate
verification; ticket remains `In Progress`**. See
[`verification.md`](verification.md) for exact evidence and release gates.

The U1-U7 implementation gaps above are closed:

- `TicketService` now selects local or cloud orchestration from validated
  project configuration and fails closed without a credential.
- The HTTP coordinator, credential providers, durable operation recovery, and
  projection sync are wired.
- Acknowledgement and projection v1 are atomic.
- Membership, recovery, suspension, validation, and rate-limit routes are
  wired.
- The owner-only server projection feed drives the production browser poller;
  the test-only feed remains only as a deterministic test seam.
- Config inspection and production-shaped allocation concurrency are covered.

Remaining gates are external evidence: deploy the reconciled source, real
service-token attribution, a live two-client polling scenario, deployed
concurrency evidence, export/restore/disable drills, and human approval of the
requirements baseline.

---

# UAT Refinement Brief — 2026-07-27 (deletion-tombstone defect)

## Objective

A deletion tombstone never reaches the D1 projection. Reported and reproduced
on the live cloud: ticket MDT-214 was created in a cloud-bound clone and then
deleted with `mdt-cli ticket delete MDT-214`. The local `.md` is gone, but the
cloud projection row stays `lifecycle='active'`, `deleted_at=NULL`, so the
deleted ticket keeps surfacing on the board and in `mdt-cli cloud status`.

Root cause confirmed three ways — code reading, type inspection, and a live D1
query (see Validation). The client-side early-return guard in
`CloudProjectionSync.attempt` compares only the content hash, and a delete
keeps content unchanged (`deleteCR` passes `previous === next`), so the
`lifecycle:'deleted'` publish is dropped as a "no-op" before it ever reaches
the Worker. The Worker and `CloudProjectionClient.publish` routing are correct.

## Approved Changes

| Change | Detail |
|--------|--------|
| Lifecycle-aware no-op guard | `shared/services/cloud-sync/projection-sync.ts` `attempt()`: the early-return now fires only when BOTH content hash AND lifecycle match the observed cloud projection. A delete (same content, lifecycle flip) is no longer dropped. |
| Regression test | `shared/services/cloud-sync/__tests__/projection-sync.test.ts`: new `describe('lifecycle-aware early-return (delete tombstone)')` with two cases — (1) delete with unchanged content still publishes `lifecycle:'deleted'`; (2) identical content AND lifecycle remains a genuine no-op. |

## Changed Requirement IDs

None. This is a defect against already-approved behavior, not a requirement
change. The deletion→tombstone contract is part of the existing projection
semantics (BR-3.x); no requirement ID was added, removed, or re-scoped.

## Affected Downstream Trace

- **requirements** — unchanged. The deletion→tombstone contract is already
  covered by existing `BR-3.1` (projection reflects the ticket) and `BR-3.3`
  (changes visible end-to-end through polling). No new requirement ID needed.
- **bdd** — unchanged (existing scenarios cover lifecycle tombstones).
- **architecture** — unchanged in shape. The fix tightens one guard condition
  inside `OBL-projection` (already an owner of `ART-shared-cloud-sync`, which
  owns `shared/services/cloud-sync/projection-sync.ts`); the obligation's
  wording still holds.
- **tests** — `TEST-projection-sync-deletion` added (kind: integration,
  covers `BR-3.1,BR-3.3`, file:
  `shared/services/cloud-sync/__tests__/projection-sync.test.ts`, source-ref:
  `lifecycle-aware early-return (delete tombstone)`). Tests stage validated;
  `tests.trace.md` re-rendered.
- **tasks** — no canonical task added (single-line defect fix; tracked in
  this round only).

## Execution Slices

### Slice 1 — Confirm + fix + regression test (DONE)

- **Objective**: stop dropping the delete tombstone; prove it with a test that
  fails pre-fix and passes post-fix.
- **Direct artifacts**: `shared/services/cloud-sync/projection-sync.ts`,
  `shared/services/cloud-sync/__tests__/projection-sync.test.ts`.
- **Direct GREEN targets**: `lifecycle-aware early-return (delete tombstone)`
  (2 cases in `projection-sync.test.ts`).
- **Impacted tasks**: none canonical (defect fix on existing artifact).
- **Why**: without the tombstone, deleted tickets stay live in the cloud
  projection forever — the board and CLI keep showing them.

## Validation

Commands run and their actual output:

- **Live D1 confirmation (read-only)** —
  `npx wrangler d1 execute mdt-cloud-sync-production --remote --command
  "SELECT ticket_number, lifecycle, deleted_at, projection_version, content_hash FROM ticket_projections WHERE ticket_number = 214;"`
  (from `cloud/`, authed as andkirby@gmail.com). Result:
  `lifecycle='active'`, `deleted_at=NULL`, `projection_version=1`,
  `content_hash=e92e48b3…`. Only the create write landed; the delete never
  reached D1. Empirically confirms the symptom against production.
- **Diagnosis confirmed against source** — quoted lines:
  - `TicketService.deleteCR` (TicketService.ts:859) calls
    `syncTicketProjectionBestEffort(project, cr, cr, 'deleted')` at
    TicketService.ts:867 — note `cr, cr` (previous === next).
  - `projectedHeaderHash` (create-orchestrator.ts:115-117) hashes only the
    `ProjectedHeader` (domain-contracts/src/cloud-sync/projection.ts:2-11),
    which has no `lifecycle` field.
  - `CloudProjectionSync.attempt` early-return (projection-sync.ts, pre-fix
    118-122) compared only `contentHash`.
  - `CloudProjectionClient.get` returns `lifecycle`
    (CloudProjectionClient.ts:374, defaults to `'active'`); `publish` routes
    `'deleted'` to the `/lifecycle` endpoint (CloudProjectionClient.ts:236).
    Worker side writes
    `deleted_at = CASE WHEN ? = 'deleted' THEN ? ELSE NULL END`
    (cloud/src/cloudflare/d1/projection.ts:335). Worker side is correct; bug
    is purely the client-side early-return.
- **Regression test BEFORE fix** —
  `bun run --cwd shared jest projection-sync`: 1 failed, 4 passed. New case
  `publishes the lifecycle:deleted tombstone when content is unchanged but
  lifecycle flips` failed with
  `Expected number of calls: 1, Received number of calls: 0` — demonstrating
  the dropped publish. The no-op case passed.
- **Regression test AFTER fix** —
  `bun run --cwd shared jest projection-sync`: 5/5 pass (incl. both new cases).
- **No regression in create path** —
  `bun run --cwd shared jest create-orchestrator`: 4/4 pass.
- **`bun run build:shared`** — exit 0 (clean `tsc`).
- **`bun run --cwd shared lint`** — exit 0 (`--max-warnings 0`, clean).
- **spec-trace sync** —
  `spec-trace test-plan upsert MDT-200 TEST-projection-sync-deletion --kind integration --title "Delete tombstone reaches the cloud projection even when ticket content is unchanged" --covers BR-3.1,BR-3.3 --file shared/services/cloud-sync/__tests__/projection-sync.test.ts --source-ref "lifecycle-aware early-return (delete tombstone)"`;
  then `spec-trace validate MDT-200 --stage tests` (passed) and
  `spec-trace render tests MDT-200` (re-rendered `tests.trace.md`). No new
  requirement/obligation IDs — the existing `BR-3.1`/`BR-3.3` + `OBL-projection`
  already cover the tombstone contract; this round only registers the new
  regression coverage.

## Watchlist

- **Open question (do NOT resolve in this round): should `projectedHeaderHash`
  include `lifecycle`?** Today the hash covers only `ProjectedHeader` content
  fields, so a delete and a re-create-with-same-content produce the same hash.
  This fix sidesteps that by comparing lifecycle separately. Folding lifecycle
  into the hash is a hash-contract migration (all stored `content_hash` values
  would change semantics; cloud-side replay/idempotency keyed on
  `operation_id` + `content_hash` must be re-checked). Track as a follow-up
  decision, not a fix.
- The fix reads `current.lifecycle ?? 'active'`. If the Worker ever returns a
  projection with an absent `lifecycle` for a genuinely-deleted row, the guard
  would treat it as `'active'` — acceptable because `normalizeProjectionItem`
  (CloudProjectionClient.ts:374) defaults absent lifecycle to `'active'`, and a
  deleted row always carries an explicit `'deleted'` from the Worker.

## UAT Concerns

- **UC-1 (closed this round): deleted ticket stays active in cloud DB.** Repro
  and live D1 evidence above. Fixed by the lifecycle-aware guard; covered by
  the new regression cases.

## Open Decisions

The one open decision — whether `projectedHeaderHash` should include
`lifecycle` — is recorded in Watchlist and explicitly deferred. Everything
else in this round is closed.
