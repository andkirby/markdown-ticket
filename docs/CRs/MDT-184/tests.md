# Tests: MDT-184

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `frontend/src/routes.ts` | `frontend/src/__tests__/routes.test.ts` | Pattern constants (6) + Builders (10) |
| Constraint C-1 enforcement | `frontend/src/__tests__/no-hardcoded-routes.test.ts` | 1 scan test |
| `frontend/src/utils/linkBuilder.ts` | `frontend/src/utils/linkBuilder.mdt150.test.ts` | Existing (regression) |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Path construction | `routes.ts` | project, ticket, subdoc, document, direct variants |
| Anchor handling | `routes.ts` | with/without anchor for ticket and subdoc |
| Input validation | `linkBuilder.ts` | empty project code, empty ticket key |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C-1 | `frontend/src/__tests__/no-hardcoded-routes.test.ts` | scan all frontend/src/ for /prj/ literals |
| C-2 | `frontend/src/utils/linkBuilder.mdt150.test.ts` | existing regression tests pass |
| C-3 | `frontend/src/utils/linkBuilder.mdt150.test.ts` | existing tests pass unchanged |

## Verify

```bash
bun test frontend/src/__tests__/routes.test.ts
bun test frontend/src/__tests__/no-hardcoded-routes.test.ts
bun test frontend/src/utils/linkBuilder.mdt150.test.ts
```
