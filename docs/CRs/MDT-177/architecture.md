# Architecture

## Overview

MDT-177 uses a bounded read-access service around the existing read-session cookie. Named read access, one-time invites, and origin selection are owned by a new read-token route/store slice; project visibility and write denial remain enforced by the existing backend access boundary.

Pattern: owner-managed capability records plus additive read-session grants. The persistent capability is never browser-readable after creation, and every public exchange produces or merges an HttpOnly `mdt_read_session` cookie.

## Structure

```text
server/
  security/
    readTokenStore.ts        # durable named token and invite owner
    readSession.ts           # signed read cookie, merge helper, expiry policy
    apiAuth.ts               # owner/read-only access boundary
    projectSharing.ts        # project visibility and sanitization
    publicLinkOrigins.ts     # server-approved generated link origin options
  routes/
    readTokens.ts            # owner management and public invite exchange
    auth.ts                  # owner session and env read-token compatibility
    share.ts                 # share-link session exchange
  server.ts                  # route mounting order
src/
  App.tsx                    # /invite route and read-only owner-unlock overlay owner
  auth/AuthSessionProvider.tsx
  components/
    SettingsModal.tsx
    SettingsModal/ReadAccessTokens.tsx
    AuthUnlock/*
    ProjectSelector/*
tests/
  e2e/sharing/read-access-journey.spec.ts
  e2e/utils/selectors.ts
domain-contracts/
  src/access/schema.ts       # access vocabulary and read-token API DTO owner
```

Runtime code owns token/session behavior. The Playwright spec and selector constants are test scaffolding only and must not become production dependencies.

## Domain Contracts Boundary

`domain-contracts/src/access/schema.ts` owns schema-first boundary shapes shared across frontend, backend, and tests:

- access-mode and session-status vocabulary
- owner/read-only capability flags
- public-link-origin response options
- read-token list, create, invite, and invite-session response DTOs

Server policy remains outside `domain-contracts`: route allow/deny decisions, cookie parsing/signing, read-session merge behavior, and read-token store persistence internals stay in `server/security/*` and `server/routes/*`.

## Read Token Store

Owner module: `server/security/readTokenStore.ts`.

Store path: `${CONFIG_DIR}/auth/read-access-tokens.json`, where `CONFIG_DIR` resolves through `getDefaultPaths()` so tests keep isolated config directories.

Format: versioned JSON, atomically written.

```json
{
  "version": 1,
  "tokens": [
    {
      "id": "rtok_...",
      "name": "Bob",
      "tokenHash": "sha256-hex",
      "projectRefs": ["MDT", "DOCS"],
      "expiresAt": "2026-06-01T00:00:00.000Z",
      "createdAt": "2026-05-23T00:00:00.000Z",
      "revokedAt": null
    }
  ],
  "invites": [
    {
      "id": "inv_...",
      "tokenId": "rtok_...",
      "codeHash": "sha256-hex",
      "expiresAt": "2026-05-23T00:15:00.000Z",
      "createdAt": "2026-05-23T00:00:00.000Z",
      "consumedAt": null,
      "revokedAt": null
    }
  ]
}
```

Persistent raw tokens and invite codes are never stored. Creating a named token returns the raw token once in the owner response; after the creation result is dismissed, list responses show only name, project scope, expiry, and status.

## Invite Lifecycle

Invite codes are generated as high-entropy random values, stored only as hashes, and expire quickly. Exchange performs one atomic store update: find unconsumed code, verify expiry, verify owning token is active, set `consumedAt`, then issue the read session.

Invalid, expired, consumed, revoked, or configuration-failed invite exchange returns one generic failure. No raw code, token, or owner credential is logged, placed in URL history after exchange, or written to browser-readable storage.

## Route Shape

`server/routes/readTokens.ts` owns both owner management and public invite exchange.

Owner routes, mounted behind `/api` auth:

- `GET /api/read-tokens`
- `POST /api/read-tokens`
- `POST /api/read-tokens/:tokenId/invites`
- `POST /api/read-tokens/:tokenId/revoke`

Public route, mounted before the owner auth gate:

- `POST /api/read-tokens/invites/:code/session`

The public invite route uses `publicTokenExchangeRateLimit`. Owner management remains unavailable to anonymous, read-only, and share-link-only visitors.

Frontend route:

- `/invite/:code` exchanges with the public route, writes no browser storage, then replaces history with a code-free `/prj/:projectCode` destination before project content renders.

## Read Session Merge

`server/security/readSession.ts` owns read-cookie merge behavior. Existing direct cookie writers should move to a helper that:

- reads the current valid `mdt_read_session` cookie
- unions `projectRefs` and `shareIds`
- removes duplicates
- computes the next cookie expiry as the earliest expiry among active grants
- issues a fresh signed HttpOnly SameSite=Lax cookie

`server/routes/share.ts`, `server/routes/readTokens.ts`, and the existing env read-token exchange in `server/routes/auth.ts` must all use this helper. Opening a share link while token-scoped adds the share grant without replacing token project access.

## Env Token Compatibility

`API_READ_TOKEN_HASHES` remains supported. Its format and `/api/auth/read-token` endpoint are not deprecated by MDT-177.

The env-token path keeps using `parseReadTokenScopes()` and `resolveReadTokenScope()`, but session issuance changes to the shared merge helper. Named token lookup is additive and must not require changes to existing env deployments.

## Origin Selection

`server/security/originPolicy.ts` remains the policy source. MDT-177 adds a public-link view of origins:

- current browser origin is usable only when `originPolicy.isAllowedOrigin(currentOrigin)` accepts it
- configured public origin comes from `PUBLIC_ORIGIN` in runtime configuration
- local default origins are valid for CORS but excluded from configured public link choices
- public-link origin must be a full origin; host-only expansion is not part of the sharing runtime contract
- generated link bases that are not allowed are rejected

When `PUBLIC_ORIGIN` exists, Settings uses the server-selected origin and does not show a domain picker. When no configured public origin exists, the current origin is usable only if the server origin policy accepts it. When no valid public origin exists, share and invite URL generation is withheld.

## Settings Sharing UI

`src/components/SettingsModal.tsx` keeps the owner-only Sharing tab. `src/components/SettingsModal/ReadAccessTokens.tsx` owns the named read-access section:

- create named access with name, multi-project scope, and optional expiry
- show one-time raw token/invite result after creation or invite generation
- list name, project scope, expiry, active/expired/revoked status, invite action, and revoke action
- disable invite generation for expired or revoked records
- use the server-selected link origin for both share links and invite links

Read-only visitors never reach Settings; backend authorization still enforces this.

## Unlock State

Read-only owner unlock is not the same state as full locked startup.

State ownership:

- `src/App.tsx` owns overlay open/close and overlay error state so route, selected project, and view mode remain stable.
- `src/auth/AuthSessionProvider.tsx` owns session exchange and access-mode transitions.
- `AuthStatusAction` opens the overlay for read-only mode and the existing full locked panel for locked mode.
- `AuthUnlockPanel` supports a modal owner-unlock variant with Cancel, Escape, backdrop close, generic owner-token error, and no read-token fallback.

The owner-upgrade submit path posts only to `/api/auth/session`. A bad owner token must not clear the existing read session or move the visitor to a full locked screen.

Owner Lock is the reverse downgrade, not a global access clear. It deletes the owner session, reloads backend-filtered visible projects, and leaves public/share/read-token access active. If the current project remains visible, the same board/list/documents route stays mounted with owner controls removed and the read-only badge shown. If no non-owner project remains visible, the UI converges to the locked unlock panel.

## Project Selector

ProjectSelector remains a display and navigation surface, not an authorization layer. Visible projects come from backend-filtered `/api/projects`:

- anonymous: public projects only
- share link: active share grant plus public projects
- named read token: token projects plus public projects
- named read token plus share link: union of token, public, and share-linked projects
- owner/admin: all projects

Read-only modes can switch among visible projects without another token prompt. Favorite writes and mutable controls are suppressed outside owner/admin mode. Private and unlisted projects without a grant must be absent, not disabled placeholders.

## Authorization Boundary

Backend authorization remains authoritative:

- `apiAuth.ts` denies read-only mutation candidates and owner-only routes
- `projectSharing.ts` filters invisible projects and sanitizes path/config metadata
- `readTokens.ts` checks owner access for all management endpoints
- `share.ts` and invite exchange expose only sanitized read-only project data

Frontend hiding improves UX but is never the security boundary.

## Verification Ownership

`tests/e2e/sharing/read-access-journey.spec.ts` is architecture-owned E2E coverage for MDT-177 and must carry into the tests stage. It covers named token creation, invite URL cleanup, project switching, share merge, unlock cancel, bad unlock recovery, origin selection, revoke/invalid invite paths, and read-only control suppression.

`tests/e2e/utils/selectors.ts` owns the stable selector contract for the Settings token UI, invite exchange error, read-only badge, and owner-unlock overlay.

`domain-contracts/src/access/__tests__/schema.test.ts` owns schema coverage for shared access/read-token DTOs. It prevents server and UI code from reintroducing parallel contract interfaces.

## Invariants

- Persistent named read tokens are hash-only on disk.
- Invite codes are hash-only, short-lived, single-use, and consumed atomically.
- Raw tokens, invite codes, and owner tokens are never written to logs or browser-readable storage.
- Read-session grants merge by set union and use earliest active expiry.
- Revocation and expiry are enforced on invite exchange, direct named-token exchange, and the next session refresh/check.
- `API_READ_TOKEN_HASHES` compatibility remains unless a later CR records deprecation.
- Generated public links use only accepted origins.
- Backend filtering and mutation denial remain the privacy and write security boundary.

## Extension Rule

Future account/RBAC work must add a separate identity model instead of overloading named read tokens. Named read access remains single-owner capability sharing with read-only project grants.
