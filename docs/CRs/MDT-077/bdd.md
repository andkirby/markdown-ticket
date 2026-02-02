# BDD Acceptance Tests: MDT-077

**Mode**: Normal
**Source**: requirements.md
**Generated**: 2026-02-02
**Status**: 🔴 RED (implementation pending)

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest (CLI integration tests) |
| Directory | `shared/tools/__tests__/project-management/` |
| Command | `npm run test:project-cli` |
| Filter | `--testPathPattern=project-management` |

## User Journeys

### Journey 1: Project Lifecycle Management

**User Goal**: Create, list, view, update, and delete projects through CLI
**Entry Point**: `npm run project` commands

```gherkin
Feature: Project Lifecycle Management
  As a developer
  I want to manage projects through CLI commands
  So that I can set up and maintain my markdown-ticket projects
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| create_project_with_valid_parameters | Happy path | BR-1.1 | 🔴 |
| create_project_with_lowercase_code | Variation | BR-1.1 | 🔴 |
| create_project_with_auto_generated_code | Happy path | BR-1.1 | 🔴 |
| list_all_projects | Happy path | BR-1.2 | 🔴 |
| get_project_details_by_code | Happy path | BR-1.3 | 🔴 |
| get_project_details_by_path | Happy path | BR-1.3 | 🔴 |
| update_project_name | Happy path | BR-1.4 | 🔴 |
| delete_project_with_confirmation | Happy path | BR-1.5 | 🔴 |
| enable_project | Happy path | BR-1.6 | 🔴 |
| disable_project | Happy path | BR-1.7 | 🔴 |
| create_project_invalid_code_format | Error | BR-2.1 | 🔴 |
| create_project_empty_name | Error | BR-2.6 | 🔴 |
| create_project_nonexistent_path | Error | BR-2.7 | 🔴 |
| project_not_found_error | Error | BR-5.3 | 🔴 |

### Journey 2: Configuration Deployment Strategies

**User Goal**: Choose where project configuration is stored based on deployment needs
**Entry Point**: `npm run project:create` with flags

```gherkin
Feature: Configuration Deployment Strategies
  As a system administrator
  I want to choose between different configuration storage strategies
  So that I can deploy according to my infrastructure needs
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| create_project_default_mode | Happy path | BR-3.1 | 🔴 |
| create_project_global_only_mode | Happy path | BR-3.2 | 🔴 |
| create_project_auto_discovery_mode | Happy path | BR-3.3 | 🔴 |
| auto_discover_projects | Happy path | BR-3.4 | 🔴 |
| read_project_default_mode_merge | Happy path | BR-3.5 | 🔴 |

### Journey 3: Cross-Interface Consistency

**User Goal**: Ensure project operations work consistently across CLI, Web UI, and MCP
**Entry Point**: CLI → verify in Web UI/MCP

```gherkin
Feature: Cross-Interface Consistency
  As a developer
  I want projects created via CLI to be visible in Web UI and MCP
  So that I have a consistent experience across all interfaces
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| cli_created_project_visible_in_webui | Happy path | BR-4.1 | 🔴 |
| cli_updated_project_visible_in_mcp | Happy path | BR-4.2 | 🔴 |
| identical_validation_errors_across_interfaces | Error | BR-4.4 | 🔴 |
| identical_crud_results_across_interfaces | Happy path | BR-4.5 | 🔴 |

### Journey 4: Error Handling and User Feedback

**User Goal**: Receive clear error messages when operations fail
**Entry Point**: All CLI commands with invalid inputs

```gherkin
Feature: Error Handling and User Feedback
  As a user
  I want clear error messages when operations fail
  So that I can quickly fix issues without guessing
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| validation_error_shows_field_and_rule | Error | BR-5.1 | 🔴 |
| project_not_found_suggests_alternatives | Error | BR-5.3 | 🔴 |
| filesystem_error_shows_details | Error | BR-5.4 | 🔴 |
| tilde_expansion_resolves_to_home | Happy path | BR-5.5 | 🔴 |

### Journey 5: Concurrent Operation Safety

**User Goal**: Ensure concurrent CLI operations don't corrupt data
**Entry Point**: Multiple simultaneous CLI commands

```gherkin
Feature: Concurrent Operation Safety
  As a system
  I want to handle concurrent operations safely
  So that project data remains consistent
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| prevent_concurrent_modifications | Safety | BR-6.1 | 🔴 |
| preserve_state_on_filesystem_failure | Safety | BR-6.2 | 🔴 |
| detect_inconsistent_configurations | Safety | BR-6.3 | 🔴 |
| no_partial_files_on_interruption | Safety | BR-6.4 | 🔴 |

---

## Scenario Specifications

### Feature: Project Lifecycle Management

**File**: `shared/tools/__tests__/project-management/project-lifecycle.test.ts`
**Covers**: BR-1, BR-2, BR-5

#### Scenario: create_project_with_valid_parameters

```gherkin
Given I have a valid project name "Test Project"
And I have a valid project path "/tmp/test-project"
And I have a valid project code "TEST"
When I run `project create --name "Test Project" --path /tmp/test-project --code TEST`
Then the project should be created successfully
And the project code should be "TEST"
And the project name should be "Test Project"
And the project should be active
```

**Test**: `describe('Project Lifecycle') > it('should create project with valid parameters')`
**Requirement**: BR-1.1

#### Scenario: create_project_with_lowercase_code

```gherkin
Given I have a valid project name "Test Project"
And I have a valid project path "/tmp/test-project"
And I provide a lowercase project code "test"
When I run `project create --name "Test Project" --path /tmp/test-project --code test`
Then the project should be created successfully
And the project code should be converted to uppercase "TEST"
```

**Test**: `describe('Project Lifecycle') > it('should auto-uppercase project code')`
**Requirement**: BR-1.1

#### Scenario: list_all_projects

```gherkin
Given I have created multiple projects
When I run `project list`
Then I should see all registered projects
And each project should show: active status, name, code, and path
```

**Test**: `describe('Project Lifecycle') > it('should list all projects with details')`
**Requirement**: BR-1.2

#### Scenario: create_project_invalid_code_format

```gherkin
Given I have a valid project name "Test Project"
And I have a valid project path "/tmp/test-project"
And I provide an invalid project code "INVALIDCODE" (more than 5 letters)
When I run `project create --name "Test Project" --path /tmp/test-project --code INVALIDCODE`
Then the command should fail with a validation error
And the error message should indicate the code format requirement
```

**Test**: `describe('Project Validation') > it('should reject invalid code format')`
**Requirement**: BR-2.1

### Feature: Configuration Deployment Strategies

**File**: `shared/tools/__tests__/project-management/configuration-strategies.test.ts`
**Covers**: BR-3

#### Scenario: create_project_default_mode

```gherkin
Given I have a valid project name "Test Project"
And I have a valid project path "/tmp/test-project"
When I run `project create --name "Test Project" --path /tmp/test-project` (no flags)
Then minimal discovery data should be stored in global registry
And complete operational details should be stored in project-local configuration
```

**Test**: `describe('Configuration Strategies') > it('should use default mode when no flags specified')`
**Requirement**: BR-3.1

#### Scenario: create_project_global_only_mode

```gherkin
Given I have a valid project name "Test Project"
And I have a valid project path "/tmp/test-project"
When I run `project create --name "Test Project" --path /tmp/test-project --global-only`
Then complete project definition should be stored in global registry
And no project-local configuration file should be created
```

**Test**: `describe('Configuration Strategies') > it('should store complete definition in global registry')`
**Requirement**: BR-3.2

#### Scenario: create_project_auto_discovery_mode

```gherkin
Given I have a valid project name "Test Project"
And I have a valid project path within auto-discovery search paths
When I run `project create --name "Test Project" --path /discovery-path/test-project`
Then only project-local configuration should be created
And no global registry entry should be created
```

**Test**: `describe('Configuration Strategies') > it('should create only local config in auto-discovery paths')`
**Requirement**: BR-3.3

### Feature: Cross-Interface Consistency

**File**: `shared/tools/__tests__/project-management/cross-interface-consistency.test.ts`
**Covers**: BR-4

#### Scenario: cli_created_project_visible_in_webui

```gherkin
Given I have created a project via CLI with code "TEST"
When I query projects through the Web UI API
Then the project should be visible
And the project details should match the CLI-created project
```

**Test**: `describe('Cross-Interface Consistency') > it('should show CLI-created project in Web UI')`
**Requirement**: BR-4.1

#### Scenario: identical_validation_errors_across_interfaces

```gherkin
Given I have invalid project data
When I attempt to create the project via CLI
And I attempt to create the same project via Web UI
And I attempt to create the same project via MCP
Then all interfaces should report identical validation errors
And all error messages should have the same format
```

**Test**: `describe('Cross-Interface Consistency') > it('should report identical validation errors')`
**Requirement**: BR-4.4

### Feature: Error Handling and User Feedback

**File**: `shared/tools/__tests__/project-management/error-handling.test.ts`
**Covers**: BR-5

#### Scenario: validation_error_shows_field_and_rule

```gherkin
Given I attempt to create a project with invalid data
When the validation fails
Then the error message should specify which field failed
And the error message should explain the validation rule
```

**Test**: `describe('Error Handling') > it('should show field name and validation rule')`
**Requirement**: BR-5.1

#### Scenario: project_not_found_suggests_alternatives

```gherkin
Given I have existing projects with codes "PROJ1" and "PROJ2"
When I attempt to get a project with code "PROJ3" that does not exist
Then the command should fail with a "project not found" error
And the error message should suggest available projects: "PROJ1", "PROJ2"
```

**Test**: `describe('Error Handling') > it('should suggest alternatives when project not found')`
**Requirement**: BR-5.3

#### Scenario: tilde_expansion_resolves_to_home

```gherkin
Given I am using interactive CLI mode
When I provide a path containing "~"
Then the path should be resolved to my home directory
```

**Test**: `describe('Error Handling') > it('should expand tilde to home directory')`
**Requirement**: BR-5.5

### Feature: Concurrent Operation Safety

**File**: `shared/tools/__tests__/project-management/concurrent-operations.test.ts`
**Covers**: BR-6

#### Scenario: prevent_concurrent_modifications

```gherkin
Given I have an existing project with code "TEST"
When I run two simultaneous update operations on the same project
Then one operation should succeed
And the other operation should fail with a concurrent modification error
And the project data should remain consistent
```

**Test**: `describe('Concurrent Operations') > it('should prevent concurrent modifications')`
**Requirement**: BR-6.1

#### Scenario: preserve_state_on_filesystem_failure

```gherkin
Given I have an existing project with valid configuration
When a filesystem operation fails during project update
Then the original project state should be preserved
And an error should be reported
```

**Test**: `describe('Concurrent Operations') > it('should preserve state on filesystem failure')`
**Requirement**: BR-6.2

#### Scenario: detect_inconsistent_configurations

```gherkin
Given the global registry and project-local configuration are inconsistent
When I read the project
Then the inconsistency should be detected
And an error should be reported
```

**Test**: `describe('Concurrent Operations') > it('should detect configuration inconsistency')`
**Requirement**: BR-6.3

---

## Generated Test Files

| File | Scenarios | Status |
|------|-----------|--------|
| `shared/tools/__tests__/project-management/project-lifecycle.test.ts` | 14 | 🔴 RED |
| `shared/tools/__tests__/project-management/configuration-strategies.test.ts` | 5 | 🔴 RED |
| `shared/tools/__tests__/project-management/cross-interface-consistency.test.ts` | 4 | 🔴 RED |
| `shared/tools/__tests__/project-management/error-handling.test.ts` | 4 | 🔴 RED |
| `shared/tools/__tests__/project-management/concurrent-operations.test.ts` | 4 | 🔴 RED |

## Requirement Coverage

| Req ID | Description | Scenarios | Covered? |
|--------|-------------|-----------|----------|
| BR-1 | Project Lifecycle Operations | 14 | ✅ |
| BR-2 | Configuration Schema Validation | 3 | ✅ |
| BR-3 | Configuration Deployment Strategies | 5 | ✅ |
| BR-4 | Cross-Interface Consistency | 4 | ✅ |
| BR-5 | Error Handling and User Feedback | 4 | ✅ |
| BR-6 | Concurrent Operation Safety | 4 | ✅ |

**Total Coverage**: 6/6 requirements (100%)

## Notes on Non-Behavioral Requirements

The following constraints from requirements.md are **NOT** covered in BDD scenarios as they are internal implementation details:

| Constraint | Reason | Covered In |
|------------|--------|------------|
| C2: ProjectConfig Removal | Internal refactoring | `/mdt:tests` |
| C3: Shared API Usage | Implementation detail | `/mdt:tests` |
| C4: Repository Pattern | Architecture pattern | `/mdt:tests` |
| C6: Test Coverage | Quality metric | `/mdt:tests` |

## Verification

Run BDD tests:
```bash
npm run test:project-cli
```

**Expected Result**: `31 failed, 0 passed` (🔴 RED until implemented)

---

## Integration Notes

### For `/mdt:architecture`

These user journeys inform component boundaries:
- Project lifecycle (BR-1) suggests ProjectApplicationService with create/read/update/delete methods
- Configuration strategies (BR-3) requires ConfigurationStrategyFactory with three strategy implementations
- Cross-interface consistency (BR-4) requires shared validation modules and business logic layer
- Concurrent operations (BR-6) requires locking mechanism in ConfigurationRepository

### For `/mdt:implement`

After each implementation task:
1. Run unit/integration tests (from `/mdt:tests`)
2. Run BDD tests for affected scenarios
3. Scenarios should progressively turn GREEN

---
*Generated by /mdt:bdd*
