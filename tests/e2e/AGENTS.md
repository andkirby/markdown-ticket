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

## Scenarios

`buildScenario(projectFactory, type)` creates a named preset project with tickets and returns a `ScenarioResult`:

```typescript
interface ScenarioResult {
  projectCode: string   // e.g. 'TABC' — use in selectors: `project-option-${projectCode}`
  projectName: string   // human-readable name
  projectDir: string    // absolute path to project on disk
  crCodes: string[]     // e.g. ['TABC-1', 'TABC-2', 'TABC-3']
  ticketCount: number   // crCodes.length (only successfully created tickets)
}
```

### Preset sizes

| Type | Tickets | Statuses present | Use when |
|------|---------|-----------------|----------|
| `'simple'` | 3 | Implemented, In Progress, Proposed | Default — smoke tests, basic rendering, single-ticket interactions |
| `'medium'` | 7 | Implemented ×2, In Progress ×2, Proposed ×3 | Multiple columns populated, filtering, sorting |
| `'complex'` | 12 | Implemented ×3, In Progress ×3, Proposed ×6 | Board overflow, pagination, bulk operations |

### When to use `buildScenario` vs `projectFactory` directly

Use `buildScenario` when the test just needs data to exist and doesn't care about specifics.

Use `projectFactory` directly when the test depends on exact ticket titles, types, priorities, or statuses:

```typescript
const project = await e2eContext.projectFactory.createProject('empty', { name: 'My Test Project' })
await e2eContext.projectFactory.createTestCR(project.key, {
  title: 'My CR',
  type: 'Feature Enhancement',
  status: 'In Progress',
  priority: 'High',
  content: 'Details here.',
})
```

## Creating Custom Test Data

See the **Scenarios** section above — prefer `buildScenario` unless you need precise control over ticket content.

## Shared Environment — Critical Patterns

`e2eContext` is a **singleton**: projects created by any test persist for all subsequent tests in the run. There is no per-test teardown.

Each test does get a fresh `page` (clean localStorage). That means `page.goto('/')` redirects to `projects[0]` — whatever the backend returns first — which may belong to a different test.

### Rule: always navigate directly to your project

```typescript
// ❌ Only safe if your test is definitely first and no prior test created a project
await page.goto('/')
await waitForBoardReady(page)

// ✅ Always correct — goes straight to your project regardless of what else exists
await page.goto(`/prj/${scenario.projectCode}`)
await waitForBoardReady(page)
```

The smoke test in `infrastructure.spec.ts` uses `page.goto('/')` intentionally because it runs first in serial mode. All other tests should navigate directly.

### Adding tickets to a scenario project

```typescript
const scenario = await buildScenario(projectFactory, 'simple')

// Add one ticket
await projectFactory.createTestCR(scenario.projectCode, {
  title: 'Extra Ticket',
  type: 'Bug Fix',
  status: 'Proposed',
  priority: 'High',
  content: 'Description here.',
})

// Add several tickets at once
await projectFactory.createMultipleCRs(scenario.projectCode, [
  { title: 'Ticket A', type: 'Feature Enhancement', status: 'In Progress', priority: 'Medium', content: '...' },
  { title: 'Ticket B', type: 'Bug Fix', status: 'Proposed', priority: 'Low', content: '...' },
])
```

### Creating extra projects

```typescript
const extra = await projectFactory.createProject('empty', { name: 'Secondary Project' })
// extra.key  — generated project code e.g. 'TXYZ'
// extra.path — absolute path on disk
```

Each `createProject` call generates a unique code automatically. If your test needs a predictable code, pass it explicitly:

```typescript
const extra = await projectFactory.createProject('empty', { name: 'Secondary Project', code: 'SEC' })
```

### Designing tests that create multiple projects

When a test creates two or more projects, the app will show both in the nav bar. Navigate explicitly to the one you want to interact with:

```typescript
const primary = await buildScenario(projectFactory, 'simple')
const secondary = await projectFactory.createProject('empty', { name: 'Other Project' })

// Navigate to primary — don't rely on auto-selection
await page.goto(`/prj/${primary.projectCode}`)
await waitForBoardReady(page)

// Switch to secondary explicitly
await page.click(`[data-testid="project-option-${secondary.key}"]`)
await waitForBoardReady(page)
```

## Isolation Contract

- `CONFIG_DIR` → temp directory, set before backend imports load
- `createTestApp()` → lazy-imported in `e2e-context.ts` after `CONFIG_DIR` is set
- Never import `createTestApp` at the top of a file — always lazy-load it

Violating the order causes the backend to read from your real config directory.
