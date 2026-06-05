# Tasks: MDT-177

Canonical projection: [tasks.trace.md](./tasks.trace.md)

## Milestones

| Milestone | Tasks | Checkpoint |
|---|---|---|
| M0 - Runtime probe | Task 0 | Tooling and missing architecture files are known before implementation. |
| M1 - Backend read-access skeleton | Tasks 1-3 | Token store, read-session merge, env compatibility, and read-token API are GREEN. |
| M2 - Additive share and origin policy | Task 4 | Share merge and public-link origin policy are GREEN. |
| M3 - Owner management UI | Task 5 | Owner can manage named access and link origins through Settings. |
| M4 - Invite and unlock recovery | Task 6 | Invite route, URL cleanup, cancel, and bad owner-token recovery are GREEN. |
| M5 - Read-only project browser | Task 7 | Token/share/public visibility and read-only affordances are integrated. |
| M6 - Journey completion | Task 8 | Full Playwright journey and final verification are GREEN. |
| UAT - Lock/status refinement | Task 10 | Owner Lock refreshes read-only visibility and hamburger access chrome is aligned. |

## Task 0: Runtime probe and missing infrastructure inventory

**Skills**: `mdt-frontend`

**Milestone**: M0 - Runtime probe

**Structure**: `server/security/readTokenStore.ts`, `server/routes/readTokens.ts`, `src/components/SettingsModal/ReadAccessTokens.tsx`

**Makes GREEN (Automated Tests)**:
- None. This is a probe and missing-file inventory task.

**Scope**: Confirm `bun`, Jest, Playwright, and `spec-trace` are available; identify missing architecture-owned files before source work starts.

**Boundary**: Tooling and file inventory only.

**Creates**:
- `server/security/readTokenStore.ts`
- `server/routes/readTokens.ts`
- `src/components/SettingsModal/ReadAccessTokens.tsx`

**Modifies**:
- None

**Must Not Touch**:
- `server/security/readSession.ts`
- `server/routes/auth.ts`
- `server/routes/share.ts`
- `src/App.tsx`
- `src/components/SettingsModal.tsx`

**Create/Move**:
- Create missing directories only when implementation starts.
- Do not move existing tests or routes.

**Exclude**: No feature logic, no route mounting, no UI wiring.

**Anti-duplication**: Import existing config-path and auth helpers when implementing later; do not create a second config-root resolver.

**Duplication Guard**:
- Check `server/security/` for existing token/session helpers before coding.
- Check `src/components/SettingsModal.tsx` before creating a parallel Settings surface.
- Verify no second token store, route owner, or Settings modal owner was introduced.

**Verify**:

```bash
bun --version
spec-trace --version
bun run validate:ts
bun run --cwd server jest --listTests
bunx playwright test tests/e2e/smoke/infrastructure.spec.ts --project=chromium
```

**Done when**:
- [x] Runtime commands are available.
- [x] Missing architecture files are recorded.
- [x] No source implementation work was done.
- [x] No duplicate owner path was introduced.

## Task 1: Implement readTokenStore persistence and invite lifecycle

**Milestone**: M1 - Backend read-access skeleton

**Structure**: `server/security/readTokenStore.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-read-token-store-persistence` -> `server/tests/security/readTokenStore.test.ts`: `readTokenStore - MDT-177`

**Enables (BDD)**:
- `owner_creates_named_multi_project_token` (BR-1.1, BR-1.15)
- `owner_generates_one_time_invite_link` (BR-1.2)
- `expired_or_invalid_invite_does_not_change_session` (BR-1.12, BR-1.16)
- `revocation_recomputed_on_next_access_check` (BR-1.11, BR-1.17)

**Scope**: Add durable hash-only named token and invite storage under `CONFIG_DIR/auth/read-access-tokens.json`.

**Boundary**: Pure server security service; no Express route behavior.

**Creates**:
- `server/security/readTokenStore.ts`

**Modifies**:
- None

**Must Not Touch**:
- `server/routes/readTokens.ts`
- `server/routes/auth.ts`
- `server/routes/share.ts`
- `src/**`

**Create/Move**:
- Create service types and exported store factory/functions.
- Use atomic writes and fail-closed malformed store handling.

**Exclude**: No public API route, no cookie issuance, no UI.

**Anti-duplication**: Import existing path/config helpers used by server config storage; do not copy path-resolution logic.

**Duplication Guard**:
- Check existing server security/config modules for atomic JSON persistence helpers before coding.
- If another token persistence owner exists, merge into this task before continuing.
- Verify raw tokens and invite codes are not persisted or logged.

**Verify**:

```bash
bun run --cwd server jest tests/security/readTokenStore.test.ts --runInBand
bun run validate:ts
```

**Done when**:
- [x] `TEST-read-token-store-persistence` is GREEN.
- [x] Hash-only persistence, revocation, expiry, malformed store, and atomic consume behavior pass.
- [x] No duplicated token store exists.
- [x] Fallback/absence paths fail closed.

## Task 2: Merge read sessions and preserve env-token compatibility

**Milestone**: M1 - Backend read-access skeleton

**Structure**: `server/security/readSession.ts`, `server/routes/auth.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-read-session-merge` -> `server/tests/security/readSession.test.ts`: `readSession merge helper - MDT-177`
- `TEST-env-read-token-compatibility` -> `server/tests/api/public-sharing.test.ts`: `accepts hashed scoped read tokens without granting write access`

**Enables (BDD)**:
- `share_link_merge_preserves_token_access` (BR-1.5)
- `revocation_recomputed_on_next_access_check` (BR-1.11, BR-1.17)

**Scope**: Add the shared read-session merge helper and refactor `/api/auth/read-token` to use it without changing `API_READ_TOKEN_HASHES` semantics.

**Boundary**: Session issuance and env-token compatibility only.

**Creates**:
- None

**Modifies**:
- `server/security/readSession.ts`
- `server/routes/auth.ts`

**Must Not Touch**:
- `server/security/readTokenStore.ts`
- `server/routes/readTokens.ts`
- `src/**`

**Create/Move**:
- Add one exported helper that reads the current valid cookie, unions grants, de-dupes, and applies earliest active expiry.
- Move direct env-token cookie issuance to the helper.

**Exclude**: No named-token route lookup, no Settings UI.

**Anti-duplication**: Reuse `appendReadSessionCookie`, read-session parsing, and env scope parsing; do not create a second read-cookie signer.

**Duplication Guard**:
- Check all direct read-session cookie writers before coding.
- If route-local merge logic appears, replace it with the shared helper.
- Verify one helper owns union and expiry policy.

**Verify**:

```bash
bun run --cwd server jest tests/security/readSession.test.ts tests/api/public-sharing.test.ts -t "readSession merge helper - MDT-177|accepts hashed scoped read tokens without granting write access" --runInBand
bun run validate:ts
```

**Done when**:
- [x] `TEST-read-session-merge` is GREEN.
- [x] `TEST-env-read-token-compatibility` is GREEN.
- [x] Existing env hash format still works.
- [x] No duplicate read-session merge logic exists.

## Task 3: Mount read-token owner and invite API routes

**Milestone**: M1 - Backend read-access skeleton (BR-1.1, BR-1.2, BR-1.3, BR-1.11, BR-1.12, BR-1.15, BR-1.16, BR-1.17)

**Structure**: `server/routes/readTokens.ts`, `server/server.ts`, `server/security/apiAuth.ts`, `server/security/readTokenStore.ts`, `server/security/readSession.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-read-token-management-api` -> `server/tests/api/read-token-management.test.ts`: `read token management API - MDT-177`

**Enables (BDD)**:
- `owner_creates_named_multi_project_token` (BR-1.1, BR-1.15) - needs later UI/E2E tasks to complete
- `owner_generates_one_time_invite_link` (BR-1.2) - needs later UI/E2E tasks to complete
- `invite_exchange_cleans_url_before_content` (BR-1.3) - needs later UI/E2E tasks to complete
- `expired_or_invalid_invite_does_not_change_session` (BR-1.12, BR-1.16) - needs later UI/E2E tasks to complete
- `revocation_recomputed_on_next_access_check` (BR-1.11, BR-1.17) - needs later UI/E2E tasks to complete

**Scope**: Add owner-only read-token management endpoints and the public invite exchange endpoint, mounted in the correct auth order.

**Boundary**: Backend API and mount order only.

**Creates**:
- `server/routes/readTokens.ts`

**Modifies**:
- `server/server.ts`
- `server/security/apiAuth.ts`
- `server/security/readTokenStore.ts`
- `server/security/readSession.ts`

**Must Not Touch**:
- `server/routes/share.ts`
- `src/components/SettingsModal.tsx`
- `src/App.tsx`
- `tests/e2e/sharing/read-access-journey.spec.ts`

**Create/Move**:
- Mount `POST /api/read-tokens/invites/:code/session` before owner-only route gates.
- Mount owner routes: `GET /api/read-tokens`, `POST /api/read-tokens`, `POST /api/read-tokens/:tokenId/invites`, `POST /api/read-tokens/:tokenId/revoke`.

**Exclude**: No browser route handling, no Settings UI, no share-route merge changes.

**Anti-duplication**: Import `publicTokenExchangeRateLimit`, read-token store functions, and read-session merge helper; do not duplicate auth guards or cookie writing.

**Duplication Guard**:
- Check `server/routes/auth.ts` and `server/routes/share.ts` for exchange patterns before coding.
- If invite exchange starts copying env-token exchange logic, extract shared helpers instead.
- Verify there is one public invite route owner and one owner-management route owner.

**Verify**:

```bash
bun run --cwd server jest tests/api/read-token-management.test.ts --runInBand
bun run validate:ts
```

**Done when**:
- [x] `TEST-read-token-management-api` is GREEN.
- [x] Owner routes reject anonymous, read-only, and share-link-only visitors.
- [x] Invite exchange is rate-limited and generic on failure.
- [x] No raw token or invite code is echoed after creation/exchange.

## Task 4: Add share-session merge and public-origin policy helpers

**Milestone**: M2 - Additive share and origin policy (BR-1.5, BR-1.8, BR-1.9, BR-1.10)

**Structure**: `server/routes/share.ts`, `server/security/originPolicy.ts`, `server/security/projectSharing.ts`, `server/server.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-share-session-merge-api` -> `server/tests/api/public-sharing.test.ts`: `merges an unlisted share session into an existing read-token session without dropping token projects`
- `TEST-origin-public-link-policy` -> `server/tests/security/originPolicy.test.ts`: public link origin policy cases

**Enables (BDD)**:
- `share_link_merge_preserves_token_access` (BR-1.5) - needs later UI/E2E tasks to complete
- `allowed_current_origin_defaults_links` (BR-1.8) - needs later UI/E2E tasks to complete
- `configured_origin_selection_and_fallback` (BR-1.9, BR-1.10) - needs later UI/E2E tasks to complete

**Scope**: Move share-session issuance to the merge helper and expose/validate public-link origin policy.

**Boundary**: Server sharing/origin policy only.

**Creates**:
- None

**Modifies**:
- `server/routes/share.ts`
- `server/security/originPolicy.ts`
- `server/security/projectSharing.ts`
- `server/server.ts`

**Must Not Touch**:
- `server/security/readTokenStore.ts`
- `src/components/SettingsModal.tsx`
- `src/components/ProjectSelector/**`

**Create/Move**:
- Add origin helper(s) for `PUBLIC_ORIGIN`, allowed current-origin fallback, and fail-closed no-origin state.
- Replace share route direct cookie issuance with the read-session merge helper.

**Exclude**: No Settings selector UI, no invite-route UI.

**Anti-duplication**: Import the runtime-configured origin policy utilities and the read-session merge helper; do not build a separate URL-origin parser.

**Duplication Guard**:
- Check current CORS origin parsing before adding public-link normalization.
- If link-origin logic appears in routes, move it into `originPolicy.ts`.
- Verify share and invite/session issuance use the same merge semantics.

**Verify**:

```bash
bun run --cwd server jest tests/security/originPolicy.test.ts tests/security/publicLinkOrigins.test.ts tests/api/public-sharing.test.ts -t "configured public origin|current allowed origin|withholds generated link bases|merges an unlisted share session" --runInBand
bun run validate:ts
```

**Done when**:
- [x] `TEST-share-session-merge-api` is GREEN.
- [x] `TEST-origin-public-link-policy` is GREEN.
- [x] Current-origin/default/fallback/no-origin cases pass.
- [x] No duplicate origin parser exists.

## Task 5: Build Settings read-access token management and link-origin handling

**Skills**: `mdt-frontend`, `playwright-cli`

**Milestone**: M3 - Owner management UI (BR-1.1, BR-1.2, BR-1.8, BR-1.9, BR-1.10, BR-1.15)

**Structure**: `src/components/SettingsModal.tsx`, `src/components/SettingsModal/ReadAccessTokens.tsx`, `tests/e2e/utils/selectors.ts`, `server/routes/readTokens.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-selector-contract` -> `tests/e2e/utils/selectors.ts`: read access selector exports
- `TEST-read-access-journey` -> `tests/e2e/sharing/read-access-journey.spec.ts`: owner Settings and generated-link origin specs

**Makes GREEN (Behavior)**:
- `owner_creates_named_multi_project_token` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.1, BR-1.15)
- `owner_generates_one_time_invite_link` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.2)
- `allowed_current_origin_defaults_links` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.8)
- `configured_origin_selection_and_fallback` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.9, BR-1.10)

**Scope**: Add owner-only Settings UI for named read access, one-time result display, invite generation, revoke, status, project multi-select, expiry, and server-selected link-origin handling.

**Boundary**: Settings UI and selector contract only.

**Creates**:
- `src/components/SettingsModal/ReadAccessTokens.tsx`

**Modifies**:
- `src/components/SettingsModal.tsx`
- `tests/e2e/utils/selectors.ts`
- `server/routes/readTokens.ts`

**Must Not Touch**:
- `src/App.tsx`
- `src/auth/AuthSessionProvider.tsx`
- `src/components/ProjectSelector/**`
- `server/security/readTokenStore.ts`

**Create/Move**:
- Compose `ReadAccessTokens` into the existing Sharing tab.
- Add stable `data-testid` selectors through `tests/e2e/utils/selectors.ts`.
- Use the backend-origin contract for share and invite URLs.

**Exclude**: No standalone Settings modal, no browser storage for raw secrets, no read-only Settings access.

**Anti-duplication**: Import existing Settings modal controls, project list data, API fetch helpers, and modal CSS conventions; do not create a second sharing tab.

**Duplication Guard**:
- Check `src/components/SettingsModal.tsx` ownership before adding new state.
- If link generation exists in multiple components, centralize through this Settings section and backend origin response.
- Verify raw token/invite result state is transient and not persisted.

**Verify**:

```bash
bun run validate:ts
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "owner creates named multi-project access|configured public origin is used"
```

**Done when**:
- [x] `TEST-e2e-selector-contract` is GREEN for Settings selectors.
- [x] Listed owner Settings E2E behaviors are GREEN.
- [x] Read-only visitors cannot reach Settings.
- [x] No duplicate Settings/share-link UI exists.

## Task 6: Handle invite route and recoverable read-only owner unlock overlay

**Skills**: `mdt-frontend`, `playwright-cli`

**Milestone**: M4 - Invite and unlock recovery (BR-1.3, BR-1.6, BR-1.7, BR-1.12, BR-1.16)

**Structure**: `src/App.tsx`, `src/auth/AuthSessionProvider.tsx`, `src/components/AuthUnlock/AuthStatusAction.tsx`, `src/components/AuthUnlock/AuthUnlockPanel.tsx`, `tests/e2e/utils/selectors.ts`, `server/routes/readTokens.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-selector-contract` -> `tests/e2e/utils/selectors.ts`: invite and unlock selectors
- `TEST-read-access-journey` -> `tests/e2e/sharing/read-access-journey.spec.ts`: invite cleanup and unlock recovery specs

**Makes GREEN (Behavior)**:
- `invite_exchange_cleans_url_before_content` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.3)
- `readonly_unlock_cancel_returns_to_same_view` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.6)
- `readonly_bad_owner_token_preserves_session` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.7)
- `expired_or_invalid_invite_does_not_change_session` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.12, BR-1.16)

**Scope**: Add `/invite/:code` handling, clean URL replacement, and read-only owner-unlock overlay with cancel and invalid-token recovery.

**Boundary**: Frontend route/session state and unlock UI only.

**Creates**:
- None

**Modifies**:
- `src/App.tsx`
- `src/auth/AuthSessionProvider.tsx`
- `src/components/AuthUnlock/AuthStatusAction.tsx`
- `src/components/AuthUnlock/AuthUnlockPanel.tsx`
- `tests/e2e/utils/selectors.ts`
- `server/routes/readTokens.ts`

**Must Not Touch**:
- `src/components/SettingsModal.tsx`
- `src/components/ProjectSelector/**`
- `server/routes/auth.ts`
- `server/routes/share.ts`

**Create/Move**:
- Add invite-route exchange flow that calls the public invite endpoint and replaces history before content renders.
- Add modal owner-unlock variant with Cancel, Escape, backdrop close, and generic owner-token error.

**Exclude**: No read-token fallback in owner-upgrade flow, no localStorage/sessionStorage invite persistence.

**Anti-duplication**: Reuse `AuthSessionProvider` fetch/session methods and `AuthUnlockPanel`; do not create a second unlock component.

**Duplication Guard**:
- Check locked startup unlock flow before adding read-only overlay state.
- If owner unlock and read-token unlock diverge, keep the owner-upgrade path explicit and route-local.
- Verify failed owner unlock does not clear read-session state.

**Verify**:

```bash
bun run validate:ts
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "valid invite exchange cleans URL|read-only owner unlock cancel|revoked, expired, and invalid invite paths"
```

**Done when**:
- [x] Invite exchange and URL cleanup behavior is GREEN.
- [x] Cancel returns to the same route/view.
- [x] Invalid owner token preserves read-only session.
- [x] No duplicate unlock panel exists.

## Task 7: Integrate ProjectSelector read-only affordances and scoped visibility

**Skills**: `mdt-frontend`, `playwright-cli`

**Milestone**: M5 - Read-only project browser (BR-1.4, BR-1.5, BR-1.14, BR-1.17)

**Structure**: `src/components/ProjectSelector/*`, `server/security/projectSharing.ts`, `server/security/apiAuth.ts`, `tests/e2e/utils/selectors.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-read-access-journey` -> `tests/e2e/sharing/read-access-journey.spec.ts`: project switching, share merge, control suppression
- `TEST-readonly-mutation-denial-api` -> `server/tests/api/public-sharing.test.ts`: protected read-only mutation matrix

**Makes GREEN (Behavior)**:
- `token_scoped_project_switching` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.4)
- `share_link_merge_preserves_token_access` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.5)
- `readonly_owner_controls_hidden` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.14)
- `revocation_recomputed_on_next_access_check` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.11, BR-1.17)

**Scope**: Wire backend-filtered project visibility into read-only ProjectSelector affordances, badges, favorite suppression, and privacy-preserving absence of unavailable projects.

**Boundary**: ProjectSelector presentation plus backend filtering/read-only enforcement needed by selector journeys.

**Creates**:
- None

**Modifies**:
- `src/components/ProjectSelector/index.tsx`
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx`
- `src/components/ProjectSelector/ProjectSelectorCard.tsx`
- `src/components/ProjectSelector/useSelectorData.ts`
- `server/security/projectSharing.ts`
- `server/security/apiAuth.ts`
- `tests/e2e/utils/selectors.ts`

**Must Not Touch**:
- `src/components/SettingsModal.tsx`
- `src/components/AuthUnlock/**`
- `server/security/readTokenStore.ts`
- `server/routes/readTokens.ts`

**Create/Move**:
- Add read-only badge/test hooks where ProjectSelector renders visible projects.
- Suppress favorite/project mutation controls for non-owner modes.
- Keep unavailable private/unlisted projects absent.

**Exclude**: No authorization decisions in UI; no disabled placeholders for hidden projects.

**Anti-duplication**: Import existing ProjectSelector manager/data hooks and backend sharing filters; do not create a client-side visibility filter that disagrees with the backend.

**Duplication Guard**:
- Check ProjectSelector data flow before adding access-mode props/state.
- If filtering logic appears in the UI, move enforcement back to server filtering and use UI only for affordances.
- Verify favorites cannot write in read-only mode.

**Verify**:

```bash
bun run --cwd server jest tests/api/public-sharing.test.ts -t "denies all protected project, ticket, and document mutations" --runInBand
bun run validate:ts
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "valid invite exchange cleans URL|share link merge adds|suppresses owner controls|revoked, expired, and invalid invite paths"
```

**Done when**:
- [x] Token-scoped project switching is GREEN.
- [x] Share-link merge remains visible in ProjectSelector.
- [x] Read-only controls are hidden/disabled.
- [x] Backend mutation denial remains authoritative.

## Task 8: Complete E2E journey and final verification

**Skills**: `mdt-frontend`, `playwright-cli`

**Milestone**: M6 - Journey completion (all MDT-177 BDD scenarios)

**Structure**: `tests/e2e/sharing/read-access-journey.spec.ts`, `tests/e2e/utils/selectors.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-read-access-journey` -> `tests/e2e/sharing/read-access-journey.spec.ts`: full MDT-177 journey
- `TEST-e2e-selector-contract` -> `tests/e2e/utils/selectors.ts`: selector contract

**Makes GREEN (Behavior)**:
- `owner_creates_named_multi_project_token` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.1, BR-1.15)
- `owner_generates_one_time_invite_link` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.2)
- `invite_exchange_cleans_url_before_content` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.3)
- `token_scoped_project_switching` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.4)
- `share_link_merge_preserves_token_access` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.5)
- `readonly_unlock_cancel_returns_to_same_view` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.6)
- `readonly_bad_owner_token_preserves_session` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.7)
- `allowed_current_origin_defaults_links` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.8)
- `configured_origin_selection_and_fallback` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.9, BR-1.10)
- `expired_or_invalid_invite_does_not_change_session` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.12, BR-1.16)
- `readonly_owner_controls_hidden` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.14)
- `revocation_recomputed_on_next_access_check` -> `tests/e2e/sharing/read-access-journey.spec.ts` (BR-1.11, BR-1.17)

**Scope**: Finish the Playwright journey and run final backend, frontend, E2E, and trace verification.

**Boundary**: Test stabilization and final integration verification only.

**Creates**:
- None

**Modifies**:
- `tests/e2e/sharing/read-access-journey.spec.ts`
- `tests/e2e/utils/selectors.ts`

**Must Not Touch**:
- `server/security/readTokenStore.ts`
- `server/routes/readTokens.ts`
- `src/components/SettingsModal.tsx`
- `src/App.tsx`

**Create/Move**:
- Keep the journey under `tests/e2e/sharing/`.
- Register all selectors through `tests/e2e/utils/selectors.ts`.

**Exclude**: No production logic changes unless a prior task is reopened; no selector guessing inside tests.

**Anti-duplication**: Import selectors from `tests/e2e/utils/selectors.ts` and fixtures from `tests/e2e/fixtures/test-fixtures.ts`; do not inline selector strings or create a second fixture stack.

**Duplication Guard**:
- Check existing sharing/auth E2E helpers before adding new helpers.
- If journey setup duplicates project creation logic, extract a test helper in the existing E2E helper area.
- Verify final tests assert behavior through the public UI/API, not implementation internals.

**Verify**:

```bash
bun run validate:ts
bun run --cwd server jest tests/security/readTokenStore.test.ts tests/security/readSession.test.ts tests/security/originPolicy.test.ts tests/api/api-auth.test.ts tests/api/read-token-management.test.ts tests/api/public-sharing.test.ts --runInBand
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium
spec-trace validate MDT-177 --stage tasks --format json
spec-trace render tasks MDT-177
```

**Done when**:
- [x] All MDT-177 unit/API tests are GREEN.
- [x] All MDT-177 BDD scenarios are GREEN through Playwright.
- [x] No duplicated selectors, fixtures, route owners, or security helpers exist.
- [x] Final spec-trace tasks validation and render pass.

## Task 9: Extract read-access boundary contracts into domain-contracts

**Skills**: `mdt:implement`

**Milestone**: UAT - Contract boundary hardening

**Structure**: `domain-contracts/src/access/schema.ts`, `domain-contracts/src/access/__tests__/schema.test.ts`, `src/auth/AuthSessionContext.ts`, `src/services/sseClient.ts`, `src/components/SettingsModal/ReadAccessTokens.tsx`, `server/security/apiAuth.ts`, `server/security/publicLinkOrigins.ts`, `server/routes/readTokens.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-access-domain-contracts` -> `domain-contracts/src/access/__tests__/schema.test.ts`: access/read-token schema contracts
- `TEST-read-token-management-api` -> `server/tests/api/read-token-management.test.ts`: read-token API still returns the same DTOs
- `TEST-read-access-journey` -> `tests/e2e/sharing/read-access-journey.spec.ts`: UI still consumes the same sharing journey responses

**Scope**: Move pure access/read-token DTOs into `domain-contracts` and update frontend/backend consumers to import them.

**Boundary**: Do not move route authorization, cookie/session behavior, read-token store persistence internals, or UI behavior into `domain-contracts`.

**Creates**:
- `domain-contracts/src/access/schema.ts`
- `domain-contracts/src/access/index.ts`
- `domain-contracts/src/access/__tests__/schema.test.ts`

**Modifies**:
- `domain-contracts/src/index.ts`
- `shared/models/PublicLinkOrigin.ts`
- `src/auth/AuthSessionContext.ts`
- `src/services/sseClient.ts`
- `src/components/SettingsModal/ReadAccessTokens.tsx`
- `server/security/apiAuth.ts`
- `server/security/publicLinkOrigins.ts`
- `server/security/readTokenStore.ts`
- `server/routes/readTokens.ts`

**Must Not Touch**:
- `server/security/readSession.ts`
- route auth policy behavior
- read-token persisted JSON format
- Playwright journey semantics

**Anti-duplication**: Consumers import types from `@mdt/domain-contracts`; `shared/models/PublicLinkOrigin.ts` is a compatibility re-export only.

**Verify**:

```bash
bun run --cwd domain-contracts test -- access --runInBand
bun run --cwd domain-contracts build
bun run validate:ts
bun run --cwd server jest tests/api/read-token-management.test.ts tests/security/readTokenStore.test.ts --runInBand
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "share session survives refresh"
```

**Done when**:
- [x] Contract schemas parse representative access and read-token DTOs.
- [x] Frontend/backend no longer redeclare the extracted boundary shapes.
- [x] Existing read-token API and refresh journey tests stay GREEN.

## Task 10: Refine owner lock visibility and hamburger access chrome

**Skills**: `mdt-frontend`, `mdt-ux-designer`, `playwright-cli`

**Milestone**: UAT - Lock/status refinement

**Structure**: `src/auth/AuthSessionProvider.tsx`, `src/hooks/useProjectManager.ts`, `src/components/HamburgerMenu.tsx`, `src/App.tsx`, `src/components/RouteErrorModal.tsx`, `domain-contracts/src/access/schema.ts`, `tests/e2e/auth/session-unlock.spec.ts`, `tests/e2e/sharing/read-access-journey.spec.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-auth-session-lock-refresh` -> `tests/e2e/auth/session-unlock.spec.ts`: owner Lock refreshes project visibility and status chrome.
- `TEST-read-access-journey` -> `tests/e2e/sharing/read-access-journey.spec.ts`: shared read access still shows correct read-only status.
- `TEST-access-domain-contracts` -> `domain-contracts/src/access/__tests__/schema.test.ts`: auth access indicator vocabulary is shared.

**Makes GREEN (Behavior)**:
- `owner_lock_refreshes_read_visibility` (BR-1.18)
- `hamburger_access_status_indicator` (BR-1.19)

**Scope**: Refresh all project-list surfaces after owner Lock, improve private-route fallback copy, move read-only status into the hamburger menu, and add owner/shared access dots.

**Boundary**: Header/status UX and frontend project-list reconciliation only. Do not change backend authorization or read-session grant semantics.

**Creates**:
- None

**Modifies**:
- `domain-contracts/src/access/schema.ts`
- `src/auth/AuthSessionContext.ts`
- `src/auth/AuthSessionProvider.tsx`
- `src/hooks/useProjectManager.ts`
- `src/App.tsx`
- `src/components/HamburgerMenu.tsx`
- `src/components/ProjectSelector/ProjectSelectorRail.tsx`
- `src/components/RouteErrorModal.tsx`
- `tests/e2e/auth/session-unlock.spec.ts`
- `tests/e2e/sharing/read-access-journey.spec.ts`
- `tests/e2e/utils/selectors.ts`

**Must Not Touch**:
- server route authorization policy
- read-token persistence format
- share/read-session merge rules

**Verify**:

```bash
bun run --cwd domain-contracts test -- access --runInBand
bun test src/components/HamburgerMenu.test.tsx src/components/AuthUnlock/AuthStatusAction.test.tsx
bun run validate:ts
bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "valid invite exchange"
```

**Done when**:
- [x] Owner Lock removes owner-only projects from every visible project selector after downgrade.
- [x] Public-only read-only access shows no hamburger dot.
- [x] Share/read-token access shows an orange hamburger dot.
- [x] Owner/admin access shows a green hamburger dot.
- [x] Read-only text is inside the hamburger menu, not inline in the header.
