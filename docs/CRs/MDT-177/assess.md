# Assessment: MDT-177

## Verdict

**Recommendation**: Option 2 — Redesign Inline

## Feature Pressure

### Target Feature Needs
- Add owner-managed named read access tokens with server-side hashed storage, multi-project scopes, expiry, revocation, and owner-only management routes.
- Add one-time invite links that exchange into `mdt_read_session`, expire quickly, are single-use, are rate-limited, and never expose persistent read tokens in URLs.
- Preserve existing read-session grants when a visitor opens an additional `/share/{shareId}` link.
- Make read-only owner unlock recoverable: cancel returns to the current board, and a bad owner token does not collapse the visitor into a locked dead end.
- Generate share and invite links from the current allowed origin or an owner-selected configured public origin from explicit public-link runtime configuration.
- Add Playwright journey coverage for public, unlisted, named-token, project-switching, share-merge, unlock cancel, bad unlock recovery, and URL cleanup flows.

### Current System Assumptions
- `server/security/readSession.ts` stores read grants in a signed HttpOnly cookie, but issuance replaces grants instead of merging with an existing cookie.
- `server/routes/auth.ts` owns env-configured read-token exchange at `/api/auth/read-token`; there is no named token store, owner CRUD route, invite-code route, or durable revocation model.
- `server/routes/share.ts` owns share-id exchange at `/api/share/:shareId/session` and writes only the opened share grant.
- `server/security/originPolicy.ts` parses allowed origins for CORS, but does not expose a public-origin list or distinguish local defaults from link-generation candidates.
- `src/components/SettingsModal.tsx` owns project sharing controls and builds links from `window.location.origin`; it has no read-token management section or origin selector.
- `src/auth/AuthSessionProvider.tsx` treats unlock as owner-token first, then read-token fallback; read-only Unlock currently uses the same full locked panel path, not a recoverable overlay.
- `src/components/ProjectSelector/` renders the backend-filtered project list, but read-only badge/favorite suppression and named-token switch journeys are not covered end to end.
- Existing tests cover MDT-172 public sharing and MDT-176 auth unlock basics; they do not cover named token management, invite exchange, read-session merge, allowed-domain link selection, or read-only owner-upgrade recovery.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | Auth, sharing, sessions, Settings, and project switching have usable seams, but named token lifecycle does not belong in the existing env-token route alone. |
| Extension Fit | Concerning | Invite exchange and merge semantics need shared read-session helpers plus a new owner-managed route surface, not route-local patches. |
| Dependency Fit | Healthy | No new package is required; Node crypto, JSON/TOML storage patterns, existing Express routes, and existing rate-limit middleware are sufficient. |
| Verification Fit | Concerning | API tests exist for public sharing/auth, but the required browser journeys and named-token contracts are not locked yet. |
| Redesign Scope | Concerning | Redesign is bounded to read-token storage/routes, read-session issuance, Settings sharing UI, read-only unlock overlay state, origin link API, and focused tests. |

## Mismatch Points

### Named read-token storage and route ownership
- Current system assumes: read tokens are deployment env entries parsed by `parseReadTokenScopes()` and exchanged through `/api/auth/read-token`.
- Feature needs: owner-managed named token records with hashed tokens, project scopes, expiry, revocation, invite generation, and list/create/revoke APIs.
- Mismatch: The current auth route is a public exchange endpoint, not an owner management boundary or durable token store owner.
- Adjustment required: Add `server/security/readTokenStore.ts` for durable token/invite records and a distinct `server/routes/readTokens.ts` mounted so owner CRUD is behind owner/admin protection while invite exchange is public and rate-limited. Keep `/api/auth/read-token` only as the env-token compatibility path unless architecture explicitly removes it.
- Scope: bounded

### One-time invite links, expiry, and rate limiting
- Current system assumes: submitted read tokens are reusable secrets; only `/api/auth/read-token` and `/api/share/:shareId/session` use `publicTokenExchangeRateLimit`.
- Feature needs: short-lived, single-use invite codes with atomic consumption, generic bad-code responses, rate limiting, and URL cleanup after exchange.
- Mismatch: No current store can mark codes consumed, expire them, or associate them with a named token record.
- Adjustment required: Store hashed invite codes with `expiresAt` and `consumedAt`, consume atomically before issuing a read session, reuse the public exchange limiter or define a route-specific limiter, and add a frontend `/invite/:code` or equivalent handler that replaces browser history after successful exchange.
- Scope: bounded

### Read-session merge semantics
- Current system assumes: `appendReadSessionCookie()` creates a fresh cookie from the grants passed by the current route.
- Feature needs: opening `/share/{shareId}` while token-scoped must preserve token project grants and add the share grant.
- Mismatch: `server/routes/share.ts` currently issues `{ shareIds: [shareId] }`, which overwrites `projectRefs` from any existing read-token cookie.
- Adjustment required: Add a merge helper in `readSession.ts` that reads the current valid cookie, unions `projectRefs` and `shareIds`, refreshes expiry deliberately, and is used by share and invite exchanges.
- Scope: local

### Unlock cancel and bad-token recovery
- Current system assumes: `accessMode === 'locked'` renders `AuthUnlockPanel` as a full-page replacement; read-only Unlock triggers the same unlock affordance path.
- Feature needs: read-only visitors who select Unlock see an owner-token overlay with Cancel, and a bad owner token keeps read-only access recoverable.
- Mismatch: `AuthUnlockPanel` has no cancel prop/test hook, and `AuthSessionProvider.unlock()` sets `accessMode` to `locked` after bad owner/read-token attempts.
- Adjustment required: Split locked unlock from read-only owner-upgrade state, add cancel/backdrop/Escape handling, and add an owner-only unlock path that does not fall through to read-token exchange or clear the active read session on failure.
- Scope: bounded

### Allowed-domain link generation
- Current system assumes: CORS allowed origins are internal server policy, and Settings builds share URLs from `window.location.origin`.
- Feature needs: generated share/invite links default to the server-selected configured origin; if no configured origin exists, current origin is used only when accepted by server policy.
- Mismatch: `originPolicy.ts` includes local defaults in `allowedOrigins`, but Settings needs configured public origins suitable for user-facing links.
- Adjustment required: Expose a small owner-readable public-origin endpoint or include the list in sharing/token responses. Architecture must define whether local defaults are excluded from public link choices and keep generated-link origin selection server-owned.
- Scope: local

### Project browser for token-scoped read-only visitors
- Current system assumes: ProjectSelector reflects whatever `/api/projects` returns and only gates favorite writes through `canManageProjects`.
- Feature needs: named-token visitors can switch among all assigned projects plus public projects; read-only cards should not expose mutable favorite affordances and must not leak unavailable projects.
- Mismatch: Backend filtering can support this once token scopes are in the read session, but the UI lacks explicit read-only badges and E2E coverage for token-plus-share visibility.
- Adjustment required: Keep privacy enforcement on the backend, pass access mode where needed for static badges/favorite suppression, and cover project switching through Playwright.
- Scope: local

### Playwright journey coverage readiness
- Current system assumes: auth E2E is opt-in with `MDT_E2E_AUTH_ENABLED=true`; project browser tests run mostly no-auth; selectors are centralized in `tests/e2e/utils/selectors.ts`.
- Feature needs: an auth-enabled sharing journey that creates owner data, generates invite links, opens clean/read-only browser contexts, verifies URL cleanup, switches projects, opens share links additively, and checks unlock recovery.
- Mismatch: No current E2E spec or helper creates named read tokens/invite links, and existing auth tests do not model read-only overlay cancel.
- Adjustment required: Add `tests/e2e/sharing/read-access-journey.spec.ts`, register selectors for token UI/invite/unlock cancel, and ensure the auth-enabled suite can isolate env/config state without destabilizing no-auth E2E.
- Scope: bounded

## Dependency and Tooling Pressure

- New packages: none expected.
- Runtime/config impact: add persistent server config storage for named read-token records and invite codes, preferably under `CONFIG_DIR/auth/` or another architecture-approved server config location with atomic writes and no raw token persistence.
- Testing/E2E impact: add unit tests for token store hashing, expiry, revocation, and one-time code consumption; API tests for owner CRUD, invite exchange, cookie flags, read-session merge, rate limiting, and mutation denial; Playwright journeys for the full sharing flow.
- Main risk introduced: token and invite ownership can drift if env-token exchange, named-token routes, share routes, and read-session cookie issuance each implement their own access/session logic.

## Verification Gaps

- Preservation tests needed:
  - Existing `API_READ_TOKEN_HASHES` read-token exchange still works or is explicitly deprecated by architecture.
  - Existing `/api/share/:shareId/session` behavior still opens unlisted/public projects.
  - Existing owner auth/session CSRF protection remains unchanged for owner mutations.
  - Existing anonymous public listing and read-only mutation denial keep passing.
- E2E/contract drift risks:
  - Invite code remains in URL after exchange.
  - Opening a share link erases token-scoped projects.
  - Bad owner-token upgrade flips a read-only visitor to a locked full-page state.
  - Settings shows sharing/token controls to read-only visitors.
  - Generated links use `localhost` or a disallowed origin when public domains are configured.
- Safe-to-refactor now?: yes, if architecture first defines token-store persistence, route ownership, session merge helper, invite exchange URL shape, and auth-enabled E2E setup.

## Recommendation

### Option 1: Integrate As-Is
Use when: only small UI additions around existing env read tokens are required.
Architecture impact: insufficient for named token lifecycle, invite replay protection, and additive sessions.

### Option 2: Redesign Inline
Use when: the current auth/sharing architecture is mostly viable, but MDT-177 needs a bounded read-access redesign inside the same CR.
Architecture must redesign: named read-token store and route ownership, invite code lifecycle, read-session merge helper, read-only owner-unlock overlay state, allowed public-origin link contract, and auth-enabled sharing E2E coverage.
Expected scope added: a focused backend service/route slice, Settings token UI component, unlock overlay changes, origin-list API/contract, and preservation plus journey tests.

### Option 3: Redesign First
Use when: multi-user accounts, RBAC, shared database storage, or public MCP read APIs become required before named sharing can ship.
Reason redesign cannot wait: not applicable; current single-owner auth, project visibility, and read-session seams can absorb the feature with bounded redesign.
Preferred path: continue with `mdt:architecture MDT-177` in the same CR.

## Blockers

- No external blocker found.
- Architecture must decide the persistent token-store path and file format before implementation.
- Architecture must decide the invite route shape and frontend clean-URL destination before Playwright journeys are finalized.
- Architecture must define whether configured public origins exclude local default origins for generated public links.
