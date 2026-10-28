# Tasks: MDT-136

## Current UAT execution

Historical initial implementation is complete; current canonical tasks describe this UAT round only. TASK-6 and TASK-7 are complete, including completion-review keyboard/scope/documentation corrections. Acceptance evidence is summarized in uat.md. Work sequentially because both slices touch QuickSearchModal. No external tracker API, new global hotkeys, document search or unrelated runtime restart.

### Task 6: Project location and query highlighting

Canonical ID: TASK-6. Refine current-project default, explicit full key/@CODE routing, opt-in all-project numeric/text AND matching and literal result highlights. Create a focused query policy, shared text-render component and policy tests; modify QuickSearchModal/Input/Results, TicketCode and optional ExternalReferenceBadges text slots, server TicketService shared-match consumption, and focused server/E2E tests. Own direct GREEN targets project_location_search, explicit_project_lookup, query_matches_highlighted, TEST-quick-search-policy, TEST-quick-search-remote-text, TEST-quick-search-uat. Preserve component/identity ownership and existing limits. Existing unrelated source remains untouched.

### Task 7: Keyboard visibility and bottom help

Canonical ID: TASK-7. Keep selected rows in view, restore native Tab, retain compatible F6/Shift+F6 action focus, add bottom status/help and correct tab keyboard semantics. Create QuickSearchFooter and a focused keyboard hook if needed; modify modal, scope bar, results CSS, selectors, UAT and existing regression expectations. Direct GREEN targets selection_stays_visible, bottom_keyboard_help, TEST-quick-search-uat, TEST-quick-search-modal. Verification includes frontend build, changed lint/typecheck/metrics and existing external-reference/scoped-search journeys.

## Mutation contract

Create query policy/highlight/footer/hooks and their focused tests plus tests/e2e/quick-search/uat.spec.ts. Modify existing QuickSearch owners, TicketCode, ExternalReferenceBadges, server TicketService and existing search tests/selectors; update quick-search surface spec/interactions/mockups and these ticket artifacts. No runtime deletions. Generated trace projections are rendered by spec-trace. Keep screenshots/evidence in thread storage or .git/mdt/evidence.

## Verify

bun test --isolate frontend/src/components/QuickSearch frontend/src/hooks/useQuickSearch.test.ts frontend/src/hooks/useCrossProjectSearch.test.ts

bun run test:e2e -- tests/e2e/quick-search/uat.spec.ts --project=chromium

bun run build
