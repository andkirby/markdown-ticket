# Environment Variables Reference

Complete reference of all environment variables used in the Markdown Ticket project.

## Table of Contents

1. [Frontend Variables (Vite)](#frontend-variables-vite)
2. [Backend Variables](#backend-variables)
3. [MCP Server Variables](#mcp-server-variables)
4. [Docker Variables](#docker-variables)
5. [Shared/Test Variables](#sharedtest-variables)
6. [System Variables](#system-variables)
7. [Configuration Files](#configuration-files)

---

## Frontend Variables (Vite)

### FRONTEND_PORT
- **Description**: Vite dev / preview server port
- **Defaults**: `3075` (dev server), `3070` (preview)
- **Usage**: `vite.config.ts` (resolved by the local `resolveFrontendPort` helper)
- **Notes**: Canonical name as of MDT-117. The legacy `PORT` env var is still read
  with a one-time deprecation warning; `FRONTEND_PORT` takes precedence when both
  are set. Distinct from `BACKEND_PORT`.

### VITE_BACKEND_URL
- **Description**: Backend URL for API and SSE connections
- **Default**: Empty (uses Vite proxy or `localhost:3001`)
- **Usage**:
  - `src/services/sseClient.ts:353`
- **Notes**:
  - When empty, uses frontend proxy in development
  - Docker development: `http://backend:3001` (set directly by `docker-compose.dev.yml`)
  - Native development: `http://localhost:3001`
  - Also consumed at config time by `vite.config.ts` to target the `/api` proxy
    and the `/api/cache/clear` middleware (MDT-117: replaced `DOCKER_BACKEND_URL`)

### VITE_DISABLE_EVENTBUS_LOGS
- **Description**: Disable EventBus debug logging in development mode
- **Type**: Boolean (set any value to disable)
- **Usage**:
  - `src/services/sseClient.ts`
  - `src/services/eventBus.ts`
  - `src/hooks/useSSEEvents.ts`
- **Notes**: Can be set in `.env.local` to reduce console noise

### VITE_FRONTEND_LOGGING_AUTOSTART
- **Description**: Automatically start frontend logging sessions on page load
- **Type**: Boolean string (`true`/`false`)
- **Default**: `false`
- **Documentation**: See `docs/CRs/MDT-037-create-react-sse-mcp-frontend-client-package.md`

> `VITE_HMR_HOST` / `VITE_HMR_PORT` were **removed** (MDT-117): nothing ever
> consumed them (no HMR wiring in `vite.config.ts`, no `import.meta.env` reads);
> they were dead config in `docker-compose.dev.yml` and `.env.example`.

---

## Backend Variables

Backend runtime variables are parsed by `server/config/runtimeConfig.ts`. The canonical architecture guide is [Runtime Configuration Architecture](architecture/runtime-configuration-architecture.md).

### BACKEND_PORT
- **Description**: Backend Express API server port
- **Default**: `3001`
- **Usage**: `server/server.ts:137` (parsed via `parsePortEnv` from `@mdt/shared/utils/env.js`)
- **Also read by**: `vite.config.ts` — when `VITE_BACKEND_URL` is not set, the Vite
  dev-server `/api` proxy targets `http://localhost:${BACKEND_PORT}`, so the
  frontend tracks a custom backend port automatically. Set `VITE_BACKEND_URL` to override.
- **Notes**: Canonical name as of MDT-117. The legacy `PORT` env var is still read
  with a one-time deprecation warning to avoid silently breaking stale `.env.local`
  files; `BACKEND_PORT` takes precedence when both are set.

### PORT
- **Status**: **Deprecated** — use `BACKEND_PORT` (backend) or `FRONTEND_PORT` (frontend).
- **Description**: Previously read by both the backend and the Vite dev server, which
  caused a port collision under `dev:full` (a single `PORT=` value would be applied to
  both services). Now read only as a fallback with a startup warning.

### NODE_ENV
- **Description**: Environment mode
- **Values**: `development`, `production`, `test`
- **Effects**:
  - Development: Enables stack traces in error responses
  - Production: Optimized for performance
  - Test: Test-specific behavior
- **Usage**: Parsed at startup into `RuntimeConfig.system`

### TICKETS_DIR
- **Description**: Directory path for ticket files
- **Default**: `./sample-tasks`
- **Usage**: `server/routes/system.ts:60`

### CONFIG_DIR
- **Description**: Configuration directory path for project discovery, templates, and user config
- **Default**: `~/.config/markdown-ticket`
- **Usage**: Parsed at startup into `RuntimeConfig.configDir`

### DEBUG
- **Description**: Enable console output during tests
- **Type**: Boolean (`true` to enable)
- **Usage**: `server/tests/utils/setupTests.ts:19`

### CHOKIDAR_USEPOLLING
- **Description**: Enable file watching with polling (required in Docker)
- **Values**: `true`/`false`
- **Default**: `true` in Docker environments
- **Usage**: Docker compose files

### PUBLIC_ORIGIN
- **Description**: Canonical deployment origin for browser API access and generated share/invite links
- **Format**: `https://tickets.example.com`
- **Default**: None; local development origins remain allowed
- **Usage**: Parsed at startup into `RuntimeConfig.origins.publicOrigin`
- **Notes**:
  - Must be a full `http(s)` origin.
  - Vite derives the dev-server allowed host from this value.
  - Set in `.env.local` to keep private domains out of git.

### API_READ_SESSION_SECRET
- **Description**: Explicit signing secret for read-only share and invite sessions
- **Default**: When unset, uses `API_AUTH_TOKEN` if set; local/test fallback only outside production
- **Usage**: Parsed at startup into `RuntimeConfig.readSessions.secret`

### OWNER_SESSION_MAX_AGE_DAYS
- **Description**: Browser owner-session cookie lifetime after unlock
- **Default**: `14`
- **Format**: Positive integer days
- **Usage**: Parsed at startup into `RuntimeConfig.ownerSessions.maxAgeSeconds`
- **Notes**:
  - Applies only to owner/admin browser sessions created by `POST /api/auth/session`.
  - Does not change read-token or invite-session lifetimes.

### DOCKER
- **Description**: Indicates running in Docker environment
- **Type**: Boolean
- **Usage**: `docker-compose.dev.yml`

### BACKEND_URL
- **Description**: Backend server URL used by the MCP dev tools (`server/mcp-dev-tools`)
- **Default**: `http://localhost:3001`
- **Usage**: `server/mcp-dev-tools/src/index.ts`

### API_SECURITY_AUTH
- **Description**: Enable backend API auth when `true`; leave unset or set `false` for local no-auth development
- **Usage**: `server/security/apiAuth.ts` (see also the `API_LOCAL_HOST_BYPASS` carve-out above)

### API_AUTH_TOKEN
- **Description**: Owner token used by API clients and browser unlock when auth is enabled
- **Usage**: `server/security/apiAuth.ts`

### DOCKER_BACKEND_URL (removed)
- **Status**: **Removed** (MDT-117) — duplicated `VITE_BACKEND_URL`.
- **Migration**: set `VITE_BACKEND_URL=http://backend:3001` directly
  (this is what `docker-compose.dev.yml` now does).

### MCP_PROJECT_FILTER / MCP_SCAN_PATHS (never implemented)
- **Status**: Were documented in older guides but **no code has ever read them**.
  Removed from the guides (2026-08-17) to stop them spreading. Single-project
  mode is auto-detected from `.mdt-config.toml` in the working directory;
  discovery paths come from the config registry, not env vars.

---

## MCP Server Variables

### Core Configuration

#### MCP_HTTP_ENABLED
- **Description**: Enable HTTP transport (stdio is always enabled)
- **Default**: `false`
- **Usage**: `mcp-server/src/index.ts:128`

#### MCP_HTTP_PORT
- **Description**: HTTP server port
- **Default**: `3002` (`DEFAULT_PORTS.MCP` in `shared/utils/constants.ts`)
- **Usage**: `mcp-server/src/transports/httpSecurity.ts` (parsed via `parsePortEnvFrom`)
- **Notes**: The legacy undocumented `HTTP_PORT` name still resolves but emits a
  one-time deprecation warning (MDT-117); it is not a silent alias.

#### MCP_BIND_ADDRESS
- **Description**: Bind address
- **Defaults**:
  - Local: `127.0.0.1`
  - Docker: `0.0.0.0`
- **Usage**: `mcp-server/src/index.ts:132`

#### API_BIND_ADDRESS
- **Description**: Backend Express server bind interface. Mirrors `MCP_BIND_ADDRESS`. Loopback keeps `:3001` unreachable from the LAN/internet so the local no-auth carve-out is safe; Docker sets `0.0.0.0` so the frontend/nginx container can reach the backend.
- **Defaults**:
  - Native: `127.0.0.1`
  - Docker: `0.0.0.0`
- **Usage**: `server/server.ts` (MDT-157 UAT 2026-08-06)

#### API_LOCAL_HOSTS
- **Description**: CSV of request `Host` header hostnames treated as loopback for the local no-auth carve-out. Parsed hostname is exact-matched (rejects lookalikes like `localhost.evil`); bracketed IPv6 (`[::1]:3001`) and ports are normalized.
- **Default**: `localhost,127.0.0.1,::1`
- **Usage**: `server/security/apiAuth.ts` (MDT-157 UAT 2026-08-06)

#### API_LOCAL_HOST_BYPASS
- **Description**: Master switch for the loopback-host no-auth carve-out. When on, a loopback `Host` gets owner access without a token (read-only sessions still take precedence — never escalated). When off, every host must authenticate.
- **Defaults**:
  - Native local dev (`NODE_ENV` unset / `development` / `local`): `true`
  - Production / test / Docker: `false`
- **Usage**: `server/security/apiAuth.ts` (MDT-157 UAT 2026-08-06)

#### MCP_LOG_LEVEL
- **Description**: Logging level
- **Values**: `debug`, `info`, `warn`, `error`
- **Default**: `info`
- **Usage**: `mcp-server/src/config/index.ts:42`

#### MCP_CACHE_TIMEOUT
- **Description**: Project discovery cache timeout in seconds
- **Default**: `300` (5 minutes)
- **Usage**: `mcp-server/src/config/index.ts:62`

### Phase 2: Advanced Features (Optional)

#### MCP_SESSION_TIMEOUT_MS
- **Description**: Session timeout in milliseconds
- **Default**: `1800000` (30 minutes)
- **Usage**: `mcp-server/src/index.ts:142`

### Security - Origin Validation

#### MCP_SECURITY_ORIGIN_VALIDATION
- **Description**: Enable DNS rebinding protection via origin validation
- **Default**: `false`
- **Usage**: `mcp-server/src/index.ts:135`

#### MCP_ALLOWED_ORIGINS
- **Description**: Comma-separated list of allowed origins
- **Format**: `http://localhost:3075,https://example.com`
- **Usage**: `mcp-server/src/index.ts:136`

### Security - Rate Limiting

#### MCP_SECURITY_RATE_LIMITING
- **Description**: Enable rate limiting
- **Default**: `false`
- **Usage**: `mcp-server/src/index.ts:137`

#### MCP_RATE_LIMIT_MAX
- **Description**: Maximum requests per time window
- **Default**: `100`
- **Usage**: `mcp-server/src/utils/rateLimitManager.ts` and
  `mcp-server/src/transports/httpSecurity.ts` (parsed via `parseEnvInt`)

#### MCP_RATE_LIMIT_WINDOW_MS
- **Description**: Rate limiting time window in milliseconds
- **Default**: `60000` (1 minute)
- **Usage**: `mcp-server/src/utils/rateLimitManager.ts` and
  `mcp-server/src/transports/httpSecurity.ts` (parsed via `parseEnvInt`)

### Security - Authentication

#### MCP_SECURITY_AUTH
- **Description**: Enable authentication
- **Default**: `false`
- **Usage**: `mcp-server/src/index.ts:140`

#### MCP_AUTH_TOKEN
- **Description**: Bearer token for authentication
- **Required**: If `MCP_SECURITY_AUTH=true`
- **Usage**: `mcp-server/src/index.ts:141`

### Sanitization (Beta)

#### MCP_SECURITY_SANITIZATION
- **Description**: Enable output sanitization (XSS protection)
- **Default**: `false`
- **Status**: Beta feature - may affect performance
- **Usage**: `mcp-server/src/utils/sanitizer.ts`
- **Notes**: Renamed from `MCP_SANITIZATION_ENABLED` (MDT-117) to match the
  `MCP_SECURITY_*` prefix family. The old name still works but warns (deprecated).

---

## Docker Variables

### Container Configuration

#### HOME
- **Description**: User home directory (used in volume mounts)
- **Usage**: `docker-compose.prod.yml` for mounting global config

### Build Arguments (None currently used)
- The Dockerfiles use `ENV` directives but no `ARG` for build-time configuration

---

## Shared/Test Variables

### Test Ports

#### TEST_FRONTEND_PORT
- **Description**: Frontend test server port
- **Default**: `6173`
- **Usage**: `shared/test-lib/config/ports.ts`
- **Notes**: Avoids conflict with dev server (3075)

#### TEST_BACKEND_PORT
- **Description**: Backend test server port
- **Default**: `4001`
- **Usage**: `shared/test-lib/config/ports.ts`
- **Notes**: Avoids conflict with dev server (3001)

#### TEST_MCP_PORT
- **Description**: MCP test server port
- **Default**: `4002`
- **Usage**: `shared/test-lib/config/ports.ts`
- **Notes**: Avoids conflict with dev server (3002)

### Test Configuration

#### SHOW_TEST_LOGS
- **Description**: Show test logs in output
- **Usage**: `tests/e2e/_old/setup.ts:11`

---

## System Variables

### HOME
- **Description**: User home directory (Unix-like systems)
- **Usage**: Path resolution for config directories
- **Files**:
  - `shared/tools/project-cli.ts`
  - `server/tests/mocks/shared/services/ProjectService.ts`

### USERPROFILE
- **Description**: User home directory (Windows)
- **Usage**: Fallback for `HOME` on Windows
- **Files**: `shared/tools/__tests__/project-management/helpers/test-utils.ts`

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Main environment variable template (root) |
| `.env.local` | Local overrides (not in git) |
| `mcp-server/.env.example` | MCP server-specific variables |
| `docker-compose.yml` | Base Docker Compose configuration |
| `docker-compose.dev.yml` | Development overrides with hot reload |
| `docker-compose.prod.yml` | Production overrides with resource limits |
| `docker-compose.demo.yml` | Demo project mounts |
| `docker-compose.mcp-stdio-only.yml` | STDIO-only transport configuration |
| `docker-compose.override.sample.yml` | Custom project volume template |

---

## Environment-Specific Configurations

### Native Development

```bash
# .env.local
VITE_BACKEND_URL=http://localhost:3001
VITE_FRONTEND_LOGGING_AUTOSTART=false
NODE_ENV=development

# Optional: Configure deployment origin (keeps private domains out of git)
# PUBLIC_ORIGIN=https://my-private-domain.com
```

### Docker Development

```bash
# Set in docker-compose.dev.yml
VITE_BACKEND_URL=http://backend:3001
NODE_ENV=development
DOCKER=true
CHOKIDAR_USEPOLLING=true
```

### Docker Production

```bash
# Set in docker-compose.prod.yml
NODE_ENV=production
```

### MCP Server - Local (stdio only)

```bash
MCP_HTTP_ENABLED=false
MCP_LOG_LEVEL=info
```

### MCP Server - Local (HTTP)

```bash
MCP_HTTP_ENABLED=true
MCP_HTTP_PORT=3002
MCP_BIND_ADDRESS=127.0.0.1
MCP_LOG_LEVEL=info
```

### MCP Server - Docker Production

```bash
MCP_HTTP_ENABLED=true
MCP_HTTP_PORT=3002
MCP_BIND_ADDRESS=0.0.0.0
MCP_LOG_LEVEL=warn
MCP_SECURITY_RATE_LIMITING=true
MCP_SECURITY_AUTH=true
MCP_AUTH_TOKEN=<secure-token>
```

---

## Docker Compose Environment Variable Summary

### docker-compose.yml (Base)
- `NODE_ENV=development`
- `CHOKIDAR_USEPOLLING=true`
- `BACKEND_PORT=3001`
- `MCP_HTTP_ENABLED=true`
- `MCP_HTTP_PORT=3002`
- `MCP_BIND_ADDRESS=0.0.0.0`
- `MCP_LOG_LEVEL=debug` (renamed from dead `LOG_LEVEL`, MDT-117)
- `MCP_CACHE_TIMEOUT=300`

### docker-compose.dev.yml (Development)
- `NODE_ENV=development`
- `DOCKER=true`
- `VITE_BACKEND_URL=http://backend:3001` (set directly; `DOCKER_BACKEND_URL` removed, MDT-117)

### docker-compose.prod.yml (Production)
- `NODE_ENV=production`
- `MCP_LOG_LEVEL=info` (renamed from dead `LOG_LEVEL`, MDT-117)

---

## Type Definitions Status

**File**: `src/vite-env.d.ts`

**Defined** (complete as of MDT-117):
- `VITE_FRONTEND_LOGGING_AUTOSTART`
- `VITE_BACKEND_URL`
- `VITE_BACKEND_PORT` (injected at build time by `vite.config.ts` `define`)
- `VITE_DISABLE_EVENTBUS_LOGS`

**Removed**: `VITE_HMR_HOST`, `VITE_HMR_PORT` (dead vars — never consumed).

---

## Related Documentation

- `docs/DOCKER_GUIDE.md` - Docker deployment guide
- `docs/CRs/MDT-055*.md` - Docker architecture documentation
- `docs/CRs/MDT-074*.md` - MCP HTTP transport implementation
- `docs/CONFIG_SPECIFICATION.md` - Project configuration
- `docs/CONFIG_GLOBAL_SPECIFICATION.md` - Global registry configuration
- `mcp-server/SANITIZATION.md` - Output sanitization feature

---

*Generated: 2026-01-14*
*Source: Comprehensive scan of src/, server/, mcp-server/, shared/, and Docker configuration files*
