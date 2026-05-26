---
code: MDT-177
status: In Progress
dateCreated: 2026-05-23T09:35:14.630Z
type: Feature Enhancement
priority: High
---

# Harden read access sharing journey

## 1. Description

### Requirements Scope
`full`

### Problem
- `server/routes/auth.ts` supports scoped read tokens through env config, but owner users have no UI to create named multi-project access for a person.
- `server/routes/share.ts` opens `/share/{shareId}` as a read session, but the journey must preserve any existing read-token project grants instead of replacing them.
- `src/components/AuthUnlock/AuthUnlockPanel.tsx` can trap a read-only visitor in an owner unlock state without a clear cancel path back to the board.
- `src/components/SettingsModal.tsx` builds share URLs from the current browser origin only; owner users need links to follow the server-owned `PUBLIC_ORIGIN` runtime contract.

### Affected Artifacts
- `server/security/readSession.ts` — read-cookie grant shape, merge behavior, and expiry rules.
- `server/routes/auth.ts` — read-token exchange and owner-token unlock behavior.
- `server/routes/share.ts` — share-id exchange into read-only session.
- `server/security/publicLinkOrigins.ts` — select the server-approved public link origin from runtime-provided values.
- `src/components/SettingsModal.tsx` — sharing controls, read-token management, generated links.
- `src/components/AuthUnlock/` — read-only unlock/cancel journey.
- `src/components/ProjectSelector/` — project switching for token-scoped read-only visitors.
- `tests/e2e/` — browser journeys for anonymous, share-link, read-token, and unlock recovery flows.

### Scope
- **Changes**: Add owner-managed named read access tokens, multi-project token scopes, one-time invite links, read-session merge behavior, server-owned link-origin handling, and Playwright journey coverage.
- **Unchanged**: No public write access, no owner token in URLs, no OAuth/accounts/RBAC, no MCP public read API expansion.

## 2. Decision

### Chosen Approach
Add named read access tokens with server-generated one-time invite links that exchange into an HttpOnly read cookie.

### Rationale
- A named token record lets the owner reason about “Bob can read projects A and B” instead of managing one-off env strings.
- A one-time invite code avoids putting the persistent read token in the shared URL.
- The existing `mdt_read_session` cookie is the right browser storage target because it is HttpOnly and already read-only.
- Merge semantics preserve existing read access when a visitor opens an additional unlisted share link.
- Owner unlock must be modal/recoverable so read-only users never lose their current board view after a failed owner-token attempt.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| Named tokens + one-time invite links | Owner manages named scopes; links exchange into read cookie | **ACCEPTED** - Covers multi-project sharing and avoids persistent URL tokens |
| Env-only `API_READ_TOKEN_HASHES` | Keep all read scopes in deployment config | Rejected because owner cannot manage or inspect access from the app |
| Persistent token in URL | Direct link contains reusable read token | Rejected because URLs are logged, copied, and hard to revoke safely |
| Full user accounts | Add users, passwords, RBAC | Rejected because this app needs single-owner sharing, not account management |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `server/security/readTokenStore.ts` | Service | Persist named read-token hashes, project scopes, invite codes, expiry, and revocation state |
| `server/routes/readTokens.ts` | Route | Owner CRUD and invite-code exchange endpoints for read access tokens |
| `src/components/SettingsModal/ReadAccessTokens.tsx` | Component | Owner UI for named token creation, project assignment, invite links, and revocation |
| `tests/e2e/sharing/read-access-journey.spec.ts` | Playwright spec | End-to-end browser journeys for public, unlisted, token-scoped, and unlock recovery flows |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/security/readSession.ts` | Behavior changed | Merge projectRefs/shareIds when issuing a new read session for an existing visitor |
| `server/routes/share.ts` | Behavior changed | Preserve existing read-cookie grants when opening `/share/{shareId}` |
| `server/security/publicLinkOrigins.ts` | Module added | Resolve server-approved public link origin options for generated links |
| `domain-contracts/src/access/schema.ts` | Contract added | Own access-mode, capability, public-link-origin, and read-token API DTO schemas |
| `server/server.ts` | Route added | Mount read-token management routes behind owner/admin protection |
| `src/components/SettingsModal.tsx` | UI changed | Add read-token management section that uses the server-selected link origin |
| `src/components/AuthUnlock/` | UI changed | Make owner unlock a recoverable overlay from read-only mode |
| `src/components/ProjectSelector/` | UI verified | Ensure token-scoped read-only users can switch among all allowed projects |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| Settings sharing UI | `/api/read-tokens` | Owner creates, lists, revokes named read-token records |
| Invite link route | `/api/read-tokens/invite/:code/session` | One-time code exchange into read session cookie |
| Share route | `readSession.ts` | Merge existing grants with shareId grant |
| Link generation UI | `publicLinkOrigins.ts` | Public link origin derived from `PUBLIC_ORIGIN` or an allowed current origin fallback |

### Key Patterns
- Existing auth boundary: keep credential parsing in `server/security/apiAuth.ts` and route-level exchanges under auth routes.
- Existing cookie contract: use `mdt_read_session` HttpOnly cookie for read-only browser state.
- Existing Settings modal patterns: reuse tabs, settings groups, button styles, and tooltip patterns.
- Existing Playwright isolation: use `tests/e2e` helpers and isolated backend/browser state.

## 5. Acceptance Criteria

> Requirements trace projection: [requirements.trace.md](./MDT-177/requirements.trace.md)
> Requirements notes: [requirements.md](./MDT-177/requirements.md)
> BDD trace projection: [bdd.trace.md](./MDT-177/bdd.trace.md)
> BDD notes: [bdd.md](./MDT-177/bdd.md)
> Architecture trace projection: [architecture.trace.md](./MDT-177/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-177/architecture.md)

### Functional
- [ ] Owner can create a named read access token with at least two assigned projects.
- [ ] Owner can generate a one-time invite link for the named token.
- [ ] Opening the invite link from a clean browser sets read-only access and removes the code/token from the address bar.
- [ ] Token-scoped visitor sees all assigned projects plus public projects and can switch between them.
- [ ] Token-scoped visitor cannot create, edit, drag, delete, configure, favorite, or write files.
- [ ] Opening `/share/{shareId}` while already token-scoped preserves existing token-scoped projects.
- [ ] Read-only visitor pressing Unlock can cancel back to the board.
- [ ] Bad owner-token unlock from read-only mode returns to read-only state, not a locked dead end.
- [ ] Generated links use `PUBLIC_ORIGIN` when configured.
- [ ] When `PUBLIC_ORIGIN` is absent, generated links use the current browser origin only if the server origin policy accepts it.
- [ ] The owner UI does not synthesize link origins or expose a domain picker.
- [ ] Revoked read token stops granting project access on the next exchange/session refresh.

### Non-Functional
- [ ] Persistent read tokens are stored only as hashes server-side.
- [ ] Invite codes are short-lived, single-use, and rate-limited.
- [ ] Raw tokens and invite codes are not logged or stored in browser-readable storage.
- [ ] Backend authorization remains the enforcement layer for every read-only mutation attempt.

### Testing
- Unit: `readTokenStore.ts` covers hash storage, project scopes, expiry, revocation, and one-time code consumption.
- API: owner CRUD, invite exchange, read-cookie flags, share-session merge, and mutation denial.
- Playwright: anonymous public list, unlisted share link, multi-project named token, project switching, unlock cancel, bad unlock recovery, and URL cleanup.

## 6. Verification

### Feature Verification
- `bun run --cwd server jest tests/api/public-sharing.test.ts`
- `bun run --cwd server jest tests/api/read-token-management.test.ts`
- `bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium`
- `bun run validate:ts`
- `bun run build`

### Verifiable Artifacts
- Named read-token management route exists and is owner-only.
- Settings exposes token naming, project assignment, invite link generation, and revocation.
- Playwright covers the end-user journeys, not only API contracts.

## 7. Deployment

- Requires persistent server config storage for named read-token records.
- Supports a single `PUBLIC_ORIGIN`; generated links use that origin or an allowed current-origin fallback when `PUBLIC_ORIGIN` is absent.
- Existing env-based `API_READ_TOKEN_HASHES` remains as a compatibility path unless architecture rejects it.

## 8. Workflow Plan

1. Commit current MDT-172 work before starting this ticket.
2. Create this ticket with the user journey, token model, `PUBLIC_ORIGIN` questions, and E2E expectations.
3. Run UX design first enough to define the intended Settings, unlock, project-switching, and invite-link surfaces.
4. Run the MDT pipeline through assess, requirements, BDD, architecture, tests, and tasks with E2E journeys included.
5. Reconcile the pipeline output with the UX design artifacts; update specs/mockups if the pipeline finds gaps.
6. Run `mdt:implement` against the resulting tasks.
7. Run code review with a teammate, apply fixes, then ask the teammate to double-check.

## 9. Clarifications

### UAT Session 2026-05-24

- Approved change: extract pure access/read-token boundary contracts into `domain-contracts`.
- Changed requirement IDs: added `C12`.
- Updated workflow documents: `requirements.md`, `architecture.md`, `tests.md`, `tasks.md`, trace projections, and `uat.md`.
- Implementation scope: access/session vocabulary, auth capability shape, public-link-origin DTO, read-token list/create/invite response DTOs.
- Out of scope: cookie/session internals, route authorization policy, token-store persistence format, and UI behavior changes.
