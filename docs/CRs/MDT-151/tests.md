# Tests: MDT-151

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `SubdocumentService` | `shared/services/ticket/__tests__/SubdocumentService.security.test.ts` | 18 |
| Subdocument API | `server/tests/api/subdocuments.security.test.ts` | 6 |
| `ProjectValidator` | `shared/tools/__tests__/project-management/ticketsPath-validation.test.ts` | 8 |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Length boundary (255) | `SubdocumentService` | at 255 (valid), at 256 (rejected) |
| Input whitelist | `SubdocumentService` | null bytes, double encoding, unicode slashes, whitespace-only |
| Path containment | `SubdocumentService` | literal `..`, embedded `..`, deeply nested traversal |
| Config path traversal | `ProjectValidator` | `../../shared`, `docs/../etc`, `..` |
| Config path acceptance | `ProjectValidator` | `docs/CRs`, `CRs`, `/var/mdt/tickets`, `./docs/CRs` |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 (<1ms overhead) | `SubdocumentService.security.test.ts` | Implicit — all tests use sync ops; explicit perf test in implementation |
| C2 (no regression) | All 3 test files | All existing patterns covered alongside new security tests |
| C3 (API contract) | `subdocuments.security.test.ts` | 200 for valid, 404 with same body for rejected |

## Verify

```bash
# Unit tests
bun test shared/services/ticket/__tests__/SubdocumentService.security.test.ts
bun test shared/tools/__tests__/project-management/ticketsPath-validation.test.ts

# Integration tests
bun test server/tests/api/subdocuments.security.test.ts

# Existing subdocument tests (regression)
bun test server/tests/api/ticket-subdocuments.test.ts
```
