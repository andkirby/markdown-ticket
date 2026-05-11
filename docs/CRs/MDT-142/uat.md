# UAT Refinement Brief

## Objective

Close the UAT gap where a ticket exists only in an active worktree whose branch matches the ticket code, but project ticket lists do not show it.

Concrete case: `MDT-161` exists only in an active Codex worktree on branch `MDT-161`, but is absent from the main project's `docs/CRs`, so list discovery misses it.

## Approved Changes

- Add worktree-only ticket discovery to ticket listing behavior.
- Ticket list aggregation must union main-project tickets with branch-matched active worktree tickets.
- Worktree-only tickets must include `inWorktree: true` and worktree path metadata.
- Preserve the existing main-ticket resolution behavior for tickets present in main.

## Changed Requirement IDs

| ID | Decision | Change |
|----|----------|--------|
| `BR-1.7` | additive_change | Add ticket list visibility for branch-matched worktree-only tickets. |

## Affected Downstream Trace

| Stage | Added or Updated |
|-------|------------------|
| BDD | `worktree_only_ticket_listed` |
| Architecture | `ART-project-service`, `OBL-worktree-ticket-list-union` |
| Tests | `TEST-worktree-only-ticket-listing` |
| Tasks | `TASK-8` |

Also closed prior UAT trace drift by adding `TASK-9` for the already-approved top-level ticket file creation behavior (`BR-1.5`).

## Execution Slices

### Slice 1: Worktree-only ticket list aggregation

- Objective: Make project ticket lists include tickets that exist only in detected worktrees.
- Direct artifacts/files: `shared/services/ProjectService.ts`
- Direct GREEN targets: `TEST-worktree-only-ticket-listing`, `worktree_only_ticket_listed`
- Impacted canonical task IDs: `TASK-8`
- Why this slice exists: `ProjectService.getProjectCRs()` currently scans main tickets first and only resolves worktrees for tickets already found in main.

### Slice 2: Prior UAT closure for top-level ticket file creation

- Objective: Close existing canonical trace validation for `BR-1.5`.
- Direct artifacts/files: `server/services/fileWatcher/PathWatcherService.ts`
- Direct GREEN targets: `TEST-path-watcher-file-creation`, `TEST-e2e-file-creation-sse`, `new_ticket_file_creation`
- Impacted canonical task IDs: `TASK-9`
- Why this slice exists: The April UAT added `BR-1.5`, but canonical tasks did not yet include a closure task for it.

## Validation

- `spec-trace validate MDT-142 --stage requirements`
- `spec-trace validate MDT-142 --stage bdd`
- `spec-trace validate MDT-142 --stage architecture`
- `spec-trace validate MDT-142 --stage tests`
- `spec-trace validate MDT-142 --stage tasks`
- `spec-trace validate MDT-142 --stage all`

## Watchlist

- This behavior overlaps MDT-095 ownership. Keep implementation scoped to shared ticket listing aggregation and avoid changing unrelated file watcher behavior.
- Avoid duplicate ticket rows when the same ticket exists in main and worktree.
- Preserve worktree metadata in API and MCP list responses.
