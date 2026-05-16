# Tasks: MDT-165

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **Rendering pipeline**: Replace Showdown converter with markdown-it instance in `useMarkdownProcessor.ts`; pipeline shape (preprocess → render → mermaid → highlight → sanitize) is invariant
- **Wireframe plugin**: Custom fence renderer is a single markdown-it plugin function; no framework overhead, no subclassing
- **TOC extraction**: Decouple from Showdown by parsing raw markdown via regex; no rendering dependency
- **Mermaid cleanup**: Remove dead Showdown-specific first regex; retain language-mermaid pattern
- **Unchanged**: `markdownPreprocessor.ts`, `syntaxHighlight.ts`, all UI components, all backend code

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Markdown rendering pipeline | `src/components/MarkdownContent/useMarkdownProcessor.ts` | N/A — single owner |
| Heading slug generation | `src/utils/slugify.ts` | N/A — new shared utility |
| Wireframe fence label rendering | `src/utils/markdownItWireframePlugin.ts` | N/A — new module |
| TOC heading extraction | `src/utils/tableOfContents.ts` | N/A — existing owner, refactored |
| Mermaid block post-processing | `src/utils/mermaid/core.ts` | N/A — existing owner, regex cleanup |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 (XSS escaping) | Task 1, Task 2 |
| C2 (Performance) | Task 4 |
| C3 (Showdown removal) | Task 3, Task 4 |
| C4 (Pipeline order) | Task 2 |
| C5 (Slug parity) | Task 1, Task 2 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|---------------|-------|------------|
| M0: Walking Skeleton | — | Task 0 | Builds, stubs compile |
| M1: Shared Utilities GREEN | — | Task 1 | slugify + wireframe plugin unit tests GREEN |
| M2: Pipeline Integration GREEN | — | Task 2–3 | All unit tests GREEN (processor, mermaid, TOC) |
| M3: Full Verification | All 10 scenarios | Task 4–5 | E2E GREEN, showdown removed |

## Tasks

### Task 0: Install Dependencies + Create Infrastructure Stubs (M0)

**Milestone**: M0 — Walking Skeleton

**Structure**: `package.json`, `src/utils/slugify.ts`, `src/utils/markdownItWireframePlugin.ts`

**Scope**: Install markdown-it ecosystem dependencies; create minimal stub files for new shared utilities
**Boundary**: No existing source files modified except `package.json`

**Creates**:
- `src/utils/slugify.ts` — minimal stub exporting a `slugify(text: string): string` function
- `src/utils/markdownItWireframePlugin.ts` — minimal stub exporting a markdown-it PluginFn

**Modifies**:
- `package.json` — add `markdown-it`, `markdown-it-task-lists`, `markdown-it-anchor` as direct dependencies

**Must Not Touch**:
- Any `src/components/` files
- Any `src/utils/` files other than the new stubs
- Any test files

**Create/Move**:
- `src/utils/slugify.ts` (new)
- `src/utils/markdownItWireframePlugin.ts` (new)

**Exclude**: No Showdown removal in this task

**Anti-duplication**: Import `markdown-it` types from the package — do NOT copy type definitions

**Duplication Guard**:
- Check if `slugify`-like utility already exists: `grep -r "slugify\|toSlug\|slug" src/utils/ --include="*.ts"`
- Check if any markdown-it plugin stubs exist: `ls src/utils/markdownIt*.ts`
- If slug logic exists elsewhere, merge into shared utility before proceeding

**Verify**:

```bash
bun install
bun run validate:ts
```

**Done when**:
- [ ] `markdown-it`, `markdown-it-task-lists`, `markdown-it-anchor` in `package.json`
- [ ] `src/utils/slugify.ts` exists and compiles
- [ ] `src/utils/markdownItWireframePlugin.ts` exists and compiles
- [ ] `bun run validate:ts` passes

---

### Task 1: Implement Slugify Utility + Wireframe Plugin (M1)

**Milestone**: M1 — Shared Utilities GREEN

**Structure**: `src/utils/slugify.ts`, `src/utils/markdownItWireframePlugin.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-slugify-unit` → `src/utils/slugify.test.ts`: slug format matches Showdown's ghCompatibleHeaderId
- `TEST-wireframe-plugin-unit` → `src/utils/markdownItWireframePlugin.test.ts`: wireframe fence label rendering with escaping

**Scope**: Implement the two new shared utility modules
**Boundary**: Only new files; no changes to existing modules

**Modifies**:
- `src/utils/slugify.ts` — full implementation: `text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')`
- `src/utils/markdownItWireframePlugin.ts` — full implementation: custom fence renderer detecting wireframe language + non-empty info string, emitting escaped label div + code block

**Must Not Touch**:
- `src/components/MarkdownContent/useMarkdownProcessor.ts`
- `src/components/MarkdownContent/domPurifyConfig.ts`
- `src/utils/tableOfContents.ts`
- Any test files (test files already exist from `/mdt:tests` stage)

**Exclude**: No processor wiring; no Showdown changes

**Anti-duplication**: Import `escapeHtml` from markdown-it's built-in utils — do NOT implement custom HTML escaping

**Duplication Guard**:
- Check `src/utils/` for any existing slug implementation before coding
- Verify no other fence renderer plugin exists in the codebase
- If duplicate slug logic found, consolidate into `slugify.ts`

**Verify**:

```bash
bun test src/utils/slugify.test.ts                    # TEST-slugify-unit GREEN
bun test src/utils/markdownItWireframePlugin.test.ts   # TEST-wireframe-plugin-unit GREEN
```

**Done when**:
- [ ] Unit tests GREEN (were RED)
- [ ] No duplicated logic
- [ ] `slugify()` produces identical output to Showdown's `ghCompatibleHeaderId`
- [ ] Wireframe plugin escapes label text via `escapeHtml`

---

### Task 2: Migrate Processor + DOMPurify + Mermaid Cleanup (M2)

**Milestone**: M2 — Pipeline Integration GREEN

**Structure**: `src/components/MarkdownContent/useMarkdownProcessor.ts`, `src/components/MarkdownContent/domPurifyConfig.ts`, `src/utils/mermaid/core.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-processor-pipeline-unit` → `src/components/MarkdownContent/useMarkdownProcessor.test.ts`: pipeline order, heading IDs, code blocks, wireframe labels, Mermaid markup, tables, strikethrough, task lists, smart links
- `TEST-mermaid-core-unit` → `src/utils/mermaid/core.test.ts`: Mermaid block processing with cleaned-up regex

**Scope**: Core migration — replace Showdown with markdown-it, update sanitization config, clean up Mermaid regex
**Boundary**: Rendering step swap + DOMPurify config + Mermaid regex; pipeline shape preserved exactly (C4)

**Modifies**:
- `src/components/MarkdownContent/useMarkdownProcessor.ts` — replace `showdown.Converter` with markdown-it instance configured with table, strikethrough, task-lists plugins; wire wireframe plugin via `md.use()`; configure `markdown-it-anchor` with shared `slugify()` from `src/utils/slugify.ts`
- `src/components/MarkdownContent/domPurifyConfig.ts` — add `div` class attributes `code-block-label` and `wireframe-label` to allowed attributes
- `src/utils/mermaid/core.ts` — remove dead first regex (Showdown double-class `mermaid language-mermaid`); retain only `language-mermaid` pattern compatible with markdown-it output

**Must Not Touch**:
- `src/utils/markdownPreprocessor.ts` (unchanged — verified via pipeline test)
- `src/utils/syntaxHighlight.ts` (unchanged — verified via pipeline test)
- `src/utils/tableOfContents.ts` (Task 3)
- `src/utils/slugify.ts` (Task 1)
- `src/utils/markdownItWireframePlugin.ts` (Task 1)
- Any test files outside `src/components/MarkdownContent/useMarkdownProcessor.test.ts` and `src/utils/mermaid/core.test.ts`

**Exclude**: No TOC refactor (Task 3); no preprocessor test updates (Task 3); no Showdown removal from package.json (Task 4)

**Anti-duplication**: Import `slugify` from `src/utils/slugify.ts` — do NOT inline slug logic in the processor. Import `markdownItWireframePlugin` from `src/utils/markdownItWireframePlugin.ts` — do NOT inline fence rendering.

**Duplication Guard**:
- Check that `useMarkdownProcessor.ts` does not re-implement slug logic that exists in `slugify.ts`
- Verify no second markdown renderer is instantiated elsewhere
- If any markdown rendering logic exists outside `useMarkdownProcessor.ts`, consolidate here

**Verify**:

```bash
bun test src/components/MarkdownContent/useMarkdownProcessor.test.ts  # TEST-processor-pipeline-unit GREEN
bun test src/utils/mermaid/core.test.ts                                # TEST-mermaid-core-unit GREEN
```

**Done when**:
- [ ] Unit tests GREEN (were RED)
- [ ] Pipeline order preserved: `preprocessMarkdown → md.render() → processMermaidBlocks → highlightCodeBlocks → DOMPurify.sanitize` (C4)
- [ ] No Showdown imports in `useMarkdownProcessor.ts`
- [ ] Mermaid blocks render with cleaned-up regex
- [ ] DOMPurify allows wireframe label div through sanitization

---

### Task 3: Refactor TOC + Update Preprocessor Tests (M2)

**Milestone**: M2 — Pipeline Integration GREEN

**Structure**: `src/utils/tableOfContents.ts`, `src/utils/markdownPreprocessor.test.ts`, `src/utils/markdownPreprocessor.mdt150.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-toc-extraction-unit` → `src/utils/tableOfContents.test.ts`: TOC extraction with regex-based heading parsing, inline markdown stripping, headerLevelStart offset, shared slugify IDs

**Scope**: Decouple TOC extraction from Showdown; update preprocessor test files to use markdown-it instead of Showdown for assertion rendering
**Boundary**: TOC module refactor + preprocessor test Showdown import removal

**Modifies**:
- `src/utils/tableOfContents.ts` — replace Showdown-based heading extraction with regex-based parsing from raw markdown (`/^(#{1,6})\s+(.+)$/gm`); add `stripInlineMarkdown()` helper for bold, italic, code, links in heading text; use shared `slugify()` from `src/utils/slugify.ts` for ID generation
- `src/utils/markdownPreprocessor.test.ts` — replace `showdown.Converter` with markdown-it for rendering in assertions
- `src/utils/markdownPreprocessor.mdt150.test.ts` — replace `showdown.Converter` with markdown-it for rendering in assertions

**Must Not Touch**:
- `src/components/MarkdownContent/useMarkdownProcessor.ts` (Task 2)
- `src/utils/slugify.ts` (Task 1)
- `src/utils/markdownItWireframePlugin.ts` (Task 1)
- `package.json` (Task 4)

**Exclude**: No Showdown removal from `package.json` (Task 4)

**Anti-duplication**: Import `slugify` from `src/utils/slugify.ts` — do NOT inline slug logic. Import `MarkdownIt` from `markdown-it` in test files — do NOT use Showdown.

**Duplication Guard**:
- Check that `tableOfContents.ts` does not re-implement slug logic
- Verify no Showdown imports remain in `tableOfContents.ts` or its test file
- If heading parsing logic exists elsewhere, consolidate into `tableOfContents.ts`

**Verify**:

```bash
bun test src/utils/tableOfContents.test.ts                 # TEST-toc-extraction-unit GREEN
bun test src/utils/markdownPreprocessor.test.ts             # preprocessor tests still pass
bun test src/utils/markdownPreprocessor.mdt150.test.ts      # preprocessor tests still pass
```

**Done when**:
- [ ] Unit tests GREEN (were RED)
- [ ] No duplicated logic
- [ ] `tableOfContents.ts` has zero Showdown imports
- [ ] Preprocessor test files have zero Showdown imports
- [ ] `extractTableOfContents` uses shared `slugify()` producing IDs matching markdown-it-anchor output (C5)

---

### Task 4: Showdown Removal + Performance Verification (M3)

**Milestone**: M3 — Full Verification

**Structure**: `package.json`

**Makes GREEN (Automated Tests)**:
- `TEST-showdown-removal` → `src/components/MarkdownContent/useMarkdownProcessor.test.ts`: verify showdown absent from dependencies and imports
- `TEST-performance-non-regression` → `src/components/MarkdownContent/useMarkdownProcessor.test.ts`: rendering performance benchmark

**Scope**: Remove Showdown from the project; verify performance non-regression
**Boundary**: Package dependency removal + final verification

**Modifies**:
- `package.json` — remove `showdown` from dependencies

**Must Not Touch**:
- Any `src/` files (all Showdown imports removed in Tasks 2–3)
- Any test logic (tests already written)

**Create/Move**:
- Remove `showdown` from `package.json` dependencies

**Exclude**: No source code changes — this task only removes the dependency

**Anti-duplication**: N/A — removal task

**Duplication Guard**:
- Verify zero remaining Showdown imports before removal: `grep -r "showdown" src/ --include="*.ts"`
- If any imports remain, they must be removed in an earlier task first
- Verify `showdown` is not a transitive dependency of any retained package

**Verify**:

```bash
# Remove showdown
bun remove showdown

# Verify no remaining imports
grep -r "showdown" src/ --include="*.ts" && echo "FAIL: showdown imports remain" || echo "OK: no showdown imports"

# Run full test suite
bun test src/components/MarkdownContent/useMarkdownProcessor.test.ts  # TEST-showdown-removal + TEST-performance-non-regression GREEN
bun install  # verify lockfile clean
bun run validate:ts
```

**Done when**:
- [ ] `showdown` absent from `package.json` (C3)
- [ ] Zero Showdown imports across all `src/` files
- [ ] Performance non-regression test GREEN (C2)
- [ ] `bun install` succeeds
- [ ] `bun run validate:ts` passes

---

### Task 5: E2E Integration Verification (M3 — checkpoint)

**Milestone**: M3 — Full Verification

**Structure**: `tests/e2e/ticket/markdown-it-migration.spec.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-markdown-it-migration-e2e` → `tests/e2e/ticket/markdown-it-migration.spec.ts`: E2E tests for all 10 BDD scenarios

**Makes GREEN (Behavior)**:
- `wireframe_with_metadata_label` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-1, BR-10)
- `wireframe_without_metadata` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-2)
- `table_rendering` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-3)
- `strikethrough_rendering` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-4)
- `task_list_rendering` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-5)
- `mermaid_block_compatibility` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-6)
- `prism_syntax_highlighting` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-7)
- `smart_link_preprocessing` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-8)
- `heading_id_generation` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-9, BR-11)
- `dompurify_allows_wireframe_label` → `tests/e2e/ticket/markdown-it-migration.spec.ts` (BR-10)

**Scope**: Run and verify E2E tests pass; adjust test file if selectors/timing need updates post-migration
**Boundary**: E2E test verification only; no source code changes unless E2E test file needs adjustment

**Modifies**:
- `tests/e2e/ticket/markdown-it-migration.spec.ts` — only if selector or timing adjustments needed post-migration

**Must Not Touch**:
- All `src/` files (implementation complete from Tasks 0–4)
- `package.json`

**Exclude**: No implementation changes; this task only verifies and potentially adjusts E2E selectors/timing

**Anti-duplication**: N/A — verification task

**Duplication Guard**:
- Verify E2E test selectors match actual rendered DOM structure
- If selectors diverge from implementation, adjust the E2E test (not the implementation)

**Verify**:

```bash
# Run E2E tests
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/markdown-it-migration.spec.ts --project=chromium

# Run full unit test suite as final regression check
bun test src/utils/slugify.test.ts
bun test src/utils/markdownItWireframePlugin.test.ts
bun test src/components/MarkdownContent/useMarkdownProcessor.test.ts
bun test src/utils/tableOfContents.test.ts
bun test src/utils/mermaid/core.test.ts
bun test src/utils/markdownPreprocessor.test.ts
bun test src/utils/markdownPreprocessor.mdt150.test.ts
```

**Done when**:
- [ ] All 10 BDD scenarios GREEN
- [ ] All unit tests GREEN (regression check)
- [ ] Smoke test passes (feature works with real execution)
- [ ] No duplicated logic across the full pipeline

---

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| components/MarkdownContent/ | 3 | 3 | 0 | ✅ |
| utils/ (shared) | 5 | 5 | 0 | ✅ |
| utils/mermaid/ | 1 | 1 | 0 | ✅ |
| utils/ (preprocessor) | 3 | 3 | 0 | ✅ |
| config/ | 1 | 1 | 0 | ✅ |
| e2e/ | 1 | 1 | 0 | ✅ |

**File-level coverage**:
- `src/components/MarkdownContent/useMarkdownProcessor.ts` → Task 2 ✅
- `src/components/MarkdownContent/domPurifyConfig.ts` → Task 2 ✅
- `src/components/MarkdownContent/useMarkdownProcessor.test.ts` → Task 2 ✅
- `src/utils/markdownItWireframePlugin.ts` → Task 0 (Creates), Task 1 (Modifies) ✅
- `src/utils/slugify.ts` → Task 0 (Creates), Task 1 (Modifies) ✅
- `src/utils/tableOfContents.ts` → Task 3 ✅
- `src/utils/mermaid/core.ts` → Task 2 ✅
- `src/utils/markdownPreprocessor.ts` → Task 2 (Structure, verified unchanged) ✅
- `src/utils/syntaxHighlight.ts` → Task 2 (Structure, verified unchanged) ✅
- `src/utils/markdownPreprocessor.test.ts` → Task 3 ✅
- `src/utils/markdownPreprocessor.mdt150.test.ts` → Task 3 ✅
- `package.json` → Task 0, Task 4 ✅
- `tests/e2e/ticket/markdown-it-migration.spec.ts` → Task 5 ✅

## Post-Implementation

- [ ] No duplication (grep check): `grep -r "showdown" src/ --include="*.ts"` returns nothing
- [ ] Scope boundaries respected: pipeline shape unchanged
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Smoke test passes: wireframe code block with metadata shows label above code in rendered markdown
- [ ] Fallback/absence paths match requirements: plain `wireframe` fence (no metadata) renders without label

---

> Canonical trace projection: [tasks.trace.md](./MDT-165/tasks.trace.md)
