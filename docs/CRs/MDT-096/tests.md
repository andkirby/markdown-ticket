# Test Plan

## Strategy

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

## Test Plans By Kind

### unit

- Cache invalidation triggers on file change events (`TEST-cache-invalidation-unit`)
  Covers: `BR-1.7`
- Debouncing logic prevents rapid duplicate events (`TEST-debounce-unit`)
  Covers: `C-2.5`
- Heartbeat detects and removes dead SSE connections (`TEST-heartbeat-unit`)
  Covers: `C-2.6`
- PathWatcherService unit tests for multi-path orchestration (`TEST-multi-path-unit`)
  Covers: `BR-1.1`, `BR-1.3`, `BR-1.4`, `C-2.4`, `Edge-3.1`, `Edge-3.2`
- Global registry watcher detects project config changes (`TEST-registry-watcher-unit`)
  Covers: `BR-1.6`
- SSEBroadcaster unit tests for client lifecycle and broadcasting (`TEST-sse-broadcaster-unit`)
  Covers: `BR-1.2`, `C-2.2`

### integration

- Performance benchmark for multi-path overhead (`TEST-performance`)
  Covers: `C-2.1`
- Existing SSE API tests validate endpoint behavior (`TEST-sse-api`)
  Covers: `BR-1.2`, `C-2.2`
- Existing worktree tests validate facade backward compatibility (`TEST-worktree-integration`)
  Covers: `BR-1.1`, `BR-1.3`, `BR-1.4`, `BR-1.5`, `C-2.1`

## Requirement Coverage Summary

| Requirement ID | Route Policy | Direct Test Plans | Indirect Test Plans |
|---|---|---|---|
