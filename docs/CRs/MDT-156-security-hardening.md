---
code: MDT-156
status: Implemented
dateCreated: 2026-05-01T01:19:58.522Z
type: Architecture
priority: High
dependsOn: MDT-157
relatedTickets: MDT-157
---

# Harden security: CORS, filesystem access, secrets, dependency patches

## 1. Description

### Requirements Scope
`full`

### Problem
- SSE and devtools endpoints override CORS to `*`, bypassing the server-level allowlist and allowing any website to subscribe to real-time file change events
- Directory browsing (`/api/directories`) and path existence (`/api/filesystem/exists`) APIs accept arbitrary filesystem paths with no restriction, enabling full host filesystem reconnaissance
- MCP production Docker runs with origin validation and rate limiting disabled by default
- Multiple dependency vulnerabilities: DOMPurify < 3.3.2 (XSS bypasses), path-to-regexp < 8.4.0 (ReDoS), express-rate-limit < 8.2.2 (IPv6 bypass)
- Backend Express responses include no security headers

### Affected Areas
- `server/` — CORS enforcement, filesystem route restrictions, security headers, error handling
- `mcp-server/` — HTTP transport origin validation and rate limiting defaults
- `shared/` — input validation utilities
- `src/` — DOMPurify upgrade (dependency)
- Docker configs — security defaults in docker-compose

### Scope

**In scope:**
- Restrict filesystem APIs to configured project paths only
- Fix CORS override in SSE and devtools endpoints
- Enable MCP origin validation and rate limiting by default in production Docker
- Patch critical/high dependency vulnerabilities (DOMPurify, path-to-regexp, express-rate-limit)
- Add security headers to backend Express responses

**Out of scope:**
- Authentication and authorization (see MDT-157)
- TLS/HTTPS termination (handled by reverse proxy)
- Content Security Policy for frontend (separate concern)
- Overhauling the devtools subsystem architecture

## 2. Desired Outcome

### Success Conditions
- Filesystem browsing APIs only expose paths within configured project directories
- SSE and devtools endpoints respect the CORS allowlist (no `*` override)
- MCP production Docker config enables origin validation and rate limiting by default
- No secrets or tokens exist in tracked files
- DOMPurify >= 3.3.2, express-rate-limit >= 8.2.2, path-to-regexp >= 8.4.0
- Backend responses include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`

### Constraints
- Must maintain backward compatibility with existing local development workflow
- Must not break existing MCP client integrations
- Must work behind nginx reverse proxy (X-Forwarded-* headers)
- Must not require changes to the shared service layer API surface

### Non-Goals
- Authentication mechanism (MDT-157)
- Multi-tenant or RBAC authorization model
- End-to-end encryption or TLS configuration
- Rate limiting on the backend Express server (MCP only)

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Filesystem restriction | Allowlist (project dirs only) vs. blocklist (deny /etc, .ssh, etc.)? | Allowlist preferred — more secure default |
| Dev CORS | Should SSE/devtools use same CORS middleware as main app, or separate config? | Must not break SSE reconnect behavior |
| Dependency bumps | Which transitive deps can be bumped without breaking changes? | Must pass existing test suite |

### Known Constraints
- Existing `PUBLIC_ORIGIN` env var pattern should be reused
- Docker compose files are user-facing config — changes should be documented

### References
- [Security audit research](MDT-156/security-audit-research.md) — source audit for the CORS, filesystem, MCP, dependency, Docker, and header findings

### Decisions Deferred
- Specific filesystem restriction implementation (`/mdt:architecture`)
- Detailed test plan for security controls (`/mdt:tests`)
- Task breakdown and implementation order (`/mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] Unauthenticated request to `GET /api/directories?path=/etc` returns 403 (path outside project dirs)
- [ ] SSE endpoint (`GET /api/events`) enforces CORS allowlist, not `*`
- [ ] Devtools endpoints enforce CORS allowlist, not `*`
- [ ] MCP production Docker enables origin validation and rate limiting
- [ ] Backend responses include `X-Content-Type-Options` and `X-Frame-Options` headers

### Non-Functional
- [ ] Existing MCP stdio transport unaffected (no auth prompt)
- [ ] All existing E2E and unit tests pass after changes

### Edge Cases
- [ ] Requests with no `Origin` header still work (curl, server-to-server)
- [ ] Symbolic links within project directories do not bypass path restrictions
- [ ] URL-encoded or Unicode-normalized paths do not bypass `..` checks

## 5. Verification

### How to Verify Success
- Manual verification: `curl http://localhost:3001/api/directories?path=/etc` returns 403
- Manual verification: confirm SSE events not receivable from unauthorized origin
- Automated verification: unit tests for CORS enforcement, path restriction logic
- Automated verification: `bun audit` returns 0 critical/high findings in production dependencies
