# MDT-200 Verification

## Verdict

The MDT-200 source implementation is locally conformant with the approved
architecture and is ready for deployment-candidate verification. MDT-200 is
**not ready for `Implemented`** because four release-evidence gates remain:

1. deploy the reconciled source (production still runs an older version);
2. prove a real Access service-token machine principal;
3. prove two authorized clients observing create and status projection within
   `pollIntervalSeconds`;
4. exercise and record deployed concurrency plus export, restore, and
   project-wide disable drills.

The remaining work is release evidence, not another application or
architecture slice. MDT-201 and MDT-202 remain downstream onboarding and
management-CLI tickets; MDT-200 does not depend on them.

## Verified on 2026-07-25

| Area | Evidence | Result |
| --- | --- | --- |
| Cloud behavior | `bun run cloud:test` | 59 passed |
| Shared cloud orchestration | `bun run --cwd shared jest services/cloud-sync --runInBand` | 114 passed |
| Server projection boundary | focused controller/API Jest command | 26 passed |
| Frontend | `bun run fe:test` | 816 passed |
| Board projection E2E | focused Playwright command | 5 passed |
| CLI regression | `bun run --cwd cli test` | 133 passed |
| MCP regression | `bun run --cwd mcp-server test -- --runInBand` | 151 passed |
| Build | `bun run build:all` | Passed |
| Lint | `bun run lint:all` | Passed |
| Changed TypeScript | `bun run validate:ts` | Passed |
| Worker bindings/package | `bun run --cwd cloud cf:types`; dry-run deploy | Passed |
| Spec Trace structure | `spec-trace validate MDT-200 --stage all` | All five stages passed |
| Spec Trace approval gate | same command with `--strict` | Blocked: approved requirements baseline missing |
| Active production version | `wrangler deployments status` from `cloud/` | `36346216-8659-48f4-bd26-e9983f210ae8` |

The active Worker predates this reconciliation. Local evidence therefore does
not claim that the updated authorization audits, validation, membership
guards, atomic acknowledgement/projection path, production poller, or current
telemetry are already live.

## What the automated evidence proves

- Allocation is unique and monotonic under concurrent transactions; one
  idempotency key advances the counter once; projects are isolated.
- Cloud-bound create persists its intent, reserves, writes canonical Markdown,
  acknowledges atomically with projection v1, and recovers without a local
  number fallback.
- Local-only create remains unchanged, and existing Markdown tickets remain
  editable during a coordination outage.
- Access JWT validation, roles, non-disclosure, revocation, final-owner
  protection, suspension, HTTP validation, and route rate-limit wiring work
  locally.
- Projection content is header-only, version conflicts are rejected, local
  writes publish/queue updates, and the owner-only local server feed drives the
  browser board with stale-state handling.
- Structured D1 audits cover successful mutations, authenticated denials,
  replay/conflict/recovery, rate limits, scheduled expiry, and bounded
  retention.

## Remaining release gates

### Deploy and smoke-test the reconciled source

Run the normal production deployment only after reviewing this diff. Then
confirm `/healthz`, one authenticated project probe, one reserve/acknowledge
flow, one projection poll, and one denial audit against the new version.

### Real machine attribution

Create or select a Cloudflare Access service token, add its `common_name` as a
project member, call a protected route with the service-token headers, and
record the resulting machine-principal audit in
`cloud/test/operations/deployed-access.md`. No credential belongs in Git.

### Two-client projection

From two independently authenticated clients on the same cloud project:

1. create a ticket from client A;
2. observe its projected header on client B within the configured interval;
3. update status on A and observe the new column on B;
4. confirm no ticket body was stored or returned by the cloud.

### Operational drills

- Record remote concurrent allocation and D1 evidence in
  `cloud/test/operations/deployed-concurrency.md`.
- Complete the unchecked live steps in `cloud/test/operations/restore.md`.
- Complete the unchecked project-wide suspend/detach/local-continuity steps in
  `cloud/test/operations/disable.md`.

The restore drill must use a temporary isolated D1 database. Do not restore the
production database merely to close a checkbox.

### Requirements approval

Strict Spec Trace validation requires a human-approved requirements baseline.
Review `requirements.md`, lock it using the Spec Trace CLI, then rerun strict
validation. The baseline must not be fabricated by an agent.

## Reproduce local verification

```bash
bun run cloud:test
bun run --cwd shared jest services/cloud-sync --runInBand
bun run --cwd server jest \
  tests/unit/ProjectController.test.ts \
  tests/api/public-sharing.test.ts \
  --runInBand --forceExit
bun run fe:test
bunx playwright test tests/e2e/cloud-sync-board.spec.ts --project=chromium
bun run --cwd cli test
bun run --cwd mcp-server test -- --runInBand
bun run build:all
bun run lint:all
bun run validate:ts
bun run --cwd cloud cf:types
bun run --cwd cloud deploy:dry-run
spec-trace validate MDT-200 --stage all
spec-trace validate MDT-200 --stage all --strict
```

The final strict command is expected to fail until requirements are reviewed
and locked.

## Repository baseline outside MDT-200

The full `domain-contracts` Jest command has two existing suites that import
`bun:test` even though the package script runs Jest: 15 suites and 178 tests
pass, while those two suites fail to load. The full shared suite has unrelated
project-configuration/test-library failures; the 114 MDT-200 shared tests pass.
The full server suite passes 62 suites and 643 tests but retains an existing
open-handle shutdown problem. These issues are not MDT-200 completion evidence
and were not expanded into this ticket.

## Completion gate

After the four release-evidence groups above are recorded and strict Spec Trace
passes, request User Review. Only explicit user approval may move MDT-200 to
`Implemented`.
