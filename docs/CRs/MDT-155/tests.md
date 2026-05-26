# Tests: MDT-155

## Module -> Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `TicketViewer` | `src/components/TicketViewer/TicketViewer.test.tsx` | sourcePath from selected subdocument `filePath` |
| `markdownPreprocessor` | `src/utils/markdownPreprocessor.mdt155.test.ts` | standalone `.md` conversion, URL/email exclusions, protected content |
| `linkProcessor` | `src/utils/linkProcessor.mdt150.test.ts` | existing relative and absolute subdocument route + anchor classification |
| Frontend suite | `src/**/*.test.{ts,tsx}` | existing suite regression |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `src/utils/markdownPreprocessor.mdt155.test.ts` | URL/email-like non-conversion |
| C2 | `src/utils/linkProcessor.mdt150.test.ts` | regression classifications |
| C3 | manual git diff check | excluded MDT-152 files unchanged |
| C4 | `bun run fe:test` | existing frontend suite remains green |

## Verify

```bash
bun test ./src/components/TicketViewer/TicketViewer.test.tsx ./src/utils/markdownPreprocessor.mdt155.test.ts ./src/utils/markdownPreprocessor.mdt150.test.ts ./src/utils/linkProcessor.mdt150.test.ts
bun run fe:test
git diff --name-only -- src/hooks/useQuickSearch.test.ts tests/e2e/quick-search/modal.spec.ts
```

> Tests trace projection: [tests.trace.md](./tests.trace.md)
