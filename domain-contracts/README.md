# Domain Contracts - MDT-101 Project Entity Migration

## Overview

This directory contains the behavioral preservation tests for the Project entity migration in MDT-101. The tests document the EXACT current behavior from `shared/models/Project.ts` that must be preserved when migrating to Zod schemas.

## Structure

```
domain-contracts/
├── src/
│   ├── project/
│   │   ├── schema.test.ts    # ✅ Behavioral preservation tests (RED)
│   │   └── schema.ts         # ❌ Zod schemas (TO BE IMPLEMENTED)
│   ├── types/
│   │   └── schema.test.ts    # Existing type tests
│   └── testing/
│       └── project.fixtures.test.ts
├── validate-behavior.md      # Behavior documentation
└── README.md                 # This file
```

## Current Status

### ✅ Complete
- Comprehensive behavioral tests created at `src/project/schema.test.ts`
- Tests document ALL behaviors from `shared/models/Project.ts`:
  - LocalProjectConfig interface shape
  - Project interface (unified model)
  - ProjectConfig legacy interface
  - getTicketsPath() function behavior
  - isLegacyConfig() detection logic
  - migrateLegacyConfig() migration logic
  - validateProjectConfig() validation rules

### ❌ Pending Implementation
- Zod schemas in `src/project/schema.ts`
- Test runner configuration for domain-contracts

## Test Coverage

The tests ensure behavioral preservation for:

1. **Interface Shapes**
   - Required vs optional fields
   - Nested object structures
   - Strategy-specific fields

2. **Function Behaviors**
   - Priority order in `getTicketsPath()`
   - Legacy format detection in `isLegacyConfig()`
   - Migration logic in `migrateLegacyConfig()`
   - Validation rules in `validateProjectConfig()`

3. **Edge Cases**
   - Null/undefined handling
   - Type coercion
   - Default values
   - Backward compatibility

## Next Steps for Implementation

1. Create `src/project/schema.ts` with Zod schemas that:
   - Match the exact interface shapes documented in tests
   - Implement the same validation logic as `validateProjectConfig()`
   - Preserve all function behaviors

2. Configure test runner for domain-contracts directory

3. Run tests to verify they pass (GREEN state)

## Key Requirements

- **Zero Breaking Changes**: All existing behaviors MUST be preserved
- **Type Safety**: Zod schemas must provide compile-time type safety
- **Runtime Validation**: Schemas must validate at runtime like current functions
- **Performance**: No performance regression in validation/migration