# Tests: MDT-077

**Source**: [MDT-077](../MDT-077-project-entity-configuration-architecture.md)
**Generated**: 2026-05-15

## Test Strategy

MDT-077 test coverage is contract-first. The important assertion is persisted readback across project configuration modes, not just successful command responses or UI success messages.

## UAT Test Direction

The next test step is a table-driven project contract suite. It should verify the same create/register, read, update, and readback expectations for global-only, project-first, and auto-discovery modes before more interface polish is added.

## Module to Test Mapping

| Area | Test File | Coverage |
|------|-----------|----------|
| Project API update/readback | `server/tests/api/projects.test.ts` | Description-only update, missing-registry fallback, not-found/validation behavior |
| Browser project edit | `tests/e2e/project/management.spec.ts` | Edit modal, immutable fields, save, selector refresh, reopened form readback |
| Shared config persistence | `shared/services/project/__tests__/ProjectConfigService.test.ts` | Global-only, project-first, auto-discovery write ownership |
| Shared discovery/read contract | `shared/services/project/__tests__/ProjectDiscovery.integration.test.ts` | Registered and auto-discovered project listing/read behavior |
| Shared validation | `shared/tools/__tests__/project-management/configuration-validation.test.ts` | Project field validation before mutation |
| CLI project reads | `cli/tests/e2e/project/project.spec.ts` | Agent/human command reads over shared services |
| MCP project reads | `mcp-server/tests/e2e/tools/get-project-info.spec.ts` | MCP read consistency and not-found behavior |

## Constraint Coverage

| Constraint | Test Plans |
|------------|------------|
| `C1` mode ownership | `TEST-project-api-read-update-contract`, `TEST-shared-project-config-modes` |
| `C2` shared project contract | `TEST-shared-project-discovery-contract`, `TEST-cli-project-read-contract`, `TEST-mcp-project-read-contract` |
| `C3` validation boundary | `TEST-project-validation-boundary`, `TEST-project-api-read-update-contract` |
| `C4` persisted readback | `TEST-project-api-read-update-contract`, `TEST-project-browser-edit-readback`, CLI/MCP read plans |
| `C5` project-first registry preservation | `TEST-project-api-read-update-contract`, `TEST-shared-project-config-modes` |
| UAT explicit mode/write reference | `TEST-project-contract-mode-matrix`, `TEST-shared-project-config-modes` |

## Contract Matrix

| Mode | Create/Register | Read | Update | Readback |
|------|-----------------|------|--------|----------|
| Global-only | yes | yes | yes | yes |
| Project-first | yes | yes | yes | yes |
| Auto-discovery | local config | yes | yes | yes |

Required edge coverage:

- Missing registry fallback.
- Description-only update.
- Registry/local conflict.
- Failed write target.
- Project-first registry does not gain operational fields.

## Verification Commands

```bash
bun run build:shared
bun run validate:ts
bun run --cwd server jest --runInBand tests/api/projects.test.ts -t "PUT /api/projects/:code/update|updates description|falls back"
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/project/management.spec.ts --project=chromium
bun run --cwd shared jest --runInBand services/project/__tests__/ProjectConfigService.test.ts services/project/__tests__/ProjectDiscovery.integration.test.ts tools/__tests__/project-management/configuration-validation.test.ts
bun run --cwd cli test -- tests/e2e/project/project.spec.ts
bun run --cwd mcp-server test -- tests/e2e/tools/get-project-info.spec.ts
```

## Notes

- Existing executable tests cover the current project edit fix; future MDT-077 work should expand the shared config-mode tests before changing persistence semantics.
- `tests.trace.md` is the rendered projection from canonical `spec-trace` test-plan records.
