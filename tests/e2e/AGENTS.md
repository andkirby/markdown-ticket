# AGENTS.md — Writing E2E Tests

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

    // 2. Navigate — app auto-selects the only project in the isolated env
    await page.goto('/')
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
- **No dropdown**: `ProjectSelector` renders one button per project in the nav bar;
  use `[data-testid="project-option-{CODE}"]` to target a specific project
- **No `networkidle`**: SSE keeps a connection alive forever — always use `waitForLoadState('load')`
- **Cache disabled**: the test backend has `setCacheTTL(0)` — projects created mid-test
  are immediately visible to subsequent API calls

## Creating Custom Test Data

Use `buildScenario` for standard datasets, or `projectFactory` directly for specific needs:

```typescript
const project = await e2eContext.projectFactory.createProject({ name: 'My Test Project' })
await e2eContext.projectFactory.createCR(project, {
  title: 'My CR',
  type: 'Feature Enhancement',
  status: 'In Progress',
})
```

## Isolation Contract

- `CONFIG_DIR` → temp directory, set before backend imports load
- `createTestApp()` → lazy-imported in `e2e-context.ts` after `CONFIG_DIR` is set
- Never import `createTestApp` at the top of a file — always lazy-load it

Violating the order causes the backend to read from your real config directory.
