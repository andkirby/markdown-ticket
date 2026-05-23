# Assessment: MDT-176

## Verdict

**Recommendation**: Option 2 — Redesign Inline

## Feature Pressure

### Target Feature Needs
- Add a browser-safe owner unlock flow: `POST /api/auth/session` exchanges the existing admin token for an `HttpOnly` session cookie, then discards the raw token client-side.
- Teach the backend API auth gate to accept the session cookie without weakening MDT-157 header-token behavior or local no-auth compatibility.
- Add frontend auth/access state so `401` from `/api/projects` renders a locked state instead of empty project UI.
- Hide owner/admin actions until an owner session or no-auth-dev mode is established.
- Add logout/lock behavior that clears only the server session cookie.
- Keep MDT-172 public sharing out of MDT-176 runtime behavior.
- Update auth/session operator documentation for enabling auth, unlocking browser sessions, cookie/security behavior, logout, and local no-auth mode.

### Current System Assumptions
- `server/security/apiAuth.ts` authenticates protected `/api` routes centrally but only accepts `Authorization: Bearer` and `X-API-Key` credentials.
- `GET /api/status` and `GET /api/health` are the only current unauthenticated API exemptions.
- Frontend API calls are scattered across hooks/services/components and mostly call `fetch` directly without an auth-aware wrapper or `401` semantic model.
- Root empty state treats `projects.length === 0` as “No Projects Found” and exposes Create Project when the backend is merely locked.
- Admin controls are UI-visible based on selected-project presence, not authenticated capability.
- E2E infrastructure normally runs no-auth test backend; auth-enabled browser flows need explicit opt-in setup.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | Backend has a clean central auth seam, but frontend lacks a single auth/session boundary. |
| Extension Fit | Concerning | Session exchange fits `apiAuth`, but `/api/auth/session` needs a deliberate exemption/mount point and the UI needs an auth provider/fetch wrapper. |
| Dependency Fit | Healthy | No new package is required if cookie parsing/serialization and HMAC/session token work use existing Express/Node APIs. |
| Verification Fit | Concerning | MDT-157 backend auth tests exist, but frontend locked/unlock/logout behavior and auth-enabled E2E harness coverage are missing. |
| Redesign Scope | Concerning | Redesign is bounded to auth middleware/session helpers, frontend API boundary, root/header action gating, and auth-specific tests. |

## Mismatch Points

### Backend API auth middleware
- Current system assumes: Protected API authentication is header-token-only, with health/status as the only public route exemptions.
- Feature needs: A session exchange endpoint plus cookie-authenticated protected routes and logout.
- Mismatch: If mounted behind the current `/api` auth gate, `POST /api/auth/session` cannot be called anonymously; if cookies are accepted ad hoc in routes, auth ownership splits across layers.
- Adjustment required: Extend `server/security/apiAuth.ts` with session-cookie extraction/validation and explicit auth-session route exemptions or mount auth routes before the protected gate while keeping shared validation utilities.
- Scope: bounded

### Frontend fetch and auth state boundary
- Current system assumes: API calls can throw generic HTTP errors and UI decides empty/error states locally.
- Feature needs: `401` must mean locked/auth-required, clear current project data, render unlock UI, and retry after session creation using `credentials: include`.
- Mismatch: `useProjectManager` fetches `/api/projects` directly; `dataLayer`, ticket operations, documents, config, and modal code also use raw `fetch`, so `401` handling would drift if patched call-by-call.
- Adjustment required: Add a small auth-aware fetch/session boundary and migrate touched API call sites enough to centralize credentials and `401` signaling.
- Scope: bounded

### Root empty state and admin controls
- Current system assumes: Zero visible projects means configuration-empty and can show Create Project.
- Feature needs: locked, owner-admin, no-auth-dev, and backend-down are distinct access modes with different controls.
- Mismatch: `RedirectToCurrentProject`, `SecondaryHeader`, `HamburgerMenu`, `ProjectSelector`, and modals do not receive capabilities/access mode.
- Adjustment required: Gate Add/Edit/Create/settings/admin actions behind owner-admin or no-auth-dev capability; route `401` to `AuthUnlockPanel`; defer anonymous/public copy to MDT-172.
- Scope: bounded

### Cookie-authenticated mutation safety
- Current system assumes: Tokens are sent intentionally in headers; CSRF is not part of MDT-157 because browser cookies are not an auth mechanism there.
- Feature needs: Cookie-authenticated write routes must consider CSRF.
- Mismatch: Adding cookies changes browser request behavior for mutations.
- Adjustment required: Architecture must specify same-site cookie flags plus mutation protection, preferably Origin/Host validation and/or a same-origin custom-header/CSRF check for cookie-authenticated non-GET requests.
- Scope: bounded

### Verification harness
- Current system assumes: API auth tests can opt into env vars; E2E tests generally run no-auth.
- Feature needs: API session tests and browser E2E locked/unlock/logout tests under auth-enabled backend config.
- Mismatch: Existing E2E helpers/selectors do not model auth state, and auth-enabled backend env must be isolated from the regular no-auth suite.
- Adjustment required: Add focused auth-session API tests and an auth E2E spec with explicit env/setup path and selectors from the design spec.
- Scope: bounded

## Dependency and Tooling Pressure

- New packages: none required. Avoid adding cookie/session packages unless architecture proves manual Express/Node handling is insufficient.
- Runtime/config impact: add session-cookie name/secret/TTL decisions; preserve existing `API_SECURITY_AUTH` and `API_AUTH_TOKEN`; production cookie must be `HttpOnly`, `SameSite=Strict`, and `Secure` when HTTPS/production.
- Testing/E2E impact: add auth-enabled server tests; add auth-specific frontend/E2E selectors and setup; update helpers to avoid treating `401` as backend-down.
- Documentation impact: update operator-facing auth/session docs for auth setup, browser unlock, cookie/security behavior, logout, and local no-auth mode.
- Main risk introduced: cookie auth can create CSRF and stale-session ambiguity if session validation and mutation protection are not centralized in the backend auth boundary.

## Verification Gaps

- Preservation tests needed:
  - MDT-157 header auth still works after adding session cookies.
  - Local/test no-auth mode still returns projects without unlock prompt.
  - `/api/status` and `/api/health` remain public and minimal.
  - Invalid/missing session cookies fail closed.
- E2E/contract drift risks:
  - `401` accidentally renders existing “No Projects Found” or exposes Create/Add Project.
  - Raw token is retained in browser storage, URL, logs, or component state after submit.
  - SSE/EventSource behavior after unlock/logout may not follow cookie/session state.
  - Future MDT-172 anonymous `200` empty list may be confused with locked `401`.
- Safe-to-refactor now?: yes, if architecture first defines the auth provider/fetch boundary, backend session contract, and cookie mutation protection before implementation.

## Recommendation

### Option 1: Integrate As-Is
Use when: not recommended; the feature crosses backend auth, frontend state, and admin action visibility, so call-by-call patches would duplicate auth semantics.
Architecture impact: not minimal.

### Option 2: Redesign Inline
Use when: current backend auth seam is usable but the browser-session feature needs a bounded auth/session slice designed inside MDT-176.
Architecture must redesign: `server/security/apiAuth.ts` session handling, `server/routes/auth.ts` or equivalent auth route mounting, frontend auth state provider/fetch wrapper, root locked/anonymous states, and admin action gating.
Expected scope added: bounded design work before implementation; no prerequisite CR required.

### Option 3: Redesign First
Use when: not recommended now; the mismatch is not foundational enough to split because MDT-157 already centralized backend auth and MDT-172 compatibility is documented.
Reason redesign cannot wait: not applicable.
Preferred path: continue with `mdt:architecture MDT-176`, explicitly covering the inline redesign items above.
