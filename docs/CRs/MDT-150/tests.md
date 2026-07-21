# Tests: MDT-150

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `linkProcessor.ts` | `src/utils/linkProcessor.mdt150.test.ts` | 14 |
| `linkBuilder.ts` | `src/utils/linkBuilder.mdt150.test.ts` | 9 |
| `linkNormalization.ts` | `src/utils/linkNormalization.mdt150.test.ts` | 11 |
| `markdownPreprocessor.ts` | `src/utils/markdownPreprocessor.mdt150.test.ts` | 5 |
| `markdownPreprocessor.ts` (documents-view mode) | `src/utils/markdownPreprocessor.mdt150.test.ts` | +2 (UAT 2026-07-21) |
| SmartLink doc refs (E2E) | `tests/e2e/ticket/smartlink-doc-refs.spec.ts` | 3 |
| Anchor passthrough (E2E) | `tests/e2e/ticket/smartlink-anchor.spec.ts` | 1 |
| Documents path route (E2E) | `tests/e2e/documents/path-style-routing.spec.ts` | 1 |
| Documents-view relative link (E2E) | `tests/e2e/documents/relative-link-resolution.spec.ts` | +1 (UAT 2026-07-21) |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `src/utils/linkProcessor.mdt150.test.ts` | ticket reference classification unchanged |
| C2 | `src/utils/linkProcessor.mdt150.test.ts` | external link classification unchanged |
| C3 | `src/utils/linkBuilder.mdt150.test.ts`, `src/utils/linkNormalization.mdt150.test.ts`, `src/utils/markdownPreprocessor.mdt150.test.ts` | bare filenames, relative paths, sibling refs (incl. documents-view mode UAT 2026-07-21) |
| C4 | `src/utils/linkBuilder.mdt150.test.ts`, `src/utils/linkNormalization.mdt150.test.ts` | no security checks in SmartLink |
| C5 | `src/utils/markdownPreprocessor.mdt150.test.ts`, `src/utils/linkProcessor.mdt150.test.ts` | preprocessor/linkProcessor unchanged in ticket context (regression guard for UAT 2026-07-21 documents-mode branch) |

## RED Tests (expected to fail until implementation)

- `linkNormalization.mdt150.test.ts`: "resolves project-level doc as document link" (BR-1)
- `linkNormalization.mdt150.test.ts`: "handles parent relative path (../MDT-151.md)" (C3)
- `markdownPreprocessor.mdt150.test.ts`: "resolves bare filename from documents-view sourcePath" (BR-5) — added UAT 2026-07-21
- `markdownPreprocessor.mdt150.test.ts`: "resolves ../sibling.md from documents-view sourcePath" (BR-5) — added UAT 2026-07-21

The first two test the original path resolution logic. The last two test the documents-view mode added UAT 2026-07-21 — they will turn GREEN when `resolveDocumentRef` gains the documents-sourcePath branch and `MarkdownViewer` passes `sourcePath`.

## Verify

```bash
# Unit tests
bun test src/utils/linkProcessor.mdt150.test.ts src/utils/linkBuilder.mdt150.test.ts src/utils/linkNormalization.mdt150.test.ts src/utils/markdownPreprocessor.mdt150.test.ts

# E2E tests (after implementation)
bun run test:e2e --grep="@MDT-150"
```
