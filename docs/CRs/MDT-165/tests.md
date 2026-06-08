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
| Mermaid HTML entity decode | `mermaid/core` | `&gt;`, `&lt;`, `&amp;`, quotes, and apostrophes decoded into preserved source |
| Mermaid unique IDs | `mermaid/core` | Multiple blocks get unique incrementing IDs |
| Mermaid runtime source rendering | `mermaid/hooks` | Browser renderer calls Mermaid with preserved decoded source and does not render syntax-error fallback |
| Wireloom render defaults | `wireloomRenderer` | Light mode passes `theme: "default"`, dark mode passes `theme: "dark"`, and long annotation bodies are compacted before render from one integration boundary |
| Wireloom error surface | `wireloomRenderer` | Malformed source renders `.wireloom-error` with available line/column context and does not crash |
| Wireloom fallback | `wireloomRenderer` | Missing/unloadable package falls back to escaped `pre > code.language-wireloom` |

## External Dependency Tests

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|----------------------|
| `markdown-it` | Wireframe plugin test creates md instance | Tests fail to import |
| `wireloom` | Wireloom renderer test renders a real SVG through the package | Falls back to plain escaped code block if dynamic import fails |
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
| `TEST-mermaid-render-runtime` | `src/utils/mermaid/hooks.ts` + Playwright runtime check | BR-6, C4 |
| `TEST-wireloom-plugin-unit` | `src/utils/wireloomRenderer.test.ts` | BR-12, Edge-6 |
| `TEST-wireloom-renderer-unit` | `src/utils/wireloomRenderer.test.ts` | BR-12, BR-13, C6, Edge-6 |
| `TEST-wireloom-live-document-e2e` | `tests/e2e/documents/live-updates.spec.ts` | BR-12 |

## Test Status

### All GREEN (implementation complete)
- `processMermaidBlocks` — 5/5 pass
- Mermaid runtime source rendering — Playwright check GREEN for `docs/CRs/MDT-157/architecture.md`
- `extractTableOfContents` — 12/12 pass
- `markdownItWireframePlugin` — 9/9 pass
- `slugify` — 11/11 pass
- `useMarkdownProcessor` pipeline — 18/18 pass
- `markdownPreprocessor` — 17/17 pass
- `markdownPreprocessor (mdt150)` — 8/8 pass
- **Total: 86/86 unit tests GREEN**
- **E2E: 4/4 GREEN**

### UAT Implemented: Wireloom 0.7.0 Defaults

- `TEST-wireloom-plugin-unit`: confirms `wireloom` fences emit safe placeholders and non-Wireloom fences stay unchanged.
- `TEST-wireloom-renderer-unit`: confirms centralized render defaults, compact annotation bodies, inline parse errors with source position, and fallback to plain code when Wireloom cannot load.
- `TEST-wireloom-live-document-e2e`: confirms Documents View refreshes rendered Wireloom blocks after file changes.

Validation evidence:
- `bun test src/utils/wireloomRenderer.test.ts src/utils/wireloomFullscreen.test.ts` — 18/18 pass.
- `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/documents/live-updates.spec.ts --project=chromium --grep "Wireloom"` — 1/1 pass.
- Targeted ESLint for `src/utils/wireloomRenderer.ts` and `src/utils/wireloomRenderer.test.ts` — pass.
- `bun run validate:ts` is blocked by unrelated ProjectSelector/accent-color TypeScript errors in the dirty worktree, not by the Wireloom files.

## Verify

```bash
# Run all unit tests
bun test src/utils/markdownItWireframePlugin.test.ts
bun test src/utils/slugify.test.ts
bun test src/utils/tableOfContents.test.ts
bun test src/utils/mermaid/core.test.ts
bun test src/components/MarkdownContent/useMarkdownProcessor.test.ts
bun test src/utils/wireloomRenderer.test.ts
bun test src/utils/wireloomFullscreen.test.ts

# Mermaid UAT render regression
scripts/validate-mermaid-md docs/CRs/MDT-157/architecture.md
# Browser check: open /prj/MDT/ticket/MDT-157/architecture.md and assert:
# - `.mermaid > svg` count is 2
# - body text does not include "Syntax error in text"

# Run E2E tests
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/markdown-it-migration.spec.ts --project=chromium
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/documents/live-updates.spec.ts --project=chromium --grep "Wireloom"

# Validate trace
spec-trace validate MDT-165 --stage tests
```

---
*Rendered by /mdt:tests via spec-trace. See [tests.trace.md](./tests.trace.md) for canonical test-plan records.*
