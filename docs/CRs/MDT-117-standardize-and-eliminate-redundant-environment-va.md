---
code: MDT-117
status: In Progress
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
- [ ] All environment variables follow consistent `SERVICE_*` or `VITE_*` prefix pattern
- [ ] No duplicate variables exist for same configuration purpose
- [ ] All numeric environment variables parsed through centralized utility _(ports migrated to `parsePortEnv`/`parseEnvInt` in `shared/utils/env.ts`; non-port numeric vars pending)_
- [x] Port defaults sourced from single constant definition _(`DEFAULT_PORTS` in `shared/utils/constants.ts`)_
- [x] `.env` is loaded by every runtime that reads ports — backend cascades `.env.local` then `.env`; Vite mirrors `loadEnv` into `process.env` _(addendum; smoke-tested 8101/8102)_
- [ ] All Vite environment variables have TypeScript definitions

### Non-Functional
- [ ] Code duplication reduced for environment variable parsing
- [ ] Environment variable names are self-documenting and consistent
- [ ] Developer experience improved - single source of truth for defaults

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

## 6. Implementation Progress (port subset + `.env` loading)

**Status**: the port-naming + centralization + `.env`-loading subset is implemented and verified. The broader env-var standardization (logging, cache units, Docker URL, MCP sanitization) remains open.

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

### Remaining (out of this subset)
- `LOG_LEVEL` vs `MCP_LOG_LEVEL` precedence.
- `MCP_CACHE_TIMEOUT` (seconds) vs `cacheTimeout` (ms) unit mismatch.
- `DOCKER_BACKEND_URL` / `VITE_BACKEND_URL` duplication.
- `MCP_SANITIZATION_ENABLED` → `MCP_SECURITY_*` prefix.
- MCP server port wiring to `DEFAULT_PORTS.MCP`; TypeScript definitions for all Vite env vars.
