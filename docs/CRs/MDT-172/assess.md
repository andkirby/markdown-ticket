# Assessment: MDT-172

## Verdict

**Recommendation**: Option 2 - Redesign Inline

## Feature Pressure

### Target Feature Needs
- Anonymous visitors must read only explicitly shared projects.
- Shared access must support public listing, unlisted share links, and scoped read tokens without write rights.
- Owner/admin access must stay distinct from read-only access.
- Backend authorization must protect every mutation even if UI controls are bypassed.
- Frontend must expose read-only state and remove write affordances.

### Current System Assumptions
- Project discovery returns every active project once the caller reaches `/api/projects`.
- Existing API auth treats routes as either protected owner routes or no-auth local routes.
- Frontend management controls are mostly hidden by owner session state, but board and document code still issue direct mutation fetches in several places.
- Project configuration is split between project-local `.mdt-config.toml` and global registry metadata.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | Visibility is currently mixed into project listing and needs a central access context before routes read projects. |
| Extension Fit | Concerning | Mutating routes span projects, documents, filesystem, auth, and SSE; route-by-route checks would drift. |
| Dependency Fit | Healthy | No new external package is required; crypto, TOML, cookies, and tests are already available. |
| Verification Fit | Concerning | Existing auth tests cover owner auth, but public read-only and route mutation denial need new coverage. |
| Redesign Scope | Concerning | The redesign is bounded to access/sharing services, route middleware, shared types, and read-only UI props. |

## Mismatch Points

### Backend API authorization
- Current system assumes: `createApiAuthMiddleware` decides whether requests may enter protected APIs.
- Feature needs: Owner/admin, anonymous public-read, unlisted share, and scoped read-token access must be represented separately.
- Mismatch: A single owner token cannot express public visibility or read-only denials.
- Adjustment required: Add an access context resolver that classifies request access mode and visible project scope, then centralize project visibility and mutation blocking.
- Scope: bounded.

### Project sharing configuration
- Current system assumes: Project metadata is loaded from project-local config and global registry without a sharing policy.
- Feature needs: Default private, public-readonly, unlisted-readonly, non-enumerable share IDs, and token scopes.
- Mismatch: Project-local config would commit deployment visibility into source-controlled project files.
- Adjustment required: Store sharing policy in global/user registry metadata and expose it through typed contracts without making local config the source of truth.
- Scope: local.

### Frontend read-only surface
- Current system assumes: `canManageProjects` mostly controls project management, but ticket drag/drop and document favorite/config controls can still call mutations.
- Feature needs: Read-only mode disables create, drag/drop, status toggles, project config, document fav writes, and path configuration.
- Mismatch: Mutation affordances are not driven by one access capability.
- Adjustment required: Add `canWrite`/read-only access state and pass it into board, ticket, project selector, settings, and documents surfaces.
- Scope: bounded.

### SSE visibility
- Current system assumes: Connected clients can receive file watcher events globally.
- Feature needs: Read-only visitors must not receive events for unshared projects.
- Mismatch: Event delivery is not scoped to request access context.
- Adjustment required: Track project scope per SSE client and filter emitted project/file/document events before writing.
- Scope: bounded.

## Dependency and Tooling Pressure

- New packages: none.
- Runtime/config impact: new sharing fields in global registry metadata; optional read-token config storage under user config.
- Testing/E2E impact: server route tests for visibility and mutation denial; frontend tests for read-only controls.
- Main risk introduced: accidental project existence leakage through unfiltered reads or error messages.

## Verification Gaps

- Preservation tests needed: owner auth tests must continue passing for protected routes.
- E2E/contract drift risks: route names and UI test selectors around board, project selector, settings, and documents.
- Safe-to-refactor now?: yes, if access logic is centralized and every public route test goes through the same resolver.

## Recommendation

### Option 1: Integrate As-Is
Use when: only owner-authenticated sharing settings are needed.
Architecture impact: insufficient for public visitors and token-scoped reads.

### Option 2: Redesign Inline
Use when: a bounded access-control layer can be added without replacing authentication.
Architecture must redesign: API access context, project sharing metadata, route-level mutation gate, SSE client scope, and read-only UI capabilities.
Expected scope added: new shared access types, backend sharing service/middleware, API tests, and frontend read-only state propagation.

### Option 3: Redesign First
Use when: multi-user accounts or role management must ship first.
Reason redesign cannot wait: not applicable for this ticket; MDT-157 owner session is enough as the write/admin base.
Preferred path: same CR.
