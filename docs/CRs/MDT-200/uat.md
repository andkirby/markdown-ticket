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
