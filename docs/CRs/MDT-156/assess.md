# Assessment: MDT-156

## Verdict

**Recommendation**: Option 2 — Redesign Inline

## Feature Pressure

### Target Feature Needs
- Enforce one backend CORS decision across normal REST routes, SSE, and devtools streams without breaking no-origin curl/server clients.
- Restrict filesystem discovery APIs to safe configured roots using canonical path containment, including symlink escape resistance.
- Wire MCP HTTP security defaults from environment/config into production Docker while preserving stdio and local client compatibility.
- Patch vulnerable runtime dependencies and add baseline backend security headers without broad authentication work.
- Scan tracked files for committed secrets across `.env`, config, Docker, compose, and documentation files; remediate confirmed tracked secrets in MDT-156, but defer broader secret rotation policy to MDT-157 or a follow-up ops ticket.

### Current System Assumptions
- Backend CORS is centralized in `server/server.ts`, but SSE and devtools manually write stream headers and override origin handling.
- Project selection APIs assume local trusted use and currently browse/check arbitrary host paths for setup convenience.
- MCP HTTP transport has optional origin/auth/rate-limit controls, but startup passes only the port and production compose leaves controls disabled/commented.
- Dependency and header hardening is treated as operational hygiene, not a first-class security boundary.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | Each fix has an owner, but the ticket spans backend routes, shared path services, MCP transport, Docker, and package manifests. |
| Extension Fit | Concerning | CORS and filesystem restrictions need shared boundary helpers rather than more per-route special cases. |
| Dependency Fit | Concerning | Runtime dependency updates and MCP Docker/env defaults affect deployment behavior, but do not require a new runtime architecture. |
| Verification Fit | Critical | Security boundaries need preservation tests for CORS, canonical path containment, Docker/env config, and headers before implementation is safe. |
| Redesign Scope | Concerning | Redesign is bounded to security seams in the same CR; it is not foundational because auth/RBAC remains deferred to MDT-157. |

## Mismatch Points

### Backend CORS and streaming routes
- Current system assumes: Express CORS middleware protects API routes, while SSE/devtools can write complete stream headers directly.
- Feature needs: SSE and devtools must respect the same allowlist as the rest of the backend, while no-origin requests remain allowed.
- Mismatch: Manual `Access-Control-Allow-Origin: *` headers bypass the server-level allowlist.
- Adjustment required: Extract or inject a shared allowed-origin decision into streaming route setup and avoid wildcard stream headers.
- Scope: bounded

### Filesystem browsing and existence APIs
- Current system assumes: Directory browsing is a trusted local convenience and may resolve user-provided absolute paths.
- Feature needs: `/api/directories` and `/api/filesystem/exists` must only reveal paths inside allowed roots and must resist `..`, encoding, Unicode, and symlink escapes.
- Mismatch: Existing checks validate existence/discovery metadata after resolving arbitrary paths, which still leaks host filesystem structure.
- Adjustment required: Add a canonical path-boundary utility and define allowed roots before stat/read operations; likely include configured discovery search paths plus configured project roots for setup compatibility.
- Scope: bounded

### New-project setup flow
- Current system assumes: The user can browse from home or arbitrary paths to select a new project directory.
- Feature needs: Browsing must be restricted, but adding a project may require navigating outside existing project roots.
- Mismatch: A strict project-roots-only allowlist would satisfy security but break project creation for not-yet-configured projects.
- Adjustment required: Architecture must settle the allowed-root policy, with discovery search paths as the likely setup-safe boundary.
- Scope: bounded

### MCP HTTP transport and Docker defaults
- Current system assumes: MCP HTTP security controls are optional and can be enabled manually by callers/config.
- Feature needs: Production Docker should enable origin validation and rate limiting by default, startup should pass env-derived security config into `startHttpTransport`, token comparison should be timing-safe when auth is enabled, `/sessions` visibility should be limited outside development, and rate limits should use caller-aware keys rather than only tool names.
- Mismatch: `mcp-server/src/index.ts` currently calls HTTP transport with only `{ port }`, so transport options are not wired through startup; auth middleware compares tokens with normal string equality; `/sessions` policy and rate-limit key semantics are not settled.
- Adjustment required: Centralize MCP HTTP config parsing, pass security options explicitly, preserve stdio behavior, use timing-safe token comparison in MDT-156 if auth middleware is touched, decide `/sessions` exposure in architecture, and either make rate-limit keys caller-aware in MDT-156 or explicitly defer that deeper policy to MDT-157/follow-up.
- Scope: bounded

### Devtools production exposure
- Current system assumes: Devtools routes are registered as normal backend routes and remain available unless deployment/networking prevents access.
- Feature needs: Production deployments should not expose logs, frontend session controls, or streaming debug surfaces by default.
- Mismatch: The current route registration model does not encode a production exposure policy.
- Adjustment required: Architecture must decide whether devtools are disabled automatically when `NODE_ENV=production` or require explicit `DEVTOOLS_ENABLED=true` opt-in.
- Scope: bounded

### Config and maintenance endpoint exposure
- Current system assumes: Config and maintenance endpoints are trusted local operational surfaces.
- Feature needs: MDT-156 must decide whether to reduce immediate information disclosure and mutation risk before MDT-157 authentication.
- Mismatch: Endpoints such as config reads, selector state, cache clearing, and related maintenance actions may expose topology or mutate server state without auth.
- Adjustment required: Next-stage architecture must choose either minimum filtering/gating in MDT-156 or explicitly defer full authorization to MDT-157 while documenting residual risk.
- Scope: bounded

### Dependency and response-header hardening
- Current system assumes: Security posture is partly handled by frontend nginx and dependency ranges/lock state.
- Feature needs: Backend direct responses need minimum headers, and runtime dependency versions must meet patched thresholds.
- Mismatch: Backend Express does not set required headers; dependency state must be verified at lockfile/runtime level, not only by package ranges.
- Adjustment required: Add minimal Express header middleware or tuned `helmet`, and update/verify runtime dependency resolution.
- Scope: local

## Dependency and Tooling Pressure

- New packages: none required; `helmet` is optional but manual headers satisfy current acceptance criteria with less dependency pressure.
- Runtime/config impact: MCP HTTP startup must parse and pass origin validation, allowed origins, rate limiting, and auth-related env values; production Docker defaults change behavior; devtools exposure policy may add `DEVTOOLS_ENABLED` or equivalent config.
- Testing/E2E impact: Add route-level tests for CORS and headers, path-boundary unit tests with symlink/canonical cases, MCP transport config tests, and a tracked-file secret scan covering `.env`, config, Docker, compose, and docs files.
- Main risk introduced: Over-tightening filesystem or MCP defaults could break local project setup or existing MCP HTTP clients.

## Verification Gaps

- Preservation tests needed: SSE CORS allow/deny behavior, devtools stream CORS behavior, devtools production-disabled or explicit-opt-in behavior, no-origin request behavior, `/api/directories` outside-root denial, `/api/filesystem/exists` outside-root denial without path leaks, symlink escape denial, backend security headers, MCP env-to-transport config, timing-safe auth comparison coverage if auth middleware changes, `/sessions` visibility policy coverage, and tracked-file secret scan evidence.
- E2E/contract drift risks: Project selector/browse UI may drift if discovery roots replace arbitrary home browsing; MCP client integrations may drift if production Docker enables stricter defaults without clear allowed origins; devtools workflows may drift if production gating is applied too broadly.
- Safe-to-refactor now?: no; architecture should define the boundaries first and tests should lock compatibility before implementation.

## Recommendation

### Option 1: Integrate As-Is
Use when: only adding headers and dependency bumps.
Architecture impact: minimal, but this does not cover the filesystem, CORS stream, or MCP default mismatches in MDT-156.

### Option 2: Redesign Inline
Use when: the CR keeps authentication out of scope but redesigns bounded security seams for CORS, filesystem boundaries, MCP HTTP config, and verification.
Architecture must redesign: shared backend CORS origin decision, canonical filesystem allowlist policy, MCP HTTP env/default mapping, devtools production exposure policy, config/maintenance minimum filtering or defer decision, and security regression test seams.
Expected scope added: no ticket scope change required; the existing MDT-156 scope already names these seams, but architecture must make the boundary decisions explicit before code changes.

### Option 3: Redesign First
Use when: MDT-156 is expanded to authentication/RBAC, multi-tenant authorization, or a broader project-discovery model rewrite.
Reason redesign cannot wait: not applicable under current scope; the current mismatches are serious but bounded.
Preferred path: same CR normal architecture flow, then tests and tasks.
