# Architecture Rationale

## Pattern: Service Decomposition

Split the monolithic 683-line FileWatcherService into focused modules following Single Responsibility Principle.

## Structure

```text
server/services/fileWatcher/
├── index.ts                    # Facade (~50 lines)
├── PathWatcherService.ts       # Multi-watcher orchestration (~120 lines)
├── SSEBroadcaster.ts           # Client lifecycle + broadcasting (~150 lines)
└── __tests__/
    ├── PathWatcherService.spec.ts
    └── SSEBroadcaster.spec.ts
```

## Runtime Flow

1. **Initialization**: `FileWatcherService` facade creates `PathWatcherService` and `SSEBroadcaster`
2. **Path Addition**: `addWatcher()` → `PathWatcherService.createWatcher()` → chokidar instance
3. **File Change**: chokidar event → `PathWatcherService` → `SSEBroadcaster.broadcast()`
4. **Client Connect**: SSE route → `SSEBroadcaster.addClient()`

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Keep chokidar direct | Wrapper adds indirection without value |
| Merge ClientManager into SSEBroadcaster | Tightly coupled, separating adds complexity |
| Facade pattern | Preserves backward compatibility, enables incremental migration |

## Extension Rule

- **Path features**: Add to `PathWatcherService` (limit 150 lines)
- **SSE features**: Add to `SSEBroadcaster` (limit 150 lines)
- **New cross-cutting**: Add to facade, delegate to services

## Migration Path

1. Create new services alongside existing
2. Update facade to delegate
3. Migrate tests
4. Remove old `server/fileWatcherService.ts`
