# MDT-266 immutable execution contract

Prepared after [executed S0 baseline](baseline.md), before production mutation. Parent acknowledgement is the coordination gate. This file becomes immutable at that gate; refinements are appended to result.md only after parent acknowledges exact additional paths.

## Decision contract

```yaml
decision: READY
target: backend capability operations and HTTP/runtime composition
problem_evidence: split ticket writes permit rejected partial mutation; async config effects cross requests; controllers locate other controllers; production/test graphs diverge; project-file writers duplicate ownership
baseline: 4c8ae15be10ef02626f2c0513e23b3909df92448; executed commands and classified exceptions in baseline.md
proposed_change: S1 complete mutation correction, S2 common app/runtime, S3 shared search and capability HTTP edges, independent config-context correction then S4 shared project writer, S5 ticket collaborators, S6 lifecycle, S7 structural gate and owner docs
design_comparison: extend existing shared service facades, selective constructor injection and established watcher/cloud modules; capability modular monolith accepted as D-1..D-9
artifact:
  mode: USER_SUPPLIED
  root: docs/CRs/MDT-266/execution
  allowed_writes: plan.md, baseline.md, result.md, logs/* bounded command logs/probes/summaries
  retention: checkout artifacts and parent thread report; no duplicate .refactoring run
documentation:
  impact: UPDATE_REQUIRED
  evidence: compared source app/test graphs, controller/service methods, shared project writer, watcher registration and canonical owner sections listed below
unknowns: deployed cloud acceptance, whole-browser-suite readiness, cross-process/editor write isolation and universal performance remain unclaimed
```

Authority: user-authorized controlled-refactor Execute and explicit corrective semantics. No additional user approval needed within this contract; parent must acknowledge S0 before source edits. No source writer besides this teammate. Parent owns ticket/prep/planning; Astra is independent read-only review.

## Preserved contract and risk boundaries

- Markdown/Git authority, filenames/frontmatter/body, derived-field/epic/reference rules, ambiguity rejection, numbering, namespace/worktree/subdocument routing and projected/local read distinction.
- HTTP/CLI/MCP DTOs, status/error envelopes and public imports; only authorized combined-rejection semantics and reproduced request-context race change behavior.
- Strict write reload versus tolerant display, legacy read migration and sync callers, obsolete document-section policy, sibling preservation, registry-before-local ordering, distinct global/user writers.
- Auth mount order, read scopes, generic private 404, preview HMAC/CSP/sandbox, server-only credentials, non-interactive background cloud paths and rollout flag.
- Lazy watchers/registry exception, SSE-only updates, process broker reuse, one stream/project, bounded retries and explicit read-only recovery/diagnostics.
- Applicable risks: persistence ordering/concurrency; admission/security; lifecycle/resource leaks; shared-consumer compatibility; moved OpenAPI/test/build scanners; doc drift. No cache unification, new lock/transaction guarantee, Worker code, framework, DB or public error redesign.

## Acceptance ownership

| ID | Owner / criterion | Executed-baseline basis and required final method |
| --- | --- | --- |
| RF-1 | MDT-266 corrective operation: reject invalid complete patch before bytes/publication; valid patch applies all supported fields | New red real-source tests; turn green and extend one-publication/epic/refs evidence |
| RF-2 | MDT-266 composition plus server/event/cloud owners: same enabled route/security graph and explicit lifecycle | Source graph inventory, broad API/auth tests; common-builder real-file HTTP tests, zero-work construction, idempotent start/stop and failed-start cleanup/resource probe |
| RF-3 | Existing search contracts plus MDT-266 shared owner | Existing search/reference/API/browser evidence; preserve exact/fuzzy/text/external refs, scoring/ties, dedupe/limits/empty/error behavior via shared and adapter tests |
| RF-4 | Project/config schema and existing service/adapter contracts plus MDT-266 single project-file owner | Existing shared/server config suites and overlap probe; delegate server adapter to shared owner, test read/write/migration/default/siblings/order/sync callers and originating request effects |
| RF-5 | MDT-266 dependency rule table in prep/architecture.md | AST fixture tests reject forbidden package/reverse/controller/private-capability edges and cycles; real scan permits only exact reviewed compatibility exceptions, with owner/reason and no stale entries |
| RF-6 | Project/worktree, event, cloud, preview/security owners and existing transport contracts | Broad shared/server/CLI/MCP/cloud baseline; affected tests/builds, real-file/HTTP and consumer integration, selected wrapper browser tests, resource/start-stop observations; deployed lane explicitly excluded |
| RF-7 | Named canonical documents below | Reconcile actual diff and semantic claims; markdownlint, relative file links, Mermaid validation, verified commands/source references |
| RF-8 | D-9/controller ownership in MDT-266 | Actual HTTP ownership under modules with public entrypoints; legacy paths contain compatibility delegation/exports only; no controller service locator; include new folders in types/lint/Jest/OpenAPI/dependency scans |

Inherited acceptance is owned by the existing canonical documents and their current tests, not invented ticket requirement IDs. S1 and config correction are deliberately RED-to-GREEN; preservation work uses the classified GREEN baseline. Baseline unrelated gate failures remain visible rather than prompting source cleanup.

## Exact production mutation allowlist

No deletes planned: retain old HTTP import paths as thin compatibility exports/facades. Each operation moves only after its caller has a public seam. The lists below are exhaustive; absent paths require a parent-acknowledged refinement.

Existing files permitted to modify:

```text
server/server.ts
server/config/runtimeConfig.ts
server/controllers/ProjectController.ts
server/controllers/SearchController.ts
server/controllers/DocumentController.ts
server/controllers/ConfigController.ts
server/controllers/PinController.ts
server/routes/projects.ts
server/routes/search.ts
server/routes/documents.ts
server/routes/config.ts
server/routes/auth.ts
server/routes/share.ts
server/routes/readTokens.ts
server/routes/sse.ts
server/routes/system.ts
server/routes/devtools.ts
server/routes/docs.ts
server/routes/pins.ts
server/routes/ticketIdentities.ts
server/routes/cloudCreationRecovery.ts
server/services/TicketService.ts
server/services/config/adapters/ProjectConfigStorageAdapter.ts
server/services/config/ConfigApplicationService.ts
server/services/fileWatcher/projectRegistrationIntegration.ts
server/services/fileWatcher/index.ts
server/services/fileWatcher/PathWatcherService.ts
server/services/fileWatcher/WatcherLifecycleManager.ts
server/tsconfig.json
server/tsconfig.build.json
server/jest.config.mjs
server/eslint.config.ts
server/openapi/config.ts
server/scripts/generate-openapi.ts
shared/services/TicketService.ts
shared/services/project/ProjectConfigService.ts
shared/services/project/types.ts
shared/index.ts
shared/package.json
shared/tsconfig.json
scripts/e2e/backend.ts
scripts/boundary-validation-legacy.json
package.json
.github/workflows/boundary-validation.yml
```

New production/tooling files permitted to create:

```text
server/app.ts
server/bootstrap/createRuntime.ts
server/bootstrap/types.ts
server/bootstrap/ProjectServiceAdapter.ts
server/http/projectAccess.ts
server/modules/projects/ProjectController.ts
server/modules/projects/types.ts
server/modules/projects/router.ts
server/modules/projects/index.ts
server/modules/tickets/TicketController.ts
server/modules/tickets/router.ts
server/modules/tickets/ticketIdentities.ts
server/modules/tickets/cloudCreationRecovery.ts
server/modules/tickets/pins.ts
server/modules/tickets/PinController.ts
server/modules/tickets/index.ts
server/modules/search/SearchController.ts
server/modules/search/router.ts
server/modules/search/index.ts
server/modules/documents/DocumentController.ts
server/modules/documents/router.ts
server/modules/documents/configureDocuments.ts
server/modules/documents/index.ts
server/modules/config/ConfigController.ts
server/modules/config/router.ts
server/modules/config/index.ts
server/modules/access/auth.ts
server/modules/access/share.ts
server/modules/access/readTokens.ts
server/modules/access/index.ts
server/modules/realtime/router.ts
server/modules/realtime/index.ts
server/modules/system/router.ts
server/modules/system/SystemService.ts
server/modules/system/SystemController.ts
server/modules/system/devtools.ts
server/modules/system/docs.ts
server/modules/system/index.ts
shared/services/search/SearchService.ts
shared/services/ticket/TicketQueryService.ts
shared/services/ticket/TicketMutationService.ts
shared/services/ticket/TicketRepository.ts
shared/services/ticket/MarkdownTicketRepository.ts
scripts/check-module-boundaries.ts
scripts/module-boundary-exceptions.json
```

Existing test files permitted to modify for retained behavior and actual-source scanning, without weakening assertions:

```text
server/tests/api/test-app-factory.ts
server/tests/api/setup.ts
server/tests/api/config-openapi.test.ts
server/tests/api/search.test.ts
server/tests/api/projects.search.test.ts
server/tests/routes/config-routes-thin.test.ts
server/tests/config/runtimeConfig.test.ts
server/tests/unit/ticketOpenApi.boundaries.test.ts
server/tests/mocks/shared/services/TicketService.ts
server/tests/unit/ProjectController.boundaries.test.ts
server/tests/unit/ProjectController.compatibility.test.ts
server/tests/unit/TicketService.boundary-compatibility.test.ts
server/tests/unit/Phase23.compatibility.test.ts
server/tests/api/filesystem-boundary.test.ts
server/tests/services/config/adapters/StorageAdapters.test.ts
server/tests/services/config/AtomicFailure.test.ts
server/tests/unit/RegistryWatcher.test.ts
```

New tests permitted:

```text
server/tests/integration/combined-ticket-mutation.test.ts
server/tests/integration/config-request-context.test.ts
server/tests/integration/application-runtime.test.ts
shared/tests/services/search/SearchService.test.ts
shared/tests/services/ticket/TicketMutationService.test.ts
shared/tests/services/ticket/MarkdownTicketRepository.test.ts
shared/tests/services/ProjectConfigService/projectFileOwner.test.ts
scripts/check-module-boundaries.test.ts
```

CLI/MCP production consumers should require no edits because shared facades remain. If a concrete compatibility edit becomes necessary, name it to parent before mutation. Existing simple document/tree/pin/favorite/trace services and cloud internals retain their owners. Watcher files in the allowlist are for narrow cancellation/disposal/injection only, not an internal rewrite.

## Owner-document mutation allowlist and intended claims

| Exact path | Claim to reconcile |
| --- | --- |
| `server/docs/ARCHITECTURE.md` | Capability HTTP owners, retained compatibility facade, common app, runtime and request flows; correct nonexistent old TicketController claim |
| `shared/ARCHITECTURE.md` | Actual shared ticket/search/project/cloud operations and named filesystem adapters; facade compatibility |
| `docs/architecture/event-system/EVENT_SYSTEM.md` | App/runtime registration and teardown entrypaths; retain lazy/SSE guarantees |
| `docs/architecture/project-identity-and-worktrees.md` | Config mutation owner/callers and unchanged canonical/worktree routing; correct directly affected lazy registration wording |
| `docs/architecture/cloud-sync/README.md` | Server runtime assembly versus retained shared protocol/recovery; rollout and broker ownership |
| `docs/architecture/cloud-sync/data-and-consistency.md` | Changed local assembly pointers only; no cloud/persisted-contract rewrite |
| `docs/architecture/cloud-sync/operations.md` | Changed local start/stop ownership pointers only; deployment unchanged |
| `docs/CONFIG_INSPECTION.md` | Shared project-file owner and HTTP request-bound effects, without changing settings exposure |
| `docs/CONFIG_SPECIFICATION.md` | Existing format/read/write/migration/order contracts and owner, no settings redesign |
| `DEBUG.md` | Verified common construction/start/stop procedure and observations, existing commands retained |
| `server/CLAUDE.md` | Capability architecture and shared test construction |
| `tests/AGENTS.md` | Common application construction and wrapper lifecycle |
| `tests/e2e/AGENTS.md` | Actual runtime handle location/teardown if changed |
| `scripts/e2e/AGENTS.md` | Launcher app/runtime start and disposal; owned sockets retained |
| `scripts/AGENTS.md` | Distinct module-boundary check inventory |

Historical CRs, root AGENTS/CLAUDE, parent ticket/prep and unrelated drift are excluded. Documentation impact is re-evaluated against actual source diff before completion; update only claims the patch affects.

## Sequence, verification and rollback

1. S1: shared complete-mutation operation + REST delegation; reject before persistence/publication, valid single operation; preserve status-only error mapping. Run new regressions and affected epic/attrs/reference/REST tests. Rollback structural extraction independently; retain corrective operation.
2. S2: common app builder, reusable graph, explicit runtime and thin test wrapper; production signal/listen ownership stays executable-only. Inject docs router to avoid Jest import.meta coupling while preserving production docs. Run API/auth/preview/graph and lifecycle tests/types/build.
3. S3: shared full search operation; split project/ticket HTTP ownership, remaining capability routes/controllers with exports, direct project access helper. Move OpenAPI scans/physical-source assertions with owners; retain current generated endpoint coverage. Run search, namespace, admission, preview and module build checks.
4. Independent reproduced config correction: capture controller/resolver/project id per request. Red overlap tests must become green for both second-success and second-failure paths. Then S4 delegates project adapter to shared ProjectConfigService, preserving its named display/write semantics and sync project APIs. Run storage, atomic failure, guarded operations, legacy/document patch/shared project tests.
5. S5: extract cohesive ticket querying, mutation preparation/persistence and Markdown ticket adapter; shared facade retains public signatures and existing cloud orchestration. Reuse existing pure rules; no copied business mocks. Run full shared + affected server/CLI/MCP tests/builds.
6. S6: complete runtime cloud/watcher callback ownership, bounded registration cleanup and start/stop failure disposal. Measure handles/listeners/timers/ports with real isolated graph. Existing watcher/cloud internals stay intact beyond narrow cancellation seams.
7. S7: structural AST fixtures + real scan and CI command; exact compatibility exceptions only, with owner/reason/stale detection. Reconcile canonical docs and report scope/acceptance evidence.

Final checks: `bun run build:all`, `bun run validate:ts:all`, affected server/shared lint (separate pre-existing failures), `bun run --cwd cli build`, affected server/shared/CLI/MCP/cloud suites, structural fixtures/real scan and existing decoder gate. Parent repeats selected browser wrapper with coordinated reports, including enforced auth. Run Markdown lint, relative link/fence checks, existing `scripts/validate-mermaid-md` for changed diagram docs. No universal readiness inference from focused checks.

No commit/stage/merge/deploy/install/external messaging. Parent agent coordination is authorized. If a consequential behavior decision or new path is needed, send evidence and smallest refinement, continue independent authorized work, and record the acknowledgement in result.md. Report every RF criterion and real limitation before requesting final acceptance.
