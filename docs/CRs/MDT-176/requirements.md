# Requirements: MDT-176

**Source**: [MDT-176](../MDT-176-browser-auth-session-unlock.md)  
**Generated**: 2026-05-23

## Overview

MDT-176 adds a browser unlock flow for the MDT-157 authenticated backend. The user-facing behavior is simple: a locked backend must look locked, accept an owner token once, establish a server-managed browser session, and hide admin actions until owner access exists. The scope stays authentication-only so MDT-176 can ship before MDT-172 public sharing.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md storage/security model; tests.md browser storage and log-safety checks |
| C2 | architecture.md cookie contract; tests.md Set-Cookie flag assertions |
| C3 | architecture.md backend auth boundary; tests.md MDT-157 token-rule preservation |
| C4 | architecture.md mutation security section; tests.md CSRF mitigation verification |
| C5 | architecture.md MDT-172 compatibility boundary; tasks.md implementation sequencing |
| C6 | architecture.md regression invariants; tests.md MDT-157 preservation suite |
| C7 | architecture.md out-of-scope guard; tasks.md scope verification |
| C8 | architecture.md/docs plan; tests.md or review checklist for operator documentation |
| C9 | tests.md isolated auth-enabled Playwright E2E plan; tasks.md E2E setup guard |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Delivery order | MDT-176 delivers auth/session state before MDT-172 authorization/sharing. | Wait for MDT-172 before browser unlock. | Locked backend recovery is needed now and must not depend on sharing rules. |
| Locked vs empty | `401` from project loading means locked/auth-required. | Treat `401` like an empty project list. | Prevents misleading “No Projects Found” and admin create affordances. |
| Public sharing boundary | Future anonymous public project visibility belongs to MDT-172, not MDT-176. | Use any `200` project list as admin capability or expose read-only labels now. | MDT-172 may expose public projects without granting writes, but this CR only handles locked, owner, local no-auth, and backend-down states. |
| Owner session | Valid owner token is exchanged for a server-managed cookie. | Store the admin token in browser storage or URL state. | Raw admin token must not persist in the browser. |
| Cookie security | Owner session cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` in HTTPS/production. | Relax flags for convenience in production. | Cookie auth protects write-capable owner access. |
| Invalid token | Invalid unlock uses generic rejection UI and generic auth failure. | Reveal token format, length, expected value, or closeness. | Avoids credential disclosure. |
| Admin controls | Project-management actions require owner session or no-auth-dev mode. | Show controls and let backend reject. | UI must not invite actions that are unavailable while locked/anonymous. |
| Logout/lock | Lock clears the server session and returns to locked state without project mutation. | Treat lock as project state change. | Logout is auth state only. |
| Local no-auth | Auth-disabled local/dev mode loads normally without unlock. | Require unlock for all environments. | Preserves MDT-157 local compatibility. |
| CSRF | Cookie-authenticated mutations require an explicit mitigation decision and verification. | Rely on cookie auth without CSRF analysis. | Cookie auth changes browser mutation risk. |
| Operator docs | Documentation covers enabling auth, unlock flow, cookie/security behavior, logout, and local no-auth mode. | Leave session behavior discoverable only from code/tests. | Operators need safe setup and troubleshooting guidance. |
| Browser auth E2E | Locked, unlock, invalid unlock, logout, and hidden admin controls are verified through isolated auth-enabled Playwright E2E coverage with `API_SECURITY_AUTH`/`API_AUTH_TOKEN` configured only for those tests. | Add a new frontend unit-test framework or change the default no-auth E2E suite. | Project testing policy uses Playwright E2E for frontend behavior, and default no-auth E2E compatibility must remain stable. |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `API_SECURITY_AUTH` | Enables backend REST API authentication. | Existing MDT-157 behavior. | Local/test no-auth compatibility remains; non-local migration warning behavior is preserved. |
| `API_AUTH_TOKEN` | Owner/admin token accepted for unlock exchange and existing header auth. | None. | Auth-enabled startup/config must fail closed rather than accepting all requests. |
| Owner session cookie | Server-managed browser session credential. | Architecture must define name/path/TTL. | No browser owner session exists; user must unlock with token when auth is enabled. |

## Validation Summary

**Scope coverage**
- Endpoints found: `POST /api/auth/session`, `GET /api/projects`, protected `/api/*` routes via session cookie, logout/lock session clearing. Covered by canonical requirements.
- Error codes found: `401 Authentication required` and invalid session/token rejection. Covered by locked-state and generic-auth-failure requirements.
- User-input fields found: access token input. Covered by unlock, invalid-token, no-storage, and accessibility/focus requirements.

**Quality checks**
- Each canonical requirement uses one `shall`.
- Outcomes are measurable by API status, UI state, cookie flags, storage checks, and control visibility.
- Behavior requirements avoid implementation component names.
- Delivery timing is `In This Ticket` for all canonical records.
- Full-scope non-ambiguity decisions are recorded above.
- Constraints have stable IDs and downstream carryover targets.
- Only behavior requirements route to BDD; constraints and edge cases route to tests.
- Security constraints cover token storage, cookie flags, MDT-157 token-rule reuse, and CSRF.
- Browser auth behavior is routed to isolated auth-enabled Playwright E2E coverage without introducing a new frontend unit framework.
- No clarification blockers remain for requirements.

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
