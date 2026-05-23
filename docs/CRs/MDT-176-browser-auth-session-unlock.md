---
code: MDT-176
status: Implemented
dateCreated: 2026-05-22T21:39:55.803Z
type: Feature Enhancement
priority: High
---

# Add browser auth session unlock

## 1. Description

### Requirements Scope
`full`

### Problem
MDT-157 now protects backend API routes with token-based authentication, but the web UI has no way to recognize or recover from `401 Authentication required` responses. When locked, the app can still render misleading empty states such as "No Projects Found" and expose admin actions like "Create Project" even though the backend rejects those calls.

### Desired Outcome
When the backend is locked, the UI should clearly show an authentication-required state and let the owner unlock the browser session securely. The preferred long-term design is a server-managed session:

1. User submits the admin access token once.
2. Backend validates the token through `POST /api/auth/session`.
3. Backend sets an `HttpOnly; Secure; SameSite=Strict` session cookie.
4. Frontend never stores the raw admin token in `localStorage`, `sessionStorage`, or URL state.
5. Subsequent API calls authenticate through the session cookie.

### Affected Areas
- `src/` — locked/unauthenticated UI state, API fetch handling, admin-action visibility
- `server/` — session exchange endpoint and session-cookie validation
- `tests/` — API/session tests and frontend/E2E locked-state tests
- `docs/` — auth/session operator documentation

### Scope

**In scope:**
- Add `POST /api/auth/session` for token-to-cookie exchange
- Validate submitted token using the existing MDT-157 backend auth token rules
- Set session cookie as `HttpOnly; Secure; SameSite=Strict` in production
- Add session-cookie recognition to backend API auth middleware
- Add frontend locked state when project loading returns `401`
- Replace misleading "No Projects Found" / "Create Project" unauthenticated state with access-token input
- Hide admin actions until authenticated owner session is established
- Add logout/lock action that clears the session cookie
- Preserve local development no-auth behavior when auth is disabled

**Out of scope:**
- Public read-only sharing and project visibility filtering (MDT-172)
- Multi-user accounts, RBAC, OAuth, password login
- Token rotation or long-lived refresh-token system
- Storing admin tokens in browser storage

## 2. Acceptance Criteria

### Functional
- [ ] Anonymous user hitting a locked backend sees "Board is locked" or equivalent, not "No Projects Found"
- [ ] Locked state provides an access-token input and unlock action
- [ ] Valid token creates a server session and loads projects without exposing the raw token to frontend storage
- [ ] Invalid token shows an inline error without leaking expected token details
- [ ] Admin-only actions such as Create Project are hidden or disabled until unlocked
- [ ] Logout/lock clears the session and returns UI to locked state
- [ ] Local/dev no-auth mode still loads without unlock prompt

### Security
- [ ] Backend sets session cookie with `HttpOnly`, `SameSite=Strict`, and `Secure` in HTTPS/production
- [ ] Raw admin token is never written to `localStorage`, `sessionStorage`, query params, logs, or visible error messages
- [ ] Session validation reuses MDT-157 auth owner logic rather than adding a second credential parser
- [ ] CSRF risk is considered for cookie-authenticated mutation routes

### MDT-172 Boundary
- [ ] Public/read-only sharing remains out of scope for MDT-176
- [ ] Auth-enabled anonymous access stays locked until an owner session exists
- [ ] If anonymous `GET /api/projects` returns `401`, show unlock state
- [ ] Create Project remains hidden until owner session exists

## 3. Verification

> Requirements trace projection: [requirements.trace.md](./MDT-176/requirements.trace.md)
>
> Requirements notes: [requirements.md](./MDT-176/requirements.md)
>
> BDD trace projection: [bdd.trace.md](./MDT-176/bdd.trace.md)
>
> BDD notes: [bdd.md](./MDT-176/bdd.md)
>
> Architecture trace projection: [architecture.trace.md](./MDT-176/architecture.trace.md)
>
> Architecture notes: [architecture.md](./MDT-176/architecture.md)
>
> Tests trace projection: [tests.trace.md](./MDT-176/tests.trace.md)
>
> Tests notes: [tests.md](./MDT-176/tests.md)
>
> Tasks trace projection: [tasks.trace.md](./MDT-176/tasks.trace.md)
>
> Tasks breakdown: [tasks.md](./MDT-176/tasks.md)

- API tests for `POST /api/auth/session`, invalid token, cookie flags, logout, and protected route access via session cookie
- Frontend/unit tests for 401-to-locked-state handling
- E2E tests for locked board, successful unlock, invalid unlock, logout, and hidden Create Project while unauthenticated
- Security checks proving no browser storage contains the raw token
