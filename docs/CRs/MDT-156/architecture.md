# Architecture: MDT-156

**Source**: [MDT-156](../MDT-156-security-hardening.md)
**Trace projection**: [architecture.trace.md](./architecture.trace.md)

## Overview

MDT-156 hardens existing unauthenticated surfaces without introducing the authentication model owned by MDT-157. The architecture uses small security boundary modules around existing routes so CORS, filesystem access, MCP HTTP defaults, headers, dependency posture, and secret hygiene are enforced consistently without changing the shared service layer public API.

## Pattern

**Pattern**: Boundary-first hardening with compatibility-preserving adapters.

Security decisions live at route/bootstrap boundaries before sensitive operations run. Existing services continue to own domain behavior, while new boundary helpers decide whether an HTTP request, path, debug surface, or MCP caller is allowed to proceed.

## Settled Decisions

| Area | Decision |
|------|----------|
| Filesystem allowed roots | Allow canonical paths contained in discovery search paths plus configured project roots. Deny all other paths before stat, directory listing, or existence disclosure. |
| Devtools production policy | Devtools are enabled by default only in development/test. Production requires explicit `DEVTOOLS_ENABLED=true`, and exposed devtools still use the shared CORS policy. |
| MCP production defaults/config wiring | `mcp-server/src/index.ts` parses env security settings and passes them to `startHttpTransport`. Production Docker enables origin validation and rate limiting by default. Auth remains opt-in for MDT-156. Stdio is unchanged. |
| MCP origin validation without origins | If `MCP_SECURITY_ORIGIN_VALIDATION=true` and `MCP_ALLOWED_ORIGINS` is absent or empty, MCP HTTP must fail startup with a configuration error. Do not silently allow all origins and do not start with an empty allowlist that breaks clients opaquely. |
| MCP `/sessions` visibility | `/sessions` is hidden or denied outside development unless MCP HTTP auth is enabled and the request is authenticated. |
| MCP rate-limit key semantics | Rate limiting is caller-aware in MDT-156. Keys must include caller identity such as authenticated token fingerprint when auth is enabled, otherwise origin plus remote address, not tool name alone. |
| Config/maintenance endpoints | MDT-156 applies minimum safe filtering/gating. Client config reads remain compatible but avoid unnecessary sensitive path disclosure; production maintenance/debug mutation endpoints require explicit opt-in until MDT-157 auth exists. |
| Secret scan scope | Scan tracked `.env`, config, Docker, compose, and documentation files. Remove confirmed tracked secrets in MDT-156; defer rotation policy to MDT-157 or an ops follow-up. |
| Dependency audit threshold | Target production/runtime high and critical vulnerabilities. DOMPurify, express-rate-limit, and path-to-regexp must resolve to patched versions when present, or unresolved breaking upgrades must be recorded as follow-up decisions. |
| Existing test suites | All existing unit and E2E suites remain required after MDT-156. Any environment-specific exclusion must name the suite, reason, and follow-up owner in the test-stage artifact. |

## Config, Maintenance, and Debug Endpoint Policy

| Route | Allowed environments | Opt-in env var | Fields to filter | Unauthorized or disabled response |
|-------|----------------------|----------------|------------------|-----------------------------------|
| `GET /api/config` | development, test, production | none | Omit secrets/tokens; avoid returning unnecessary absolute host paths beyond client-required project/discovery configuration. | Not disabled by MDT-156; malformed/unavailable config uses existing 4xx/5xx handling without sensitive details. |
| `GET /api/config/global` | development, test, production | none | Omit secrets/tokens; redact sensitive absolute paths where not needed by the UI; do not include raw env values. | Not disabled by MDT-156; malformed/unavailable config uses existing 4xx/5xx handling without sensitive details. |
| `GET /api/config/selector` | development, test, production | none | Omit secrets/tokens; return only selector state needed by the UI. | Not disabled by MDT-156; unavailable selector state uses existing 4xx/5xx handling without sensitive details. |
| `POST /api/config/selector` | development, test, production | none | Request/response must not echo secrets/tokens or expanded unrelated host paths. | Not disabled by MDT-156; validation failures return 400 without sensitive details. |
| `POST /api/config/clear` | development, test only by default; production only with explicit opt-in | `MAINTENANCE_ENDPOINTS_ENABLED=true` | Response must not include deleted file contents, secret values, or expanded unrelated host paths. | 404 or 403 with a generic disabled message in production when opt-in is absent. |
| `POST /api/cache/clear` | development, test only by default; production only with explicit opt-in | `MAINTENANCE_ENDPOINTS_ENABLED=true` | Response must include only operation status/counts needed by clients; no cache contents or sensitive paths. | 404 or 403 with a generic disabled message in production when opt-in is absent. |
| Devtools routes under `/api/devtools/*`, including log streams and frontend session controls | development/test by default; production only with explicit opt-in | `DEVTOOLS_ENABLED=true` | Omit secrets/tokens from logs where feasible; never add wildcard CORS; avoid exposing full host topology beyond debug necessity. | 404 or 403 with a generic disabled message in production when opt-in is absent. |
| Other debug or maintenance routes added later | development/test by default; production only with explicit opt-in | `MAINTENANCE_ENDPOINTS_ENABLED=true` or a route-specific explicit flag | Filter secrets/tokens, raw env values, expanded unrelated host paths, and file contents unless the route specifically owns that data. | 404 or 403 with a generic disabled message in production when opt-in is absent. |

`404` is preferred when hiding route existence is practical; `403` is acceptable when clients already depend on the route shape. In both cases, responses must avoid detailed filesystem paths, secret material, and stack traces in production.

## Canonical Runtime Flows

### CORS for REST, SSE, and devtools

1. `server/server.ts` constructs the allowed-origin policy from built-in local origins and `PUBLIC_ORIGIN`.
2. `server/security/originPolicy.ts` owns the origin decision for REST CORS and stream routes.
3. `server/routes/sse.ts` and `server/routes/devtools.ts` ask the same policy before writing stream headers.
4. Requests with no `Origin` remain allowed for curl, server-to-server calls, and local tooling.
5. Disallowed browser origins do not receive matching `Access-Control-Allow-Origin` and cannot read streams.

### Filesystem browsing and existence checks

1. `server/security/filesystemAccess.ts` builds allowed roots from discovery search paths plus configured project roots.
2. Incoming paths are expanded only as needed, normalized, and resolved to canonical real paths.
3. Authorization checks containment against canonical allowed roots before any directory listing or existence result is returned.
4. Symlink escapes, encoded traversal, Unicode-normalized escapes, and outside-root paths return 403 without existence or expanded-path leakage.
5. `ProjectService` continues to provide directory listing behavior for authorized paths without a public API change.

### MCP HTTP hardening

1. `mcp-server/src/index.ts` parses MCP HTTP security env vars and passes a full config object into the HTTP transport.
2. Production Docker sets origin validation and rate limiting on by default.
3. If origin validation is enabled and `MCP_ALLOWED_ORIGINS` is absent or empty, startup fails closed with a clear configuration error.
4. Requests without `Origin` continue to work subject to auth/rate-limit configuration after a valid allowlist exists.
5. Optional bearer auth uses timing-safe token comparison when enabled.
6. `/sessions` is development-only unless protected by enabled auth.
7. Rate limiting uses caller-aware keys instead of only tool names.

### Backend headers and operational endpoints

1. `server/server.ts` sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` for backend responses.
2. `server/routes/system.ts` keeps UI-required config reads compatible but filters unnecessary sensitive detail.
3. Cache clear, config clear, debug, and maintenance-style mutations are disabled in production unless explicitly opted in.

### Dependency and secret hygiene

1. `package.json` and `bun.lock` own resolved dependency posture.
2. Runtime production high/critical advisories are the MDT-156 threshold.
3. Secret scanning is verification-owned and covers tracked `.env`, config, Docker, compose, and documentation files.

### Existing suite preservation

1. `/mdt:tests` must include a handoff for existing unit and E2E suites after MDT-156 changes.
2. The default expectation is that all existing suites pass.
3. Any exclusion must document suite name, reason, environment constraint, and owner for follow-up.

## Structure

```text
server/
  server.ts                         # Express bootstrap, headers, shared CORS policy wiring
  security/
    originPolicy.ts                 # Single allowed-origin decision for REST and streams
    filesystemAccess.ts             # Canonical allowed-root and containment checks
  routes/
    sse.ts                          # SSE stream uses shared origin policy
    devtools.ts                     # Devtools gating and stream CORS
    system.ts                       # Filesystem, config, and maintenance endpoint boundaries
  controllers/
    ProjectController.ts            # Controller handoff after filesystem authorization

shared/
  services/
    ProjectService.ts               # Existing directory behavior; no public API surface expansion

mcp-server/src/
  index.ts                          # Env-to-transport security config wiring
  transports/
    http.ts                         # HTTP security defaults, sessions policy
    middleware.ts                   # Timing-safe optional auth
  utils/
    rateLimitManager.ts             # Caller-aware rate-limit keys

docker-compose.yml                  # Development compatibility defaults
docker-compose.prod.yml             # Production MCP security defaults
package.json / bun.lock             # Runtime dependency resolution
docs/DOCKER_GUIDE.md                # Docker migration guidance
docs/MCP_SERVER_GUIDE.md            # MCP HTTP security defaults and env docs
```

## Module Boundaries

- `originPolicy.ts` owns origin allow/deny decisions. Routes must not hand-write wildcard CORS headers.
- `filesystemAccess.ts` owns allowed-root calculation and canonical containment. Routes must not stat or list user paths before authorization.
- `ProjectService` remains a domain/file listing service, not the security policy owner.
- MCP HTTP security config is owned by `mcp-server/src/index.ts` and `mcp-server/src/transports/http.ts`; stdio behavior must remain independent.
- Production exposure decisions for devtools and maintenance endpoints stay in server route/bootstrap boundaries until MDT-157 introduces full auth.

## Runtime vs Test Scaffolding

Runtime changes belong in `server/`, `shared/`, `mcp-server/`, Docker compose files, and package manifests. Tests should live in the existing server, MCP, and E2E test locations and should verify CORS, canonical path containment, symlink escape denial, headers, MCP config wiring, MCP fail-start on missing allowed origins, `/sessions` visibility, caller-aware rate limits, dependency thresholds, tracked-file secret scan evidence, and existing unit/E2E suite preservation.

## Architecture Invariants

- No `Access-Control-Allow-Origin: *` on SSE or devtools stream responses.
- No filesystem existence, directory entries, or expanded absolute path details for outside-root requests.
- Allowed filesystem roots are exactly discovery search paths plus configured project roots.
- Canonical realpath containment is required before sensitive filesystem responses.
- No shared service layer public API surface change for MDT-156.
- MCP stdio remains unaffected by HTTP auth, origin validation, and rate limiting.
- MCP HTTP fails startup when origin validation is enabled without configured allowed origins.
- MDT-156 does not introduce general backend authentication or authorization; MDT-157 owns that model.
- Production debug and maintenance surfaces must be disabled unless explicitly opted in.
- Existing unit and E2E suites remain required unless `/mdt:tests` documents an explicit suite exclusion with reason and owner.

## Extension Rule

Add new security-sensitive HTTP surfaces by first selecting an existing boundary owner. New browser-readable streams use `originPolicy.ts`; new filesystem probes use `filesystemAccess.ts`; new MCP HTTP controls flow through the env-to-transport config path. Do not add per-route security decisions that bypass these owners.

## Verification Gate Notes

Architecture validation passed with `spec-trace validate MDT-156 --stage architecture --format json`. Canonical artifacts and obligations are in `architecture.trace.md`; this file is the human-facing design note only.
