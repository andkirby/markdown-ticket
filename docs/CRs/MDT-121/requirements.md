# Requirements: MDT-121

**Source**: [MDT-121](../MDT-121-implement-single-project-mode-for-mcp-server.md)
**Generated**: 2026-02-05

## Overview

Auto-detect project context from `.mdt-config.toml` at MCP server startup, making the `project` parameter optional for tool calls. Users benefit from shorter tool calls (`get_cr(key=5)` instead of `get_cr(key=5, project="MDT")`) when working within a single project. Key constraint: preserve backward compatibility for multi-project scenarios.

## Behavioral Requirements

### BR-1: Project Auto-Detection at Startup

**Goal**: Automatically detect the default project when server starts from a project directory.

1. WHEN the MCP server initializes, the system shall search for `.mdt-config.toml` in the current working directory and parent directories up to the configured search depth.
2. WHEN `.mdt-config.toml` is found, the system shall extract the `project.code` value as the default project.
3. WHEN no `.mdt-config.toml` is found within the search depth, the system shall operate in multi-project mode with no default project.
4. WHEN a default project is detected, the system shall log "Single-project mode: {PROJECT_CODE}" at startup.
5. WHEN no default project is detected, the system shall log "Multi-project mode" at startup.

### BR-2: Optional Project Parameter Resolution

**Goal**: Allow tool calls to omit `project` parameter when a default is detected.

1. WHEN a tool call includes an explicit `project` parameter, the system shall use the explicit value regardless of default project.
2. WHEN a tool call omits the `project` parameter and a default project exists, the system shall use the default project.
3. WHEN a tool call omits the `project` parameter and no default project exists, the system shall return an error with message "No project context available. Either start MCP server from a project directory with `.mdt-config.toml`, or provide the `project` parameter explicitly."

### BR-3: Numeric Key Shorthand Support

**Goal**: Enable users to reference tickets by numeric shorthand when project context is available.

1. WHEN a `key` parameter contains only digits (e.g., `5`, `005`), the system shall normalize to `{PROJECT}-{NUMBER}` format using the resolved project.
2. WHEN normalizing numeric keys, the system shall strip leading zeros from the number portion (e.g., `005` becomes `-5`, not `-005`).
3. WHEN a `key` parameter contains a dash and letters (e.g., `MDT-5`, `abc-12`), the system shall uppercase the project code portion and preserve the number format.
4. WHEN normalizing keys with mixed case project codes, the system shall convert the project code to uppercase (e.g., `abc-12` → `ABC-12`).
5. WHEN a `key` parameter format cannot be determined, the system shall return an error with message "Invalid key format '{key}'. Use numeric shorthand (e.g., 12) or full format (e.g., ABC-12)."

### BR-4: Parent Directory Search Configuration

**Goal**: Allow administrators to control how far up the directory tree the server searches for config.

1. WHILE the `mdtConfigSearchDepth` configuration value is set, the system shall search parent directories up to the specified number of levels.
2. WHEN `mdtConfigSearchDepth` is set to 0, the system shall only check the current working directory.
3. WHEN `mdtConfigSearchDepth` is not configured, the system shall default to searching 3 parent directory levels.
4. WHEN multiple `.mdt-config.toml` files exist in the directory tree, the system shall use the closest one (nearest to the working directory).

### BR-5: Backward Compatibility for Multi-Project Mode

**Goal**: Ensure existing multi-project workflows continue to work without changes.

1. WHEN the server starts from a directory without `.mdt-config.toml`, the system shall require the `project` parameter for all tool calls.
2. WHEN a tool call includes an explicit `project` parameter, the system shall use that value regardless of whether a default project exists.
3. WHEN an explicit `project` parameter is provided in a multi-project context, the system shall resolve the key using the explicit project (including numeric shorthand with the explicit project).

## Constraints

| Concern | Requirement |
|---------|-------------|
| C1: Performance | Project detection at startup shall complete within 50ms |
| C2: Reliability | Project detection failure shall never prevent server startup |
| C3: Backward Compatibility | All existing tool calls with explicit `project` parameter shall work unchanged |

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Runtime Prereqs), tests.md (performance test) |
| C2 | architecture.md (Error Philosophy), tests.md (startup test) |
| C3 | architecture.md (Module Boundaries), tests.md (regression tests) |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `discovery.mdtConfigSearchDepth` | Maximum parent directories to search for `.mdt-config.toml` | 3 | Search 3 levels up |

---

*Generated by /mdt:requirements*
