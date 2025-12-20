# Tests: MDT-101 Phase 1.1

**Mode**: Feature Implementation
**Source**: MDT-101 CR Phase 1.1 requirements
**Generated**: 2025-12-20
**Scope**: Phase 1.1 only - Enhanced Project Validation with Zod

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Test Directory | `domain-contracts/src/` |
| Test Command | `cd domain-contracts && npm test` |
| Phase 1.1 Filter | `--testPathPattern="(validation|migration|boundaries|phase-1-1)"` |
| Status | 🔴 RED (implementation pending) |

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| P1.1-1 | domain-contracts package structure | phase-1-1-e2e.test.ts | 3 | 🔴 RED |
| P1.1-2 | ProjectSchema with base validation | schema.test.ts | 5 | 🔴 RED |
| P1.1-3 | Enhanced validation with custom rules | validation.test.ts | 8 | 🔴 RED |
| P1.1-4 | Migration support for legacy formats | migration.test.ts | 6 | 🔴 RED |
| P1.1-5 | Runtime validation at MCP boundaries | mcp-validation.test.ts | 9 | 🔴 RED |
| P1.1-6 | Runtime validation at server boundaries | server-validation.test.ts | 8 | 🔴 RED |

## Test Specifications

### Feature: Enhanced Project Validation

**File**: `domain-contracts/src/project/validation.test.ts`
**Covers**: P1.1-3

#### Scenario: code_pattern_validation (P1.1-3)

```gherkin
Given a project configuration object
When the code field is set
Then it must match pattern ^[A-Z][A-Z0-9]{1,4}$
And valid codes: MDT, API1, WEB, Z2
And invalid codes: mdt, api_01, A, ABCDEFG, null, empty string
```

**Test**: `describe('code field validation') > it('accepts valid project codes')`

#### Scenario: path_validation (P1.1-3)

```gherkin
Given a project configuration object
When the path field is set
Then it must be either a relative path (no leading slash) or absolute path
And relative paths cannot start with /
And absolute paths must start with /
And empty string is invalid
```

**Test**: `describe('path field validation') > it('validates path formats')`

#### Scenario: required_fields_validation (P1.1-3)

```gherkin
Given a project configuration object
When validating required fields
Then name, code, and active must be present
And missing required fields should throw ValidationError
```

**Test**: `describe('required fields') > it('rejects missing required fields')`

#### Scenario: cross_field_validation (P1.1-3)

```gherkin
Given a project with both path and legacy format fields
When validating
Then if legacyFormat is true, legacyPath must be present
And if legacyFormat is false, path must be present
And both cannot be null/undefined
```

**Test**: `describe('cross-field validation') > it('ensures path consistency')`

#### Scenario: business_rules_validation (P1.1-3)

```gherkin
Given a project configuration
When applying business rules
Then startNumber must be > 0
And counterFile must have valid filename if present
And document.maxDepth must be > 0 if present
```

**Test**: `describe('business rules') > it('validates startNumber greater than zero')`

### Feature: Legacy Migration Support

**File**: `domain-contracts/src/project/migration.test.ts`
**Covers**: P1.1-4

#### Scenario: legacy_format_detection (P1.1-4)

```gherkin
Given a project object
When checking for legacy format
Then projects with legacyPath field are detected as legacy
And projects with path field are detected as new format
And missing both paths throws error
```

**Test**: `describe('legacy detection') > it('identifies legacy format correctly')`

#### Scenario: migration_transformation (P1.1-4)

```gherkin
Given a legacy project object
When migrating to new format
Then legacyPath is copied to path
And legacyFormat flag is set to true
And all other fields remain unchanged
```

**Test**: `describe('migration transformation') > it('migrates legacy path to new format')`

#### Scenario: post_migration_validation (P1.1-4)

```gherkin
Given a migrated project object
When validating against new schema
Then the migrated object should pass validation
And maintain all original data
```

**Test**: `describe('post-migration validation') > it('validates migrated objects')`

### Feature: MCP Boundary Validation

**File**: `domain-contracts/src/boundaries/mcp-validation.test.ts`
**Covers**: P1.1-5

#### Scenario: list_projects_response_validation (P1.1-5)

```gherkin
Given a list_projects response from MCP server
When validating response
Then response.data must be array of valid ProjectInfo objects
And each ProjectInfo must have: key, name, path, crCount, lastAccessed
And invalid project fields should throw error
```

**Test**: `describe('list_projects validation') > it('validates response data')`

#### Scenario: create_project_request_validation (P1.1-5)

```gherkin
Given a create_project request
When validating request parameters
Then required fields (name, path) must be present
And code must follow pattern if provided
And path must be valid format
```

**Test**: `describe('create_project validation') > it('validates create request')`

#### Scenario: get_cr_response_validation (P1.1-5)

```gherkin
Given a get_cr response
When validating CR data
Then response must contain valid CR fields
And status/type/priority must be from enum values
And dates must be valid ISO strings or null
```

**Test**: `describe('get_cr validation') > it('validates CR response structure')`

### Feature: Server API Boundary Validation

**File**: `domain-contracts/src/boundaries/server-validation.test.ts`
**Covers**: P1.1-6

#### Scenario: post_projects_request_validation (P1.1-6)

```gherkin
Given a POST /api/projects request body
When validating
Then project config must be valid
And required fields checked
And business rules applied
```

**Test**: `describe('POST /api/projects') > it('validates request body')`

#### Scenario: patch_projects_request_validation (P1.1-6)

```gherkin
Given a PATCH /api/projects/:id request
When validating partial update
Then only allowed fields can be updated
And validation rules still apply
And immutable fields are rejected
```

**Test**: `describe('PATCH /api/projects') > it('validates partial updates')`

#### Scenario: ticket_crud_validation (P1.1-6)

```gherkin
Given ticket CRUD operations
When validating ticket data
Then CR schema validation applies
And enum fields validated
And content cannot be empty
```

**Test**: `describe('ticket CRUD') > it('validates ticket data')`

### Feature: Phase 1.1 End-to-End Integration

**File**: `domain-contracts/src/integration/phase-1-1-e2e.test.ts`
**Covers**: P1.1-1 through P1.1-6

#### Scenario: package_structure_verification (P1.1-1)

```gherkin
Given the domain-contracts package
When verifying structure
Then package.json exists with zod dependency
And src/index.ts exports public API
And src/project/ has schema.ts, validation.ts, migration.ts
And file sizes respect limits (≤150 lines for schema.ts)
```

**Test**: `describe('package structure') > it('has correct directory layout')`

#### Scenario: cross_interface_consistency (P1.1-5, P1.1-6)

```gherkin
Given a project object
When passing through MCP and server interfaces
Then validation is consistent across both
And same errors thrown for same data
```

**Test**: `describe('interface consistency') > it('validates consistently across boundaries')`

#### Scenario: round_trip_data_integrity (P1.1-4)

```gherkin
Given a legacy project object
When migrating and validating
Then round-trip preserves all data
And migrated object validates successfully
```

**Test**: `describe('data integrity') > it('preserves data through migration')`

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| Empty project object | ValidationError (missing required) | `validation.test.ts` | P1.1-3 |
| Invalid code format | ValidationError with specific message | `validation.test.ts` | P1.1-3 |
| Mixed path fields | ValidationError (inconsistent state) | `validation.test.ts` | P1.1-3 |
| Malformed legacy object | MigrationError with details | `migration.test.ts` | P1.1-4 |
| MCP response with extra fields | ValidationWarning (extra fields ignored) | `mcp-validation.test.ts` | P1.1-5 |
| Server request with null values | ValidationError (null values rejected) | `server-validation.test.ts` | P1.1-6 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `domain-contracts/src/project/validation.test.ts` | 8 | ~200 | 🔴 RED |
| `domain-contracts/src/project/migration.test.ts` | 6 | ~180 | 🔴 RED |
| `domain-contracts/src/boundaries/mcp-validation.test.ts` | 9 | ~250 | 🔴 RED |
| `domain-contracts/src/boundaries/server-validation.test.ts` | 8 | ~220 | 🔴 RED |
| `domain-contracts/src/integration/phase-1-1-e2e.test.ts` | 3 | ~120 | 🔴 RED |

## Verification

Run Phase 1.1 tests (should all fail):
```bash
cd domain-contracts
npm test -- --testPathPattern="(validation|migration|boundaries|phase-1-1)"
```

Expected: **39 failed, 0 passed**

## Coverage Checklist

- [x] All Phase 1.1 requirements have at least one test
- [x] Enhanced validation rules covered
- [x] Migration support tested
- [x] MCP boundary validation included
- [x] Server boundary validation included
- [x] Integration scenarios covered
- [x] Error scenarios tested
- [x] Edge cases documented
- [ ] Tests are RED (verified manually)

## Implementation Tasks Reference

| Task | Makes GREEN | Files |
|------|-------------|-------|
| Create package structure | All tests | package.json, src/ |
| Implement ProjectSchema | validation.test.ts (P1.1-3) | project/schema.ts |
| Add validation module | validation.test.ts (P1.1-3) | project/validation.ts |
| Implement migration | migration.test.ts (P1.1-4) | project/migration.ts |
| Update MCP tools | mcp-validation.test.ts (P1.1-5) | mcp-server/ |
| Update server APIs | server-validation.test.ts (P1.1-6) | server/ |
| Integration testing | phase-1-1-e2e.test.ts (P1.1-1) | All |

After each task: `npm test -- --testPathPattern="(validation|migration|boundaries|phase-1-1)"` should show fewer failures.

---

## Success Criteria

Phase 1.1 is complete when:

1. **All tests are GREEN**:
   ```bash
   cd domain-contracts
   npm test -- --testPathPattern="(validation|migration|boundaries|phase-1-1)"
   # Expected: 39 passed, 0 failed
   ```

2. **Package structure matches specification**:
   - domain-contracts/ exists with proper layout
   - File sizes within limits
   - Zero dependencies except zod

3. **Validation is active at boundaries**:
   - MCP tools validate responses
   - Server APIs validate requests/responses
   - Migration handles legacy formats

4. **Performance requirements met**:
   - Validation latency < 50ms per object
   - No memory leaks in validation
   - Efficient error messages