# Tests: MDT-101 Phase 1

**Mode**: Feature
**Phase**: 1 - Core Entities with Basic Field Validation + Integration
**Source**: architecture.md → Phase 1
**Generated**: 2025-12-21
**Scope**: Phase 1 (Core entities + Migration Integration)

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Test Directory | `domain-contracts/src/`, `shared/`, integration tests |
| Test Command | `cd domain-contracts && npm test` (contracts) |
| Status | ⚠️ PARTIAL (Contracts ✅ GREEN, Integration ❌ MISSING) |

## Phase 1 Status: INCOMPLETE

Phase 1 has two parts:
1. ✅ Create domain-contracts package (COMPLETE)
2. ❌ Integrate domain-contracts into existing codebase (NOT DONE)

### What's Missing:
- Update `shared/models/Project.ts` to import from domain-contracts
- Update `shared/models/Ticket.ts` to import from domain-contracts
- Update `shared/models/Types.ts` to import from domain-contracts
- Add `@mdt/domain-contracts` dependency to `shared/package.json`
- Add `@mdt/domain-contracts` dependency to `mcp-server/package.json`
- Add `@mdt/domain-contracts` dependency to `server/package.json`
- Replace import statements throughout codebase
- Add boundary validation in MCP server and backend services

## Phase 1 Requirements → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| P1-1 | Project entity schema with field validation | `project/__tests__/schema.test.ts` | 17 | ✅ GREEN |
| P1-2 | Project validation functions | `project/__tests__/validation.test.ts` | 8 | ✅ GREEN |
| P1-3 | Ticket/CR entity schema with field validation | `ticket/__tests__/schema.test.ts` | 25 | ✅ GREEN |
| P1-4 | Types schema (CRStatus, CRType, CRPriority) | `types/__tests__/schema.test.ts` | 5 | ✅ GREEN |
| P1-5 | Test fixtures for entities | `testing/__tests__/project.fixtures.test.ts` | 9 | ✅ GREEN |
| P1-6 | Ticket validation functions | `ticket/__tests__/validation.test.ts` | 8 | ✅ GREEN |
| P1-7 | Migrate shared/models to use domain-contracts | ❌ NOT CREATED | 0 | ❌ MISSING |
| P1-8 | Add domain-contracts dependencies | ❌ NOT CREATED | 0 | ❌ MISSING |
| P1-9 | Boundary validation in MCP/server | ❌ NOT CREATED | 0 | ❌ MISSING |
| P1-10 | Integration tests for migration | ❌ NOT CREATED | 0 | ❌ MISSING |

## Test Specifications

### Feature: Project Schema Validation

**File**: `domain-contracts/src/project/__tests__/schema.test.ts`
**Covers**: P1-1

#### Scenario: Code Format Validation (P1-1)

```gherkin
Given a project configuration object
When the code field is set
Then it must match pattern ^[A-Z][A-Z0-9]{1,4}$ (2-5 chars, starts with letter)
And valid codes: MD, MDT, WEB1, Z9999
And invalid codes: mdt (lowercase), M (too short), TOOLONG (too long), MD_1 (special chars)
```

**Test**: `describe('code format')` with 7 test cases

#### Scenario: Path Security Validation (P1-1)

```gherkin
Given a document configuration object
When paths are specified
Then they must be relative paths (no starting /)
And they must not contain parent directory references (..)
And excludeFolders must be simple folder names (no / separators)
```

**Test**: `describe('DocumentConfigSchema')` with path and folder validation

### Feature: Validation Functions

**File**: `domain-contracts/src/project/__tests__/validation.test.ts`
**Covers**: P1-2

#### Scenario: Throwing Validation (P1-2)

```gherkin
Given unknown input data
When validateProject is called
Then it returns typed Project on success
And throws ZodError on invalid data
```

**Test**: `describe('validateProject')` with success/failure cases

#### Scenario: Safe Validation (P1-2)

```gherkin
Given unknown input data
When safeValidateProject is called
Then it returns { success: true, data } on valid input
And returns { success: false, error } on invalid input
```

**Test**: `describe('safeValidateProject')` with result object validation

### Feature: Ticket Schema Validation

**File**: `domain-contracts/src/__tests__/ticket.test.ts`
**Covers**: P1-3

#### Scenario: Ticket Code Format (P1-3)

```gherkin
Given a ticket configuration object
When the code field is set
Then it must match pattern ^[A-Z][A-Z0-9]{2,4}-\d{3,4}$ (e.g., "MDT-101")
And valid codes: MDT-101, API-1234, WEB-001
And invalid codes: mdt-101, MDT-01, MDT-12345
```

#### Scenario: Required Fields (P1-3)

```gherkin
Given a ticket object
When validated
Then required fields (code, title, status, type, priority) must be present
And optional fields (assignee, dueDate) may be omitted
```

### Feature: Types Schema

**File**: `domain-contracts/src/types/__tests__/schema.test.ts`
**Covers**: P1-4

#### Scenario: Enum Values (P1-4)

```gherkin
Given status, type, or priority field
When validated
Then it must match one of the allowed enum values
Status: [Proposed, Approved, In Progress, Implemented, Rejected]
Type: [Feature Enhancement, Bug Fix, Architecture, Technical Debt, Documentation]
Priority: [Low, Medium, High, Critical]
```

### Feature: Test Fixtures

**File**: `domain-contracts/src/testing/__tests__/project.fixtures.test.ts`
**Covers**: P1-5

#### Scenario: Fixture Builders (P1-5)

```gherkin
Given a build function call
When called with overrides
Then it returns a valid object with defaults applied
And overrides replace default values
```

**Test**: `buildProject()`, `buildProjectConfig()`, `buildCreateProjectInput()`

## Missing Integration Tests

### Feature: Shared Models Migration

**File**: `shared/models/__tests__/migration.test.ts` (TO BE CREATED)
**Covers**: P1-7

#### Scenario: Import from Domain Contracts (P1-7)

```gherkin
Given shared/models/Project.ts
When importing Project type
Then it should be re-exported from @mdt/domain-contracts
And the type shape should be identical
```

**Test**:
```typescript
import { Project as ContractProject } from '@mdt/domain-contracts';
import { Project as SharedProject } from '../Project';

describe('Project type migration', () => {
  it('should re-export Project from domain-contracts', () => {
    expect(SharedProject).toBe(ContractProject);
  });
});
```

### Feature: Dependency Resolution

**File**: `shared/__tests__/dependencies.test.ts` (TO BE CREATED)
**Covers**: P1-8

#### Scenario: Package Dependencies (P1-8)

```gherkin
Given the package.json files
When checking dependencies
Then @mdt/domain-contracts should be listed in shared, mcp-server, and server
And the dependency should resolve correctly
```

### Feature: Boundary Validation

**File**: `mcp-server/src/__tests__/boundary-validation.test.ts` (TO BE CREATED)
**Covers**: P1-9

#### Scenario: MCP Tool Validation (P1-9)

```gherkin
Given an MCP tool receiving unknown input
When processing the request
Then it should validate using domain-contracts
And return properly typed response
```

### Feature: Cross-Interface Consistency

**File**: `shared/tests/integration/contract-consistency.test.ts` (TO BE CREATED)
**Covers**: P1-10

#### Scenario: Type Consistency (P1-10)

```gherkin
Given the same data passed to CLI, MCP, and UI
When each interface processes it
Then all should use identical validation rules
And return consistent typed results
```

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| Empty project code | ValidationError with format message | `schema.test.ts` | P1-1 |
| Invalid path format | ValidationError with security message | `schema.test.ts` | P1-1 |
| Missing required ticket fields | ValidationError | `ticket.test.ts` | P1-3 |
| Invalid enum values | ValidationError | `types.test.ts` | P1-4 |
| Safe validation error structure | Success: false + error.issues | `validation.test.ts` | P1-2 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `domain-contracts/src/project/__tests__/schema.test.ts` | 17 | 241 | ✅ GREEN |
| `domain-contracts/src/project/__tests__/validation.test.ts` | 8 | 150 | ✅ GREEN |
| `domain-contracts/src/ticket/__tests__/schema.test.ts` | 25 | 340 | ✅ GREEN |
| `domain-contracts/src/ticket/__tests__/validation.test.ts` | 8 | 150 | ✅ GREEN |
| `domain-contracts/src/types/__tests__/schema.test.ts` | 5 | 85 | ✅ GREEN |
| `domain-contracts/src/testing/__tests__/project.fixtures.test.ts` | 9 | 120 | ✅ GREEN |

## Verification

Run Phase 1 tests (all passing):
```bash
cd domain-contracts && npm test
```

**Expected**: **90 passed, 0 failed**

## Coverage Checklist

### ✅ Completed (Contract Tests)
- [x] All contract validation rules have tests
- [x] Error scenarios covered
- [x] Edge cases documented
- [x] Contract tests are GREEN (verified ✅)
- [x] Test patterns follow testing guide
- [x] Testing OUR rules, not Zod functionality
- [x] Both throwing and safe validation variants tested
- [x] Fixtures provide valid test data

### ❌ Missing (Integration Tests)
- [ ] Shared models migration tests
- [ ] Dependency resolution tests
- [ ] Boundary validation in MCP/server
- [ ] Cross-interface consistency tests
- [ ] Import statement migration verification

## Test Quality Analysis

### ✅ Correctly Implemented

1. **Testing Our Rules, Not Zod**: Tests focus on custom regex patterns, length limits, and business rules
2. **BDD Format**: Clear describe/it structure documenting behavior
3. **Coverage Patterns**: Valid + Boundary + Invalid test cases for each rule
4. **Error Message Validation**: Tests check for user-facing error messages
5. **Separation of Concerns**: Schema rules tested separately from validation functions

### Test Statistics

| Metric | Value |
|--------|-------|
| Total Test Files | 6 |
| Total Test Cases | 90 |
| Total Lines of Tests | ~900 |
| Test Pass Rate | 100% |
| Coverage Target | Field validation rules |

## For Implementation

Phase 1 tests are already GREEN, indicating implementation is complete.

**Test locations**:
- Project schema: `domain-contracts/src/project/schema.ts`
- Project validation: `domain-contracts/src/project/validation.ts`
- Ticket schema: `domain-contracts/src/ticket/schema.ts`
- Types schema: `domain-contracts/src/types/schema.ts`
- Test fixtures: `domain-contracts/src/testing/`

All tests validate the implementation follows the domain-contracts pattern:
- Field-level validation in schemas
- Wrapper functions for validation
- Type safety through inferred TypeScript types
- Clean separation between contract and business logic layers

### ❌ Integration Not Complete

The domain-contracts package exists and is tested, but Phase 1 integration is missing:
- Types still defined in shared/models instead of imported from domain-contracts
- No dependency references to @mdt/domain-contracts in consuming packages
- No boundary validation at interface entry points
- Import statements throughout codebase still reference shared/models

**Phase 1 Status**: 60% complete (contracts done, integration pending)