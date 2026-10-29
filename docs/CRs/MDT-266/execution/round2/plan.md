---
status: READY
target: MDT-266 round2 internal compatibility retirement and truthful static gates
baseline: HEAD 4c8ae15be10ef02626f2c0513e23b3909df92448 plus staged tree bbf4a31798848b1ab9eee54efa8f0222ff488e24
skill_identity: 569a4c272adcaeab2e32b69c89c15783c04cee4893242d067eda8e851b1d372f
mode: execute
---

# MDT-266 round2 execution contract

Prepared before round2 backend mutation. Only this plan, [baseline](baseline.md)
and [compatibility inventory](compatibility-inventory.md) are currently writable.
Parent acknowledgement of this exact plan and its digest is the source-mutation
coordination boundary. On acknowledgement this plan becomes immutable; any later
exact refinement belongs in result.md. This is not a new user-permission gate.

## Decision contract

```yaml
decision: READY
target: internal HTTP compatibility scaffolding and existing static-gate blockers
problem_evidence: 19 old HTTP files preserve an unused production aggregate; ProjectServiceAdapter only forwards; a test re-export hides a real-source mapping; legacy constructor/forwarder members survive only for internal compatibility; full Knip and three package linters are red
proposed_change: migrate internal callers, delete 21 obsolete files, remove identified dead compatibility members and six exceptions; parent fixes narrowly classified static findings without removing public APIs
comparison: production already consumes capability entrypoints; inject the existing shared catalog and keep meaningful shared, storage and lifecycle boundaries
baseline: exact HEAD plus parent-recorded staged tree, current checks and inherited operation evidence in baseline.md
quality_risks: mixed-controller fixtures can lose behavioral coverage; direct catalog injection can misroute sharing/cache effects or pin/favorite construction; stale scanners or artifacts can hide omissions; concurrent writers must not overlap
verification: focused migrated tests, explicit excluded-MCP characterization, real dependency scan, Knip, all seven linters, builds/types, coordinated browser/resource regression and normal-hook commit
artifact:
  mode: USER_SUPPLIED
  root: docs/CRs/MDT-266/execution/round2
  retention: checkout reports and bounded evidence, parent review; no duplicate refactoring run or backlog
documentation:
  impact: UPDATE_REQUIRED
  owners: exact four backend docs below; parent owns ticket/prep and portability of listed first-round evidence
unknowns: explicit MCP harness readiness; deployed cloud and universal performance; unchanged decoder12+2; final normal-hook commit outcome
```

Authority: user explicitly requested the second cleanup round and commit/amend.
Parent owns staging/commit/amend and the 34 static/evidence paths below; this
teammate owns only the acknowledged backend paths and round2 execution evidence.
No new agents. Existing staged user/task files must not be reset or staged here.
Parent attempted a checkpoint commit but normal hooks rejected Knip and absolute
host paths; no checkpoint commit exists and no hook bypass is authorized.

## Invariants and exclusions

- Preserve external HTTP routes, DTOs, status/error envelopes, auth/owner/read
  admission, preview security, request decoding, search scores/limits and effects.
  Internal old HTTP import paths/aggregate constructors may be retired explicitly.
- Preserve combined mutation rejection/no-op/publication, Markdown bodies, refs,
  epic guards, identity ambiguity, numbering, namespace/worktree routing, config
  read/write/migration distinctions and per-request effects from round1.
- Retain shared/server TicketService operations, ProjectConfigLoader's distinct
  published discovery contract, all module barrels, selector storage adapters,
  common test launcher and meaningful FileWatcher lifecycle ownership.
- Preserve the four published shared export names/signatures. Parent adds precise
  `@public` JSDoc only; Knip disuse is not proof of external disuse. The new shared
  SearchService's two application ports remain; only its round1 aggregate-only
  third delegation port is retired with its sole internal consumer.
- Preserve fixture assertions. Compatibility filenames describe accepted payload
  behavior and are not grounds to delete, skip or weaken tests. No replacement
  mixed-controller aggregate in production or test infrastructure.
- Retain the ordinary watcher lifecycle and used diagnostics/event seams. Remove
  only the ten proved-unused compatibility members enumerated in the inventory.
- No cache/protocol/format/concurrency/error redesign, cloud journal or decoder
  manifest edits, framework/dependency upgrades, installation, deployment or user
  server restart. Metadata-only lock refresh by parent uses lockfile-only and
  ignore-scripts; no packages are installed. No wildcard Knip exception or lint
  policy weakening. Decoder12+2 remains visible; require no new findings.
- Keep first-round execution plan SHA256
  `a0f4aa0178d333d8caa344f3cbde9f9d28114e7f7c054631cd0162976afef4f3` unchanged.

## Stable acceptance owners and methods

| ID | Acceptance and owner | Verification / evidence responsibility |
| --- | --- | --- |
| CL1 | User's internal migration authorization; capability HTTP owners: all 21 listed files retired and every actual caller migrated | Teammate inventories static/dynamic imports, jest.mock strings, file-existence guards and emitted paths; migrated fixtures retain assertions; types/build plus source scan find no old internal imports |
| CL2 | MDT-266 module/lifecycle architecture: no old aggregate/getter constructors, fallback-controller delegation, pure forwarding adapter, six compatibility exceptions or ten identified dead facade members | Teammate exact diff/member audit and real structural scan with empty exception manifest; retain meaningful shared/I/O/lifecycle/public barrels |
| CL3 | Existing Knip configuration and published shared API owners: whole Knip green with truthful classification | Parent executes whole Knip; keep jest-dom real loader and four named exports; only new exact jest-dom dynamic-dependency exception and precise @public annotations; no blanket ignore |
| CL4 | Package lint policies and existing behavioral assertions: all seven package linters green | Parent fixes exact allowed import/format/dead-local sites; teammate lint-checks changed backend; parent executes seven linters without skips/assertion loss |
| CL5 | Canonical server/shared/event/auth/config/search/worktree/CLI/MCP contracts: builds, types, affected suites, coordinated browser/resource regression and source/scope review | Teammate focused backend and owning builds/types; characterize both excluded MCP fixtures explicitly; parent coordinates browser and independent Astra review; preserve all failure/skip/non-exit qualifications |
| CL6 | Canonical owner docs, controlled-refactor evidence contract and user commit/amend authorization: current docs/portable evidence and normal-hook scoped commit | Teammate owner-doc lint/links/claims, exact path+metric manifests and result PASS/FAIL/UNKNOWN; parent portable first-round evidence, ticket/prep, stage/commit/amend with normal hooks. Commit remains UNKNOWN until its actual result is supplied |

Inherited green operation evidence and known red static gates are separated in
baseline.md. This round deliberately corrects the known static gates, while
backend retirement preserves the established operation baseline. No universal
repository readiness or deployed cloud claim follows from a focused green suite.

## Backend mutation allowlist

Exact deletes (21):

```text
server/controllers/ConfigController.ts
server/controllers/DocumentController.ts
server/controllers/PinController.ts
server/controllers/ProjectController.ts
server/controllers/SearchController.ts
server/routes/auth.ts
server/routes/cloudCreationRecovery.ts
server/routes/config.ts
server/routes/devtools.ts
server/routes/docs.ts
server/routes/documents.ts
server/routes/pins.ts
server/routes/projects.ts
server/routes/readTokens.ts
server/routes/search.ts
server/routes/share.ts
server/routes/sse.ts
server/routes/system.ts
server/routes/ticketIdentities.ts
server/bootstrap/ProjectServiceAdapter.ts
server/tests/mocks/shared/services/TicketService.ts
```

Exact source/tooling modifications (12):

```text
server/app.ts
server/bootstrap/createRuntime.ts
server/modules/projects/types.ts
server/modules/projects/ProjectController.ts
server/modules/tickets/TicketController.ts
server/services/fileWatcher/index.ts
shared/services/search/SearchService.ts
server/jest.config.mjs
server/tsconfig.json
server/tsconfig.build.json
server/openapi/config.ts
scripts/module-boundary-exceptions.json
```

Exact caller-test modifications (25; original23 plus two Astra-discovered callers):

```text
server/tests/api/config-api.test.ts
server/tests/api/config-maintenance-policy.test.ts
server/tests/api/config-owner-only.test.ts
server/tests/api/devtools-security.test.ts
server/tests/api/document-favs.test.ts
server/tests/api/filesystem-boundary.test.ts
server/tests/api/pins.test.ts
server/tests/api/projects.test.ts
server/tests/api/search.test.ts
server/tests/api/sse-cors.test.ts
server/tests/integration/config-request-context.test.ts
server/tests/routes/config-routes-thin.test.ts
server/tests/routes/config-side-effects.test.ts
server/tests/services/cloud-sync/TicketIdentityObservation.test.ts
server/tests/unit/Phase23.boundaries.test.ts
server/tests/unit/Phase23.compatibility.test.ts
server/tests/unit/Phase45.boundaries.test.ts
server/tests/unit/ProjectController.boundaries.test.ts
server/tests/unit/ProjectController.compatibility.test.ts
server/tests/unit/ProjectController.test.ts
server/tests/unit/TicketService.boundary-compatibility.test.ts
server/tests/utils/setupTests.ts
mcp-server/tests/integration/mcp-backend-consistency.test.ts
server/tests/services/cloud-sync/CloudCreationRecovery.test.ts
mcp-server/tests/integration/mcp-backend-consistency-simple.test.ts
```

Exact owner-document modifications (4):

```text
server/docs/ARCHITECTURE.md
server/CLAUDE.md
docs/architecture/event-system/EVENT_SYSTEM.md
docs/architecture/preference-storage-architecture.md
```

No production/test files are created. No backend writer edits any parent-owned
path below. No additional deletion or fixture removal is implied by Knip.

## Caller and boundary migration

1. Import project, ticket, system, document, config, access and realtime adapters
   from their module public entrypoints. Split mixed fixture setup by the actual
   owner, keeping accepted/rejected input, adapter arguments, visibility, error,
   no-write and cloud identity/recovery assertions active.
2. Inject the existing SharedProjectService directly throughout app composition;
   keep app.locals.projectService as the direct service. Remove nested catalog
   access from the project port/cache clearing and update project spies plus
   favorite/pin service construction to the same actual instance.
3. Remove the old SearchController constructor regression mechanism but preserve
   its project-and-ticket hit assertions using direct shared operations. Remove
   the aggregate-only shared-search delegation and TicketController's fallback
   controller argument; retain existing missing-service response tests.
4. Replace the TicketService mock-path re-export with an exact real-source Jest
   alias before the generic mock mapping. Retain actively used ProjectService
   fixtures and other useful mocks; no mock-policy rewrite.
5. Migrate CloudCreationRecovery's dynamic import string AND file-existence
   guard; migrate both MCP backend-consistency files, including jest.mock paths.
   They are excluded by the default MCP suite and need explicit characterization.
6. Drop obsolete coverage/tsconfig/OpenAPI old-path globs after module ownership
   scans remain active. All current source scanners already point at module
   owners; preserve OpenAPI fields/refs and DevLog/config assertions. Update
   stale config-thin test descriptions. Empty the six structural exceptions;
   keep checker fixtures proving forbidden imports and stale-exception handling.
   No decoder manifest or checker-policy mutation is authorized here.

## Parent-owned static/evidence allowlist

These 34 exact paths are reserved for parent; no teammate edits:

```text
.knip.json
server/package.json
bun.lock
shared/services/ticket/staged-validation.ts
shared/services/externalReferences.ts
shared/templates/catalog.ts
shared/services/ticket/content-inspection.ts
frontend/src/__tests__/no-hardcoded-routes.test.ts
frontend/src/__tests__/routes.test.ts
frontend/src/components/QuickSearch/__tests__/QuickSearchResults.test.tsx
frontend/src/components/QuickSearch/__tests__/SearchScopeBar.test.tsx
frontend/src/hooks/__tests__/useProjectSearch.test.ts
frontend/src/hooks/__tests__/useSearchScope.test.ts
frontend/src/utils/__tests__/accentColors.test.ts
cli/src/commands/cloud/__tests__/confirm.test.ts
cli/src/commands/cloud/__tests__/exit-codes.test.ts
cli/src/commands/cloud/__tests__/idempotency.test.ts
cli/src/commands/cloud/__tests__/options.test.ts
cli/src/commands/cloud/__tests__/render.test.ts
cli/src/commands/cloud/__tests__/secret-prompt.test.ts
shared/services/project/__tests__/ProjectService.resolve.test.ts
shared/services/ticket/__tests__/DependencyGraph.test.ts
shared/services/ticket/__tests__/blocksWriteRejection.test.ts
shared/services/ticket/__tests__/proseScanner.test.ts
shared/tools/__tests__/project-management/configuration-validation.test.ts
shared/tools/__tests__/project-management/helpers/test-utils.ts
shared/utils/__tests__/projectDetector.test.ts
docs/CRs/MDT-266/execution/baseline.md
docs/CRs/MDT-266/execution/result.md
docs/CRs/MDT-266/execution/logs/final-browser-summary.json
docs/CRs/MDT-266/execution/logs/final-commands.json
docs/CRs/MDT-266-backend-module-boundaries.md
docs/CRs/MDT-266/prep/architecture.md
docs/CRs/MDT-266/prep/refactoring-plan.md
```

Parent's static contract: preserve ordered dynamic jest-dom preload and add its
single exact dependency exception with loader proof. Add existing fs-extra and
its types to server development declarations and refresh only lock metadata.
Keep StagedTicketValidationError, ExternalIdentity, BuiltinTemplate and
TicketContentContext exported with precise @public annotations recognized by
installed Knip. Lint changes preserve assertions; accentColors loses its
redundant inner require, retaining its existing top-level import and coverage.
Portable evidence uses repository-relative cwd and `${BB_THREAD_STORAGE}` paths
without changing recorded commands/results or the first plan's identity.

## Owner-document reconciliation

| Exact owner | Required claim update |
| --- | --- |
| server/docs/ARCHITECTURE.md | Retired old controller/route promises, direct catalog injection; retained public/shared/lifecycle boundaries |
| server/CLAUDE.md | Current capability imports and common construction, without old compatibility guidance |
| docs/architecture/event-system/EVENT_SYSTEM.md | Remove dead compatibility surface claims if present; retain actual lifecycle/diagnostic ownership and resource behavior |
| docs/architecture/preference-storage-architecture.md | Replace stale server/routes/system.ts extension guidance with current system/config module owners |

Validate the actual final claims with source/caller searches, Markdown lint,
relative-file/fence checks and existing Mermaid validation if a diagram changes.
Other canonical docs remain unchanged unless a precise affected claim requires a
parent-acknowledged path refinement; do not rewrite historical first-round facts.

## Evidence allowlist and sequence

Initial creates only:

```text
docs/CRs/MDT-266/execution/round2/plan.md
docs/CRs/MDT-266/execution/round2/baseline.md
docs/CRs/MDT-266/execution/round2/compatibility-inventory.md
```

After plan acknowledgement, additionally create/modify result.md and these
bounded evidence files under this same round2 root (no machine-specific paths,
credentials, binary traces or duplicate run):

```text
result.md
logs/baseline-mcp.log
logs/baseline-mcp.json
logs/backend-tests.log
logs/backend-tests.json
logs/mcp-tests.log
logs/mcp-tests.json
logs/build-all.log
logs/types.log
logs/backend-lint.log
logs/shared-affected-lint.log
logs/knip.log
logs/package-lints.json
logs/module-fixtures.log
logs/module-scan.log
logs/decoder-delta.log
logs/browser-summary.json
logs/runtime-resources.json
logs/doc-lint.log
logs/doc-links.json
logs/scope.json
logs/metrics.json
logs/commands.json
logs/review.md
```

Raw `.log` retention follows existing ignored-log policy. Durable Markdown/JSON
summaries record exact commands, exits, counts/skips and qualifications; parent
may supply large outputs by portable thread-storage reference. No new helper
script or additional evidence filename is implied: identify a precise refinement
if needed. Only parent may revise listed first-round evidence for portability.

Sequence after acknowledgement: characterize the two MCP fixtures; migrate one
coherent caller/owner group at a time, retire files and listed scaffolding, run
focused verification, reconcile docs/evidence, independent review, parent normal
hook commit and possible documentation amendment. Parent static work may run in
parallel only on its separate allowlist. Coordinate build/report writers to avoid
artifact races; never overwrite parent browser reports.

## Focused verification and stop conditions

- Server targeted run: the exact23listed server test/helper paths (helpers are
  imported, not test inputs), plus existing common-app/runtime, sharing, pin,
  favorite, search, config and watcher tests as affected. Record actual count and
  no accidental skips. The allowlist has23server files plus2MCP files; helper is
  not an executable spec. Do not infer counts from filenames.
- Before changing the excluded fixtures, explicitly characterize both with:

```bash
bun run --cwd mcp-server jest --runInBand --runTestsByPath tests/integration/mcp-backend-consistency.test.ts tests/integration/mcp-backend-consistency-simple.test.ts --testPathIgnorePatterns='^$'
```

  Record harness/configuration failures without weakening assertions or claiming
  default-suite coverage. If a repair needs a new path or consequential behavior,
  send exact evidence/refinement to parent and progress independent groups.
- Execute `bun run build:all`, `bun run validate:ts:all`, root
  `bunx tsc --noEmit -p tsconfig.json`, affected server/shared lint and owning
  package tests. Parent executes whole Knip and all seven package linters on the
  settled graph; use `bun run knip` and `bun run lint:all` results, not an ignored
  subset. Build shared/domain before consumers and do not race output cleanup.
- Execute `bun run test:modules`, `bun run check:modules` (zero compatibility
  exceptions) and `bun run check:boundaries` (no delta from known12+2). Do not
  silently correct or suppress the unrelated decoder baseline.
- Parent selects wrapper browser regression for affected HTTP/config/search/
  watcher/auth flows; explicit auth has API_LOCAL_HOST_BYPASS=false and a
  parameterized isolated token. Teammate uses existing runtime/disposal evidence
  plus narrowly affected tests; no broad new lifecycle redesign.
- Compare actual deletes/modifies/creates, caller/member presence, untracked
  evidence and per-file sizes to this plan; separate parent mutations and staged
  baseline. No complexity or performance improvement is inferred from deletions.
- CL6 normal-hook commit is parent-owned. No teammate stage/reset/commit, hook
  bypass, dependency install, deployment, server restart or new agent. Keep
  source stopped before acknowledgement and report unsupported lanes honestly.
