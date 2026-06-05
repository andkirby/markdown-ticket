# SSE Reconnect Cascade — Periodic Idle Page Reloads

**Date:** 2026-06-05
**Severity:** Medium
**Status:** Fixed
**Affected:** Production (`mdt-board.constantapp.org`), Dev (`localhost:5173`)

## Symptoms

Page fires a burst of API requests every 2–3 minutes while idle. SSE connection drops silently, reconnects, and triggers cascading data refreshes across 3 independent `useProjectManager` instances.

Observed in Network tab: 1× `GET /api/events` reconnect → 3× `GET /api/projects` → 3× `GET /projects/:id/crs` + `config` + current ticket.

## Root Causes

### 1. Node.js default timeouts kill SSE connections

Express server (`app.listen()`) uses Node.js defaults: `requestTimeout=300s`, `headersTimeout=60s`, `keepAliveTimeout=5s`. The SSE endpoint did not disable these per-request, so long-lived connections were silently terminated.

**Fix:** `server/routes/sse.ts` — added `req.setTimeout(0)`, `res.setTimeout(0)`, `req.socket.setTimeout(0)`, `req.socket.setKeepAlive(true)` after writing SSE headers.

### 2. Vite proxy timeout

In dev mode, Vite's `http-proxy` proxies `/api/events` without timeout overrides, adding another layer that could kill idle connections.

**Fix:** `vite.config.ts` — added dedicated `/api/events` proxy entry with `timeout: 0`, `proxyTimeout: 0`.

### 3. Triple `useProjectManager` deduplication failure

Three components mount `useProjectManager({ handleSSEEvents: true })` simultaneously:

| Component | Mounts on |
|---|---|
| `ProjectRouteHandler` (App.tsx) | `/prj/*` routes |
| `ProjectSelector` (header) | Always |
| `Board` | Board/list views |

Each independently fetches projects on mount and on `sse:reconnected`. No dedup → 7 `/api/projects` calls on page load, 3× on every reconnect.

**Fix:** `src/hooks/useProjectManager.ts` — added module-level `fetchProjectsDeduped()` that coalesces concurrent calls into one HTTP request.

## Files Changed

- `server/routes/sse.ts` — disable timeouts on SSE connections
- `vite.config.ts` — SSE-specific proxy with no timeout
- `src/hooks/useProjectManager.ts` — project fetch dedup
- `server/server.ts` — captured server instance (minor)

## Results

| Metric | Before | After |
|---|---|---|
| `/api/projects` on page load | 7 | 2 |
| Idle requests after 2 min | Burst every 2–3 min | 0 |
| SSE reconnection | Every 2–3 min | None |

## Follow-up

- Production reverse proxy (Caddy/nginx) needs `proxy_read_timeout 0` or equivalent for `/api/events` path
- Architecture: `useProjectManager` should eventually be hoisted to a single context provider instead of N independent instances
