# MDT-101 Preservation Tests Documentation (Phase 1)

**Mode**: Refactoring (Preserving Current Behavior)
**Purpose**: Document all preservation tests that lock current implementation behavior
**Generated**: 2025-12-19
**Status**: Tests are GREEN (schemas implemented)

## Overview

This documentation maps all preservation tests created for MDT-101 domain-contracts migration. These tests are designed to **fail initially** (RED) and will only pass when the Zod schema implementations exactly match the current TypeScript type definitions and behavior.

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Test Directory | `domain-contracts/src/**/` |
| Pattern | `*.test.ts` |
| Test Command | `cd domain-contracts && npm test` |
| Test Environment | Node.js |

### Test Status Legend
- 🔴 **RED** - Test fails (expected before implementation)
- 🟢 **GREEN** - Test passes (expected after implementation)
- ⚪ **TODO** - Test not yet created

## 1. Type Enums Preservation Tests

**File**: `domain-contracts/src/types/schema.test.ts`
**Purpose**: Lock current enum values from `shared/models/Types.ts`
**Status**: 🟢 GREEN (all 4 test groups passing)

### 1.1 CRStatus Enum Tests
- **Valid Values**: Tests acceptance of all 10 current status values
  - `Proposed`, `Approved`, `In Progress`, `Implemented`
  - `Rejected`, `On Hold`, `Superseded`, `Deprecated`
  - `Duplicate`, `Partially Implemented`
- **Invalid Values**: Tests rejection of malformed values
  - `invalid`, `IN_PROGRESS`, `In-Progress`, 123, null, undefined

### 1.2 CRType Enum Tests
- **Valid Values**: Tests acceptance of all 5 current type values
  - `Architecture`, `Feature Enhancement`, `Bug Fix`
  - `Technical Debt`, `Documentation`
- **Invalid Values**: Tests rejection of alternatives
  - `Feature`, `Bug`, `Tech Debt`, `feature enhancement`, 123, null

### 1.3 CRPriority Enum Tests
- **Valid Values**: Tests acceptance of all 4 priority levels
  - `Low`, `Medium`, `High`, `Critical`
- **Invalid Values**: Tests rejection of variations
  - `low`, `URGENT`, `Normal`, 123, null, undefined

### 1.4 ProjectInfo Interface Tests
- **Required Fields**: `key`, `name`, `path`, `crCount`, `lastAccessed`
- **Optional Fields**: `description`
- **Type Validation**: Strict type checking for each field
- **Date Handling**: Accepts ISO date strings, rejects invalid formats

## 2. Project Entity Preservation Tests

**File**: `domain-contracts/src/project/schema.test.ts`
**Purpose**: Lock current Project interface shape from `shared/models/Project.ts`
**Status**: 🟢 GREEN (all 6 test groups passing)

### 2.1 Required Fields Validation
- Tests rejection when missing any required field:
  - `id`: Project identifier
  - `project.name`: Human-readable name
  - `metadata`: Registration and access metadata

### 2.2 Project Configuration Object
- **Required**: `name`, `path`, `configFile`, `active`, `description`
- **Optional**: `id`, `code`, `counterFile`, `startNumber`, `repository`, `ticketsPath`
- **Validation**: Path strings must be absolute, boolean flags must be boolean

### 2.3 Document Configuration
- **Optional object**: `document.paths`, `document.excludeFolders`, `document.maxDepth`
- **Type Safety**: Paths array of strings, excludeFolders array of strings, maxDepth number

### 2.4 Tickets Configuration
- **Optional object**: `tickets.codePattern`
- **Validation**: Code pattern string with placeholders

### 2.5 Metadata Fields
- **Required**: `dateRegistered`, `lastAccessed`, `version`
- **Optional**: `globalOnly` flag for registry-only projects

### 2.6 Runtime Fields
- **Optional**: `autoDiscovered`, `configPath`, `registryFile`
- **Purpose**: Fields populated at runtime

## 3. Ticket/CR Entity Preservation Tests

**File**: `domain-contracts/src/ticket/schema.test.ts`
**Purpose**: Lock current Ticket/CR interface shape from `shared/models/Ticket.ts`
**Status**: 🟢 GREEN (all 5 test groups passing)

### 3.1 Required Fields Validation
- Tests rejection when missing:
  - `code`: Ticket identifier (e.g., "MDT-001")
  - `title`: Human-readable title
  - `content`: Markdown content (cannot be empty)

### 3.2 Enum Fields Validation
- **Status**: All 10 valid status values from CRStatus
- **Type**: All 5 valid type values from CRType
- **Priority**: All 4 valid priority values from CRPriority
- **Rejection**: Invalid enum values with proper error messages

### 3.3 Date Fields Handling
- **Accepts**: Date objects, ISO date strings, null values
- **Fields**: `dateCreated`, `lastModified`
- **Rejects**: Invalid date strings, non-date objects

### 3.4 Optional Fields
- **Metadata**: `phaseEpic`, `assignee`
- **Implementation**: `implementationDate`, `implementationNotes`
- **Behavior**: All optional, validation only if present

### 3.5 Relationship Arrays
- **Arrays**: `relatedTickets`, `dependsOn`, `blocks`
- **Normalization**:
  - Accepts string arrays
  - Accepts comma-separated strings (backward compatibility)
  - Filters out empty/null values
  - Maintains order of valid values

## 4. Test Fixtures Validation

**File**: `domain-contracts/src/testing/project.fixtures.test.ts`
**Purpose**: Verify test builders create valid data that matches schemas
**Status**: 🟢 GREEN (all 5 test scenarios passing)

### 4.1 Fixture Methods
- `minimal()`: Creates valid project with required fields only
- `complete()`: Creates project with all optional fields
- `custom(overrides)`: Creates project with custom values
- `array(count)`: Creates array of unique projects

### 4.2 Validation Guarantees
- All fixture-generated data must pass schema validation
- Custom overrides must merge correctly with defaults
- Generated arrays must contain unique items

## 5. Behavioral Analysis Summary

### 5.1 What Behavior Is Being Preserved

#### Project Entity
1. **Shape Preservation**: Exact field structure from `shared/models/Project.ts`
2. **Validation Rules**: Required vs optional field distinctions
3. **Type Safety**: String, boolean, number, array types strictly enforced
4. **Path Handling**: Absolute paths required, relative paths rejected
5. **Configuration Structure**: Nested objects maintain current structure

#### Ticket/CR Entity
1. **Enum Lock**: All enum values exactly match current implementation
2. **Content Validation**: Non-empty markdown content requirement
3. **Date Flexibility**: Support for multiple date representations
4. **Relationship Normalization**: Backward compatibility with string formats
5. **Field Mapping**: Alternative field names (`key` → `code`, `path` → `filePath`)

#### Type Enums
1. **Value Lock**: No new enum values allowed
2. **Case Sensitivity**: Exact string matching required
3. **Type Safety**: No implicit conversions from other types

### 5.2 Migration Relationship

These preservation tests ensure that:

1. **No Behavioral Changes**: After migration, all code using these types works identically
2. **Runtime Validation**: Zod schemas reject exactly what TypeScript types reject
3. **API Compatibility**: MCP tools and services receive same validation behavior
4. **Data Integrity**: Existing data files continue to validate successfully

## 6. Test Execution Guide

### 6.1 Running Tests

```bash
# Run all preservation tests
cd domain-contracts && npm test

# Run specific test file
npm test -- types/schema.test.ts

# Run with verbose output
npm test -- --verbose

# Run with coverage
npm test -- --coverage
```

### 6.2 Current Results (After Implementation)

All tests are PASSING:

1. **✅ Schema files exist**: All Zod schemas implemented
2. **✅ Type validation matches**: Tests pass type checking
3. **✅ Validation behavior correct**: All tests validate expected behavior

### 6.3 Success Criteria (Achieved)

All tests should PASS with:

1. **Zero compilation errors**
2. **All validation tests passing**
3. **Type safety maintained**
4. **Backward compatibility preserved**

## 7. Implementation Checklist

### 7.1 Schema Implementation Tasks

- [ ] `domain-contracts/src/types/schema.ts`
  - [ ] CRStatusSchema with exact enum values
  - [ ] CRTypeSchema with exact enum values
  - [ ] CRPrioritySchema with exact enum values
  - [ ] ProjectInfoSchema with all fields

- [ ] `domain-contracts/src/project/schema.ts`
  - [ ] ProjectSchema with nested validation
  - [ ] All required/optional field definitions
  - [ ] Type strictness for each field

- [ ] `domain-contracts/src/ticket/schema.ts`
  - [ ] TicketSchema with full field validation
  - [ ] Enum references from types schema
  - [ ] Relationship array normalization

- [ ] `domain-contracts/src/testing/project.fixtures.ts`
  - [ ] ProjectFixture class with all methods
  - [ ] Default data matching schema requirements
  - [ ] Unique ID generation

### 7.2 Verification Steps

After implementing each schema file:

1. Run tests: `npm test`
2. Verify specific test file passes
3. Check that TypeScript compiles without errors
4. Run integration tests with existing services
5. Validate MCP tools still work with schemas

## 8. Risk Mitigation

### 8.1 Identified Risks

1. **Enum Drift**: Adding new enum values breaks existing tests
   - **Mitigation**: Tests explicitly lock current values

2. **Type Mismatch**: Schema types diverging from TypeScript types
   - **Mitigation**: Preservation tests enforce exact matching

3. **Validation Differences**: Runtime validation vs compile-time checking
   - **Mitegration**: Tests ensure identical rejection behavior

4. **Backward Compatibility**: Changes breaking existing data
   - **Mitigation**: All tests use current data shapes

### 8.2 Rollback Plan

If implementation causes issues:

1. Tests provide clear specification of required behavior
2. Can revert to TypeScript types temporarily
3. Preservation tests document exact requirements
4. Implementation can be fixed incrementally

## 9. Test Metrics Summary

| Entity | Test Files | Test Scenarios | Lines of Code | Status |
|--------|------------|----------------|---------------|--------|
| Types Enums | 1 | 4 groups | 338 lines | 🟢 GREEN |
| Project | 1 | 6 groups | 671 lines | 🟢 GREEN |
| Ticket/CR | 1 | 5 groups | 449 lines | 🟢 GREEN |
| Fixtures | 1 | 5 scenarios | 56 lines | 🟢 GREEN |
| Integration | 1 | 4 tests | 532 lines | 🟢 GREEN |
| **TOTAL** | **5** | **24 groups/scenarios** | **2,046 lines** | **🟢 ALL GREEN** |

## 10. Conclusion

These preservation tests serve as the authoritative specification for MDT-101 domain-contracts implementation. They ensure:

- **Zero Breaking Changes**: All existing code continues to work
- **Type Safety**: Runtime validation matches compile-time checking
- **Behavior Preservation**: Exact same validation rules and error messages
- **Migration Safety**: Can implement incrementally with clear feedback

The tests will transition from RED to GREEN as each schema component is correctly implemented, providing clear progress indicators for the migration effort.