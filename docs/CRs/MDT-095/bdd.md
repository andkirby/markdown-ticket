# BDD Acceptance Tests: MDT-095

**Mode**: Normal
**Source**: requirements.md
**Generated**: 2026-02-19
**Status**: 🔴 RED (implementation pending)

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest (custom MCP test framework) |
| Directory | `mcp-server/tests/e2e/` |
| Command | `npm run test:e2e` |
| Filter | `npm test -- tests/e2e/tools/worktree-*.spec.ts tests/e2e/api/worktree-*.spec.ts` |

## User Journeys

### Journey 1: Worktree Detection and Path Resolution

**User Goal**: Have file operations automatically route to the correct worktree path
**Entry Point**: MCP tool calls or API requests

```gherkin
Feature: Worktree Path Resolution
  As a developer working on tickets in Git worktrees
  I want the system to automatically route file operations to the worktree path
  So that I can work on tickets in isolated environments without manual path configuration
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| worktree_detected_from_git_command | Happy path | BR-1.1, BR-1.2 | 🔴 |
| worktree_cache_with_ttl | Edge case | BR-1.3 | 🔴 |
| git_command_fails_gracefully | Error | BR-1.4 | 🔴 |
| path_routes_to_worktree_when_exists | Happy path | BR-2.1, BR-2.2 | 🔴 |
| path_falls_back_to_main_when_no_worktree | Edge case | BR-2.3 | 🔴 |
| worktree_disabled_routes_to_main | Configuration | BR-2.4, BR-3.1 | 🔴 |
| worktree_enabled_by_default | Configuration | BR-3.2 | 🔴 |

### Journey 2: API Response Enhancement

**User Goal**: See worktree status in API responses to know where tickets are located
**Entry Point**: HTTP API endpoints

```gherkin
Feature: API Worktree Status
  As a client consuming the ticket API
  I want responses to include worktree status information
  So that I can display the correct location and path to users
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| api_get_ticket_includes_inWorktree_flag | Happy path | BR-6.1 | 🔴 |
| api_get_ticket_includes_worktreePath | Happy path | BR-6.1 | 🔴 |
| api_list_tickets_includes_worktree_status | Happy path | BR-6.2 | 🔴 |
| api_main_project_no_worktreePath | Edge case | BR-6.1 | 🔴 |

### Journey 3: MCP Tool Path Resolution

**User Goal**: MCP tools return correct file paths from worktrees
**Entry Point**: MCP tool invocations

```gherkin
Feature: MCP Tool Worktree Awareness
  As a user invoking MCP tools
  I want tools to automatically use worktree paths when tickets exist there
  So that file operations work correctly regardless of ticket location
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| get_cr_returns_from_worktree | Happy path | BR-5.1, BR-5.7 | 🔴 |
| get_cr_includes_absolute_path | Happy path | BR-5.7 | 🔴 |
| create_cr_in_worktree | Happy path | BR-5.2 | 🔴 |
| update_status_in_worktree | Happy path | BR-5.3 | 🔴 |
| update_attrs_in_worktree | Happy path | BR-5.3 | 🔴 |
| manage_sections_in_worktree | Happy path | BR-5.4 | 🔴 |
| delete_cr_from_worktree | Happy path | BR-5.5 | 🔴 |
| list_crs_includes_inWorktree_flag | Happy path | BR-5.6 | 🔴 |
| list_crs_filters_by_worktree_status | Happy path | BR-5.6 | 🔴 |

### Journey 4: Edge Case Handling

**User Goal**: System handles edge cases gracefully without breaking
**Entry Point**: Various operations

```gherkin
Feature: Worktree Edge Cases
  As a developer using worktrees
  I want the system to handle edge cases gracefully
  So that temporary worktree issues don't break my workflow
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| deleted_worktree_falls_back_to_main | Edge case | BR-8.1 | 🔴 |
| invalid_worktree_path_ignored | Edge case | BR-8.2 | 🔴 |
| path_filtering_excludes_worktree | Configuration | BR-8.3 | 🔴 |
| multiple_worktrees_same_ticket_logs_warning | Edge case | BR-8.4 | 🔴 |

---

## Scenario Specifications

### Feature: Worktree Path Resolution

**File**: `mcp-server/tests/e2e/tools/worktree-path-resolution.spec.ts`
**Covers**: BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-2.1, BR-2.2, BR-2.3, BR-2.4, BR-3.1, BR-3.2

#### Scenario: worktree_detected_from_git_command

```gherkin
Given a project with Git worktrees
  And worktree branch name matches ticket pattern "PROJECT_CODE-###"
When the system loads the project
Then worktree mapping is cached
  And ticket code maps to worktree path
```

**Test**: `describe('Worktree Detection') > it('detects worktrees from git worktree list')`
**Requirement**: BR-1.1, BR-1.2

#### Scenario: worktree_cache_with_ttl

```gherkin
Given a project with detected worktrees
  And cache TTL is 30 seconds
When worktree detection completes
Then results are cached for 30 seconds
  And cache refreshes after TTL expires
```

**Test**: `describe('Worktree Detection') > it('caches worktree mapping with 30s TTL')`
**Requirement**: BR-1.3

#### Scenario: git_command_fails_gracefully

```gherkin
Given the "git worktree list" command fails
When the system loads the project
Then worktree mapping is empty
  And system continues to function normally
```

**Test**: `describe('Worktree Detection') > it('handles git command failure gracefully')`
**Requirement**: BR-1.4

#### Scenario: path_routes_to_worktree_when_exists

```gherkin
Given a worktree exists for ticket "TEST-001"
  And ticket file exists in worktree
When resolving path for "TEST-001"
Then worktree path is returned
```

**Test**: `describe('Path Resolution') > it('routes to worktree when ticket exists there')`
**Requirement**: BR-2.1, BR-2.2

#### Scenario: path_falls_back_to_main_when_no_worktree

```gherkin
Given no worktree exists for ticket "TEST-001"
When resolving path for "TEST-001"
Then main project path is returned
```

**Test**: `describe('Path Resolution') > it('falls back to main path when no worktree')`
**Requirement**: BR-2.3

#### Scenario: worktree_disabled_routes_to_main

```gherkin
Given worktree support is disabled in config
When resolving path for any ticket
Then main project path is always returned
```

**Test**: `describe('Path Resolution') > it('respects worktree.disabled config')`
**Requirement**: BR-2.4, BR-3.1

#### Scenario: worktree_enabled_by_default

```gherkin
Given a project with no worktree configuration
When the system loads the project
Then worktree support is enabled by default
```

**Test**: `describe('Path Resolution') > it('enables worktree by default when config absent')`
**Requirement**: BR-3.2

---

### Feature: API Worktree Status

**File**: `mcp-server/tests/e2e/api/worktree-api-responses.spec.ts`
**Covers**: BR-6.1, BR-6.2

#### Scenario: api_get_ticket_includes_inWorktree_flag

```gherkin
Given a ticket exists in a worktree
When calling GET /api/projects/:id/crs/:key
Then response includes "inWorktree: true"
```

**Test**: `describe('API Worktree Status') > it('includes inWorktree flag for worktree tickets')`
**Requirement**: BR-6.1

#### Scenario: api_get_ticket_includes_worktreePath

```gherkin
Given a ticket exists in a worktree
When calling GET /api/projects/:id/crs/:key
Then response includes "worktreePath" with absolute path
```

**Test**: `describe('API Worktree Status') > it('includes worktreePath for worktree tickets')`
**Requirement**: BR-6.1

#### Scenario: api_list_tickets_includes_worktree_status

```gherkin
Given multiple tickets exist in various locations
When listing tickets via API
Then each ticket includes worktree status
```

**Test**: `describe('API Worktree Status') > it('includes worktree status in list responses')`
**Requirement**: BR-6.2

#### Scenario: api_main_project_no_worktreePath

```gherkin
Given a ticket exists in main project only
When calling GET /api/projects/:id/crs/:key
Then response includes "inWorktree: false"
  And "worktreePath" is absent or null
```

**Test**: `describe('API Worktree Status') > it('omits worktreePath for main project tickets')`
**Requirement**: BR-6.1

---

### Feature: MCP Tool Worktree Awareness

**File**: `mcp-server/tests/e2e/tools/worktree-mcp-tools.spec.ts`
**Covers**: BR-5.1, BR-5.2, BR-5.3, BR-5.4, BR-5.5, BR-5.6, BR-5.7

#### Scenario: get_cr_returns_from_worktree

```gherkin
Given ticket "TEST-001" exists in a worktree
When calling get_cr tool for "TEST-001"
Then response returns content from worktree file
  And response includes absolute worktree path
```

**Test**: `describe('MCP Worktree Tools') > it('get_cr reads from worktree path')`
**Requirement**: BR-5.1

#### Scenario: get_cr_includes_absolute_path

```gherkin
Given any MCP tool that resolves a worktree path
When the tool response is returned
Then response includes the absolute file path used
```

**Test**: `describe('MCP Worktree Tools') > it('all tools include absolute path in response')`
**Requirement**: BR-5.7

#### Scenario: create_cr_in_worktree

```gherkin
Given a worktree branch matches the new ticket pattern
When calling create_cr with that ticket code
Then ticket file is created in worktree path
```

**Test**: `describe('MCP Worktree Tools') > it('create_cr creates in worktree when branch matches')`
**Requirement**: BR-5.2

#### Scenario: update_status_in_worktree

```gherkin
Given ticket exists in a worktree
When calling update_cr_status for that ticket
Then status is updated in worktree ticket file
  And response includes worktree path
```

**Test**: `describe('MCP Worktree Tools') > it('update_cr_status updates worktree file')`
**Requirement**: BR-5.3

#### Scenario: update_attrs_in_worktree

```gherkin
Given ticket exists in a worktree
When calling update_cr_attrs for that ticket
Then attributes are updated in worktree ticket file
```

**Test**: `describe('MCP Worktree Tools') > it('update_cr_attrs updates worktree file')`
**Requirement**: BR-5.3

#### Scenario: manage_sections_in_worktree

```gherkin
Given ticket exists in a worktree
When calling manage_cr_sections for that ticket
Then sections are modified in worktree ticket file
```

**Test**: `describe('MCP Worktree Tools') > it('manage_cr_sections operates on worktree file')`
**Requirement**: BR-5.4

#### Scenario: delete_cr_from_worktree

```gherkin
Given ticket exists in a worktree
When calling delete_cr for that ticket
Then ticket is deleted from worktree path
```

**Test**: `describe('MCP Worktree Tools') > it('delete_cr removes from worktree path')`
**Requirement**: BR-5.5

#### Scenario: list_crs_includes_inWorktree_flag

```gherkin
Given tickets exist in both main and worktree locations
When calling list_crs
Then each ticket entry includes "inWorktree" boolean flag
```

**Test**: `describe('MCP Worktree Tools') > it('list_crs includes inWorktree flag')`
**Requirement**: BR-5.6

#### Scenario: list_crs_filters_by_worktree_status

```gherkin
Given tickets exist in both main and worktree locations
When calling list_crs with filters
Then filter correctly identifies worktree vs main tickets
```

**Test**: `describe('MCP Worktree Tools') > it('list_crs filters respect worktree status')`
**Requirement**: BR-5.6

---

### Feature: Worktree Edge Cases

**File**: `mcp-server/tests/e2e/tools/worktree-edge-cases.spec.ts`
**Covers**: BR-8.1, BR-8.2, BR-8.3, BR-8.4

#### Scenario: deleted_worktree_falls_back_to_main

```gherkin
Given a worktree path is cached
  And the worktree is deleted externally
When cache TTL expires and refreshes
Then system falls back to main project path
  And operations continue normally
```

**Test**: `describe('Worktree Edge Cases') > it('handles deleted worktree gracefully')`
**Requirement**: BR-8.1

#### Scenario: invalid_worktree_path_ignored

```gherkin
Given git worktree list returns an invalid path
When worktree detection runs
Then invalid worktree is ignored
  And system continues with valid worktrees
```

**Test**: `describe('Worktree Edge Cases') > it('ignores invalid worktree paths')`
**Requirement**: BR-8.2

#### Scenario: path_filtering_excludes_worktree

```gherkin
Given .mdt-config.toml path filtering excludes worktree parent
When file operations attempt to access worktree
Then system respects the exclusion
  And operations gracefully fail or skip worktree
```

**Test**: `describe('Worktree Edge Cases') > it('respects path filtering for worktrees')`
**Requirement**: BR-8.3

#### Scenario: multiple_worktrees_same_ticket_logs_warning

```gherkin
Given multiple worktrees have branches matching same ticket code
When worktree detection runs
Then first matching worktree is used
  And warning is logged about duplicate match
```

**Test**: `describe('Worktree Edge Cases') > it('logs warning for multiple worktrees per ticket')`
**Requirement**: BR-8.4

---

## Generated Test Files

| File | Scenarios | Status |
|------|-----------|--------|
| `mcp-server/tests/e2e/tools/worktree-path-resolution.spec.ts` | 7 | 🔴 RED |
| `mcp-server/tests/e2e/api/worktree-api-responses.spec.ts` | 4 | 🔴 RED |
| `mcp-server/tests/e2e/tools/worktree-mcp-tools.spec.ts` | 9 | 🔴 RED |
| `mcp-server/tests/e2e/tools/worktree-edge-cases.spec.ts` | 4 | 🔴 RED |

## Requirement Coverage

Track at sub-requirement level (BR-X.Y). A BR group is only ✅ when every sub-requirement has a scenario.

| Req ID | Scenarios | Covered? |
|--------|-----------|----------|
| BR-1.1 | worktree_detected_from_git_command | ✅ |
| BR-1.2 | worktree_detected_from_git_command | ✅ |
| BR-1.3 | worktree_cache_with_ttl | ✅ |
| BR-1.4 | git_command_fails_gracefully | ✅ |
| BR-2.1 | path_routes_to_worktree_when_exists | ✅ |
| BR-2.2 | path_routes_to_worktree_when_exists | ✅ |
| BR-2.3 | path_falls_back_to_main_when_no_worktree | ✅ |
| BR-2.4 | worktree_disabled_routes_to_main | ✅ |
| BR-3.1 | worktree_disabled_routes_to_main | ✅ |
| BR-3.2 | worktree_enabled_by_default | ✅ |
| BR-4.1 | — | ❌ Gap |
| BR-4.2 | — | ❌ Gap |
| BR-4.3 | — | ❌ Gap |
| BR-4.4 | — | ❌ Gap |
| BR-4.5 | — | ❌ Gap |
| BR-5.1 | get_cr_returns_from_worktree | ✅ |
| BR-5.2 | create_cr_in_worktree | ✅ |
| BR-5.3 | update_status_in_worktree, update_attrs_in_worktree | ✅ |
| BR-5.4 | manage_sections_in_worktree | ✅ |
| BR-5.5 | delete_cr_from_worktree | ✅ |
| BR-5.6 | list_crs_includes_inWorktree_flag, list_crs_filters_by_worktree_status | ✅ |
| BR-5.7 | get_cr_includes_absolute_path | ✅ |
| BR-6.1 | api_get_ticket_includes_inWorktree_flag, api_get_ticket_includes_worktreePath, api_main_project_no_worktreePath | ✅ |
| BR-6.2 | api_list_tickets_includes_worktree_status | ✅ |
| BR-7.1 | — | ❌ Gap |
| BR-7.2 | — | ❌ Gap |
| BR-7.3 | — | ❌ Gap |
| BR-7.4 | — | ❌ Gap |
| BR-8.1 | deleted_worktree_falls_back_to_main | ✅ |
| BR-8.2 | invalid_worktree_path_ignored | ✅ |
| BR-8.3 | path_filtering_excludes_worktree | ✅ |
| BR-8.4 | multiple_worktrees_same_ticket_logs_warning | ✅ |

### Coverage Gaps

| Requirement | Reason | Action |
|-------------|--------|--------|
| BR-4 (File Watching) | Not user-visible via API/MCP | Cover in `/mdt:tests` (integration tests for chokidar) |
| BR-7 (UI Badge) | Requires browser/UI framework | Cover in component tests or manual verification |

## Verification

Run BDD tests:
```bash
# All worktree E2E tests
npm test -- tests/e2e/tools/worktree-*.spec.ts tests/e2e/api/worktree-*.spec.ts

# Specific test suite
npm test -- tests/e2e/tools/worktree-path-resolution.spec.ts
npm test -- tests/e2e/api/worktree-api-responses.spec.ts
npm test -- tests/e2e/tools/worktree-mcp-tools.spec.ts
npm test -- tests/e2e/tools/worktree-edge-cases.spec.ts
```

**Expected Result**: 24 failed, 0 passed (🔴 RED until implemented)

---

## Integration Notes

### For `/mdt:architecture`

These user journeys inform component boundaries:
- Journey 1 suggests `WorktreeService` for detection and caching
- Journey 2 suggests API response model extensions
- Journey 3 suggests MCP tool handler path resolution wrapper
- Journey 4 suggests error handling patterns

### For `/mdt:tests`

**BR-4 (File Watching)** requires integration-level tests:
- Test chokidar watcher creation for worktree paths
- Test change broadcasting from worktree directories
- Test watcher addition/removal on worktree changes
- Test error handling when file watching fails

**BR-7 (UI Badge)** requires component tests:
- Test `TicketCard.tsx` badge rendering
- Test `TicketRow.tsx` badge rendering
- Test badge state updates on worktree changes

### For `/mdt:implement`

After each implementation task:
1. Run unit/integration tests (from `/mdt:tests`)
2. Run BDD tests for affected scenarios
3. Scenarios should progressively turn GREEN

---
*Generated by /mdt:bdd v1*
