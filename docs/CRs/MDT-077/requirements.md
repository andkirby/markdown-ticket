# Requirements: MDT-077

**Source**: [MDT-077-cli-project-management-tool.md](../MDT-077-cli-project-management-tool.md)
**Generated**: 2026-02-08
**CR Type**: Feature Enhancement

## Overview

Implement a CLI project management tool that provides consistent project operations across CLI, Web UI, and MCP interfaces. The system enables users to create, list, update, delete, and enable/disable projects through command-line interface while ensuring consistent behavior across all interfaces. Three configuration deployment modes are supported: complete project definitions in one location, split between discovery and operational details, or automatic discovery.

## Behavioral Requirements

### BR-1: Project Lifecycle Operations

**Goal**: Users can manage projects through CLI commands for create, list, update, delete, and enable/disable operations.

1. WHEN creating a project with valid parameters, the system shall create the project with auto-generated uppercase code or user-provided code (accepts lowercase input, converts to uppercase per CONFIG_SPECIFICATION.md regex).
2. WHEN listing projects, the system shall display all registered projects with their active status, name, code, and path.
3. WHEN retrieving project details by code or path, the system shall display complete project information including configuration.
4. WHEN updating a project with valid parameters, the system shall modify project attributes and persist changes to configuration.
5. WHEN deleting a project, the system shall remove the project from registry after explicit confirmation.
6. WHEN enabling a project, the system shall set active status to true and persist.
7. WHEN disabling a project, the system shall set active status to false and persist.

### BR-2: Configuration Schema Validation

**Goal**: All project configurations follow the specification with proper validation before acceptance.

1. WHEN creating projects, the system shall validate that the project code matches the required pattern of 2-5 characters (first uppercase letter, rest uppercase letters or digits) per CONFIG_SPECIFICATION.md regex `/^[A-Z][A-Z0-9]{1,4}$/`.
2. WHEN validating projects, the system shall ensure the project identifier equals the directory name exactly.
3. WHEN encountering git worktrees, the system shall skip projects where identifiers don't match directory names.
4. WHEN setting up document discovery, the system shall automatically exclude the tickets path from document scanning.
5. WHEN writing configurations, the system shall follow the defined TOML structure.
6. WHEN validating project names, the system shall check for non-empty string values.
7. WHEN validating paths, the system shall ensure paths exist and are accessible.

### BR-3: Configuration Deployment Strategies

**Goal**: Users can choose where project configuration is stored based on deployment needs.

1. WHEN creating projects without flags (default mode), the system shall store minimal discovery data in global registry and complete operational details in project-local configuration.
2. WHEN creating projects with `--global-only` flag, the system shall store complete project definition in global registry without creating project-local configuration.
3. WHEN creating projects in auto-discovery paths (auto-discovery mode), the system shall create only project-local configuration without global registry entry.
4. WHEN scanning for projects, the system shall auto-discover projects with project-local configuration within configured search paths.
5. WHILE reading projects in default mode, the system shall combine global registry discovery data with complete project-local configuration.

### BR-4: Cross-Interface Consistency

**Goal**: Users experience consistent behavior across CLI, Web UI, and MCP interfaces.

1. WHEN a project is created via CLI, the system shall ensure Web UI can read and display the project.
2. WHEN a project is updated via CLI, the system shall ensure MCP tools can read updated configuration.
3. WHILE project operations execute, the system shall use shared validation rules across all interfaces.
4. IF configuration is invalid, THEN all interfaces shall report identical validation errors.
5. WHEN implementing CRUD operations, all interfaces shall produce identical results for the same project.

### BR-5: Error Handling and User Feedback

**Goal**: Users receive clear, actionable error messages for all failure scenarios.

1. WHEN rejecting configurations, the system shall provide detailed error messages with field name and validation rule.
2. WHEN validation fails, the system shall exit with appropriate error code and display specific validation details.
3. WHEN project is not found, the system shall exit with appropriate error code and suggest available projects.
4. WHEN file system errors occur, the system shall exit with appropriate error code and display error details.
5. WHEN path input contains `~` in interactive mode, the system shall resolve to home directory.

### BR-6: Concurrent Operation Safety

**Goal**: System handles concurrent operations safely without data corruption.

1. WHILE multiple CLI operations execute, the system shall prevent concurrent modifications to the same project.
2. WHEN file system operation fails during project update, the system shall preserve original state and report error.
3. IF global registry and project-local configuration become inconsistent, THEN the system shall detect and report inconsistency.
4. WHEN project operations are interrupted, the system shall not leave partial or corrupted configuration files.

## Constraints

| Concern | Requirement |
|---------|-------------|
| C1: Legacy Config | SHALL NOT support legacy configuration formats or fields not mentioned in CONFIG_SPECIFICATION.md |
| C2: ProjectConfig Removal | MUST delete ProjectConfig class entirely and use LocalProjectConfig only |
| C3: Shared API Usage | All configuration generation code must use shared ConfigurationGenerator.generateMdtConfig API (find and refactor all places) |
| C4: Repository Pattern | All project configuration (.toml) writes (including tests) must go through repository class only |
| C5: Code Format | Project codes must be 2-5 uppercase letters (first uppercase, rest uppercase letters/digits), auto-converted from user input |
| C6: Test Coverage | CLI operations must achieve >90% test coverage |
| C7: Concurrency | Concurrent operations across CLI, Web UI, and MCP must not corrupt project data |
| C8: Interface Consistency | All interfaces (CLI, Web UI, MCP) must use shared business logic from shared/services |
| C9: Path Security | CLI path inputs must be validated against path traversal attacks before filesystem operations |

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Configuration Schema section), tasks.md (Verify no legacy code or fields) |
| C2 | architecture.md (ProjectConfig removal), tasks.md (Delete ProjectConfig, refactor all usages) |
| C3 | architecture.md (Shared Services section), tasks.md (Find and refactor all config generation code to use shared APIs) |
| C4 | architecture.md (Repository Pattern section), tests.md (Repository tests including test file config writes) |
| C5 | architecture.md (Validation section), tasks.md (Code generation logic) |
| C6 | architecture.md (Testing Strategy), tasks.md (Test coverage verification) |
| C7 | architecture.md (Concurrency handling), tests.md (Concurrent operation tests) |
| C8 | architecture.md (Service layer), tasks.md (Shared service usage) |
| C9 | architecture.md (Path traversal security), tests.md (Security tests for path inputs) |

---
*Generated by /mdt:requirements*
