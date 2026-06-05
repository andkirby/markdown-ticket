---
code: MDT-180
status: Implemented
dateCreated: 2026-06-05T18:12:08.820Z
type: Bug Fix
priority: High
---

# Eliminate SSE reconnect cascade causing periodic idle page reloads

## Problem

The page fires a burst of API requests every 2–3 minutes while completely idle. The SSE connection drops silently, reconnects, and triggers cascading data refreshes across multiple independent `useProjectManager` instances. Users see unnecessary network activity and brief UI flicker with no action taken.

## Root Causes

1. **Node.js default timeouts kill SSE connections** — Express server uses `requestTimeout=300s`, `headersTimeout=60s`, `keepAliveTimeout=5s`. The SSE endpoint (`/api/events`) did not disable these per-request, so long-lived connections were silently terminated.

2. **Vite proxy timeout** — In dev mode, `http-proxy` proxies `/api/events` without timeout overrides, adding another layer that kills idle SSE connections.

3. **Triple `useProjectManager` deduplication failure** — Three components independently instantiate `useProjectManager({ handleSSEEvents: true })`: `ProjectRouteHandler`, `ProjectSelector`, and `Board`. Each fetches projects on mount and on `sse:reconnected`, producing 7 `/api/projects` calls on page load and 3× on every reconnect.

## Solution

- `server/routes/sse.ts` — Disable all Node.js timeouts on SSE connections (`req.setTimeout(0)`, `res.setTimeout(0)`, `req.socket.setTimeout(0)`, `req.socket.setKeepAlive(true)`).
- `vite.config.ts` — Add dedicated `/api/events` proxy entry with `timeout: 0`, `proxyTimeout: 0`.
- `src/hooks/useProjectManager.ts` — Module-level `fetchProjectsDeduped()` coalesces concurrent `fetchProjects()` calls from N instances into a single HTTP request.

## Verification

- [x] `/api/projects` reduced from 7 to 2 on page load
- [x] Zero idle requests after 2+ minutes
- [x] No SSE reconnection messages in console during idle
- [ ] Production reverse proxy configured with no timeout for `/api/events`
- [ ] Follow-up: hoist `useProjectManager` to single context provider

## Incident Report

`incidents/2026-06-05-sse-reconnect-cascade.md`