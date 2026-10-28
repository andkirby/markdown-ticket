# Architecture

## Current ownership

MDT-136 owns Quick Search fundamentals; MDT-152 supplies remote transport, MDT-179 entity filters and MDT-252 external identity matching/badges. Use existing Modal/ModalBody, ScrollArea, TicketCode and ExternalReferenceBadges. Keep App.tsx as a route table.

## Runtime flow

QuickSearchModal composes query/location state, entity tabs, result model, keyboard behavior and fixed footer. A focused query-routing helper determines local, explicit key, @CODE and all-project text modes. Local search uses useQuickSearch/filterTickets, remote search reuses useCrossProjectSearch with its debounce/cache/invalidation and the existing SearchRequest contract. The legacy ticket_key API mode already accepts arbitrary nonempty queries: extend its server matching to apply shared referenceSearch provenance/score per term (AND), retaining exact identity ranking and deduplication before existing limits. No second HTTP endpoint or per-project frontend fetch loop.

QuickSearchResults renders the one visible ordered result set. Keyboard index, Enter dispatch and scroll visibility must derive from the same visible results, excluding loading/error and entity-hidden remote hits. scrollIntoView with nearest block/inline alignment only when selection/result data changes; do not move input focus or animate scrolling.

SearchHighlight is a small reusable safe text renderer: literal substring matching, case insensitive, no HTML injection, no regular-expression interpretation. Optional text render slots in TicketCode and ExternalReferenceBadges preserve component ownership and leave other surfaces unchanged. Query scoping syntax is removed before matching.

SearchScopeBar owns entity tabs with native roving tab focus and arrow/Home/End behavior. A sibling pressed All projects button owns location; explicit key/@CODE location is identified beside the input. QuickSearchFooter owns concise primary keyboard help and expandable details. Native Tab reaches controls and links; F6 focuses the selected native primary action and Shift+F6 returns to input as compatible optional accelerators. Only first/last Tab boundaries are wrapped; interior Tab navigation stays native and portalled reference popovers keep their focus handling. Capture the opener before input autofocus in a layout effect and restore it on close if connected. Quick Search supplies dialog role, aria-modal and an accessible name on its existing Modal. Explicit @CODE ticket lookups suppress project-discovery rows.

## Invariants and boundaries

Preserve native external links, full accessible identities, status/priority glyphs, hidden-only overflow, 24px targets, theme/density tokens, Quick Search focus containment and restoration and external-link isolation. Current filtering cap 10; remote 5/project and 15 total. Match highlight differs from row selection in light/dark themes. Only the results middle scrolls; input, toolbar and bottom status/help remain visible on narrow/short screens. No existing user servers are restarted.

## Verification anchors

Frontend policy/render tests, shared/server search tests, tests/e2e/quick-search/uat.spec.ts, and existing quick-search/external-references/scoped-search journeys. Canonical artifacts and obligations are maintained via spec-trace.
