# Tests: MDT-168

> Canonical test-plan records live in `spec-trace`; this is the human-readable
> specification. Test files are written during implementation (RED → GREEN) per
> the ordered tasks in `tasks.md`.

## Verification Strategy

Three test layers, cheapest first, matching the project's existing conventions:

| Layer              | Runner                              | Where                                                 | What                                                                       |
| ------------------ | ----------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Contract/unit      | Jest (`domain-contracts`, `shared`) | `domain-contracts/src/**/__tests__/`, `shared/tests/` | pure schema/allowlist/defaults/patch logic                                 |
| Server integration | Jest (`server`)                     | `server/tests/services/config/`, `server/tests/api/`  | application service, adapters, atomic failure, side effects, auth, OpenAPI |
| E2E                | Playwright                          | `tests/e2e/config/`                                   | persistence, permissions, validation failure, refresh                      |

## Module → Test Mapping

### domain-contracts (contract layer)

| Module                               | Test File                                                                | Covers                   | Tests                                                                                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config-management/selectors.ts`     | `domain-contracts/src/config-management/__tests__/selectors.test.ts`     | BR-1.1, BR-1.2, C-1, C-2 | ALLOWLIST contains only allowlisted selectors; fileOnly/unknown omitted from read; exposure enum values exact (`editable`,`guarded`,`readOnly`,`fileOnly`); scope values (`project`,`global`,`user`,`registry`); each selector carries owner + validation metadata |
| `config-management/patch-schemas.ts` | `domain-contracts/src/config-management/__tests__/patch-schemas.test.ts` | BR-2.3, C-2, Edge-2      | strict schema rejects invalid value; never converts to default (no `.catch`); tolerant read schema still normalizes legacy value (Edge-2)                                                                                                                          |
| `config-management/defaults.ts`      | `domain-contracts/src/config-management/__tests__/defaults.test.ts`      | C-4, Edge-5              | `PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth === 5`; defaults shape stable; missing-file create uses defaults (Edge-5)                                                                                                                                               |
| `project/schema.ts`                  | existing `domain-contracts/src/project/__tests__/schema.test.ts`         | C-4                      | DocumentConfigObjectSchema default imports from canonical defaults (regression)                                                                                                                                                                                    |

### shared (document patch)

| Module                             | Test File                                                                     | Covers              | Tests                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ProjectDocumentPatch.ts`          | `shared/tests/services/ProjectDocumentPatch.test.ts`                          | BR-3.1, C-3, Edge-1 | validates complete candidate before write; merges paths/excludeFolders/maxDepth; rejects invalid mix with no write (Edge-1) |
| `ProjectConfigService` (doc patch) | `shared/tests/services/ProjectConfigService/configureDocumentsByPath.test.ts` | BR-2.1, C-3         | **preservation regression**: existing sibling fields preserved after patch (existing 3 tests stay green)                    |

### server (application boundary + adapters + API)

| Module                      | Test File                                                       | Covers                              | Tests                                                                                                                             |
| --------------------------- | --------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ConfigApplicationService`  | `server/tests/services/config/ConfigApplicationService.test.ts` | BR-2.1, BR-2.2, BR-2.3, C-3, C-6    | resolves scope; rejects unknown/disallowed/readOnly/fileOnly; validates full candidate; one atomic write; returns effective value |
| Storage adapters            | `server/tests/services/config/adapters/StorageAdapters.test.ts` | BR-2.1, BR-3.2, BR-3.3, C-3, C-6    | each adapter reads tolerant + writes atomic; per-scope file targeting                                                             |
| Atomic failure              | `server/tests/services/config/AtomicFailure.test.ts`            | BR-2.2, BR-2.3, Edge-1, C-3         | valid+invalid mix → no file written; invalid value → no write                                                                     |
| Side-effect registry        | `server/tests/services/config/ConfigSideEffectRegistry.test.ts` | BR-3.1, BR-3.2, Edge-3, Edge-4, C-5 | effects fire only on success; effect failure reported distinct from write; idempotent convergence                                 |
| Guarded operations          | `server/tests/services/config/GuardedOperations.test.ts`        | BR-4.1, BR-4.2                      | confirmation required; registry+local stay consistent; no partial desync                                                          |
| Config API (validation)     | `server/tests/api/config-api.test.ts`                           | BR-2.2, BR-2.3, C-9                 | field-level error naming selector; stable response shape                                                                          |
| Config owner-only policy    | `server/tests/api/config-owner-only.test.ts`                    | BR-5.1, C-8                         | read-only session → 403 + no writable detail; anonymous → 403                                                                     |
| OpenAPI contract            | `server/tests/api/config-openapi.test.ts`                       | C-9                                 | response matches registered components; field error shape documented                                                              |
| Thin routes                 | `server/tests/routes/config-routes-thin.test.ts`                | C-7                                 | routes delegate to service; no fs/parseToml logic inline                                                                          |
| ConfigRepository (defaults) | `server/tests/unit/ConfigRepository.test.ts`                    | C-4                                 | maxDepth default = 5 not undefined (existing 8 tests + new assertion)                                                             |
| No new packages             | `server/tests/config/package-deps-unchanged.test.ts`            | C-10                                | snapshot of package.json dependencies unchanged after MDT-168                                                                     |

### frontend

| Module                | Test File                             | Covers                        | Tests                                                                                                          |
| --------------------- | ------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `configApiClient.ts`  | `src/config/configApiClient.test.ts`  | BR-1.1, BR-2.2                | read returns descriptors; mutation maps field errors                                                           |
| `useBackendConfig.ts` | `src/hooks/useBackendConfig.test.tsx` | BR-3.2, BR-6.1, BR-7.1, Edge-6 | staged edits + save status; browser-only change emits no backend call; **ui.projectSelector.* save emits selector-prefs refresh signal** |
| `useSelectorData.ts`  | `src/components/ProjectSelector/useSelectorData.test.tsx` | BR-7.1 | **on `mdt:selector-prefs-updated`, re-fetches backend prefs from `/api/config/selector` and layers localStorage overrides (preserves merge order)** |

### E2E (Playwright, isolated 6173/4001)

| Suite                 | File                                                        | Covers (BDD scenario)                                                                                                                    |
| --------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Persistence + refresh | `tests/e2e/config/configuration-persistence.spec.ts`        | `valid_editable_selector_persisted_atomically`, `document_config_patch_refreshes_tree`, `global_user_setting_persisted_with_side_effect` |
| Permissions           | `tests/e2e/config/configuration-permissions.spec.ts`        | `readonly_denied_config_detail_and_mutation`                                                                                             |
| Validation failure    | `tests/e2e/config/configuration-validation-failure.spec.ts` | `reject_disallowed_or_unknown_selector`, `reject_invalid_value_never_defaults`                                                           |
| Refresh behavior      | `tests/e2e/config/configuration-refresh.spec.ts`            | `document_config_patch_refreshes_tree`, `selector_pref_change_refreshes_live_consumers`                                                  |

## Data Mechanism Tests

| Pattern                                 | Module                      | Tests                                               |
| --------------------------------------- | --------------------------- | --------------------------------------------------- |
| document `maxDepth` boundary (1–10)     | patch schema / PathSelector | at 0 (reject), 1 (accept), 10 (accept), 11 (reject) |
| discovery `maxDepth` boundary (1–50)    | global patch schema         | at 0, 1, 50, 51                                     |
| path format (`..`, absolute, separator) | patch schema                | valid relative accepted; `..`/absolute rejected     |
| link flag booleans                      | global patch schema         | true/false accepted; non-boolean rejected           |
| exposure classification                 | selectors contract          | each of 4 classes mapped correctly                  |

## External Dependency Tests

| Dependency                                                    | Real Test                                                     | Behavior When Absent                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| config files (`.mdt-config.toml`, `config.toml`, `user.toml`) | adapter integration against temp `CONFIG_DIR` (real fs)       | missing file → create with defaults (Edge-5); invalid → tolerant normalize for read, strict reject for write (Edge-2) |
| owner auth session                                            | API integration with real `TestEnvironment` read-only session | read-only → 403                                                                                                       |

## Constraint Coverage

| Constraint ID | Closed By                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| BR-7.1        | TEST-use-backend-config-refresh-signal, TEST-selector-data-refresh-on-signal, TEST-e2e-config-refresh                    |
| C-1           | TEST-allowlist-exposure-contract                                                                                          |
| C-2           | TEST-patch-schemas-strict, TEST-allowlist-exposure-contract                                                               |
| C-3           | TEST-document-patch-command, TEST-config-application-service, TEST-atomic-failure-no-partial, TEST-scope-storage-adapters |
| C-4           | TEST-canonical-defaults, TEST-config-repository-defaults-regression                                                       |
| C-5           | TEST-side-effect-registry                                                                                                 |
| C-6           | TEST-config-application-service, TEST-scope-storage-adapters                                                              |
| C-7           | TEST-thin-routes-controllers                                                                                              |
| C-8           | TEST-config-owner-only-policy                                                                                             |
| C-9           | TEST-config-api-validation-errors, TEST-config-openapi-contract                                                           |
| C-10          | TEST-no-new-packages                                                                                                      |

## Preservation Tests (must stay green — assess.md verification gaps)

These existing tests lock current behavior and must remain green through the refactor:

- `server/tests/unit/ConfigRepository.test.ts` (8 tests) — tolerant read/fallback, ticketsPath exclusion.
- `shared/tests/services/ProjectConfigService/configureDocumentsByPath.test.ts` (3 tests) — `[project.document.paths]` persistence + sibling preservation.
- `server/tests/api/config-maintenance-policy.test.ts` — maintenance gating.
- `domain-contracts/src/app-config/__tests__/accent.test.ts` — tolerant global/user reads.

## Verify

```bash
# contract + defaults + patch (cheapest)
bun run --cwd domain-contracts test
bun run --cwd shared jest --testPathPattern="(ProjectDocumentPatch|configureDocumentsByPath)"

# server integration + API + auth + openapi
bun run --cwd server jest --testPathPattern="(config|ConfigRepository)"

# frontend unit
bun test ./src --filter "(configApiClient|useBackendConfig)"

# E2E (isolated)
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/config --project=chromium
```

---

Use `tests.trace.md` for canonical test-plan records.
_Rendered by mdt:tests via spec-trace_
