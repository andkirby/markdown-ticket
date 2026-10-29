# MDT-266 — Staged backend refactoring plan

- Status: agreed staged contract, completed through S1–S7. The execution result records actual changes, acknowledged refinements, verification and retained limitations; the separate execution plan remains immutable.
- Target: [agreed architecture](architecture.md). Baseline and claim reconciliation: [module inventory](../module-inventory.md). Executed outcomes belong to the [execution result](../execution/result.md).
- Parent: MDT-228. Adjacent owners: MDT-105 cache unification and MDT-111 public error-format standardization remain separate.
- Subsequent user-authorized cleanup follows the separate [round2 contract](../execution/round2/plan.md): retire internal scaffolding, migrate callers and clear classified Knip/lint blockers. The original execution plan and its baseline remain immutable historical evidence.
- Workflow: controlled-refactor execution with MDT tracking and a Codex development thread; use bounded slices and independent Astra review. The user accepted the capability direction and HTTP-controller ownership. Implementation readiness is established per slice, not inferred from 113 focused passing tests.

## Scope and change discipline

- Preparation artifacts are complete. Implementation adds ticket-owned `execution/` plan, baseline, results and bounded evidence logs; ticket identity/metadata use native MDT tools. This is the sole durable run owner, with no mirrored `.refactoring/` backlog.
- Code changes operate in ordered reviewable slices, retain compatibility facades, and include the exact affected paths in each implementation task. Commit authorization is separate.
- Preservation slices are GREEN-to-GREEN against their established invariants. Missing tests and baseline failures are resolved/classified before the affected slice proceeds.
- Corrective work is explicitly identified: complete ticket-mutation rejection semantics; config request-context isolation only if a deterministic test reproduces the risk.
- No new database, framework, DI container, generic event bus, generic repository framework, capability deployment or wholesale package reorganization is included.
- Code movement alone does not change cloud rollout flags, auth policy, local/cloud authority, persisted state formats, cache policy or public error envelopes.

## Acceptance ownership

| IDs | Owner | Evidence required |
| --- | --- | --- |
| PREP-1..PREP-4 | MDT-266 ticket | Source-backed inventory, target proposal, this plan, recorded Astra alignment |
| RF-1 | MDT-266 explicit corrective criterion | Real-source regression: rejected combined mutation changes neither ticket bytes nor projection attempts; valid combined mutation applies supported fields |
| RF-2 | MDT-266 composition criterion; server architecture and event/cloud owners provide inherited behavior | Common production/test app graph, auth/route parity, explicit lifecycle and complete teardown |
| RF-3 | Existing search contracts/tests plus MDT-266 ownership criterion | Same scores/order/filtering/deduplication/limits/refs through one shared owner |
| RF-4 | Existing project/config schemas and compatibility behavior plus MDT-266 ownership criterion | Both project mutation entry paths delegate to one owner, with read/write/migration differences preserved |
| RF-5 | MDT-266 structural rule set | Import fixtures reject forbidden edges; real workspace has no unregistered violations |
| RF-6 | Canonical project/worktree, event, cloud, preview/security owners and existing transport contracts | Affected integration journeys and consumer builds/tests; report unverified lanes explicitly |
| RF-7 | Named owner docs below | Final implemented boundary claims match source/tests and pass applicable doc/link/diagram checks |
| RF-8 | MDT-266 agreed controller ownership | Capability HTTP folders expose their public entrypoints; compatibility controller/routes contain delegation only; build and dependency checks cover the new folders |

## Slices and gates

| Slice | Permitted change and deliverable | Required evidence / exit condition | Rollback |
| --- | --- | --- | --- |
| S0 — Establish the preservation baseline | Inventory route/admission graph, write sites, constructors, lifecycle handles, public consumers and current schemas. Add characterization tests and structural-gate fixtures. Classify existing decoder-gate failures. | Reproduce the mutation defect; cover worktree/namespace and relevant auth/preview/SSE behavior. Establish the exact exceptions/owners for legacy module edges. Run paused-write config overlap and competing-update probes where those guarantees are relevant. | Remove added checks independently; production is unchanged. Retain captured evidence. |
| S1 — Correct combined ticket mutation | Introduce the smallest shared complete-mutation operation and adapt REST delegation. Validate the entire requested state before a canonical write/publication. This is a behavior correction. | Failing regression first, then green: invalid phaseEpic with valid status leaves bytes and publication attempts unchanged; valid status+attrs applies all supported fields; preserve existing DTO/error mapping except an explicitly agreed corrective response if needed. | Separate corrective commit. Structural rollback must retain it; reverting it explicitly acknowledges restoration of the known defect. |
| S2 — Unify app composition | Add `server/app.ts`, `server/bootstrap/{createRuntime,types}.ts`; production and test factory use one application builder. Keep test-only control routes as injected launcher seams. | Enabled production routes/security match the test graph, including identity/recovery/status, projections, pins, preview and config. Construction starts no runtime work; start/stop tests prove ownership and disposal, including startup failure. Real shared services run against test-lib fixtures at key boundaries. | Revert assembly extraction as one slice; preserve external commands/config and characterization tests. No persisted-format rollback. |
| S3 — Extract search and narrow HTTP controllers | Add shared SearchService; inject catalog/query/search directly. Place HTTP controllers/routes in `server/modules/<capability>/`, starting with projects/tickets/search; introduce project-access middleware. Move working remaining adapters by capability with compatibility exports and no response redesign. Extract relevant system operations only as touched. | Search modes, exact/fuzzy/text/external refs, ranking/ties, dedupe, per-project/total limits, empty/error cases and existing response shapes are characterized. Document routes do not depend on ProjectController for visibility; project/ticket auth behavior remains unchanged. New module/bootstrap paths are covered by tsc, lint, Jest/coverage and dependency checks as applicable. | Revert one adapter/operation delegation at a time behind preserved service paths. |
| S4 — Consolidate project-config mutation ownership | Evolve shared ProjectConfigService into the mutation owner for the existing project-file operations; server ProjectConfigStorageAdapter delegates. Retain ConfigApplicationService selector/guard/effect roles and distinct global/user owners. | Shared and HTTP entry paths prove the same persistence owner is used. Test missing-file handling, tolerant display vs strict write reloads, legacy migration including write-on-read compatibility, sibling preservation, obsolete `[document]` behavior, registry/local write ordering and synchronous callers. Do not add a third read/modify/write owner. | Restore delegation only; no data-format migration. Keep any independently landed config-context correction. |
| S5 — Extract ticket collaborators | Split query, mutation preparation and ticket-specific Markdown persistence into `shared/services/ticket/`; retain shared/server TicketService facades. Reuse existing policy and cloud orchestration rather than copying rules. | HTTP/CLI/MCP compatibility, original Markdown/frontmatter preservation, relation/derived-field/epic rules, ambiguous identity, create numbering, worktree location, subdocuments and explicit cloud-recovery outcomes remain green. Public imports continue to build. | Revert each collaborator extraction independently; keep facade signatures, original format and S1 correction. |
| S6 — Isolate runtime orchestration | Complete the transfer of cloud/bootstrap wiring into the runtime owner; inject callbacks between existing watcher/stream/observation components. Avoid redesigning their internals. | One stream per enabled project; process broker reuse; foreground re-arm; no background interactive login; read-only observation/diagnostics never repair; bounded retries; lazy watcher/registry behavior; idempotent teardown with no remaining handles. Rollout remains gated. | Restore previous wiring without changing journal/connection/credential formats or enabling rollout. |
| S7 — Close structural exceptions and reconcile owners | Tighten dependency rules as each migrated caller leaves its legacy edge. Remove dead compatibility paths only after source and consumers prove unused. Update canonical docs for completed slices. | RF-1..RF-7 have scoped executed evidence; no hidden module cycles/new reverse imports or unexplained legacy exceptions; affected consumer builds and integration journeys pass. Record remaining full-suite/deployed limitations instead of declaring universal readiness. | Revert a cleanup independently; retain tested public facades and corrected operation semantics. |

### Conditional config-context correction

- Owner: `server/routes/config.ts` resolver/project context and ConfigApplicationService effects.
- Entry condition: S0's deterministic overlapping-request test reproduces context crossing between projects while the first write is paused.
- Corrective shape: construct immutable per-request/per-operation resolver and project context; persistence and effects use that same captured context across awaits.
- Gate: overlapping success/failure paths target their originating project and adapter; no watch refresh or selector result crosses requests.
- Sequence: land independently before S4 preservation; do not preserve a reproduced race as expected behavior. If not reproduced, record the test/evidence and keep the risk bounded.
- Rollback: independent correction commit; no schema/config-format migration.

## Proposed mutation paths by slice

| Slice | Existing paths | Proposed new paths |
| --- | --- | --- |
| S0/S7 | package.json, relevant CI check configuration, affected test directories; exact baseline manifest entries only after review | `scripts/check-module-boundaries.ts`, `scripts/check-module-boundaries.test.ts` |
| S1/S5 | `shared/services/TicketService.ts`, `server/services/TicketService.ts`, existing ticket policy/helpers; focused shared/server/CLI/MCP tests | `shared/services/ticket/{TicketMutationService,TicketQueryService,TicketRepository,MarkdownTicketRepository}.ts`; regression files selected by the implementation task |
| S2/S6 | server/server.ts; server test factory/setup; scripts/e2e/backend.ts; existing watcher/cloud component constructors only as injection requires | `server/app.ts`, `server/bootstrap/{createRuntime,types}.ts` |
| S3 | Existing controller/route files become compatibility exports as needed; server TicketService search facade; exact tsc/build/test/lint configuration affected by new module locations | `shared/services/search/SearchService.ts`, `server/modules/<capability>/` controller/router/public entrypoints, `server/http/projectAccess.ts` |
| S4 | shared ProjectConfigService/ProjectDocumentPatch/types; server ProjectConfigStorageAdapter; config route/controller/application service only at the delegation/context seam | None mandatory; extract a project-specific persistence collaborator only if one operation cannot express the preserved contracts |
| Retained initially | DocumentService/TreeService/ConfigRepository/strategies/commands/invokers; PinStateService, DocumentFavStateService, TraceStoreService; security APIs; existing cloud protocol/lifecycle internals | No mandatory moves or replacement modules |

- This is a design-level scope map, not permission to edit every row in one task. Each implementation task names its exact files before edits and checks unrelated dirty work.
- For CLI/shared package boundaries, retain public import facades and rebuild downstream consumers. Future task specifications must include relevant TypeScript/package exports and build configuration when required.

## Verification strategy

| Lane | Planned check | Meaning / limitation |
| --- | --- | --- |
| Domain/application rules | Focused shared/domain tests with fixture inputs | Proves operation decisions without HTTP/network; does not prove real persistence |
| File-backed operations | Real source services with shared/test-lib isolated projects | Proves Markdown/config outcomes, path routing and rejection bytes; no mocked duplicate business implementation at the persistence boundary |
| Transport compatibility | Focused server, CLI and MCP tests plus affected OpenAPI checks | Proves adapters retain contracts; targeted mocked tests supplement rather than replace shared-service integration |
| App composition/lifecycle | Common-factory integration and explicit start/stop tests | Proves enabled route/security parity, injected dependency graph, lazy resources and teardown |
| Module dependency gate | AST/import fixtures plus real-source scan | Rejects forbidden package/capability edges; exact allowed compatibility exceptions are reviewed and shrink per slice |
| Existing validation gate | `bun run check:boundaries` | Separate request/decoder policy gate; current 12 unmatched/two stale failures are not architecture successes or blanket exemption candidates |
| Build/type/lint | `bun run validate:ts`, affected package builds, affected lint; `bun run build:all` before broad shared-interface completion | Verifies compilation and consumer wiring; does not establish runtime behavior |
| Browser integration | Documented `bun run test:e2e -- <selected spec files>` wrapper | Use relevant search/ticket/config/preview/SSE journeys after shared composition exists; wrapper owns ephemeral runtimes and teardown |
| Cloud integration | Existing local cloud protocol/stream/recovery suites with isolated dependencies; separately scheduled deployed acceptance | No new automatic streams/credentials or deployed readiness claim from local tests |
| Concurrency | Competing-update, worktree-alias and overlapping config-context probes | Establish actual guarantees; atomic rename alone is insufficient and external-editor conflicts need an explicit outcome |

- Exact suite selection follows affected behavior; relevant checks must pass once, with reruns justified by subsequent changes/failures.
- Baseline: six server suites/113 tests passed at `4c8ae15b`; full suite/build/browser/deployed lanes were not run by the initial review. Re-establish the relevant baseline before source mutation.
- Native/production servers are not restarted during preparation. Future wrapper-managed isolated test runtimes follow repository testing instructions.

## Documentation reconciliation

- Classification: `UPDATE_REQUIRED` for the future ownership changes; preparation itself leaves current owner docs untouched.

| Current owner | Claim affected | Planned reconciliation when slice lands |
| --- | --- | --- |
| `server/docs/ARCHITECTURE.md` | Route/controller ownership, service responsibilities, composition and injection | Replace nonexistent/currently incorrect TicketController claim with verified final owners; document application/runtime factory and real request flows |
| `shared/ARCHITECTURE.md` | Shared package map and operation ownership | Add actual project/ticket/search/cloud capabilities, public facades and I/O-adapter distinction |
| `docs/architecture/event-system/EVENT_SYSTEM.md` | Production/test registration path and lifecycle ownership | Describe common app/runtime assembly while preserving lazy lifecycle/SSE guarantees |
| `docs/architecture/project-identity-and-worktrees.md` | Canonical identity, routing and config/registry mutation owners | Update affected entrypoints/delegation; preserve physical path and operation-lifetime rules |
| `docs/architecture/cloud-sync/README.md` and its data/operations owners | Server activation vs shared protocol/recovery boundaries | Update only changed assembly/ownership pointers and preserved rollout/recovery prerequisites |
| `docs/CONFIG_INSPECTION.md` and `docs/CONFIG_SPECIFICATION.md` | Config scope, write policy and side effects | Reconcile only actual project-write ownership changes; do not redesign exposed settings |
| `DEBUG.md`, server/CLAUDE.md, tests/AGENTS.md, tests/e2e/AGENTS.md, scripts/e2e/AGENTS.md | Entry paths, commands, isolated construction/teardown | Verify unchanged commands and update locations/examples only where extraction changes the maintained operational contract |
| `domain-contracts/AGENTS.md` | Canonical shape ownership | No change expected unless an explicitly reviewed canonical contract change is introduced |

- Read/recheck exact affected sections against source/tests before declaring doc completion; run applicable Markdown, link and Mermaid checks.
- Ticket history remains historical. The MDT-228 template and pre-existing documentation drift are not silently rewritten as approval of this target.

## Alignment and remaining decisions

- Astra teammate: @thread:thr_8pe53d2pib; model requested by the user, Codex provider, `gpt-6-astra`, high reasoning.
- Agreed: capability-based modular monolith; selective ports/adapters; common app composition; separate mutation correction; preserve existing watcher/cloud boundaries; incremental operations with compatibility facades.
- Incorporated Astra additions: project-config mutation ownership slice; distinct pins/favorites/trace semantics; no cross-store transaction claim; deterministic config overlap test and qualified concurrency guarantees.
- No disagreement remains on the proposed direction. Exact persistence-conflict/locking guarantees and contract-preserving project-config API details require the stated experiments before their implementation slices.
- User authorization now covers the agreed architecture, staged implementation and the explicitly described corrective behavior; no requirement lock, normal-mode architecture trace or blanket production readiness claim is inferred. Final review and executed checks determine patch readiness.

## Preparation verification

- Astra final artifact review: **ACCEPT for preparation**, with no required corrections; current/target accuracy, config ownership, corrective separation, dependency rules, rollback and scope all passed. Review thread: @thread:thr_8pe53d2pib.
- Native MDT readback confirmed MDT-266 is Proposed, Architecture/High, a child of MDT-228, with the inventory and prep folder discoverable as subdocuments; dependency check reported no violations.
- Markdown lint passed for the ticket and all three subdocuments: four files, zero errors.
- Relative-link/fence/whitespace check passed: 25 relative file links across four documents.
- `scripts/validate-mermaid-md docs/CRs/MDT-266/prep/architecture.md` passed for its one diagram.
- No production source files changed, no implementation tests were added, and no servers were restarted during preparation. The runtime baseline remains the separately recorded review evidence.
