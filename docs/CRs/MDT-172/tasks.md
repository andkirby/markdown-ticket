# Tasks: MDT-172

## Scope Boundaries

- Backend authorization remains the source of truth.
- Sharing state is global/user registry metadata, not project-local config.
- Read tokens and share sessions are read-only only.
- No OAuth, user accounts, team roles, public writes, or JWT migration.

## Task 1: Add typed sharing metadata and registry preservation

**Structure**: `domain-contracts/src/project/schema.ts`

**Makes GREEN**
- `private_by_default`
- `TEST-public-sharing-api`

**Creates**
- Sharing mode and metadata contract fields.

**Modifies**
- `domain-contracts/src/project/schema.ts`
- `shared/services/project/ProjectFactory.ts`
- `shared/services/project/ProjectDiscoveryService.ts`
- `shared/services/project/ProjectConfigService.ts`

**Must Not Touch**
- Ticket frontmatter schemas.
- Project-local sharing persistence.

**Verify**
```bash
bun run build:domain-contracts
```

## Task 2: Implement backend read-only access context and read session exchange

**Structure**: `server/security/`

**Makes GREEN**
- `anonymous_public_listing`
- `unlisted_share_link_opens_project`
- `scoped_read_token_expands_projects`
- `invalid_token_generic_denial`
- `share_code_exchange_cleans_url`
- `TEST-public-sharing-api`

**Creates**
- `server/security/readSession.ts`
- `server/security/projectSharing.ts`
- `server/routes/share.ts`

**Modifies**
- `server/security/apiAuth.ts`
- `server/routes/auth.ts`

**Must Not Touch**
- Owner session cookie format except reading it as owner-admin.

**Verify**
```bash
bun run --cwd server jest server/tests/api/public-sharing.test.ts
```

## Task 3: Apply centralized access policy to project, document, system, and SSE routes

**Structure**: `server/security/accessPolicy.ts`, `server/routes/`, `server/controllers/`, `server/services/fileWatcher/`

**Makes GREEN**
- `readonly_mutations_are_denied`
- `unlisted_share_link_opens_project`
- `TEST-public-sharing-api`
- `TEST-sse-sharing-scope`
- `TEST-system-route-sharing-access`

**Creates**
- `server/security/accessPolicy.ts`

**Modifies**
- `server/controllers/ProjectController.ts`
- `server/routes/projects.ts`
- `server/routes/documents.ts`
- `server/routes/system.ts`
- `server/routes/sse.ts`
- `server/services/fileWatcher/SSEBroadcaster.ts`
- `server/services/fileWatcher/index.ts`

**Must Not Touch**
- Ticket parsing and markdown serialization.

**Verify**
```bash
bun run --cwd server jest server/tests/api/public-sharing.test.ts
```

## Task 4: Add owner sharing settings and frontend read-only capabilities

**Structure**: `src/auth/`, `src/App.tsx`, `src/components/`

**Makes GREEN**
- `owner_updates_project_sharing`
- `readonly_ui_removes_editing`
- `share_code_exchange_cleans_url`
- `TEST-readonly-ui`
- `TEST-share-code-url-cleanup`

**Creates**
- `src/components/ReadOnlyMode.test.tsx`

**Modifies**
- `src/auth/AuthSessionProvider.tsx`
- `src/App.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/ProjectView.tsx`
- `src/components/Board.tsx`
- `src/components/Column/index.tsx`
- `src/components/DocumentsView/DocumentsLayout.tsx`

**Must Not Touch**
- Visual theme system beyond necessary control disabling/hiding.

**Verify**
```bash
bun test src/components/ReadOnlyMode.test.tsx
```

## Task 5: Run validation and fix review findings

**Structure**: validation only.

**Makes GREEN**
- `TEST-public-sharing-api`
- `TEST-readonly-ui`
- `TEST-sse-sharing-scope`

**Creates**
- No production files.

**Modifies**
- Only files already touched by Tasks 1-4.

**Must Not Touch**
- Unrelated dirty worktree files.

**Verify**
```bash
bun run validate:ts
bun run --cwd server jest server/tests/api/public-sharing.test.ts
bun test src/components/ReadOnlyMode.test.tsx
```

## Trace

- Tasks trace projection: [tasks.trace.md](./tasks.trace.md)

## Follow-up TODOs from sharing UAT

- [ ] Treat `MDT-178` as a required architecture cleanup before closing public/read-only sharing as production-ready.
- [ ] Verify generated share and invite links use the runtime-configured public origin and do not fall back to `localhost` when `ALLOWED_DOMAINS` is configured.
- [ ] Add E2E coverage for the owner journey where a configured public hostname is selected for a read-access invite link.
- [ ] Keep sharing storage and runtime deployment settings separate: project sharing/token state stays in `CONFIG_DIR`, while deployment origins come from the runtime config boundary.
