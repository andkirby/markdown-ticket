# Tasks: MDT-178

## Scope Boundaries

- Runtime env parsing belongs in `server/config/runtimeConfig.ts`.
- Origin helpers stay pure and accept plain values.
- Routes consume app-local runtime config; they must not parse env at request time.
- Keep existing env names scoped to their runtime responsibilities.
- Include server unit/API coverage and Playwright E2E coverage.

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------:|---------:|----:|--------|
| server/config | 1 | 1 | 0 | OK |
| server/security | 3 | 3 | 0 | OK |
| server/routes | 3 | 3 | 0 | OK |
| server startup/test wiring | 2 | 2 | 0 | OK |
| tests | 4 | 4 | 0 | OK |
| docs | 1 | 1 | 0 | OK |

### Task 1: Add RuntimeConfig boundary and startup wiring

**Skills**: mdt:implement
**Milestone**: M1 - Runtime config startup boundary (BR-1.1)
**Structure**: `server/config/runtimeConfig.ts`
**Makes GREEN (Automated Tests)**:
- `TEST-runtime-config-parser`
**Makes GREEN (Behavior)**:
- `runtime_config_startup_boundary`

**Scope**: Create typed runtime config parsing, strict app-local getter, and production/test app wiring.
**Boundary**: Do not change project registry or `.mdt-config.toml` schema.
**Creates**:
- `server/config/runtimeConfig.ts`
**Modifies**:
- `server/server.ts`
- `server/tests/api/test-app-factory.ts`
**Must Not Touch**:
- `shared/services/project/*`
- project TOML schema files
**Exclude**: new env names beyond MDT-178 scope
**Duplication Guard**: Check `server/security/apiAuth.ts`, `server/security/originPolicy.ts`, and shared constants before adding parsing logic.

**Verify**:
```bash
bun run --cwd server jest tests/config/runtimeConfig.test.ts --runInBand
rg -n "process\\.env" server --glob '!server/config/**' --glob '!server/server.ts' --glob '!server/tests/**' --glob '!server/dist/**' --glob '!server/mcp-dev-tools/**' --glob '!server/docs/**' && exit 1 || exit 0
```

### Task 2: Make origin policy pure and runtime driven

**Skills**: mdt:implement
**Milestone**: M2 - Public origin selection semantics (BR-1.2, BR-1.3, BR-1.5)
**Structure**: `server/security/publicLinkOrigins.ts`
**Makes GREEN (Automated Tests)**:
- `TEST-origin-policy-runtime-origins`
**Makes GREEN (Behavior)**:
- `public_origin_is_used`
- `no_safe_origin_reported`
- `current_origin_fallback_reported`

**Scope**: Remove env defaults from origin policy helpers and add public-link option selection from runtime values.
**Boundary**: Do not relax CORS checks or accept arbitrary body origins.
**Creates**:
- `server/security/publicLinkOrigins.ts`
- `shared/models/PublicLinkOrigin.ts`
**Modifies**:
- `server/security/originPolicy.ts`
- `server/tests/security/originPolicy.test.ts`
- `server/tests/security/publicLinkOrigins.test.ts`
**Must Not Touch**:
- `server/routes/system.ts`
- `server/routes/devtools.ts` beyond constructor arguments already available
**Exclude**: reverse-proxy policy changes
**Duplication Guard**: Reuse `parsePublicOrigin`; do not duplicate URL trimming in routes.

**Verify**:
```bash
bun run --cwd server jest tests/security/originPolicy.test.ts tests/security/publicLinkOrigins.test.ts --runInBand
```

### Task 3: Inject runtime config into auth, share, and read-token routes

**Skills**: mdt:implement
**Milestone**: M3 - Runtime-configured link generation (BR-1.2, BR-1.3, BR-1.5)
**Structure**: `server/routes/readTokens.ts`
**Makes GREEN (Automated Tests)**:
- `TEST-read-token-runtime-origins`
**Makes GREEN (Behavior)**:
- `public_origin_is_used`
- `no_safe_origin_reported`
- `current_origin_fallback_reported`

**Scope**: Replace route-time env reads in auth/share/read-token routes with runtime config access.
**Boundary**: Preserve existing read-token, invite, and share session behavior.
**Creates**: none
**Modifies**:
- `server/security/apiAuth.ts`
- `server/security/readSession.ts`
- `server/routes/auth.ts`
- `server/routes/share.ts`
- `server/routes/readTokens.ts`
- `server/tests/api/read-token-management.test.ts`
**Must Not Touch**:
- read-token storage JSON format
- project sharing TOML persistence semantics
**Exclude**: RBAC or account model changes
**Duplication Guard**: Use `getRuntimeConfig(req)` and pure origin helpers rather than route-local env parsing.

**Verify**:
```bash
bun run --cwd server jest tests/api/read-token-management.test.ts --runInBand
```

### Task 4: Wire owner UI origin handling and E2E coverage

**Skills**: mdt:implement, playwright-skill
**Milestone**: M4 - Server-owned public origin handling (BR-1.2)
**Structure**: `tests/e2e/sharing/read-access-journey.spec.ts`
**Makes GREEN (Automated Tests)**:
- `TEST-sharing-origin-selection-e2e`
**Makes GREEN (Behavior)**:
- `public_origin_is_used`

**Scope**: Ensure the sharing UI uses the server-selected public origin without synthesizing or selecting origins client-side.
**Boundary**: Keep selectors centralized and do not redesign the settings modal.
**Creates**: none
**Modifies**:
- `src/components/SettingsModal/ReadAccessTokens.tsx`
- `src/components/SettingsModal/ReadAccessTokens.test.tsx`
- `tests/e2e/sharing/read-access-journey.spec.ts`
**Must Not Touch**:
- unrelated settings tabs
- unrelated E2E suites
**Exclude**: visual redesign
**Duplication Guard**: Use existing `sharingSelectors` and existing settings flow helpers.

**Verify**:
```bash
bun test src/components/SettingsModal/ReadAccessTokens.test.tsx
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "configured public origin"
```

### Task 5: Update runtime configuration operator docs

**Skills**: mdt:implement
**Milestone**: M5 - Runtime config SOT documented (C3)
**Structure**: `docs/ENVIRONMENT_VARIABLES.md`
**Makes GREEN (Automated Tests)**:
- `TEST-runtime-config-parser`

**Scope**: Point operators to the runtime configuration SOT and document `PUBLIC_ORIGIN`, `API_READ_SESSION_SECRET`, and startup parsing.
**Boundary**: Do not change Docker deployment architecture.
**Creates**: none
**Modifies**:
- `docs/ENVIRONMENT_VARIABLES.md`
**Must Not Touch**:
- unrelated CR docs
**Exclude**: broad documentation rewrite
**Duplication Guard**: Link to `docs/architecture/runtime-configuration-architecture.md` rather than duplicating all architecture decisions.

**Verify**:
```bash
rg -n "PUBLIC_ORIGIN|Runtime Configuration Architecture" docs/ENVIRONMENT_VARIABLES.md
```
