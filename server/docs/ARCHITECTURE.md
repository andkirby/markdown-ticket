# Architecture: Server

Layered architecture for the Express API server.

## Layers

```text
HTTP Clients → server.ts → Generic Middleware → API Auth Gate → Routes → Controllers → Services → Data Storage
```

| Layer | Responsibility |
|-------|---------------|
| **API Auth Gate** | Protect `/api/*` routes, exempt only public health/status |
| **Routes** | Define endpoints, map to controllers |
| **Controllers** | HTTP handling, request/response formatting |
| **Services** | Business logic, coordinate operations |
| **Utilities** | Pure helper functions |

## Request Flow Example

```text
GET /api/projects/markdown-ticket/crs
  → Middleware (validation, security)
  → API auth middleware
  → Route handler (projects.js)
  → ProjectController.getProjectCRs()
  → TicketService.getProjectCRs()
  → ProjectDiscovery.getProjectCRs()
  → File system (read markdown files)
  ← JSON response
```

## Dependency Injection

```javascript
// Core services
const fileWatcher = new FileWatcherService()
const projectDiscovery = new ProjectDiscoveryService()

// Business services (inject dependencies)
const projectService = new ProjectService(projectDiscovery)
const ticketService = new TicketService(projectDiscovery)

// Controllers (inject services)
const projectController = new ProjectController(
  projectService, ticketService, fileSystemService, fileWatcher
)

// Routes (inject controllers)
const projectRouter = createProjectRouter(projectController)
app.use('/api/projects', projectRouter)
```

## API Authentication Boundary

`server/security/apiAuth.ts` owns backend API auth configuration, credential extraction, route exemption classification, and token comparison. `server/server.ts` mounts `createApiAuthMiddleware()` once at `/api` before protected routers.

New backend API endpoints should be mounted under `/api` after that middleware. They require a token by default. The only public backend API exemptions are:

- `GET /api/status`
- `GET /api/health`
- `GET /api/documents/raw-preview/*` (MDT-221) — GET-only exemption so the opaque sandboxed HTML preview iframe can reach the handler. The handler enforces its own HMAC preview token (the iframe cannot send the `SameSite=Strict` session cookie). The prefix is **carved out** of `isPublicReadRoute` in `accessPolicy.ts` so it does not inherit the broad `/api/documents` anonymous + read-session-readable grant; defense-in-depth alongside the handler's token gate.

Supported credentials for protected backend APIs are `Authorization: Bearer <token>` and `X-API-Key: <token>`. Controllers should not implement their own token checks.

Vite middleware endpoints, such as `/api/frontend/logs*`, are not backend Express routes and do not pass through this auth gate. They need a separate boundary.

## Module Responsibilities

| Module | Does | Doesn't |
|--------|------|---------|
| Routes | Define endpoints | Business logic |
| Controllers | HTTP handling | Business logic |
| Services | Business rules | HTTP concerns |
| Utilities | Pure functions | State management |

## Conventions

- **Single Responsibility**: Each layer has one job
- **Dependency Injection**: Constructor-based, testable
- **Error Handling**: Service throws → Controller catches → Error middleware responds
- **Stateless Controllers**: Easy to scale horizontally

## Routes

| Route | Controller |
|-------|------------|
| `/api/projects` | ProjectController |
| `/api/projects/:id/crs` | TicketController |
| `/api/projects/:id/cloud-projections` | ProjectController (owner-only, header-only cloud feed) |
| `/api/documents` | DocumentController |
| `/api/documents/preview-token` | DocumentController (MDT-221, owner-only mint of short-lived HTML preview tokens) |
| `/api/documents/raw-preview/:token/*` | DocumentController (MDT-221, token-gated raw byte stream for sandboxed HTML preview) |
| `/api/events` | SSE (Server-Sent Events) |
| `/api/system` | SystemController |

## HTML Document Preview (MDT-221)

Sandboxed HTML documents (`.html`/`.htm`) are previewed in an opaque-origin
iframe. Because the iframe cannot send the `SameSite=Strict` owner session
cookie on subresource requests, the preview is credentialled by a short-lived
(≤300s), directory-scoped HMAC **preview token** instead.

- **Mint** (`POST /api/documents/preview-token`): owner-only. Rejects read-token
  and shared sessions. Mints a token scoped to the directory of the selected
  HTML file so relative subresources resolve under the same scope.
- **Serve** (`GET /api/documents/raw-preview/:token/*`): the token lives in the
  PATH (not a query param) so relative assets inherit it. The handler runs the
  full gate chain — HMAC signature → expiry → project lookup → token docDir
  scope → configured document-paths containment → project-root containment →
  MIME lookup → headers — then streams bytes (`createReadStream`, binary-safe).
- **Headers**: the global `securityHeaders` middleware sets
  `X-Frame-Options: DENY` on every response; the raw-preview handler overrides
  to `SAMEORIGIN` so the iframe can load (DENY blocks same-origin framing too).
  The canonical pinned CSP is `sandbox allow-scripts; default-src 'none';
  connect-src 'none'` (full strict string asserted as `PINNED_CSP_STRICT` in
  `server/tests/api/document-raw.test.ts`). `allow-same-origin` is forbidden in
  both the CSP sandbox directive and the iframe sandbox attribute. **v1 ships a documented
  deviation** (external CDN allowlist + `unsafe-eval`) so working HTML depending
  on Tailwind/Alpine/Google Fonts can render; the non-negotiable directives
  (`connect-src 'none'`, `img-src 'self' data:`, `default-src 'none'`) are
  unchanged. See `docs/CRs/MDT-221/security-tradeoffs.md` for the full rationale
  and the per-project opt-in configuration follow-up.

See `docs/CRs/MDT-221/architecture.md` for the gate-order rationale and the
two-path (mint vs serve) security model.

Cloud-bound ticket creation and projection publishing stay in the shared
`TicketService`; the server is a thin HTTP adapter. Cloudflare credentials
remain server-side. The frontend polls only the owner-only header feed above.
