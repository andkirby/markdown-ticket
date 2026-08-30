# Tests: MDT-155

## Module -> Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `TicketViewer` | `frontend/src/components/TicketViewer/TicketViewer.test.tsx` | sourcePath from selected subdocument `filePath` |
| `markdownPreprocessor` | `frontend/src/utils/markdownPreprocessor.mdt155.test.ts` | standalone `.md` conversion, URL/email exclusions, protected content |
| `linkProcessor` | `frontend/src/utils/linkProcessor.mdt150.test.ts` | existing relative and absolute subdocument route + anchor classification |
| Frontend suite | `frontend/src/**/*.test.{ts,tsx}` | existing suite regression |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `frontend/src/utils/markdownPreprocessor.mdt155.test.ts` | URL/email-like non-conversion |
| C2 | `frontend/src/utils/linkProcessor.mdt150.test.ts` | regression classifications |
| C3 | manual git diff check | excluded MDT-152 files unchanged |
| C4 | `bun run fe:test` | existing frontend suite remains green |

## Verify

```bash
bun test ./frontend/src/components/TicketViewer/TicketViewer.test.tsx ./frontend/src/utils/markdownPreprocessor.mdt155.test.ts ./frontend/src/utils/markdownPreprocessor.mdt150.test.ts ./frontend/src/utils/linkProcessor.mdt150.test.ts
bun run fe:test
git diff --name-only -- frontend/src/hooks/useQuickSearch.test.ts tests/e2e/quick-search/modal.spec.ts
```

> Tests trace projection: [tests.trace.md](./tests.trace.md)
