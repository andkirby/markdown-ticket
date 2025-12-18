# Project Creation Guide

## Overview

This document defines the three project creation strategies used by the CLI project management tool. These strategies determine which configuration files are created during project setup based on project location and user preferences.

## Configuration Creation Strategies

When creating projects, the system uses three strategies based on project location and explicit flags:

### 1. Project-First Mode (Default)

**When**: Project created outside auto-discovery paths (without `--global-only` flag)

**Behavior**:
- Creates global registry entry: `~/.config/markdown-ticket/projects/{project-dir}.toml` (minimal)
- Creates local configuration: `{project}/.mdt-config.toml` (complete)
- Project is explicitly registered and visible

**Use Cases**:
- Standard development workflows
- Projects that should appear in project listings
- Manual project management

**Example**:
```bash
# Creates outside auto-discovery paths → Project-First mode
npm run project:create -- --path "/outside/search/path" --name "My Project" --code "MP"
```

### 2. Global-Only Mode

**When**: Explicitly requested via `--global-only` flag

**Behavior**:
- Creates global registry entry with complete configuration
- No local `.mdt-config.toml` file created
- All configuration stored centrally

**Use Cases**:
- Centralized configuration management
- Environments where local files should be minimized
- Temporary project setups

**Example**:
```bash
# Explicit flag → Global-Only mode
npm run project:create -- --path "/any/path" --name "Central Project" --code "CP" --global-only
```

### 3. Auto-Discovery Mode

**When**: Project created within configured auto-discovery search paths

**Behavior**:
- Creates only local `.mdt-config.toml` file
- No global registry entry created
- Project discovered automatically via search paths
- Requires global configuration with `searchPaths` set

**Use Cases**:
- Projects within standard development directories
- Containerized or ephemeral environments
- Auto-managed project repositories
- Development environments with consistent project structures

**Prerequisites**:
Auto-discovery must be enabled in global configuration (`~/.config/markdown-ticket/config.toml`):

```toml
[discovery]
autoDiscover = true
searchPaths = ["~/projects", "~/workspace", "~/dev"]
```

**Example**:
```bash
# Creates within auto-discovery path → Auto-Discovery mode
npm run project:create -- --path "~/projects/my-project" --name "Auto Project" --code "AP"
# Auto-discovery is automatic based on project location within configured search paths
```

## Strategy Selection Logic

The system follows this decision tree when creating projects:

```
IF project_path IN auto_discovery_paths:
    → Auto-Discovery Mode
ELIF flag --global-only specified:
    → Global-Only Mode
ELSE:
    → Project-First Mode
```

**Configuration Sources**:
- Auto-discovery paths defined in global configuration file (`~/.config/markdown-ticket/config.toml`)
- No default search paths - must be explicitly configured by user
- Search paths support tilde expansion (`~`), absolute paths, and relative paths
- Maximum scanning depth: 3 levels (hardcoded)

## File Creation by Strategy

| Strategy | Global Registry File | Local Config File |
|----------|---------------------|-------------------|
| Project-First | ✅ Minimal entry | ✅ Complete config |
| Global-Only | ✅ Complete config | ❌ None |
| Auto-Discovery | ❌ None | ✅ Complete config |

## Implementation Details

### CLI Command Flags

- `--global-only`: Force Global-Only mode regardless of path
- `--path <directory>`: Specify project location (affects strategy selection)

### Configuration Loading Priority

Regardless of creation strategy, the system loads configurations in this order:
1. **Discovery**: Auto-discover projects in configured search paths (if enabled)
2. **Registry**: Load registered projects from global registry
3. **Local Config**: Read project-specific settings from `.mdt-config.toml`

### Caching Behavior

The system includes a 30-second cache for project listings:
- Projects are cached for 30 seconds after loading
- Cache is invalidated when projects are created, updated, or deleted
- File watching automatically invalidates cache on configuration changes
- No separate TTL for auto-discovery - uses general project cache

## Auto-Discovery Configuration

### Global Configuration File

Auto-discovery is controlled by the global configuration file at `~/.config/markdown-ticket/config.toml`:

```toml
[discovery]
autoDiscover = true                    # Enable/disable auto-discovery
searchPaths = ["~/projects", "~/workspace", "~/dev"]  # Directories to scan
```

### Configuration Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `autoDiscover` | boolean | Optional | `false` | Whether to scan for projects automatically |
| `searchPaths` | array | Optional | `[]` | Directories to scan for `.mdt-config.toml` files |

### Path Configuration Details

**Supported Path Types**:
- **Tilde expansion**: `~/projects` → `/home/username/projects`
- **Absolute paths**: `/opt/workspaces`, `/Users/username/dev`
- **Relative paths**: `../projects` (converted to absolute from config location)

**Scanning Behavior**:
- Maximum depth: 3 levels (hardcoded, not configurable)
- Skips hidden directories (starting with `.`)
- Excludes common directories: `node_modules`, `.git`, `.idea`, `.vscode`
- Looks for directories containing `.mdt-config.toml` files
- Validates each found configuration before adding to project list

### Configuration Examples

**Basic Development Setup**:
```toml
[discovery]
autoDiscover = true
searchPaths = ["~/projects", "~/workspace"]
```

**Multi-Environment Setup**:
```toml
[discovery]
autoDiscover = true
searchPaths = [
    "~/projects",
    "~/workspace",
    "/opt/workspaces",
    "~/dev",
    "/home/user/development"
]
```

**Disabled Auto-Discovery**:
```toml
[discovery]
autoDiscover = false
searchPaths = []
```

**Container/CI Environment**:
```toml
[discovery]
autoDiscover = true
searchPaths = ["/workspace", "/app/projects"]
```

### Error Handling

**Auto-Discovery Error Handling**:
- Invalid search paths are logged but don't prevent startup
- Missing `.mdt-config.toml` files are silently skipped
- Malformed configurations generate warnings but scanning continues
- Permission errors on directories are ignored with warnings
- Duplicate projects (by path or ID) are skipped with warnings

**Common Issues and Solutions**:

1. **Projects not appearing**:
   - Verify `autoDiscover = true` in global config
   - Check that project directory contains `.mdt-config.toml`
   - Confirm project path is in `searchPaths` array

2. **Performance issues**:
   - Reduce number of search paths
   - Move projects to shallower directory structures
   - Consider disabling auto-discovery for large file systems

3. **Permission errors**:
   - Ensure read access to search paths
   - Check file permissions on `.mdt-config.toml` files

## Migration Between Strategies

Projects can be converted between strategies through manual configuration changes:

```bash
# Convert from Auto-Discovery to Project-First
# Manually create global registry entry:
mkdir -p ~/.config/markdown-ticket/projects
cat > ~/.config/markdown-ticket/projects/{project-dir}.toml << EOF
[project]
path = "/absolute/path/to/project"
active = true
EOF

# Convert from Project-First to Global-Only
# Move complete configuration to global registry and delete local config
npm run project:get -- --id "PROJECT" --json > temp.json
# Manually edit global registry with complete config
rm {project-path}/.mdt-config.toml

# Convert from Global-Only to Auto-Discovery
# Delete global registry entry to rely on path-based discovery
rm ~/.config/markdown-ticket/projects/{project-dir}.toml
```

## Error Handling

### Path Validation
- Project path must exist and be accessible
- Parent directories must be writable for file creation
- Project directory must be empty or non-existent

### Strategy Conflicts
- `--global-only` flag overrides auto-discovery path detection
- Invalid path combinations generate clear error messages
- Permission issues are reported with suggested resolutions

## Best Practices

### Choose Strategy Based On:

1. **Project Lifespan**:
   - Long-term projects → Project-First
   - Temporary projects → Global-Only or Auto-Discovery

2. **Environment Type**:
   - Development machines → Project-First
   - CI/CD containers → Auto-Discovery
   - Shared servers → Global-Only

3. **Management Preference**:
   - Manual control → Project-First
   - Automation-friendly → Auto-Discovery
   - Centralized admin → Global-Only

### Configuration Consistency

Regardless of strategy, all projects must:
- Follow schema defined in [CONFIG_SPECIFICATION.md](../../CONFIG_SPECIFICATION.md)
- Use LocalProjectConfig interface (not ProjectConfig)
- Validate project ID matches directory basename
- Enforce project code format `/^[A-Z]{2,5}$/`

---

**Related Documents**:
- [CONFIG_SPECIFICATION.md](../../CONFIG_SPECIFICATION.md) - Configuration file formats
- [requirements.md](./requirements.md) - Behavioral requirements
- [project-config.md](./project-config.md) - Interface refactoring details