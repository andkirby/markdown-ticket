---
code: MDT-117
status: Implemented
dateCreated: 2026-01-14T18:02:09.155Z
type: Technical Debt
priority: Medium
---

# Standardize and eliminate redundant environment variables

## 1. Description

### Requirements Scope
`none` — Skip requirements, use `/mdt:architecture`

### Problem
- Two different variables (`LOG_LEVEL` and `MCP_LOG_LEVEL`) control logging level across different files, causing confusion about which takes precedence
- Cache timeout defined with inconsistent units in `MCP_CACHE_TIMEOUT` (300 seconds) vs `docker-config/config.toml` cacheTimeout (30000 milliseconds)
- Generic `PORT` variable lacks service-specific prefix, inconsistent with `MCP_HTTP_PORT` and `TEST_*_PORT` patterns
- `DOCKER_BACKEND_URL` duplicates purpose of `VITE_BACKEND_URL`, adding confusion about Docker networking
- `MCP_SANITIZATION_ENABLED` lacks consistent `MCP_SECURITY_*` prefix used by other security features
- `parseInt()` calls for environment variable parsing duplicated across 5+ files
- Port defaults scattered across multiple files: `server/server.ts`, `mcp-server/src/index.ts`, `shared/test-lib/config/ports.ts`, `vite.config.ts`
- **`.env` not loaded at runtime**: the backend (`server/server.ts`) loaded only `.env.local`, so values in `.env` (`BACKEND_PORT`, `FRONTEND_PORT`, `CONFIG_DIR`) were silently ignored. The Vite config called `loadEnv` but never mirrored the result into `process.env`, so its port resolvers ignored `FRONTEND_PORT` too. The system MUST read `.env`.

### Affected Areas
- Frontend: Environment variable loading and TypeScript definitions
- Backend: Server configuration and port handling
- MCP Server: All environment variable parsing and validation
- Docker: All compose files with environment variable arrays
- Shared: Constants and utility functions

### Scope
- **In scope**: Standardize naming conventions, eliminate duplicate variables, centralize parsing logic, consolidate defaults
- **Out of scope**: Adding new features or changing functionality

## 2. Desired Outcome

### Success Conditions
- All environment variables follow consistent naming convention (service prefix, category suffix)
- No duplicate variables serving same purpose across codebase
- All numeric environment variables use centralized parsing utility with proper validation
- Port defaults defined in single location
- TypeScript definitions complete for all Vite environment variables

### Constraints
- Must maintain backward compatibility where possible (use fallback to old variable names)
- Must not break existing Docker deployments
- Must preserve all current functionality
- Changes must be minimal and focused on standardization

### Non-Goals
- Not adding new environment variables
- Not changing the purpose or behavior of existing features
- Not introducing new dependencies or libraries

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Breaking changes | Should we support fallback from old to new variable names? | Must not break existing deployments |
| Type safety | Should we add Zod or similar for runtime validation? | Preference for minimal dependencies |
| Port defaults | Should ports be configurable via single env var pattern? | Must maintain existing defaults |

### Known Constraints
- Must preserve existing functionality - this is refactoring only
- Must work with existing Docker setup
- TypeScript project with Node.js runtime
- Vite for frontend build
- Multiple compose files (dev, prod, demo, mcp-stdio-only)

### Decisions Deferred
- Specific implementation approach (determined by `/mdt:architecture`)
- Whether to add runtime validation library
- Migration strategy for existing deployments
- Task breakdown (determined by `/mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [x] All environment variables follow consistent `SERVICE_*` or `VITE_*` prefix pattern _(2026-08-17: `LOG_LEVEL`→`MCP_LOG_LEVEL` in all three compose files + `mcp-server/Dockerfile`; `MCP_SANITIZATION_ENABLED`→`MCP_SECURITY_SANITIZATION`; dead `VITE_HMR_*` and duplicate `DOCKER_BACKEND_URL` removed. `MCP_CACHE_TIMEOUT`→`MDT_CACHE_TIMEOUT` deliberately deferred to MDT-105)_
- [x] No duplicate variables exist for same configuration purpose _(2026-08-17: `DOCKER_BACKEND_URL` gone — dev compose sets `VITE_BACKEND_URL=http://backend:3001` directly; nothing reads `LOG_LEVEL` anymore)_
- [x] All numeric environment variables parsed through centralized utility _(2026-08-17: `MCP_RATE_LIMIT_MAX`/`MCP_RATE_LIMIT_WINDOW_MS` (`rateLimitManager.ts`, `httpSecurity.ts`) and `MCP_CACHE_TIMEOUT` (`config/index.ts`) now use `parseEnvInt`/`parseEnvIntFrom`; MCP HTTP port uses `parsePortEnvFrom` + `DEFAULT_PORTS.MCP`)_
- [x] Port defaults sourced from single constant definition _(`DEFAULT_PORTS` in `shared/utils/constants.ts`)_
- [x] `.env` is loaded by every runtime that reads ports — backend cascades `.env.local` then `.env`; Vite mirrors `loadEnv` into `process.env` _(addendum; smoke-tested 8101/8102)_
- [x] All Vite environment variables have TypeScript definitions _(2026-08-17: `VITE_BACKEND_URL`, `VITE_BACKEND_PORT`, `VITE_DISABLE_EVENTBUS_LOGS` added to `src/vite-env.d.ts`; `VITE_HMR_*` confirmed dead and removed instead of typed)_

### Non-Functional
- [x] Code duplication reduced for environment variable parsing _(raw `Number.parseInt(env…)` call sites eliminated in `httpSecurity.ts`, `rateLimitManager.ts`, `config/index.ts`)_
- [x] Environment variable names are self-documenting and consistent
- [x] Developer experience improved - single source of truth for defaults _(ports via `DEFAULT_PORTS`)_

### Edge Cases
- [x] Missing environment variable falls back to documented default _(`parsePortEnv`/`parseEnvInt`)_
- [x] Invalid numeric values are handled gracefully _(NaN → default)_
- [x] Empty string vs unset variable handled consistently _(both treated as unset)_

## 5. Verification

### How to Verify Success
- **Code review**: All environment variable references follow naming convention
- **Test verification**: All existing tests pass with new variable names (with fallbacks)
- **Documentation review**: `.env.example` files reflect standardized names
- **Type checking**: No TypeScript errors for environment variable access

### Migration Verification
- [x] Docker compose files use standardized port variable _(all three use `BACKEND_PORT`)_
- [x] Existing `.env.local` files continue to work _(cascade loads `.env.local` first so it wins over `.env`; real `process.env` always wins)_
- [x] Documentation reflects all changes _(`.env.example` + `docs/ENVIRONMENT_VARIABLES.md`)_

## 6. Implementation Progress (full standardization)

**Status**: **complete** (2026-08-17). The port subset + `.env` loading landed first; all five remaining items from the 2026-08-17 re-verification are now implemented and verified below. The only open thread is the `MCP_CACHE_TIMEOUT` → `MDT_CACHE_TIMEOUT` rename, deliberately owned by MDT-105 (item 6).

### Done
- `PORT` → `BACKEND_PORT` (backend, all three compose files, test setup) with a one-time deprecation warning via `parsePortEnv('BACKEND_PORT','PORT',…)` — not a silent alias.
- `FRONTEND_PORT` (Vite dev/preview) resolved via `resolveFrontendPort`, with legacy `PORT` deprecation shim.
- Port defaults centralized in `DEFAULT_PORTS` (`shared/utils/constants.ts`); mirrored inline as `VITE_DEFAULT_PORTS` in `vite.config.ts` to avoid a build-time dependency on the `@mdt/shared` artifact.
- Centralized parsing: `parseEnvInt` + `parsePortEnv` in `shared/utils/env.ts`.
- **`.env` loading (addendum)**: backend loads `.env.local` then `.env` (dotenv default `override:false`, so precedence is `process.env` > `.env.local` > `.env`); Vite mirrors the `loadEnv` result into `process.env` without overriding real env so port resolvers honor `.env`.
- Docs: `.env.example` and `docs/ENVIRONMENT_VARIABLES.md` updated (`PORT` → `BACKEND_PORT`/`FRONTEND_PORT` with deprecation notes).

### Verification (smoke tests, 2026-08-12)
- Backend: with `.env` `BACKEND_PORT=8102`, `bunx tsx server/server.ts` logged `running at http://127.0.0.1:8102`; `lsof` confirmed PID listening on `8102`.
- Frontend: with `.env` `FRONTEND_PORT=8101`, `vite` logged `Local: http://127.0.0.1:8101/`; `lsof` confirmed PID listening on `8101`.
- Both bound loopback (`127.0.0.1`), confirming MDT-157's bind posture is preserved.

### MDT-157 interaction (conflict note)
`feat(MDT-157): loopback-host no-auth carve-out + bind boundary` landed on `origin/main` while this work was stashed and edited the same hunks (`server.ts` PORT/HOST region, `vite.config.ts` host/port region, compose `environment:` blocks). Resolved by keeping **both**: the MDT-117 port rename **and** MDT-157's `API_BIND_ADDRESS`/`API_LOCAL_HOST_BYPASS`/`VITE_SERVER_HOST` additions. The two are orthogonal.

### Remaining items — implemented 2026-08-17

Re-verified against the current tree (post MDT-157, post SSE-proxy fix `0093eea0`), then implemented. One drift correction applied during implementation: in the current dev compose, `LOG_LEVEL=debug` at line 80 sits in the **mcp** service block (the old backend-block occurrence was already gone), so it was renamed — not removed — like the other mcp blocks. The `mcp-server/Dockerfile` also carried two more dead `ENV LOG_LEVEL=` lines (dev and production stages) that the re-verification had missed; both renamed.

1. **`LOG_LEVEL` → `MCP_LOG_LEVEL`** — done in `docker-compose.yml` (mcp), `docker-compose.prod.yml` (mcp), `docker-compose.dev.yml` (mcp), and `mcp-server/Dockerfile` (both `ENV` stages). No `LOG_LEVEL` readers or setters remain.
2. **Vite env TypeScript definitions** — done. `src/vite-env.d.ts` now types `VITE_BACKEND_URL`, `VITE_BACKEND_PORT`, `VITE_DISABLE_EVENTBUS_LOGS` (optional vars as `string | undefined` so runtime guards stay type-honest) alongside `VITE_FRONTEND_LOGGING_AUTOSTART`. The dead `VITE_HMR_HOST`/`VITE_HMR_PORT` vars were removed from `docker-compose.dev.yml` and `.env.example` rather than typed (`VITE_SERVER_HOST` stays config-time only, no `ImportMetaEnv` entry).
3. **`DOCKER_BACKEND_URL` / `VITE_BACKEND_URL` duplication** — done. `docker-compose.dev.yml` now sets `VITE_BACKEND_URL=http://backend:3001` directly; `vite.config.ts` reads `process.env.VITE_BACKEND_URL` in both spots (proxy target + `/api/cache/clear` middleware), relying on the existing loadEnv mirror for file-only values (real env still wins). `DOCKER_BACKEND_URL` is gone from code, compose, `.env.example`, and docs. Smoke-tested: `docker compose -f docker-compose.yml -f docker-compose.dev.yml config` resolves the frontend env to exactly `NODE_ENV=development` + `VITE_BACKEND_URL=http://backend:3001`; loading `vite.config.ts` with that env yields proxy `/api → http://backend:3001`, with no env yields `http://localhost:3001`, and with `BACKEND_PORT=8102` yields `http://localhost:8102` + injected `VITE_BACKEND_PORT=8102`. Full container smoke deferred: the Docker daemon is not running on this host (client-side `compose config` merge verified instead).
4. **`MCP_SANITIZATION_ENABLED` → `MCP_SECURITY_SANITIZATION`** — done in `sanitizer.ts` (canonical read), with the old name kept as a **loud** fallback: one-time deprecation warning, then honored (mirrors the `parsePortEnv` precedent; avoids silently disabling a security feature for stale environments). Updated `output-sanitization.spec.ts` (including a new legacy-fallback e2e case), the three handler test setups, `SANITIZATION.md`, both `.env.example` files, and `docs/ENVIRONMENT_VARIABLES.md`. Runtime smoke against built `dist`: canonical `=true` sanitizes with no warning; legacy `=true` sanitizes **and** logs the deprecation warning; unset passes content through untouched.
5. **MCP port wiring + numeric parsing** — done. `httpSecurity.ts` now uses `parsePortEnvFrom(env, 'MCP_HTTP_PORT', 'HTTP_PORT', DEFAULT_PORTS.MCP)` — the hardcoded `'3002'` is gone, and the previously undocumented `HTTP_PORT` fallback is kept but **documented and deprecation-warning** (dropping it outright would break untracked deployments; the ticket constraint prefers loud compat). `MCP_RATE_LIMIT_MAX`/`MCP_RATE_LIMIT_WINDOW_MS` parse via `parseEnvIntFrom` in `httpSecurity.ts` and `parseEnvInt` in `rateLimitManager.ts`; `MCP_CACHE_TIMEOUT` via `parseEnvInt` in `config/index.ts` (name unchanged — MDT-105 owns the rename). Shared `env.ts` gained the source-parameterized `parseEnvIntFrom`/`parsePortEnvFrom` cores (wrappers delegate; `server/server.ts` untouched). Bind smokes: `MCP_HTTP_PORT=3017` → HTTP 200 on `127.0.0.1:3017`; legacy `HTTP_PORT=3018` → HTTP 200 on `:3018` + deprecation warning in server stderr.
6. **Cache timeout unit mismatch — deferred to MDT-105** (still `Proposed`): MDT-105 owns the `MCP_CACHE_TIMEOUT` → `MDT_CACHE_TIMEOUT` hard break with full architecture docs; implementing this ticket's version first would mean double migration. Note its blast radius grew: base and prod compose both now set `MCP_CACHE_TIMEOUT=300`.
### Verification (2026-08-17, remaining-items implementation)

- **Unit/integration**: mcp-server jest `159/159` green, including 15 `http-security-config` tests (new: `DEFAULT_PORTS.MCP` default, invalid-value fallback, legacy `HTTP_PORT` deprecation, primary-over-legacy, rate-limit defaults) and 12 new `shared/utils/__tests__/env.test.ts` tests. `bun run validate:ts` clean (11 files, 3 projects); eslint clean on all changed files.
- **Runtime smokes**: sanitizer rename tri-state (canonical / legacy+warning / disabled) against built `dist`; MCP HTTP bind on `MCP_HTTP_PORT=3017` and legacy `HTTP_PORT=3018` (both HTTP 200, loopback, legacy warns); Vite proxy target resolution for compose env, default, and custom `BACKEND_PORT`.
- **Compose**: `docker compose … config` merges cleanly for dev and prod; dev frontend env is exactly `NODE_ENV` + `VITE_BACKEND_URL=http://backend:3001`; `MCP_LOG_LEVEL` present in base/dev/prod merges; zero occurrences of `DOCKER_BACKEND_URL`/`VITE_HMR_*`/bare `LOG_LEVEL`. Doc-enforcement tests (`docs/tests/mcp-docker-docs.test.ts`) pass.
- **Known pre-existing (not this ticket)**: mcp-server **e2e** specs fail identically on pristine `main` with a rebuilt `dist` (`create-cr` 14/20, `output-sanitization` 15/19 baseline vs 16/20 after adding the new legacy-fallback case — the +1 failure is the same infra failure, not a regression); the spawned server starts fully and the failure is client-side. `shared` jest has 2 pre-existing failing suites (`cloud-sync/no-fallback`, `test-lib/integration`) reproduced with this ticket's changes stashed. `bun test ./src` failures likewise pre-date this change (the only `src/` delta is the type-only `vite-env.d.ts`).
- **Jest wiring note**: `shared/dist` is ESM-only, so `mcp-server/jest.config.mjs` now maps `@mdt/shared/utils/env(.js)` and `…/constants(.js)` to TS source, extending the existing `keyNormalizer` mapping precedent.
