# Test Strategy

## Existing Coverage (Preserved)

| Test File | Focus | Status |
|-----------|-------|--------|
| `server/tests/api/sse.test.ts` | SSE endpoint, client handling | ✅ 614 lines, 18 tests |
| `server/tests/fileWatcherService.worktree.test.ts` | Worktree watchers | ✅ 209 lines, 10 tests |

## New Unit Tests Required

### PathWatcherService.spec.ts
- Multi-path initialization
- Dynamic path addition/removal
- Graceful degradation on watcher failure
- Race condition handling

### SSEBroadcaster.spec.ts
- Client add/remove
- Event broadcasting
- Stale client cleanup
- Heartbeat

## Performance Validation

- Benchmark with 1, 5, 10, 20 concurrent paths
- Verify <5% overhead per path (C-2.1)

## Test Execution

```bash
# Unit tests
bun run --cwd server jest services/fileWatcher/__tests__/

# Integration (existing)
bun run --cwd server jest tests/fileWatcherService.worktree.test.ts
bun run --cwd server jest tests/api/sse.test.ts
```
