# Security Audit Research — Markdown Ticket

**Date**: 2026-04-30
**Scope**: Full project — backend, MCP server, frontend, Docker, dependencies
**Auditor**: Automated static analysis + manual code review

---

## 1. Methodology

### What was scanned
- `server/` — Express REST API (controllers, routes, middleware, services)
- `mcp-server/src/` — MCP HTTP transport, auth middleware, tool handlers
- `shared/` — Shared services, models, YAML parser
- `src/` — React frontend (XSS surface, sanitization)
- Dockerfiles (`Dockerfile`, `server/Dockerfile`, `mcp-server/Dockerfile`)
- Docker Compose files (`docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.dev.yml`)
- `nginx.conf` — Frontend reverse proxy
- `.env*` files — Secret exposure
- `package.json` / lockfiles — Dependency vulnerabilities via `bun audit`

### What was NOT scanned
- Runtime penetration testing (no live server was attacked)
- Third-party SAST/DAST tools
- Git history for leaked secrets (only working tree)
- Supply chain integrity (package checksums)

---

## 2. Findings Summary

| # | Severity | Category | Finding | File(s) |
|---|----------|----------|---------|---------|
| 1 | High | Auth | All REST API endpoints unauthenticated | `server/routes/*.ts` |
| 2 | High | Auth | MCP HTTP transport security disabled by default | `mcp-server/src/transports/http.ts`, `docker-compose.yml` |
| 3 | High | CORS | SSE endpoint overrides CORS to `*` | `server/routes/sse.ts:47` |
| 4 | High | CORS | Devtools endpoints override CORS to `*` | `server/routes/devtools.ts:225` |
| 5 | High | Path traversal | Directory browsing accepts arbitrary paths | `server/routes/system.ts:127` → `shared/services/ProjectService.ts:466` |
| 6 | High | Path traversal | Path existence check leaks filesystem structure | `server/routes/system.ts` POST `/api/filesystem/exists` |
| 7 | Medium | Auth | Bearer token comparison is timing-unsafe | `mcp-server/src/transports/middleware.ts:41` |
| 8 | Medium | CORS | Requests with no origin bypass CORS | `server/server.ts:139` |
| 9 | Medium | Headers | No security headers on backend API | `server/server.ts` |
| 10 | Medium | Input | No rate limiting on write endpoints | `server/routes/projects.ts` |
| 11 | Medium | Docker | Dev containers run as root | `Dockerfile`, `server/Dockerfile`, `mcp-server/Dockerfile` dev stages |
| 12 | Medium | Deps | DOMPurify < 3.3.2 — 8 XSS bypass CVEs | Direct dependency (frontend) |
| 13 | Medium | Deps | Handlebars ≤ 4.7.8 — JS injection (critical) | Transitive via ts-jest |
| 14 | Medium | Path traversal | Document content API — partial mitigation | `server/services/DocumentService.ts:42-60` |
| 15 | Low | YAML | Frontmatter parser is safe by design | `shared/services/MarkdownService.ts:163` |
| 16 | Low | Headers | Stack traces exposed in dev mode | `server/middleware/errorHandler.ts:43-45` |
| 17 | Low | Headers | Error messages leak internal paths | `server/controllers/ProjectController.ts` catch blocks |
| 18 | Low | Deps | 69 total advisories (1 critical, 29 high) | `bun audit` |

---

## 3. Detailed Findings

### 3.1 Authentication & Authorization

#### Finding 1: All REST API endpoints are unauthenticated

- **Severity**: High
- **CVSS estimate**: 7.5 (Network, no auth required)
- **Files**: `server/routes/projects.ts`, `server/routes/documents.ts`, `server/routes/system.ts`, `server/routes/sse.ts`

**Evidence**:

No route in the Express app applies authentication middleware. The server setup in `server/server.ts` loads CORS, JSON parsing, and log interception — but no auth:

```
app.use(cors({...}))
app.use(express.json())
setupLogInterception()
```

Every route is registered without middleware:
```
router.get('/', (req, res) => projectController.getAllProjects(req, res))
router.post('/', (req, res) => projectController.createProject(req, res))
router.delete('/:projectId/crs/:crId', (req, res) => projectController.deleteCR(req, res))
```

**Impact**: Anyone with network access can:
- Read all projects and their configuration
- Create, modify, and delete CRs (markdown files on disk)
- Enumerate directories on the host filesystem
- Check if arbitrary paths exist on the host
- Subscribe to SSE for real-time file change events

**Affected endpoints (all HTTP methods)**:
- `GET /api/projects` — list all projects
- `GET /api/projects/:id/config` — read project config (includes filesystem paths)
- `POST /api/projects` — create project (writes toml to disk)
- `PUT /api/projects/:code` — modify project
- `GET /api/projects/:id/crs` — list all CRs
- `POST /api/projects/:id/crs` — create CR (writes .md file)
- `PATCH /api/projects/:id/crs/:crId` — modify CR
- `DELETE /api/projects/:id/crs/:crId` — delete CR
- `GET /api/directories` — browse host filesystem
- `POST /api/filesystem/exists` — check if path exists
- `GET /api/documents/content` — read document content
- `POST /api/documents/configure` — configure document paths
- `GET /api/events` — SSE stream of file changes
- Dev tools endpoints (log capture, session management)

---

#### Finding 2: MCP HTTP transport security disabled by default

- **Severity**: High
- **Files**: `mcp-server/src/transports/http.ts`, `docker-compose.yml:65-70`, `docker-compose.prod.yml`

**Evidence**:

The MCP HTTP transport has auth, origin validation, and rate limiting code — all conditionally enabled:

```typescript
// http.ts
if (config.enableOriginValidation && config.allowedOrigins) { ... }
if (config.enableAuth && config.authToken) { ... }
```

When origin validation is disabled, CORS accepts everything:
```typescript
else {
  callback(null, true)  // Accept all origins
}
```

Docker compose (even production) has all security disabled:
```yaml
# docker-compose.yml
- MCP_SECURITY_ORIGIN_VALIDATION=false
- MCP_SECURITY_RATE_LIMITING=false
- MCP_SECURITY_AUTH=false
```

Production compose comments them out rather than enabling:
```yaml
# docker-compose.prod.yml
# - MCP_SECURITY_ORIGIN_VALIDATION=true
# - MCP_SECURITY_AUTH=true
# - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
```

The MCP server binds `0.0.0.0:3002` in Docker, exposing it to the entire Docker network — and via port mapping `3012:3002`, to the host network as well.

**Impact**: In a Docker deployment, the MCP server is reachable from any container on the same network, and from the host, with no authentication.

---

#### Finding 3: Bearer token comparison is timing-unsafe

- **Severity**: Medium
- **File**: `mcp-server/src/transports/middleware.ts:41`

**Evidence**:

```typescript
const token = parts[1]
if (token !== expectedToken) {
  return res.status(401).json({...})
}
```

The `!==` operator compares strings character-by-character and returns `false` as soon as a mismatch is found. This creates measurable timing differences based on how many leading characters match. An attacker can exploit this to guess the token one character at a time by measuring response latency.

**Remediation**: Use `crypto.timingSafeEqual`:
```typescript
import { timingSafeEqual } from 'node:crypto'
const tokenBuf = Buffer.from(token)
const expectedBuf = Buffer.from(expectedToken)
if (tokenBuf.length !== expectedBuf.length) return res.status(401).json({...})
if (!timingSafeEqual(tokenBuf, expectedBuf)) return res.status(401).json({...})
```

---

### 3.2 CORS Violations

#### Finding 4: SSE endpoint overrides CORS to `*`

- **Severity**: High
- **File**: `server/routes/sse.ts:47`

**Evidence**:

```typescript
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',  // Bypasses CORS allowlist
  'Access-Control-Allow-Headers': 'Cache-Control',
})
```

The main server configures a strict CORS allowlist in `server.ts:119-145`:
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:4173',
  ...additionalDomains.flatMap(d => [`https://${d}`, `http://${d}`]),
]
```

But the SSE endpoint writes `Access-Control-Allow-Origin: *` directly to the response, completely bypassing this middleware. Any website can open an EventSource connection and receive all real-time file change events, including:
- Project names and paths
- CR file changes (content updates)
- File creation/deletion events

**Remediation**: Use `req.headers.origin` to set the allowlist dynamically, or apply the same CORS middleware before the SSE route.

---

#### Finding 5: Devtools endpoints override CORS to `*`

- **Severity**: High
- **File**: `server/routes/devtools.ts:225`

**Evidence**:

```typescript
res.writeHead(200, {
  'Access-Control-Allow-Origin': '*',
  ...
})
```

Same pattern as the SSE endpoint — writes `*` directly, bypassing the server CORS allowlist. Devtools endpoints expose:
- Server logs (potentially including file paths, stack traces)
- Frontend session status
- Frontend console logs (captured from browser)

---

#### Finding 6: CORS allows requests with no origin

- **Severity**: Medium
- **File**: `server/server.ts:139`

**Evidence**:

```typescript
origin: (origin, callback) => {
  if (!origin)
    return callback(null, true)  // Allow no-origin requests
  ...
}
```

This is standard practice for API servers that need to support curl, server-to-server, and mobile clients. However, combined with Finding 1 (no auth), it means there are zero barriers to API access from any HTTP client.

**Note**: This is by design and acceptable once authentication is added. Documenting for completeness.

---

### 3.3 Path Traversal & Filesystem Exposure

#### Finding 7: Directory browsing API accepts arbitrary paths

- **Severity**: High
- **Files**: `server/routes/system.ts:127` → `shared/services/ProjectService.ts:466-498`

**Evidence**:

The API endpoint:
```typescript
// system.ts:127
router.get('/directories', (req, res) => {
  projectController.getSystemDirectories(req, res)
})
```

The controller passes the query parameter directly:
```typescript
// ProjectController.ts:291
const result = await this.projectService.getSystemDirectories(requestPath as string)
```

The implementation resolves any path:
```typescript
// ProjectService.ts:466-498
async getSystemDirectories(p?: string) {
  const targetPath = path.resolve(p || os.homedir())
  // Only checks isDirectory(), no path restriction
  const entries = await fs.readdir(targetPath)
  // Filters only dot-prefixed entries
  if (e.startsWith('.')) continue
}
```

**Attack examples**:
- `GET /api/directories?path=/etc` → lists `/etc` contents (passwd, shadow, ssh config)
- `GET /api/directories?path=/home` → lists all user home directories
- `GET /api/directories?path=/var/log` → lists system logs
- `GET /api/directories?path=/` → lists root filesystem

**Impact**: Complete filesystem reconnaissance. An attacker can map the entire host filesystem structure, identify installed software, find user directories, and locate sensitive configuration files.

**Remediation**: Restrict to paths within configured project directories. Reject any path that resolves outside known project roots.

---

#### Finding 8: Path existence check leaks filesystem structure

- **Severity**: High
- **File**: `server/routes/system.ts` — POST `/api/filesystem/exists`

**Evidence**:

```typescript
router.post('/filesystem/exists', async (req, res) => {
  const { path: inputPath } = req.body
  let expandedPath = inputPath
  if (inputPath.startsWith('~')) {
    expandedPath = inputPath.replace(/^~($|\/)/, `${homeDir}$1`)
  }
  const stats = await fs.stat(expandedPath)
  exists = stats.isDirectory()
  // Returns: { exists, isInDiscovery, expandedPath }
})
```

The endpoint:
1. Accepts any path from the request body
2. Expands `~` to the home directory
3. Returns whether the path exists as a directory
4. Returns the fully resolved absolute path
5. Checks if the path is within discovery search paths (informational)

**Attack examples**:
- `POST /api/filesystem/exists {"path": "~/.ssh"}` → reveals SSH directory exists
- `POST /api/filesystem/exists {"path": "/etc/shadow"}` → reveals if shadow file exists
- `POST /api/filesystem/exists {"path": "~/.aws/credentials"}` → reveals AWS credentials file

---

#### Finding 9: Document content API — partial path traversal mitigation

- **Severity**: Medium
- **File**: `server/services/DocumentService.ts:42-60`

**Evidence**:

```typescript
async getDocumentContent(projectId: string, filePath: string): Promise<string> {
  // Defense 1: Block '..' in string
  if (filePath.includes('..')) {
    throw new Error('Invalid file path')
  }
  // Defense 2: Only .md files
  if (!filePath.endsWith('.md')) {
    throw new Error('Only markdown files are allowed')
  }
  // Defense 3: Verify resolved path stays within project
  const resolvedPath = path.join(projectPath, filePath)
  if (!resolvedPath.startsWith(projectPath)) {
    throw new Error('Access denied')
  }
  return await this._fileInvoker.readFile(resolvedPath)
}
```

This is **good** — three layers of defense. However, potential bypasses:

1. **Symbolic links**: If a symlink inside the project points outside, `resolvedPath.startsWith(projectPath)` passes but the read follows the link to an external file.
2. **URL-encoded paths**: If the filePath passes through URL decoding before reaching this function, `%2e%2e` could bypass the `..` check. (Requires verification of upstream decoding.)
3. **Unicode normalization**: Some filesystems normalize Unicode characters, potentially creating unexpected path equivalences.

**Assessment**: The mitigation is solid for the primary attack vector. The symlink bypass is a minor residual risk that depends on whether users can create symlinks within project directories.

---

### 3.4 Docker Security

#### Finding 10: Development containers run as root

- **Severity**: Medium
- **Files**: `Dockerfile`, `server/Dockerfile`, `mcp-server/Dockerfile`

**Evidence**:

All three Dockerfiles have two stages:
- **Development**: Runs as root (default `oven/bun:alpine` user)
- **Production**: Explicitly switches to `USER bun`

```dockerfile
# server/Dockerfile — production stage
USER bun
WORKDIR /app/server
```

The development `docker-compose.yml` targets `development` stage:
```yaml
build:
  target: development
```

**Impact**: If dev containers are used in CI, shared environments, or accidentally in production, a container escape would give root-level access on the host.

**Production assessment**: Production Dockerfiles are well-structured:
- Multi-stage build separates build from runtime
- Non-root user (`bun`) in production
- Health checks configured
- Resource limits in `docker-compose.prod.yml`
- No secrets baked into images
- `--frozen-lockfile` for reproducible builds

---

### 3.5 Input Validation

#### Finding 11: No rate limiting on write endpoints

- **Severity**: Medium
- **Files**: `server/routes/projects.ts` — POST/PUT/DELETE routes

**Evidence**:

The backend Express server has no rate limiting middleware. The MCP server has optional rate limiting via `RateLimitManager`, but the main backend does not.

Write operations with no rate limiting:
- `POST /api/projects` — create projects (writes TOML files)
- `POST /api/projects/:id/crs` — create CRs (writes .md files)
- `PATCH /api/projects/:id/crs/:crId` — update CRs
- `PUT /api/projects/:code` — update projects
- `DELETE /api/projects/:id/crs/:crId` — delete CRs
- `POST /api/documents/configure` — configure document paths
- `POST /api/cache/clear` — clear caches

**Impact**: Disk exhaustion via mass CR creation, or DoS via cache invalidation flooding.

---

### 3.6 Dependency Vulnerabilities

#### Finding 12: DOMPurify < 3.3.2 — 8 XSS bypass CVEs

- **Severity**: Medium
- **Advisories**:
  - GHSA-h8r8-wccr-v5f2 — mutation-XSS via re-contextualization
  - GHSA-v2wj-7wpq-c8vv — Cross-site scripting
  - GHSA-cjmm-f4jc-qw8r — ADD_ATTR predicate skips URI validation
  - GHSA-cj63-jhhr-wcxv — USE_PROFILES prototype pollution allows event handlers
  - GHSA-39q2-94rc-95cp — ADD_TAGS function form bypasses FORBID_TAGS
  - GHSA-h7mw-gpvr-xq4m — FORBID_TAGS bypassed by function-based ADD_TAGS predicate
  - GHSA-crv5-9vww-q3g8 — SAFE_FOR_TEMPLATES bypass in RETURN_DOM mode
  - GHSA-v9jr-rg53-9pgp — Prototype Pollution to XSS via CUSTOM_ELEMENT_HANDLING

**Context**: The project uses DOMPurify for markdown sanitization in `src/components/MarkdownContent/useMarkdownProcessor.ts`:

```typescript
import DOMPurify from 'dompurify'
import { ALLOWED_ATTR, ALLOWED_TAGS } from './domPurifyConfig'
```

Markdown content from CR files passes through showdown converter, then DOMPurify sanitization. If the DOMPurify version is vulnerable, crafted markdown content could execute JavaScript in the browser.

**Remediation**: `bun update dompurify` to >= 3.3.2

---

#### Finding 13: Handlebars ≤ 4.7.8 — JavaScript injection (critical)

- **Severity**: Medium (dev/test only)
- **Advisories**:
  - GHSA-2w6w-674q-4c4q (critical) — JS Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (high) — JS Injection via @partial-block
  - GHSA-xjpj-3mr7-gcpf (high) — JS Injection in CLI Precompiler
  - GHSA-xhpv-hc6g-r9c6 (high) — JS Injection via AST Type Confusion (dynamic partial)
  - GHSA-9cx6-37pm-9jff (high) — DoS via malformed decorator syntax
  - GHSA-2qvq-rjwj-gvw9 (moderate) — Prototype Pollution to XSS
  - GHSA-7rx3-28cr-v5wh (moderate) — Missing __lookupSetter__ blocklist

**Context**: Transitive dependency via `ts-jest` → `@mdt/domain-contracts` → eslint. Test/build-time only — not present in production runtime.

---

#### Finding 14: Other notable dependency vulnerabilities

Full `bun audit` summary — **69 total advisories (1 critical, 29 high, 38 moderate, 1 low)**:

| Package | Severity | Issue | Present in |
|---------|----------|-------|------------|
| `@hono/node-server` < 1.19.10 | High | Auth bypass via encoded slashes | MCP SDK |
| `express-rate-limit` < 8.2.2 | High | IPv4-mapped IPv6 bypasses rate limiting | MCP SDK |
| `path-to-regexp` < 8.4.0 | High | ReDoS via optional groups, wildcards | MCP server express |
| `picomatch` < 2.3.2 | High | ReDoS via extglob quantifiers | Multiple (dev deps) |
| `postcss` < 8.5.10 | Moderate | XSS via unescaped `</style>` | Frontend build |
| `brace-expansion` < 1.1.13 | Moderate | Process hang via zero-step sequence | Multiple (dev deps) |
| `yaml` (npm) | Moderate | Stack overflow via deeply nested YAML | Transitive |
| `follow-redirects` ≤ 1.15.11 | Moderate | Information exposure | Transitive |

**Remediation**: `bun update` to pick up compatible patches. For breaking changes, test individually.

---

### 3.7 Error Handling & Information Disclosure

#### Finding 15: Stack traces exposed in development mode

- **Severity**: Low
- **File**: `server/middleware/errorHandler.ts:43-45`

**Evidence**:

```typescript
if (process.env.NODE_ENV === 'development' && err.stack) {
  errorResponse.stack = err.stack
}
```

Acceptable — gated behind `NODE_ENV=development`. Production Dockerfiles set `NODE_ENV=production`. Risk only if someone runs the server in dev mode in production.

---

#### Finding 16: Error messages leak internal paths

- **Severity**: Low
- **Files**: `server/controllers/ProjectController.ts` — multiple catch blocks

**Evidence**:

Several catch blocks return `details: err.message` which can contain:
- Filesystem paths from file I/O errors
- Stack traces from unhandled exceptions
- Internal service names and configurations

Examples:
```typescript
// ProjectController.ts:185
res.status(500).json({ error: 'Failed to create project', details: err.message })

// ProjectController.ts:516
res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update CR', details: err.message })
```

**Remediation**: In production, log `err.message` server-side only; return generic error messages to the client.

---

### 3.8 Security Headers

#### Finding 17: No security headers on backend API

- **Severity**: Medium
- **File**: `server/server.ts`

**Evidence**:

The Express server applies no security headers. Compare with `nginx.conf` which sets:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

But these only apply to responses served through nginx (frontend). Direct requests to the backend on port 3001 have no security headers.

Missing headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (or SAMEORIGIN)
- `Strict-Transport-Security` (if TLS is used)
- `Content-Security-Policy`
- `X-Request-ID` (for tracing)

**Remediation**: Add `helmet` middleware or manually set headers in Express.

---

### 3.9 Positive Findings (No Vulnerability)

#### YAML frontmatter parser is safe

- **File**: `shared/services/MarkdownService.ts:163-200`

The custom YAML parser only handles simple `key: value` pairs:

```typescript
for (const line of lines) {
  const colonIndex = trimmed.indexOf(':')
  const key = trimmed.substring(0, colonIndex).trim()
  let value = trimmed.substring(colonIndex + 1).trim()
  // Only string values, no type coercion
  result[key] = value
}
```

No type coercion, no anchors, no `!!js/function` tags, no nested structures. This is inherently safe from YAML deserialization attacks like CVE-2022-46169.

#### DOMPurify sanitization pipeline is correct

- **File**: `src/components/MarkdownContent/useMarkdownProcessor.ts`

The processing pipeline follows best practices:
1. Preprocess markdown
2. Convert with showdown
3. Highlight code blocks
4. **Sanitize with DOMPurify** (last step before rendering)

DOMPurify is the final step, which is correct — sanitization must happen after all transformations to be effective. The only issue is the outdated version (Finding 12).

#### Production Docker hardening is good

- Non-root user in production stages
- Health checks configured
- Resource limits in docker-compose.prod.yml
- Multi-stage builds (no build tools in production image)
- `--frozen-lockfile` for deterministic builds
- Volume mounts only for config and project data

#### Document content path protection is layered

- Three separate checks: `..` blocking, extension validation, resolved path prefix check
- Only `.md` files readable
- Project-scoped path resolution

---

## 4. Attack Surface Map

```
Internet / LAN
    │
    ├── :5173/:5174  nginx (frontend)
    │                    ├── Security headers: ✅ present
    │                    ├── CSP: ❌ not set
    │                    └── Proxies /api/ → backend:3001
    │
    ├── :3001        Express backend
    │                    ├── Auth: ❌ none
    │                    ├── CORS: ✅ allowlist (except SSE/devtools)
    │                    ├── Security headers: ❌ none
    │                    ├── Rate limiting: ❌ none
    │                    ├── /api/directories — arbitrary path access
    │                    ├── /api/filesystem/exists — path probing
    │                    ├── /api/events — SSE with CORS *
    │                    └── /api/projects/:id/crs — full CRUD (no auth)
    │
    ├── :3002/:3012  MCP HTTP transport
    │                    ├── Auth: ⚠️ optional (disabled by default)
    │                    ├── Origin validation: ⚠️ optional (disabled)
    │                    ├── Rate limiting: ⚠️ optional (disabled)
    │                    ├── Token comparison: ❌ timing-unsafe
    │                    └── CORS: ⚠️ accepts all if origin validation off
    │
    └── stdio         MCP stdio transport
                         └── Local only, no auth needed (by design)
```

---

## 5. Recommended Priority Order

| Priority | Finding | Effort | Risk Reduction |
|----------|---------|--------|----------------|
| P0 | #1 — Add API authentication (MDT-157) | Medium | Critical |
| P0 | #4-5 — Fix CORS overrides in SSE/devtools | Low | High |
| P1 | #7-8 — Restrict filesystem API paths | Medium | High |
| P1 | #2 — Enable MCP security defaults in prod | Low | High |
| P1 | #3 — Timing-safe token comparison | Low | Medium |
| P2 | #9 — Add security headers | Low | Medium |
| P2 | #12 — Update DOMPurify | Low | Medium |
| P3 | #13-14 — Patch remaining dependencies | Low | Low |
| P3 | #11 — Run dev containers as non-root | Low | Low |
| P3 | #16-17 — Sanitize error messages | Low | Low |
