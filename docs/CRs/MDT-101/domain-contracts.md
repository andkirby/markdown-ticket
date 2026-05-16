# Domain Contracts Package

## Purpose

Single source of truth for entity definitions across all interfaces. Provides:
- Runtime validation schemas
- Type definitions derived from schemas
- Validation functions called at interface boundaries
- Test utilities (separate subpath)

## Package Structure

```text
domain-contracts/
  package.json
  src/
    index.ts                     ← Main production exports

    {entity}/                    ← One directory per domain entity
      schema.ts                  ← Compatibility barrel or primary schema entrypoint
      entity.ts                  ← Canonical normalized entity schema (optional)
      input.ts                   ← Create/update/input schemas (optional)
      frontmatter.ts             ← Boundary or persisted format schemas (optional)
      validation.ts              ← Validation functions
      index.ts                   ← Public exports for entity

    testing/
      index.ts                   ← Test utilities entry point
      {entity}.fixtures.ts       ← Test data builders per entity
```

## Implementation Notes

- Use any schema validation library (Zod, Joi, etc.)
- Entity directories use domain-specific names (e.g., user, product, order)
- Testing utilities are isolated from production exports via subpath

## Dependency Direction

```text
domain-contracts     ← Pure schemas, minimal dependencies
       ↑
    shared/business  ← Implementation, depends on contracts
       ↑
  interfaces         ← UI, API, CLI, etc. depend on both
```

## File Patterns

### Entity Module (`src/{entity}/`)

Contains:
- One canonical entity schema
- Any boundary-specific schemas needed by that entity
- Input schemas derived from the canonical or boundary schemas
- Type definitions derived from schemas
- A stable public entrypoint for consumers

```typescript
// Canonical entity schema
export const EntitySchema = SchemaLibrary.object({
  // Normalized in-memory shape
})

// Optional persisted/boundary format schema
export const EntityBoundarySchema = SchemaLibrary.object({
  // Serialized or transport-oriented shape
})

// Input schemas
export const CreateEntityInputSchema = EntityBoundarySchema.pick({
  // Selected fields for creation
})

export const UpdateEntityInputSchema = CreateEntityInputSchema.partial()

export type Entity = InferType<typeof EntitySchema>
export type CreateEntityInput = InferType<typeof CreateEntityInputSchema>
```

`schema.ts` does not need to contain everything itself. It can be a compatibility barrel that re-exports `entity.ts`, `input.ts`, `frontmatter.ts`, and any legacy aliases.

Current ticket example in this repo:
- `entity.ts` = normalized runtime ticket
- `frontmatter.ts` = persisted/frontmatter shape
- `input.ts` = create/update input schemas
- `schema.ts` = compatibility barrel

### Validation File (`src/{entity}/validation.ts`)

Contains:
- Wrapper functions using schema validation
- Both throwing and non-throwing variants
- Type-safe return values

```typescript
import type { Entity } from './schema'
import { CreateEntityInputSchema, EntitySchema } from './schema'

// Throwing validation
export function validateEntity(input: unknown): Entity {
  return EntitySchema.parse(input)
}

// Safe validation (returns result object)
export function safeValidateEntity(input: unknown) {
  return EntitySchema.safeParse(input)
}
```

### Export Files

**Entity exports (`src/{entity}/index.ts`)**:

```typescript
export * from './schema'      // stable consumer entrypoint
export * from './validation'
```

**Main exports (`src/index.ts`)**:

```typescript
export * from './entity1'
export * from './entity2'
// Add other entities as needed
// Do NOT export testing utilities from main
```

### Test Fixtures (`src/testing/{entity}.fixtures.ts`)

Contains:
- Builder functions for test data
- Valid default objects
- Override patterns for test variations

```typescript
import type { CreateEntityInput, Entity } from '../entity'

export function buildEntity(overrides?: Partial<Entity>): Entity {
  return {
    // Valid default values
    id: 'test-id',
    name: 'Test Entity',
    // ... other required fields
    ...overrides,
  }
}

export function buildCreateEntityInput(
  overrides?: Partial<CreateEntityInput>
): CreateEntityInput {
  return {
    // Values suitable for creation
    name: 'Test Entity',
    // ... creation fields
    ...overrides,
  }
}
```

**Testing exports (`src/testing/index.ts`)**:

```typescript
export * from './entity.fixtures'
export * from './otherEntity.fixtures'
```

## Import Patterns

```typescript
// Production code
import { Entity, EntitySchema, validateCreateEntityInput } from 'domain-contracts'

// Test code (via subpath export)
import { buildEntity } from 'domain-contracts/testing'
```

## Validation Flow

```text
Raw Input (unknown)
       ↓
   [Interface Boundary]
       ↓
   validateXxxInput()  ← domain-contracts
       ↓
   Validated Input (typed)
       ↓
   [Business Layer]
       ↓
   Business Logic
```

## Usage Examples

### Interface Layer Example

```typescript
// At the boundary where external input enters the system
// (API controllers, CLI commands, MCP tools, etc.)

import { entityService } from 'business-layer'
import { validateCreateEntityInput } from 'domain-contracts'

export async function createEndpoint(requestBody: unknown) {
  // 1. Validate input shape using contracts
  const input = validateCreateEntityInput(requestBody)

  // 2. Pass validated data to business layer
  return entityService.create(input)
}
```

### Business Layer Example

```typescript
// Business/service layer receives already-validated data
// TypeScript enforces the contract at compile time

import type { CreateEntityInput, Entity } from 'domain-contracts'

// Function signature ensures only validated input is accepted
export function create(input: CreateEntityInput): Entity {
  // Business logic implementation
  return {
    ...input,
    // ... additional computed fields
  }
}
```

### Testing Example

```typescript
// Tests use fixtures to create valid test data
import { buildEntity } from 'domain-contracts/testing'

describe('entity service', () => {
  it('should create entity with valid input', () => {
    const testEntity = buildEntity({ name: 'Custom Name' })

    // Test implementation
    const result = entityService.create(testEntity)

    expect(result.name).toBe('Custom Name')
  })
})
```

## Key Principles

1. **Validation at Boundaries**: Validate external input immediately
2. **Trust Within System**: Once validated, data can be trusted internally
3. **Type Safety**: TypeScript prevents invalid data from passing through
4. **Test Isolation**: Fixtures provide valid test data without circular dependencies
5. **Minimal Dependencies**: Contracts only depend on validation library, not on business logic
6. **Entity-Agnostic Structure**: Each entity may use one file or several focused files; the principle is one source of truth per concept, not one file shape for every entity
