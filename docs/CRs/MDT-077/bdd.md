# BDD: MDT-077

**Source**: [MDT-077](../MDT-077-project-entity-configuration-architecture.md)
**Generated**: 2026-05-15

## E2E Context

| Setting | Value |
|---------|-------|
| Browser E2E | Playwright in `tests/e2e/` |
| API E2E | Supertest/Jest in `server/tests/api/` |
| CLI E2E | CLI project tests in `cli/tests/e2e/` |
| MCP E2E | MCP tool tests in `mcp-server/tests/e2e/` |
| Acceptance gate | Executable coverage required for project CRUD changes |

## Feature: Project Entity Configuration Contract

As a developer or agent using Markdown Ticket, I want project reads and updates to behave consistently across storage modes, so that project metadata does not disappear or fail depending on how the project was discovered.

### Scenario: Canonical project read resolves one project instance

**Covers**: `BR-1.1`, `BR-1.3`

```gherkin
Given a project can be found by code, id, or path
And it has registry metadata plus project-local configuration
When I request the project through a public project read
Then I receive one project record
And operational fields come from local configuration
```

### Scenario: Project list includes registered and discovered projects

**Covers**: `BR-1.2`

```gherkin
Given one project is registered globally
And another project is discoverable from local configuration in a configured search path
When I list projects
Then I see both projects in the project list
```

### Scenario: Global-only project stores and reads from registry

**Covers**: `BR-2.1`

```gherkin
Given I create or register a project in global-only mode
When I read the project after creation
Then the project is available without requiring a project-local config file
```

### Scenario: Project-first project merges registry and local config

**Covers**: `BR-2.2`, `BR-1.3`

```gherkin
Given I create or register a project-first project
When I read the project after creation
Then discovery metadata comes from the registry
And operational fields come from the project-local config
```

### Scenario: Auto-discovered project works without registry entry

**Covers**: `BR-2.3`, `BR-1.2`

```gherkin
Given a project has a valid local config inside configured discovery paths
And it has no global registry entry
When I list or read projects
Then the project is available from its local config
```

### Scenario: Editable fields update in the mode source of truth

**Covers**: `BR-3.1`

```gherkin
Given projects exist in global-only, project-first, and auto-discovery modes
When I update project name, description, repository, or supported active state
Then each project persists the changed fields in that mode's source of truth
```

### Scenario: Description-only update persists and refreshes visible state

**Covers**: `BR-3.2`, `BR-3.4`

```gherkin
Given I am editing a project description from the Web UI or API
When I save only the description
And I reopen or reread the project
Then the saved description is shown in the project read, selector, and edit form
```

### Scenario: Visible project without registry file updates local config

**Covers**: `BR-3.3`

```gherkin
Given a visible project has a local config path
And no registry file exists for its id
When I update editable project fields
Then the update succeeds by writing the local config
And the operation does not fail on the missing registry file
```

### Scenario: Project updates are visible across public interfaces

**Covers**: `BR-4.1`

```gherkin
Given a project is created or updated through one public interface
When I read the same project through Web UI, API, CLI, and MCP project reads
Then each interface shows the same project state
```

### Scenario: Invalid or missing project updates return clear errors

**Covers**: `BR-5.1`, `BR-5.2`

```gherkin
Given I submit invalid project data or a project identifier that cannot be resolved
When I request a project mutation or read
Then the operation fails without partial writes
And the response reports the invalid field or unresolved project key
```

---
Use `bdd.trace.md` for canonical scenario records and coverage summaries.
