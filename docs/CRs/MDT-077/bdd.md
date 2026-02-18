# BDD Acceptance Tests: MDT-077

**Mode**: Normal
**Source**: requirements.md
**Generated**: 2026-02-02
**Updated**: 2026-02-08
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
**Entry Point**: `npm run project:<action>` commands

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

### Journey 2: Input Validation and Rejection

**User Goal**: Receive immediate feedback when providing invalid project parameters
**Entry Point**: `npm run project:create` with bad inputs

```gherkin
Feature: Input Validation and Rejection
  As a user
  I want clear rejection when I provide invalid parameters
  So that I can correct my input quickly
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| reject_code_too_short | Error | BR-2.1 | 🔴 |
| reject_code_too_long | Error | BR-2.1 | 🔴 |
| reject_code_starting_with_number | Error | BR-2.1 | 🔴 |
| reject_code_with_special_chars | Error | BR-2.1 | 🔴 |
| reject_empty_project_name | Error | BR-2.6 | 🔴 |
| reject_nonexistent_path | Error | BR-2.7 | 🔴 |
| reject_path_traversal_attempt | Error | C9 | 🔴 |

### Journey 3: Configuration Deployment Strategies

**User Goal**: Choose where project configuration is stored based on deployment needs
**Entry Point**: `npm run project:create` with optional flags

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
| auto_discover_projects_in_search_paths | Happy path | BR-3.4 | 🔴 |
| read_project_merges_global_and_local | Happy path | BR-3.5 | 🔴 |

### Journey 4: Cross-Interface Consistency

**User Goal**: Ensure project operations work consistently across CLI, Web UI, and MCP
**Entry Point**: CLI commands, then verify via Web UI/MCP

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

### Journey 5: Error Handling and User Feedback

**User Goal**: Receive clear error messages when operations fail
**Entry Point**: All CLI commands with invalid inputs or missing resources

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
| validation_failure_exits_with_error_code | Error | BR-5.2 | 🔴 |
| project_not_found_suggests_alternatives | Error | BR-5.3 | 🔴 |
| filesystem_error_shows_details | Error | BR-5.4 | 🔴 |
| tilde_expansion_resolves_to_home | Happy path | BR-5.5 | 🔴 |

### Journey 6: Concurrent Operation Safety

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

**File**: `shared/tools/__tests__/project-management/project-creation.test.ts`
**Covers**: BR-1.1, BR-2.1, BR-2.7, BR-3.1 (partial)

#### Scenario: create_project_with_valid_parameters

```gherkin
Given I have a valid project name "Test Project"
And I have a valid project path "/tmp/test-project"
And I have a valid project code "TEST"
When I run `project:create --name "Test Project" --path /tmp/test-project --code TEST`
Then the project should be created successfully
And the project code should be "TEST"
And the project name should be "Test Project"
And the project should be active
```

**Test**: `describe('project:create') > describe('when valid parameters are provided') > it('should create local .mdt-config.toml with required fields')`
**Requirement**: BR-1.1

#### Scenario: create_project_with_lowercase_code

```gherkin
Given I have a valid project name "Test Project"
And I have a valid project path "/tmp/test-project"
And I provide a lowercase project code "test"
When I run `project:create --name "Test Project" --path /tmp/test-project --code test`
Then the project should be created successfully
And the project code should be converted to uppercase "TEST"
```

**Test**: `describe('project:create') > it('should auto-uppercase project code')`
**Requirement**: BR-1.1

#### Scenario: create_project_with_auto_generated_code

```gherkin
Given I have a valid project name "My New App"
And I have a valid project path "/tmp/my-new-app"
And I do not provide a project code
When I run `project:create --name "My New App" --path /tmp/my-new-app`
Then the project should be created successfully
And a project code should be auto-generated from the name
And the code should be uppercase letters only
```

**Test**: `describe('project:create') > it('should auto-generate code from name')`
**Requirement**: BR-1.1

#### Scenario: list_all_projects

```gherkin
Given I have created multiple projects
When I run `project:list`
Then I should see all registered projects
And each project should show: active status, name, code, and path
```

**Test**: `describe('project:list') > it('should list all projects with details')`
**Requirement**: BR-1.2

#### Scenario: get_project_details_by_code

```gherkin
Given I have created a project with code "TEST"
When I run `project:get --code TEST`
Then I should see complete project information
And the output should include the project name, path, and configuration
```

**Test**: `describe('project:get') > it('should retrieve project by code')`
**Requirement**: BR-1.3

#### Scenario: get_project_details_by_path

```gherkin
Given I have created a project at path "/tmp/test-project"
When I run `project:get --path /tmp/test-project`
Then I should see complete project information
And the output should match the project created at that path
```

**Test**: `describe('project:get') > it('should retrieve project by path')`
**Requirement**: BR-1.3

#### Scenario: update_project_name

```gherkin
Given I have an existing project with code "TEST" and name "Old Name"
When I run `project:update --code TEST --name "New Name"`
Then the project name should be updated to "New Name"
And the update should be persisted to configuration
```

**Test**: `describe('project:update') > it('should update project name')`
**Requirement**: BR-1.4

#### Scenario: delete_project_with_confirmation

```gherkin
Given I have an existing project with code "TEST"
When I run `project:delete --code TEST --confirm`
Then the project should be removed from the registry
And the project should no longer appear in `project:list`
```

**Test**: `describe('project:delete') > it('should delete project after confirmation')`
**Requirement**: BR-1.5

#### Scenario: enable_project

```gherkin
Given I have a disabled project with code "TEST"
When I run `project:enable --code TEST`
Then the project active status should be true
And the project should appear as active in `project:list`
```

**Test**: `describe('project:enable') > it('should set project active to true')`
**Requirement**: BR-1.6

#### Scenario: disable_project

```gherkin
Given I have an active project with code "TEST"
When I run `project:disable --code TEST`
Then the project active status should be false
And the project should appear as inactive in `project:list`
```

**Test**: `describe('project:disable') > it('should set project active to false')`
**Requirement**: BR-1.7

### Feature: Input Validation and Rejection

**File**: `shared/tools/__tests__/project-management/project-creation.test.ts`
**Covers**: BR-2.1, BR-2.6, BR-2.7, C9

#### Scenario: reject_code_too_short

```gherkin
Given I provide a project code "T" (only 1 character)
When I run `project:create --name "Test" --path /tmp/test --code T`
Then the command should fail with a validation error
And the error should indicate the code must be 2-5 characters
```

**Test**: `describe('when invalid project code is provided') > it('should reject too short (1 char) code')`
**Requirement**: BR-2.1

#### Scenario: reject_code_too_long

```gherkin
Given I provide a project code "TEST123" (more than 5 characters)
When I run `project:create --name "Test" --path /tmp/test --code TEST123`
Then the command should fail with a validation error
And the error should indicate the code must be 2-5 characters
```

**Test**: `describe('when invalid project code is provided') > it('should reject too long (>5 chars) code')`
**Requirement**: BR-2.1

#### Scenario: reject_code_starting_with_number

```gherkin
Given I provide a project code "3TEST" (starts with digit)
When I run `project:create --name "Test" --path /tmp/test --code 3TEST`
Then the command should fail with a validation error
And the error should indicate the code must start with a letter
```

**Test**: `describe('when invalid project code is provided') > it('should reject starts with number code')`
**Requirement**: BR-2.1

#### Scenario: reject_code_with_special_chars

```gherkin
Given I provide a project code "TEST-123" (contains special characters)
When I run `project:create --name "Test" --path /tmp/test --code TEST-123`
Then the command should fail with a validation error
And the error should indicate the code format requirement
```

**Test**: `describe('when invalid project code is provided') > it('should reject contains special characters code')`
**Requirement**: BR-2.1

#### Scenario: reject_empty_project_name

```gherkin
Given I provide an empty string as the project name
When I run `project:create --name "" --path /tmp/test --code TEST`
Then the command should fail with a validation error
And the error should indicate the name cannot be empty
```

**Test**: `describe('when empty name is provided') > it('should reject empty project name')`
**Requirement**: BR-2.6

#### Scenario: reject_nonexistent_path

```gherkin
Given I provide a path "/tmp/does-not-exist-12345" that does not exist
When I run `project:create --name "Test" --path /tmp/does-not-exist-12345 --code TEST`
Then the command should fail with an error
And the error should indicate the path does not exist
```

**Test**: `describe('when invalid path is provided') > it('should reject non-existent absolute path')`
**Requirement**: BR-2.7

#### Scenario: reject_path_traversal_attempt

```gherkin
Given I provide a path containing traversal sequences like "../../etc/passwd"
When I run `project:create --name "Test" --path "../../etc/passwd" --code TEST`
Then the command should fail with a security error
And the error should indicate the path is not allowed
```

**Test**: `describe('path security') > it('should reject path traversal attempts')`
**Requirement**: C9

### Feature: Configuration Deployment Strategies

**File**: `shared/tools/__tests__/project-management/configuration-validation.test.ts`
**Covers**: BR-3.1, BR-3.2, BR-3.3, BR-3.4, BR-3.5

#### Scenario: create_project_default_mode

```gherkin
Given I have a valid project name and path
When I run `project:create` without any mode flags
Then the project should be discoverable from the global registry
And the project should have complete configuration in the project directory
```

**Test**: `describe('configuration validation') > it('should validate generated configuration schema')`
**Requirement**: BR-3.1

#### Scenario: create_project_global_only_mode

```gherkin
Given I have a valid project name and path
When I run `project:create --global-only`
Then the project definition should be fully stored in the global registry
And no configuration file should exist in the project directory
```

**Test**: `describe('Configuration Strategies') > it('should store complete definition in global registry')`
**Requirement**: BR-3.2

#### Scenario: create_project_auto_discovery_mode

```gherkin
Given I have a valid project within an auto-discovery search path
When I run `project:create` from within that path
Then only a project-local configuration should be created
And no global registry entry should exist for this project
```

**Test**: `describe('Configuration Strategies') > it('should create only local config in auto-discovery paths')`
**Requirement**: BR-3.3

#### Scenario: auto_discover_projects_in_search_paths

```gherkin
Given a project with local configuration exists in a search path
When the system scans for projects
Then the project should be discovered automatically
And the project should be usable without manual registration
```

**Test**: `describe('auto-discovery') > it('should discover projects in search paths')`
**Requirement**: BR-3.4

#### Scenario: read_project_merges_global_and_local

```gherkin
Given a project was created in default mode
When I retrieve the project details
Then the result should combine global registry data with local configuration
And the project should have all expected fields populated
```

**Test**: `describe('configuration consistency') > it('should ensure CLI output matches configuration values')`
**Requirement**: BR-3.5

### Feature: Cross-Interface Consistency

**File**: `shared/tools/__tests__/project-management/cross-interface-consistency.test.ts` *(to be created)*
**Covers**: BR-4.1, BR-4.2, BR-4.4, BR-4.5

#### Scenario: cli_created_project_visible_in_webui

```gherkin
Given I have created a project via CLI with code "TEST"
When I query projects through the Web UI API
Then the project should be visible
And the project details should match the CLI-created project
```

**Test**: `describe('Cross-Interface Consistency') > it('should show CLI-created project in Web UI')`
**Requirement**: BR-4.1

#### Scenario: cli_updated_project_visible_in_mcp

```gherkin
Given I have updated a project via CLI
When I query the project through MCP tools
Then the updated values should be visible
And the MCP response should match the CLI update
```

**Test**: `describe('Cross-Interface Consistency') > it('should show CLI update in MCP')`
**Requirement**: BR-4.2

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

#### Scenario: identical_crud_results_across_interfaces

```gherkin
Given I create, read, update, and delete a project
When I perform the same operations via CLI, Web UI, and MCP
Then each interface should produce identical results for the same input
```

**Test**: `describe('Cross-Interface Consistency') > it('should produce identical CRUD results')`
**Requirement**: BR-4.5

### Feature: Error Handling and User Feedback

**File**: `shared/tools/__tests__/project-management/error-handling.test.ts` *(to be created)*
**Covers**: BR-5.1, BR-5.2, BR-5.3, BR-5.4, BR-5.5

#### Scenario: validation_error_shows_field_and_rule

```gherkin
Given I attempt to create a project with invalid data
When the validation fails
Then the error message should specify which field failed
And the error message should explain the validation rule
```

**Test**: `describe('Error Handling') > it('should show field name and validation rule')`
**Requirement**: BR-5.1

#### Scenario: validation_failure_exits_with_error_code

```gherkin
Given I submit invalid project data via CLI
When the validation fails
Then the process should exit with a non-zero exit code
And the error output should contain specific validation details
```

**Test**: `describe('Error Handling') > it('should exit with error code on validation failure')`
**Requirement**: BR-5.2

#### Scenario: project_not_found_suggests_alternatives

```gherkin
Given I have existing projects with codes "PROJ1" and "PROJ2"
When I attempt to get a project with code "PROJ3" that does not exist
Then the command should fail with a "project not found" error
And the error message should suggest available projects: "PROJ1", "PROJ2"
```

**Test**: `describe('Error Handling') > it('should suggest alternatives when project not found')`
**Requirement**: BR-5.3

#### Scenario: filesystem_error_shows_details

```gherkin
Given a filesystem operation fails during project creation
When the error is reported to the user
Then the error message should include the operation that failed
And the error message should include the filesystem error details
```

**Test**: `describe('Error Handling') > it('should show filesystem error details')`
**Requirement**: BR-5.4

#### Scenario: tilde_expansion_resolves_to_home

```gherkin
Given I am using interactive CLI mode
When I provide a path containing "~"
Then the path should be resolved to my home directory
```

**Test**: `describe('Error Handling') > it('should expand tilde to home directory')`
**Requirement**: BR-5.5

### Feature: Concurrent Operation Safety

**File**: `shared/tools/__tests__/project-management/concurrent-operations.test.ts` *(to be created)*
**Covers**: BR-6.1, BR-6.2, BR-6.3, BR-6.4

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
Given the global registry and project-local configuration have diverged
When I read the project
Then the inconsistency should be detected
And a warning or error should be reported to the user
```

**Test**: `describe('Concurrent Operations') > it('should detect configuration inconsistency')`
**Requirement**: BR-6.3

#### Scenario: no_partial_files_on_interruption

```gherkin
Given a project operation is in progress
When the operation is interrupted unexpectedly
Then no partial or corrupted configuration files should remain
And the previous valid state should be intact
```

**Test**: `describe('Concurrent Operations') > it('should not leave partial files on interruption')`
**Requirement**: BR-6.4

---

## Generated Test Files

| File | Scenarios | Status | Notes |
|------|-----------|--------|-------|
| `shared/tools/__tests__/project-management/project-creation.test.ts` | 7 | 🔴 RED | Exists — covers BR-1.1, BR-2.1, BR-2.7, BR-3.1 (partial) |
| `shared/tools/__tests__/project-management/configuration-validation.test.ts` | 4 | 🔴 RED | Exists — covers BR-2.1 (unit), BR-3.1, BR-3.5 |
| `shared/tools/__tests__/project-management/cross-interface-consistency.test.ts` | 4 | 🔴 RED | To be created |
| `shared/tools/__tests__/project-management/error-handling.test.ts` | 5 | 🔴 RED | To be created |
| `shared/tools/__tests__/project-management/concurrent-operations.test.ts` | 4 | 🔴 RED | To be created |

## Requirement Coverage

| Req ID | Description | Scenarios | Covered? |
|--------|-------------|-----------|----------|
| BR-1.1 | Create project (valid params, lowercase, auto-code) | 3 | ✅ |
| BR-1.2 | List all projects | 1 | ✅ |
| BR-1.3 | Get project details (by code, by path) | 2 | ✅ |
| BR-1.4 | Update project | 1 | ✅ |
| BR-1.5 | Delete project with confirmation | 1 | ✅ |
| BR-1.6 | Enable project | 1 | ✅ |
| BR-1.7 | Disable project | 1 | ✅ |
| BR-2.1 | Code validation (too short, too long, starts with number, special chars) | 4 | ✅ |
| BR-2.2 | Identifier equals directory name | 0 | ❌ Gap |
| BR-2.3 | Skip worktree projects with mismatched identifiers | 0 | ❌ Gap |
| BR-2.4 | Auto-exclude tickets path from document scanning | 0 | ❌ Gap |
| BR-2.5 | TOML structure compliance | 0 | ❌ Gap |
| BR-2.6 | Empty project name rejection | 1 | ✅ |
| BR-2.7 | Non-existent path rejection | 1 | ✅ |
| BR-3.1 | Default mode (global + local) | 1 | ✅ |
| BR-3.2 | Global-only mode | 1 | ✅ |
| BR-3.3 | Auto-discovery mode | 1 | ✅ |
| BR-3.4 | Auto-discover projects in search paths | 1 | ✅ |
| BR-3.5 | Read merges global and local | 1 | ✅ |
| BR-4.1 | CLI-created project visible in Web UI | 1 | ✅ |
| BR-4.2 | CLI-updated project visible in MCP | 1 | ✅ |
| BR-4.3 | Shared validation rules across interfaces | 0 | ❌ Gap |
| BR-4.4 | Identical validation errors across interfaces | 1 | ✅ |
| BR-4.5 | Identical CRUD results across interfaces | 1 | ✅ |
| BR-5.1 | Validation error shows field and rule | 1 | ✅ |
| BR-5.2 | Validation failure exits with error code | 1 | ✅ |
| BR-5.3 | Project not found suggests alternatives | 1 | ✅ |
| BR-5.4 | Filesystem error shows details | 1 | ✅ |
| BR-5.5 | Tilde expansion | 1 | ✅ |
| BR-6.1 | Prevent concurrent modifications | 1 | ✅ |
| BR-6.2 | Preserve state on filesystem failure | 1 | ✅ |
| BR-6.3 | Detect inconsistent configurations | 1 | ✅ |
| BR-6.4 | No partial files on interruption | 1 | ✅ |
| C9 | Path traversal security | 1 | ✅ |

### Coverage Gaps

| Requirement | Reason | Action |
|-------------|--------|--------|
| BR-2.2 | Identifier=directory name is internal validation | Cover in `/mdt:tests` |
| BR-2.3 | Git worktree detection is internal scanning logic | Cover in `/mdt:tests` |
| BR-2.4 | Auto-exclude tickets path is internal config generation | Cover in `/mdt:tests` |
| BR-2.5 | TOML structure compliance is internal format | Cover in `/mdt:tests` |
| BR-4.3 | Shared validation rules — implicitly tested by BR-4.4 | Covered indirectly |

## Notes on Non-Behavioral Requirements

The following constraints from requirements.md are **NOT** covered in BDD scenarios as they are internal implementation details:

| Constraint | Reason | Covered In |
|------------|--------|------------|
| C1: Legacy Config | Internal format decision | `/mdt:tests` |
| C2: ProjectConfig Removal | Internal refactoring | `/mdt:tests` |
| C3: Shared API Usage | Implementation detail | `/mdt:tests` |
| C4: Repository Pattern | Architecture pattern | `/mdt:tests` |
| C5: Code Format | User-visible validation already covered by BR-2.1 scenarios | BDD (indirectly) + `/mdt:tests` |
| C6: Test Coverage | Quality metric | `/mdt:tests` |
| C7: Concurrency | User-visible safety already covered by BR-6 scenarios | BDD (indirectly) + `/mdt:tests` |
| C8: Interface Consistency | User-visible consistency already covered by BR-4 scenarios | BDD (indirectly) + `/mdt:tests` |

## Verification

Run BDD tests:
```bash
npm run test:project-cli
```

**Expected Result**: Majority of scenarios 🔴 RED until implementation completes. Existing test files (`project-creation.test.ts`, `configuration-validation.test.ts`) may have partial GREEN for BR-1.1, BR-2.1, BR-2.7, BR-3.1, BR-3.5.

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
