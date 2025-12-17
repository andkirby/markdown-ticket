# TOML Configuration Specification for Markdown Ticket Board

## Overview

This specification defines the TOML configuration format for project management, covering project discovery, configuration storage, and document discovery settings.

## Configuration Architecture

### Dual-Configuration System

The system uses a dual-configuration approach:

1. **Global Registry** (`~/.config/markdown-ticket/projects/{project-dir}.toml`):
   - Minimal discovery metadata
   - Enables multi-project support
   - Created/updated via UI

2. **Local Configuration** (`{project}/.mdt-config.toml`):
   - Operational details: name, code, CR path, repository
   - `document_paths` array for document discovery
   - `exclude_folders` for filtering
   - Counter tracking in `.mdt-next` file

### Configuration Files

| File | Purpose | Scope |
|------|---------|-------|
| `~/.config/markdown-ticket/projects/{project-dir}.toml` | Project Registry | Global |
| `{project}/.mdt-config.toml` | Project Configuration | Local |
| `{project}/.mdt-next` | Counter File | Local |

## Schema Definition

### Project Registry

**File**: `~/.config/markdown-ticket/projects/{project-dir}.toml`

```toml
[project]
path = "/path/to/project"
active = true                       # optional, default true

[metadata]
dateRegistered = "2025-09-07"
```

**Schema**:

| Field | Type | Required | Description |
|-------|------|---------|-------|
| `path` | string | Required | Absolute path to project directory |
| `active` | boolean | Optional | Whether project is visible (default: true) |
| `dateRegistered` | string | Auto | Date project was registered |

**Schema - [project] section**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Required | - | Display name for the project |
| `code` | string | Required | - | Unique project identifier (2-5 uppercase letters) |
| `id` | string | **Required** | - | **Must match directory name exactly** |
| `ticketsPath` | string | Optional | "docs/CRs" | Relative path to tickets directory |
| `description` | string | Optional | - | Project description |
| `repository` | string | Optional | - | Repository URL |
| `active` | boolean | Optional | true | Whether project is visible |

**Schema - [project.document] section**:

| Field | Type | Required | Default | Range | Description |
|-------|------|----------|---------|-------|-------------|
| `paths` | array | Optional | [] | - | Paths to documentation (files, dirs, globs) |
| `excludeFolders` | array | Optional | [] | - | Folder names to exclude from discovery |
| `maxDepth` | number | Optional | 3 | 1-10 | Maximum directory depth for scanning |

## Key Constraints

### Project Clone Prevention with Git Worktrees

**Rule**: `config.project.id` must equal the directory basename

**Implementation**:
```bash
# Main repository - ACCEPTED
/path/to/SuperDRuper/.mdt-config.toml
  → id = "SuperDRuper" = basename("SuperDRuper") ✅

# Git worktree - IGNORED (prevents duplication)
/path/to/SuperDRuper-new-worktree/.mdt-config.toml
  → id = "SuperDRuper" ≠ basename("SuperDRuper-new-worktree") ❌
```

### Project Code Format
- Must be 2-5 uppercase letters and digits
- Must be unique across all projects
- Regex: `/^[A-Z]{2,5}$/`

## Document Discovery Configuration

The document viewer integrates with project configuration to provide markdown file browsing.

### Discovery Behavior

1. **Exclusion First**: Any path containing folder name in `excludeFolders` is excluded
2. **Auto-Exclusion**: `ticketsPath` is automatically added to exclusions
3. **Scanning**: System scans `paths` for `.md` files up to `maxDepth` levels
4. **Path Types**:
   - **Files**: Direct path to specific markdown (depth doesn't apply)
   - **Directories**: Recursively scanned for `.md` files
   - **Globs**: Supports `*.md` patterns

### Default Exclude Folders
```toml
excludeFolders = [
    "node_modules",    # Dependencies
    ".git",           # Git files
    ".venv",          # Python virtual environments
    "venv",           # Alternative Python venv
    ".idea",          # JetBrains IDE
    ".vscode",        # VS Code
    "test-results",   # Test outputs
    "dist",           # Build artifacts
    "coverage"        # Coverage reports
]
```

## Configuration Examples

### Minimal Configuration
```toml
[project]
name = "Simple Project"
code = "SP"
id = "simple-project"
ticketsPath = "docs/tickets"
```

### Complete Configuration
```toml
[project]
name = "My Web Application"
code = "WEB"
id = "my-web-app"
ticketsPath = "docs/tickets"
description = "Full-stack web application with React and Node.js"
repository = "https://github.com/user/my-web-app"
active = true

[project.document]
paths = [
    "README.md",
    "docs",
    "src",
    "architecture",
    "deployment/*.md"
]
excludeFolders = [
    "node_modules",
    ".git",
    "build",
    "dist",
    "coverage",
    ".env"
]
maxDepth = 4
```

## Validation Rules

### Project Validation
- Project `code` must be unique across all projects
- Project `ticketsPath` directory must exist and be readable (or be created)
- `active` must be boolean
- `id` must match directory basename exactly

### Documentation Validation
- `project.document.paths` entries must be valid relative paths from project root
- `project.document.excludeFolders` entries must be folder names (not full paths)
- `project.document.maxDepth` must be a positive integer (1-10)
- Glob patterns in `project.document.paths` must be valid
- Referenced files/directories in `project.document.paths` should exist

### Registry Validation
- Registry `path` must exist and be accessible
- Registry files must be valid TOML
- `dateRegistered` must be in YYYY-MM-DD format

## System Integration

### Configuration Loading Priority
1. **Discovery**: Auto-discover projects in `searchPaths` (from global config)
2. **Registry**: Load registered projects from global registry
3. **Local Config**: Read project-specific settings from `.mdt-config.toml`

### Project Activation
- `active = true` (default): Project visible and accessible
- `active = false`: Project hidden but configuration files remain intact
- Status stored in both local and global registry configs

---

**Related Documentation**:
- [Global Configuration Specification](./CONFIG_GLOBAL_SPECIFICATION.md) - System-wide settings