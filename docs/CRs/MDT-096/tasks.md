# Tasks

## Overview

# Tasks Overview

## Execution Order

1. **TASK-1**: PathWatcherService (core extraction)
2. **TASK-2**: SSEBroadcaster (core extraction)
3. **TASK-3**: FileWatcherService facade (integration)
4. **TASK-4**: Import updates (migration)

## Dependencies

```
TASK-1 ──┐
         ├──> TASK-3 ──> TASK-4
TASK-2 ──┘
```

## Line Budget

| Task | Target Lines | Constraint |
|------|--------------|------------|
| TASK-1 | ~120 | C-2.3 (≤150) |
| TASK-2 | ~150 | C-2.3 (≤150) |
| TASK-3 | ~50 | Minimal delegation |
| TASK-4 | N/A | Import path changes only |

## Task List

- Create PathWatcherService for multi-path orchestration (`TASK-1`)
  Owns: `ART-path-watcher-service`, `ART-path-watcher-test`, `ART-registry-test`, `ART-worktree-test`
  Makes Green: `cache_invalidated_on_change`, `dynamic_path_addition`, `dynamic_path_removal`, `multi_path_monitoring`, `registry_changes_detected`, `TEST-cache-invalidation-unit`, `TEST-multi-path-unit`, `TEST-performance`, `TEST-registry-watcher-unit`
- Create SSEBroadcaster for client lifecycle management (`TASK-2`)
  Owns: `ART-broadcaster-test`, `ART-debounce-test`, `ART-heartbeat-test`, `ART-sse-broadcaster`, `ART-sse-test`
  Makes Green: `sse_path_identification`, `TEST-debounce-unit`, `TEST-heartbeat-unit`, `TEST-sse-api`, `TEST-sse-broadcaster-unit`
- Create FileWatcherService facade with backward compatibility (`TASK-3`)
  Owns: `ART-file-watcher-facade`
  Makes Green: `backward_compat_single_path`, `TEST-worktree-integration`
- Update imports in server.ts, test-app-factory.ts, e2e-context.ts (`TASK-4`)
  Owns: `ART-old-service`
  Makes Green: `TEST-worktree-integration`

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| `ART-broadcaster-test` | `TASK-2` |
| `ART-debounce-test` | `TASK-2` |
| `ART-file-watcher-facade` | `TASK-3` |
| `ART-heartbeat-test` | `TASK-2` |
| `ART-old-service` | `TASK-4` |
| `ART-path-watcher-service` | `TASK-1` |
| `ART-path-watcher-test` | `TASK-1` |
| `ART-registry-test` | `TASK-1` |
| `ART-sse-broadcaster` | `TASK-2` |
| `ART-sse-test` | `TASK-2` |
| `ART-worktree-test` | `TASK-1` |

## Makes Green Summary

| ID | Task IDs |
|---|---|
| `backward_compat_single_path` | `TASK-3` |
| `cache_invalidated_on_change` | `TASK-1` |
| `dynamic_path_addition` | `TASK-1` |
| `dynamic_path_removal` | `TASK-1` |
| `multi_path_monitoring` | `TASK-1` |
| `registry_changes_detected` | `TASK-1` |
| `sse_path_identification` | `TASK-2` |
| `TEST-cache-invalidation-unit` | `TASK-1` |
| `TEST-debounce-unit` | `TASK-2` |
| `TEST-heartbeat-unit` | `TASK-2` |
| `TEST-multi-path-unit` | `TASK-1` |
| `TEST-performance` | `TASK-1` |
| `TEST-registry-watcher-unit` | `TASK-1` |
| `TEST-sse-api` | `TASK-2` |
| `TEST-sse-broadcaster-unit` | `TASK-2` |
| `TEST-worktree-integration` | `TASK-3`, `TASK-4` |
