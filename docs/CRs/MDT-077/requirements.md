# Requirements: MDT-077

**Source**: [MDT-077](../../../docs/CRs/MDT-077.md)
**Generated**: 2025-12-16
**CR Type**: Architecture

## Introduction

This specification defines behavioral requirements for a CLI project management system that provides consistent operations across multiple interfaces. The system eliminates code duplication through a shared service layer and supports three configuration strategies for different deployment scenarios.

## Requirements

### Requirement 1: Project Creation Operations

**Objective**: As a user, I want to create projects with consistent configuration, so that all interfaces work with identical project metadata.

#### Acceptance Criteria

1. WHEN a user initiates project creation with valid parameters, the system SHALL create a project configuration within 2 seconds.
2. WHEN a user specifies global-only mode, the system SHALL store complete configuration only in the global registry.
3. WHEN a user specifies project-first mode, the system SHALL store minimal reference in global registry and complete configuration locally.
4. WHEN a user creates a project without specifying mode, the system SHALL default to project-first mode.
5. IF required project parameters are missing or invalid, THEN the system SHALL reject creation with specific error details.

### Requirement 2: Configuration Strategy Management

**Objective**: As a user, I want flexible configuration storage options, so that projects can be managed according to deployment needs.

#### Acceptance Criteria

1. WHEN operating in project-first mode, the system SHALL discover projects by merging global reference with local configuration.
2. WHEN operating in global-only mode, the system SHALL use complete configuration from global registry without local files.
3. WHEN operating in auto-discovery mode, the system SHALL scan configured search paths for local configurations.
4. WHILE any strategy is active, the system SHALL validate that project identifier matches directory name.
5. IF a project's identifier does not match its directory name, THEN the system SHALL exclude it from discovery results.

### Requirement 3: Project Information Consistency

**Objective**: As a user, I want to see consistent project information across all interfaces, so that CLI, Web UI, and MCP provide identical data.

#### Acceptance Criteria

1. WHEN multiple interfaces request project information, the system SHALL return identical metadata for the same project.
2. WHEN project information is requested, the system SHALL validate all fields before returning data.
3. WHILE project operations are in progress, the system SHALL maintain data consistency across all interfaces.
4. IF validation detects invalid project codes, THEN the system SHALL normalize them to 2-5 uppercase characters.
5. IF validation detects configuration format errors, THEN the system SHALL reject the operation with specific error messages.

### Requirement 4: Document Discovery Management

**Objective**: As a user, I want automatic document discovery that respects project configuration, so that relevant documents are available without manual setup.

#### Acceptance Criteria

1. WHEN scanning for documents, the system SHALL automatically exclude the tickets path from discovery results.
2. WHEN processing exclude folders, the system SHALL exclude any path containing excluded folder names at any depth.
3. WHEN document discovery runs, the system SHALL respect the maximum depth configuration setting.
4. WHILE document discovery is active, the system SHALL not scan excluded folders.
5. IF document depth exceeds configured maximum, THEN the system SHALL stop scanning that path branch.

### Requirement 5: Caching and Performance

**Objective**: As a user, I want fast project operations, so that I can work efficiently without delays.

#### Acceptance Criteria

1. WHEN project listings are requested, the system SHALL return cached results when cache age is under 30 seconds.
2. WHEN configuration changes occur, the system SHALL invalidate the project cache immediately.
3. WHILE cache is valid, the system SHALL serve project information from cache without file system access.
4. IF cache expiry occurs, THEN the system SHALL refresh cache with latest file system data.
5. IF multiple concurrent operations request data, THEN the system SHALL share cache updates without redundant file reads.

### Requirement 6: Command Line Interface Operations

**Objective**: As a user, I want comprehensive CLI commands, so that I can manage projects entirely from command line.

#### Acceptance Criteria

1. WHEN executing CLI commands, the system SHALL validate all arguments before processing.
2. WHEN CLI operations fail, the system SHALL exit with appropriate error codes (0=success, 1=error, 2=validation, 3=not_found, 6=cancelled).
3. WHEN CLI output is requested in JSON format, the system SHALL provide structured machine-readable results.
4. WHILE CLI commands execute, the system SHALL provide progress feedback for operations exceeding 2 seconds.
5. IF required flags are missing, THEN the system SHALL display usage information and exit with validation error.

### Requirement 7: Project Discovery and Registration

**Objective**: As a user, I want automatic project discovery, so that projects are available without manual registration.

#### Acceptance Criteria

1. WHEN system starts, the system SHALL scan configured search paths for projects.
2. WHEN new projects are discovered, the system SHALL register them automatically if auto-discovery is enabled.
3. WHEN global registry is scanned, the system SHALL validate that referenced projects exist at specified paths.
4. WHILE discovery runs, the system SHALL skip directories without valid configuration files.
5. IF a referenced project cannot be found, THEN the system SHALL remove it from the active project list.

### Requirement 8: Configuration Validation

**Objective**: As a user, I want configuration validation, so that errors are caught early with clear messages.

#### Acceptance Criteria

1. WHEN configuration files are loaded, the system SHALL validate all required fields are present.
2. WHEN project codes are validated, the system SHALL enforce 2-5 uppercase character format.
3. WHEN paths are validated, the system SHALL verify they exist and are accessible.
4. WHILE validation runs, the system SHALL collect all errors before reporting.
5. IF validation fails, THEN the system SHALL provide specific error messages for each invalid field.

### Requirement 9: Error Handling and Recovery

**Objective**: As a user, I want clear error messages with recovery guidance, so that I can resolve issues efficiently.

#### Acceptance Criteria

1. WHEN file system errors occur, the system SHALL provide error messages with permission and path details.
2. WHEN configuration conflicts exist, the system SHALL identify specific conflicting fields.
3. WHEN operations fail, the system SHALL maintain system state without partial updates.
4. WHILE retry operations run, the system SHALL implement exponential backoff with maximum 3 attempts.
5. IF project creation fails midway, THEN the system SHALL clean up any created files or registry entries.

### Requirement 10: Multi-Interface Synchronization

**Objective**: As a user, I want real-time synchronization across interfaces, so that changes made in one interface are immediately visible in others.

#### Acceptance Criteria

1. WHEN project information changes through any interface, the system SHALL broadcast updates to all connected clients.
2. WHEN multiple interfaces modify the same project, the system SHALL apply changes in sequence with last-writer-wins.
3. WHILE synchronization is active, the system SHALL maintain consistency of project metadata.
4. IF synchronization conflicts occur, THEN the system SHALL resolve them using timestamp comparison.
5. IF an interface disconnects during operations, THEN the system SHALL complete in-progress operations and queue updates for reconnection.

---

## Artifact Mapping

| Req ID | Requirement Summary | Primary Artifact | Integration Points |
|--------|---------------------|------------------|-------------------|
| R1.1 | Project creation operations | `shared/services/ProjectService.ts` | CLI tools, Web UI controllers |
| R1.2 | Global-only configuration storage | `shared/services/ProjectService.ts` | Global registry storage |
| R1.3 | Project-first configuration storage | `shared/services/ProjectService.ts` | Local config files |
| R2.1 | Project-first discovery merging | `shared/services/ProjectService.ts` | Configuration merger |
| R2.2 | Global-only discovery | `shared/services/ProjectService.ts` | Global registry reader |
| R2.3 | Auto-discovery scanning | `shared/services/ProjectService.ts` | File system scanner |
| R3.1 | Cross-interface consistency | `shared/services/ProjectService.ts` | All interface adapters |
| R3.2 | Project information validation | `shared/tools/ProjectValidator.ts` | Validation layer |
| R4.1 | Tickets path exclusion | Document discovery service | Configuration processor |
| R4.2 | Exclude folder matching | Document discovery service | Path filtering logic |
| R5.1 | 30-second project listing cache | Caching service | Project service |
| R5.2 | Cache invalidation on changes | Caching service | File system watcher |
| R6.1 | CLI argument validation | `shared/tools/project-cli.ts` | Argument parser |
| R6.2 | CLI error code handling | `shared/tools/project-cli.ts` | Exit code manager |
| R7.1 | Search path scanning | `shared/services/ProjectService.ts` | Discovery engine |
| R7.2 | Project registration | `shared/services/ProjectService.ts` | Registry manager |
| R8.1 | Configuration field validation | `shared/tools/ProjectValidator.ts` | Schema validator |
| R8.2 | Project code format validation | `shared/tools/ProjectValidator.ts` | Code format checker |
| R9.1 | File system error handling | Error handling service | File operations |
| R9.2 | Conflict detection and reporting | Error handling service | Conflict resolver |
| R10.1 | Real-time update broadcasting | SSE event system | Event broadcaster |
| R10.2 | Multi-interface conflict resolution | Conflict resolution service | Timestamp comparator |

## Traceability

| Req ID | CR Section | Acceptance Criteria |
|--------|------------|---------------------|
| R1.1-R1.5 | Problem | Eliminate multiple code paths |
| R2.1-R2.5 | Architecture Patterns | Three-strategy configuration |
| R3.1-R3.5 | Problem | Ensure consistent behavior |
| R4.1-R4.5 | Implementation Guidelines | Document discovery behavior |
| R5.1-R5.5 | Caching Strategy Pattern | Performance requirements |
| R6.1-R6.5 | CLI API Design Patterns | Command structure |
| R7.1-R7.5 | Integration Patterns | Project discovery |
| R8.1-R8.5 | Validation Layer Pattern | Configuration validation |
| R9.1-R9.5 | Error Handling Pattern | Error recovery |
| R10.1-R10.5 | Success Criteria | Multi-interface synchronization |

## Non-Functional Requirements

### Performance
- WHEN project operations execute, the system SHALL complete single project operations within 2 seconds.
- WHEN caching is active, the system SHALL reduce project listing time by at least 85% compared to uncached operations.
- WHILE system is under normal load, the system SHALL maintain memory usage below 50MB for all operations.

### Reliability
- IF file system operations fail, the system SHALL implement retry logic with exponential backoff.
- IF partial failures occur during multi-step operations, the system SHALL roll back to original state.
- WHILE system is operating, the system SHALL maintain data consistency across all interfaces.

### Consistency
- WHEN configuration changes are made, the system SHALL apply changes atomically across all storage locations.
- WHEN multiple interfaces access project data, the system SHALL provide identical results for the same project.
- WHILE cache updates occur, the system SHALL prevent serving stale data for more than 30 seconds.

### Usability
- WHEN CLI commands fail, the system SHALL provide specific error messages with actionable guidance.
- WHEN validation errors occur, the system SHALL indicate exactly which fields are invalid and why.
- IF required parameters are missing, the system SHALL display clear usage examples.

---
*Generated from MDT-077 by /mdt:requirements*