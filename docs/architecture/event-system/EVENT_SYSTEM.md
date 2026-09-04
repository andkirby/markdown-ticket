# Event System Architecture

> Canonical description of the real-time update system: file watching → SSE
> broadcasting → frontend event bus → UI updates.
>
> Design history and decision rationale live in the CRs:
> [MDT-183](../../CRs/MDT-183/architecture.md) (lazy watchers, zombie
> detection, runtime project registration), MDT-142 (subdocuments/worktrees),
> MDT-128/106 (original SSE + e2e).

## Question This Doc Answers

How do on-disk changes (ticket `.md` files, documents, project registry
`.toml` files) reach open browser tabs in real time — and which module owns
each stage?

## System Overview

```
 .md file changed on disk
        │
        ▼
 PathWatcherService (chokidar, per project)
        │  emits raw events, parses subdocument info
        ▼
 FileWatcherService facade (server/services/fileWatcher/index.ts)
        │  enriches with ticket metadata, debounces (100ms)
        ▼
 SSEBroadcaster (server/services/fileWatcher/SSEBroadcaster.ts)
        │  per-client scope filtering, heartbeat (30s), zombie removal
        ▼
 SSE stream  GET /api/events (server/routes/sse.ts)
        │
        ▼
 sseClient (frontend/src/services/sseClient.ts)
        │  parses, dedupes by eventId, maps to EventBus events
        ▼
 eventBus (frontend/src/services/eventBus.ts)
        ▼
 useSSEEvents / TicketViewer hooks → UI update
```

## Backend Modules (`server/services/fileWatcher/`)

| Module | Responsibility |
|--------|----------------|
| `PathWatcherService` | Owns chokidar watchers: per-project ticket globs, document paths, worktrees, and the global registry watcher (`~config/projects/*.toml`). Emits raw file/document/registry events. |
| `WatcherLifecycleManager` | Lazy lifecycle: per-project refcount, provision watchers on first SSE subscriber, stop (debounced 5s) on last unsubscribe. Late registration provisions waiting subscribers (BR-7). |
| `projectRegistrationIntegration` | Production wiring shared by `server.ts` and the e2e app factory: boot-time metadata registration + registry watcher init + runtime (registry-change) project registration with bounded retry. |
| `SSEBroadcaster` | Client set, per-event scope filtering, 100ms debounce, 30s heartbeat with write-error zombie detection, last-50-event queue. |
| `index.ts` (facade) | Composes the above; enriches file events with ticket frontmatter metadata; owns client connect/disconnect (`addClient`/`removeClient`); re-subscribes connected write clients when a project registers at runtime. |

### Lazy watcher lifecycle (MDT-183)

- **Zero watchers with zero SSE clients** (registry watcher excepted) — memory invariant.
- Watchers are provisioned on the first subscriber for a project and released (after a 5s debounce) when the last subscriber disconnects.
- **Runtime project registration (BR-7, UAT 2026-09-02)**: a project whose registry `.toml` appears while the server runs is discovered by the global registry watcher, registered into the lifecycle (bounded retry covers a tickets dir that appears after the `.toml`), and connected write-access clients are re-subscribed without a reconnect. `ensureWatchers` never silently skips an unknown project — it logs and holds the subscription.
- Invariants and design decisions (D1–D5): see [MDT-183 architecture.md](../../CRs/MDT-183/architecture.md).

## SSE Protocol (`GET /api/events`)

- `text/event-stream`; same origin via the Vite dev proxy (or a production reverse proxy); cross-origin via `VITE_BACKEND_URL`.
- Timeouts disabled for long-lived connections; heartbeat every 30s doubles as liveness proof — write errors or `false` returns remove the client (zombie detection).

### Message envelope

All messages: `data: {"type":"<event-type>","data":{...}}\n\n`

| Type | When | Key `data` fields |
|------|------|-------------------|
| `connection` | once on connect | `status`, `timestamp` |
| `heartbeat` | every 30s | `timestamp` |
| `file-change` | ticket `.md` add/change/unlink | `eventType`, `filename`, `projectId`, `timestamp`, `ticketData` (code/title/status/type/priority/lastModified), `subdocument` (MDT-142: `{code, filePath}` or null), `source` (`main`/`worktree`), `eventId` |
| `document-change` | document file add/change/unlink | `eventType`, `filePath`, `projectId`, `timestamp` |
| `project-created` / `project-updated` / `project-deleted` | registry `.toml` add/change/unlink | `projectId`, `timestamp`, `eventId`, `source` |

Read-only clients receive only events for projects in their scope;
write-access (owner) clients receive everything.

## Frontend (`frontend/src/`)

| Module | Responsibility |
|--------|----------------|
| `services/sseClient.ts` | Single `EventSource`; parses messages; dedupes by `eventId` (last 100 ids / 5s); maps SSE types to EventBus events; reconnects with exponential backoff (1s→30s, max 5 attempts), then surfaces `sse:error`. |
| `services/eventBus.ts` | App-wide pub/sub (`ticket:created/updated/deleted`, `ticket:subdocument:changed`, `document:file:changed`, `project:*`, `sse:*`). |
| `hooks/useSSEEvents.ts` | Consumes ticket events for the current project: applies complete `ticketData` directly (no refetch) or debounces a full refetch (100ms). User-initiated (optimistic) updates are tracked and skipped once when the echo arrives (5s window). |
| `hooks/useProjectManager.ts` | On `sse:reconnected`, refetches projects — reconnects are lossy, so a resync follows. |

**There is no polling fallback.** SSE is the only live channel; a dead stream
means stale UI until the EventSource reconnects (which triggers a resync).
AGENTS-level summaries must not claim a polling backup.

## Testing

- Unit: `server/tests/watcherLifecycle.test.ts`, `sseBroadcaster.zombie.test.ts`, `tests/unit/RegistryWatcher.test.ts`.
- E2E (production path, no manual watcher init): `tests/e2e/sse/late-registration.spec.ts` — runtime-created projects, including a client connected before registration.
- E2E (admin seam `/_e2e/watchers/*`, eager init for pre-existing scenario setups): `tests/e2e/sse/updates.spec.ts`. New specs should follow the production-path pattern.
