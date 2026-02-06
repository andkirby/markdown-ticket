# BDD Acceptance Tests: MDT-121

**Mode**: Normal
**Source**: requirements.md
**Generated**: 2026-02-05
**Status**: 🔴 RED (implementation pending)

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Directory | `mcp-server/tests/e2e/` |
| Command | `npm run test:e2e` |
| Filter | `--testNamePattern="MDT-121"` |

## User Journeys

### Journey 1: Single-Project Mode Auto-Detection

**User Goal**: Work with MCP tools without specifying project parameter when server starts from project directory
**Entry Point**: MCP server startup

```gherkin
Feature: Single-Project Mode Auto-Detection
  As a Claude Code user
  I want the MCP server to auto-detect my project from the working directory
  So that I don't need to specify the project parameter in every tool call
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| detect_project_from_cwd | Happy path | BR-1.1, BR-1.2 | 🔴 |
| detect_project_from_parent_directory | Happy path | BR-1.1, BR-1.4 | 🔴 |
| multi_project_mode_when_no_config | Happy path | BR-1.3, BR-1.5 | 🔴 |
| use_closest_config_when_multiple | Edge case | BR-4.4 | 🔴 |
| respect_search_depth_zero | Configuration | BR-4.2 | 🔴 |
| default_search_depth_when_not_configured | Configuration | BR-4.3 | 🔴 |

### Journey 2: Optional Project Parameter

**User Goal**: Call MCP tools with or without project parameter based on context
**Entry Point**: Any MCP tool call

```gherkin
Feature: Optional Project Parameter Resolution
  As a Claude Code user
  I want to omit the project parameter when a default is detected
  So that my tool calls are shorter and more concise
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| omit_project_when_default_exists | Happy path | BR-2.2 | 🔴 |
| explicit_project_overrides_default | Happy path | BR-2.1 | 🔴 |
| error_when_no_project_context | Error | BR-2.3 | 🔴 |

### Journey 3: Numeric Key Shorthand

**User Goal**: Reference tickets by number only when project context is available
**Entry Point**: Tool calls with `key` parameter (get_cr, delete_cr, etc.)

```gherkin
Feature: Numeric Key Shorthand Support
  As a Claude Code user
  I want to reference tickets by number only (e.g., 5 instead of MDT-005)
  So that my tool calls are more concise
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| numeric_key_resolves_with_default_project | Happy path | BR-3.1, BR-3.2 | 🔴 |
| full_format_key_uppercased | Happy path | BR-3.3, BR-3.4 | 🔴 |
| lowercase_key_uppercased | Happy path | BR-3.4 | 🔴 |
| numeric_key_with_explicit_project | Happy path | BR-5.3 | 🔴 |
| invalid_key_format_error | Error | BR-3.5 | 🔴 |

### Journey 4: Backward Compatibility

**User Goal**: Continue using multi-project workflows without changes
**Entry Point**: Any tool call from outside project directory

```gherkin
Feature: Backward Compatibility for Multi-Project Mode
  As a Claude Code user with multiple projects
  I want my existing tool calls to continue working
  So that upgrading doesn't break my workflows
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| explicit_project_always_works | Happy path | BR-5.2, C3 | 🔴 |
| explicit_project_in_multi_project_mode | Happy path | BR-5.1, BR-5.3 | 🔴 |
| full_format_al_works_without_default | Happy path | BR-5.3, C3 | 🔴 |

---

## Scenario Specifications

### Feature: Single-Project Mode Auto-Detection

**File**: `mcp-server/tests/e2e/tools/single-project-mode.spec.ts`
**Covers**: BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-1.5, BR-4.2, BR-4.3, BR-4.4

#### Scenario: detect_project_from_cwd

```gherkin
Given I am in a project directory with .mdt-config.toml
When I start the MCP server
Then I should see "Single-project mode: {PROJECT_CODE}" in startup logs
And the default project should be set to the project code from config
```

**Test**: `describe('Single-Project Mode') > it('detect project from cwd')`
**Requirement**: BR-1.1, BR-1.2, BR-1.4

#### Scenario: detect_project_from_parent_directory

```gherkin
Given I am in a subdirectory of a project (e.g., mcp-server/src/)
When I start the MCP server
Then I should see "Single-project mode: {PROJECT_CODE}" in startup logs
And the default project should be set to the project code from parent config
```

**Test**: `describe('Single-Project Mode') > it('detect project from parent directory')`
**Requirement**: BR-1.1, BR-1.4

#### Scenario: multi_project_mode_when_no_config

```gherkin
Given I am in a directory without .mdt-config.toml (e.g., /tmp)
When I start the MCP server
Then I should see "Multi-project mode" in startup logs
And no default project should be set
```

**Test**: `describe('Single-Project Mode') > it('multi-project mode when no config')`
**Requirement**: BR-1.3, BR-1.5

#### Scenario: use_closest_config_when_multiple

```gherkin
Given I am in a directory with nested .mdt-config.toml files
When I start the MCP server
Then the closest .mdt-config.toml should be used
```

**Test**: `describe('Single-Project Mode') > it('uses closest config when multiple exist')`
**Requirement**: BR-4.4

#### Scenario: respect_search_depth_zero

```gherkin
Given mdtConfigSearchDepth is set to 0
And I am in a subdirectory without .mdt-config.toml
When I start the MCP server
Then only the current directory should be checked
And multi-project mode should be active
```

**Test**: `describe('Single-Project Mode') > it('respects search depth zero')`
**Requirement**: BR-4.2

#### Scenario: default_search_depth_when_not_configured

```gherkin
Given mdtConfigSearchDepth is not configured
And I am in a subdirectory 3 levels deep from project root
When I start the MCP server
Then the project config should be found
```

**Test**: `describe('Single-Project Mode') > it('uses default search depth when not configured')`
**Requirement**: BR-4.3

---

### Feature: Optional Project Parameter Resolution

**File**: `mcp-server/tests/e2e/tools/optional-project-param.spec.ts`
**Covers**: BR-2.1, BR-2.2, BR-2.3

#### Scenario: omit_project_when_default_exists

```gherkin
Given the MCP server is in single-project mode with default project "MDT"
When I call get_cr with key="5" and no project parameter
Then the request should succeed
And the CR should be from project "MDT"
```

**Test**: `describe('Optional Project Parameter') > it('omits project when default exists')`
**Requirement**: BR-2.2

#### Scenario: explicit_project_overrides_default

```gherkin
Given the MCP server is in single-project mode with default project "MDT"
When I call get_cr with key="5" and project="SUML"
Then the request should succeed
And the CR should be from project "SUML" (not MDT)
```

**Test**: `describe('Optional Project Parameter') > it('explicit project overrides default')`
**Requirement**: BR-2.1

#### Scenario: error_when_no_project_context

```gherkin
Given the MCP server is in multi-project mode (no default)
When I call get_cr with key="5" and no project parameter
Then the request should fail
And the error message should contain "No project context available"
```

**Test**: `describe('Optional Project Parameter') > it('errors when no project context')`
**Requirement**: BR-2.3

---

### Feature: Numeric Key Shorthand Support

**File**: `mcp-server/tests/e2e/tools/numeric-key-shorthand.spec.ts`
**Covers**: BR-3.1, BR-3.2, BR-3.3, BR-3.4, BR-3.5, BR-5.3

#### Scenario: numeric_key_resolves_with_default_project

```gherkin
Given the MCP server is in single-project mode with default project "MDT"
When I call get_cr with key="5"
Then the request should succeed
And CR "MDT-5" should be returned
And CR "MDT-005" should also work (leading zeros stripped)
```

**Test**: `describe('Numeric Key Shorthand') > it('resolves numeric key with default project')`
**Requirement**: BR-3.1, BR-3.2

#### Scenario: full_format_key_uppercased

```gherkin
Given the MCP server has a default project
When I call get_cr with key="abc-12"
Then the request should succeed
And CR "ABC-12" should be returned (uppercase)
```

**Test**: `describe('Numeric Key Shorthand') > it('uppercases full format key')`
**Requirement**: BR-3.3, BR-3.4

#### Scenario: lowercase_key_uppercased

```gherkin
Given the MCP server has a default project
When I call get_cr with key="mdt-5"
Then the request should succeed
And CR "MDT-5" should be returned (uppercase)
```

**Test**: `describe('Numeric Key Shorthand') > it('uppercases lowercase key')`
**Requirement**: BR-3.4

#### Scenario: numeric_key_with_explicit_project

```gherkin
Given the MCP server has a default project "MDT"
When I call get_cr with key="5" and project="SUML"
Then the request should succeed
And CR "SUML-5" should be returned
```

**Test**: `describe('Numeric Key Shorthand') > it('uses explicit project for numeric key')`
**Requirement**: BR-5.3

#### Scenario: invalid_key_format_error

```gherkin
Given the MCP server has a default project
When I call get_cr with key="invalid-format"
Then the request should fail
And the error message should contain "Invalid key format"
```

**Test**: `describe('Numeric Key Shorthand') > it('errors on invalid key format')`
**Requirement**: BR-3.5

---

### Feature: Backward Compatibility for Multi-Project Mode

**File**: `mcp-server/tests/e2e/tools/backward-compatibility.spec.ts`
**Covers**: BR-5.1, BR-5.2, BR-5.3, C3

#### Scenario: explicit_project_always_works

```gherkin
Given the MCP server is in single-project mode with default project "MDT"
When I call get_cr with key="SUML-5" and project="SUML"
Then the request should succeed
And CR "SUML-5" should be returned
```

**Test**: `describe('Backward Compatibility') > it('explicit project always works')`
**Requirement**: BR-5.2, C3

#### Scenario: explicit_project_in_multi_project_mode

```gherkin
Given the MCP server is in multi-project mode (no default)
When I call get_cr with key="5" and project="SUML"
Then the request should succeed
And CR "SUML-5" should be returned
```

**Test**: `describe('Backward Compatibility') > it('explicit project works in multi-project mode')`
**Requirement**: BR-5.1, BR-5.3

#### Scenario: full_format_al_works_without_default

```gherkin
Given the MCP server is in multi-project mode (no default)
When I call get_cr with key="SUML-123" and project="SUML"
Then the request should succeed
And CR "SUML-123" should be returned
```

**Test**: `describe('Backward Compatibility') > it('full format works without default')`
**Requirement**: BR-5.3, C3

---

## Generated Test Files

| File | Scenarios | Status |
|------|-----------|--------|
| `mcp-server/tests/e2e/tools/single-project-mode.spec.ts` | 6 | 🔴 |
| `mcp-server/tests/e2e/tools/optional-project-param.spec.ts` | 3 | 🔴 |
| `mcp-server/tests/e2e/tools/numeric-key-shorthand.spec.ts` | 5 | 🔴 |
| `mcp-server/tests/e2e/tools/backward-compatibility.spec.ts` | 3 | 🔴 |

## Requirement Coverage

| Req ID | Description | Scenarios | Covered? |
|--------|-------------|-----------|----------|
| BR-1 | Project Auto-Detection at Startup | 6 | ✅ |
| BR-2 | Optional Project Parameter Resolution | 3 | ✅ |
| BR-3 | Numeric Key Shorthand Support | 5 | ✅ |
| BR-4 | Parent Directory Search Configuration | 3 | ✅ |
| BR-5 | Backward Compatibility for Multi-Project Mode | 3 | ✅ |
| C1 | Performance (< 50ms) | 0 | ⚠️ Unit test |
| C2 | Reliability (startup never fails) | 0 | ⚠️ Unit test |
| C3 | Backward Compatibility | 3 | ✅ |

### Coverage Notes

- **C1 (Performance)**: Not user-visible → test in `/mdt:tests` unit tests
- **C2 (Reliability)**: Startup failure behavior → test in `/mdt:tests` integration tests

## Verification

Run BDD tests:
```bash
cd mcp-server && npm run test:e2e -- --testNamePattern="MDT-121"
```

**Expected Result**: `17 failed, 0 passed` (RED until implemented)

---

## Integration Notes

### For `/mdt:architecture`

These user journeys inform component boundaries:
- Journey 1 suggests `detectDefaultProject()` in MCPCRServer
- Journey 2 suggests `resolveProject()` in ProjectHandlers
- Journey 3 suggests `normalizeKey()` utility in crHandlers
- Journey 4 confirms explicit parameter takes precedence over default

### For `/mdt:implement`

After each implementation task:
1. Run unit/integration tests (from `/mdt:tests`)
2. Run BDD tests for affected scenarios
3. Scenarios should progressively turn GREEN

---
*Generated by /mdt:bdd v1*
