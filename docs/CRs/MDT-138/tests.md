# Tests: MDT-138

**Source**: [MDT-138](../MDT-138-add-dot-notation-namespace-system-for-sub-document.md)
**Generated**: 2026-03-13

## Overview

Test specification for dot-notation namespace system. Tests verify namespace parsing, virtual folder creation, and backward compatibility with folder-based subdocuments.

## Module → Test Mapping

| Module | Test File | Tests | Kind |
|--------|-----------|-------|------|
| `parseNamespace` | `server/tests/unit/namespace-parser.test.ts` | 10 | Unit |
| `groupNamespacedFiles` | `server/tests/unit/namespace-parser.test.ts` | 10 | Unit |
| `TicketService.discoverSubDocuments` | `server/tests/api/ticket-namespace.test.ts` | 12 | Integration |
| `GET /api/projects/:id/crs/:key` | `server/tests/api/ticket-namespace.test.ts` | 12 | Integration |
| `SubDocumentTabs` | `tests/e2e/ticket/namespace.spec.ts` | 10 | E2E |

## Data Mechanism Tests

### Namespace Parsing Boundaries

| Pattern | Module | Tests |
|---------|--------|-------|
| No dot | `parseNamespace` | returns null |
| Single dot | `parseNamespace` | splits into namespace + subKey |
| Multiple dots | `parseNamespace` | first segment = namespace, rest = subKey |
| Hyphens | `parseNamespace` | preserved in subKey |
| 4+ segments | `parseNamespace` | all dots after first preserved |

### Virtual Folder Rules

| Rule | Module | Tests |
|------|--------|-------|
| Root file exists | `groupNamespacedFiles` | includes [main] tab |
| No root file | `groupNamespacedFiles` | omits [main] tab |
| Physical folder exists | `groupNamespacedFiles` | isVirtual = false |
| No physical folder | `groupNamespacedFiles` | isVirtual = true |
| Sorting | `groupNamespacedFiles` | alphanumerical within namespace |

## External Dependency Tests

| Dependency | Test | Behavior When Absent |
|------------|------|----------------------|
| File system (fs) | Integration tests use real file system via `setupTestEnvironment` | N/A - test environment provides isolated fs |
| Express app | Integration tests use `test-app-factory` | N/A - created per test suite |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C-1 (Performance < 10ms) | `namespace-parser.test.ts`, `ticket-namespace.test.ts` | `completes parsing within 10ms` |
| C-4 (Backward compatibility) | `ticket-namespace.test.ts` | `returns same structure for files without dot-notation` |

## Test-Plan Entries

### Unit Tests (TEST-namespace-parser)

| Test ID | Description | Covers |
|---------|-------------|--------|
| TEST-parse-basic | Basic two/three-part parsing | BR-2, BR-5 |
| TEST-parse-multi-dot | Four+ segment preservation | Edge-1 |
| TEST-parse-hyphen | Hyphen preservation | Edge-3 |
| TEST-group-virtual | Virtual folder creation | BR-2 |
| TEST-group-main-tab | [main] tab logic | BR-3 |
| TEST-group-sorting | Alphanumerical sorting | BR-2 |
| TEST-group-coexistence | Folder + dot coexistence | Edge-4 |
| TEST-perf-constraint | < 10ms parsing | C-1 |

### Integration Tests (TEST-namespace-api)

| Test ID | Description | Covers |
|---------|-------------|--------|
| TEST-api-virtual-folder | API returns virtual folders | BR-2 |
| TEST-api-main-tab | API [main] tab logic | BR-3 |
| TEST-api-multi-dot | API multi-dot preservation | BR-5 |
| TEST-api-sorting | API alphanumerical sorting | BR-2 |
| TEST-api-coexistence | API folder + dot coexistence | Edge-4 |
| TEST-api-backward | API backward compatibility | C-4 |
| TEST-api-subdoc-retrieval | Subdocument content retrieval | BR-6 |

### E2E Tests (TEST-namespace-e2e)

| Test ID | Description | Covers |
|---------|-------------|--------|
| TEST-e2e-single-tab | Single tab for root document | BR-1 |
| TEST-e2e-no-main | No main tab without root | BR-3 |
| TEST-e2e-multi-dot | Multi-dot preservation | BR-5 |
| TEST-e2e-namespace-group | Namespace grouping + sorting | BR-2 |
| TEST-e2e-url-routing | URL routing with namespace | BR-6 |
| TEST-e2e-coexistence | Folder + dot coexistence | Edge-4 |
| TEST-e2e-special-chars | Special characters preserved | Edge-3 |

## Files Changed

| File | Status | Purpose |
|------|--------|---------|
| `server/tests/unit/namespace-parser.test.ts` | New | Unit tests for parseNamespace, groupNamespacedFiles |
| `server/tests/api/ticket-namespace.test.ts` | New | Integration tests for namespace API |
| `tests/e2e/ticket/namespace.spec.ts` | Existing | E2E tests (already created in BDD phase) |

## Type Extensions Required

The `SubDocument` interface in `shared/models/SubDocument.ts` must be extended:

```typescript
export interface SubDocument {
  name: string
  kind: 'file' | 'folder'
  children: SubDocument[]
  isVirtual?: boolean  // NEW: MDT-138
}
```

## Verify

```bash
# Unit tests
bun run --cwd server jest tests/unit/namespace-parser.test.ts

# Integration tests
bun run --cwd server jest tests/api/ticket-namespace.test.ts

# E2E tests
bunx playwright test tests/e2e/ticket/namespace.spec.ts --project=chromium

# All tests
bun run --cwd server jest --testPathPattern="namespace"
```

---
*Trace projection: [tests.trace.md](./tests.trace.md)*
