# Tests: MDT-184

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `src/routes.ts` | `src/__tests__/routes.test.ts` | Pattern constants (6) + Builders (10) |
| Constraint C-1 enforcement | `src/__tests__/no-hardcoded-routes.test.ts` | 1 scan test |
| `src/utils/linkBuilder.ts` | `src/utils/linkBuilder.mdt150.test.ts` | Existing (regression) |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Path construction | `routes.ts` | project, ticket, subdoc, document, direct variants |
| Anchor handling | `routes.ts` | with/without anchor for ticket and subdoc |
| Input validation | `linkBuilder.ts` | empty project code, empty ticket key |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C-1 | `src/__tests__/no-hardcoded-routes.test.ts` | scan all src/ for /prj/ literals |
| C-2 | `src/utils/linkBuilder.mdt150.test.ts` | existing regression tests pass |
| C-3 | `src/utils/linkBuilder.mdt150.test.ts` | existing tests pass unchanged |

## Verify

```bash
bun test src/__tests__/routes.test.ts
bun test src/__tests__/no-hardcoded-routes.test.ts
bun test src/utils/linkBuilder.mdt150.test.ts
```
