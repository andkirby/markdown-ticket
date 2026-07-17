# Tasks: MDT-168

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **domain-contracts**: pure contract only — selector types, exposure enum, strict patch schemas, canonical defaults. No fs/controller/UI.
- **server/services/config**: the ONE application boundary + scope adapters + side-effect registry. No route/transport logic.
- **server/routes + controllers**: transport-only delegates. No direct filesystem/TOML logic inline.
- **shared**: typed document patch command only. No HTTP.
- **frontend**: config API client + backend-config hook + owned UI sections. Browser-only prefs stay client-side.

## Ownership Guardrails

| Critical Behavior                  | Owner Module                                         | Merge/Refactor Task if Overlap               |
| ---------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Selector allowlist + exposure      | `domain-contracts/.../selectors.ts`                  | N/A (new)                                    |
| Strict mutation validation         | `domain-contracts/.../patch-schemas.ts`              | N/A (new)                                    |
| Configuration apply/write boundary | `server/services/config/ConfigApplicationService.ts` | N/A (new)                                    |
| Per-scope file persistence         | `server/services/config/adapters/*`                  | N/A (new)                                    |
| Post-write side effects            | `server/services/config/ConfigSideEffectRegistry.ts` | N/A (new)                                    |
| Document config mutation seam      | `shared/.../ProjectDocumentPatch.ts`                 | TASK-3 (replaces `configureDocumentsByPath`) |
| Config HTTP endpoints              | `server/routes/config.ts` + `ConfigController.ts`    | TASK-5 (extracts from `system.ts`)           |

## Constraint Coverage

| Constraint ID | Tasks          |
| ------------- | -------------- |
| C-1           | TASK-1, TASK-5 |
| C-2           | TASK-1, TASK-4 |
| C-3           | TASK-3, TASK-4 |
| C-4           | TASK-1, TASK-2 |
| C-5           | TASK-4         |
| C-6           | TASK-4         |
| C-7           | TASK-5         |
| C-8           | TASK-5         |
| C-9           | TASK-5         |
| C-10          | TASK-9         |

## Milestones

| Milestone                                     | BDD Scenarios (BR)                                                                                                                                                                                                                    | Tasks          | Checkpoint                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------- |
| M0: Contract foundation                       | —                                                                                                                                                                                                                                     | TASK-1, TASK-2 | domain-contracts build + tests GREEN   |
| M1: Application boundary (reads + validation) | read_returns_exposure_metadata, read_omits_fileonly_and_unknown, reject_disallowed_or_unknown_selector, reject_invalid_value_never_defaults, readonly_denied_config_detail_and_mutation, valid_editable_selector_persisted_atomically | TASK-4, TASK-5 | server integration tests GREEN         |
| M2: Document + guarded + metadata             | document_config_patch_refreshes_tree, project_metadata_edit_returns_effective_value, guarded_op_requires_confirmation, guarded_op_keeps_registry_local_consistent                                                                     | TASK-3, TASK-6 | document patch + guarded tests GREEN   |
| M3: Frontend isolation                        | browser_only_never_reaches_backend                                                                                                                                                                                                    | TASK-7, TASK-8 | frontend unit tests GREEN              |
| M4: E2E acceptance + docs                     | global_user_setting_persisted_with_side_effect (+ all E2E)                                                                                                                                                                            | TASK-9         | E2E suites GREEN; durable docs updated |

---

## Tasks

### Task 1: config-management contract module (M0)

**Skills**: mdt-frontend (domain-contracts AGENTS.md scope)

**Structure**: `domain-contracts/src/config-management/`

**Makes GREEN (Automated Tests)**:

- `TEST-allowlist-exposure-contract` → `selectors.test.ts`: allowlist contains only allowlisted selectors; fileOnly/unknown omitted; exposure values exact
- `TEST-patch-schemas-strict` → `patch-schemas.test.ts`: strict reject, never defaults
- `TEST-canonical-defaults` → `defaults.test.ts`: maxDepth=5

**Scope**: selector type, Exposure enum, default-deny ALLOWLIST registry (project/global/user/registry selectors from exposure.md), strict per-selector patch Zod schemas, `PROJECT_DOCUMENT_CONFIG_DEFAULTS`. C-1, C-2, C-4.
**Boundary**: pure contract only. No fs, no controller, no UI defaults.

**Creates**:

- `domain-contracts/src/config-management/index.ts`
- `domain-contracts/src/config-management/selectors.ts`
- `domain-contracts/src/config-management/patch-schemas.ts`
- `domain-contracts/src/config-management/defaults.ts`
- `domain-contracts/src/config-management/__tests__/selectors.test.ts`
- `domain-contracts/src/config-management/__tests__/patch-schemas.test.ts`
- `domain-contracts/src/config-management/__tests__/defaults.test.ts`

**Modifies**:

- `domain-contracts/src/index.ts` (export config-management barrel)

**Must Not Touch**: server, frontend, shared services, package.json.
**Exclude**: no tolerant `.catch()` on patch schemas; no filesystem defaults here.
**Anti-duplication**: reuse `SafeConfigPathStringSchema`/`ProjectRelativeDocumentPathSchema` from existing `app-config`/`project` schemas via import — do NOT redeclare path validators.
**Duplication Guard**: owner-check confirms no existing selector/exposure registry exists; the new `config-management` module is the single owner.

**Verify**:

```bash
bun run --cwd domain-contracts build
bun run --cwd domain-contracts test   # 3 new suites GREEN (pre-existing bun:test suites unchanged)
```

**Done when**: contract tests GREEN; build passes; no new dependency.

---

### Task 2: consume canonical defaults (resolve maxDepth drift) (M0)

**Structure**: consumers of `PROJECT_DOCUMENT_CONFIG_DEFAULTS`

**Makes GREEN (Automated Tests)**:

- `TEST-canonical-defaults`, `TEST-config-repository-defaults-regression` → existing `ConfigRepository.test.ts` (+ assertion maxDepth default=5)

**Scope**: wire `PROJECT_DOCUMENT_CONFIG_DEFAULTS` into the 4 drift sites so all read 5 from one source. C-4.
**Boundary**: change default _sources_ only; do not alter document-tree algorithm behavior (it already effectively used 5).

**Modifies**:

- `domain-contracts/src/project/schema.ts` (DocumentConfigObjectSchema default imports canonical)
- `server/repositories/ConfigRepository.ts` (`_getDefaultConfig` maxDepth → canonical, no longer undefined)
- `server/builders/TreeBuilder.ts` (param default imports canonical)
- `server/strategies/PathSelectionStrategy.ts` (fallback imports canonical)

**Must Not Touch**: frontend, routes, patch schemas, MCP server config (different concept).
**Exclude**: do not change discovery maxDepth (global, stays 3) — different concept.
**Anti-duplication**: import the constant; never re-literal `5`.
**Duplication Guard**: grep for `maxDepth` literals after change — only the canonical constant and discovery (3) remain.

**Verify**:

```bash
bun run --cwd domain-contracts test
bun run --cwd server jest --testPathPattern=ConfigRepository   # 8 existing + 1 new GREEN
```

**Done when**: no `maxDepth` literal `5` remains except the canonical default; ConfigRepository returns 5 not undefined.

---

### Task 3: typed ProjectDocumentPatch command (M2)

**Structure**: `shared/services/project/ProjectDocumentPatch.ts`

**Makes GREEN (Automated Tests)**:

- `TEST-document-patch-command`, `TEST-document-patch-preserve-regression`

**Scope**: typed patch command (`{paths?, excludeFolders?, maxDepth?}`) that validates the complete candidate via strict schema before write, merges with existing `[project.document]`, preserves siblings, returns effective values. C-3, Edge-1.
**Boundary**: shared logic only; no HTTP, no watcher logic.

**Creates**:

- `shared/services/project/ProjectDocumentPatch.ts`
- `shared/tests/services/ProjectDocumentPatch.test.ts`

**Modifies**:

- `shared/services/project/ProjectConfigService.ts` (`configureDocumentsByPath` delegates to patch apply; keeps signature for back-compat)

**Must Not Touch**: controllers, routes, frontend.
**Exclude**: do not remove the existing `configureDocuments` public method (back-compat for `POST /api/documents/configure`).
**Anti-duplication**: use `writeFileAtomic` + `stringifyAndVerify` from shared utils — do NOT inline a writer.
**Duplication Guard**: the patch command is the single document-mutation seam; `configureDocumentsByPath` becomes a thin caller.

**Verify**:

```bash
bun run --cwd shared jest --testPathPattern="(ProjectDocumentPatch|configureDocumentsByPath)"
```

**Done when**: existing 3 preservation tests stay GREEN; new patch tests GREEN.

---

### Task 4: ConfigApplicationService + adapters + side-effect registry (M1)

**Structure**: `server/services/config/`

**Makes GREEN (Automated Tests)**:

- `TEST-config-application-service`, `TEST-scope-storage-adapters`, `TEST-atomic-failure-no-partial`, `TEST-side-effect-registry`

**Makes GREEN (Behavior)**:

- `valid_editable_selector_persisted_atomically`, `reject_disallowed_or_unknown_selector`, `reject_invalid_value_never_defaults` (BR-2.1, BR-2.2, BR-2.3)

**Scope**: the one application boundary: resolve scope from allowlist, validate full candidate (strict), delegate to the correct scope adapter, one atomic write per file, run injected side effects, return effective value. Adapters: Global/User/Project/Registry, each read-tolerant + write-atomic. C-3, C-5, C-6.
**Boundary**: no transport; no route policy. Effects injected as dependencies.

**Creates**:

- `server/services/config/ConfigApplicationService.ts`
- `server/services/config/ConfigSideEffectRegistry.ts`
- `server/services/config/adapters/GlobalConfigStorageAdapter.ts`
- `server/services/config/adapters/UserConfigStorageAdapter.ts`
- `server/services/config/adapters/ProjectConfigStorageAdapter.ts`
- `server/services/config/adapters/RegistryConfigStorage.ts`
- `server/tests/services/config/ConfigApplicationService.test.ts`
- `server/tests/services/config/adapters/StorageAdapters.test.ts`
- `server/tests/services/config/AtomicFailure.test.ts`
- `server/tests/services/config/ConfigSideEffectRegistry.test.ts`

**Modifies**: (none directly; consumed by TASK-5/TASK-6)

**Must Not Touch**: routes, controllers, domain-contracts, frontend.
**Exclude**: no side effects inside TOML helpers; no catch-all god-service.
**Anti-duplication**: import `writeFileAtomic`/`stringifyAndVerify`/`parseToml` from shared; import schemas from domain-contracts.
**Duplication Guard**: each adapter owns exactly one config file; no two adapters target the same file.

**Verify**:

```bash
bun run --cwd server jest --testPathPattern="services/config"
```

**Done when**: atomic-failure (valid+invalid mix → no write) GREEN; side-effect failure reported distinct from write.

---

### Task 5: thin ConfigController + extracted routes + OpenAPI (M1)

**Skills**: architecture-patterns (per docs/SKILLS.md, load when mdt:architecture used)

**Structure**: `server/controllers/ConfigController.ts`, `server/routes/config.ts`

**Makes GREEN (Automated Tests)**:

- `TEST-config-api-validation-errors`, `TEST-config-owner-only-policy`, `TEST-config-openapi-contract`, `TEST-thin-routes-controllers`

**Makes GREEN (Behavior)**:

- `read_returns_exposure_metadata`, `read_omits_fileonly_and_unknown`, `readonly_denied_config_detail_and_mutation` (BR-1.1, BR-1.2, BR-5.1)

**Scope**: extract config endpoints from `system.ts` into `routes/config.ts` + thin `ConfigController` that delegates to `ConfigApplicationService`. Register OpenAPI components (selector/patch response + field-error shape). Keep `/api/config/*` owner-only. C-7, C-8, C-9.
**Boundary**: transport-only; all logic in the service.

**Creates**:

- `server/controllers/ConfigController.ts`
- `server/routes/config.ts`
- `server/tests/api/config-api.test.ts`
- `server/tests/api/config-owner-only.test.ts`
- `server/tests/api/config-openapi.test.ts`
- `server/tests/routes/config-routes-thin.test.ts`

**Modifies**:

- `server/routes/system.ts` (remove config endpoints; keep status/health/filesystem/cache)
- `server/server.ts` (mount routes/config.ts)
- `server/security/accessPolicy.ts` (ensure new config routes stay owner-only)
- `server/openapi/schemas.ts` + `server/openapi/config.ts` (register components + docs)

**Must Not Touch**: `POST /api/config/selector` (selector JSON state — stays on maintenance-gated path), auth middleware internals.
**Exclude**: do not add filesystem logic to routes; routes only parse/validate transport and delegate.
**Anti-duplication**: the service is the only config writer; routes never read files directly.
**Duplication Guard**: confirm `system.ts` no longer holds any `/api/config/*` handler after extraction.

**Verify**:

```bash
bun run --cwd server jest --testPathPattern="(config-api|config-owner-only|config-openapi|config-routes-thin)"
```

**Done when**: read returns exposure metadata; read-only session → 403 + no writable detail; OpenAPI validates.

---

### Task 6: ProjectController document rewire + guarded workflows (M2)

**Structure**: `server/controllers/ProjectController.ts`

**Makes GREEN (Automated Tests)**: `TEST-guarded-operations`

**Makes GREEN (Behavior)**:

- `document_config_patch_refreshes_tree`, `project_metadata_edit_returns_effective_value`, `guarded_op_requires_confirmation`, `guarded_op_keeps_registry_local_consistent` (BR-3.1, BR-3.3, BR-4.1, BR-4.2)

**Scope**: rewire `configureDocuments` to the document patch command (back-compat translate legacy `{projectId, documentPaths}`); add guarded workflows for code/ticketsPath/registry-path requiring confirmation + invariants, keeping registry/local consistent.
**Boundary**: controller delegates to `ConfigApplicationService` + document patch; no inline TOML.

**Modifies**:

- `server/controllers/ProjectController.ts`
- `server/tests/services/config/GuardedOperations.test.ts` (new)

**Must Not Touch**: routes/config.ts (TASK-5), domain-contracts, frontend.
**Exclude**: do not treat guarded fields as scalar patches.
**Anti-duplication**: guarded ops call `ConfigApplicationService.applyGuarded*`; no second writer.
**Duplication Guard**: only one path mutates project identity (the guarded workflow).

**Verify**:

```bash
bun run --cwd server jest --testPathPattern="(GuardedOperations|configureDocuments)"
```

**Done when**: guarded op without confirm rejected; registry+local consistent after confirm.

---

### Task 7: configApiClient + useBackendConfig hook (M3)

**Skills**: mdt-frontend, frontend-react-component

**Structure**: `src/config/configApiClient.ts`, `src/hooks/useBackendConfig.ts`

**Makes GREEN (Automated Tests)**: `TEST-frontend-config-api-client`, `TEST-use-backend-config-hook`

**Makes GREEN (Behavior)**: `browser_only_never_reaches_backend` (BR-6.1)

**Scope**: typed client (read descriptors, mutate via authFetch with ownerIntent, map field errors); hook with staged edits, save status, exposure metadata. Browser-only prefs never call this client.
**Boundary**: client + hook only; no UI rendering (TASK-8).

**Creates**:

- `src/config/configApiClient.ts` + `src/config/configApiClient.test.ts`
- `src/hooks/useBackendConfig.ts` + `src/hooks/useBackendConfig.test.tsx`

**Must Not Touch**: `src/config/settingsPreferences.ts` and other browser-only modules (they stay localStorage).
**Exclude**: never import TOML or backend persistence into browser-only handlers.
**Anti-duplication**: reuse `authFetch`; reuse existing staged-edit pattern from Project Accents.
**Duplication Guard**: `useBackendConfig` is the only backend-config state owner; Settings sections consume it.

**Verify**:

```bash
bun test ./src   # configApiClient + useBackendConfig GREEN
```

**Done when**: browser-only change emits zero backend calls (Edge-6).

---

### Task 8: Settings owned sections + Documents editing + Project Edit guarded (M3)

**Skills**: mdt-frontend, mdt-ux-designer, frontend-react-component

**Structure**: `src/components/SettingsModal/`, `src/components/DocumentsView/PathSelector.tsx`, `src/components/AddProjectModal/`

**Scope**: split backend-config Settings sections consuming `useBackendConfig`; add Documents `excludeFolders`/`maxDepth` editing via document patch; Project Edit guarded workflow entry with confirmation.
**Boundary**: UI only; all persistence via TASK-7 client/hook.

**Modifies**:

- `src/components/SettingsModal.tsx` + `src/components/SettingsModal/*` (owned sections)
- `src/components/DocumentsView/PathSelector.tsx` (editable excludeFolders/maxDepth)
- `src/components/AddProjectModal/AddProjectModal.tsx` (guarded entry)
- durable: `docs/design/surfaces/settings.spec.md`, `documents-path-selector.spec.md`, `project-edit-form.spec.md` (capability boundaries + new controls)

**Must Not Touch**: browser-only preference handlers, backend services.
**Exclude**: do not expand SettingsModal into a persistence monolith.
**Anti-duplication**: backend sections consume `useBackendConfig`; browser-only sections unchanged.
**Duplication Guard**: no second config-write UI path; each selector owned by exactly one surface (exposure matrix).

**Verify**:

```bash
bun test ./src
bun run lint
```

**Done when**: capability boundaries added to surface specs; Documents can edit all 3 document fields.

---

### Task 9: E2E suites + durable docs + package guard (M4)

**Skills**: playwright-skill

**Makes GREEN (Automated Tests)**: `TEST-e2e-config-persistence`, `TEST-e2e-config-permissions`, `TEST-e2e-config-validation-failure`, `TEST-e2e-config-refresh`, `TEST-no-new-packages`

**Makes GREEN (Behavior)**: `global_user_setting_persisted_with_side_effect` (BR-3.2) + all E2E-validated scenarios

**Scope**: focused Playwright suites for persistence, permissions, validation failure, refresh; package-deps-unchanged guard; finalize durable design docs.
**Boundary**: tests + docs only.

**Creates**:

- `tests/e2e/config/configuration-persistence.spec.ts`
- `tests/e2e/config/configuration-permissions.spec.ts`
- `tests/e2e/config/configuration-validation-failure.spec.ts`
- `tests/e2e/config/configuration-refresh.spec.ts`
- `server/tests/config/package-deps-unchanged.test.ts`

**Modifies**: durable surface specs (finalized from TASK-8 draft).

**Must Not Touch**: runtime source (tests only, unless a fix is needed — then route back to owning task).
**Exclude**: do not weaken tests or accept snapshot churn without investigation.
**Anti-duplication**: E2E uses `shared/test-lib` TestEnvironment for isolation.
**Duplication Guard**: E2E asserts the same contracts as the API unit tests (no divergent expectations).

**Verify**:

```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/config --project=chromium
bun run --cwd server jest --testPathPattern=package-deps-unchanged
git diff --check
```

**Done when**: E2E suites GREEN; package.json/bun.lock unchanged; durable docs describe final behavior.

---

## Architecture Coverage

| Layer                                                         | Arch Files | In Tasks     | Gap | Status |
| ------------------------------------------------------------- | ---------- | ------------ | --- | ------ |
| domain-contracts/config-management (4) + app-config (1)       | 5          | 5 (TASK-1)   | 0   | ✅     |
| domain-contracts/project/schema.ts                            | 1          | 1 (TASK-2)   | 0   | ✅     |
| server/services/config (3) + adapters (1)                     | 4          | 4 (TASK-4)   | 0   | ✅     |
| server/controllers + routes + openapi + accessPolicy          | 6          | 6 (TASK-5)   | 0   | ✅     |
| server/controllers/ProjectController.ts                       | 1          | 1 (TASK-6)   | 0   | ✅     |
| server/repositories + builders + strategies                   | 3          | 3 (TASK-2)   | 0   | ✅     |
| shared ProjectDocumentPatch + ProjectConfigService            | 2          | 2 (TASK-3)   | 0   | ✅     |
| frontend client + hook + sections + pathselector + addproject | 5          | 5 (TASK-7/8) | 0   | ✅     |

No orphaned files.

## Post-Implementation

- [ ] No duplication (grep: no second config writer, no `maxDepth` literal except canonical)
- [ ] Scope boundaries respected
- [ ] All unit/integration tests GREEN
- [ ] All BDD scenarios GREEN (E2E)
- [ ] Smoke: owner can edit document maxDepth, see tree refresh; read-only visitor blocked
- [ ] package.json/bun.lock unchanged (C-10)
