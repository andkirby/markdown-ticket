# BDD: MDT-169

**Source**: [MDT-169](../MDT-169-document-view-filename-tabs.md)
**Generated**: 2026-05-17

## Overview

MDT-169 acceptance is centered on the Documents view presenting dot-notation markdown siblings as filename tabs while leaving the document tree as a physical file list.

The BDD suite covers eight user-visible behaviors: grouped tab presentation, opening a selected tree variant as the active tab, unchanged tree entries, standalone ungrouped documents, root-plus-variant reachability, multi-dot variant labels, active content changes when users switch tabs, and native document SSE updates refreshing filename tabs.

## Acceptance Strategy

- **Mode**: normal
- **E2E framework**: Playwright
- **Directory**: `tests/e2e/documents/`
- **Likely suite target**: `tests/e2e/documents/filename-tabs.spec.ts`
- **Command**: `bun run test:e2e -- tests/e2e/documents/filename-tabs.spec.ts --project=chromium`
- **Expected status before implementation**: fail
- **Acceptance gate**: every BR-1.1 through BR-1.8 scenario in `bdd.trace.md` must pass at browser level.

## Journey Grouping

| Journey | Scenario IDs | Coverage |
|---------|--------------|----------|
| Grouped viewing | `grouped_variants_show_as_tabs`, `root_and_variants_remain_reachable`, `multi_dot_variant_key_is_preserved` | BR-1.1, BR-1.5, BR-1.6 |
| Tree-to-tab navigation | `opening_tree_variant_selects_tab`, `document_tree_keeps_physical_files` | BR-1.2, BR-1.3 |
| Standalone document behavior | `ungrouped_document_opens_without_tabs` | BR-1.4 |
| Active tab switching | `switching_tabs_updates_active_document` | BR-1.7 |
| Native document updates | `document_sse_updates_filename_tabs` | BR-1.8 |

## Test-Facing Contract Notes

- Test setup should create markdown documents inside configured document paths, not ticket subdocuments.
- Assertions should distinguish the physical document tree from the logical document viewer.
- Tab interactions should verify both visible content and active physical document metadata.
- Native document SSE should remain the update source; tests should verify tabs refresh from the physical tree after document-change events.
- Constraint and edge coverage stays with `/mdt:tests`; scenario coverage intentionally targets only behavior requirements routed to BDD.

## Execution Notes

- No executable E2E file was generated in this BDD step; `/mdt:tests` should create or refine the Playwright suite using these canonical scenarios.
- `spec-trace validate MDT-169 --stage bdd --format json` passed with no issues.

---
*Trace projection: [bdd.trace.md](./bdd.trace.md)*
