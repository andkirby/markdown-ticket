# TOML Configuration Specification for Markdown Ticket Board

## Overview

This document specifies the TOML configuration file format for the markdown-ticket application, covering project discovery, management, and UI preferences.

## Configuration File Locations

**Global Configuration**: `~/.config/markdown-ticket/config.toml`
**User Preferences**: `~/.config/markdown-ticket/user.toml`
**Project Registry**: `~/.config/markdown-ticket/projects/{project-dir}.toml`
**Local Project Config**: `{project}/.mdt-config.toml`

## Configuration Structure

### Global Configuration (`~/.config/markdown-ticket/config.toml`)

```toml
# Project Discovery Settings
[discovery]
autoDiscover = true
searchPaths = [
    "/Users/username/home",
    "/Users/username/projects"
]

# Server Configuration
[server]
port = 3001 
host = "localhost"
cors = { origin = ["http://localhost:5173"], credentials = true }

# Cache Configuration
[cache]
ttl = 3600  # Cache TTL in seconds (default: 1 hour)
```

### Discovery Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `autoDiscover` | boolean | Optional | `true` | Enable automatic project discovery in search paths |
| `searchPaths` | array | Optional | `[]` | Directories to scan for projects with `.mdt-config.toml` files |

**Example:**
```toml
[discovery]
autoDiscover = true
searchPaths = [
    "~/home",
    "~/projects",
    "/opt/work"
]
```

### Cache Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ttl` | integer | Optional | `3600` | Cache TTL in seconds (file operations cache expiration) |

**Example:**
```toml
[cache]
ttl = 7200  # 2 hours cache TTL
```

**Notes:**
- Cache TTL applies to file metadata and content caching
- Set to `0` to disable TTL (cache until manual clear or file change)
- Minimum recommended value: `300` (5 minutes)
- File watcher invalidation works regardless of TTL setting

When `autoDiscover` is enabled, the system scans `searchPaths` for directories containing `.mdt-config.toml` files and automatically registers them as available projects.

### User Preferences (`~/.config/markdown-ticket/user.toml`)

```toml
# Sorting Configuration
[sorting]
attributes = [
    { name = "code", label = "Key", default_direction = "desc", system = true },
    { name = "title", label = "Title", default_direction = "asc", system = true },
    { name = "dateCreated", label = "Created Date", default_direction = "desc", system = true },
    { name = "lastModified", label = "Update Date", default_direction = "desc", system = true },
    { name = "priority", label = "Priority", default_direction = "desc", system = false }
]

[sorting.preferences]
selected_attribute = "lastModified"
selected_direction = "desc"

# UI preferences
[ui]
autoRefresh = true
refreshInterval = 30
```

### Project Registry (`~/.config/markdown-ticket/projects/{project-dir}.toml`)

```toml
[project]
path = "/path/to/project"
active = true # optional, default true

[metadata]
dateRegistered = "2025-09-07"
```

### Local Project Configuration (`{project}/.mdt-config.toml`)

```toml
[project]
name = "My Project"
code = "MYPROJ"
id = "MyProject"                    # REQUIRED: Must match directory name
ticketsPath = "docs/CRs"             # Path to tickets directory
description = "Project description"
repository = "https://github.com/user/repo"
active = true                        # Whether project is active, optional, default true

[project.document]
paths = [
    "README.md",                     # Single file from root
    "docs",                         # Directory (scans for .md files)
    "guides/*.md",                  # Glob pattern for specific files
    "architecture"                  # Directory with subdirectories
]
excludeFolders = [
    "node_modules",
    ".git",
    ".venv",
    "venv",
    ".idea",
    "test-results"
]
maxDepth = 3                         # Maximum directory depth for scanning (default: 3)
```

## Project Configuration

The system uses a dual-configuration approach:

1. **Global Registry**: Minimal discovery information in `~/.config/markdown-ticket/projects/`
2. **Local Configuration**: Operational details in each project's `.mdt-config.toml`

### Local Project Schema

#### [project] Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Required | Display name for the project |
| `code` | string | Required | Unique project identifier (e.g., "MDT", "API") |
| `id` | string | **Required** | Project identifier based on directory name (e.g., "SuperDRuper" for `/path/to/SuperDRuper`) |
| `ticketsPath` | string | Optional | Relative path to tickets directory (default: "docs/CRs") |
| `description` | string | Optional | Project description |
| `repository` | string | Optional | Repository URL |
| `active` | boolean | Optional | Whether project is visible and accessible (default: true) |

**Important**: The `id` field is mandatory and **must match the project directory name exactly**. This is a **deduplication mechanism** that prevents project clones and Git worktrees from being added to the projects list.

#### [project.document] Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paths` | array | Optional | Paths to documentation files/directories (supports files, dirs, globs) |
| `excludeFolders` | array | Optional | Folder names to exclude from document discovery (system excludes any path containing these names) |
| `maxDepth` | number | Optional | Maximum directory depth for document scanning (default: 3, range: 1-10) |

### Project Registry Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Required | Absolute path to project directory (essential for discovery) |
| `active` | boolean | Optional | Whether project is visible and accessible (default: true) |
| `dateRegistered` | string | Auto | Date project was registered |

**Important**: The `path` field is required in the global registry as it tells the system where to find the project. The local `.mdt-config.toml` does NOT include a `path` field since its location determines the project root.

### Project Clone Prevention with Git Worktrees

The system uses the `id` field to prevent duplicate projects when using Git worktrees:

**Validation Rule**: `id` must equal the directory basename

**How It Works**:
```bash
# Main repository - ACCEPTED
/path/to/SuperDRuper/.mdt-config.toml
  → id = "SuperDRuper" = basename("SuperDRuper") ✅
  → Added to projects list

# Git worktree - IGNORED (prevents duplication)
/path/to/SuperDRuper-new-worktree/.mdt-config.toml
  → id = "SuperDRuper" ≠ basename("SuperDRuper-new-worktree") ❌
  → Ignored, not added to projects list

# Invalid configuration - IGNORED
/path/to/MyProject/.mdt-config.toml
  → id = "different-name" ≠ basename("MyProject") ❌
  → Ignored, not added to projects list
```

**Implementation**:
- When scanning for projects, the system checks: `config.project.id === basename(projectPath)`
- If they don't match, the project is skipped during discovery
- This ensures only properly configured projects appear in the projects list

**Benefits**:
- Prevents worktree clones from cluttering the projects list
- Ensures project identification consistency
- Maintains a clean, single source of truth for each project

### Project Examples

**Local Project Configuration** (`.mdt-config.toml`):
```toml
[project]
name = "Markdown Ticket Board"
code = "MDT"
id = "markdown-ticket"           # REQUIRED: Must match directory name "markdown-ticket"
ticketsPath = "docs/CRs"
description = "Kanban-style ticket board using markdown files"
repository = "https://github.com/user/markdown-ticket"
active = true

[project.document]
paths = [
    "generated-docs",
    "docs",
    "server",
    "shared"
]
excludeFolders = [
    "node_modules",
    ".git",
    "test-results"
]
maxDepth = 3
```

**Project Registry Entry** (`~/.config/markdown-ticket/projects/markdown-ticket.toml`):
```toml
[project]
path = "~/home/markdown-ticket"
active = true # optional, default true

[metadata]
dateRegistered = "2025-09-07"
```

## Documentation Configuration

The system includes an integrated markdown document viewer with configurable document discovery.

### Document Discovery Configuration

The document viewer uses two complementary settings:

**`exclude_folders`** (top-level array):
- Folders to completely exclude from document discovery
- Useful for ticket directories, build outputs, dependencies
- Applied before scanning any paths

**`document_paths`** (top-level array):
- Paths to include in document discovery
- Supports files, directories, and glob patterns
- Scanned up to `max_depth` levels

**`max_depth`** (top-level):
- Maximum directory depth for scanning (default: 3)
- Prevents infinite recursion in deep directory structures

### Example Configuration

```toml
[project.document]
paths = [
    "README.md",                     # Single file from project root
    "docs",                         # Directory (scans for .md files)
    "guides/*.md",                  # Glob pattern for specific files
    "architecture",                 # Directory with subdirectories
    "specs/api.md",                 # Specific file in subdirectory
    "server",                       # Include source code directories
    "shared"
]
excludeFolders = [
    "node_modules",                  # Exclude dependencies
    ".git",                         # Exclude git files
    ".venv",                        # Python virtual environments
    "venv",                         # Alternative Python venv
    ".idea",                        # JetBrains IDE
    ".vscode",                      # VS Code
    "test-results",                 # Exclude test outputs
    "dist",                         # Exclude build artifacts
    "coverage",                     # Exclude coverage reports
]
maxDepth = 3                         # Maximum directory depth for scanning
```

### Document Discovery Rules

1. **Exclusion First**: Any path containing a folder name in `excludeFolders` is excluded (e.g., "src/.venv/lib" is excluded because it contains ".venv")
2. **Auto-Exclusion**: The `ticketsPath` value (e.g., "docs/CRs") is automatically added to exclusions
3. **Scanning**: System scans `paths` for `.md` files up to `maxDepth` levels
4. **maxDepth Behavior**: Depth is calculated from project root (depth 0 = project root, depth 1 = immediate subdirectories)
5. **Single Files**: Direct path to specific markdown files (depth doesn't apply)
6. **Directories**: Recursively scanned for `.md` files up to `maxDepth` levels
7. **Glob Patterns**: Supports `*.md` patterns for flexible file matching
8. **Final Filter**: Only `.md` files are displayed in the document tree

#### How maxDepth Works
- `maxDepth = 1`: Scan only immediate subdirectories (e.g., `docs/` but not `docs/api/`)
- `maxDepth = 3`: Scan up to 3 levels deep (e.g., `docs/api/v1/endpoint.md` is included)
- The depth limit prevents scanning very deep directory structures like `node_modules`

### Document Viewer Features

- **Tree Navigation**: Collapsible folder structure showing configured paths
- **H1 Title Extraction**: Uses first `# Title` from markdown files as display labels
- **Filename Footnotes**: Shows actual filename below extracted titles
- **Integrated Rendering**: Markdown content rendered within the application
- **View Toggle**: Seamless switching between Board and Documents views

### Configuration Workflow

1. **Unconfigured Projects**: Show PathSelector with checkbox tree interface
2. **User Selection**: Select desired files/folders from project structure
3. **Auto-Configuration**: Selected paths saved to `.mdt-config.toml`
4. **Document Access**: Documents view loads configured content


## System Integration

The configuration system supports:

1. **Automatic Project Discovery**: Scans configured paths for `.mdt-config.toml` files
2. **Project Management**: Dual-config approach with global registry and local settings
3. **User Preferences**: Customizable sorting and UI settings
4. **MCP Integration**: Per-project MCP access control

### Configuration Loading Priority

1. **Discovery**: Auto-discover projects in `searchPaths`
2. **Registry**: Load registered projects from global registry
3. **Local Config**: Read project-specific settings from `.mdt-config.toml`
4. **User Preferences**: Apply user sorting and UI preferences

## Project Activation

The `active` field controls project visibility across all interfaces (CLI, Web UI, MCP):

- **`active = true`** (default): Project is visible and accessible
- **`active = false`**: Project is hidden from listings but configuration files remain intact

### Configuration
```toml
[project]
name = "My Project"
code = "PROJ"
active = false  # Project will be hidden from all interfaces
```

### Behavior
- Disabling a project only hides it from view
- No files or configurations are deleted when `active = false`
- The `active` status is stored in both local and global registry configs

## Configuration Examples

### Complete Global Configuration (`~/.config/markdown-ticket/config.toml`)

```toml
# Project Discovery
[discovery]
autoDiscover = true
searchPaths = [
    "/Users/username/home",
    "/Users/username/projects",
    "/opt/work"
]

# Server Configuration
[server]
port = 3001
host = "localhost"
cors = { origin = ["http://localhost:5173"], credentials = true }

# Cache Configuration
[cache]
ttl = 3600  # 1 hour cache TTL
```

### Complete User Preferences (`~/.config/markdown-ticket/user.toml`)

```toml
# Sorting Configuration
[sorting]
attributes = [
    { name = "code", label = "Key", default_direction = "desc", system = true },
    { name = "title", label = "Title", default_direction = "asc", system = true },
    { name = "dateCreated", label = "Created Date", default_direction = "desc", system = true },
    { name = "lastModified", label = "Update Date", default_direction = "desc", system = true },
    { name = "priority", label = "Priority", default_direction = "desc", system = false },
    { name = "type", label = "Type", default_direction = "asc", system = false }
]

[sorting.preferences]
selected_attribute = "lastModified"
selected_direction = "desc"

# UI Preferences
[ui]
autoRefresh = true
refreshInterval = 30
```

## Configuration Validation

### Discovery Validation
- `searchPaths` must contain valid, readable directory paths
- `autoDiscover` must be boolean

### Project Validation
- Project `code` must be unique across all projects
- Project `ticketsPath` directory must exist and be readable (or be created)
- `active` must be boolean

### Documentation Validation
- `project.document.paths` entries must be valid file/directory paths relative to project root
- `project.document.excludeFolders` entries must be folder names (not full paths)
- `project.document.maxDepth` must be a positive integer (1-10)
- Glob patterns in `project.document.paths` must be valid
- Referenced files/directories in `project.document.paths` should exist

### Sorting Validation
- System attributes (`code`, `title`, `dateCreated`, `lastModified`) cannot be removed
- Custom attributes must have valid `name`, `label`, and `default_direction`
- `default_direction` must be "asc" or "desc"