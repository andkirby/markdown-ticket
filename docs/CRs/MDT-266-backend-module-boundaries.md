---
code: MDT-266
creationId: c3954a0e-43db-4b9b-9a32-184a894964f4
status: Implemented
dateCreated: 2026-10-29T12:04:12.254Z
type: Architecture
priority: High
phaseEpic: MDT-228
relatedTickets: MDT-082,MDT-105,MDT-111
implementationNotes: Implemented in 74d42c3c (rounds 1-2) — 21 obsolete internal files and 10 unused watcher members retired; 0 structural exceptions. Whole-repo Knip and all 7 package linters pass. Parent normal-hook source checkpoint created; final evidence in docs/CRs/MDT-266/execution/round2/result.md. Source accepted by Astra; human review approved.
---

# Modularize backend capabilities and unify application composition

## 1. Description

### Requirements Scope

- Preservation for structural refactoring; separately specified correction for the reproduced partial ticket update.
- Implement the agreed capability-based architecture through controlled-refactor slices, with a separately tested correction for combined ticket mutations and conditional correction of reproduced config-context crossing.

### Baseline Problem (`4c8ae15b`)

- `server/controllers/SearchController.ts:95` owns ranking and obtains services through `ProjectController`; `server/controllers/ProjectController.ts` spans project, ticket, filesystem, sharing, and watcher responsibilities.
- `server/services/TicketService.ts:364` persists status before subsequent attribute validation. An isolated source-backed probe accepted `{ status: "In Progress", phaseEpic: "TEST-999" }`, rejected the missing epic, and left status changed from Proposed to In Progress.
- `server/server.ts:290,432` and `server/tests/api/test-app-factory.ts:189,240` assemble different application graphs; E2E uses the test factory and omits production identity/recovery/status and projection-provider wiring.
- `shared/services/TicketService.ts` combines application policy, file persistence, identity observation, numbering, and cloud recovery while constructing dependencies internally.
- Shared `ProjectConfigService` and server `ProjectConfigStorageAdapter` independently mutate project configuration. Router-wide mutable request context requires an overlapping-request investigation before preservation claims.

### Scope

- Architecture/High implementation child of MDT-228; retain the existing epic and related ticket statuses.
- Inventory `server/`, consumed `shared/services/`, `shared/tools/ProjectManager.ts`, canonical `domain-contracts/`, and HTTP/CLI/MCP consumer boundaries.
- Preserve Markdown/Git authority, file formats, project/worktree routing, namespace behavior, admission/preview security, lazy watcher lifecycle, SSE behavior, and cloud recovery/credential rules.
- Exclude Cloud Worker implementation/deployment, frontend redesign, new database/framework, cache redesign owned by MDT-105, and public error-format redesign owned by MDT-111.

## 2. Decision

### Agreed Approach

- Use a layered modular monolith organized by capability, with selective ports and adapters at meaningful filesystem, cloud, credential, and transport boundaries.
- Treat deployment topology and dependency structure as separate choices: local capability modules share existing packages; the existing cloud deployment boundary stays explicit.
- Preserve working watcher/cloud components and compatibility facades; migrate complete operations incrementally.
- Group capability-owned HTTP controllers/routes under `server/modules/<capability>/`; reusable application operations stay in shared. Preserve existing imports with thin compatibility facades where consumers need them.
- Round2 retires the obsolete internal HTTP paths after migrating all callers, removes the forwarding project adapter and unused compatibility members, and retains published shared APIs and meaningful storage/lifecycle boundaries. The user authorized this cleanup and a scoped commit/amend after reviewing the first patch.
- Use controlled-refactor execution with MDT tracking, per-slice baseline/acceptance evidence, and independent Astra review. The user authorized implementation after reviewing this direction; each affected slice must still establish its executed preservation baseline.

### Rationale

- HTTP, CLI, MCP, and tests need reusable application operations with the same rules.
- Filesystem authority, worktree routing, and cloud journals need explicit owners and failure contracts.
- Common production/test assembly removes a demonstrated verification gap.
- Narrow interfaces at I/O and lifecycle seams improve substitution without an interface or package for every class.

## 3. Alternatives Considered

| Approach | Key difference | Decision |
| --- | --- | --- |
| Capability modules plus selective ports/adapters | Existing package topology; isolate operations and external mechanisms | Agreed direction; fits current consumers and authority model |
| Layer-only cleanup | Keep global routes/controllers/services organization | Insufficient alone; does not resolve controller coupling or duplicate mutation owners |
| Mandatory Clean Architecture hierarchy | Introduce every layer/interface for every capability | Defer; cost is not justified for simple state/read helpers |
| Vertical slices | Organize migration around complete operations | Use as delivery strategy inside capability boundaries |
| Additional microservices | Separate local capabilities into network deployments | Outside scope; no demonstrated deployment need |

## 4. Artifact Specifications

### Preparation Artifacts

| Ticket subdocument | Purpose |
| --- | --- |
| `module-inventory.md` | Documented claims versus actual modules, evidence, ownership gaps, and verified baseline |
| `prep/architecture.md` | Proposed module map, concrete paths, dependency rules, critical flows, and preserved invariants |
| `prep/refactoring-plan.md` | Ordered slices, permitted changes, corrective exceptions, validation, rollback, and documentation reconciliation |
| `execution/` | Immutable execution plan, baseline and acceptance evidence, and final result for this implementation run |

### Integration Boundaries

| From | To | Boundary |
| --- | --- | --- |
| HTTP/CLI/MCP adapters | Shared ticket/search operations | Typed requests/results; preserve external formats |
| Search controller | Shared search capability | Direct injection; no service access through another controller |
| Ticket mutations | Ticket persistence and existing cloud coordination | Complete candidate validation before a local write; explicit post-write/recovery outcomes |
| Server project-config adapter | Existing shared project/config capability | One mutation owner; characterize contract differences before delegation |
| Production and test launchers | Common application factory and explicit runtime lifecycle | Same routes/security graph; isolated injected dependencies |

## 5. Acceptance Criteria

### Preparation Completion

- [x] PREP-1: Inventory maps documented intent to actual ownership for contracts, projects/config, tickets/search, documents, favorites, pins, trace, security, realtime, cloud, and bootstrap.
- [x] PREP-2: Every target path is classified as existing or proposed; public module seams and forbidden dependencies are explicit.
- [x] PREP-3: Plan separates corrective behavior changes from preservation refactors, with per-slice prerequisites, validation, rollback, and owner-doc impact.
- [x] PREP-4: Astra alignment is recorded with unresolved concerns; the user subsequently authorized the agreed design and execution, subject to per-slice preservation evidence.

### Implementation Gates

- [x] RF-1: A rejected combined ticket mutation leaves canonical bytes and publication side effects unchanged; valid mutations retain supported transport contracts.
- [x] RF-2: Production and tests assemble the same enabled route/security graph; construction starts no background lifecycle, explicit teardown releases owned resources.
- [x] RF-3: Search ranking/filtering/deduplication/limits have one shared owner and preserved transport results.
- [x] RF-4: Project-file mutation entry paths delegate to the shared project/config owner with existing read/write/migration contracts preserved.
- [x] RF-5: Capability dependency checks reject new forbidden imports; legacy exceptions are explicit and shrink per migration.
- [x] RF-6: HTTP/CLI/MCP, worktree/namespace, preview/auth, lazy watcher, and cloud recovery checks pass for affected slices; known baseline failures remain reported.
- [x] RF-7: Changed owner documents describe verified implementation; target proposals remain separate until their slices land.
- [x] RF-8: Capability HTTP adapters are owned by `server/modules/<capability>/`; cross-capability consumers use public operations instead of controller service getters. Round2 retires obsolete internal HTTP paths and preserves meaningful public shared boundaries.

Implementation and local verification are complete. Parent accepted the patch after Astra accepted both source and report. The [execution result](MDT-266/execution/result.md) maps every criterion to evidence and records the existing lint/decoder, server-test handle and intermittent 501 qualifications. Human review has since approved the implementation and the ticket is Implemented (landed as 74d42c3c); PATCH_READY denoted patch acceptance, not deployment or whole-repository readiness.

The [round2 plan](MDT-266/execution/round2/plan.md), [baseline](MDT-266/execution/round2/baseline.md) and [compatibility inventory](MDT-266/execution/round2/compatibility-inventory.md) govern the subsequent cleanup. Its result records the final Knip/lint status, caller migration and commit outcome; first-round evidence remains historical.

Round2 is complete: 21 obsolete internal files and 10 unused watcher members are retired, all callers are migrated, and the structural exception manifest is empty. Whole Knip has no findings or configuration hints; all seven package linters pass. Parent's normal-hook source checkpoint succeeded. The [cleanup result](MDT-266/execution/round2/result.md) records verification and the unchanged decoder/excluded-MCP limits.

## 6. Verification

### Recorded Preparation Baseline

- Revision: `4c8ae15b`; clean before preparation.
- Six focused server suites passed, 113 tests total: ProjectController boundaries, TicketService boundary compatibility, config application, creation recovery, projection stream manager, watcher lifecycle.
- `bun run check:boundaries` failed: 12 unmatched validation sites and two stale exceptions. This is an input-validation convention check, not a structural module-dependency check.
- Mutation defect reproduced using isolated `shared/test-lib` and real source service classes; no production data changed.
- Full suites, deployed cloud behavior, concurrency safety, and browser readiness are not established by this baseline.

The full executed S0 baseline is recorded in [execution/baseline.md](MDT-266/execution/baseline.md). Implementation, corrective exceptions, final checks and remaining limitations belong to [execution/result.md](MDT-266/execution/result.md); the preparation snapshot above is retained as historical evidence.

### Planned Validation

- Characterization and regression evidence precedes each mutation slice.
- Run affected shared/server/CLI/MCP tests, package builds, TypeScript checks, existing boundary checks, and selected E2E through the documented wrapper.
- Atomic replacement does not establish lost-update protection or a transaction spanning Markdown, registry, journals, and cloud.

## 7. Deployment

- Deliver a reviewable local patch through independent reversible slices and compatibility facades; no data-format or deployment migration is planned.
- Commit, merge, dependency installation, deployment and restart of existing user servers are outside the execution authorization; isolated test runtimes use the documented wrapper.
- Explicitly retain or separately revert the corrective mutation change; structural rollback must not silently restore its defect.

## 8. References

- MDT-228: existing backend service-layer refactor epic.
- MDT-082: implemented shared ticket consolidation; preserve its shared-operation boundary.
- MDT-105 and MDT-111: adjacent cache and error-format work, outside this ticket's design scope.
- `server/docs/ARCHITECTURE.md`, `shared/ARCHITECTURE.md`, `domain-contracts/AGENTS.md`.
- `docs/architecture/event-system/EVENT_SYSTEM.md`, `docs/architecture/project-identity-and-worktrees.md`, `docs/architecture/cloud-sync/README.md`.
- Astra alignment: @thread:thr_8pe53d2pib.
- [Original ports/adapters pattern](https://alistair.cockburn.us/hexagonal-architecture) and [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html); conceptual sources, not evidence of repository behavior.
