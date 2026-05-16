# Tests: MDT-165

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `markdownItWireframePlugin.ts` | `src/utils/markdownItWireframePlugin.test.ts` | 10 |
| `useMarkdownProcessor.ts` | `src/components/MarkdownContent/useMarkdownProcessor.test.ts` | 19 |
| `slugify.ts` | `src/utils/slugify.test.ts` | 12 |
| `tableOfContents.ts` | `src/utils/tableOfContents.test.ts` | 17 |
| `mermaid/core.ts` | `src/utils/mermaid/core.test.ts` | 5 |
| `markdownPreprocessor.ts` | `src/utils/markdownPreprocessor.test.ts` | 2 |
| `markdownPreprocessor (mdt150)` | `src/utils/markdownPreprocessor.mdt150.test.ts` | 21 |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| HTML escaping boundary | `markdownItWireframePlugin` | `<script>`, `&`, `"`, `'` in info string |
| Heading slug format | `slugify` | Simple text, multi-word, punctuation, Unicode, special chars, hyphens |
| TOC heading level offset | `tableOfContents` | headerLevelStart=3, h1 offset, h2 offset |
| Inline markdown stripping | `tableOfContents` | Bold, italic, code, links in heading text |
| Mermaid HTML entity decode | `mermaid/core` | `&gt;`, `&lt;`, `&amp;` decoded correctly |
| Mermaid unique IDs | `mermaid/core` | Multiple blocks get unique incrementing IDs |

## External Dependency Tests

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|----------------------|
| `markdown-it` | Wireframe plugin test creates md instance | Tests fail to import |
| `preprocessMarkdown` | Preprocessor pipeline compat test (BR-8) | N/A (uses existing module) |
| `DOMPurify` | Pipeline test runs sanitize | N/A (bundled) |
| `Prism` | Pipeline test runs highlightCodeBlocks | N/A (bundled) |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `src/utils/markdownItWireframePlugin.test.ts`, `src/components/MarkdownContent/useMarkdownProcessor.test.ts` | XSS escaping in wireframe labels |
| C2 | `src/components/MarkdownContent/useMarkdownProcessor.test.ts` | Performance non-regression benchmark |
| C3 | `src/components/MarkdownContent/useMarkdownProcessor.test.ts` | Showdown removal verification |
| C4 | `src/components/MarkdownContent/useMarkdownProcessor.test.ts` | Pipeline order integration test |
| C5 | `src/utils/slugify.test.ts`, `src/components/MarkdownContent/useMarkdownProcessor.test.ts` | Slug parity with Showdown ghCompatibleHeaderId |

## E2E Tests

| Test ID | File | Covers |
|---------|------|--------|
| `TEST-markdown-it-migration-e2e` | `tests/e2e/ticket/markdown-it-migration.spec.ts` | BR-1 through BR-11 |

## Test Status

### All GREEN (implementation complete)
- `processMermaidBlocks` — 5/5 pass
- `extractTableOfContents` — 12/12 pass
- `markdownItWireframePlugin` — 9/9 pass
- `slugify` — 11/11 pass
- `useMarkdownProcessor` pipeline — 18/18 pass
- `markdownPreprocessor` — 17/17 pass
- `markdownPreprocessor (mdt150)` — 8/8 pass
- **Total: 86/86 unit tests GREEN**
- **E2E: 4/4 GREEN**

## Verify

```bash
# Run all unit tests
bun test src/utils/markdownItWireframePlugin.test.ts
bun test src/utils/slugify.test.ts
bun test src/utils/tableOfContents.test.ts
bun test src/utils/mermaid/core.test.ts
bun test src/components/MarkdownContent/useMarkdownProcessor.test.ts

# Run E2E tests
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/markdown-it-migration.spec.ts --project=chromium

# Validate trace
spec-trace validate MDT-165 --stage tests
```

---
*Rendered by /mdt:tests via spec-trace. See [tests.trace.md](./tests.trace.md) for canonical test-plan records.*
