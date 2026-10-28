# Test Plan

Keep existing TEST-use-quick-search-unit and TEST-quick-search-modal regressions. Add TEST-quick-search-uat (tests/e2e/quick-search/uat.spec.ts) for local numeric/text isolation, All projects numeric/text AND matching, explicit full keys/@CODE precedence, query preservation/reset, highlighted keys/titles/shortened refs, scroll follow in both directions, bottom help and native Tab/F6 interactions. Exercise narrow and light/dark states and invalid/empty/error transitions; no background results may be selected.

Add TEST-quick-search-policy (frontend query routing/highlight tests) and TEST-quick-search-remote-text (server API search tests) for literal input, multiword queries and existing identity ranking/deduplication. C1-C4 remain direct regression targets. Browser screenshots prove layout and contrast separately from trace validation.

Completion-review regressions: physical Shift+Tab from the input wraps to the final help control, Tab wraps back, dialog semantics are exposed and Escape restores the opener. An @other-project fixture with a matching current-project name must show only scoped ticket results.
