# Agent Goal: Fix MDT-226 Issues Found Through Review

Repository: project root

Ticket: `MDT-226` - Replace cloud projection polling with push delivery

Primary issue log: `docs/CRs/MDT-226/issues-found.md`

## Terminal Gate

Run UAT and implementation for all OPEN MDT-226 issues in the issue log. Bring
the ticket back to User Review with code, tests, UAT notes, and owner docs
reconciled. Do not deploy production. Do not mark external deployed gates as
passed unless you actually run them against a deployed Access-protected Worker
and record evidence under `cloud/test/operations/`.

## Non-Negotiable Pushbacks

- Do not weaken `docs/architecture/cloud-sync/` to match broken code. Those docs
  are the target contract unless UAT explicitly changes the product decision.
- Do not call an interval timer "due-only backoff." Persist `nextAttemptAt` and
  skip non-due entries, or the bug is still there.
- Do not call mocked browser routing an end-to-end cloud proof.
- Do not close idle-D1, latency, hibernation, or revocation gates from unit
  tests. Those are external deployed evidence gates.
- Do not create projections from the write-journal retry path. Existing
  pre-cloud tickets require explicit operator import/backfill.

## Required Skills

Load these only when needed:

1. `mdt:uat` - record same-ticket UAT refinements before changing behavior.
2. `mdt:implement` - execute implementation with constraint verification.
3. `mdt:spec-trace-cli` - validate trace after doc/test/task changes.
4. `mdt-frontend` and `mdt-ux-designer` - projected/read-only/stale browser
   capability preservation and UX review.
5. `cloudflare`, `durable-objects`, `workers-best-practices` - only if touching
   Worker/DO behavior or deployed gate procedures.
6. `security-best-practices` - if changing Access, credential, envelope, or
   browser exposure boundaries.

Read before editing: `AGENTS.md`, `docs/PRE_IMPLEMENT.md`, `DEBUG.md`,
`docs/CRs/MDT-226/issues-found.md`, every file under `docs/CRs/MDT-226/`, and
every file under `docs/architecture/cloud-sync/`.

## Current OPEN Work

### 1. A6 - Projection Journal Due-Only Backoff

Problem: `CloudProjectionSync.startRetryRunner()` currently wakes every 60s and
`flush()` attempts all non-terminal entries. The journal does not persist
`attemptCount`, `nextAttemptAt`, or typed last error.

Required behavior:

- reads/browser/projection-feed paths never drain the write journal;
- each entry persists `attemptCount`, `nextAttemptAt`, and typed last error;
- non-due entries produce zero cloud calls;
- due transient entries retry with capped exponential backoff and jitter;
- `authentication_paused`, `conflict`, and `unmanaged` do not spin;
- cold-start `projection_version_conflict` with positive `currentVersion` may
  adopt that version and retry once, but remaining conflicts become terminal;
- `projection_not_found` remains terminal `unmanaged` until explicit import or
  reservation recovery.

Start with RED tests in
`shared/services/cloud-sync/__tests__/projection-sync.test.ts`, then implement in
`shared/services/cloud-sync/projection-sync.ts` and startup wiring if needed.

### 2. F5 - Projected Capability Fields Lost Before Board Rendering

Problem: `/api/projects/:id/tickets/unified` returns `kind/readOnly/stale`, but
the frontend normalization path drops those fields before `isProjectedStub()`.
Projected stubs can render as editable regular cards.

Required behavior:

- preserve `kind: 'projected'`, `readOnly: true`, and `stale` through
  `src/services/dataLayer.ts` and shared/frontend ticket normalization;
- projected items render via `CloudProjectionStub`, are non-draggable, and do
  not expose edit controls;
- canonical local tickets remain editable and local wins on duplicate code;
- no cloud revision, cursor, service origin, or credential reaches the browser.

Start with a failing production-path test for the data-layer/board contract. Add
or update E2E only if the existing test cannot catch the regression without
mocking away the bug.

### 3. F1 - Explicit Legacy Import/Bootstrap

Problem: existing local tickets created before cloud sync have no projection
rows. The write journal must not create them implicitly.

Required behavior:

- define and implement an operator CLI/import workflow only if UAT keeps F1 in
  MDT-226 scope;
- otherwise record it as a separate follow-up with explicit acceptance criteria;
- import must be idempotent, bounded, auditable, resumable, and body-free;
- each created projection goes through coordinator reservation/acknowledgement
  semantics and starts at projection version 1.

### 4. F3 - Full Round-Trip Integration Gap

Problem: unit tests previously missed validation and envelope bugs because mocks
did not exercise the real path.

Required behavior:

- add an integration test that exercises `CloudProjectionSync` ->
  `CloudProjectionClient` -> Worker validation/use case -> D1 adapter -> real
  error envelope parsing -> journal classification; or
- if the Workers runtime harness is unavailable, add the narrowest lower-level
  test coverage and record the missing harness as an explicit UAT risk.

### 5. External Gates

Keep these as open unless actually run and evidenced:

- `TEST-idle-zero-d1`
- `TEST-delivery-latency-slo`
- `TEST-deployed-hibernation-alarm`
- `TEST-deployed-revocation`

Update `cloud/test/operations/*.md` with real deployment version, timestamp, and
results if any are run. Otherwise state "Not run" plainly.

## Required Validation

Run focused tests first, then broader validation:

```bash
bun test shared/services/cloud-sync/__tests__/projection-sync.test.ts
bun test src/services/dataLayer*.test.ts
bun run --cwd server jest server/tests/services/cloud-sync/SSEProjectionFanout.test.ts
bun run validate:ts
spec-trace validate MDT-226 --stage all --strict --format json
git status --short
```

If a command name has drifted, inspect `package.json` and use the current
equivalent. Report any command you could not run and why.

## Definition of Done

- Every OPEN item in `issues-found.md` is either implemented and tested, or
  explicitly deferred by UAT with owner-doc trace.
- Owner docs under `docs/architecture/cloud-sync/` match implemented behavior
  and still preserve the approved product boundaries.
- MDT-226 acceptance notes distinguish implemented local behavior from mocked
  tests and external deployed gates.
- No runtime cloud credential, cursor, revision, service origin, or projection
  protocol state is exposed to browser DTOs.
- `git diff` contains only MDT-226 scoped changes.
