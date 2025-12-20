# Behavioral Preservation for MDT-101 Type Enums Migration

This document outlines the current behavior that must be preserved when migrating from TypeScript union types to Zod schemas.

## Current State (from `shared/models/Types.ts`)

### CRStatus Enum
**Union type with 10 exact values:**
```typescript
export type CRStatus =
  | 'Proposed'
  | 'Approved'
  | 'In Progress'
  | 'Implemented'
  | 'Rejected'
  | 'On Hold'
  | 'Superseded'
  | 'Deprecated'
  | 'Duplicate'
  | 'Partially Implemented';
```

**Key behaviors to preserve:**
1. **Exact string values** - No transformations, preserve spaces and casing exactly
2. **All 10 values** - Cannot lose any status values
3. **Special cases** - 'In Progress', 'On Hold', and 'Partially Implemented' contain spaces

### CRType Enum
**Union type with 5 exact values:**
```typescript
export type CRType =
  | 'Architecture'
  | 'Feature Enhancement'
  | 'Bug Fix'
  | 'Technical Debt'
  | 'Documentation';
```

**Key behaviors to preserve:**
1. **Exact string values** - Especially 'Feature Enhancement' and 'Technical Debt' with spaces
2. **All 5 values** - Cannot lose any type values

### CRPriority Enum
**Union type with 4 exact values:**
```typescript
export type CRPriority =
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical';
```

**Key behaviors to preserve:**
1. **Title case** - All values are title case
2. **All 4 values** - Cannot lose any priority levels

### ProjectInfo Interface
```typescript
export interface ProjectInfo {
  key: string;           // Required
  name: string;          // Required
  description?: string;  // Optional
  path: string;          // Required
  crCount: number;       // Required, must be integer
  lastAccessed: string;  // Required, must be date string
}
```

## Derived Behaviors (from `src/config/statusConfig.ts`)

### Status Workflow Transitions
The CRStatus enum supports these transitions:
- Proposed → Approved, Rejected
- Approved → In Progress, On Hold, Rejected
- In Progress → Implemented, On Hold, Rejected
- On Hold → Approved, Rejected, In Progress
- Implemented → (terminal)
- Partially Implemented → Implemented, Rejected
- Deprecated → Rejected
- Rejected → (terminal)
- Superseded → (terminal)
- Duplicate → (terminal)

### Status Groupings
The statusConfig.ts defines these groupings that depend on CRStatus:
- **active**: ['Proposed', 'Approved', 'In Progress', 'On Hold', 'Deprecated']
- **completed**: ['Implemented', 'Rejected', 'Superseded', 'Duplicate']
- **review**: ['Proposed']
- **development**: ['In Progress', 'Partially Implemented']
- **blocked**: ['On Hold', 'Rejected', 'Deprecated']
- **final**: ['Implemented', 'Rejected', 'Superseded', 'Duplicate']

### Board Columns
The kanban board uses these status-to-column mappings:
- **Backlog**: ['Proposed']
- **Open**: ['Approved']
- **In Progress**: ['In Progress', 'On Hold']
- **Done**: ['Implemented', 'Partially Implemented', 'Rejected']
- **Deferred** (hidden): ['Rejected', 'Superseded', 'Duplicate']

## Discrepancy with OpenAPI Schema
The `server/openapi/schemas.ts` currently only defines 6 status values:
```typescript
const CRStatusEnum = ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected', 'On Hold'] as const;
```

**Missing values in OpenAPI:**
- 'Superseded'
- 'Deprecated'
- 'Duplicate'
- 'Partially Implemented'

This migration should update the OpenAPI schemas to include all 10 values to match `shared/models/Types.ts`.

## Implementation Requirements for Zod Schemas

### 1. Enum Definitions
Must use `z.enum()` with exact values:

```typescript
export const CRStatusSchema = z.enum([
  'Proposed',
  'Approved',
  'In Progress',
  'Implemented',
  'Rejected',
  'On Hold',
  'Superseded',
  'Deprecated',
  'Duplicate',
  'Partially Implemented'
]);

export const CRTypeSchema = z.enum([
  'Architecture',
  'Feature Enhancement',
  'Bug Fix',
  'Technical Debt',
  'Documentation'
]);

export const CRPrioritySchema = z.enum([
  'Low',
  'Medium',
  'High',
  'Critical'
]);
```

### 2. TypeScript Type Exports
Must export inferred types for backward compatibility:

```typescript
export type CRStatus = z.infer<typeof CRStatusSchema>;
export type CRType = z.infer<typeof CRTypeSchema>;
export type CRPriority = z.infer<typeof CRPrioritySchema>;
```

### 3. ProjectInfo Schema
Must validate all required fields and types:

```typescript
export const ProjectInfoSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  path: z.string(),
  crCount: z.number().int().min(0),
  lastAccessed: z.string() // Consider using z.datetime() for ISO date validation
});
```

### 4. Backward Compatibility
The migration must:
1. Preserve all existing enum values exactly
2. Maintain the same TypeScript types
3. Support all derived behaviors (statusConfig.ts)
4. Update OpenAPI schemas to match

### 5. Migration Strategy
1. Create Zod schemas matching current union types
2. Export inferred types to maintain API compatibility
3. Update OpenAPI schemas to include all values
4. Gradually migrate consumers to use schema validation
5. Remove old union types after migration complete

## Test Coverage

The `schema.test.ts` file provides comprehensive coverage for:
1. All valid enum values acceptance
2. Invalid value rejection
3. Exact string preservation
4. ProjectInfo field validation
5. Status workflow compatibility
6. Status grouping support
7. OpenAPI compatibility

All tests must pass to ensure behavioral preservation.