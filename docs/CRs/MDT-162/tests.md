# Tests: MDT-162

**Source**: [MDT-162](../MDT-162-document-tree-navigation.md)
**Generated**: 2026-05-11

## Test Files

| Test ID | File | Purpose |
|---------|------|---------|
| TEST-file-tree-state | `src/components/DocumentsView/FileTree.test.tsx` | Collapsed root state and selected ancestor expansion |
| TEST-document-navigation-config | `src/config/documentNavigation.test.ts` | Project-scoped recents and shortcut sanitization |
| TEST-document-navigation-e2e | `tests/e2e/documents/navigation.spec.ts` | End-to-end Documents View navigation behavior, including Recent row display and scroll containment |
| TEST-ticket-area-exclusion | `tests/e2e/documents/navigation.spec.ts` | `docs/CRs/` exclusion and disclosure |

## Constraint Coverage

| Constraint ID | Test ID |
|---------------|---------|
| C1 | TEST-document-navigation-config, TEST-ticket-area-exclusion |
| C2 | TEST-document-navigation-e2e |
| C3 | TEST-document-navigation-e2e |
| Edge-1 | TEST-document-navigation-config |

## Verify

```bash
bun test ./src/components/DocumentsView/FileTree.test.tsx ./src/config/documentNavigation.test.ts
bunx playwright test tests/e2e/documents/navigation.spec.ts --project=chromium
```

## Notes

- These are RED tests until MDT-162 implementation lands.
- Canonical test trace projection: [tests.trace.md](./tests.trace.md).
