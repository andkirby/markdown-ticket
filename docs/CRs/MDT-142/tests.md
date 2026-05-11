# Tests: MDT-142

**Source**: [MDT-142](../MDT-142-fix-filewatcher-recursive-watching-worktree-exclus.md)
**Generated**: 2026-03-17

## Overview

Test specification for subdocument SSE events in main project and worktree contexts.

## Module → Test Mapping

| Module | Test File | Kind | Tests |
|--------|-----------|------|-------|
| `PathWatcherService` | `server/tests/fileWatcherService.subdocument.test.ts` | Unit | 8 |
| `PathWatcherService` | `server/tests/fileWatcherService.worktree-monitor.test.ts` | Unit | 6 |
| `SSEBroadcaster` | `server/tests/sseBroadcaster.subdocument.test.ts` | Unit | 7 |
| `useSSEEvents` | `src/hooks/useSSEEvents.subdocument.test.ts` | Unit | 5 |
| `TicketViewer` | `src/components/TicketViewer/useTicketDocumentRealtime.subdocument.test.ts` | Unit | 7 |
| E2E | `tests/e2e/filewatcher/subdocument-sse.spec.ts` | E2E | 5 |
| `ProjectService` | `shared/tests/services/project/ProjectService.worktree.test.ts` | Integration | worktree-only listing |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Recursive watch pattern `**/*.md` | `PathWatcherService` | Pattern used, subdocuments captured |
| Worktree exclusion rules | `PathWatcherService` | Exclude active worktree paths, no duplicates |
| Worktree HEAD monitoring | `PathWatcherService` | Add/remove worktree detection |
| Subdocument path parsing | `PathWatcherService` | Folder path, slug file path |
| SSE event structure | `SSEBroadcaster` | subdocument field, source field, eventType |
| Worktree-only list aggregation | `ProjectService` | Branch-matched worktree tickets included when absent from main |

## External Dependency Tests

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|---------------------|
| `.git/worktrees` | Worktree monitor tests | No worktree detection, main watcher only |
| File system | Subdocument path parsing tests | N/A (mocked in unit tests) |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 (Recursive pattern) | `fileWatcherService.subdocument.test.ts` | `should use **/*.md pattern` |
| C2 (Worktree exclusion) | `fileWatcherService.subdocument.test.ts` | `should exclude worktree paths` |
| C3 (Monitor .git/worktrees) | `fileWatcherService.worktree-monitor.test.ts` | `should watch worktrees directory` |
| C4 (Backward compatibility) | `useSSEEvents.subdocument.test.ts` | `should still emit ticket:updated` |
| BR-1.7 (Worktree-only listing) | `ProjectService.worktree.test.ts` | `should list branch-matched worktree-only tickets` |

## Frontend 5-Case Coverage

| Case | eventType | Viewing? | Test |
|------|-----------|----------|------|
| 1 | `change` | YES | `should invalidate cache and refetch content` |
| 2 | `change` | NO | `should invalidate cache only without refetching` |
| 3 | `add` | ANY | `should refetch ticket to refresh tabs list` |
| 4 | `unlink` | NO | `should refetch ticket to refresh tabs list` |
| 5 | `unlink` | YES | `should switch to main tab and refetch ticket` |

## Verify

```bash
# Backend unit tests
bun run --cwd server jest fileWatcherService.subdocument.test.ts
bun run --cwd server jest fileWatcherService.worktree-monitor.test.ts
bun run --cwd server jest sseBroadcaster.subdocument.test.ts

# Frontend unit tests
bun test src/hooks/useSSEEvents.subdocument.test.ts
bun test src/components/TicketViewer/useTicketDocumentRealtime.subdocument.test.ts

# E2E tests
bun run test:e2e tests/e2e/filewatcher/subdocument-sse.spec.ts

# Worktree-only ticket listing
bun run --cwd shared jest ProjectService.worktree.test.ts
```

---
*Rendered by /mdt:tests via spec-trace*
