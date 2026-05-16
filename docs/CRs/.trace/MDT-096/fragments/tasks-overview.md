# Tasks Overview

## Execution Order

1. **TASK-1**: PathWatcherService (core extraction)
2. **TASK-2**: SSEBroadcaster (core extraction)
3. **TASK-3**: FileWatcherService facade (integration)
4. **TASK-4**: Import updates (migration)

## Dependencies

```text
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
