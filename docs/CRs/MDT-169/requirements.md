# Requirements: MDT-169

**Source**: [MDT-169](../MDT-169-document-view-filename-tabs.md)
**Generated**: 2026-05-17
**Scope**: Full

## Overview

MDT-169 adds grouped filename tabs to the general Documents view for dot-notation markdown siblings. The document tree remains a physical file tree, while the viewer presents related markdown variants as tabs and opens the selected physical file as the active tab.

The requirements lock the MDT-138 filename split rule for this surface: the first dot separates the logical base from the variant key, and later dot segments stay in the variant key.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (filename namespace parsing), tests.md (multi-dot parsing) |
| C2 | architecture.md (tab ordering), tests.md (alphanumeric ordering) |
| C3 | architecture.md (file-system invariants), tasks.md (verify no disk mutation) |
| C4 | architecture.md (scope boundaries), tests.md (non-markdown unchanged) |
| C5 | architecture.md (shared namespace helper decision), tests.md (MDT-138 regression) |
| C6 | architecture.md (path/content safety), tests.md (path traversal and configured document paths) |
| C7 | architecture.md (performance and render flow), tests.md (documents view opening behavior) |
| C8 | architecture.md (tab UI convention), tasks.md (UI implementation check) |
| C9 | architecture.md (document tree contract), tests.md (tree discovery, ordering, and display unchanged) |
| C10 | architecture.md (URL/query contract), tests.md (active physical markdown file URL/query behavior) |
| C11 | architecture.md (recent document contract), tests.md (recent shortcuts target active physical markdown file) |
| C12 | architecture.md (tree highlighting contract), tests.md (selected tree highlighting follows active physical markdown file) |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Filename parsing | First dot creates the logical base; the remaining suffix is the variant key. | Split every dot into nested levels. | Matches MDT-138 and preserves multi-dot variant names predictably. |
| Tree representation | Keep every physical document file visible as an individual tree entry. | Add virtual tree folders or hide grouped variants. | The CR requires an unchanged document tree. |
| Root plus variants | Root content and variant content must all remain reachable from the grouped view. | Let variants replace the root file or hide the root behind standalone behavior. | The acceptance criteria require no content loss. |
| Single variant | A lone variant remains directly openable and active in the grouped variant view. | Treat a lone variant as standalone because there is only one tab. | The edge-case list explicitly includes a single variant file. |
| Group boundary | Group only markdown files in the same directory with the same computed logical base. | Group by similar prefix across directories or base names. | Prevents accidental grouping of unrelated documents. |
| Numeric-looking labels | Ordering must stay predictable for labels such as `one`, `two`, and `10`. | Leave numeric-looking ordering unspecified. | The CR names numeric labels as an edge case for user navigation. |
| Routing/state ownership | Requirements require selected-file opens to choose the matching active tab, but architecture owns URL versus local state shape. | Requirements prescribe a specific route/query schema. | The CR defers exact routing/state representation to architecture. |
| Document SSE updates | Native document SSE refreshes the physical tree, and filename tabs are recomputed from that tree. | Add a second document filename-tab SSE channel or patch tab state independently from the tree. | Keeps document updates native while giving grouped tabs the same live UX as ticket subdocument tabs. |

## Configuration

No new user-facing settings are required. The feature must use the existing document paths from project configuration and leave non-markdown handling unchanged.

## Review Notes

- BDD should cover the eight behavior requirements only.
- Tests should carry the constraints and edge cases, especially MDT-138 regression coverage, path/content safety, numeric-label ordering, unchanged document tree behavior, URL/query stability, recent document shortcuts, and selected tree highlighting.
- Architecture should decide whether to extract a neutral shared namespace helper or adapt MDT-138 structures without leaking ticket-specific concepts into Documents view.
- Document SSE tab reconciliation is user-visible UX and belongs in BDD; detailed fallback ordering remains covered by tests.

## Validation Summary

- Endpoints in CR references: none.
- Error codes in CR references: none.
- User-input fields: document path/active tab selection; covered by C6.
- Requirements validation: `spec-trace validate MDT-169 --stage requirements --format json` passed with no issues.

---
*Trace projection: [requirements.trace.md](./requirements.trace.md)*
