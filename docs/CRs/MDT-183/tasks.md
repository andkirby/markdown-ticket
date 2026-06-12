# Tasks: MDT-183

**Source**: canonical architecture/tests state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- `server/services/fileWatcher/`: Lazy watcher lifecycle — new `WatcherLifecycleManager`, modified `SSEBroadcaster` and facade
- `server/routes/sse.ts`: Wire lifecycle hooks into SSE connect/disconnect
- `server/server.ts`: Remove eager watcher init, add lazy bootstrap
- No frontend changes. No MCP changes. No shared/ changes.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Watcher refcount + debounce | `WatcherLifecycleManager.ts` | N/A (new module) |
| Zombie SSE detection | `SSEBroadcaster.ts` | N/A (existing owner) |
| Facade coordination | `index.ts` (facade) | N/A (existing owner) |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C-1 (RSS < 300 MB) | Task 3 (verify manual) |
| C-2 (no latency regression) | Task 1 (integration verify) |
| C-3 (zero watchers idle) | Task 1, Task 3 |

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| services/fileWatcher/ | 4 | 4 | 0 | ✅ |
| routes/ | 1 | 1 | 0 | ✅ |
| server.ts | 1 | 1 | 0 | ✅ |
| tests/ | 2 | 2 | 0 | ✅ |

## Tasks

### Task 1: Create WatcherLifecycleManager (new module)

**Structure**: `server/services/fileWatcher/WatcherLifecycleManager.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-watcher-lifecycle` → `server/tests/watcherLifecycle.test.ts`: all lifecycle tests
- `TEST-latency-constraint` → integration verify

**Scope**: New module that owns per-project watcher refcount, debounce stop, and lazy init coordination.
**Boundary**: Only manages watcher lifecycle — does NOT create chokidar instances directly (delegates to PathWatcherService).

**Creates**:
- `server/services/fileWatcher/WatcherLifecycleManager.ts`

**Modifies**:
- `server/tests/watcherLifecycle.test.ts` (already exists, will GREEN)

**Must Not Touch**:
- `SSEBroadcaster.ts` (Task 2)
- `server.ts` startup logic (Task 3)
- `routes/sse.ts` (Task 3)

**Anti-duplication**: Import `PathWatcherService` from `./PathWatcherService.js` — do NOT copy watcher creation logic.

**Duplication Guard**:
- Check that no other module tracks per-project watcher state — `PathWatcherService.watchers` Map tracks instances, not refcounts. `WatcherLifecycleManager` adds refcount on top.
- If overlap found, merge into `PathWatcherService` instead of new file.

**Verify**:
```bash
cd server && bunx jest tests/watcherLifecycle.test.ts --no-coverage --testTimeout=10000 --forceExit
```

**Done when**:
- [x] All 12 watcherLifecycle tests GREEN
- [x] `activeWatcherCount()` returns correct count
- [x] `refCount(projectId)` returns correct count
- [x] 5s debounce fires correctly

---

### Task 2: Fix SSEBroadcaster zombie detection + heartbeat leak

**Structure**: `server/services/fileWatcher/SSEBroadcaster.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-sse-zombie` → `server/tests/sseBroadcaster.zombie.test.ts`: all zombie tests

**Scope**: Fix two bugs in SSEBroadcaster:
1. **F-1**: `startHeartbeat()` discards `setInterval` return → store ref, clear in `stop()`
2. **F-2**: Heartbeat only checks `destroyed`/`closed` flags → add `try/catch` on `res.write()` + handle `false` return

**Boundary**: Only modifies heartbeat and stop behavior. No changes to broadcast, debounce, or client scope logic.

**Creates**: nothing

**Modifies**:
- `server/services/fileWatcher/SSEBroadcaster.ts`
- `server/tests/sseBroadcaster.zombie.test.ts` (already exists, will GREEN)

**Must Not Touch**:
- `WatcherLifecycleManager.ts` (Task 1)
- `index.ts` facade (Task 3)
- `routes/sse.ts` (Task 3)

**Anti-duplication**: Reuse existing `removeClient()` — do NOT add a separate cleanup method.

**Duplication Guard**:
- Zombie detection belongs in `startHeartbeat` only — do NOT add zombie checks to `broadcast()` or `sendSSEEvent()`.
- Existing `broadcast()` already checks `destroyed`/`closed` on send — that's a different concern (stale-client cleanup during active events).

**Verify**:
```bash
cd server && bunx jest tests/sseBroadcaster.zombie.test.ts --no-coverage --testTimeout=10000 --forceExit
```

**Done when**:
- [x] All 9 zombie detection tests GREEN
- [x] `stop()` clears heartbeat interval (no leaked timer)
- [x] Backward compat: `destroyed`/`closed` flags still trigger removal without write

---

### Task 3: Wire lazy lifecycle into facade, SSE route, and server startup

**Structure**: `server/services/fileWatcher/index.ts`, `server/routes/sse.ts`, `server/server.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-watcher-lifecycle` → end-to-end: SSE connect triggers watcher creation
- `TEST-sse-zombie` → end-to-end: zombie removal triggers watcher release
- `TEST-hot-reload-clean` → integration verify
- `TEST-memory-constraint` → manual verify

**Scope**: Wire the new `WatcherLifecycleManager` into the existing system:
1. Facade (`index.ts`): delegate `addClient`/`removeClient` to lifecycle manager
2. SSE route (`sse.ts`): pass resolved project scope to lifecycle manager on connect/disconnect
3. Server (`server.ts`): remove `initializeMultiProjectWatchers()` call, register project metadata with lifecycle manager instead

**Boundary**: Integration wiring only. No new logic — all behavior comes from Task 1 and Task 2 modules.

**Creates**: nothing

**Modifies**:
- `server/services/fileWatcher/index.ts`
- `server/routes/sse.ts`
- `server/server.ts`

**Must Not Touch**:
- `WatcherLifecycleManager.ts` (Task 1)
- `SSEBroadcaster.ts` (Task 2)
- `PathWatcherService.ts` (no changes needed)
- Frontend code

**Anti-duplication**: Import `WatcherLifecycleManager` from `./WatcherLifecycleManager.js` — do NOT inline lifecycle logic in facade.

**Duplication Guard**:
- `addClient()` in facade must call both `SSEBroadcaster.addClient()` AND `WatcherLifecycleManager.ensureWatchers()` — no shortcut.
- `removeClient()` in facade must call both `SSEBroadcaster.removeClient()` AND `WatcherLifecycleManager.releaseProject()` — no shortcut.
- SSE route's existing `req.on('close')` / `req.on('aborted')` handlers already call `fileWatcher.removeClient()` — those stay, now they just trigger lifecycle release too.

**Verify**:
```bash
# All MDT-183 tests
cd server && bunx jest tests/watcherLifecycle.test.ts tests/sseBroadcaster.zombie.test.ts --no-coverage --testTimeout=10000 --forceExit

# Full regression
cd server && bunx jest --no-coverage --testTimeout=10000 --forceExit

# Manual: start server, verify memory
bash scripts/smart-server.sh 60
# Open browser → watch memory in activity monitor
# Close browser → verify watchers stop after 5s debounce
```

**Done when**:
- [x] All unit tests GREEN
- [x] Server starts with zero watchers (check logs)
- [x] Browser connect creates watchers (check logs)
- [x] Browser close removes watchers after debounce (check logs)
- [x] Full server test suite passes (regression)
- [ ] Server RSS < 300 MB with 3 active projects (manual)
- [ ] `bun --hot` restart re-runs lazy init cleanly

## Post-Implementation

- [x] No duplication (grep for watcher lifecycle logic outside WatcherLifecycleManager)
- [x] Scope boundaries respected (no frontend/MCP/shared changes)
- [x] All unit tests GREEN
- [x] No leaked `setInterval` (jest exits without `--forceExit`)
- [ ] Smoke test: open/close browser tab, verify watcher count in logs
- [ ] Verify F-4 fix: no reconnect cascade in SSE event history
