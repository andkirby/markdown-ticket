# AGENTS.md — Writing E2E Tests

Essential guidance for agents writing E2E tests. For detailed reference, see:
- `TESTING_SCENARIOS.md` — Scenario presets and API reference
- `TESTING_PATTERNS.md` — Common test patterns and recipes
- `TESTING_INFRASTRUCTURE.md` — Test environment setup details

## File Structure

```
tests/e2e/
  fixtures/test-fixtures.ts     — extends Playwright base with e2eContext fixture
  setup/
    e2e-context.ts              — singleton: TestEnvironment + ProjectFactory + Express server
    scenario-builder.ts         — named datasets: simple (3), medium (7), complex (12) tickets
    index.ts                    — re-exports buildScenario, ScenarioResult
  utils/
    selectors.ts                — ALL data-testid selectors (source of truth)
    helpers.ts                  — waitForBoardReady, verifyApiHealth, etc.
  smoke/                        — infrastructure verification
  board/                        — board view tests (drag-drop, filtering)
  list/                         — list view tests (sorting, filtering)
  ticket/                       — ticket CRUD tests
  navigation/                   — routing, project switching
```

New spec files go in the matching feature folder.

## Minimal Test Template

```typescript
import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { boardSelectors } from '../utils/selectors.js'

test.describe('My Feature', () => {
  test('does the thing', async ({ page, e2eContext }) => {
    // 1. Create isolated test data
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // 2. Navigate — CRITICAL: always navigate directly to your project
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // 3. Interact and assert
    await expect(page.locator(boardSelectors.ticketCard).first()).toBeVisible()
  })
})
```

## data-testid Convention

**`tests/e2e/utils/selectors.ts` is the only place to look for available selectors.**
Read it before writing a test — never guess selectors from component names.

### Adding test hooks to a new feature

1. Add `data-testid="my-thing"` to the component element
2. Add `@testid` JSDoc on the component so it's visible when reading the file:
   ```tsx
   /**
    * @testid my-thing — description of what this element is
    */
   export function MyComponent() { ... }
   ```
3. Register in `selectors.ts`:
   ```typescript
   export const mySelectors = {
     thing: '[data-testid="my-thing"]',
   }
   ```

## Key Behaviours to Know

- **Auto-project selection**: with one isolated project, the app selects it automatically —
  no need to click a project selector in most tests
- **ProjectSelector rail**: `ProjectSelector` renders a rail of project buttons in the nav bar:
  - Active project: `[data-testid="project-selector-card-{CODE}"]` (larger card)
  - Inactive projects: `[data-testid="project-selector-chip-{CODE}"]` (compact chips)
  - Launcher: `[data-testid="project-selector-launcher"]` (opens full panel)
- **No `networkidle`**: SSE keeps a connection alive forever — always use `waitForLoadState('load')`
- **Cache disabled**: the test backend has `setCacheTTL(0)` — projects created mid-test
  are immediately visible to subsequent API calls

## Critical Rule: Always Navigate Directly

`e2eContext` is a **singleton** — projects created by any test persist for all subsequent tests. Each test gets a fresh `page`, but `page.goto('/')` redirects to `projects[0]` (whatever the backend returns first), which may belong to a different test.

```typescript
// ❌ Only safe if your test is definitely first
await page.goto('/')
await waitForBoardReady(page)

// ✅ Always correct — goes straight to your project
await page.goto(`/prj/${scenario.projectCode}`)
await waitForBoardReady(page)
```

Exception: The smoke test in `infrastructure.spec.ts` uses `page.goto('/')` intentionally because it runs first in serial mode.

## Scenarios Quick Reference

`buildScenario(projectFactory, type)` creates preset projects with tickets:

| Type | Tickets | Use for |
|------|---------|---------|
| `'simple'` | 3 | Smoke tests, basic rendering |
| `'medium'` | 7 | Multiple columns, filtering, sorting |
| `'complex'` | 12 | Overflow, pagination, bulk operations |

Use `buildScenario` when test just needs data. Use `projectFactory` directly for precise control.

**See `TESTING_SCENARIOS.md` for complete API reference and usage patterns.**

## Common Patterns

For recipes like adding tickets, creating extra projects, and multi-project tests, see `TESTING_PATTERNS.md`.

## Infrastructure Details

For isolation contract, CONFIG_DIR ordering, and test environment lifecycle, see `TESTING_INFRASTRUCTURE.md`.
