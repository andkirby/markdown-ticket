# BDD: MDT-237 — Inline-code .md references as clickable links

Canonical scenarios live in spec-trace (`bdd.trace.md`). Narrative only.

## E2E Detection

```yaml
e2e:
  framework: Playwright
  directory: tests/e2e
  pattern: tests/e2e/**/*.spec.ts
  command: bunx playwright test
  filter: tests/e2e/ticket/smartlink-doc-refs.spec.ts (extend or sibling spec for MDT-237)
acceptance_gating:
  executable_required: true
  waiver:
    granted: false
    reason: n/a
```

## Feature (summary)

```gherkin
Feature: Inline-code document references
  As a board user reading agent-authored tickets
  I want inline-code .md references to be clickable
  So that I can navigate to referenced documents in one click
```

## Journeys and Coverage

| Scenario | Covers | Priority |
|----------|--------|----------|
| convert_inline_code_doc_reference | BR-1.1 | high |
| client_side_navigation_no_reload | BR-1.2 | high |
| broken_reference_visibly_flagged | BR-2.1 | medium |
| fenced_code_path_stays_plain | BR-3.1 | high |
| genuine_inline_code_stays_plain | BR-3.2 | high |

Full Gherkin bodies: `docs/CRs/MDT-237/bdd.trace.md`.

## Test Expectation

Normal mode — all executable acceptance tests are expected to **fail** before
implementation and pass after.

**Next**: `mdt:architecture MDT-237`
