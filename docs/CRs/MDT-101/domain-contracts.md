# Domain Contracts Package

## Purpose

Single source of truth for entity definitions across all interfaces. Provides:
- Runtime validation schemas
- Type definitions derived from schemas
- Validation functions called at interface boundaries
- Test utilities (separate subpath)

## Package Structure

```
domain-contracts/
  package.json
  src/
    index.ts                     ← Main production exports

    {entity}/                    ← One directory per domain entity
      schema.ts                  ← Entity schema + input schemas + derived types
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

```
domain-contracts     ← Pure schemas, minimal dependencies
       ↑
    shared/business  ← Implementation, depends on contracts
       ↑
  interfaces         ← UI, API, CLI, etc. depend on both
```

## File Patterns

### Entity Schema File (`src/{entity}/schema.ts`)

Contains:
- Primary entity schema with field validation rules
- Input schemas derived from entity schema (create, update, etc.)
- Type definitions derived from schemas

```typescript
// Import your preferred validation library
import { SchemaLibrary } from 'validation-lib';

// Primary entity schema
export const EntitySchema = SchemaLibrary.object({
  // Field definitions with validation rules
});

// Input schemas (examples)
export const CreateEntityInputSchema = EntitySchema.pick({
  // Selected fields for creation
});

export const UpdateEntityInputSchema = EntitySchema.partial().required({
  // Required identifier for updates
});

// Type definitions
export type Entity = InferType<typeof EntitySchema>;
export type CreateEntityInput = InferType<typeof CreateEntityInputSchema>;
```

### Validation File (`src/{entity}/validation.ts`)

Contains:
- Wrapper functions using schema validation
- Both throwing and non-throwing variants
- Type-safe return values

```typescript
import { EntitySchema, CreateEntityInputSchema, type Entity } from './schema';

// Throwing validation
export function validateEntity(input: unknown): Entity {
  return EntitySchema.parse(input);
}

// Safe validation (returns result object)
export function safeValidateEntity(input: unknown) {
  return EntitySchema.safeParse(input);
}
```

### Export Files

**Entity exports (`src/{entity}/index.ts`)**:
```typescript
export * from './schema';
export * from './validation';
```

**Main exports (`src/index.ts`)**:
```typescript
export * from './entity1';
export * from './entity2';
// Add other entities as needed
// Do NOT export testing utilities from main
```

### Test Fixtures (`src/testing/{entity}.fixtures.ts`)

Contains:
- Builder functions for test data
- Valid default objects
- Override patterns for test variations

```typescript
import { type Entity, type CreateEntityInput } from '../entity';

export function buildEntity(overrides?: Partial<Entity>): Entity {
  return {
    // Valid default values
    id: 'test-id',
    name: 'Test Entity',
    // ... other required fields
    ...overrides,
  };
}

export function buildCreateEntityInput(
  overrides?: Partial<CreateEntityInput>
): CreateEntityInput {
  return {
    // Values suitable for creation
    name: 'Test Entity',
    // ... creation fields
    ...overrides,
  };
}
```

**Testing exports (`src/testing/index.ts`)**:
```typescript
export * from './entity.fixtures';
export * from './otherEntity.fixtures';
```

## Import Patterns

```typescript
// Production code
import { EntitySchema, Entity, validateCreateEntityInput } from 'domain-contracts';

// Test code (via subpath export)
import { buildEntity } from 'domain-contracts/testing';
```

## Validation Flow

```
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

import { validateCreateEntityInput } from 'domain-contracts';
import { entityService } from 'business-layer';

export async function createEndpoint(requestBody: unknown) {
  // 1. Validate input shape using contracts
  const input = validateCreateEntityInput(requestBody);

  // 2. Pass validated data to business layer
  return entityService.create(input);
}
```

### Business Layer Example

```typescript
// Business/service layer receives already-validated data
// TypeScript enforces the contract at compile time

import type { CreateEntityInput, Entity } from 'domain-contracts';

// Function signature ensures only validated input is accepted
export function create(input: CreateEntityInput): Entity {
  // Business logic implementation
  return {
    ...input,
    // ... additional computed fields
  };
}
```

### Testing Example

```typescript
// Tests use fixtures to create valid test data
import { buildEntity } from 'domain-contracts/testing';

describe('entity service', () => {
  it('should create entity with valid input', () => {
    const testEntity = buildEntity({ name: 'Custom Name' });

    // Test implementation
    const result = entityService.create(testEntity);

    expect(result.name).toBe('Custom Name');
  });
});
```

## Key Principles

1. **Validation at Boundaries**: Validate external input immediately
2. **Trust Within System**: Once validated, data can be trusted internally
3. **Type Safety**: TypeScript prevents invalid data from passing through
4. **Test Isolation**: Fixtures provide valid test data without circular dependencies
5. **Minimal Dependencies**: Contracts only depend on validation library, not on business logic
