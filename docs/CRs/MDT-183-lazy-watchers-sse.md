---
code: MDT-183
status: Implemented
dateCreated: 2026-06-11T23:03:52.657Z
type: Architecture
priority: High
relatedTickets: MDT-180
---

# Lazy file watchers and SSE zombie detection

## 1. Description

### Requirements Scope
`full` — specific files and methods are known from investigation

### Problem
- Backend server consumes 580 MB+ RSS in prod mode within 25 minutes of startup
- 10 registered projects × ~3-4 chokidar watchers each = ~30+ fsevents native handles walking entire directory trees
- 14 zombie SSE clients remain in `SSEBroadcaster.clients` Set despite tabs being closed
- Heartbeat (`startHeartbeat`) checks `client.destroyed`/`client.closed` but these flags stay `false` for half-open TCP connections — `write()` succeeds because OS buffers it
- All watchers start eagerly on server boot regardless of whether any SSE client is connected

### Affected Areas
- `server/services/fileWatcher/` — PathWatcherService, SSEBroadcaster, FileWatcherService facade
- `server/server.ts` — watcher initialization at startup
- `server/routes/sse.ts` — SSE connection lifecycle

### Scope

**In scope:**
- On-demand watcher lifecycle (start watchers when first SSE client subscribes, stop when last disconnects)
- Per-project watcher scoping (only watch projects relevant to connected SSE clients)
- Reliable zombie SSE client detection (write-error-based or timeout-based)
- Memory reduction to baseline Bun runtime (~200 MB)

**Out of scope:**
- Changes to chokidar configuration (polling mode, etc.)
- Frontend changes
- MCP server changes

## 2. Desired Outcome

### Success Conditions
- Server memory stays under 300 MB with idle SSE connections
- Only projects with active SSE clients have running chokidar watchers
- Zombie SSE connections are detected and removed within 60 seconds of client disconnect
- No regression in file change detection latency for active projects
- `/api/status` `sseClients` count reflects actual live connections

### Constraints
- Must maintain backward compatibility with existing SSE event format
- Must not break existing file watcher event flow (file-change, document-change, project lifecycle)
- Must not increase CPU usage when idle (no polling fallback)
- Worktree watchers, document watchers, and registry watcher must follow same lazy lifecycle

### Non-Goals
- Not changing the chokidar `awaitWriteFinish` or `ignoreInitial` settings
- Not implementing project-level watcher priority or load balancing
- Not adding metrics/monitoring endpoints for watcher count

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| SSE zombie detection | Use write-error detection (try/catch on heartbeat write) or TCP keepalive timeout? | Must work with Express response objects |
| Watcher lifecycle trigger | Start watchers on first SSE connect, or on first project-specific subscription? | SSE currently subscribes to all projects client has access to |
| Registry watcher | Keep global registry watcher always active (lightweight, 1 toml glob) or make it lazy too? | Must detect new project additions |
| Fallback | What happens to file events when watchers are starting up (race window)? | Must not miss events during project switch |

### Known Constraints
- Chokidar `ready` event takes ~100-500ms per watcher — lazy start has latency
- SSE clients can have scoped access (`mdtSseScope.projectRefs`) — watchers must match scope
- `--hot` mode restarts the entire process, so lazy init re-runs on each hot reload

### Decisions Deferred
- Exact zombie detection mechanism (architecture phase)
- Whether to add a "warmup" period where watchers stay active after last client disconnects (architecture phase)

## 4. Acceptance Criteria

### Functional
- [x] Server starts with zero chokidar watchers (registry watcher excepted)
- [x] SSE connection triggers watcher creation for that client's project scope
- [x] Multiple SSE clients for same project share one watcher set
- [x] When all SSE clients for a project disconnect, that project's watchers stop
- [x] Zombie SSE connections (closed tab, network drop) are detected within 60s
- [x] `/api/status` `sseClients` reflects live connections only
- [x] File change events still flow correctly to all connected SSE clients

### Non-Functional
- [x] Server RSS memory under 300 MB with ≤5 SSE clients and ≤3 active projects
- [x] No increase in file change detection latency (measured SSE delivery time)
- [x] Zero watchers running when no SSE clients are connected

### Edge Cases
- [x] Client connects and disconnects rapidly (debounce watcher start/stop)
- [x] Client has read-only scope — watchers still created but events filtered
- [x] Hot reload (`--hot`) restarts process — lazy init re-runs cleanly
- [x] Multiple browser tabs to same project — shared watchers, not duplicated

## 5. Verification

- Monitor `ps -o rss -p <pid>` before/after SSE connections
- Verify `lsof -p <pid | grep " DIR " | wc -l"` drops when watchers stop
- Check `/api/status` `sseClients` matches actual browser tab count
- Confirm file changes still trigger SSE events after lazy watcher startup

## 6. Findings

### F-1: Heartbeat setInterval leak
**Severity**: Medium
**Location**: `server/services/fileWatcher/SSEBroadcaster.ts` → `startHeartbeat()`
**Problem**: `setInterval()` return value is discarded. `stop()` never clears it. Leaks a timer per server lifecycle and hangs Jest (480s+ open handle timeout).
**Fix**: Part of BR-5 implementation — store interval ref, clear in `stop()`.

### F-2: 14 zombie SSE clients in production
**Severity**: High
**Location**: `SSEBroadcaster.clients` Set
**Problem**: Heartbeat checks `res.destroyed`/`res.closed` but these stay `false` for half-open TCP connections. `res.write()` succeeds because OS buffers it. Zombie connections accumulate indefinitely.
**Fix**: Part of BR-5 implementation — catch write errors / false returns.

### F-3: Eager watcher init for all projects
**Severity**: High (root cause of 580 MB memory)
**Location**: `server/server.ts` → `initializeMultiProjectWatchers()`
**Problem**: Creates ~30 chokidar FSWatcher instances at boot for 10 registered projects, regardless of SSE connections. Each walker holds native fsevents handles on entire directory trees.
**Fix**: Part of BR-1/BR-2 implementation — lazy init via WatcherLifecycleManager.

### F-4: SSE reconnect cascade (incident 2026-06-05)
**Severity**: High
**Location**: `SSEBroadcaster.startHeartbeat()` + client-side `useProjectManager`
**Incident**: `incidents/2026-06-05-sse-reconnect-cascade.md`
**Problem**: Zombie connections linger in `clients` Set because heartbeat can't detect them (F-2). Node's `requestTimeout` (300s) eventually kills them → client auto-reconnects → `sse:reconnected` fires → 3× `useProjectManager` instances each trigger cascading API refreshes (projects → CRs → config → ticket). Repeats every ~2 minutes while idle.
**Symptom**: `connected → reconnected → ... idle ... → disconnected → connected → reconnected` every 2-3 min
**Root cause chain**: F-2 (zombie detection) → zombie accumulates → Node timeout kills it → reconnect cascade
**Relation**: MDT-180 was the symptomatic fix (timeouts + dedup). This (MDT-183) is the root cause fix — proper zombie detection prevents the timeout-triggered reconnect cascade entirely.
**Fix**: Part of BR-5 implementation — proper zombie detection removes dead connections immediately, preventing the timeout-triggered reconnect cascade. Incident's timeout workarounds were symptomatic fixes; this is the root cause fix.

## 7. References

> Architecture trace projection: [architecture.trace.md](./MDT-183/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-183/architecture.md)

- `server/services/fileWatcher/PathWatcherService.ts` — chokidar watcher creation
- `server/services/fileWatcher/SSEBroadcaster.ts` — client lifecycle, heartbeat
- `server/services/fileWatcher/index.ts` — facade wiring
- `server/routes/sse.ts` — SSE connection handler
- `server/server.ts` — startup initialization (lines 174–297)
- Related discussion: MDT-142 (worktree watchers add more chokidar instances)
