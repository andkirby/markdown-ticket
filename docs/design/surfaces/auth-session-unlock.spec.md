# Auth Session Unlock

Owner/admin and scoped read-token unlock surface for browser authentication. It prevents auth-required backends from looking like empty project lists and gives read-only visitors an owner-upgrade path.

## Composition

```text
AppRoot
├── AuthStateProvider / auth-aware fetch boundary
│   ├── accessMode: unknown | locked | read-only | owner-admin | no-auth-dev | backend-down
│   ├── sessionStatus: checking | locked | unlocking | unlocked | error
│   └── unlock(token) / lock()
├── AppHeader
│   ├── Brand
│   ├── ProjectSelector / current project controls (conditional)
│   └── AuthStatusAction
│       ├── Locked chip + Unlock button
│       ├── Read-only chip + Unlock button
│       └── Owner session chip + Lock button
└── MainContent
    ├── AuthUnlockPanel (owner unlock request or owner-only 401)
    ├── ReadOnlyProjectBoard/List/Documents (public share or scoped read token)
    ├── ProjectBoard/List/Documents (owner-admin or no-auth-dev)
    └── BackendDownState (network/5xx)

AuthUnlockPanel
├── Security icon / lock mark
├── Title: "Board is locked"
├── Description: server accepts an owner token or scoped read token
├── AccessTokenInput[type=password]
├── UnlockButton
├── InlineError (invalid token / session rejected)
└── HelpText (tokens are exchanged for secure cookies; not stored in browser storage)
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
| `locked` | user selects Unlock, or protected owner route returns 401 | AuthUnlockPanel | enter token, retry, theme toggle |
| `unlocking` | unlock submitted | disabled token input, spinner button | cancel/clear optional |
| `error` | invalid token/session failure | AuthUnlockPanel with inline error | edit token, retry |
| `read-only` | anonymous public project, share session, or accepted read token | normal app with read-only chip; owner actions hidden | view, search, sort, open tickets/docs, unlock with owner token |
| `owner-admin` | session cookie accepted | normal app; owner chip in header | all admin actions, lock/logout |
| `no-auth-dev` | backend auth disabled, or legacy local backend has no `/api/auth/session` and still returns projects | normal app; no header auth chip; no unlock affordance | all current local-dev actions |
| `backend-down` | network error / 5xx | existing backend-down state | retry |

## Critical UX rules

1. Never show `Create Project` while `accessMode` is `unknown` or `locked`.
2. Never show "No Projects Found" for a `401` response.
3. `401` means authentication is required, not an empty project list.
4. Read-only sessions must never expose owner-only project mutation controls.
5. A failed unlock must keep the user on the same panel and preserve focus on the token input.
6. Logout/Lock must clear only the server session cookie; it must not mutate project data.

## Unlock flow

```text
User enters token
→ POST /api/auth/session { token }
→ Backend validates token using MDT-157 auth owner logic
→ If owner token is valid, backend sets HttpOnly Secure SameSite=Strict owner cookie
→ If owner token is rejected, frontend retries POST /api/auth/read-token { token }
→ If read token is valid, backend sets HttpOnly SameSite=Lax read-session cookie
→ Frontend discards raw token immediately
→ Frontend retries /api/projects with credentials: include
→ App renders owner/admin or read-only state
```

## Storage and security

| Item | Storage | Rule |
|------|---------|------|
| Raw admin token | not stored | held only in input state until submit; clear after response |
| Admin session | server-set cookie | `HttpOnly; Secure; SameSite=Strict`; `Path=/api` preferred |
| Read session | server-set cookie | `HttpOnly; SameSite=Lax`; scoped to project refs or share IDs; `Path=/api` |
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
- Help text: small muted copy; include "Tokens are exchanged for a secure server session. They are not stored in browser storage.".
- Error text: `text-destructive`, short and generic: "Token was not accepted.".

### Header auth action

- Locked: small outline chip "Locked" + `Unlock` button.
- Read-only: small outline chip "Read only" + `Unlock` button. The button opens the same panel for owner-token upgrade.
- Owner/admin: small success/neutral chip "Owner session" + secondary `Lock` button.

## Copy

| Context | Copy |
|---------|------|
| Locked title | `Board is locked` |
| Locked body | `This server accepts an owner token for management or a read token for scoped read-only access.` |
| Input label | `Access token` |
| Button | `Unlock` |
| Invalid token | `Token was not accepted.` |
| Help | `Tokens are exchanged for a secure server session and are not stored in browser storage.` |

## Accessibility

- Token input has a visible label and `autocomplete="current-password"` or `autocomplete="off"` based on implementation security decision.
- Error text is announced with `role="alert"`.
- Unlock button is disabled while submitting and while token field is empty.
- Focus moves to token input when locked state first appears.
- Header Lock action is keyboard reachable and has confirmation only if session-sensitive work is in progress.

## Read-only boundary

This surface owns authentication state and token entry only. Project visibility is still decided by backend project-sharing rules.

| API/auth result | UI |
|------------|----|
| `401` from owner-only context | `AuthUnlockPanel` |
| public/share/read token accepted | normal app in read-only mode |
| auth disabled / local no-auth | normal app with no auth header chrome |
| owner/admin session | normal project list and admin actions |
| backend 5xx/network failure | backend unavailable state |

## Verification hooks

- `data-testid="auth-unlock-panel"`
- `data-testid="auth-token-input"`
- `data-testid="auth-unlock-submit"`
- `data-testid="auth-unlock-error"`
- `data-testid="auth-status-chip"`
- `data-testid="auth-lock-button"`
- `data-testid="auth-unlock-affordance"`
- Existing `add-project-modal` must not be reachable in locked/anonymous states.

## Legacy/local fallback rule

If `/api/auth/session` is missing (`404`) while `/api/projects` still returns normal project data, the UI must not label the app as public/read-only. That state means the local backend is running without the new session endpoint or auth is effectively off, so the header hides auth chrome and the unlock affordance.
