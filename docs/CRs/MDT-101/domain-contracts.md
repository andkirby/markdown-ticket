# Domain Contracts Package

## Purpose

Single source of truth for entity definitions across all interfaces (CLI, MCP, UI). Provides:
- Zod schemas for runtime validation
- TypeScript types derived from schemas
- Validation functions called at interface boundaries
- Test fixtures (separate subpath)

## Package Structure

```
packages/
  domain-contracts/
    package.json
    src/
      index.ts                     ← Main production exports
      
      project/
        schema.ts                  ← Entity schema + input schemas + derived types
        validation.ts              ← Validation functions
        index.ts                   ← Public exports for project
        
      cr/
        schema.ts
        validation.ts
        index.ts
        
      testing/
        index.ts                   ← Test utilities entry point
        project.fixtures.ts        ← Project test builders
        cr.fixtures.ts             ← CR test builders
```

## Dependency Direction

```
domain-contracts     ← Pure schemas, zero internal deps
       ↑
    shared           ← Implementation, depends on contracts
       ↑
  cli / mcp / ui     ← Depend on both
```

## File Contents

### `src/{entity}/schema.ts`

```typescript
import { z } from 'zod';

// Entity schema
export const ProjectSchema = z.object({
  key: z.string().regex(/^[A-Z]{2,5}$/, 'Key must be 2-5 uppercase letters'),
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  rootPath: z.string(),
});

// Input schemas (derived from entity)
export const CreateProjectInputSchema = ProjectSchema.pick({
  key: true,
  name: true,
  rootPath: true,
}).extend({
  description: z.string().optional(),
});

export const UpdateProjectInputSchema = ProjectSchema.partial().required({
  key: true,
});

// Derived types
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
```

### `src/{entity}/validation.ts`

```typescript
import {
  ProjectSchema,
  CreateProjectInputSchema,
  type Project,
  type CreateProjectInput,
} from './schema';

export function validateProject(input: unknown): Project {
  return ProjectSchema.parse(input);
}

export function validateCreateProjectInput(input: unknown): CreateProjectInput {
  return CreateProjectInputSchema.parse(input);
}

// Safe version (returns result instead of throwing)
export function safeValidateCreateProjectInput(input: unknown) {
  return CreateProjectInputSchema.safeParse(input);
}
```

### `src/{entity}/index.ts`

```typescript
export * from './schema';
export * from './validation';
```

### `src/index.ts`

```typescript
export * from './project';
export * from './cr';
// NOT: export * from './testing'
```

### `src/testing/{entity}.fixtures.ts`

```typescript
import { type Project, type CreateProjectInput } from '../project';

export function buildProject(overrides?: Partial<Project>): Project {
  return {
    key: 'TEST',
    name: 'Test Project',
    rootPath: '/tmp/test',
    ...overrides,
  };
}

export function buildCreateProjectInput(
  overrides?: Partial<CreateProjectInput>
): CreateProjectInput {
  return {
    key: 'TEST',
    name: 'Test Project',
    rootPath: '/tmp/test',
    ...overrides,
  };
}
```

### `src/testing/index.ts`

```typescript
export * from './project.fixtures';
export * from './cr.fixtures';
```

## Import Patterns

```typescript
// Production code
import { ProjectSchema, Project, validateCreateProjectInput } from '@mdt/domain-contracts';

// Test code
import { buildProject } from '@mdt/domain-contracts/testing';
```

## Validation Flow

```
Raw Input (unknown)
       ↓
   [Boundary: CLI/MCP/UI]
       ↓
   validateXxxInput()  ← domain-contracts
       ↓
   Validated Input (typed)
       ↓
   [Shared Service]
       ↓
   Business Logic
```

### CLI Example

```typescript
// cli/src/commands/project/create.ts
import { validateCreateProjectInput } from '@mdt/domain-contracts';
import { projectService } from '@mdt/shared';

export async function createCommand(options: Record<string, unknown>) {
  const input = validateCreateProjectInput({
    key: options.key,
    name: options.name,
    rootPath: options.path,
  });
  
  return projectService.create(input);
}
```

### MCP Example

```typescript
// mcp-server/src/tools/project/create.ts
import { validateCreateProjectInput } from '@mdt/domain-contracts';
import { projectService } from '@mdt/shared';

export const createProjectTool = {
  name: 'create_project',
  async handler(params: unknown) {
    const input = validateCreateProjectInput(params);
    return projectService.create(input);
  }
};
```

### Shared Service Example

```typescript
// shared/src/services/project.service.ts
import type { CreateProjectInput, Project } from '@mdt/domain-contracts';

// Receives already-validated input - TypeScript enforces the contract
export function create(input: CreateProjectInput): Project {
  return {
    ...input,
    // ... additional fields
  };
}
```
