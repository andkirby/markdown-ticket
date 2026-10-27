# UAT Refinement Brief

## Objective

Match internal relationship badge grouping and remove repeated resolved references from external-reference dropdowns.

## Approved Changes

The user requested short dropdown names, identified the repetition of inline refs in the old complete-list popup, then requested one badge with one icon and a list of numbers. Render one group per exact tracker instance with up to three short links, a shared new-tab arrow and +N for hidden refs. All-fitting resolved groups have no dropdown. Unavailable refs keep non-navigating explanation access. Full raw identities stay in native link titles and accessibility names; persistence/configuration/destinations do not change.

This supersedes the original two-inline and always-available complete-list inspector.

## Changed Requirement IDs

BR-7, BR-9 and BR-15 refined in place. C8 remains the keyboard/target/text invariant; BR-14/17 retain independent viewer/search visibility. No new product capability or ticket is introduced.

## Affected Downstream Trace

Scenarios refs_open_correct_instance and refs_inspected_without_navigation; new obligation OBL-grouped-reference-presentation; TEST-external-reference-journeys refined. Existing TASK-1/TASK-3 artifacts and GREEN targets cover the two execution slices. Canonical stages were updated requirements → bdd → architecture → tests → tasks, the approved baseline was relocked, and strict all-stage validation passed.

## Execution Slices

1. TASK-1: ExternalReferenceBadges, badge.css and CompactTicketHeader own grouped presentation, common short labels, hidden-only overflow and unavailable explanations. Reuse relationship INLINE_MAX and existing badge/popover tokens. Direct GREEN target: TEST-external-reference-journeys. Canonical badge/card specs, mockups and HTML styleguide describe the new composition. Implementation complete.
2. TASK-3: ticket/search external-reference E2E specs and selectors verify one icon per instance, same-kind aliases, hidden-only dropdown, physical keyboard traversal, responsive targets and preserved drag/live behavior. Direct GREEN targets: TEST-external-reference-journeys, TEST-external-reference-search and TEST-drag-regression. Implementation, focused verification and independent scoped review complete.

## Validation

26/26 Chromium tests passed on the updated code and styleguide. Frontend production build, changed-file ESLint, changed TypeScript validation (2/2 projects) and strict all-stage trace validation passed. The actual Smartflyer board in Safari was refreshed and visually confirmed grouped Jira badges with short keys. Original immutable sealed evidence is not reused as proof of the new presentation. All three Wireloom mockup blocks compile and both changed frontend components have GREEN metrics. Codex thr_g5ynmg2ccm passed the scoped UAT implementation with no functional correction required. Its three minor stale-documentation findings were reconciled; the ticket has returned to Implemented.

## Watchlist

Keep exact instance boundaries, full native identities, keyboard-visible focus, 24px targets, 11px text floor, same-origin destinations, unavailable reasons, parent-card/drag isolation, matched-search visibility and native modifier/context-menu behavior. Do not restart existing user servers.
