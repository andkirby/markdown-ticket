# Frontend Routes Architecture

Status: authoritative (source of truth for frontend route-level structure).
Established by the 2026-08-28 controlled refactor of `frontend/src/App.tsx`; see History.

## Scope

How the app shell routes URLs to handlers, how the project route composes
state, and where new frontend code belongs. UI mechanics of modals live in
`frontend/src/MODALS.md`; surface design contracts in `docs/design/surfaces/`; realtime
data flow in `docs/architecture/event-system/`.

## The map

```text
frontend/src/
  App.tsx                              # 64 lines: providers + <Routes> table ONLY
  main.tsx                             # sole consumer of the default export
  components/routes/
    ProjectRouteHandler.tsx            # composition shell: data hooks + route hooks + JSX
    ProjectOverlays.tsx                # overlay cluster, props-only, owns nothing
    ShareRouteHandler.tsx              # /share/:shareId — self-contained
    InviteRouteHandler.tsx             # /invite/:code — uses inviteExchange
    inviteExchange.ts                  # one HTTP exchange + in-flight dedupe cache
    viewModeDerivation.ts              # pure: URL → view mapping, close-path mapping
    hooks/
      useAuthGate.ts                   # unlock/lock flows, owner-unlock modal, refresh-once
      useProjectRouteValidation.ts     # route code validation + route error state
      useViewModeRouting.ts            # default-view redirect + layout persistence
      useTicketModalRoute.ts           # ticket-from-URL state + open/close navigation
```

Each non-test module has a colocated `*.test.ts(x)` (bun:test; renderHook +
MemoryRouter pattern). `DirectTicketAccess.tsx` and `RedirectToCurrentProject.tsx`
(pre-existing) follow the same standalone-handler pattern.

## Where new code goes (decision rules)

| You are adding… | It belongs in… | Notes |
|---|---|---|
| A new route | `App.tsx` table + a handler file in `routes/` | route patterns come from `frontend/src/routes.ts` constants (MDT-184) — never inline strings |
| A new project-page concern | a NEW hook in `routes/hooks/` + colocated test | call it in `ProjectRouteHandler` at the position dictated by effect order (below); do not accrete `useState` in the shell for a concern that has a home |
| A persisted view/layout preference | `useViewModeRouting` — the ONLY writer of `lastViewMode`, `lastBoardListMode`, `mdt-board-mode`, Default View | single-writer rule; extend its tests |
| Unlock / lock / owner-token behavior | `useAuthGate` | shell passes capabilities in; `onBeforeLock` preserves close-then-lock order |
| Ticket URL / modal navigation | `useTicketModalRoute` | |
| Project code validation / selection | `useProjectRouteValidation` | |
| A pure URL↔view derivation | `viewModeDerivation.ts` (pure, tested) | keep it free of router imports |
| A new overlay/modal | `ProjectOverlays.tsx`, props-only | visibility state stays in the shell (see Known Follow-ups); UI follows `frontend/src/MODALS.md`; register `data-testid` in `tests/e2e/utils/selectors.ts` |
| An invite/share session exchange | `inviteExchange.ts` pattern | in-flight promise cache, delete-on-failure |

Boundary alarm: a hook whose return object exceeds ~15 fields, or a shell that
grows past ~500 lines, means the boundary is wrong — re-plan instead of
widening (the metric gate below makes this visible).

## Hook contracts (state ownership is the boundary)

Effect order is load-bearing and pinned (React runs effects in call order):

```text
useAuthGate → useProjectRouteValidation → useViewModeRouting → useTicketModalRoute
   (1–2)            (3)                        (4)                 (5)
```

When moving code between hooks, effect bodies and dependency arrays move
verbatim and each hook is called exactly where its effect(s) sat.

- `useAuthGate` — receives capabilities (`unlock`, `lock`, `markLocked`,
  `markOwnerAdmin`, `refreshProjects`, `onBeforeLock`); owns unlock error,
  owner-unlock modal state, `authRefreshInFlight`, the refresh-once guard.
- `useProjectRouteValidation` — owns the route `error` and the errorRef
  pattern; escalates read-only-no-projects to `markLocked()`.
- `useViewModeRouting` — owns `boardLayoutMode`, the bare-path default-view
  redirect, and all view persistence writes. The pure derivation
  (`viewMode`, `onEpicsRoute`, `effectiveBoardLayoutMode`) stays at its
  render-time position in the shell — moving it would break effect order.
- `useTicketModalRoute` — owns `selectedTicket`, `ticketError`, their refs,
  and open/close navigation (carries `?view=` so close returns to origin).

## Invariants (do not break)

1. `App.tsx` default-exports `App`; `main.tsx` is its only consumer.
2. Route table: paths from `frontend/src/routes.ts` constants, stable order.
3. `data-testid` anchors are E2E contracts — preserve them verbatim on moves.
4. localStorage single-writer rules (see decision table).
5. `exchangeInviteCode` cache: reuse in-flight promise, evict on failure.
6. Effect order 1–5 (above).
7. No render-tree change from refactors: same components, same hierarchy.

## Dependency rules

Hooks import config/utils/pure modules — never the shell, never each other.
The dependency graph is a strict tree (hooks ← shell). Currently convention +
review; a `no-restricted-imports` ESLint rule is the intended enforcement.

## Metric gate

Project `ts-metrics` thresholds (`.ts-metrics.rc`): red at MI ≤ 13, CC ≥ 50,
CoC ≥ 50. No file under `frontend/src/` may enter the red zone; new files should land
green or yellow. Run `ts-metrics --red frontend/src` before committing structural
change; compare at the real granularity across every changed file (extraction
relocates complexity, it does not delete it).

## History (why this shape)

Before 2026-08-28, `frontend/src/App.tsx` was a 1037-line monolith — MI 1.16 / CC 88 /
CoC 209 (worst-tier complexity × highest churn: 70 commits, most in `frontend/src/`),
mixing routing, auth gating, view persistence, ticket modal state, pins, and
seven overlays. The controlled refactor (8 staged slices, verbatim moves,
effect-order pin, characterization tests) produced:

| file | MI | CC | CoC |
|---|---|---|---|
| App.tsx | 46.6 | 1 | 0 |
| ProjectRouteHandler.tsx | 20.0 | 20 | 36 |
| ProjectOverlays.tsx | 32.0 | 5 | 14 |
| hooks (all four) | 36.6–41.5 | 6–13 | 14–26 |

Unit tests grew 956 → 1020; the E2E subset held exact parity at every stage.
Full evidence lives in `.refactoring/runs/20260828T163524Z-app-tsx/`
(gitignored run artifacts; this section is the distilled durable record).

## Known follow-ups (recorded, not drift)

- Pin wiring (`resolvePinMetadata`, `handlePinOpen`) still lives in the shell —
  candidate `usePinRailWiring` extraction.
- `ProjectOverlays` props interface is ~30 fields; the principled fix is
  lifecycle split + pushing modal-visibility ownership down into each dialog
  (settings open state must stay in the shell — its trigger is in the header).
- `useAuthGate.handleUnlockClick` queries the DOM directly
  (`document.querySelector`) — inject or move to the component layer.
- `ShareRouteHandler` sits in the yellow zone (CoC 36), accepted.
