# Tests: MDT-077 (Focused Behavioral Tests)

**Mode**: Feature (Behavioral Tests Only)
**Source**: CR analysis and user requirements
**Generated**: 2025-12-16
**Focus**: Project creation and configuration validation

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest + Node.js child_process |
| Test directory | `shared/tools/__tests__/project-management` |
| Test command | `npm run test:project-cli` |
| CR test filter | `--testPathPattern=project-management` |

## Simplified Requirement → Test Mapping

| Behavior | Description | Test File | Scenarios | Status |
|----------|-------------|-----------|-----------|--------|
| B1 | Create project with CLI | `project-creation.test.ts` | 3 | 🔴 RED |
| B2 | Validate configuration | `configuration-validation.test.ts` | 3 | 🔴 RED |

## Test Specifications

### Feature: Project Creation

**File**: `shared/tools/__tests__/project-management/project-creation.test.ts`
**Covers**: B1

#### Scenario: create_project_with_required_fields (B1.1)

```gherkin
Given required flags (name, code, path) are provided
When project:create command is executed
Then it should create a local .mdt-config.toml file
And the file should contain valid TOML format
And the configuration should have required fields populated
```

**Test**: `describe('project:create') > test('should create project with required fields')`

#### Scenario: create_project_fails_with_invalid_code (B1.2)

```gherkin
Given an invalid project code is provided
When project:create command is executed
Then it should reject with validation error
And the exit code should indicate failure
And no configuration files should be created
```

**Test**: `describe('project:create') > test('should reject invalid project codes')`

#### Scenario: create_project_fails_with_nonexistent_path (B1.3)

```gherkin
Given a non-existent path is provided
When project:create command is executed
Then it should reject with path validation error
And the error message should indicate path does not exist
And no configuration files should be created
```

**Test**: `describe('project:create') > test('should reject non-existent paths')`

---

### Feature: Configuration Validation

**File**: `shared/tools/__tests__/project-management/configuration-validation.test.ts`
**Covers**: B2

#### Scenario: validate_generated_configuration_schema (B2.1)

```gherkin
Given a .mdt-config.toml file is created
When the configuration is validated
Then all required fields should be present
And field types should match expected formats
```

**Test**: `describe('configuration validation') > test('should validate generated configuration schema')`

#### Scenario: validate_project_code_format (B2.2)

```gherkin
Given a project code is provided
When the code is validated
Then it should be 2-5 uppercase letters
And it should not contain numbers or special characters
And validation should enforce format requirements
```

**Test**: `describe('project code validation') > test('should enforce 2-5 uppercase letter format')`

#### Scenario: validate_configuration_consistency (B2.3)

```gherkin
Given configuration files exist
When project:list command is executed
Then the output should reflect configuration values
And project codes should match configuration
And project names should match configuration
```

**Test**: `describe('configuration consistency') > test('should ensure CLI output matches configuration')`

---

## Edge Cases

| Scenario | Expected Behavior | Test | Behavior |
|----------|-------------------|------|----------|
| Empty project name | ValidationError with descriptive message | `project-creation.test.ts` | B1.1 |
| Single character code | ValidationError with format requirements | `configuration-validation.test.ts` | B2.2 |
| Six character code | ValidationError with format requirements | `configuration-validation.test.ts` | B2.2 |
| Code with numbers | ValidationError with format requirements | `configuration-validation.test.ts` | B2.2 |
| Relative path provided | Path resolved from current directory | `project-creation.test.ts` | B1.3 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `shared/tools/__tests__/project-management/project-creation.test.ts` | 3 | ~100 | 🔴 RED |
| `shared/tools/__tests__/project-management/configuration-validation.test.ts` | 3 | ~90 | 🔴 RED |
| `shared/tools/__tests__/project-management/helpers/test-utils.ts` | Helper utilities | ~50 | 🔴 RED |

## Verification

Run tests (should all fail):

```bash
# From project root
npm run test:project-cli

# Expected output:
# FAIL: All 6 tests failing
# Status: 🔴 RED (implementation pending)
```

## Coverage Checklist

- [x] Project creation with valid inputs
- [x] Project creation rejection for invalid codes
- [x] Project creation rejection for invalid paths
- [x] Configuration schema validation
- [x] Project code format validation
- [x] Configuration consistency verification
- [ ] Tests are RED (verify manually by running)

## Implementation Notes

**No Backward Compatibility**:
- Tests do not verify handling of legacy fields
- Implementation should use clean schema without migration support
- All configurations follow the new specification only

---

## For Implementation

Each implementation task should reference which tests it will make GREEN:

| Task | Makes GREEN |
|------|-------------|
| Implement project:create CLI command | `project-creation.test.ts` (B1.1-B1.3) |
| Add ProjectValidator for configuration | `configuration-validation.test.ts` (B2.1-B2.3) |

After implementation: `npm run test:project-cli` should show all GREEN.

## Test Data Management

### Test Fixtures

```typescript
// Test data for reuse
export const TEST_PROJECTS = {
  valid: {
    name: 'Test Project',
    code: 'TEST',
    path: '/tmp/mdt-test-project'
  },
  invalidCodes: {
    tooShort: 'T',
    tooLong: 'TEST123',
    withNumbers: 'T3ST',
    withSpecial: 'TEST-123'
  },
  invalidPaths: {
    nonExistent: '/tmp/does-not-exist-12345',
    permissionDenied: '/root/forbidden'
  }
};
```

### Cleanup Utilities

```typescript
// Run after each test
export const cleanupTestProject = async (projectPath: string) => {
  if (await pathExists(projectPath)) {
    await remove(projectPath);
  }
};

export const cleanupGlobalRegistry = async () => {
  const globalRegistryPath = getGlobalRegistryPath();
  if (await pathExists(globalRegistryPath)) {
    // Remove test entries only
    const config = await readToml(globalRegistryPath);
    // ... cleanup logic
  }
};
```

---

*Focused behavioral tests generated for MDT-077 by /mdt:tests*