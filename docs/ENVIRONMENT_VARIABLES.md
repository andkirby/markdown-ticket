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

### VITE_BACKEND_URL
- **Description**: Backend URL for API and SSE connections
- **Default**: Empty (uses Vite proxy or `localhost:3001`)
- **Usage**:
  - `src/services/sseClient.ts:353`
- **Notes**:
  - When empty, uses frontend proxy in development
  - Docker development: `http://backend:3001`
  - Native development: `http://localhost:3001`

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

### VITE_HMR_HOST
- **Description**: Vite Hot Module Replacement host
- **Default**: `localhost`
- **Used by**: Vite configuration

### VITE_HMR_PORT
- **Description**: Vite Hot Module Replacement port
- **Default**: `5173`
- **Used by**: Vite configuration

---

## Backend Variables

### PORT
- **Description**: Backend server port
- **Default**: `3001`
- **Usage**: `server/server.ts:98`

### NODE_ENV
- **Description**: Environment mode
- **Values**: `development`, `production`, `test`
- **Effects**:
  - Development: Enables stack traces in error responses
  - Production: Optimized for performance
  - Test: Test-specific behavior
- **Usage**: `server/middleware/errorHandler.ts:52`

### TICKETS_DIR
- **Description**: Directory path for ticket files
- **Default**: `./sample-tasks`
- **Usage**: `server/routes/system.ts:60`

### CONFIG_DIR
- **Description**: Configuration directory path for project discovery, templates, and user config
- **Default**: `~/.config/markdown-ticket`
- **Usage**: `shared/utils/constants.ts:52`

### DEBUG
- **Description**: Enable console output during tests
- **Type**: Boolean (`true` to enable)
- **Usage**: `server/tests/utils/setupTests.ts:19`

### CHOKIDAR_USEPOLLING
- **Description**: Enable file watching with polling (required in Docker)
- **Values**: `true`/`false`
- **Default**: `true` in Docker environments
- **Usage**: Docker compose files

### DOCKER
- **Description**: Indicates running in Docker environment
- **Type**: Boolean
- **Usage**: `docker-compose.dev.yml`

### DOCKER_BACKEND_URL
- **Description**: Backend URL for Docker container networking
- **Default**: `http://backend:3001`
- **Usage**: `docker-compose.dev.yml`

---

## MCP Server Variables

### Core Configuration

#### MCP_HTTP_ENABLED
- **Description**: Enable HTTP transport (stdio is always enabled)
- **Default**: `false`
- **Usage**: `mcp-server/src/index.ts:128`

#### MCP_HTTP_PORT
- **Description**: HTTP server port
- **Default**: `3002`
- **Usage**: `mcp-server/src/index.ts:131`

#### MCP_BIND_ADDRESS
- **Description**: Bind address
- **Defaults**:
  - Local: `127.0.0.1`
  - Docker: `0.0.0.0`
- **Usage**: `mcp-server/src/index.ts:132`

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
- **Format**: `http://localhost:5173,https://example.com`
- **Usage**: `mcp-server/src/index.ts:136`

### Security - Rate Limiting

#### MCP_SECURITY_RATE_LIMITING
- **Description**: Enable rate limiting
- **Default**: `false`
- **Usage**: `mcp-server/src/index.ts:137`

#### MCP_RATE_LIMIT_MAX
- **Description**: Maximum requests per time window
- **Default**: `100`
- **Usage**: `mcp-server/src/utils/rateLimitManager.ts:228`

#### MCP_RATE_LIMIT_WINDOW_MS
- **Description**: Rate limiting time window in milliseconds
- **Default**: `60000` (1 minute)
- **Usage**: `mcp-server/src/utils/rateLimitManager.ts:229`

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

#### MCP_SANITIZATION_ENABLED
- **Description**: Enable output sanitization (XSS protection)
- **Default**: `false`
- **Status**: Beta feature - may affect performance
- **Usage**: `mcp-server/src/utils/sanitizer.ts:18`

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
- **Notes**: Avoids conflict with dev server (5173)

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
```

### Docker Development
```bash
# Set in docker-compose.dev.yml
VITE_BACKEND_URL=
DOCKER_BACKEND_URL=http://backend:3001
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
- `PORT=3001`
- `MCP_HTTP_ENABLED=true`
- `MCP_HTTP_PORT=3002`
- `MCP_BIND_ADDRESS=0.0.0.0`
- `LOG_LEVEL=debug`
- `MCP_CACHE_TIMEOUT=300`

### docker-compose.dev.yml (Development)
- `NODE_ENV=development`
- `DOCKER=true`
- `DOCKER_BACKEND_URL=http://backend:3001`
- `VITE_BACKEND_URL=`
- `VITE_HMR_HOST=localhost`
- `VITE_HMR_PORT=5173`

### docker-compose.prod.yml (Production)
- `NODE_ENV=production`
- `LOG_LEVEL=info`

---

## Type Definitions Status

**File**: `src/vite-env.d.ts`

**Currently Defined**:
- `VITE_FRONTEND_LOGGING_AUTOSTART`

**Missing Definitions**:
- `VITE_BACKEND_URL`
- `VITE_DISABLE_EVENTBUS_LOGS`
- `VITE_HMR_HOST`
- `VITE_HMR_PORT`

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
