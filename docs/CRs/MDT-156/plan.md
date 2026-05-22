# MDT-156 Security Hardening Plan

## Investigation Summary

MDT-156 is not a single feature. It is a security hardening batch across backend HTTP surfaces, MCP HTTP transport, Docker defaults, and dependency posture.

The current ticket and audit research identify the right core risks:
- Unauthenticated backend and MCP surfaces are reachable in common deployments.
- SSE and devtools streams override CORS with `Access-Control-Allow-Origin: *`.
- Filesystem browsing and existence APIs expose host filesystem structure.
- MCP security environment variables are documented but not wired into HTTP transport startup.
- Backend responses lack basic security headers.
- Some exposed debug/config endpoints leak local topology or mutable operational state.
- Dependency lock state may still include vulnerable transitive packages.

## Recommended Workflow

Use workflow, but split it into small hardening slices rather than one large implementation.

Recommended sequence:
1. Architecture subdoc: define security boundaries and compatibility rules.
2. Tests subdoc: specify regression tests for each boundary before implementation.
3. Tasks subdoc: break fixes into isolated batches.
4. Implementation: land one batch at a time.

Do not start with direct code changes. The affected surfaces overlap and a quick fix can easily break local development, Docker, MCP clients, or project path selection.

## Implementation Slices

### Slice 1: Shared HTTP security baseline

Scope:
- Add backend security headers.
- Disable Express fingerprinting.
- Keep local development behavior compatible.

Likely files:
- `server/server.ts`
- possibly `server/tests/api/*`

Expected weight: small.

Risk:
- Low. Header changes should be mostly additive.

Decision needed:
- Whether to use `helmet` or minimal manual headers. Minimal headers match current acceptance criteria; `helmet` is broader but may require tuning.

### Slice 2: CORS and SSE consistency

Scope:
- Remove wildcard CORS from backend SSE.
- Remove wildcard CORS from devtools SSE.
- Reuse the same allowed-origin decision as main server CORS.
- Preserve no-origin requests for curl/server clients.

Likely files:
- `server/server.ts`
- `server/routes/sse.ts`
- `server/routes/devtools.ts`
- tests around SSE/devtools CORS

Expected weight: medium.

Risk:
- Medium. SSE headers are manually written, so central CORS middleware alone may not be enough.

Decision needed:
- Extract a small shared origin helper from `server/server.ts`, or pass allowed-origin behavior into routers.

### Slice 3: Filesystem access boundary

Scope:
- Restrict `/api/directories`.
- Restrict `/api/filesystem/exists`.
- Use realpath/canonical containment against configured project roots.
- Prevent symlink escapes.
- Avoid returning absolute expanded paths for denied paths.

Likely files:
- `server/routes/system.ts`
- `server/controllers/ProjectController.ts`
- `shared/services/ProjectService.ts`
- possibly a new shared path-boundary utility

Expected weight: high.

Risk:
- High. Path browsing is used by project setup UI, so a strict project-only allowlist can conflict with selecting new project directories.

Decision needed:
- Whether directory browsing should be limited to configured discovery roots, configured project roots, or both.
- For adding a new project, project roots alone are insufficient because the project is not configured yet.

Recommendation:
- Allow browsing only within configured discovery search paths.
- Allow existing project roots as additional roots.
- Deny everything else with 403.

### Slice 4: Devtools exposure

Scope:
- Gate devtools endpoints.
- Keep development workflow usable.
- Prevent production deployments from exposing logs/session controls.

Likely files:
- `server/server.ts`
- `server/routes/devtools.ts`
- docs/env docs if adding a flag

Expected weight: medium.

Risk:
- Medium. Devtools may be relied on during debugging.

Decision needed:
- Disable devtools when `NODE_ENV=production`, or require explicit `DEVTOOLS_ENABLED=true`.

Recommendation:
- Default disabled in production.
- Enabled by default only in development/test.

### Slice 5: Config and maintenance endpoint exposure

Scope:
- Review `/api/config`, `/api/config/global`, `/api/config/clear`, `/api/cache/clear`, `/api/config/selector`.
- Filter sensitive absolute paths where possible.
- Gate write/maintenance endpoints.

Likely files:
- `server/routes/system.ts`
- frontend config consumers if response shape changes

Expected weight: medium.

Risk:
- Medium. Frontend may depend on current config response shapes.

Decision needed:
- Whether this belongs in MDT-156 or MDT-157 auth.

Recommendation:
- In MDT-156, do minimum safe filtering/gating for debug/maintenance endpoints.
- Leave full authorization model to MDT-157.

### Slice 6: MCP HTTP hardening

Scope:
- Wire MCP HTTP env vars into `startHttpTransport`.
- Ensure production Docker enables origin validation and rate limiting by default.
- Hide `/sessions` unless development or authenticated.
- Consider timing-safe token comparison.
- Change rate limiting key from tool-only to caller-aware.

Likely files:
- `mcp-server/src/index.ts`
- `mcp-server/src/transports/http.ts`
- `mcp-server/src/transports/middleware.ts`
- `mcp-server/src/utils/rateLimitManager.ts`
- Docker compose docs/config

Expected weight: high.

Risk:
- High. MCP clients may break if origin/auth defaults are too strict.

Decision needed:
- Whether auth is still out of scope due to MDT-157.
- What default allowed origins should be in Docker production.

Recommendation:
- For MDT-156, wire all config correctly.
- Enable origin validation and rate limiting in production Docker.
- Keep auth opt-in unless MDT-157 is pulled forward.
- Do not expose `/sessions` when auth is off outside development.

### Slice 7: Dependency patching

Scope:
- Update DOMPurify and vulnerable transitive production dependencies.
- Confirm lockfile resolved versions, not only `package.json` ranges.

Likely files:
- `package.json`
- `bun.lock`
- workspace package manifests if needed

Expected weight: medium.

Risk:
- Medium. Transitive dependency upgrades can affect MCP SDK, Express, Vite, or test tooling.

Decision needed:
- Whether dev-only advisories are in scope for this ticket.

Recommendation:
- Production/runtime vulnerabilities are in scope.
- Dev-only advisories can be documented separately unless audit policy requires zero high/critical findings.

## Suggested Subdocs To Create Next

Create these before implementation:
- `docs/CRs/MDT-156/architecture.md`
- `docs/CRs/MDT-156/tests.md`
- `docs/CRs/MDT-156/tasks.md`

The architecture doc should settle these boundary decisions:
- Allowed filesystem roots.
- Devtools enablement policy.
- MCP production defaults.
- Whether config/maintenance endpoint gating is included in MDT-156.
- Whether auth remains strictly deferred to MDT-157.

## Recommended First Implementation Batch

Start with the least risky batch:
1. Add backend security headers and disable `x-powered-by`.
2. Wire MCP env vars into HTTP transport startup without changing defaults.
3. Hide MCP `/sessions` outside development unless auth is enabled.

Then handle higher-risk path and CORS work after tests are specified.

## Open Decisions

1. Should new-project directory browsing use discovery roots as the allowlist?
2. Should devtools be disabled in production only, or require explicit opt-in in all environments?
3. Should MCP auth remain deferred to MDT-157?
4. Should MDT-156 include filtering/gating `/api/config/global` and maintenance endpoints?
5. Is the acceptance target `bun audit` clean for production dependencies only, or all dependencies?
