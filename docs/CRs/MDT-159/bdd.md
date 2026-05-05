# BDD: MDT-159

## Overview

BDD scenarios cover the user-visible behavior of dynamic CR key formatting. The core behavior is: CR keys are formatted with a minimum of 3-digit zero-padding, expanding naturally to 4 or 5 digits as ticket numbers increase beyond 999.

## Acceptance Strategy

Scenarios are spec-only — no executable E2E tests are generated for this technical debt change. The formatting logic is a pure utility function (`formatCrKey`) exercised through unit tests (covered in `/mdt:tests`). BDD scenarios serve as behavioral acceptance criteria documentation.

**E2E framework**: Playwright exists in the project (`tests/e2e/`) but is not used here because the change is a pure utility extraction with no user-facing UI flow to test end-to-end. The behavior is observable through:
- Correct ticket key display in the board/list view
- Correct URL routing for ticket detail pages
- Correct quick search resolution

**Acceptance gating**: Waived. This is a technical debt CR with behavior already well-covered by unit tests. E2E verification is manual (create a test ticket at number 1000+ and verify key format).

## Scenario Budget

| Budget | Used | Remaining |
|--------|------|-----------|
| Total max: 12 | 5 | 7 |
| Per journey max: 3 | 2 (key formatting journey) | 1 |

## Test-Facing Contract Notes

- `formatCrKey(projectCode: string, number: number): string` is the public API
- Return format: `{PROJECTCODE}-{NUMBER}` where NUMBER uses `Math.max(3, String(num).length)` padding
- Boundary values: 1 (→001), 999 (→999), 1000 (→1000), 10000 (→10000)
- Scenario `cr_key_3digit_padding` uses number 1 (exact traceability to ticket AC: formatCrKey('MDT', 1) → MDT-001)
- The function must handle any project code (not just MDT)

## Execution Notes

- Spec-only mode — no Playwright E2E files generated
- Unit test coverage is the primary verification mechanism
- Manual verification: create a ticket at number 1000+ and confirm key format in UI

---
*Rendered by /mdt:bdd via spec-trace*
