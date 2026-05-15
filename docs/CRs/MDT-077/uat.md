# UAT Refinement Brief

## Objective

Stabilize the project entity architecture after the project edit fix by turning the UAT architecture watchlist into current same-ticket execution work.

## Approved Changes

- Configuration mode is explicit before persistence decisions.
- Project identity resolution returns a write reference with mode and config paths.
- Public project mutations enter through one shared mutation boundary.
- A table-driven project contract matrix covers all supported configuration modes.

Rollback-on-failure is deferred. For this round, failed writes must preserve previous configuration where possible and report the failed write target.

## Changed Requirement IDs

| ID | Decision | Change |
|----|----------|--------|
| `BR-1.1` | refine in place | Canonical project resolution now includes write-reference context for mutations. |
| `C1` | refine in place | Mode ownership requires an explicit mode value before write routing. |
| `C2` | refine in place | Shared project contract includes the single mutation boundary. |
| `C4` | refine in place | Persisted readback testing now requires a mode matrix. |
| `C6` | additive | Explicit mode model. |
| `C7` | additive | Canonical write reference. |
| `C8` | additive | Single mutation entry point. |

## Affected Downstream Trace

- BDD remains covered by existing scenarios for canonical reads, mode-specific updates, description readback, missing-registry fallback, and cross-interface state.
- Architecture gains explicit mode/write-reference obligations.
- Tests gain a contract matrix plan for shared mode coverage.
- Tasks are current execution slices, not historical audit records.

## Execution Slices

### Slice 1: Mode and Identity Contract

- Objective: Introduce an explicit mode/write-reference contract before mutation routing.
- Direct artifacts/files: `shared/services/ProjectService.ts`, `shared/services/project/types.ts`, `shared/services/project/ProjectConfigService.ts`.
- Direct GREEN targets: `TEST-shared-project-config-modes`, `TEST-shared-project-discovery-contract`.
- Impacted canonical task IDs: `TASK-mode-identity-contract`.
- Why this slice exists: it removes implicit mode inference from the write path.

### Slice 2: Single Mutation Boundary

- Objective: Route API and future CLI/MCP project mutations through one shared mutation entrypoint.
- Direct artifacts/files: `shared/services/ProjectService.ts`, `server/controllers/ProjectController.ts`, `server/server.ts`.
- Direct GREEN targets: `TEST-project-api-read-update-contract`, `TEST-project-browser-edit-readback`.
- Impacted canonical task IDs: `TASK-single-mutation-boundary`.
- Why this slice exists: it prevents adapters from recreating storage-mode rules.

### Slice 3: Contract Matrix Tests

- Objective: Add table-driven coverage for create/register, read, update, and readback across global-only, project-first, and auto-discovery modes.
- Direct artifacts/files: `shared/services/project/__tests__/ProjectConfigService.test.ts`, `server/tests/api/projects.test.ts`.
- Direct GREEN targets: `TEST-project-contract-mode-matrix`, `TEST-shared-project-config-modes`, `TEST-project-api-read-update-contract`.
- Impacted canonical task IDs: `TASK-contract-matrix`.
- Why this slice exists: the project entity is mode-dependent and should not rely on a single happy-path CRUD test.

## Watchlist

- Decide whether registry metadata and local operational config should become separate TypeScript types immediately or during the mutation-boundary implementation.
- Decide whether UI state should update directly from the API canonical response, using `project:changed` only as a reconciliation signal.
- Keep transactional rollback deferred unless UAT finds a real corrupted-state risk.
