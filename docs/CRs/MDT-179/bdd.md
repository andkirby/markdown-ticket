# BDD: MDT-179

**Source**: [MDT-179](../MDT-179-scoped-global-search.md)
**Generated**: 2026-06-05

## Overview

BDD scenarios cover the scoped global search user experience: scope selection, grouped results, project matching, keyboard navigation, and edge cases. Scenarios are written from the user's perspective without assuming internal architecture.

## Acceptance Strategy

- **15 scenarios** across 5 journeys: scope controls, grouped results, project matching, scoped search, keyboard navigation.
- Playwright E2E framework is available (`playwright.config.ts`, `tests/e2e/`).
- Scenarios will fail until implementation is complete (normal mode).
- BR-6.2 (access control / hidden entities) rerouted to `tests` stage — not user-visible in the typical BDD sense.

## Journey Map

| Journey | Scenarios | Requirements Covered |
|---------|-----------|---------------------|
| Scope Controls | scope_controls_visible, scope_switch_via_click, scope_switch_via_keyboard, shortcut_cycles_scopes | BR-1.1–BR-1.4 |
| Grouped Results | global_search_grouped_results, select_project_navigates, select_ticket_or_document, select_document_navigates | BR-2.1–BR-2.5 |
| Project Matching | partial_project_name_matching, ticket_key_priority, project_scope_ticket_search, project_scope_returns_tickets | BR-3.1–BR-3.4, BR-6.4 |
| Scoped Search | scoped_search_filters_entity_type | BR-4.1–BR-4.4 |
| Keyboard & Edge | keyboard_navigation_grouped, enter_activates_result, ambiguous_query_separate_groups, empty_state_shows_active_scope | BR-5.1–BR-5.3, BR-6.1, BR-6.3 |

## E2E Framework

```yaml
framework: Playwright
directory: tests/e2e/
pattern: "*.spec.ts"
command: "bun run test:e2e"
filter: "--grep 'scoped global search'"
```

## Test-Facing Contract Notes

- Quick search modal testid: `quick-search-modal`
- Search input testid: `quick-search-input`
- Scope controls: need new testids for scope tabs/buttons (architecture will define)
- Result groups: need group-level testids per entity type
- Keyboard shortcuts for scope switching: TBD by architecture

## Execution Notes

- Run `bun run test:e2e --grep 'scoped global search'` to execute MDT-179 scenarios.
- Test fixtures need: at least 2 projects, tickets across projects, and documents.
- Cross-project search already has fixtures; extend for project name matching.

---
Use `bdd.trace.md` for canonical scenario records and coverage summaries.
