---
status: PATCH_READY
target: MDT-266 backend capability module boundaries, S0-S7
baseline: 4c8ae15be10ef02626f2c0513e23b3909df92448
plan_identity: a0f4aa0178d333d8caa344f3cbde9f9d28114e7f7c054631cd0162976afef4f3
skill_identity: 569a4c272adcaeab2e32b69c89c15783c04cee4893242d067eda8e851b1d372f
mode: execute
---

# MDT-266 execution result

This report captures the first accepted round. The later [round2 contract](round2/plan.md) retires its temporary internal HTTP compatibility paths and resolves the classified Knip/lint blockers. Current architecture belongs to canonical owner documents; first-round results and qualifications below retain their original scope.

PATCH_READY after supervised parent acceptance, qualified by the known gate and
verification limitations below. Implementation S1–S7 is complete. No commit,
staging, install, deployment, existing-server restart or Cloud Worker edit was
performed. This report distinguishes executed preservation evidence from known
repository gate failures and unverified deployment/browser lanes.

## Authorization and scope

Parent `thr_7x3ccba356` acknowledged S0 and authorized S1 through S7 on 2026-10-29
after reviewing the executed baseline, regressions and exact allowlists.
Immutable plan SHA256:
`a0f4aa0178d333d8caa344f3cbde9f9d28114e7f7c054631cd0162976afef4f3`.
Baseline HEAD: `4c8ae15be10ef02626f2c0513e23b3909df92448`.
The plan remains unchanged. Parent owns ticket/prep artifacts, independent Astra
review and final acceptance. Parent did not concurrently write production code.

Acknowledged refinements, recorded here rather than changing the plan:

- Add `shared/services/project/ProjectConfigLoader.ts` as a thin compatibility
  delegate preserving discovery-specific tolerant validation, cleanup and
  write-on-read migration. The ordinary config read contract remains distinct.
- Correct common-app project selector assembly within the allowed app/config
  paths: resolve validated id/code through the injected catalog, capture canonical
  id and path together and retain owner admission/error mapping. This is a
  separately tested integration correction, alongside the reproduced request race.
- Preserve ignored-only PATCH no-op, existing-epic demotion/close rejection,
  EBUSY/EMFILE status-write normalization and one publication after persistence.
- Preserve the old SearchController constructor through its compatibility path;
  production search continues to receive shared operations directly.
- Honor the declared PUT missing-ticket HTTP404 through exact domain missing
  ticket normalization at the adapter. The original production probe returned500
  despite OpenAPI404 and the retained test expectation. This separately corrects
  a pre-existing adapter mismatch; it is not generic error standardization.
- Add narrow lifecycle source/test scope in
  `server/services/cloud-sync/TicketIdentityObservation.ts`,
  `server/services/fileWatcher/SSEBroadcaster.ts`,
  `server/tests/services/cloud-sync/TicketIdentityObservation.test.ts`,
  `server/tests/unit/SSEBroadcaster.test.ts`,
  `server/services/cloud-sync/ProjectionStreamManager.ts`,
  `server/tests/services/cloud-sync/ProjectionStreamManager.test.ts`,
  `shared/services/cloud-sync/projection-sync.ts` and
  `shared/services/cloud-sync/__tests__/projection-sync.test.ts`.
- Permit fixture repairs in `server/tests/integration/api.test.ts`,
  `server/tests/unit/DevLogBatch.boundaries.test.ts` and
  `server/tests/api/projects.test.ts`: use actual allocator identities, current
  source owners and the real updateVisibleProject seam. Assertions remain active.
- Permit exact five decoder observations (four config factory/dispatch identities
  and document configure callback), backed by malformed-input/no-persistence
  coverage; rehome36 moved identities and remove one obsolete raw-request
  delegation. Keep original12 unmatched and2 stale findings visible.
- Permit paused-close/debounce tests in `server/tests/watcherLifecycle.test.ts`
  and `server/tests/unit/PathWatcherService.test.ts`. Guard concurrent rollout
  startup across catalog/state/activation; drain already-started watcher close,
  lazy provisioning, document refresh and live HEAD fallback discovery.
- Add `shared/services/WorktreeService.ts` and
  `shared/services/__tests__/WorktreeService.test.ts` only for per-instance
  refresh tracking/idle drain. Preserve stale return, TTL, refresh count/order,
  cache contents, existing5s exec timeout and silent degradation.

## Delivered operations and ownership

S1 submits a complete supported ticket candidate to one shared mutation owner.
All candidate validation, existing-epic guard and final constraints run before
one local persistence operation. Invalid input does not publish or change bytes;
ignored-only requests do not read/write the missing ticket or publish. Successful
combined mutation publishes once after persistence. Shared facade signatures,
status-containing busy/descriptor error mapping, reference rules and Markdown
body behavior remain supported.

S2 constructs the production and test HTTP graph through `server/app.ts`.
`server/bootstrap/createRuntime.ts` owns explicit start/stop; the executable owns
environment loading, documentation/log adapters, listening, sockets and signals.
Construction is inactive and failed/overlapping startup disposes owned work.

S3 puts HTTP owners in projects, tickets, search, documents, config, access,
realtime and system modules with public entrypoints. Old paths are compatibility
exports/adapters. Production controllers are independent. Shared SearchService
owns project scoring and ticket ranking, external refs, dedupe and limits. The
last inline local cloud-status HTTP handler was moved unchanged into the allowed
tickets router; app composition mounts its injected read-only operation.
OpenAPI and physical-source assertions follow current owners.

S4 gives project config files one shared ProjectConfigService owner. Display,
strict mutation/reload, ordinary project reads, discovery migration and document
patch contracts retain their separate semantics. Per-request controller/resolver
and effects capture the originating project. Global/user adapters remain separate.

S5 deepens the shared TicketService facade with TicketQueryService,
TicketMutationService and a TicketRepository implemented by MarkdownTicketRepository.
Existing identity/location/template/reference rules remain reused; cloud creation,
journal/recovery and observation orchestration retain their owners. Simple document,
pin, favorite and trace services were not rewritten.

S6 invalidates listeners, subscriptions, queued work and timers immediately, ends
active SSE responses, then drains actual owned work: observations, stream
activation/persistence, interval-launched flushes, registration retries,
provisioning, document refresh, watcher teardown, HEAD discovery and its private
Git refreshes. Managed identities/lifetime guards prevent restoration after stop.
No timeout race pretends to cancel live work. Ordinary disconnect debounce,
per-project reuse, protocol/retry budgets and foreground cloud operations remain.

S7 adds a distinct structural import gate and rejecting fixtures, CI wiring,
exact compatibility exceptions and canonical owner documentation. The decoder
convention gate remains separate and continues reporting its baseline findings.

## Acceptance ledger

| ID / owner | Executed method and evidence | Result |
| --- | --- | --- |
| RF-1 / corrective contract; existing epic/refs/status owners | [Six real-source regressions](logs/final-combined-tests.log): rejected complete patch leaves bytes/publication unchanged; ignored-only has zero outputFile/publication and empty updatedFields; valid candidate records persisted bytes at its one publication; demotion+close rejects; EBUSY/EMFILE normalize. Full shared/server suites retain epic/reference/namespace coverage. | PASS |
| RF-2 / server, event and cloud composition owners | Common-factory real ProjectService/test-lib HTTP tests, zero-work construction, failed start, idempotence, catalog/state/activation stop races; [97 focused lifecycle tests](logs/s6-head-discovery-green.log), broader observation/stream/SSE tests and [natural resource probe](logs/final-runtime-resources.log). | PASS; full-suite fixture non-exit caveat below |
| RF-3 / existing search contracts and shared owner | Four shared search tests, API search/legacy-constructor/project-search tests, full suites and parent quick/scoped/external-ref browser cases. Scores/ties, provenance, dedupe, differing group/total limits and ticket error isolation covered. | PASS |
| RF-4 / config schemas and project owner | Real paused-write overlap tests for successful and rejected second requests; four shared file-owner tests including distinct discovery migration/synchronous caller; common-app selector target/effect id, denial/unknown-project and invalid-input/no-write integration; full config/atomic/guarded suites. | PASS; no writer serializability claim |
| RF-5 / agreed dependency rule table | [10 AST fixtures](logs/final-module-fixtures.log), [real scan](logs/final-module-scan.log):316sources/1132resolved edges/0violations/6exact exceptions. Type-only edges excluded from runtime SCCs but remain subject to ownership. | PASS for static resolved import lane |
| RF-6 / transport, worktree, event, cloud, auth and preview owners | Full shared/server, CLI/MCP/cloud tests and builds/types; real-file/HTTP integration; parent118passing selected Chromium cases; deterministic disposal tests plus naturally exiting real graph. | PASS for recorded local lanes; deployed lane excluded |
| RF-7 / canonical documents | Reconciled owner docs listed below; Markdown lint,83parent-checked relative links/0broken plus [developer link/fence audit](logs/final-doc-links.json),6rendered Mermaid blocks, source/path/command review. | PASS |
| RF-8 / D-9 capability HTTP ownership | Controllers/routers in modules and public barrels; common app consumes independent entrypoints; exact old Project/Search compatibility edges; Jest/types/lint/OpenAPI include owners. Final cloud-status move passes34common-app/OpenAPI tests and structural/type/build checks. | PASS |

## Executed verification

Commands ran from the checkout root unless the table names another cwd. Logs are
under this execution directory; `.log` files follow the repository's ignored-log
policy, while this report and bounded JSON/source evidence remain reviewable
checkout artifacts. Expanded exact commands, cwd, exits and counts are in the
[command ledger](logs/final-commands.json). No raw credential values are recorded here.

| Command | Exit / counts | Evidence |
| --- | --- | --- |
| `bun run build:all` |0; domain/shared/server/MCP/cloud/frontend builds | [build](logs/final-build-all.log) |
| `bun run validate:ts:all` |0;6package validations | [types](logs/final-types.log) |
| `bunx tsc --noEmit -p tsconfig.json` |0; root tooling/E2E launcher | [tooling types](logs/final-tooling-types.log) |
| `bun run --cwd server jest --runInBand --forceExit` |0;85suites/1043passed/8skipped | [server](logs/final-server-tests.log) |
| `bun run --cwd shared test --runInBand` |0;94suites/1264passed; shared's existing forceExit configuration | [shared](logs/final-shared-tests.log) |
| `bun run --cwd cli build` and `bun run --cwd cli test` |0/0;280passed | [CLI build](logs/final-cli-build.log), [CLI tests](logs/final-cli-tests.log) |
| `bun run --cwd mcp-server build` and `bun run --cwd mcp-server jest --runInBand` |0/0;18suites/251passed | [MCP build](logs/final-mcp-build.log), [MCP tests](logs/final-mcp-tests.log) |
| `bun run --cwd cloud test` |0;117passed; no Worker source changes | [cloud](logs/final-cloud-tests.log) |
| `bun run --cwd server lint` |0; entire server | [server lint](logs/final-server-lint.log) |
| `bunx eslint <14exact affected shared files> --config eslint.config.ts --report-unused-disable-directives --max-warnings 0` from shared |0; modified/new shared source and tests | [affected lint](logs/final-shared-affected-lint.log) |
| `bun run --cwd shared lint` |1; same9pre-existing errors in7untouched tests | [full shared lint](logs/final-shared-lint.log) |
| `bunx eslint scripts/check-module-boundaries.ts scripts/check-module-boundaries.test.ts scripts/e2e/backend.ts server/http/projectAccess.ts --report-unused-disable-directives --max-warnings 0` |0 | [tooling lint](logs/final-tooling-lint.log) |
| `bun run test:modules` / `bun run check:modules` |0/0;10fixtures;0real violations,6exact exceptions | [fixtures](logs/final-module-fixtures.log), [scan](logs/final-module-scan.log) |
| `bun run check:boundaries` |1; original12unmatched+2stale, no additional findings | [decoder](logs/final-decoder.log) |
| `node --import tsx docs/CRs/MDT-266/execution/logs/runtime-resource-probe.ts` |0; natural process exit and resources below | [probe](logs/runtime-resource-probe.ts), [output](logs/final-runtime-resources.log) |
| `bunx markdownlint-cli2 <17modified owner/execution documents>` |0 | [Markdown](logs/final-doc-lint.log) |
| `scripts/validate-mermaid-md <7architecture documents>` |0;6blocks rendered | [diagrams](logs/final-doc-diagrams.log) |
| `python3 docs/CRs/MDT-266/execution/logs/audit-execution.py` and `git diff --check` |0/0; no out-of-scope/staged paths; immutable plan verified | [scope](logs/final-scope.json) |

Focused red-to-green evidence is retained rather than replaced by passing logs:
S0 combined/config regressions in baseline.md;5startup/close failures in
`s6-start-close-red.log`; HEAD fallback failure in `s6-head-discovery-red.log`;
paused observation/activation/flush/SSE/document failures in `s6-disposal-red-*`,
`s6-sse-red.log` and `s6-document-stop-red.log`. Green owner results include
97server lifecycle tests,20Worktree tests,17retry tests,6combined mutation tests
and34final common-app/OpenAPI tests. These overlap full suites and are not added
to their totals.

The14shared lint paths are WorktreeService and its test; TicketService;
ProjectConfigLoader/ProjectConfigService; projection-sync and its test;
SearchService; MarkdownTicketRepository/TicketMutationService/TicketQueryService/
TicketRepository; projectFileOwner and shared search tests. Exact paths and
per-file line counts are in the scope manifest.

## Parent-executed browser evidence

Chromium, one worker, wrapper-owned ephemeral runtimes, line+JSON reporters:

| Lane | Exit | Pass / skip / failed / flaky | Duration | Released backend/frontend ports |
| --- | --- | --- | --- | --- |
| Exact six-file baseline repeat |0|40/8expected auth-gated/0/0|35.589s|62106/62107|
| Enforced authentication |0|8/0/0/0|8.496s|63085/63086|
| Expanded affected operations |0|70/1existing static/0/0|52.225s|63283/63284|

Total118passing,9skipped, zero unexpected/flaky results. Every listed port was
checked with `lsof -nP -iTCP:<port> -sTCP:LISTEN`: exit1/no listener. Parent did
not restart an existing user runtime. Bounded machine summaries and original
report/log locations: [browser summary](logs/final-browser-summary.json).

Token-parameterized invocation templates (parent sets PLAYWRIGHT_JSON_OUTPUT_FILE to
`${BB_THREAD_STORAGE}/mdt266-final-<lane>.json` and
redirects to the corresponding `.log`):

```bash
bun run test:e2e -- tests/e2e/smoke/infrastructure.spec.ts tests/e2e/quick-search/modal.spec.ts tests/e2e/auth/session-unlock.spec.ts tests/e2e/config/configuration-persistence.spec.ts tests/e2e/sse/late-registration.spec.ts tests/e2e/documents/html-preview.spec.ts --project=chromium --workers=1 --reporter=line,json
MDT_E2E_AUTH_ENABLED=true API_SECURITY_AUTH=true API_LOCAL_HOST_BYPASS=false API_AUTH_TOKEN="${MDT_E2E_TEST_TOKEN:?set an isolated test token}" bun run test:e2e -- tests/e2e/auth/session-unlock.spec.ts --project=chromium --workers=1 --reporter=line,json
bun run test:e2e -- tests/e2e/ticket/boundary-crud.spec.ts tests/e2e/ticket/namespace.spec.ts tests/e2e/ticket/subdoc-navigation.spec.ts tests/e2e/board/drag-drop.spec.ts tests/e2e/config/configuration-refresh.spec.ts tests/e2e/config/configuration-validation-failure.spec.ts tests/e2e/sse/updates.spec.ts tests/e2e/scoped-search.spec.ts tests/e2e/quick-search/external-references.spec.ts --project=chromium --workers=1 --reporter=line,json
```

The static skip is `ticket/subdoc-navigation.spec.ts:395` (path traversal test,
source untouched); server traversal/security tests remain active. Auth explicitly
disables native localhost bypass; ordinary bypass policy is preserved. S0's
misconfigured auth invocation remains a baseline caveat. Browsers ran before the
last watcher idle hook and unchanged cloud-status owner move; those refinements
have their own post-change owner tests, builds/types and resource probe. No new
HTTP contract requires browser reinterpretation.

## Resources and verification qualifications

The isolated real graph uses temporary config, no project and no HTTP listener:
construction adds0active non-stdio resources and no signal handlers. Start owns
one registry watcher/listener plus heartbeat. With an established SSE response
and deferred observation, stop ends SSE while remaining pending. After releasing
the observation, stop resolves with0resources/watchers/clients/registry listeners,
unchanged signal counts and observation finished. Immediate post-stop resources
were also empty; a100ms diagnostic resample confirms this, without substituting a
timeout for disposal. Delayed close/error callbacks cannot schedule new work.
The process exits naturally. Paused cloud/Git cases are deterministic injected
component tests, not real cloud credential/network probes.

The full server run without forceExit completed assertions but retained7
Supertest-owned TCPSERVERWRAP handles in untouched `api/sse.test.ts`, consistent
with the baseline non-exit. Owned Jest processes were identified through lsof
stdout paths and terminated after recording summaries. Final full assertions use
explicit forceExit; this is not evidence for runtime disposal. Existing test-lib
RetryHelper timeouts can appear in focused detectOpenHandles output and expire;
they are separate from the runtime probe. See [cleanup record](logs/server-process-cleanup.md).

An intermediate final server invocation exited1 with2HTTP501 results in auth
fixtures. Focused auth22tests and a full diagnostic85suite run then passed; the
diagnostic only logged attempts to set501. No production/test behavior was
changed to suppress this result. The latest plain full assertion run passes.
Root cause was not established; retain this as an intermittent verification
qualification, alongside S0's graph/order-sensitive501. Initial parallel type
validation also raced domain build cleanup and reported missing declarations;
sequenced final validation passes all6packages. These failed attempts remain
recorded, not represented as passing evidence.

Full shared lint remains9errors in7untouched test files. The decoder convention
gate remains12unmatched+2stale baseline findings. Consequently the aggregate
repository `check` is not claimed green. Existing frontend chunk-size/build
warnings remain. Structural gate, affected lint, builds and types pass.

No claim is made about deployed cloud grants/handshake, idle D1, credentials,
distributed locks, all browsers/full E2E, general latency/throughput improvement,
or new cache/writer concurrency guarantees. Atomic config replacement can still
lose competing external/alias writes as reproduced at S0. Ticket validation is
before one local write, not a cross-store transaction.

## Scope and documentation reconciliation

[Exact scope manifest](logs/final-scope.json) lists every created/modified task
path with baseline/current line counts, all execution artifacts (including
ignored logs), parent-owned files excluded from our writes, staged state and
immutable plan identity.127task source/test/tool/doc files:51created,76modified,
0deleted. Old HTTP paths remain. The touched-file baseline/current total and individual file sizes are recorded
in the manifest; execution logs and parent planning artifacts are excluded from
that comparison.
Moves redistribute code into module/collaborator owners; a smaller facade is not
claimed as a reduction in whole-system size or complexity. No metric target was
used to justify changing behavior.

Owner documents reconciled against code and executed commands:

| Exact owner | Current claim |
| --- | --- |
| `server/docs/ARCHITECTURE.md` | Capability table, compatibility adapters, common graph, lifecycle, auth, request/dependency flow |
| `shared/ARCHITECTURE.md` | Shared query/mutation/storage/search/project owners and retained cloud boundaries |
| `docs/architecture/event-system/EVENT_SYSTEM.md` | Lazy registration, current owner path, immediate invalidation and actual disposal drains |
| `docs/architecture/project-identity-and-worktrees.md` | Canonical/worktree identity unchanged; config owner and lazy metadata registration |
| `docs/architecture/cloud-sync/README.md` | Local runtime composition versus shared protocol/recovery and unchanged rollout gate |
| `docs/architecture/cloud-sync/data-and-consistency.md` | Local composition pointers; persisted/protocol semantics unchanged |
| `docs/architecture/cloud-sync/operations.md` | Local start/stop ownership, draining active work; deployment unchanged |
| `docs/CONFIG_INSPECTION.md` | Shared project-file owner and request-bound effects; exposure unchanged |
| `docs/CONFIG_SPECIFICATION.md` | Distinct read/write/migration contracts and concurrency limit |
| `DEBUG.md` | Verified common composition/resource procedure; ephemeral test ports; language tags on existing output fences |
| `server/CLAUDE.md` | Capability ownership and common factory/disposal testing |
| `tests/AGENTS.md` | Shared graph and wrapper runtime lifecycle |
| `scripts/e2e/AGENTS.md` | Launcher start/stop, HTTP/socket ownership retained |
| `scripts/AGENTS.md` | Distinct structural gate inventory |

`tests/e2e/AGENTS.md` required no edit: its browser-only out-of-process access and
wrapper contract remain accurate. No historical CR, root instruction file,
frontend feature, CLI/MCP implementation or Cloud Worker was rewritten. Parent
owns MDT-266 ticket/prep reconciliation. Independent Astra accepted the final
watcher/Worktree idle repair and cloud-status HTTP owner move. Source is frozen;
parent acceptance is recorded below.

## Parent acceptance

On 2026-10-29, parent accepted the local patch after Astra returned ACCEPT SOURCE
for the final ownership/disposal changes and ACCEPT REPORT for the evidence and
owner documents. Parent independently verified selected browser runs, scope,
immutable plan identity, whitespace and changed-document links. RF-1 through RF-8
are complete for the recorded local lanes. The ticket remains In Progress for
human review; the qualifications above remain part of this acceptance.
