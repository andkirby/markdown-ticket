# UAT Refinement Brief

## Objective

Make Quick Search predictable within the current project and easy to scan and navigate.

## Approved Changes

User selected MDT-136 for this round and authorized implementation, verification and reasonable commits. Highlight matching input within results. Default numeric/text queries to the current project; add an All projects toggle for both keys and text. Honor explicit full keys/@CODE. Keep provenance label removal owned by MDT-252. Follow arrow selection with scrolling. Place shortcut help in a bottom status bar and apply conventional keyboard interaction.

## Changed Requirement IDs

BR-3 and BR-4 refined in place; BR-9 through BR-12 additive. C2 and C4 reconciled with existing remote limits and external-reference matching. Existing BR-1/2/5/6/7/8 remain unchanged.

## Affected Downstream Trace

Requirements → scenarios → artifacts/obligations → test plans → current TASK-6/TASK-7. Canonical Quick Search spec/interactions/mockups describe location separately from entity type. Historical initial tasks are superseded by two current remaining slices.

## Execution Slices

1. Complete — TASK-6: query policy, modal/input/results and shared text render slots; existing server search consumes shared per-term matching. GREEN: project_location_search, explicit_project_lookup, query_matches_highlighted and policy/remote-text/UAT plans. This makes numbers and text obey the same location control.
2. Complete — TASK-7: keyboard/selection scroll, scope tabs, footer, CSS and browser regressions. GREEN: selection_stays_visible, bottom_keyboard_help and UAT/modal plans. This keeps users oriented and keyboard controls discoverable.

## Validation

Observed current-round acceptance: 7/7 Chromium UAT tests, 47/47 existing Quick Search/external-reference/scoped-search browser tests, 92/92 focused frontend tests and 20/20 search API tests passed. This includes shortcut access on Board, List and Documents, blank-query stale-result prevention and native reference controls. Light/dark desktop and 390px mobile screenshots were inspected after disabling theme-transition animations for capture.

Production build across all packages, changed TypeScript validation (3 projects), targeted changed frontend ESLint, server package ESLint, semantic-class checks and 9 Wireloom block compilations passed. Changed frontend owners have no red metrics. The full frontend metrics scan still lists unrelated existing red files; this round does not claim a full repository test-suite pass. The lint:changed wrapper reports ignored E2E files as warnings under max-warnings=0; equivalent targeted frontend and server lint commands are the successful lint evidence.

Strict all-stage trace validation passes. Deterministic acceptance writes an immutable run under .git/mdt/evidence/MDT-136/runs/; semantic completion review is a separate read-only step. Trace consistency is not runtime acceptance.

## Watchlist

Preserve MDT-252 native link/badge behavior and full external identity; no provenance labels return. Preserve MDT-179 entity tabs and project discovery. Query/location changes must hide stale remote rows, reset/clamp selection and never auto-open partial hits. No existing servers are restarted. Worktree was clean at add133ad3c85adb2c5ee733b053b10959bbf6b2e.

Completion review identified and requested scoped fixes for Tab containment/opener restoration/dialog semantics, unrelated project-name matches under explicit @CODE lookup, and older surface-spec/mockup contradictions. The same BR-10/12 and TASK-7 cover these corrections; no shared modal rewrite or new dependency is introduced. The added physical boundary regression and explicit-scope regression pass, and the corrected 9 Wireloom blocks compile.
