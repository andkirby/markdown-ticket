---
code: MDT-239
status: Implemented
dateCreated: 2026-08-29T11:12:48.688Z
implementationDate: 2026-08-29
type: Technical Debt
priority: High
---

# E2E suite reliability: out-of-process test backend, ephemeral ports, and repair of all failing specs

## 1. Description

### Problem Statement
`bun run test:e2e` could not produce a trustworthy full run:

1. Running the suite twice in a row failed wholesale (leftover processes held ports 6173/4001).
2. Any single test failure cascaded into mass `EADDRINUSE` failures (observed: 1 failure → 83 collateral failures; a full run measured 64 passed / 265 failed).
3. Every run leaked worker processes and one `mdt-test-*` temp directory per worker (3,700+ accumulated).
4. Concurrent runs (agent + human) poisoned each other over the shared fixed ports.
5. A hung run never self-terminated (no global timeout).

### Root Cause Analysis
The test backend was an Express server started **inside a Playwright worker process** (per-worker singleton in `tests/e2e/setup/e2e-context.ts`) on a **fixed port** (4001), with **no teardown** (`teardownE2EContext` had zero callers). Playwright rotates workers after failures by design, so every rotation raced the port against the retired worker's never-draining event loop (Express + chokidar + SSE), and each run left its last webServer/backend processes orphaned on 6173/4001.

Secondary: the infra noise masked 48 genuine test failures, of which 6 were real product bugs.

### Impact Assessment
E2E was unusable as a quality gate; real regressions (MDT-226 dropping relationship fields from the unified API) shipped undetected under the failure noise.

## 2. Solution

Separate lifetimes: **one backend per run, out-of-process, on an ephemeral port, owned by a wrapper that owns the temp CONFIG_DIR and teardown. Workers hold no ports.**

- `scripts/e2e/run.ts` — wrapper (`bun run test:e2e`): allocates free ports (bind `:0`), creates the run-scoped `CONFIG_DIR`, exports `TEST_BACKEND_PORT` / `TEST_FRONTEND_PORT` / `TEST_FRONTEND_URL` / `VITE_BACKEND_URL` / `PUBLIC_ORIGIN` / `MDT_ALLOWED_ORIGINS`, spawns Playwright, always tears down (port safety-net kill + temp dir removal).
- `scripts/e2e/backend.ts` — the backend as a Playwright `webServer`: `createTestApp()` + `/_e2e/*` admin seam (watcher init with server-side `document-ready` await; runtime-config override) + SSE-socket-destroying shutdown.
- `playwright.config.ts` — ordered `webServer[]` (backend, then vite proxy), `reuseExistingServer: false`, `globalTimeout: 40m`.
- `tests/e2e/setup/e2e-context.ts` — thin HTTP client; adopts the wrapper's `CONFIG_DIR` via `TestEnvironment({ configDir })` (adopt-mode in shared test-lib; adopted dirs are never deleted by workers).
- `createTestApp({ preAuthRouter })` — opt-in hook mounting the admin seam before auth.

### Product bugs fixed under the noise
1. Unified ticket API dropped `relatedTickets`/`dependsOn`/`blocks` (MDT-226 regression) — board relationship badges silently gone.
2. `normalizeTicket`/`normalizeTicketMetadata` stripped `kind: 'projected'` — cloud stubs could never render as stubs.
3. QuickSearch cross-project search stuck loading forever (unstable `crossProject` object in effect deps).
4. Test app never mounted the config router — every `PATCH /api/config` 404'd in e2e.
5. Mobile header: rail card's fixed min-width pushed its title over the hamburger button (intercepted clicks).
6. Favorite star on the rail card unclickable (covered by `.project-card__content` z-index).

### Test repairs (~20 spec files)
Selector drift (`data-context="epic"`, `pin-rail-strip-toggle`, `ticket-list-mobile`, masked logo, input-value asserts), view-mode-switcher rewritten for the 4-button MDT-206 switcher (removed tests for the deleted merged toggle/overlay), cloud-sync poller tests removed with the removed frontend poller, race hardening (`expect.poll` for instant counts, Cmd+K boot-race waits), state hygiene (config tests restore `links.enableTicketLinks`; accent spec raises `ui.projectSelector.visibleCount` and models the MDT-185 hover-reveal), strict-mode fixes, load-tolerance timeouts (global expect 10s, board-ready 20s).

## 4. Acceptance Criteria

- [x] **Gate B** — `bun run test:e2e` fully green twice back-to-back in one shell: 339 passed / 0 failed / exit 0 both runs (4.7 min each, down from ~22 min).
- [x] **Gate C** — two full runs executed concurrently: both 339 passed / 0 failed / exit 0.
- [x] **Gate D** — a deliberately failing test injected mid-suite produces **zero** `EADDRINUSE` failures in any other test (previously 1 failure → 83).
- [x] Zero leaked listeners on the run's ports and zero leaked temp dirs after every run (3,761-dir historical backlog also cleaned).
- [x] No config/behavior regressions: `docs/AGENTS.md`, `tests/AGENTS.md`, `tests/e2e/TESTING_INFRASTRUCTURE.md` updated to describe the new architecture truthfully.

## 5. Implementation Notes
Implemented 2026-08-28/29. Runtime evidence logs were kept at `research/e2e-suite-audit-2026-08-28/` (gitignored, local-only).

## 6. References
- Audit + plan + outcome: `research/e2e-suite-audit-2026-08-28/` (report.md, fix-plan.md, OUTCOME.md)
- Architecture docs: `tests/AGENTS.md`, `tests/e2e/TESTING_INFRASTRUCTURE.md`
- Related incident (same pathology on dev ports): `incidents/2026-06-06-stale-backend-port-owner.md`
