# Architecture

## Rationale

# Architecture Rationale

## Pattern: Service Decomposition

Split the monolithic 683-line FileWatcherService into focused modules following Single Responsibility Principle.

## Structure

```
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

## Obligations

- FileWatcherService facade preserves existing API surface (`OBL-backward-compat-facade`)
  Derived From: `BR-1.5`, `C-2.2`
  Artifacts: `ART-file-watcher-facade`, `ART-worktree-test`, `ART-sse-test`
- File changes trigger cache invalidation (`OBL-cache-invalidation`)
  Derived From: `BR-1.7`
  Artifacts: `ART-path-watcher-service`, `ART-path-watcher-test`
- Rapid file changes are debounced to prevent duplicates (`OBL-debounce-events`)
  Derived From: `C-2.5`
  Artifacts: `ART-sse-broadcaster`, `ART-debounce-test`
- Watcher failures are logged without crashing service (`OBL-graceful-degradation`)
  Derived From: `C-2.4`, `Edge-3.2`
  Artifacts: `ART-path-watcher-service`, `ART-path-watcher-test`
- Heartbeat detects and removes dead SSE connections (`OBL-heartbeat-cleanup`)
  Derived From: `C-2.6`
  Artifacts: `ART-sse-broadcaster`, `ART-heartbeat-test`
- Old fileWatcherService.ts is deprecated and removed after migration (`OBL-migration-deprecation`)
  Derived From: `BR-1.5`
  Artifacts: `ART-old-service`, `ART-file-watcher-facade`
- PathWatcherService orchestrates multiple chokidar watchers (`OBL-multi-path-orchestration`)
  Derived From: `BR-1.1`, `BR-1.3`, `BR-1.4`, `C-2.3`
  Artifacts: `ART-path-watcher-service`, `ART-path-watcher-test`
- Multi-path monitoring adds <5% overhead per path (`OBL-performance-constraint`)
  Derived From: `C-2.1`
  Artifacts: `ART-path-watcher-service`, `ART-path-watcher-test`
- Concurrent add/remove operations are safe (`OBL-race-condition-handling`)
  Derived From: `Edge-3.1`
  Artifacts: `ART-path-watcher-service`, `ART-path-watcher-test`
- Registry watcher broadcasts project lifecycle events (`OBL-registry-watcher`)
  Derived From: `BR-1.6`
  Artifacts: `ART-path-watcher-service`, `ART-registry-test`
- SSEBroadcaster manages client connections and event broadcasting (`OBL-sse-client-lifecycle`)
  Derived From: `BR-1.2`, `C-2.2`, `C-2.3`
  Artifacts: `ART-sse-broadcaster`, `ART-broadcaster-test`

## Artifacts

| Artifact ID | Path | Kind | Referencing Obligations |
|---|---|---|---|
| `ART-broadcaster-test` | `server/services/fileWatcher/__tests__/SSEBroadcaster.spec.ts` | test | `OBL-sse-client-lifecycle` |
| `ART-debounce-test` | `server/services/fileWatcher/__tests__/Debounce.spec.ts` | test | `OBL-debounce-events` |
| `ART-file-watcher-facade` | `server/services/fileWatcher/index.ts` | runtime | `OBL-backward-compat-facade`, `OBL-migration-deprecation` |
| `ART-heartbeat-test` | `server/services/fileWatcher/__tests__/Heartbeat.spec.ts` | test | `OBL-heartbeat-cleanup` |
| `ART-old-service` | `server/fileWatcherService.ts` | runtime | `OBL-migration-deprecation` |
| `ART-path-watcher-service` | `server/services/fileWatcher/PathWatcherService.ts` | runtime | `OBL-cache-invalidation`, `OBL-graceful-degradation`, `OBL-multi-path-orchestration`, `OBL-performance-constraint`, `OBL-race-condition-handling`, `OBL-registry-watcher` |
| `ART-path-watcher-test` | `server/services/fileWatcher/__tests__/PathWatcherService.spec.ts` | test | `OBL-cache-invalidation`, `OBL-graceful-degradation`, `OBL-multi-path-orchestration`, `OBL-performance-constraint`, `OBL-race-condition-handling` |
| `ART-registry-test` | `server/services/fileWatcher/__tests__/RegistryWatcher.spec.ts` | test | `OBL-registry-watcher` |
| `ART-sse-broadcaster` | `server/services/fileWatcher/SSEBroadcaster.ts` | runtime | `OBL-debounce-events`, `OBL-heartbeat-cleanup`, `OBL-sse-client-lifecycle` |
| `ART-sse-test` | `server/tests/api/sse.test.ts` | test | `OBL-backward-compat-facade` |
| `ART-worktree-test` | `server/tests/fileWatcherService.worktree.test.ts` | test | `OBL-backward-compat-facade` |

## Derivation Summary

| Requirement ID | Obligation Count | Obligation IDs |
|---|---:|---|
| `BR-1.1` | 1 | `OBL-multi-path-orchestration` |
| `BR-1.2` | 1 | `OBL-sse-client-lifecycle` |
| `BR-1.3` | 1 | `OBL-multi-path-orchestration` |
| `BR-1.4` | 1 | `OBL-multi-path-orchestration` |
| `BR-1.5` | 2 | `OBL-backward-compat-facade`, `OBL-migration-deprecation` |
| `BR-1.6` | 1 | `OBL-registry-watcher` |
| `BR-1.7` | 1 | `OBL-cache-invalidation` |
| `C-2.1` | 1 | `OBL-performance-constraint` |
| `C-2.2` | 2 | `OBL-backward-compat-facade`, `OBL-sse-client-lifecycle` |
| `C-2.3` | 2 | `OBL-multi-path-orchestration`, `OBL-sse-client-lifecycle` |
| `C-2.4` | 1 | `OBL-graceful-degradation` |
| `C-2.5` | 1 | `OBL-debounce-events` |
| `C-2.6` | 1 | `OBL-heartbeat-cleanup` |
| `Edge-3.1` | 1 | `OBL-race-condition-handling` |
| `Edge-3.2` | 1 | `OBL-graceful-degradation` |
