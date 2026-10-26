# MDT-200 Verification

## Current status — 2026-10-26

The October24 UAT round's allocation/recovery and observation/diagnostic fixes
are implemented and locally accepted. Execution tasks A/B are done; C remains
open for the separately authorized production operation. MDT-200 stays
**In Progress**. This is the same UAT round, not a new acceptance session.

| Checkpoint | Verified result |
| --- | --- |
| Focused tests |912 passed: 347 shared, 192 server, 245 MCP, 110 cloud, 18 CLI |
| Builds |domain-contracts, shared, server, MCP and cloud pass |
| Scoped lint / trace |Pass; all 5 trace stages have 0 issues (non-strict) |
| Independent completion review |Pass; no in-scope issues |
| GLM adversarial follow-up |No new required-fix defect; bounded scope |
| Full-suite / live gates |Shared/server and live gates remain open; the CLI export regression is repaired by MDT-260 |

Source acceptance was captured at HEAD `ee0a940518cd0c1893bd540baca2e3d4ff174d0b`.
Immutable plan digest: `72143438e19b7a35fcce0fbd503171ce1aa5099a2c18d4a98fbf2ec8fdb6f580`;
run digest: `a508654026888c083e534135e23a631b411809f28b9473f17bdc7046ac4f3763`.
The read-only completion review bound to those digests returned pass, including
the final terminal-journal correction. Its private local record is under
`.git/mdt/evidence/MDT-200/reviews/` keyed by that run digest. This summary is
durable even when machine-local evidence or thread-storage paths are unavailable.

Production migration0005, compatible Worker/client deployment, reviewed D1
identity/projection/counter repair, and real multi-client acceptance are not
proved by these local checks. Full shared/server failures remain release gates.
MDT-200 changes were committed as `e050e455`; no deployment or production
mutation was performed. MDT-260's subsequent export repair restored CLI build
and full-suite execution (245 passes). Its shared management/store 20 and
journal/recovery 76 checks, four package builds, lint and knip also pass.
The earlier CLI-failure checkpoints below remain historical evidence.
See [MDT-260 result](../MDT-260/result.md).

The sections below preserve dated evidence in order. Their pending/planned
statements describe their original checkpoints, not the current source status.
This documentation alignment follows the accepted source checkpoint; it changes
its document/trace bindings without claiming another execution of the 912 tests.
No source/test bytes changed in this alignment pass. Requirements/scenario
meanings are retained; canonical verification gains the existing actual
HTTP/shared recovery test and its task link.

Residual enhancements remain distinct from required fixes: a verified-dead
legacy lock-only retirement verb, archive GC, friendlier archived replay after
route replacement, clearer digest-mismatch logging, and a reviewed exit for
unprovable legacy intents. None is silently implemented or accepted as force-clear.
See [recovery limits](../../architecture/cloud-sync/operations.md#recovery-limits).

## Initial UAT checkpoint — 2026-10-24

The July verification below is historical evidence. October24 investigation
confirmed a duplicate-key defect outside its coverage. [uat.md](uat.md) is the
current remaining-work brief; [poc.md](poc.md) records isolated feasibility only.
At this initial checkpoint the round updated specifications and trace, not production runtime. Creation
stabilization, safe manual-file observation, and reviewed live incident repair
remain pending; no prior green suite proves them.

## Historical verdict — 2026-07-25

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

## October collision stabilization — local implementation (2026-10-25)

The initial three October code slices passed scoped checks. Current status is
**implemented, review fixes pending** after the later independent GLM challenge.
MDT-200 remains In Progress for the reopened code gaps below and unexecuted
deployed D1/Access, multi-client acceptance and production incident repair. No production deployment,
migration, coordinator mutation, file renumbering, or journal deletion was done
by this implementation round.

### Executed local evidence

- Cloud:109 tests,344 assertions,20 files; production migrations against isolated
  SQLite. Includes guarded differing-floor races, immutable replay inputs,
  occupied claims, identity-checked ACK/publish, stale expected-state rollback,
  200-mapping D1-limit-enforced repair, permanent history and idempotent apply.
- Shared cloud-sync:27 suites,320 tests. Includes real Git worktrees, high-water
  floor, same-key slugs, mismatched/arbitrary filename claims, copied identity,
  legacy routing/journal retention, lock publication/reclamation, exclusive
  recovery, current-file verification, safe held numbers, and background claims.
- CLI full package:229 tests. Real subprocess cloud create against temporary
  loopback TLS proves a floor above262, persisted creationId and matching ACK;
  duplicate-key get/attrs/delete preserve files. TLS relaxation is subprocess-
  only against the temporary fixture, never a production configuration.
- MCP full package:16 suites,245 tests, including the real shared service under
  the thin adapter for cloud create and ambiguous reads/mutations.
- Server focused:11 suites,165 tests; physical-path handling, actual HTTP
  ambiguity409, owner-only cached diagnostics, public denial, no absolute-path
  leakage, bounded scheduling, and adjacent watcher/controller behavior.
- Builds: domain-contracts (including its type/migration contracts), shared,
  server, MCP, cloud, and CLI compile with the installed toolchain.
- Changed-source/test lint, whitespace checks, and non-strict all-stage
  Spec Trace validation are the local source acceptance gates.

Independent review found and resolved old journal routing bypass, mismatched
and noncanonical file claims, incomplete-lock theft, recovery concurrency,
D1 binding/query/function-argument limits, held-number validation, and transport
error misclassification. That bounded review found no additional blocker at its
checkpoint; the later challenge below supersedes its readiness conclusion.

### Full-repository checks remain non-green

The broad shared run passes1137 tests with3 failures in
`test-lib/__tests__/integration.test.ts` (test project discovery). The broad
server run passes914 with13 failures and8 existing skips across7 suites. Those
same3 shared failures and13 server failures reproduce from an untouched HEAD
source export using isolated test configuration. Server failures include old
validation-message expectations, a worktree SSE timeout, PinStateService's
existing direct environment read, and DevLogBatch's missing fixture import.
These are recorded failures, not skipped acceptance coverage for this change.

`bun run build:all` fails in unchanged `frontend/src/test-setup.ts:32,38`:
`@testing-library/jest-dom` is not a module at the dynamic import and Bun's
`afterEach` signature conflicts with Jest's global lifecycle type. Both errors
reproduce from that same untouched HEAD export. No frontend source was changed.
A scoped green result does not establish a green repository-wide build/suite.

### Evidence provenance

Baseline HEAD: `e37657f856e3ba672338afd2c9c3f284838f610b`. Retained immutable
pre-state records under `.git/mdt/evidence/MDT-200/before/` show RED for cloud,
shared create, and watcher/security regression commands. Their current runs are
GREEN. The original sealed implementation plan is retained unchanged; its
completion attempt safely blocked before executing commands because its
original mutation list did not incorporate later reviewed path amendments and
some tests were already authored at its baseline. That record is
`runs/20261025T131433.664691Z-c13b90f8.json` in the same evidence area. It is not
passing completion evidence and does not erase the initial RED records.

A separately sealed acceptance-only snapshot executes current scoped checks
without claiming a retrospective clean implementation baseline. Its immutable
plan/run and the independent completion review are the final local evidence;
use `mdt-verify check` before relying on their pointers. Current UAT code
acceptance and full-ticket production readiness remain separate.

### Remaining October production gate

Follow `cloud/test/operations/counter-reconciliation.md`: preserve/export the
existing project, suspend coordination, deploy migration0005 then the v2 Worker
and capable clients, inventory every canonical file and journal, preview and
review the mappings (including cloud257/local261 and cloud258/local262), apply
with exact expected state, verify retained history/projections/counter, and
resume explicitly. Counter-only advancement is insufficient. No live repair
is authorized or implied by green local fixtures. Requirements remain unlocked;
strict trace approval is a separate human review gate.


Final compatibility review also preserved explicitly configured absolute and
relative external ticket roots accepted by project setup. Inventory deduplicates
one physical ticket directory across Git worktrees, uses `tickets-root/`
relative diagnostic labels outside the repository, and writers resolve the
configured root consistently. Real shared-service local-only and cloud-bound
create/read/status-edit/delete cases proved RED (2 failures) to GREEN (12-case
create suite) with immutable evidence in
`before/20261025T132332.686435Z-a16c9841.json` and
`runs/20261025T132451.279693Z-7eec09e8.json`. The earlier filtered attempt had a
fixture type error and is not the behavioral RED evidence. A final acceptance
snapshot supersedes the earlier scoped snapshot after this correction.

Shared external roots are also exercised through a real ticket-named Git
worktree: physical-directory lookup succeeds even when a different worktree
first inventoried the shared root. MCP section reads revalidate identity before
returning a warmed body cache, including after a manual duplicate appears.
These additional review regressions proved RED→GREEN in immutable runs
`20261025T133012.541044Z-08c0e96a` and
`20261025T133104.201399Z-58b38f50`. That review converged at its source-freeze checkpoint. Later adversarial review
found additional gaps below; those earlier checks do not close the new targets.


## Independent challenge follow-up 2026-10-25 — fixes pending

This was an adversarial technical review in the existing October24 round, not
a new UAT acceptance session. The user approved recording its corrected findings
and rebuilding the remaining execution work. No runtime source, real ticket,
config, journal, reservation, production deployment or D1 state is changed by
this documentation/trace follow-up.

The GLM thread prepared25 scenarios and exercised real source/isolated SQLite
migrations, temporary Git repositories and injected cloud ports. Parent review
checked claims against imports/callers and independently reproduced F4/F5 with
the actual TicketService. No new collision or repair-transaction integrity
failure was demonstrated; this bounded result is not a general correctness proof.

| Finding | Corrected verdict / impact | Source evidence | Fix / task |
| --- | --- | --- | --- |
| F2 | Confirmed explicit inspect/resume/reconcile gap; RecoveryRunner has no production caller. Same-intent create retries DO resume across processes. | `shared/services/cloud-sync/recovery.ts:72`; `operation-journal.ts:85,124`; `create-orchestrator.ts:58` | TASK-uat-allocation-identity: shared policy plus shipped explicit owner adapter; preserve original receipts and block unproven legacy migration |
| F4 | Confirmed real-service failure: lowercase code writes a ticket, then initial call and identical retry fail verification with a retained reserved journal. | `shared/services/TicketService.ts:587-592`; `shared/services/ticket/TicketIdentityService.ts:115-128`; `domain-contracts/src/project/schema.ts:314` | TASK-uat-allocation-identity: normalize canonical code before writes/ACK, preserving strict provenance |
| F1 | Confirmed diagnostic gap. Unavailable worktrees/unsafe numeric filenames block creates as intended, but error context and remedy are poor. | `shared/services/ticket/TicketIdentityService.ts:71-86,161-165`; `shared/services/TicketService.ts:1217-1218` | TASK-uat-observation-conflicts: retain typed per-path causes and safe operator guidance; no silent skips/pruning |
| F5 | Confirmed real-service diagnostic instability: unchanged verified files become pending merely because64-probe rotation moves on. | `shared/services/TicketService.ts:1192-1213` | TASK-uat-observation-conflicts: bounded last verified evidence, freshness and invalidation |
| F3 | PID reuse limitation confirmed; zombie subcase NOT reproduced. Dead reaped-owner reclaim works. | `shared/services/cloud-sync/operation-journal.ts:249-284`; challenger `rg2.ts:14-20` probes before kill then after reap | TASK-uat-allocation-identity: inspectable owner metadata and safe explicit resolution; no age-only theft |
| F6 | RETRACTED false positive. Worker fallback imports and calls the authorized use case, not the raw D1 helper. | `cloud/src/cloudflare/worker.ts:30-34,288`; `application/projection-usecase.ts:44-45,69` | No workaround or fix task; preserve existing role/state/identity checks |

### Durable reproduction recipe and observed results

For F4 create an isolated temp project with code `mdt`, an enabled fake local
connection, a temp journal root and an injected v2 coordinator that echoes the
requested creationId/minimum, returns a reservation, and counts ACKs. Call real
TicketService.createCR twice with the identical title/type. Both calls fail
`reservation_state_conflict: Canonical file does not match its reserved creation
identity`. The file `mdt-001-case-fixture.md` remains, reserveCalls=1, ackCalls=0,
and the retained journal is reserved. This proves the client failure; the fix
also needs strict Worker ACK/project-code acceptance coverage.

For F5 create130 real canonical files with distinct UUID creationIds in another
temp project. Inject noninteractive credentials and read-only getClaim returning
the matching acknowledged identity for every requested number. Invoke the real
TicketService.observeTicketIdentities twice without file changes. Each pass
verifies64 files (128 total probes); an initially verified key, MDT-047 in the
captured run, becomes verification_pending on pass2. No write port is called.

Original scratch command: `bun /tmp/mdt200-challenge/parent-verify-findings.ts`.
Captured output:

```text
F4 attempt1: reservation_state_conflict: Canonical file does not match its reserved creation identity
F4 attempt2: reservation_state_conflict: Canonical file does not match its reserved creation identity
F4 files preserved: [ "mdt-001-case-fixture.md" ] reserve calls: 1 ack calls: 0
F4 retained journal: 1 reserved
F5 real service: MDT-047 verified -> verification_pending total probes: 128
F5 verified counts: 64 64
```

F1 uses a temporary Git repository and linked worktree: delete the linked
directory without pruning, inventory, observe the pending relative-root error,
and verify create remains blocked. Pruning only the temporary known-stale entry
restores inventory. A MAX_SAFE_INTEGER-named file separately demonstrates loss
of named overflow context. F3 uses a temp lock containing an unrelated live
process PID; acquisition is blocked while reaped dead-owner reclaim succeeds.
These probes do not justify automatic prune, file deletion or stealing locks.

### Scenario disposition (25-scenario challenger matrix)

| Group | Outcome |
| --- | --- |
| S1,S2,S8,S9,S10,S11,S12,S20,S21,S24 | Executed real source/SQL probes; collision/identity/repair guards held. S21 additionally found F1 diagnostic loss. |
| S3,S6,S7 | Executed inventory/lock/legacy probes; corrected F1/F2/F3 gaps above, zombie claim unproven. |
| S14 | Challenger used a rotation model; parent actual130-file TicketService run independently confirmed F5. |
| S15 | Executed bounded observation-wave probe; final-state/trailing-wave guard held in that probe. |
| S4,S5,S13,S16,S17,S18,S19,S22,S23,S25 | Source inspection and/or earlier focused coverage; do not count all as newly executed E2E. F6 derived from S19 is retracted. S5 same-intent replay separately executed; S18 direct D1 probe is not route evidence. |

Detailed corrected external artifacts, useful but not required to understand
this ticket record: GLM thread `thr_99vwb9dxvz`, report rev2 and scenario matrix
in that thread's storage; parent adjudication and log are in thread
`thr_yvnx8uf6xg` storage. Reproduction scripts are
scratch artifacts, not shipped tooling. No production D1/Access, old-Git support,
D1 error-message equivalence or worst-case remote batch latency was proven.

### Closure state before the2026-10-26 implementation

A (allocation/recovery/normalization) and B (observation/diagnostics) are reopened
and pending. C remains the separately authorized production incident gate.
The new repository regression plans have not been implemented or run. Preserve
the earlier passing command results as historical evidence; doc/trace changes
supersede their bound artifact digests. After fixes, capture a new source/trace
acceptance snapshot and obtain independent review before any readiness claim.
Requirements meanings remain unchanged; no approval lock or production operation
is created by this follow-up.

Documentation/trace synchronization for this follow-up completed in required
stage order:7 new scenarios,3 planned artifact records,3 obligations,8 test plans
and3 updated task records. Requirement records are unchanged. Every stage was
validated/rendered; final all-stage non-strict validation passed with zero issues.
Execution tracker1/2 is reopened to pending; tracker3 remains in_progress for the
separate operational gate. No approval lock was created. This validates the plan,
not implementation of the review fixes.

## Review-fix implementation and local evidence — 2026-10-26

This continues the October24 UAT round. F1-F5 source fixes are present; no
production Worker deployment, migration, cloud repair, real ticket create,
config/journal mutation or server restart was performed. Ticket remains
In Progress. Requirements and existing Makes GREEN links are retained.

### Implemented behavior

- Shared CreationRecoveryService and the production TicketService bridge ship
  explicit owner inspection, stored-intent resume through RecoveryRunner and
  verified terminal-only archival. Inspection is read-only, bounded and
  allowlisted; current and known legacy malformed/unreadable/oversized/lock-only
  entries remain visible. The runner checks expectedDigest after acquiring
  its existing lock, hashing/parsing one byte read. No nested resume lock.
- Reconciliation requires the original receipt and current read-only terminal
  proof; acknowledged proof additionally requires unique canonical identity.
  Both active and selected route locks are held. Exact original bytes and an
  immutable private decision are synced before route removal. Same reviewed
  operation replays; changed inputs and stale data reject. Unknown/corrupt
  receipts remain inspectable manual-review-required, without guessing IDs.
- The owner-only server route/facade validates canonical inputs, maps safe
  typed errors and excludes GET/HEAD/OPTIONS from public/read-session access.
  No startup recovery or automatic cloud writes are introduced.
- CanonicalProjectCodeSchema normalizes configuration in memory before cloud
  creation/recovery. Existing configuration bytes and Worker strict code,
  number and creation-identity checks are preserved.
- Inventory retains successful entries plus named typed failures and safe
  remedies. Unavailable roots/unsafe numbers still block creation. Claim
  evidence survives64-item rotation and is invalidated by content/identity,
  binding/credential or observed authorization changes. Timestamp-only refresh
  updates cache without duplicate semantic notification. No cache authorizes
  a mutation. PID-only ownership limitations remain visible and fail-closed;
  there is no automatic prune, renumber, force-clear or age-based lock theft.

### RED to GREEN evidence

| Check | Before source changes | After source changes |
| --- | --- | --- |
| Journal/recovery (2 shared suites) |43 failed,33 passed |76 passed |
| Recovery HTTP/auth (2 server suites) |52 failed,49 passed |101 passed |
| Shared create/identity |5 failed,27 passed |32 passed |
| Observation manager |1 failed,6 passed |7 passed |
| Cloud canonical-code/SQL suite |1 failed,109 passed |110 passed |
| Actual HTTP facade → shared journal |1 failed,2 passed |3 passed |

No skips in these scoped checks. The prepared journal/recovery and HTTP/auth
assertions stayed byte-identical during worker implementation. The additional
real HTTP acceptance proves one reserve, ACK outage, credential-free inspect,
stale-digest409, original stored draft/receipt resume, canonical bytes preserved
and journal cleared. Wrong-case/foreign-prefix/wrong-number ACKs remain rejected
by the real Worker application against production SQLite migrations.

### Broader checks and explicit release gates

| Command (isolated CONFIG_DIR and caches) | Result |
| --- | --- |
| `bun run --cwd shared jest services/cloud-sync/__tests__ --runInBand` |25 suites,347 passed |
| `bun run --cwd server jest tests/services/cloud-sync tests/security/apiAuth.test.ts tests/unit/PathWatcherService.test.ts tests/unit/ProjectController.boundaries.test.ts tests/unit/TicketService.boundary-compatibility.test.ts --runInBand` |8 suites,190 passed |
| `bun run --cwd mcp-server jest --runInBand` |16 suites,245 passed |
| `bun run --cwd cloud test` |110 passed |
| `bun run --cwd cli test tests/e2e/ticket/create.spec.ts` |18 passed |
| `bun run --cwd {domain-contracts,shared,server,mcp-server,cloud} build` (one package at a time) |All5 pass |
| Scoped source/test ESLint and `git diff --check` |Pass |
| `spec-trace validate MDT-200 --stage all --format json` |All5 stages,0 issues, non-strict |

The five focused test groups above total910 passes; do not add the embedded
76/101/32/7/3 checks again. Full CLI:196 passed,15 failed,8 module-load errors;
CLI build:7 missing-export TS errors. A clean isolated HEAD56987b5 source export
with private workspace package links reproduces the same7 build errors and
15 failures/8 load errors (182 passes; HEAD lacks the dirty added tests). The
missing exports are in unchanged cloud-management/state-store modules, not the
new recovery contract. CLI create acceptance itself passes18/18.

Full shared:1185 passed,3 failed in test-lib project discovery. All3 reproduce
in isolated HEAD. Full server:976 passed,15 failed across8 suites,8 existing
skips. All15 reproduce by running those8 suites from isolated HEAD (138 pass,
4 skips in that subset). Server failures cover older validation messages,
worktree/SSE timing, PinStateService environment boundary, missing DevLogBatch
fixture import and incomplete system-router mock methods. The full server
process retained open handles after printing its final result and was
terminated; no application/dev server was stopped. These full-suite failures
remain release gates and are not counted as approved skipped acceptance tests.

### Evidence and review boundary

Baseline HEAD: `56987b58978856b588f48e4f690e54ac14a3c099`. Pre-existing dirty
files were snapshotted before this follow-up; unrelated server edits and
untracked MDT-261 were preserved. Recovery and server production edits were
performed by two workers with disjoint source ownership; the lead integrated
shared behavior and retained final verification ownership. Worker patches,
frozen-test hashes and exact command logs are retained in thread storage.

The original sealed RED plan is `/tmp/mdt200-oct26-sealed.json` (digest
`2bac48a66506f0804954d22685f1678980bf0be8d0bf3e9327d5549aeace6a46`);
the real facade integration has a separate pre-edit sealed plan
`/tmp/mdt200-oct26-bridge-sealed.json` (digest
`e5eece6b994b6e9a28d2d41b67320b5ea6a2e40d3ea4b9f9f6f2f32120f06f8c`).
Both pre-state records are immutable under `.git/mdt/evidence/MDT-200/before/`.
The follow-up source/doc scope amendment and canonical task-title update
require a current acceptance snapshot; they do not rewrite the original
pre-edit baseline or conceal a blocked old-plan binding check. Final local
acceptance and read-only completion-review verdicts belong to their immutable
evidence records. Production TEST-uat-production-reconciliation, deployment
compatibility and real multi-client evidence remain unexecuted.

### Final-review correction: terminal resume bypass

Parent source review found that the historical RecoveryRunner cleanup branch
cleared a locally acknowledged journal before any verifier. The new owner API
could expose this even with missing held receipt/ACK fields. Two real HTTP
regressions reproduced `resumed` and active-entry deletion (2 fail,3 pass).
The explicit recovery policy now excludes acknowledged entries from resume;
inspection offers archive-terminal only with a parseable held receipt, otherwise
manual-review-required. Fresh terminal proof remains mandatory in reconciliation.
The historical direct-runner behavior is retained but is not exposed through
this owner API bypass. The corrected real HTTP suite passes5/5, and terminal
pre-edit plan `3e79b87ca824ff4386132cbd140bc1d426fe8ccdb2316ad37837b738b2de4b31`
completed with verdict pass and run digest
`836f7e39f5b0d82d5920f8cd6d6d258b7d1aca2d4f7efcccf7a7b89c1fc87388`.
Its source/test state is superseded only by assertion-preserving test formatting
and the final current-source acceptance snapshot. The earlier910-pass table
is the checkpoint before these two additional HTTP regressions; final counts
are recorded by the current immutable verifier run.

### Concurrent checkout update

A separate MDT-263 thread committed `ee0a940518cd0c1893bd540baca2e3d4ff174d0b`
while the local completion snapshot was being reviewed. It changed CLI token
handling/specs and the shared create acceptance file, invalidating the verifier's
whole-checkout baseline binding. No owned cloud-recovery source changed. The
blocked drift record was retained and current-source acceptance is rebound to
that HEAD. The original RED baseline56987b5 and isolated failure reproductions
remain historical facts; this refresh is not a rewritten TDD baseline or a
commit performed by the MDT-200 implementation.
