# Global Configuration Specification (config.toml)

**Extracted from**: [CONFIG_SPECIFICATION.md](./CONFIG_SPECIFICATION.md)

## Overview

This document defines the global system configuration for the markdown-ticket application, 
implies to be located at `~/.config/markdown-ticket/config.toml`. 

This file controls system-wide settings, including all feature configurations, which shall be defined globally.

## File Location

```
~/.config/markdown-ticket/config.toml
```

## Configuration Structure

### Complete Configuration Example

```toml
# Project Discovery Settings
[discovery]
autoDiscover = true
searchPaths = [
    "/Users/username/home",
    "/Users/username/projects",
    "/opt/work"
]

# System Configuration
[system]
cacheTimeout = 30000  # Cache timeout in milliseconds (default: 30 seconds)
logLevel = "info"     # Logging level: error, warn, info, debug

# Links Configuration
[links]
enableAutoLinking = true
enableTicketLinks = true
enableDocumentLinks = true
enableHoverPreviews = true
linkValidation = false
```

## Configuration Sections

### 1. Discovery Configuration (`[discovery]`)

Controls automatic project discovery in specified directories.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `autoDiscover` | boolean | Optional | `true` | Enable automatic project discovery in search paths |
| `searchPaths` | array | Optional | `[]` | Directories to scan for projects with `.mdt-config.toml` files |

#### Detailed Behavior

- When `autoDiscover` is enabled, the system scans `searchPaths` for directories containing `.mdt-config.toml` files
- Discovered projects are automatically registered as available projects
- Each directory in `searchPaths` is scanned recursively (one level deep)
- Only directories with valid `.mdt-config.toml` files are registered

#### Path Expansion

- Supports `~` (tilde) expansion for home directory
- Supports absolute paths
- Paths are validated for existence and readability

#### Example Configurations

**Default discovery (home directory scanning):**
```toml
[discovery]
autoDiscover = true
searchPaths = [
    "~",
    "~/projects"
]
```

**Custom work locations:**
```toml
[discovery]
autoDiscover = true
searchPaths = [
    "/opt/workspaces",
    "/data/projects",
    "/Users/username/home"
]
```

**Disabled discovery (manual registration only):**
```toml
[discovery]
autoDiscover = false
searchPaths = []
```

### 2. System Configuration (`[system]`)

Controls system-wide behavior including caching and logging.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `cacheTimeout` | integer | Optional | `30000` | Cache timeout in milliseconds (default: 30 seconds) |
| `logLevel` | string | Optional | `"info"` | Logging level: "error", "warn", "info", "debug" |

#### Cache Behavior

- Cache timeout applies to file metadata and content caching
- Value is specified in milliseconds
- File watcher invalidation works regardless of timeout setting
- Cache improves performance for repeated file operations

#### Logging Behavior

- Controls verbosity of system logging
- "error": Only error messages
- "warn": Warnings and errors
- "info": General information, warnings, and errors (default)
- "debug": All messages including verbose debugging

#### Example Configurations

**Default settings:**
```toml
[system]
cacheTimeout = 30000  # 30 seconds
logLevel = "info"
```

**Extended cache for network storage:**
```toml
[system]
cacheTimeout = 120000  # 2 minutes
logLevel = "warn"
```

**Debug mode with short cache:**
```toml
[system]
cacheTimeout = 5000   # 5 seconds
logLevel = "debug"
```

### 3. Links Configuration (`[links]`)

Controls automatic link detection and processing behavior.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enableAutoLinking` | boolean | Optional | `true` | Enable automatic link detection |
| `enableTicketLinks` | boolean | Optional | `true` | Enable ticket reference links |
| `enableDocumentLinks` | boolean | Optional | `true` | Enable document cross-references |
| `enableHoverPreviews` | boolean | Optional | `true` | Enable hover previews for links |
| `linkValidation` | boolean | Optional | `false` | Enable link validation |

#### Link Processing Features

- **Auto Linking**: Detects URLs and email addresses in text
- **Ticket Links**: Converts ticket references (e.g., MDT-001) to clickable links
- **Document Links**: Creates links between documents in the project
- **Hover Previews**: Shows document previews when hovering over links
- **Link Validation**: Checks if referenced documents and tickets exist

#### Example Configurations

**Full feature set (default):**
```toml
[links]
enableAutoLinking = true
enableTicketLinks = true
enableDocumentLinks = true
enableHoverPreviews = true
linkValidation = false
```

**Minimal linking:**
```toml
[links]
enableAutoLinking = false
enableTicketLinks = true
enableDocumentLinks = false
enableHoverPreviews = false
linkValidation = true
```

## Configuration Validation

### Discovery Validation Rules

1. **searchPaths Validation**:
   - All paths must exist and be readable directories
   - Paths must be valid absolute paths or expandable tilde paths
   - Invalid paths are logged but don't prevent system startup

2. **autoDiscover Validation**:
   - Must be a boolean value (`true` or `false`)
   - Invalid values default to `true`

### System Validation Rules

1. **cacheTimeout Validation**:
   - Must be a non-negative integer (milliseconds)
   - Values below 1000 trigger performance warning
   - Very high values (> 300000) may cause stale data

2. **logLevel Validation**:
   - Must be one of: "error", "warn", "info", "debug"
   - Invalid values default to "info"

### Links Validation Rules

1. **Boolean Field Validation**:
   - All link configuration fields must be boolean
   - Invalid values default to their respective defaults

## Configuration Loading

### Load Order

1. Read `~/.config/markdown-ticket/config.toml`
2. Validate all sections and fields
3. Apply defaults for missing optional fields
4. Log warnings for invalid configurations
5. Continue with valid sections if possible

### Error Handling

- Invalid configurations log warnings but don't prevent startup
- Validation errors are logged with specific field information
- Missing sections use default values
- Invalid fields within sections use field-specific defaults

## Integration with Other Configurations

### Relationship to Project Registry

- Global config defines where to look for projects
- Project registry (`~/.config/markdown-ticket/projects/*.toml`) stores discovered projects
- Discovery settings control automatic population of registry

### Relationship to User Preferences

- Global config controls system behavior
- User preferences (`~/.config/markdown-ticket/user.toml`) control personal settings
- User preferences override global defaults for UI settings

### Relationship to Local Project Configs

- Global discovery finds projects with local configs
- Local configs define project-specific settings
- Global config doesn't interfere with local project configurations


## Troubleshooting

### Common Issues

1. **Discovery Not Working**:
   - Check that `searchPaths` exist and are readable
   - Verify `autoDiscover` is set to `true`
   - Ensure projects have valid `.mdt-config.toml` files

2. **Cache Issues**:
   - Reduce `cacheTimeout` if files seem stale
   - Set to lower value for debugging
   - Restart application to clear cache

3. **Link Processing Issues**:
   - Verify `links` section fields are boolean values
   - Check `enableTicketLinks` for ticket reference processing
   - Ensure `enableDocumentLinks` is enabled for cross-document links

### Debug Information

Enable debug logging to see:
- Which paths are being scanned
- Configuration values being applied
- Validation warnings and errors
- Cache performance metrics

---

**Related Documentation**:
- [Full Configuration Specification](./CONFIG_SPECIFICATION.md) - Complete configuration reference