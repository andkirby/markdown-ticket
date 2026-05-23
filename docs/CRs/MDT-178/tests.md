# Tests: MDT-178

## Module -> Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `server/config/runtimeConfig.ts` | `server/tests/config/runtimeConfig.test.ts` | `PUBLIC_ORIGIN` parsing, defaults, strict app-local runtime config access |
| `server/security/originPolicy.ts` | `server/tests/security/originPolicy.test.ts` | allowed-origin policy behavior |
| `server/security/publicLinkOrigins.ts` | `server/tests/security/publicLinkOrigins.test.ts` | public-link defaults, selected origin validation, no safe origin |
| `server/routes/readTokens.ts` | `server/tests/api/read-token-management.test.ts` | configured public origin, `Origin`/`Referer` current-origin fallback |
| Sharing settings UI | `src/components/SettingsModal/ReadAccessTokens.test.tsx` | server-selected origin is used without an owner picker |
| Sharing settings UI | `tests/e2e/sharing/read-access-journey.spec.ts` | configured public origin is used for generated invites |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `server/tests/config/runtimeConfig.test.ts` | runtime parser owns env map and env-boundary scan rejects direct reads outside startup/config |
| C2 | `server/tests/security/originPolicy.test.ts`, `server/tests/security/publicLinkOrigins.test.ts`, `server/tests/api/read-token-management.test.ts` | `PUBLIC_ORIGIN` is the only configured deployment origin |
| C3 | `server/tests/config/runtimeConfig.test.ts` | config stays runtime/app-local |
| C4 | `server/tests/api/read-token-management.test.ts` | app-local runtime config override drives routes |

## Verify

```bash
bun run validate:ts
bun run --cwd server jest tests/config/runtimeConfig.test.ts tests/security/originPolicy.test.ts tests/security/publicLinkOrigins.test.ts tests/api/read-token-management.test.ts --runInBand
bun test src/components/SettingsModal/ReadAccessTokens.test.tsx
rg -n "process\\.env" server --glob '!server/config/**' --glob '!server/server.ts' --glob '!server/tests/**' --glob '!server/dist/**' --glob '!server/mcp-dev-tools/**' --glob '!server/docs/**' && exit 1 || exit 0
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "configured public origin"
```

---
Use `tests.trace.md` for canonical test-plan links.
