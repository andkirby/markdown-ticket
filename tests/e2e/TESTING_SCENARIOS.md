# Testing Scenarios Reference

## ScenarioResult Interface

```typescript
interface ScenarioResult {
  projectCode: string   // e.g. 'TABC' — use in selectors: `project-selector-card-${projectCode}` (active) or `project-selector-chip-${projectCode}` (inactive)
  projectName: string   // human-readable name
  projectDir: string    // absolute path to project on disk
  crCodes: string[]     // e.g. ['TABC-1', 'TABC-2', 'TABC-3']
  ticketCount: number   // crCodes.length (only successfully created tickets)
}
```

## Preset Sizes

| Type | Tickets | Statuses | Use Case |
|------|---------|----------|----------|
| `simple` | 3 | Implemented, In Progress, Proposed | Default |
| `medium` | 7 | Implemented ×2, In Progress ×2, Proposed ×3 | Filtering, sorting |
| `complex` | 12 | Implemented ×3, In Progress ×3, Proposed ×6 | Overflow, pagination |

## buildScenario vs projectFactory

**Use `buildScenario`** when test just needs data to exist:
```typescript
const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
await page.goto(`/prj/${scenario.projectCode}`)
```

**Use `projectFactory` directly** when test depends on exact ticket details:
```typescript
const project = await e2eContext.projectFactory.createProject('empty', {
  name: 'My Test Project'
})
await e2eContext.projectFactory.createTestCR(project.key, {
  title: 'My CR',
  type: 'Feature Enhancement',
  status: 'In Progress',
  priority: 'High',
  content: 'Details here.',
})
```
