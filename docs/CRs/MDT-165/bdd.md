# BDD: MDT-165

**Source**: [MDT-165](../MDT-165-markdown-it-wireframe.md)
**Generated**: 2026-05-15

## Overview

10 BDD scenarios cover all 11 behavioral requirements for the Showdown → markdown-it migration. Scenarios verify user-visible rendering behavior: wireframe labels, tables, strikethrough, task lists, Mermaid diagrams, syntax highlighting, smart links, heading IDs, TOC extraction, and DOMPurify sanitization. Note: `wireframe_with_metadata_label` covers both BR-1 and BR-10; `heading_id_generation` covers both BR-9 and BR-11.

**All 10 scenarios GREEN.** E2E: 4/4 test cases pass. Unit tests: 80/80 GREEN.

## Acceptance Strategy

- **E2E framework**: Playwright (browser-level)
- **Test file**: `tests/e2e/ticket/markdown-it-migration.spec.ts`
- **Execution**: `bun run test:e2e` or `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/markdown-it-migration.spec.ts --project=chromium`
- **Expected status**: Tests fail before implementation (normal mode)
- **Acceptance gate**: All 10 scenarios must pass against the migrated markdown-it renderer

## Scenario-to-Journey Mapping

| Journey | Scenarios | Count |
|---------|-----------|-------|
| Wireframe rendering | `wireframe_with_metadata_label`, `wireframe_without_metadata` | 2 |
| Markdown feature parity | `table_rendering`, `strikethrough_rendering`, `task_list_rendering` | 3 |
| Pipeline compatibility | `mermaid_block_compatibility`, `prism_syntax_highlighting`, `smart_link_preprocessing` | 3 |
| Heading & TOC | `heading_id_generation` | 1 |
| Sanitization | `dompurify_allows_wireframe_label` | 1 |

## Test-Facing Contract Notes

### Selectors
- Wireframe label: `.code-block-label.wireframe-label`
- Wireframe code block: `pre code.language-wireframe`
- Mermaid container: `.mermaid-container` (existing selector in `markdownSelectors`)
- Table: `table`, `table th`, `table td`
- Strikethrough: `del, s`
- Task list checkboxes: `input[type="checkbox"]`
- Heading with ID: `h2#introduction` (example)

### Fixture
- `markdownItMigrationFixture` defined in the test file itself (not shared fixture)
- Includes all markdown features in a single document for comprehensive rendering verification

### Test Structure
- 4 E2E test cases covering the 10 BDD scenarios
- Tests create a project + ticket with the fixture content, render in ticket detail view, and assert visible elements

## Execution Notes

- Tests should be run after `bun run dev:full` has the frontend running
- Mermaid rendering is async — assertions may need appropriate timeouts
- Smart link test uses `code: 'MDT'` in project creation so the preprocessor matches `MDT-001` as a ticket reference (preprocessor uses `currentProject` prefix for regex matching)
- BR-10 is covered by two scenarios: `wireframe_with_metadata_label` (end-to-end rendering) and `dompurify_allows_wireframe_label` (sanitization-specific). Both are intentional — the first validates the integrated pipeline, the second isolates the sanitization concern
- BR-11 (TOC extraction) E2E coverage: the ticket detail TOC sidebar only populates for subdocuments, not main ticket content. E2E tests verify heading IDs exist (BR-9); BR-11 TOC extraction correctness is verified via unit tests for `extractTableOfContents()` including headerLevelStart offset

---
*Rendered by /mdt:bdd via spec-trace*
