---
code: MDT-172
status: In Progress
dateCreated: 2026-05-18T00:00:00.000Z
type: Feature Enhancement
priority: High
dependsOn: MDT-157
relatedTickets: MDT-156, MDT-157, MDT-167
---

# Add public read-only board sharing

Architecture reference: [Authentication and Sharing Architecture](../architecture/auth-and-sharing-architecture.md)

## 1. Description

### Requirements Scope
`full`

### Problem
- Users need a fast way to share selected project boards on a public domain without allowing visitors to change tickets, documents, project configuration, or local filesystem-related settings.
- The current API model treats visible projects as editable once reachable, so a public deployment needs an explicit access-control layer before sharing is safe.
- Sharing and authorization concepts need separation: public read-only visibility, scoped read tokens, and owner/admin write access are different permissions and must not share one token model.

### Affected Areas
- `server/` - project visibility filtering, access-control middleware, mutation blocking, token exchange endpoints, audit-safe logging.
- `src/` - read-only mode UI, Settings sharing controls, authorization entry, project selector visibility, disabled mutation controls.
- `shared/` and `domain-contracts/` - typed access mode, sharing configuration, token scope validation.
- `docs/design/surfaces/` - Settings, App Header, Project Browser, and Board Layout UX contracts.

### Scope

**In scope:**
- Add project sharing configuration with default `private`.
- Let owner/admin mark specific projects as `unlisted-readonly` or `public-readonly`.
- Make `unlisted-readonly` the normal share-link mode: accessible through `/share/{shareId}`, but absent from anonymous project listing.
- Filter anonymous project lists to `public-readonly` projects only.
- Let visitors view shared projects normally in board/list/documents read paths.
- Enforce read-only mode on the backend: all mutating API routes return `403` without write/admin access.
- Add scoped read tokens that reveal additional projects without granting write access.
- Add a frontend authorization entry where a visitor can enter a token and refresh visible projects.
- Support share links with non-secret public share IDs.
- If a link includes a token/code, treat it as a one-time scoped read exchange through `POST`, set server-managed storage, then remove it from the URL.

**Out of scope:**
- Multi-user accounts, user registration, OAuth, role management UI, and team membership.
- Granting public write access.
- Putting owner/admin tokens in URLs.
- JWT as a required implementation choice.
- Full audit log viewer.

## 2. Desired Outcome

### Success Conditions
- By default, every project is private.
- Anonymous project listing shows only projects explicitly configured as `public-readonly`.
- Anonymous users can open `unlisted-readonly` projects through `/share/{shareId}` without those projects appearing in anonymous project lists.
- Anonymous users can open shared boards, lists, and documents but cannot create, update, drag, delete, configure, favorite, or write files.
- Read-token users can see the projects allowed by that token and remain read-only unless the token has explicit write/admin scope.
- Owner/admin users can manage sharing settings.
- The UI makes read-only state visible and removes or disables edit affordances.
- Backend authorization remains the source of truth even if the frontend is bypassed.

### Security Constraints
- Use random, non-enumerable share IDs or opaque tokens. Do not expose incrementing IDs as public access identifiers.
- Prefer opaque server-side tokens over JWT for initial implementation because they are easier to revoke, rotate, hash at rest, and keep claim details off the client.
- Store token hashes server-side; never log raw tokens, cookies, or authorization headers.
- Do not store write/admin tokens in `localStorage`, `sessionStorage`, query params, or client-readable runtime config.
- For sensitive browser auth, prefer server-set `HttpOnly`, `SameSite=Lax` or stricter cookies. Set `Secure` only when deployment is actually HTTPS-capable.
- Query string tokens are allowed only as short-lived one-time read exchange codes. Prefer URL fragments for browser-handled read tokens. After exchange, redirect or replace browser history to the same URL without the token/code.
- Share IDs in paths may be bookmarkable but must not grant mutation rights or imply project directory listing.
- Token entry and exchange endpoints must be rate limited and return generic errors that do not reveal project existence.
- CORS allowlist and Origin handling from MDT-156 must not be widened for sharing.
- If cookie-based write/admin auth is used, state-changing requests must have concrete CSRF protection: non-GET mutations only, Origin/Host validation, and signed double-submit token or equivalent same-origin custom-header control.
- SSE must filter events per access context and must not carry read/admin tokens in query strings.

### Non-Goals
- JWT migration unless architecture proves a need for stateless signed claims.
- Storing project sharing state in browser-only storage.
- Allowing read-only UI controls to be the only write protection.
- Exposing unshared project names, counts, paths, or metadata to anonymous users.

## 3. Open Questions

| Area | Question | Current Recommendation |
|------|----------|------------------------|
| Storage owner | Should project sharing live in global registry config or project-local `.mdt-config.toml`? | Prefer global/user config first; sharing is deployment behavior, not repository behavior. |
| Token storage | Where should scoped read tokens persist after manual entry? | Prefer HttpOnly cookie when backend auth is available; otherwise sessionStorage only for read-only tokens. |
| Share URL shape | Path share ID or query token? | Prefer `/share/{shareId}` for `unlisted-readonly`; use query token/code only for one-time exchange. |
| Access model | Should write/admin tokens be part of this ticket? | Only enough to depend on MDT-157 and protect Settings; full admin UX can stay in MDT-157. |
| MCP behavior | Should MCP HTTP expose public read-only project listing? | Default no; require explicit architecture decision before exposing MCP read access publicly. |

### Known Constraints
- MDT-157 owns backend authentication.
- MDT-156 owns CORS, filesystem restriction, and base security headers.
- Settings UI is currently mostly client-side preferences; sharing settings must become API-backed and owner/admin-only.

### Decisions Deferred
- Exact config file path and schema (`/mdt:architecture`), with `private`, `unlisted-readonly`, and `public-readonly` modes.
- Token creation and revocation UX (`/mdt:architecture`).
- Exact list of mutating routes to block (`/mdt:tests` should enumerate).

## 4. Acceptance Criteria

### Functional
- [ ] Fresh deployment exposes no public or unlisted projects until sharing is enabled.
- [ ] Owner/admin can set project sharing to Private, Unlisted read-only, or Public read-only from Settings.
- [ ] Anonymous `GET /api/projects` returns only `public-readonly` projects.
- [ ] Anonymous `GET /api/projects` does not include `unlisted-readonly` projects.
- [ ] Anonymous `/share/{shareId}` opens an `unlisted-readonly` project when the share ID is valid.
- [ ] Anonymous read requests for a visible shared project return normal board/list/document data.
- [ ] Anonymous mutating requests for a public project return `403`.
- [ ] Anonymous requests for unshared projects return `404` or generic denial without leaking project existence.
- [ ] Visitor can enter a scoped read token from the header/menu authorization flow.
- [ ] Valid read token expands the visible project list to token-scoped projects.
- [ ] Invalid token shows a generic error and does not reveal whether any project exists.
- [ ] Share URL token/code exchange uses `POST` and removes the token/code from the address bar after storage.
- [ ] Read-only UI hides or disables Add Project, Edit Project, create ticket, drag/drop, status toggles, delete, config editing, document fav writes, and document configuration controls.

### Non-Functional
- [ ] Backend authorization checks are centralized and covered by route tests.
- [ ] Share IDs and public project identifiers are non-enumerable.
- [ ] Token exchange does not log raw tokens.
- [ ] Project filtering adds no noticeable delay for normal local use.
- [ ] Existing local development without sharing configured behaves as before.

### Edge Cases
- [ ] A token scoped to zero projects authenticates but shows no extra projects.
- [ ] A project switched from `public-readonly` to `unlisted-readonly` disappears from anonymous project lists but remains reachable by valid share ID.
- [ ] A project disabled after being shared disappears from anonymous and token-scoped project lists, and its share ID stops resolving.
- [ ] Expired, revoked, malformed, or replayed one-time tokens fail generically.
- [ ] Browser refresh preserves read access only according to the chosen storage policy.
- [ ] Direct API calls cannot mutate even when frontend controls are hidden incorrectly.
- [ ] SSE subscriptions for read-only visitors do not expose unshared project events.

## 5. Verification

### How to Verify Success
- Manual: with no auth, confirm only `public-readonly` projects appear in project listing.
- Manual: confirm `unlisted-readonly` project does not appear in project listing but opens through `/share/{shareId}`.
- Manual: open a public board and verify create, drag, delete, edit, config, and favorite actions are unavailable or disabled.
- Manual: send direct unauthenticated `POST`, `PATCH`, `PUT`, and `DELETE` requests against a shared project and verify `403`.
- Manual: enter a valid scoped read token and verify extra projects appear read-only.
- Manual: open a one-time token/code share link and verify the exchange uses `POST` and the URL is cleaned after exchange.
- Automated: route tests for anonymous, read-token, and admin access across every mutating endpoint.
- Automated: project list filtering tests for anonymous, public, token-scoped, and unshared projects.
- Automated: frontend tests for read-only affordance hiding/disabled states.
