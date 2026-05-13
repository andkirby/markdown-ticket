# BDD: MDT-162

**Source**: [MDT-162](../MDT-162-document-tree-navigation.md)
**Generated**: 2026-05-11

## E2E Context

- Framework: Playwright.
- Directory: `tests/e2e/documents/`.
- Command: `bunx playwright test tests/e2e/documents/navigation.spec.ts --project=chromium`.
- Acceptance gating: executable E2E required because this is user-visible Documents View behavior.

## Journey Groups

| Journey | Scenario IDs |
|---------|--------------|
| Initial orientation | `default_tree_collapsed`, `collapse_preserves_active_path` |
| Fast navigation | `no_unmanaged_shortcuts`, `recent_documents_resume`, `recent_documents_collapse_expand`, `recent_documents_match_tree_rows`, `recent_fixed_tree_scrolls` |
| Filtering and recovery | `filter_matches_path_title`, `target_clears_hidden_selection_filter` |
| Ticket-area boundary | `ticket_area_exclusion_disclosed` |

## Scenario Budget

- Total scenarios: 10.
- Budget: 12.
- Per-journey maximum: 3.

## Notes

- Canonical scenarios are in `bdd.trace.md`.
- Constraints `C1`, `C2`, `C3`, and `Edge-1` are intentionally not BDD coverage targets.
