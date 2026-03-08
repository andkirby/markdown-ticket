# Testing Patterns & Recipes

## Adding Tickets to Scenario

```typescript
const scenario = await buildScenario(projectFactory, 'simple')

// Single ticket
await projectFactory.createTestCR(scenario.projectCode, {
  title: 'Extra Ticket',
  type: 'Bug Fix',
  status: 'Proposed',
  priority: 'High',
  content: 'Description here.',
})

// Multiple tickets
await projectFactory.createMultipleCRs(scenario.projectCode, [
  { title: 'Ticket A', type: 'Feature Enhancement', status: 'In Progress', priority: 'Medium', content: '...' },
  { title: 'Ticket B', type: 'Bug Fix', status: 'Proposed', priority: 'Low', content: '...' },
])
```

## Creating Extra Projects

```typescript
// Auto-generated code
const extra = await projectFactory.createProject('empty', { name: 'Secondary Project' })

// Explicit code
const extra = await projectFactory.createProject('empty', { name: 'Secondary Project', code: 'SEC' })
```

## Multi-Project Tests

```typescript
const primary = await buildScenario(projectFactory, 'simple')
const secondary = await projectFactory.createProject('empty', { name: 'Other Project' })

// Navigate to primary explicitly
await page.goto(`/prj/${primary.projectCode}`)
await waitForBoardReady(page)

// Switch to secondary (click inactive chip)
await page.click(`[data-testid="project-selector-chip-${secondary.key}"]`)
await waitForBoardReady(page)
```
