# Auth Session Guide

MDT-176 adds a browser-friendly owner session on top of the existing MDT-157 API token authentication. It lets an operator enable backend auth with one owner token, unlock the browser UI once, and use a secure server-issued cookie for later API calls.

## Scope

This feature is single-owner token-to-cookie browser session support only. It does not add OAuth, RBAC, password login, token rotation, refresh tokens, or a multi-user account model.

Non-goals:

- No OAuth.
- No RBAC.
- No password login.
- No token rotation.
- No refresh tokens.
- No multi-user account model.

## Enable backend auth

Set backend auth with environment variables on the backend service:

```bash
API_SECURITY_AUTH=true
API_AUTH_TOKEN="set-by-operator"
```

Use a deployment secret manager or local `.env` file appropriate for your environment. Do not put the token in a browser URL, bookmark, localStorage, sessionStorage, or frontend configuration.

When `API_SECURITY_AUTH=true`, `API_AUTH_TOKEN` is required. If `API_SECURITY_AUTH` is unset but `API_AUTH_TOKEN` is present, backend auth is also enabled for compatibility with MDT-157 token-auth deployments.

Existing API clients may continue to authenticate with either:

- `Authorization: Bearer <operator-token>`
- `X-API-Key: <operator-token>`

Header-token API clients do not use the browser session cookie and do not need the browser CSRF intent header.

## Browser unlock flow

1. Open the MDT browser UI.
2. If backend auth is enabled and no session cookie is present, the board shows the locked state.
3. Enter the owner token in the unlock panel.
4. The browser sends `POST /api/auth/session` with the token in the request body.
5. On success, the backend returns an owner session cookie and the UI refreshes project state as an owner session.
6. On failure, the UI stays locked and shows a generic “Token was not accepted” style error. The raw admin token is not echoed.

The raw admin token is used only for the unlock exchange. It must not be stored in localStorage, sessionStorage, URL state, logs, telemetry, or visible error text.

## Session API

### `GET /api/auth/session`

Returns whether backend auth is enabled and whether the current browser request has a valid owner session.

### `POST /api/auth/session`

Exchanges the configured owner token for a browser owner session cookie. Invalid or missing tokens return a generic authentication failure.

### `DELETE /api/auth/session`

Locks owner/admin access for the browser. The backend invalidates current owner sessions and clears the owner cookie. The UI clears owner-only state, hides admin controls, and reloads visible projects.

If public, share, or scoped read-token access still exposes the current project, the UI stays on the same board/list/documents route in read-only mode. It returns to the locked unlock panel only when no non-owner project access remains. When backend auth is disabled for local development, no browser unlock UI is shown.

## Cookie behavior

The owner session cookie is server-issued and opaque to the browser UI. It contains a signed session payload, not the raw admin token.

Cookie attributes:

- `HttpOnly` so frontend JavaScript cannot read it.
- `SameSite=Strict` to reduce cross-site request risk.
- `Path=/api` so it is only sent to API routes.
- `Secure` when the request is HTTPS or the backend is running in production. Local non-HTTPS development may omit `Secure` so local testing works.
- Finite max age; logout clears it with `DELETE /api/auth/session`.

## CSRF protection for browser cookie sessions

Cookie-authenticated non-GET API mutations require both:

- an allowed `Origin`; and
- `X-MDT-Owner-Intent: 1`.

The frontend `authFetch` boundary adds the owner intent header for browser mutation requests. Configure the deployment origin with `PUBLIC_ORIGIN` when serving from a production domain. Local development origins are allowed by default.

Bearer and `X-API-Key` API clients are authenticated by their request headers and are not rejected for missing `X-MDT-Owner-Intent` when no owner session cookie is used.

## Frontend mutation integration

New write-capable UI must use the auth-session capability model:

- Use `useAuthSession()` capability flags such as `canWriteTickets`, `canManageProjects`, `canManageSharing`, and `canUseOwnerEndpoints`.
- Do not mount owner-only forms, modals, filesystem pickers, or settings panels for read-only or locked visitors.
- Use `authFetch` or an approved API wrapper for `/api/*` calls.
- Pass `ownerIntent: true` for browser-session mutations.
- Keep read-only recovery intact: owner unlock from read-only is a modal/menu journey, not a full locked-page trap.

Before shipping a new edit form, also update the relevant UX surface spec and include tests that prove read-only visitors cannot see the form and cannot call the backend mutation directly.

## Logout / lock behavior

Use the UI Lock / Logout action to end the browser owner session. It calls `DELETE /api/auth/session`, clears the owner cookie, disconnects stale owner event streams, and reloads project state without owner-only controls.

After logout, protected owner-only API calls return to locked/denied behavior until the operator unlocks again. Public and read-token access remain available according to sharing rules.

## Local no-auth development

For local development, leave `API_SECURITY_AUTH` and `API_AUTH_TOKEN` unset, or set:

```bash
API_SECURITY_AUTH=false
```

In local no-auth mode, the browser loads normally without the unlock panel and owner controls remain available for the local developer. Do not use local no-auth mode for exposed or production deployments.

If `API_AUTH_TOKEN` is set while `API_SECURITY_AUTH` is unset, backend auth is enabled. Remove the token or set `API_SECURITY_AUTH=false` when intentionally testing no-auth local mode.

## Docker and production notes

For Docker production deployments, set `API_SECURITY_AUTH=true` and provide `API_AUTH_TOKEN` to the backend container through environment management. See [DOCKER_GUIDE.md](DOCKER_GUIDE.md#security-configuration) for Docker-specific wiring and [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md#auth-sessions-during-development) for local development behavior.

Never bake the owner token into a frontend image or publish it in documentation, screenshots, URLs, or browser storage.

## MDT-172 sequencing and compatibility

MDT-176 shipped before MDT-172. MDT-176 added authentication state, browser unlock, logout, and response semantics for locked/owner states. MDT-172 added public project filtering and read-only authorization. Current code must treat owner lock as a downgrade to the best available non-owner access, not as unconditional full lockout.
