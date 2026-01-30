# Environment Variables - Optimization Recommendations

Focus: **Standardization** and **Redundancy Elimination**

---

## 1. Redundant Variables

### 1.1 Log Level Duplication

**Problem**: Two different variables control logging level:

| Variable        | Usage                | Default        |
|-----------------|----------------------|----------------|
| `LOG_LEVEL`     | docker-compose files | `debug`/`info` |
| `MCP_LOG_LEVEL` | MCP server config    | `info`         |

**Location**:

- `docker-compose.yml:70` - `LOG_LEVEL=debug`
- `docker-compose.prod.yml:72` - `LOG_LEVEL=info`
- `mcp-server/src/config/index.ts:42` - reads `MCP_LOG_LEVEL`

**Impact**: Confusion about which variable takes precedence. The compose files set `LOG_LEVEL` but the MCP server
reads `MCP_LOG_LEVEL`.

**Recommendation**: Standardize on `MCP_LOG_LEVEL` across all contexts.

```yaml
# Before (docker-compose.yml)
- LOG_LEVEL=debug

# After
- MCP_LOG_LEVEL=debug
```

### 1.2 Cache Timeout Duplication

**Problem**: Cache timeout defined in two different formats:

| Variable            | Value   | Unit         | Location                  |
|---------------------|---------|--------------|---------------------------|
| `MCP_CACHE_TIMEOUT` | `300`   | seconds      | mcp-server                |
| `cacheTimeout`      | `30000` | milliseconds | docker-config/config.toml |

**Location**:

- `mcp-server/.env.example:14` - `MCP_CACHE_TIMEOUT=300`
- `docker-config/config.toml:20` - `cacheTimeout = 30000`

**Impact**: Inconsistent values (300s = 5 min vs 30000ms = 30 sec).

**Recommendation**: Standardize to seconds, use `MCP_CACHE_TIMEOUT` everywhere.

```toml
# Before (docker-config/config.toml)
[system]
cacheTimeout = 30000

# After (or document that MCP_CACHE_TIMEOUT overrides)
[system]
# cacheTimeout = 30000  # Deprecated: use MCP_CACHE_TIMEOUT env var instead (in seconds)
```

### 1.3 Duplicate Parse Logic

**Problem**: Same `parseInt()` pattern repeated across files:

```typescript
// mcp-server/src/index.ts:131
const port = Number.parseInt(process.env.MCP_HTTP_PORT || '3002')

// mcp-server/src/utils/rateLimitManager.ts:228
const maxRequests = Number.parseInt(process.env.MCP_RATE_LIMIT_MAX || '100')
```

**Recommendation**: Create a centralized parser utility:

```typescript
// shared/utils/env.ts
export function parseEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (value === undefined)
    return defaultValue
  const parsed = Number.parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

// Usage
const port = parseEnvInt('MCP_HTTP_PORT', 3002)
```

---

## 2. Naming Standardization Issues

### 2.1 Generic Port Variable

**Problem**: `PORT` is too generic - should be service-specific.

**Current**:

```typescript
// server/server.ts:98
const PORT = process.env.PORT || 3001
```

**Recommendation**: Rename to `BACKEND_PORT`:

```typescript
const BACKEND_PORT = parseEnvInt('BACKEND_PORT', 3001)
```

**Rationale**: Aligns with pattern used for MCP (`MCP_HTTP_PORT`) and test ports (`TEST_FRONTEND_PORT`, etc.).

### 2.2 Inconsistent Backend URL Variables

**Problem**: Two variables for backend URL with unclear relationship:

| Variable             | Purpose                       | Context       |
|----------------------|-------------------------------|---------------|
| `VITE_BACKEND_URL`   | Frontend uses to call backend | Native/Docker |
| `DOCKER_BACKEND_URL` | Container networking URL      | Docker only   |

**Location**:

- `docker-compose.dev.yml:24` - `DOCKER_BACKEND_URL=http://backend:3001`
- `.env.example:5` - `VITE_BACKEND_URL=http://localhost:3001`

**Recommendation**: Keep `VITE_BACKEND_URL` as the single source of truth. Remove `DOCKER_BACKEND_URL` and document
Docker usage:

```yaml
# docker-compose.dev.yml - remove DOCKER_BACKEND_URL
environment:
  - VITE_BACKEND_URL=http://backend:3001 # Docker container name
```

### 2.3 Missing `MCP_` Prefix for Security Variables

**Problem**: `MCP_SANITIZATION_ENABLED` uses `MCP_` prefix but other security features use `MCP_SECURITY_*`:

```bash
MCP_SANITIZATION_ENABLED=true          # Inconsistent
MCP_SECURITY_RATE_LIMITING=true        # Consistent pattern
MCP_SECURITY_AUTH=true                 # Consistent pattern
```

**Recommendation**: Rename to `MCP_SECURITY_SANITIZATION`:

```bash
MCP_SECURITY_SANITIZATION=true
```

---

## 3. Type Definition Inconsistencies

### 3.1 Missing TypeScript Definitions

**Problem**: `src/vite-env.d.ts` only defines 1 of 5 Vite variables:

**Current** (`src/vite-env.d.ts`):

```typescript
interface ImportMetaEnv {
  readonly VITE_FRONTEND_LOGGING_AUTOSTART: string
}
```

**Missing**:

- `VITE_BACKEND_URL`
- `VITE_DISABLE_EVENTBUS_LOGS`
- `VITE_HMR_HOST`
- `VITE_HMR_PORT`

**Recommendation**: Complete the type definitions:

```typescript
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_DISABLE_EVENTBUS_LOGS?: string
  readonly VITE_FRONTEND_LOGGING_AUTOSTART: string
  readonly VITE_HMR_HOST: string
  readonly VITE_HMR_PORT: string
}
```

---

## 4. Configuration Fragmentation

### 4.1 Multiple .env Files

**Problem**: Configuration split across multiple files:

| File                        | Purpose                 |
|-----------------------------|-------------------------|
| `.env.example`              | Root env vars           |
| `mcp-server/.env.example`   | MCP-specific vars       |
| `docker-config/config.toml` | Docker container config |

**Impact**: Developers must check multiple files to understand all available options.

**Recommendation**: Consolidate to single `.env.example` with clear sections:

```bash
# ===== Frontend =====
VITE_BACKEND_URL=http://localhost:3001
VITE_FRONTEND_LOGGING_AUTOSTART=false

# ===== Backend =====
BACKEND_PORT=3001

# ===== MCP Server =====
MCP_HTTP_ENABLED=true
MCP_HTTP_PORT=3002
MCP_BIND_ADDRESS=127.0.0.1
MCP_LOG_LEVEL=info
MCP_CACHE_TIMEOUT=300

# ===== MCP Security (Optional) =====
MCP_SECURITY_RATE_LIMITING=false
MCP_SECURITY_AUTH=false
```

Keep `mcp-server/.env.example` as a symlink or reference to the main file.

---

## 5. Hard-coded Defaults

### 5.1 Scattered Port Defaults

**Problem**: Port defaults defined in multiple places:

| Location                          | Port               | Service  |
|-----------------------------------|--------------------|----------|
| `server/server.ts:98`             | `3001`             | Backend  |
| `mcp-server/src/index.ts:131`     | `'3002'`           | MCP      |
| `shared/test-lib/config/ports.ts` | `6173, 4001, 4002` | Tests    |
| `vite.config.ts`                  | `5173`             | Frontend |

**Recommendation**: Centralize in `shared/utils/constants.ts`:

```typescript
// shared/utils/constants.ts
export const DEFAULT_PORTS = {
  FRONTEND: 5173,
  BACKEND: 3001,
  MCP: 3002,
  TEST_FRONTEND: 6173,
  TEST_BACKEND: 4001,
  TEST_MCP: 4002,
} as const
```

---

## 6. Proposed Standardization Scheme

### 6.1 Naming Convention Rules

1. **Service Prefix**: All service-specific vars use service prefix
    - `MCP_*` for MCP server
    - `BACKEND_*` for backend service
    - `FRONTEND_*` for frontend (use `VITE_` prefix for build-time vars)

2. **Category Suffix**: Group related vars with suffixes
    - `*_PORT` - port numbers
    - `*_HOST` - hostnames
    - `*_URL` - full URLs
    - `*_ENABLED` - boolean feature flags
    - `_*_TIMEOUT` - timeout values (specify unit in var name: `*_TIMEOUT_MS`, `*_TIMEOUT_SEC`)

3. **Security Variables**: Use `*_SECURITY_*` pattern
    - `MCP_SECURITY_RATE_LIMITING`
    - `MCP_SECURITY_AUTH`
    - `MCP_SECURITY_ORIGIN_VALIDATION`

### 6.2 Migration Table

| Old Variable               | New Variable                | Notes                      |
|----------------------------|-----------------------------|----------------------------|
| `LOG_LEVEL`                | `MCP_LOG_LEVEL`             | MCP-specific               |
| `PORT`                     | `BACKEND_PORT`              | Service-specific           |
| `DOCKER_BACKEND_URL`       | (removed)                   | Use `VITE_BACKEND_URL`     |
| `MCP_SANITIZATION_ENABLED` | `MCP_SECURITY_SANITIZATION` | Consistent security prefix |
| `cacheTimeout` (toml)      | `MCP_CACHE_TIMEOUT`         | Env var takes precedence   |

---

## 7. Priority Recommendations

### High Priority (Breaking Changes)

1. **Rename `PORT` → `BACKEND_PORT`**: Update `server/server.ts` and all compose files
2. **Standardize `LOG_LEVEL` → `MCP_LOG_LEVEL`**: Update all compose files
3. **Fix type definitions**: Add missing Vite env vars to `src/vite-env.d.ts`

### Medium Priority (Non-Breaking)

4. **Remove `DOCKER_BACKEND_URL`**: Document `VITE_BACKEND_URL` usage in Docker
5. **Rename `MCP_SANITIZATION_ENABLED` → `MCP_SECURITY_SANITIZATION`**
6. **Centralize port defaults**: Create `DEFAULT_PORTS` constant
7. **Create `parseEnvInt` utility**: Reduce code duplication

### Low Priority (Documentation)

8. **Consolidate .env files**: Merge or cross-reference
9. **Document cache timeout discrepancy**: Clarify `MCP_CACHE_TIMEOUT` vs docker-config

---

## 8. Implementation Checklist

- [ ] Update `src/vite-env.d.ts` with missing type definitions
- [ ] Create `shared/utils/env.ts` with `parseEnvInt` utility
- [ ] Rename `PORT` to `BACKEND_PORT` in code and compose files
- [ ] Replace `LOG_LEVEL` with `MCP_LOG_LEVEL` in all compose files
- [ ] Remove `DOCKER_BACKEND_URL` from docker-compose.dev.yml
- [ ] Rename `MCP_SANITIZATION_ENABLED` to `MCP_SECURITY_SANITIZATION`
- [ ] Add `DEFAULT_PORTS` to `shared/utils/constants.ts`
- [ ] Update documentation with new variable names

---

*Generated: 2026-01-14*
*Focus: Standardization and Redundancy Elimination*
