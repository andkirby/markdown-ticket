This is a really important architectural question - the "multi-interface consistency" problem. Let me break down the patterns and options.

## The Core Problem

You have **one domain** (Projects, CRs, etc.) exposed through **three interfaces** (CLI, MCP, UI), and you need:
1. Tests for each interface's specific behavior
2. Consistency guarantees that all interfaces represent the same entities the same way
3. A maintainable structure that doesn't duplicate knowledge

## The Test Layers

```
┌─────────────────────────────────────────────────────┐
│  E2E / Acceptance Tests (per interface)             │
│  "Does the user journey work?"                      │
├─────────────────────────────────────────────────────┤
│  Integration Tests (per interface)                  │
│  "Does this interface correctly call the domain?"   │
├─────────────────────────────────────────────────────┤
│  Contract Tests (shared)                            │
│  "Do all interfaces return consistent shapes?"      │
├─────────────────────────────────────────────────────┤
│  Unit Tests (shared/core)                           │
│  "Does the business logic work correctly?"          │
└─────────────────────────────────────────────────────┘
```

## Options for Structure

### Option A: Co-located Tests with Shared Fixtures Package

```
packages/
  test-contracts/           ← Single source of truth
    src/
      schemas/
        project.schema.ts   ← "A project MUST have these fields"
      fixtures/
        project.builder.ts  ← Test data factory
      assertions/
        project.assertions.ts
  
  shared/
    src/
    __tests__/              ← Core logic tests
  
  cli/
    __tests__/              ← CLI-specific tests, imports test-contracts
  
  mcp-server/
    __tests__/              ← MCP handler tests
  
  ui/
    e2e/                    ← Playwright, can import from test-contracts
```

**Pros**: Tests close to code, shared contracts prevent drift
**Cons**: Requires discipline to use shared fixtures

### Option B: Centralized Test Directory

```
packages/
  shared/
  cli/
  mcp-server/
  ui/

tests/                      ← All tests here
  contracts/
    project.contract.ts     ← The source of truth
  
  unit/
    shared/
  
  integration/
    cli/
    mcp/
  
  e2e/
    ui/                     ← Playwright
  
  cross-interface/          ← Tests that verify CLI ≡ MCP ≡ UI
    project.consistency.test.ts
```

**Pros**: Clear test organization, easy to add cross-interface tests
**Cons**: Tests far from implementation, harder navigation

### Option C: Hybrid with Contract-Driven Testing

This is the most sophisticated approach for your "single source of truth" requirement:

```
packages/
  domain-contracts/         ← THE source of truth
    src/
      project/
        schema.ts           ← Zod schema defining Project shape
        behaviors.ts        ← BDD-style behavior specs
        fixtures.ts         ← Builder using schema
    
  shared/
    __tests__/
      *.unit.test.ts
    
  cli/
    __tests__/
      *.integration.test.ts
      # imports and validates against domain-contracts
    
  mcp-server/
    __tests__/
      *.integration.test.ts
      # imports and validates against domain-contracts
    
  ui/
    e2e/
      *.spec.ts
      # Playwright tests validate responses against domain-contracts
```

## The Consistency Pattern

Here's the key insight for ensuring CLI ≡ MCP ≡ UI:

```typescript
// packages/domain-contracts/src/project/schema.ts
import { z } from 'zod';

export const ProjectSchema = z.object({
  key: z.string().regex(/^[A-Z]{2,5}$/),
  name: z.string().min(1),
  description: z.string().optional(),
  rootPath: z.string(),
  // ... all fields that MUST exist across all interfaces
});

export type Project = z.infer<typeof ProjectSchema>;

// packages/domain-contracts/src/project/behaviors.ts
export const ProjectBehaviors = {
  'list projects': {
    given: 'projects exist in config',
    when: 'user requests project list',
    then: 'all projects returned match ProjectSchema',
  },
  // ... behavioral contracts
} as const;
```

Then in each interface's tests:

```typescript
// cli/__tests__/list-projects.test.ts
import { ProjectSchema } from '@mdt/domain-contracts';

test('list projects returns valid projects', async () => {
  const result = await cli(['projects', 'list']);
  
  // This ensures CLI output matches the contract
  for (const project of result.projects) {
    expect(() => ProjectSchema.parse(project)).not.toThrow();
  }
});

// mcp-server/__tests__/list-projects.test.ts
import { ProjectSchema } from '@mdt/domain-contracts';

test('list_projects tool returns valid projects', async () => {
  const result = await callMcpTool('list_projects', {});
  
  // Same validation - ensures MCP matches contract
  for (const project of result.projects) {
    expect(() => ProjectSchema.parse(project)).not.toThrow();
  }
});
```

## My Recommendation

For your case (MDT project with shared core, multiple interfaces), I'd suggest **Option C** because:

1. **Schema as Source of Truth**: Zod schemas (or similar) define what entities look like. All interfaces validate against these.

2. **Behavioral Contracts**: BDD-style specs in the contracts package describe what should happen, interface-specific tests implement these.

3. **Cross-Interface Tests** (optional but powerful): Tests that literally call CLI, MCP, and read UI state to verify they're consistent:

```typescript
// tests/cross-interface/project.consistency.test.ts
test('project representation is consistent across interfaces', async () => {
  // Create via CLI
  await cli(['projects', 'create', '--key', 'TEST', '--name', 'Test']);
  
  // Read via all interfaces
  const fromCli = await cli(['projects', 'get', 'TEST']);
  const fromMcp = await callMcpTool('get_project_info', { key: 'TEST' });
  
  // All should match the contract
  expect(fromCli).toMatchObject(fromMcp);
  expect(() => ProjectSchema.parse(fromCli)).not.toThrow();
});
```

## Where Each Test Type Lives

| Test Type | Location | What it Tests |
|-----------|----------|---------------|
| Unit | `packages/shared/__tests__/` | Pure business logic |
| CLI Integration | `packages/cli/__tests__/` | Command parsing, output format |
| MCP Integration | `packages/mcp-server/__tests__/` | Tool handlers, response format |
| UI E2E | `packages/ui/e2e/` or `apps/ui/e2e/` | Playwright user journeys |
| Contract Schemas | `packages/domain-contracts/` | Entity definitions, validators |
| Cross-Interface | `tests/cross-interface/` (optional) | Consistency checks |

---

Great question! This is actually a key architectural decision:

## Option 1: Test-Only Contracts

```
domain-contracts/     ← Only tests import this
  schemas/
  fixtures/
  
shared/               ← Production code has its own types
  src/
    types/project.ts  ← Separate from test schemas
```

**Problem**: Drift. Production types and test contracts can diverge.

## Option 2: Contracts ARE the Production Types (Recommended)

```
domain-contracts/     ← Both production code AND tests use this
  src/
    project/
      schema.ts       ← Zod schema = runtime validation + TypeScript types
      
shared/
  src/
    services/
      project.service.ts
      // import { ProjectSchema, Project } from '@mdt/domain-contracts'
```

This is the powerful pattern - **schemas are the source of truth for both runtime and tests**:

```typescript
// domain-contracts/src/project/schema.ts
import { z } from 'zod';

export const ProjectSchema = z.object({
  key: z.string().regex(/^[A-Z]{2,5}$/),
  name: z.string().min(1),
  rootPath: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;  // ← TypeScript type derived from schema

// Used in production code:
export function validateProject(input: unknown): Project {
  return ProjectSchema.parse(input);  // Runtime validation
}
```

```typescript
// shared/src/services/project.service.ts
import { Project, validateProject } from '@mdt/domain-contracts';

export function createProject(input: unknown): Project {
  const validated = validateProject(input);  // ← Same schema used in prod
  // ...
}
```

```typescript
// cli/__tests__/create-project.test.ts
import { ProjectSchema } from '@mdt/domain-contracts';

test('create returns valid project', async () => {
  const result = await cli(['projects', 'create', ...]);
  ProjectSchema.parse(result);  // ← Same schema used in tests
});
```

## The Point

When code and tests share the same contracts:
- **Impossible to drift** - if you change the schema, both update
- **Runtime validation** - production code catches invalid data
- **Type safety** - TypeScript types derived from schemas
- **Test accuracy** - tests validate against actual production rules

So yes - **production code should use domain-contracts**, not just tests. That's what makes it a true "single source of truth."

----

Separate package. Here's why:

## Dependency Direction

```
domain-contracts/     ← Zero internal dependencies (pure schemas/types)
       ↑
    shared/           ← Depends on contracts, adds implementation
       ↑
  ┌────┼────┐
 cli/  mcp/  ui/      ← Depend on both
```

If contracts live inside `shared/`:

```
shared/
  contracts/    ← Everything that needs types must import shared/
  services/     ← ...even if they don't need services
  utils/
```

**Problems with embedding**:
- `shared/` becomes a grab-bag
- Heavier dependency for packages that only need types
- Harder to enforce "contracts have no implementation dependencies"

## The Clean Structure

```
packages/
  domain-contracts/        ← Pure types, schemas, NO implementation
    src/
      project/
        schema.ts
      cr/
        schema.ts
      index.ts
    package.json           ← Zero internal deps, only zod
    
  shared/                  ← Implementation depends on contracts
    src/
      services/
      utils/
    package.json           ← "dependencies": { "@mdt/domain-contracts": "*" }
```

## Rule of Thumb

> **Contracts package should be importable by anything without pulling in implementation.**

If someone writes a third-party tool that just needs to validate MDT project structure, they import `@mdt/domain-contracts` - no services, no utils, no side effects.

Separate package enforces this naturally.


NOTE:

At the moment, we shall consider packages/ as project root as we have shared/ mcp-server/ server/ in root.
