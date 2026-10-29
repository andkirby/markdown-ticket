# MDT-266 — Documented versus actual backend modules

- Status: preserved baseline inventory. Implementation and verification are recorded in the [execution result](execution/result.md).
- Baseline: `4c8ae15b`, 2026-10-29; worktree clean before this preparation.
- Scope: local Express backend, its shared services/contracts, and CLI/MCP integration seams. Cloud Worker internals and frontend implementation are outside this inventory.
- Agreed preparation: [target architecture](prep/architecture.md), [refactoring plan](prep/refactoring-plan.md). Current ownership belongs to the [server](../../../server/docs/ARCHITECTURE.md) and [shared](../../../shared/ARCHITECTURE.md) architecture owners; the findings below describe the baseline revision.

Paths retired during round2 are cited as baseline paths rather than broken current-file links. Inspect their original content with `git show 4c8ae15b:path/to/file`, for example `git show 4c8ae15b:server/routes/config.ts`.

## Baseline documented claims versus checkout evidence

| Claim and authority | Actual code | Judgment |
| --- | --- | --- |
| [Server architecture](../../../server/docs/ARCHITECTURE.md), Module Responsibilities: controllers handle HTTP; services own business rules | Baseline `server/controllers/SearchController.ts:95` scores, filters, sorts, and limits project matches. Its constructor and service getters depend on another controller. | Responsibility leak; extract the complete search operation, not just helper methods. |
| Server architecture: routes define endpoints, without business logic | Baseline `server/routes/system.ts:40,59,296` loads configuration, resolves filesystem roots, and computes discovery membership inside the router. | Partial layering; system operations need narrow service boundaries when migrated. |
| Server architecture: constructor-based injection | Baseline `server/controllers/ProjectController.ts:154` constructs ProjectManager and WorktreeService; [shared TicketService.ts:154](../../../shared/services/TicketService.ts) constructs project/template/location collaborators. | Injection exists selectively. Shared ProjectService already accepts injectable collaborators; extend that precedent where substitution matters. |
| [MDT-082](../MDT-082-consolidate-duplicate-ticket-management-systems-in.md): consolidate ticket operations in shared code | [server TicketService.ts:364,468](../../../server/services/TicketService.ts) still orchestrates status/attribute writes and owns search ranking/deduplication. | Shared CRUD exists, but complete application operations are still split by transport. |
| Server architecture route table names TicketController for ticket routes | Baseline `server/routes/projects.ts` delegates ticket endpoints to the 1,107-line ProjectController. No production TicketController file exists. | Current owner-doc drift; do not interpret the table as an implemented module. |
| [Shared architecture](../../../shared/ARCHITECTURE.md) describes models, services, tools and test utilities | Shared now also contains substantial ticket/project submodules and cloud-sync orchestration, protocol clients, credentials, journals and read models. | Package dependency direction is useful, but the documented map is incomplete; shared is not a pure domain layer. |
| Test-factory comments describe mirroring production | [production bootstrap:290,432](../../../server/server.ts) wires projection reads and identity/recovery/status functionality. [test factory:189,240](../../../server/tests/api/test-app-factory.ts) omits those collaborators/routes; [E2E launcher:152](../../../scripts/e2e/backend.ts) uses that factory. | Composition differs. Direct feature/router tests exist; the issue is insufficient evidence for the production graph. |
| [Event-system owner](../../architecture/event-system/EVENT_SYSTEM.md): watcher/lifecycle/broadcast separation, lazy subscriptions, SSE-only live updates | PathWatcherService, WatcherLifecycleManager, SSEBroadcaster, facade, and shared registration integration exist under `server/services/fileWatcher/`. | A useful existing module boundary to preserve. No rewrite is justified by this review. |
| [Cloud-sync owner](../../architecture/cloud-sync/README.md): shared protocol/recovery policy; server process lifecycle; Markdown/Git authority | Shared cloud components and server ProjectionStreamManager/TicketIdentityObservation implement that split; automatic streams retain a rollout gate. | Preserve the split and gate. Local-focused tests do not establish deployed readiness. |
| `check:boundaries` suggests a general boundary check by name | [check-boundary-validation.ts:285,395](../../../scripts/check-boundary-validation.ts) checks request/decoder conventions and tool registration. Root ESLint restricts relative shared imports, not capability ownership. | No demonstrated general capability-dependency gate; add a separate structural check. |

## Baseline actual module inventory

| Capability | Actual owners and dependencies | Boundary condition / target disposition |
| --- | --- | --- |
| Canonical contracts | `domain-contracts/src/{ticket,project,types,app-config,config,cloud-sync}/`; shared models re-export/adapt these shapes | Retain schema/type ownership; no filesystem, transport or service logic here. |
| Project catalog, discovery and worktrees | `shared/services/ProjectService.ts`, `project/{ProjectDiscoveryService,ProjectScanner,ProjectRegistry,ProjectFactory,ProjectCacheService}.ts`, `WorktreeService.ts`, `shared/tools/ProjectManager.ts` | Logical project capability already exists. Inject public catalog operations instead of exposing them through controllers; preserve physical-repository/worktree identity. |
| Project/config mutation | `shared/services/project/ProjectConfigService.ts`, ProjectConfigLoader discovery migration, ProjectDocumentPatch, server ProjectConfigStorageAdapter, and security/projectSharing registry writes | Multiple read/modify/write owners. Evolve the shared project/config capability into the project-file mutation owner; delegate from HTTP and discovery adapters after characterizing their different reads/migrations. Registry sharing remains a distinct operation to inventory, not a silent scope expansion. |
| Scoped global/user configuration | `server/services/config/{ConfigApplicationService,ConfigSideEffectRegistry}.ts`, GlobalConfigStorageAdapter, UserConfigStorageAdapter; `shared/tools/config-cli.ts` also performs global config writes | Retain existing scoped owners initially. Do not add a third writer or claim global CLI/server write consolidation is already implemented. Preserve the CLI seam; larger global-config consolidation requires its own bounded slice. |
| Ticket commands, policy and storage | `shared/services/TicketService.ts`, MarkdownService, TemplateService, CRService; `ticket/{TicketLocationResolver,TicketIdentityService,DependencyGraph,derivedFields,referenceMutations}.ts`; `epicRules.ts` | Shared TicketService is 1,884 lines and constructs core dependencies. Extract complete operations and a ticket-specific persistence seam while retaining its public facade. File length is discovery evidence, not an acceptance target. |
| Ticket queries and search | Server TicketService assembles unified ticket items and owns ticket search; SearchController owns project scoring; ProjectController exposes both services | Separate reusable search from transport formatting. Preserve the existing canonical/projected read distinction and search contracts. |
| Documents, trees and preview | DocumentService, TreeService, ConfigRepository; builders/TreeBuilder; strategies/*; commands/*; FileOperationInvoker; DocumentController and preview-token security | Existing server capability with several internal abstractions. Keep paths initially; make dependencies explicit as affected operations move. Token verification/HTTP streaming remain security/transport concerns. |
| Document favorites | DocumentFavStateService; per-project state reconciled against the document tree | Own document eligibility/reconciliation; retain separately from pins and cache infrastructure. |
| Ticket pins | PinStateService and PinController; user-global pins validated against known projects | Distinct scope and eligibility from document favorites; preserve missing-ticket/stale-pin behavior. |
| Trace reads and subdocuments | Server TraceStoreService reads `.trace/<key>/store.json` through resolved ticket location; shared SubdocumentService owns subdocument resolution/read rules | Trace is a ticket-location-aware read capability. Do not turn it into generic document persistence or a second spec-trace writer. |
| HTTP admission and sharing | `server/security/` owns API auth, sessions/read tokens, access classification, filesystem admission, origin policy, preview HMAC and sharing; routes enforce transport admission | Retain HTTP-specific admission here. Inject a project-access operation into document routes instead of using ProjectController as an access service. Cloud identity/membership stays separate. |
| Realtime | `server/services/fileWatcher/` facade, raw path watchers, lazy lifecycle, broadcaster and registration integration; `routes/sse.ts` admits HTTP clients | Preserve subscription lifetimes, cache invalidation, read-client filtering, heartbeat and reconnect/resync contracts. Ticket rules must not depend on SSE clients. |
| Local cloud coordination | `shared/services/cloud-sync/`: allocation/create, connection trust, journals, explicit recovery, credentials, projection sync, session/stream clients and read model | Retain one owner per protocol/recovery concern. Application consumers use operations/ports, not Worker implementation imports. |
| Cloud process runtime | `server/services/cloud-sync/{ProjectionStreamManager,TicketIdentityObservation}.ts` plus server.ts wiring | Server owns activation, timers, one-stream-per-project, observations and shutdown. Shared clients do not acquire server lifecycle responsibility. |
| HTTP composition and operations | `server/server.ts`, controllers/routes, runtimeConfig, middleware/errorHandler, devtools logging and docs routes | Extract one application assembly and explicit start/stop. Keep existing commands, auth ordering, devtools flags, runtime settings and external response contracts. |
| Other local adapters | `cli/src/commands/`, `mcp-server/src/tools/` call shared operations | Preserve thin presentation shells and existing imports. CLI/MCP are separate entrypoints, not Express submodules. |

## Verified observations and open risks

### Reproduced mutation defect

- Existing order: server adapter `updateCRPartial()` calls shared `updateCRStatus()` before `updateCRAttrs()` validates phaseEpic.
- Probe: isolated `TestEnvironment` + `ProjectFactory`, real source SharedTicketService injected into the server adapter; no cloud binding.
- Accepted input: `{ "status": "In Progress", "phaseEpic": "TEST-999" }` for a Proposed ticket; TEST-999 does not exist.
- Observed result: `phaseEpic target "TEST-999" does not exist`; persisted status is `In Progress`, not the original `Proposed`.
- Source evidence: [adapter:376](../../../server/services/TicketService.ts), [status persistence:885](../../../shared/services/TicketService.ts), [later attribute validation:986](../../../shared/services/TicketService.ts).
- Publication occurs after the status write in the shared method; absence of publication for a rejected combined mutation is a required future regression, not a separately executed cloud probe.

### Source-supported risks requiring experiments

- Baseline `server/routes/config.ts:49` shares resolver/currentProjectId variables across requests; ConfigApplicationService awaits persistence before running effects. Pause a write and overlap a second project request to establish whether the first effect targets the wrong project. This was not reproduced during preparation.
- Shared ProjectConfigService reads can write during legacy migration (`getProjectConfig`, line 81); project updates can write registry and local config sequentially (line 230). Preserve these contracts deliberately; do not claim a multi-file transaction.
- Execution discovery additionally confirmed ProjectConfigLoader's `migrateLegacyConfigWithCleanup()` as a discovery-specific local-config writer. It does not apply the same ticketsPath validation/document migration policy as ordinary ProjectConfigService reads; the consolidation must preserve both contracts.
- Execution discovery also confirmed assembled production/test config routers omit project-path resolution, while direct-router fixtures supply it. The common-factory integration correction supplies validated catalog-resolved project identity/path with immutable request context; selector/security policy is preserved.
- Atomic rename prevents a torn replacement, not lost updates from independent readers/writers. Lock scope across processes, worktree aliases and external editors remains unverified.
- The import scan found no reverse package imports in the scanned production sources (`domain-contracts <- shared <- server`). This does not prove that all capability boundaries are enforced.

## Baseline verification

- Executed in the preceding review at the same revision: six server suites, 113 tests passed; no full-suite, browser or deployment readiness claim.

```bash
bun run --cwd server jest --runInBand --runTestsByPath \
  tests/unit/ProjectController.boundaries.test.ts \
  tests/unit/TicketService.boundary-compatibility.test.ts \
  tests/services/config/ConfigApplicationService.test.ts \
  tests/services/cloud-sync/CloudCreationRecovery.test.ts \
  tests/services/cloud-sync/ProjectionStreamManager.test.ts \
  tests/watcherLifecycle.test.ts
bun run check:boundaries
```

| Check | Actual result |
| --- | --- |
| Six focused server suites | PASS: 113/113 tests; approximately 3.24 seconds in the recorded run |
| Input-validation convention gate | FAIL: 12 unmatched sites, two stale exceptions |
| Gate failure groups | Two getRequestAccess delegations; eight operation-journal decoder/cast sites; referenceOperands and staged-validation decoder/cast sites; two old acquireLock identities |
| Complete integration and concurrency | Not established; rerun/extend evidence before the corresponding implementation slice |

## Ticket ownership and alignment

- MDT-228 is the existing Approved backend refactor epic; its body remains an unfilled template, not an approved concrete module design.
- MDT-266 records this concrete Proposed preparation. MDT-082 remains implemented history; rejected MDT-040 is not revived.
- MDT-105 owns cache unification; MDT-111 owns public API error-format standardization. Their designs/statuses are not changed here.
- Astra independently inspected key source boundaries at the same revision: @thread:thr_8pe53d2pib. It agreed on the capability-based modular monolith and added the config-owner slice and overlapping-request risk.
- Astra did not rerun the 113 tests or the mutation probe; those are the parent review's executed evidence. This document does not count alignment as independent runtime verification.
