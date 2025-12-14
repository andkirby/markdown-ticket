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
id = "my-project"                    # Optional: defaults to lowercase code
ticketsPath = "docs/CRs"             # Path to tickets directory
description = "Project description"
repository = "https://github.com/user/repo"
active = true                        # Whether project is active, optional, default true, shall be used if there is no global config

# Document discovery settings
exclude_folders = [
    "docs/CRs",                      # Exclude tickets folder from document discovery
    "node_modules",
    ".git",
    "test-results"
]

# Documentation paths
document_paths = [
    "README.md",                     # Single file from root
    "docs",                         # Directory (scans for .md files)
    "guides/*.md",                  # Glob pattern for specific files
    "architecture"                  # Directory with subdirectories
]
max_depth = 3                         # Maximum directory depth for scanning
```

## Project Configuration

The system uses a dual-configuration approach:

1. **Global Registry**: Minimal discovery information in `~/.config/markdown-ticket/projects/`
2. **Local Configuration**: Operational details in each project's `.mdt-config.toml`

### Local Project Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Required | Display name for the project |
| `code` | string | Required | Unique project identifier (e.g., "MDT", "API") |
| `id` | string | Optional | Project identifier (default: lowercase version of `code`) |
| `ticketsPath` | string | Optional | Relative path to tickets directory (default: "docs/CRs") |
| `description` | string | Optional | Project description |
| `repository` | string | Optional | Repository URL |
| `active` | boolean | Optional | Whether project is visible and accessible (default: true) |
| `document_paths` | array | Optional | Paths to documentation files/directories |
| `exclude_folders` | array | Optional | Folders to exclude from document discovery |
| `max_depth` | number | Optional | Maximum directory depth for document scanning (default: 3) |

### Project Registry Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Required | Absolute path to project directory |
| `active` | boolean | Optional | Whether project is visible and accessible (default: true) |
| `dateRegistered` | string | Auto | Date project was registered |

### Project Examples

**Local Project Configuration** (`.mdt-config.toml`):
```toml
[project]
name = "Markdown Ticket Board"
code = "MDT"
id = "markdown-ticket"
ticketsPath = "docs/CRs"
description = "Kanban-style ticket board using markdown files"
repository = "https://github.com/user/markdown-ticket"
active = true

# Document discovery settings
exclude_folders = [
    "docs/CRs",
    "node_modules",
    ".git",
    "test-results"
]

# Documentation paths
document_paths = [
    "generated-docs",
    "docs",
    "server",
    "shared"
]
max_depth = 3
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
# Document discovery settings
exclude_folders = [
    "docs/CRs",                      # Exclude tickets folder
    "node_modules",                  # Exclude dependencies
    ".git",                         # Exclude git files
    "test-results",                 # Exclude test outputs
    "dist",                         # Exclude build artifacts
    "coverage"                      # Exclude coverage reports
]

# Documentation paths
document_paths = [
    "README.md",                     # Single file from project root
    "docs",                         # Directory (scans for .md files)
    "guides/*.md",                  # Glob pattern for specific files
    "architecture",                 # Directory with subdirectories
    "specs/api.md",                 # Specific file in subdirectory
    "server",                       # Include source code directories
    "shared"
]

max_depth = 3                         # Maximum directory depth for scanning
```

### Document Discovery Rules

1. **Exclusion First**: All paths in `exclude_folders` are filtered out completely
2. **Scanning**: System scans `document_paths` for `.md` files up to `max_depth` levels
3. **Single Files**: Direct path to specific markdown files
4. **Directories**: Recursively scanned for `.md` files up to `max_depth` levels
5. **Glob Patterns**: Supports `*.md` patterns for flexible file matching
6. **Final Filter**: Only `.md` files are displayed in the document tree

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
- `document_paths` entries must be valid file/directory paths relative to project root
- `exclude_folders` entries must be valid directory paths relative to project root
- `max_depth` must be a positive integer (1-10)
- Glob patterns in `document_paths` must be valid
- Referenced files/directories in `document_paths` should exist

### Sorting Validation
- System attributes (`code`, `title`, `dateCreated`, `lastModified`) cannot be removed
- Custom attributes must have valid `name`, `label`, and `default_direction`
- `default_direction` must be "asc" or "desc"