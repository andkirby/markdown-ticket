# Auth Session Unlock

Owner/admin unlock surface for MDT-176. This spec covers the browser authentication step introduced after MDT-157 backend API auth. It prevents the locked backend from looking like an empty project list.

## Composition

```text
AppRoot
├── AuthStateProvider / auth-aware fetch boundary
│   ├── accessMode: unknown | locked | owner-admin | no-auth-dev | backend-down
│   ├── sessionStatus: checking | locked | unlocking | unlocked | error
│   └── unlock(token) / lock()
├── AppHeader
│   ├── Brand
│   ├── ProjectSelector / current project controls (conditional)
│   └── AuthStatusAction
│       ├── Locked chip + Unlock button
│       └── Owner session chip + Lock button
└── MainContent
    ├── AuthUnlockPanel (401 from `/api/projects`)
    ├── ProjectBoard/List/Documents (owner-admin or no-auth-dev)
    └── BackendDownState (network/5xx)

AuthUnlockPanel
├── Security icon / lock mark
├── Title: "Board is locked"
├── Description: server requires an owner access token
├── AccessTokenInput[type=password]
├── UnlockButton
├── InlineError (invalid token / session rejected)
└── HelpText (token is exchanged for secure cookie; not stored in browser storage)
```

## Source files

| Type | Proposed path |
|------|---------------|
| Auth state provider | `src/auth/AuthSessionProvider.tsx` |
| Fetch wrapper | `src/auth/authFetch.ts` |
| Unlock panel | `src/components/AuthUnlock/AuthUnlockPanel.tsx` |
| Auth status header action | `src/components/AuthUnlock/AuthStatusAction.tsx` |
| Backend session route | `server/routes/auth.ts` |
| Backend auth owner extension | `server/security/apiAuth.ts` |
| API tests | `server/tests/api/auth-session.test.ts` |
| E2E tests | `tests/e2e/auth/session-unlock.spec.ts` |

## State model

| State | Trigger | UI | Allowed actions |
|-------|---------|----|-----------------|
| `checking` | initial app load | skeleton or compact loading card | none |
| `locked` | `/api/projects` returns 401 | AuthUnlockPanel | enter token, retry, theme toggle |
| `unlocking` | unlock submitted | disabled token input, spinner button | cancel/clear optional |
| `error` | invalid token/session failure | AuthUnlockPanel with inline error | edit token, retry |
| `owner-admin` | session cookie accepted | normal app; owner chip in header | all admin actions, lock/logout |
| `no-auth-dev` | backend auth disabled, or legacy local backend has no `/api/auth/session` and still returns projects | normal app; no header auth chip; no unlock affordance | all current local-dev actions |
| `backend-down` | network error / 5xx | existing backend-down state | retry |

## Critical UX rules

1. Never show `Create Project` while `accessMode` is `unknown` or `locked`.
2. Never show "No Projects Found" for a `401` response.
3. `401` means authentication is required, not an empty project list.
4. MDT-176 must not invent public/read-only behavior; anonymous public project visibility belongs to MDT-172.
5. A failed unlock must keep the user on the same panel and preserve focus on the token input.
6. Logout/Lock must clear only the server session cookie; it must not mutate project data.

## Unlock flow

```text
User enters token
→ POST /api/auth/session { token }
→ Backend validates token using MDT-157 auth owner logic
→ Backend sets HttpOnly Secure SameSite=Strict cookie
→ Frontend discards raw token immediately
→ Frontend retries /api/projects with credentials: include
→ App renders owner/admin state
```

## Storage and security

| Item | Storage | Rule |
|------|---------|------|
| Raw admin token | not stored | held only in input state until submit; clear after response |
| Admin session | server-set cookie | `HttpOnly; Secure; SameSite=Strict`; `Path=/api` preferred |
| Access mode | React memory | derived from session check/API responses |
| Remember-me | out of scope | no persistent browser token storage |

The frontend must not write the token to `localStorage`, `sessionStorage`, indexedDB, URL params, telemetry logs, or visible error text.

## Layout

### Locked panel

- Centered card in main content, max width `sm:max-w-lg`.
- Use `bg-card`, `border-border`, `rounded-xl`, `shadow-sm`.
- Title: `text-2xl font-semibold tracking-tight`.
- Description: `text-sm text-muted-foreground`.
- Token input row: password input with visible label "Access token".
- Primary action: full-width or right-aligned `Unlock` button using `bg-primary text-primary-foreground`.
- Help text: small muted copy; include "Token is exchanged for a secure server session. It is not stored in this browser.".
- Error text: `text-destructive`, short and generic: "Token was not accepted.".

### Header auth action

- Locked: small outline chip "Locked" + `Unlock` button.
- Owner/admin: small success/neutral chip "Owner session" + secondary `Lock` button.

## Copy

| Context | Copy |
|---------|------|
| Locked title | `Board is locked` |
| Locked body | `This server requires an owner access token before projects can be managed.` |
| Input label | `Access token` |
| Button | `Unlock` |
| Invalid token | `Token was not accepted.` |
| Help | `Your token is exchanged for a secure server session and is not stored in browser storage.` |

## Accessibility

- Token input has a visible label and `autocomplete="current-password"` or `autocomplete="off"` based on implementation security decision.
- Error text is announced with `role="alert"`.
- Unlock button is disabled while submitting and while token field is empty.
- Focus moves to token input when locked state first appears.
- Header Lock action is keyboard reachable and has confirmation only if session-sensitive work is in progress.

## MDT-172 boundary

This surface owns authentication state only. It must not decide which projects are public and must not expose read-only sharing labels before MDT-172 exists.

MDT-176 active states are limited to:

| API/auth result | UI |
|------------|----|
| `401` | `AuthUnlockPanel` |
| auth disabled / local no-auth | normal app with no auth header chrome |
| owner/admin session | normal project list and admin actions |
| backend 5xx/network failure | backend unavailable state |

Future MDT-172 may add anonymous public project states, but those states require their own authorization contract and copy.

## Verification hooks

- `data-testid="auth-unlock-panel"`
- `data-testid="auth-token-input"`
- `data-testid="auth-unlock-submit"`
- `data-testid="auth-unlock-error"`
- `data-testid="auth-status-chip"`
- `data-testid="auth-lock-button"`
- Existing `add-project-modal` must not be reachable in locked/anonymous states.

## Legacy/local fallback rule

If `/api/auth/session` is missing (`404`) while `/api/projects` still returns normal project data, the UI must not label the app as public/read-only. That state means the local backend is running without the new session endpoint or auth is effectively off, so the header hides auth chrome and the unlock affordance.
