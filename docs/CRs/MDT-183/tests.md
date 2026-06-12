# Tests: MDT-183

> Test trace projection: [tests.trace.md](./tests.trace.md)

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `WatcherLifecycleManager` (new) | `server/tests/watcherLifecycle.test.ts` | 12 |
| `SSEBroadcaster` (modified) | `server/tests/sseBroadcaster.zombie.test.ts` | 9 |

## Test Details

### WatcherLifecycleManager

| Test | Requirement | Type |
|------|-------------|------|
| Zero watchers on construction | BR-1 | unit |
| Create watchers on first subscribe | BR-2 | unit |
| No re-create for active project | BR-2 | unit |
| Create for multiple projects | BR-2 | unit |
| Refcount, not duplicate watchers | BR-3 | unit |
| Stop on last client release | BR-4 | unit |
| Keep running with remaining client | BR-4 | unit |
| Zero watchers after full release + debounce | C-3 | unit |
| Reconnect within debounce cancels stop | Edge-1 | unit |
| Zombie removed → reconnect within debounce keeps watchers | Edge-1, F-4 | unit |
| 3 tabs share, stop after last | Edge-3 | unit |
| Memory under 300 MB with ≤5 clients | C-1 | manual |
| Latency unchanged after lazy init | C-2 | integration |
| Clean re-init after --hot restart | Edge-2 | integration |

### SSEBroadcaster Zombie Detection

| Test | Requirement | Type |
|------|-------------|------|
| Remove on write throw (EPIPE) | BR-5 | unit |
| Keep healthy client | BR-5 | unit |
| Remove zombie, keep healthy in same cycle | BR-5 | unit |
| Detect within 60s (two cycles) | BR-5 | unit |
| Handle write returning false | BR-5 | unit |
| Count 0 after all zombies removed | BR-6 | unit |
| Accurate count with mixed live/zombie | BR-6 | unit |
| Destroyed flag still works (no write) | backward-compat | unit |
| Closed flag still works (no write) | backward-compat | unit |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Refcount boundary (0→1, 1→0) | WatcherLifecycleManager | BR-2, BR-4 |
| Debounce window (within/after) | WatcherLifecycleManager | Edge-1 |
| Write result (throw / false / true) | SSEBroadcaster | BR-5 |

## Constraint Coverage

| Constraint | Test | Type |
|------------|------|------|
| C-1 (RSS < 300 MB) | TEST-memory-constraint | manual |
| C-2 (no latency regression) | TEST-latency-constraint | integration |
| C-3 (zero watchers idle) | covered by BR-1, BR-4 tests | unit |

## Verify

```bash
# Unit tests (RED until implementation)
cd server && bunx jest tests/watcherLifecycle.test.ts tests/sseBroadcaster.zombie.test.ts --no-coverage --testTimeout=10000 --forceExit

# All server tests (regression check)
cd server && bunx jest --no-coverage
```
