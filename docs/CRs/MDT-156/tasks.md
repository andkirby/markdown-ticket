# Tasks: MDT-156

**Source**: canonical architecture/tests/bdd state + [tasks.trace.md](./tasks.trace.md)
**Mode**: normal

## Scope Boundaries

- MDT-156 hardens existing unauthenticated surfaces; it must not introduce the general authentication/RBAC model owned by MDT-157.
- Security-audit finding #11, development containers running as root, is out of MDT-156 implementation scope unless production runtime high/critical criteria require it; track a follow-up ops/Docker hardening ticket if desired.
- Backend CORS, SSE, devtools, filesystem, config/maintenance, and header behavior must remain compatible with local development and no-Origin clients.
- MCP stdio must remain unaffected by HTTP transport security changes.
- Docker/MCP production behavior changes must be documented with migration guidance.
- Implementation may create executable tests, but this task breakdown itself does not edit product code.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| REST/SSE/devtools origin decision | `server/security/originPolicy.ts` | Task 1 owns helper; Task 2 imports it for devtools only. |
| Filesystem allowed-root containment | `server/security/filesystemAccess.ts` | Task 3 owns helper; routes/controllers must not duplicate containment logic. |
| Directory listing behavior | `shared/services/ProjectService.ts` | Task 3 adapts only after authorization; no security policy ownership moves into shared service. |
| MCP HTTP security config | `mcp-server/src/index.ts`, `mcp-server/src/transports/http.ts` | Task 4 owns config/defaults; Task 5 owns caller/session/auth internals. |
| MCP caller-aware rate limiting | `mcp-server/src/utils/rateLimitManager.ts` | Task 5 owns; no tool-name-only parallel limiter. |
| Production debug/maintenance gating | `server/routes/devtools.ts`, `server/routes/system.ts` | Task 2 owns; full auth remains MDT-157. |
| Dependency and secret hygiene | `package.json`, `bun.lock`, Docker/docs files | Task 6 owns; no broad dependency cleanup beyond runtime high/critical target. |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| `C1` | Task 1, Task 2 |
| `C2` | Task 1, Task 7 |
| `C3` | Task 3 |
| `C4` | Task 3 |
| `C5` | Task 3 |
| `C6` | Task 1, Task 4, Task 5 |
| `C7` | Task 2, Task 4, Task 5 |
| `C8` | Task 6 |
| `C9` | Task 5 |
| `C10` | Task 7 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|---------------|-------|------------|
| M1: Backend stream CORS baseline | `sse_stream_allows_configured_origin` (BR-1.1) | Task 1 | SSE stream allowed-origin scenario GREEN. |
| M2: Devtools and operational endpoint gating | `devtools_stream_allows_configured_origin` (BR-1.3) | Task 2 | Devtools allowed-origin scenario GREEN and production debug gating covered. |
| M3: Filesystem boundary | `directory_browse_denies_outside_root` (BR-2.1), `directory_browse_allows_inside_root` (BR-2.3) | Task 3 | Directory deny/allow scenarios GREEN. |
| M4: MCP production hardening | none | Task 4, Task 5 | MCP config, auth/session, rate-limit, and proxy tests GREEN. |
| M5: Hygiene and final regression gate | all scenarios | Task 6, Task 7 | Dependency/secret checks, security E2E, and existing-suite gate GREEN. |

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------:|---------:|----:|--------|
| `server/security/` | 2 | 2 | 0 | OK |
| `server/` | 1 | 1 | 0 | OK |
| `server/routes/` | 3 | 3 | 0 | OK |
| `server/controllers/` | 1 | 1 | 0 | OK |
| `shared/services/` | 1 | 1 | 0 | OK |
| `mcp-server/src/` | 1 | 1 | 0 | OK |
| `mcp-server/src/transports/` | 2 | 2 | 0 | OK |
| `mcp-server/src/utils/` | 1 | 1 | 0 | OK |
| root config | 4 | 4 | 0 | OK |
| `docs/` and ticket docs | 3 | 3 | 0 | OK |

Missing architecture files to create during implementation:

- `server/security/originPolicy.ts` — Task 1
- `server/security/filesystemAccess.ts` — Task 3

## Tasks

### Task 1: Backend security baseline and shared stream CORS policy

**Milestone**: M1 — Backend stream CORS baseline (BR-1.1)

**Structure**:
- `server/security/originPolicy.ts`
- `server/server.ts`
- `server/routes/sse.ts`
- `server/tests/security/originPolicy.test.ts`
- `server/tests/api/sse-cors.test.ts`
- `server/tests/api/security-headers.test.ts`
- `server/tests/api/reverse-proxy-compat.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-origin-policy-unit` -> `server/tests/security/originPolicy.test.ts`
- `TEST-sse-cors-api` -> `server/tests/api/sse-cors.test.ts`
- `TEST-backend-security-headers` -> `server/tests/api/security-headers.test.ts`
- `TEST-backend-reverse-proxy-compat` -> `server/tests/api/reverse-proxy-compat.test.ts`

**Makes GREEN (Behavior)**:
- `sse_stream_allows_configured_origin` -> `tests/e2e/security-hardening.spec.ts` (BR-1.1)

**Scope**: Create the single backend origin decision helper, wire backend security headers, and remove SSE wildcard CORS behavior.

**Boundary**: Owns REST/SSE origin policy and backend baseline headers only.

**Creates**:
- `server/security/originPolicy.ts`
- `server/tests/security/originPolicy.test.ts`
- `server/tests/api/sse-cors.test.ts`
- `server/tests/api/security-headers.test.ts`
- `server/tests/api/reverse-proxy-compat.test.ts`

**Modifies**:
- `server/server.ts`
- `server/routes/sse.ts`

**Must Not Touch**:
- `server/routes/devtools.ts`
- `server/routes/system.ts`
- `mcp-server/src/index.ts`
- `mcp-server/src/transports/http.ts`

**Create/Move**:
- Create `server/security/originPolicy.ts` as the only owner of allowed-origin decisions.
- Move duplicated allowed-origin logic out of stream routes into the helper by import, not copy.

**Exclude**: No authentication, no backend rate limiting, no CSP, no TLS/HSTS policy.

**Anti-duplication**: Import `originPolicy` from `server/security/originPolicy.ts`; do not copy allowlist parsing into `sse.ts` or devtools.

**Duplication Guard**:
- Check `server/server.ts` for existing CORS allowlist behavior before coding.
- If another route-local CORS helper exists, merge into `originPolicy.ts` before adding new logic.
- Verify no `Access-Control-Allow-Origin: *` remains in SSE handling.

**Verify**:

```bash
bun run --cwd server jest tests/security/originPolicy.test.ts tests/api/sse-cors.test.ts tests/api/security-headers.test.ts tests/api/reverse-proxy-compat.test.ts
bunx playwright test tests/e2e/security-hardening.spec.ts --project=chromium --grep "SSE stream allows"
```

**Done when**:
- [x] `TEST-origin-policy-unit` GREEN.
- [x] `TEST-sse-cors-api` GREEN.
- [x] `TEST-backend-security-headers` GREEN.
- [x] `TEST-backend-reverse-proxy-compat` GREEN with `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`, and `Host` cases.
- [x] `sse_stream_allows_configured_origin` GREEN.
- [x] No wildcard SSE CORS header remains.

### Task 2: Devtools CORS and production debug/config endpoint gating

**Milestone**: M2 — Devtools and operational endpoint gating (BR-1.3)

**Structure**:
- `server/routes/devtools.ts`
- `server/routes/system.ts`
- `server/server.ts`
- `server/security/originPolicy.ts`
- `server/tests/api/devtools-security.test.ts`
- `server/tests/api/config-maintenance-policy.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-devtools-policy-api` -> `server/tests/api/devtools-security.test.ts`
- `TEST-config-maintenance-policy` -> `server/tests/api/config-maintenance-policy.test.ts`

**Makes GREEN (Behavior)**:
- `devtools_stream_allows_configured_origin` -> `tests/e2e/security-hardening.spec.ts` (BR-1.3)

**Scope**: Apply shared CORS to devtools streams, gate devtools in production behind `DEVTOOLS_ENABLED=true`, and gate production maintenance/debug mutation endpoints behind `MAINTENANCE_ENDPOINTS_ENABLED=true`.

**Boundary**: Minimum filtering/gating only; full authorization remains MDT-157.

**Creates**:
- `server/tests/api/devtools-security.test.ts`
- `server/tests/api/config-maintenance-policy.test.ts`

**Modifies**:
- `server/routes/devtools.ts`
- `server/routes/system.ts`
- `server/server.ts`
- `server/security/originPolicy.ts`

**Must Not Touch**:
- `mcp-server/src/transports/http.ts`
- `shared/services/ProjectService.ts`
- `package.json`
- `bun.lock`

**Create/Move**:
- Add production gate checks near route registration or route entry points.
- Keep config read endpoints client-compatible while filtering sensitive response detail.

**Exclude**: No auth middleware, no RBAC roles, no frontend UI redesign.

**Anti-duplication**: Import origin behavior from `server/security/originPolicy.ts`; do not introduce a devtools-specific CORS allowlist.

**Duplication Guard**:
- Check devtools route registration before coding to avoid double-gating the same route.
- If config/maintenance gating logic is needed in multiple handlers, extract one local helper inside the route module.
- Verify devtools CORS remains covered by `OBL-cors-single-origin-policy`.

**Verify**:

```bash
bun run --cwd server jest server/tests/api/devtools-security.test.ts server/tests/api/config-maintenance-policy.test.ts
bunx playwright test tests/e2e/security-hardening.spec.ts --project=chromium --grep "Devtools stream allows"
```

**Done when**:
- [ ] `TEST-devtools-policy-api` GREEN.
- [ ] `TEST-config-maintenance-policy` GREEN.
- [ ] `devtools_stream_allows_configured_origin` GREEN.
- [ ] Production devtools disabled unless explicitly opted in.
- [ ] Production maintenance/debug mutation routes return generic 404 or 403 when disabled.

### Task 3: Canonical filesystem allowed-root enforcement

**Milestone**: M3 — Filesystem boundary (BR-2.1, BR-2.3)

**Structure**:
- `server/security/filesystemAccess.ts`
- `server/routes/system.ts`
- `server/controllers/ProjectController.ts`
- `shared/services/ProjectService.ts`
- `server/tests/security/filesystemAccess.test.ts`
- `server/tests/api/filesystem-boundary.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-filesystem-access-unit` -> `server/tests/security/filesystemAccess.test.ts`
- `TEST-filesystem-api-integration` -> `server/tests/api/filesystem-boundary.test.ts`

**Makes GREEN (Behavior)**:
- `directory_browse_denies_outside_root` -> `tests/e2e/security-hardening.spec.ts` (BR-2.1)
- `directory_browse_allows_inside_root` -> `tests/e2e/security-hardening.spec.ts` (BR-2.3)

**Scope**: Create canonical path authorization for discovery roots plus configured project roots and apply it before directory listing or existence checks.

**Boundary**: Security policy lives in `filesystemAccess.ts`; `ProjectService` remains directory behavior only.

**Creates**:
- `server/security/filesystemAccess.ts`
- `server/tests/security/filesystemAccess.test.ts`
- `server/tests/api/filesystem-boundary.test.ts`

**Modifies**:
- `server/routes/system.ts`
- `server/controllers/ProjectController.ts`
- `shared/services/ProjectService.ts`

**Must Not Touch**:
- `server/services/DocumentService.ts`
- `mcp-server/src/**`
- `src/**`

**Create/Move**:
- Add canonical realpath containment checks before `fs.stat` or `fs.readdir` on user-supplied paths.
- Route outside-root failures to 403 without directory entries, existence booleans, or expanded paths.

**Exclude**: No project-discovery UX rewrite and no shared service public API expansion.

**Anti-duplication**: Import containment helpers from `server/security/filesystemAccess.ts`; do not copy path-prefix checks into controller/service code.

**Duplication Guard**:
- Check existing `ProjectService.getSystemDirectories` behavior before coding.
- If any existing path validation exists, merge it into the helper or call it from the helper.
- Verify no second filesystem allowlist owner is introduced.

**Verify**:

```bash
bun run --cwd server jest server/tests/security/filesystemAccess.test.ts server/tests/api/filesystem-boundary.test.ts
bunx playwright test tests/e2e/security-hardening.spec.ts --project=chromium --grep "directory"
```

**Done when**:
- [ ] `TEST-filesystem-access-unit` GREEN.
- [ ] `TEST-filesystem-api-integration` GREEN.
- [ ] `/api/directories?path=/etc` returns 403 with no entries.
- [ ] `/api/filesystem/exists` outside-root returns 403 with no existence or expanded path.
- [ ] Symlink, encoded traversal, and Unicode-normalized escape cases deny.

### Task 4: MCP HTTP production config wiring and Docker documentation

**Milestone**: M4 — MCP production hardening

**Structure**:
- `mcp-server/src/index.ts`
- `mcp-server/src/transports/http.ts`
- `docker-compose.prod.yml`
- `docker-compose.yml`
- `docs/DOCKER_GUIDE.md`
- `docs/MCP_SERVER_GUIDE.md`
- `mcp-server/tests/http-security-config.test.ts`
- `docs/tests/mcp-docker-docs.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-mcp-http-config` -> `mcp-server/tests/http-security-config.test.ts`
- `TEST-docker-mcp-docs` -> `docs/tests/mcp-docker-docs.test.ts`

**Scope**: Wire MCP HTTP env security configuration, fail startup when origin validation lacks allowed origins, set production Docker defaults, and document migration behavior.

**Boundary**: HTTP transport only; stdio must remain independent.

**Creates**:
- `mcp-server/tests/http-security-config.test.ts`
- `docs/tests/mcp-docker-docs.test.ts`

**Modifies**:
- `mcp-server/src/index.ts`
- `mcp-server/src/transports/http.ts`
- `docker-compose.prod.yml`
- `docker-compose.yml`
- `docs/DOCKER_GUIDE.md`
- `docs/MCP_SERVER_GUIDE.md`

**Must Not Touch**:
- `mcp-server/src/tools/index.ts`
- `server/routes/**`
- `shared/services/ProjectService.ts`

**Create/Move**:
- Add env parsing in `mcp-server/src/index.ts` and pass explicit security config into HTTP transport.
- Add or update compose comments/defaults for origin validation, allowed origins, and rate limiting.

**Exclude**: No mandatory MCP auth in MDT-156 and no stdio behavior change.

**Anti-duplication**: Parse MCP HTTP config once at startup; do not duplicate env parsing inside multiple middlewares.

**Duplication Guard**:
- Check `mcp-server/src/transports/http.ts` for existing config options before adding fields.
- If Docker docs already describe env vars, update those sections instead of adding parallel docs.
- Verify production Docker enables origin validation and rate limiting by default.

**Verify**:

```bash
bun run --cwd mcp-server jest mcp-server/tests/http-security-config.test.ts
bun test docs/tests/mcp-docker-docs.test.ts
```

**Done when**:
- [ ] `TEST-mcp-http-config` GREEN.
- [ ] `TEST-docker-mcp-docs` GREEN.
- [ ] `MCP_SECURITY_ORIGIN_VALIDATION=true` with empty `MCP_ALLOWED_ORIGINS` fails startup clearly.
- [ ] Production Docker defaults and migration docs are aligned.

### Task 5: MCP auth session visibility rate-limit and reverse-proxy caller identity

**Milestone**: M4 — MCP production hardening

**Structure**:
- `mcp-server/src/transports/middleware.ts`
- `mcp-server/src/transports/http.ts`
- `mcp-server/src/utils/rateLimitManager.ts`
- `mcp-server/src/index.ts`
- `mcp-server/tests/http-auth-session-rate-limit.test.ts`
- `mcp-server/tests/http-reverse-proxy-caller-identity.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-mcp-auth-session-rate-limit` -> `mcp-server/tests/http-auth-session-rate-limit.test.ts`
- `TEST-mcp-reverse-proxy-caller-identity` -> `mcp-server/tests/http-reverse-proxy-caller-identity.test.ts`

**Scope**: Harden optional MCP auth comparison, hide `/sessions` outside development unless authenticated, and implement caller-aware rate-limit keys including reverse-proxy behavior.

**Boundary**: Does not add mandatory auth; only hardens existing optional HTTP auth behavior.

**Creates**:
- `mcp-server/tests/http-auth-session-rate-limit.test.ts`
- `mcp-server/tests/http-reverse-proxy-caller-identity.test.ts`

**Modifies**:
- `mcp-server/src/transports/middleware.ts`
- `mcp-server/src/transports/http.ts`
- `mcp-server/src/utils/rateLimitManager.ts`
- `mcp-server/src/index.ts`

**Must Not Touch**:
- `mcp-server/src/tools/index.ts`
- `server/**`
- `src/**`

**Create/Move**:
- Replace plain token equality with timing-safe comparison when auth is enabled.
- Add caller-aware key derivation that includes auth identity or origin plus remote/forwarded address.
- Apply `/sessions` visibility policy from architecture.

**Exclude**: No auth prompt for stdio clients and no new tool-level authorization model.

**Anti-duplication**: Use the existing rate-limit manager as the single limiter owner; do not add ad hoc per-route limiter state.

**Duplication Guard**:
- Check existing middleware order before adding new session/rate-limit checks.
- If caller identity extraction already exists, reuse it rather than adding a second extractor.
- Verify tool name alone is never the rate-limit key.

**Verify**:

```bash
bun run --cwd mcp-server jest mcp-server/tests/http-auth-session-rate-limit.test.ts mcp-server/tests/http-reverse-proxy-caller-identity.test.ts
```

**Done when**:
- [ ] `TEST-mcp-auth-session-rate-limit` GREEN.
- [ ] `TEST-mcp-reverse-proxy-caller-identity` GREEN.
- [ ] `/sessions` hidden outside development unless authenticated.
- [ ] `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`, and `Host` cases behave as specified.

### Task 6: Dependency threshold and tracked secret hygiene

**Milestone**: M5 — Hygiene and final regression gate

**Structure**:
- `package.json`
- `bun.lock`
- `docker-compose.prod.yml`
- `docker-compose.yml`
- `docs/DOCKER_GUIDE.md`
- `docs/MCP_SERVER_GUIDE.md`
- `server/tests/security/dependencyAudit.test.ts`
- `server/tests/security/trackedSecretScan.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-dependency-audit-runtime` -> `server/tests/security/dependencyAudit.test.ts`
- `TEST-secret-scan-tracked-files` -> `server/tests/security/trackedSecretScan.test.ts`

**Scope**: Patch runtime high/critical dependency thresholds and add tracked-file secret scan coverage for the MDT-156 scope.

**Boundary**: Runtime production high/critical target only; broader dev-only advisories, development-container-root hardening from security-audit finding #11, and secret rotation policy are follow-up unless required by the tests.

**Creates**:
- `server/tests/security/dependencyAudit.test.ts`
- `server/tests/security/trackedSecretScan.test.ts`

**Modifies**:
- `package.json`
- `bun.lock`
- `docker-compose.prod.yml`
- `docker-compose.yml`
- `docs/DOCKER_GUIDE.md`
- `docs/MCP_SERVER_GUIDE.md`

**Must Not Touch**:
- `src/components/MarkdownContent/**` except if a dependency API change requires import compatibility.
- `docs/CRs/MDT-156/security-audit-research.md` except as read-only scan input.
- Authentication or rotation policy docs owned by MDT-157.

**Create/Move**:
- Update resolved versions for DOMPurify, express-rate-limit, and path-to-regexp where present.
- Add tests that distinguish placeholders/examples from token-like real secrets.

**Exclude**: No broad `bun update` sweep beyond needed vulnerability closure without documenting risk.

**Anti-duplication**: Reuse one dependency-audit helper/test for thresholds; do not create package-specific one-off scripts for each dependency.

**Duplication Guard**:
- Check existing package audit scripts before adding new scan utilities.
- If a secret scanner helper already exists, reuse it.
- Verify unresolved breaking dependency upgrades are recorded rather than hidden.

**Verify**:

```bash
bun run --cwd server jest server/tests/security/dependencyAudit.test.ts server/tests/security/trackedSecretScan.test.ts
bun audit
```

**Done when**:
- [ ] `TEST-dependency-audit-runtime` GREEN.
- [ ] `TEST-secret-scan-tracked-files` GREEN.
- [ ] Runtime high/critical dependency threshold is met or follow-up is documented.
- [ ] No committed secrets/tokens remain in tracked MDT-156 scan scope.

### Task 7: Security E2E journey and existing suite preservation gate

**Skills**: playwright-skill

**Milestone**: M5 — Hygiene and final regression gate

**Structure**:
- `tests/e2e/security-hardening.spec.ts`
- `server/server.ts`
- `server/routes/sse.ts`
- `server/routes/devtools.ts`
- `server/routes/system.ts`
- `server/security/originPolicy.ts`
- `server/security/filesystemAccess.ts`
- `mcp-server/src/index.ts`
- `mcp-server/src/transports/http.ts`
- `package.json`
- `bun.lock`

**Makes GREEN (Automated Tests)**:
- `TEST-security-e2e` -> `tests/e2e/security-hardening.spec.ts`
- `TEST-existing-suite-preservation` -> `docs/CRs/MDT-156/tests.md`

**Makes GREEN (Behavior)**:
- `sse_stream_allows_configured_origin` -> `tests/e2e/security-hardening.spec.ts` (BR-1.1)
- `devtools_stream_allows_configured_origin` -> `tests/e2e/security-hardening.spec.ts` (BR-1.3)
- `directory_browse_denies_outside_root` -> `tests/e2e/security-hardening.spec.ts` (BR-2.1)
- `directory_browse_allows_inside_root` -> `tests/e2e/security-hardening.spec.ts` (BR-2.3)

**Scope**: Add the final E2E/API security journey and run/document existing suite preservation.

**Boundary**: This task is a final integration gate. It may only adjust implementation defects found by the listed tests, not expand feature scope.

**Creates**:
- `tests/e2e/security-hardening.spec.ts`

**Modifies**:
- `server/server.ts`
- `server/routes/sse.ts`
- `server/routes/devtools.ts`
- `server/routes/system.ts`
- `server/security/originPolicy.ts`
- `server/security/filesystemAccess.ts`
- `mcp-server/src/index.ts`
- `mcp-server/src/transports/http.ts`
- `package.json`
- `bun.lock`

**Must Not Touch**:
- `src/**` unless E2E route reachability requires a test hook already approved by the prior tasks.
- `mcp-server/src/tools/index.ts`
- Authentication/RBAC implementation files for MDT-157.

**Create/Move**:
- Place the E2E spec under `tests/e2e/` and use project test fixtures/isolation conventions.
- Document any suite exclusion with suite, reason, environment constraint, and owner.

**Exclude**: No new browser UI flows beyond security verification; no server restarts in task text beyond test commands.

**Anti-duplication**: Use existing E2E fixtures from `tests/e2e/fixtures/test-fixtures.ts`; do not create another Playwright fixture stack.

**Duplication Guard**:
- Check `tests/e2e/AGENTS.md` conventions before writing the E2E file.
- Check for existing security E2E coverage before creating a new file.
- Verify final fixes do not create alternate CORS/filesystem/MCP security owners.

**Verify**:

```bash
bunx playwright test tests/e2e/security-hardening.spec.ts --project=chromium
bun run --cwd server jest
bun run --cwd mcp-server jest
bun run --cwd mcp-server build
bun run build
bun run lint
bun run test:e2e
```

**Done when**:
- [ ] `TEST-security-e2e` GREEN.
- [ ] `TEST-existing-suite-preservation` GREEN.
- [ ] All four BDD scenarios GREEN.
- [ ] Existing suite exclusions, if any, list suite, reason, environment constraint, and owner.
- [ ] No duplicated runtime owner introduced.

## Post-Implementation

- [ ] No duplicated CORS, filesystem, MCP config, or rate-limit ownership.
- [ ] Scope boundaries respected; no MDT-157 auth/RBAC implementation added.
- [ ] All canonical `TEST-*` plans GREEN.
- [ ] All BDD scenarios GREEN.
- [ ] Existing unit and E2E suite preservation gate completed.
- [ ] Fallback/absence paths match requirements: no-Origin, missing MCP allowed origins, disabled production devtools/maintenance endpoints, outside-root filesystem requests.

## Task Breakdown Complete

**CR**: MDT-156
**Output**: `docs/CRs/MDT-156/tasks.trace.md` + `docs/CRs/MDT-156/tasks.md`
**Tasks**: 7 tasks
**Tracker**: not written because this run is constrained to `tasks.md` and `tasks.trace.md` only

**Next**: `/mdt:implement MDT-156` or `/mdt:implement-agentic MDT-156`
