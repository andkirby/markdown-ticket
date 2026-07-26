---
code: MDT-213
status: Proposed
dateCreated: 2026-07-26T10:07:48.327Z
type: Architecture
priority: High
---

# SSE-based config change refresh for live browser consumers

## 1. Description

### Problem Statement

MDT-168 ships a configuration-management API (`PATCH /api/config`) and a
default-deny selector allowlist. Every successful write flows through one
`ConfigApplicationService` boundary and (for server-affecting selectors) fires
explicit injected side effects via `ConfigSideEffectRegistry`.

What MDT-168 does **not** provide is a general mechanism for **live browser
consumers** to learn that a config value changed, in the same session, without
a full page reload. Each consumer that reads a config value once on mount is a
latent staleness bug:

- MDT-129 `useSelectorData` reads `ui.projectSelector.*` once via
  `/api/config/selector` and never refreshed → fixed narrowly in MDT-168 TASK-10
  with a hard-coded per-selector window event.
- `useBackendConfig` holds its own descriptor cache; another tab editing the
  same value does not converge.
- Config changed via CLI (`mdt-cli attr`), MCP tools, or direct file edit is
  invisible to any open browser tab until reload — even though the file watcher
  already observes the change on disk.

The TASK-10 PoC (`mdt:selector-prefs-updated` window event, two selectors
hard-coded in `useBackendConfig`) is intentionally narrow. It is **not** the
architecture for the full allowlist. This CR designs and lands that
architecture.

### Current Architecture

- **Write path**: `PATCH /api/config` → `ConfigApplicationService.applyConfig`
  → scope adapter → atomic write → `ConfigSideEffectRegistry.runForScope`.
  Side effects are server-side only (discovery cache, document watchers,
  link/system re-read). User-scope selectors have no server effect by design.
- **Read path**: `GET /api/config/selectors` returns descriptors; consumers
  fetch once and cache locally (`useBackendConfig`, `useSelectorData`).
- **Live update path**: `SSEBroadcaster` on `/api/events` already broadcasts
  file-watcher events to browser clients. Config writes do not emit anything
  on this channel today.
- **TASK-10 PoC**: `useBackendConfig.applyOne` dispatches a named window event
  for two `ui.projectSelector.*` selectors; `useSelectorData` listens and
  re-fetches. Browser-only; one consumer; no multi-tab; no CLI/MCP convergence.

### Proposed Architecture

**Server emits a typed `config:changed` SSE event after every successful
`applyConfig`. Browser consumers subscribe via a selector-scoped invalidation
hook (`useConfigSlice`) and re-fetch their own slice.**

- The producer is the config write boundary — the only legal config writer —
  not a generic pub/sub. The event payload names the selector and scope.
- The transport is the existing `/api/events` SSE stream, reusing
  `SSEBroadcaster`. No new endpoint, no WebSocket, no polling.
- The consumer model is **selector-keyed invalidation**, not a generic event
  bus: `useConfigSlice(selector)` returns the value plus an invalidate trigger;
  on a matching `config:changed` it refetches its slice. Consumers opt in per
  selector; there is no global fan-out.
- File-watcher config-file changes (CLI/MCP/manual edits) also emit
  `config:changed`, so all write sources converge across all tabs.
- Browser-only preferences (BR-6.1) never appear on this channel — they are
  not on the config allowlist and never reach `applyConfig`.

### Rationale

- **One producer, one transport.** The config boundary is already the single
  writer; making it the single SSE producer is a one-line addition that serves
  every consumer forever. The TASK-10 pattern (writer knows each consumer) does
  not scale past a handful of selectors.
- **Reuses existing infra.** `/api/events` + `SSEBroadcaster` are already in
  production for file changes. Adding a typed event type is incremental, not
  foundational.
- **Convergence across all write sources.** CLI/MCP/file edits are first-class
  today only for file-watcher consumers; config consumers miss them entirely.
  Routing config changes through the same SSE channel fixes this for free.
- **Honors "no event bus".** The channel carries only `config:changed` events
  keyed by allowlisted selectors, produced only by `applyConfig` and the file
  watcher's config-file filter. It is not a generic app-wide bus.

## 2. Solution Analysis

### Architecture Overview

```
Write sources                         One boundary            One transport        N consumers
─────────────                         ────────────            ────────────         ────────────
PATCH /api/config ─┐
mdt-cli attr ──────┼──► ConfigApplicationService ──► writeFileAtomic
MCP update_cr ─────┘            │                              │
                                │  post-write (applyConfig)    │  file watcher detects
                                ▼                              ▼  config-file change
                          SSEBroadcaster.broadcast ◄──── fileWatcher config filter
                                │   event: config:changed { selector, scope, source }
                                ▼
                          /api/events  ──────────►  useConfigSlice(selector)  ──►  refetch slice
                                                       (useBackendConfig, useSelectorData,
                                                        document tree, etc. migrate here)
```

### Key Components

| Component | Role | New/Existing |
|---|---|---|
| `ConfigApplicationService.applyConfig` | On success, emit `config:changed` to `SSEBroadcaster` (in addition to existing side effects) | Extended |
| `SSEBroadcaster` | Existing broadcast medium on `/api/events` | Existing |
| Config-file watcher filter | Recognize writes to `.mdt-config.toml` / `config.toml` / `user.toml` / registry TOML and emit `config:changed` for the affected selectors (so CLI/MCP/manual edits converge) | New (narrow filter, reuses existing chokidar events) |
| `useConfigSlice(selector)` | Browser hook: holds the slice value, subscribes to `config:changed` for its selector, refetches on match. Replaces ad-hoc per-consumer fetch-once logic. | New (frontend) |
| `configApiClient` | Already returns descriptors; `useConfigSlice` consumes it | Existing |
| Migration targets | `useBackendConfig`, `useSelectorData`, document tree, any future consumer | Migrated |

### Design Decisions

- **Event payload is selector-scoped, not scope-scoped.** Consumers invalidate
  by exact selector (or prefix for collection selectors). This keeps the
  invalidation precise and avoids over-fetching.
- **`source` field on the event**: `api` | `file`. Lets consumers decide
  whether to refetch (e.g. skip if the change originated from this tab and the
  local cache already has the effective value — closes the
  "my-own-write-redundantly-refetches" inefficiency the PoC has).
- **No generic bus.** The event type is a closed enum (`config:changed` only).
  Other domains (tickets, documents) already have their own SSE event types;
  this does not unify them.
- **Browser-only prefs stay browser-only.** They are not on the allowlist, so
  they never reach `applyConfig` and never appear on the channel. The
  localStorage-override merge in `useSelectorData` is preserved unchanged.
- **Idempotent invalidation.** A consumer receiving `config:changed` for a
  selector it doesn't care about is a no-op. Receiving two in a row collapses
  to one refetch (debounce per slice).

### Trade-offs Analysis

| We gain | We lose / cost |
|---|---|
| Any new allowlisted selector is auto-refreshable with zero wiring | One new SSE event type + a frontend hook to maintain |
| Multi-tab convergence | Each open tab receives the event (acceptable; SSE is cheap) |
| CLI/MCP/manual edit convergence (currently impossible) | Need a config-file filter in the watcher (small, but real) |
| Retire the TASK-10 hard-coded signal | Migration churn in `useBackendConfig` and `useSelectorData` |
| Single producer, auditable | Slight coupling: `ConfigApplicationService` depends on `SSEBroadcaster` |

Rejected alternatives:
- **Generic app event bus.** Violates the standing "no event bus" guidance and
  invites the coupling mess the PoC narrowly avoided.
- **WebSocket.** Adds a transport the project doesn't use elsewhere; SSE is
  already in production and is one-way (sufficient).
- **Polling.** Already the backup path; not acceptable as the primary
  freshness contract.

## 3. Implementation Specification

### Technical Requirements

- `ConfigApplicationService` takes `SSEBroadcaster` (or a narrow
  `ConfigChangeEmitter` interface to keep the dependency minimal) as an
  injected dependency, mirroring the existing side-effect injection pattern.
- After a successful atomic write, emit
  `{ type: 'config:changed', selector, scope, source: 'api' }`.
- The config-file watcher filter emits the same event with `source: 'file'`
  when a watched config TOML changes. Selector resolution from a raw file
  change is best-effort: emit per-file scope if exact selector can't be
  determined, and let consumers decide.
- `useConfigSlice(selector)` uses the existing `configApiClient.readSelector`
  (add a single-selector read if not present) and subscribes to
  `config:changed` via the existing SSE client (`src/services/sseClient`).
- The event payload and the SSE event type are registered as OpenAPI/contract
  types (C-9 from MDT-168 carries forward).

### Migration Strategy

1. Land the SSE producer + `useConfigSlice` behind no consumers (additive,
   zero behavior change).
2. Migrate `useSelectorData` to `useConfigSlice('ui.projectSelector.*')` for
   its backend prefs; keep localStorage override layering unchanged.
3. Migrate `useBackendConfig` to invalidate its descriptor cache on
   `config:changed` for any selector it holds.
4. **Retire the TASK-10 PoC**: remove the `SELECTOR_PREFS_SYNC_EVENT`
   dispatch from `useBackendConfig.applyOne` and the listener in
   `useSelectorData`. This is the scope-gate payoff — see §4.
5. Audit every editable selector for a live consumer and confirm each
   converges via the new path.

### Dependencies

- Existing `SSEBroadcaster` and `/api/events` route (`server/routes/sse.ts`).
- Existing `configApiClient` and `useBackendConfig` (MDT-168).
- Existing file watcher (chokidar) — extend with a config-file filter.
- No new runtime packages (preserves MDT-168 C-10).

### Risk Assessment

| Risk | Mitigation |
|---|---|
| Event storm on bulk config edits | Per-slice debounce in `useConfigSlice`; consumers collapse rapid events |
| Selector resolution from raw file change is imperfect | Emit per-file scope; consumers refetch their whole slice (cheap) |
| Migration leaves a half-PoC half-SSE state | Hard gate: PoC retires only after SSE covers `ui.projectSelector.*` (§4) |
| Coupling `ConfigApplicationService` to `SSEBroadcaster` | Inject a narrow `ConfigChangeEmitter` interface, not the full broadcaster |

## 4. Acceptance Criteria

### Behavior

- [ ] After a successful `PATCH /api/config` for any allowlisted selector, a
      `config:changed` SSE event is emitted with the selector, scope, and
      `source: 'api'`.
- [ ] After a config TOML file changes on disk (CLI/MCP/manual), a
      `config:changed` event is emitted with `source: 'file'` for the affected
      scope/selectors.
- [ ] A browser consumer using `useConfigSlice(selector)` refetches its slice
      and converges within the same session, without a page reload, for both
      `api` and `file` sources.
- [ ] Multi-tab: a config change in tab A converges in tab B without a reload.
- [ ] Browser-only preferences never appear on the channel and remain in
      localStorage (BR-6.1 preserved).

### Architecture

- [ ] `ConfigApplicationService` emits via an injected narrow
      `ConfigChangeEmitter` interface; no direct dependency on the SSE route.
- [ ] `useConfigSlice` is the single consumer-side invalidation primitive; no
      second refresh path.
- [ ] No generic event bus; the SSE event type is a closed enum.
- [ ] No new runtime packages.

### Scope gate (retire the PoC)

- [ ] The TASK-10 `SELECTOR_PREFS_SYNC_EVENT` dispatch in
      `useBackendConfig.applyOne` is removed.
- [ ] The `mdt:selector-prefs-updated` listener in `useSelectorData` is
      removed (replaced by `useConfigSlice` subscription).
- [ ] The two TASK-10 unit tests are removed or rewritten against the new
      invalidation contract; the E2E refresh test still passes.
- [ ] No `ui.projectSelector.*` staleness is observable in any E2E after
      retirement.

### Documentation and verification

- [ ] MDT-168 architecture doc updated: the `ui.projectSelector.*` row and the
      "Same-Browser Consumer Refresh" subsection are rewritten to point at the
      SSE-based contract; the PoC is recorded as retired.
- [ ] MDT-168 TASK-10 marked superseded by MDT-213 in the trace.
- [ ] OpenAPI documents the `config:changed` event payload.

## 5. Implementation Notes

*To be filled during/after implementation.*

### Out of scope (explicit)

- Unifying SSE event types across domains (tickets, documents). Each domain
  keeps its own event type.
- Moving browser-only preferences to the backend. They stay in localStorage.
- Cloud-sync config coordination (MDT-200/201/202/203). This CR is purely
  about local config-change refresh; it must not depend on or block the
  cloud-sync work.

### Known related debt (not in scope, recorded here)

- Cross-file `mock.module` pollution between `useBackendConfig.test.tsx` and
  `configApiClient.test.ts` (pre-existing on HEAD; causes failures when run
  in the same bun process). The migration to `useConfigSlice` is a natural
  time to consolidate these test mocks; do not block MDT-213 on it.

## 6. References

- MDT-168 (configuration management API + bounded UI surface) — origin of the
  config boundary and the TASK-10 PoC.
- MDT-168 TASK-10 / BR-7.1 — the narrow PoC this CR retires.
- MDT-168 `uat.md` (2026-07-26) — records the narrow-scope decision and the
  target-architecture intent this CR formalizes.
- MDT-129 (project selector rail) — primary migration consumer.
- `server/services/fileWatcher/SSEBroadcaster.ts` — existing broadcast medium.
- `server/routes/sse.ts` — existing `/api/events` SSE route.
- `docs/CRs/MDT-168/architecture.md` § "Same-Browser Consumer Refresh for
  `ui.projectSelector.*`" — wording to be updated when this CR lands.
