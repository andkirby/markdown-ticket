# TOML Configuration Specification for Ticket Board

## Overview

This document specifies the simplified TOML configuration file format for the md-ticket-board application, focusing on the essential features for project management and UI preferences.

## Configuration File Location

**Client Configuration**: `~/.config/md-ticket/config.toml`

This is where users define their projects and preferences.

## Configuration Structure

### Server Configuration (Server-side only)
```toml
# Server Configuration
[server]
port = 3001 
host = "localhost"
cors = { origin = ["http://localhost:5173"], credentials = true }
```

### Client Configuration (Frontend-side)
```toml
# Project definitions - stored in ~/.config/md-ticket/config.toml
[[projects]]
path = "/path/to/super_project"

[[projects]]
name = "Awesome Project!"
path = "/my/dir"

# Ticket defaults
[tickets]
defaultStatus = "Proposed"
codePattern = "^[A-Z]{2,}-[A-Z]\\d{3}$"

# UI preferences
[ui]
autoRefresh = true
refreshInterval = 30
```

## Project Configuration

### Project Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Optional | Display name for the project. If not provided, derived from the last directory name in `path` |
| `path` | string | Required | File system path to the project directory |

### Project Examples

```toml
# Unnamed project (name derived from directory)
[[projects]]
path = "/home/user/projects/my-tickets"

# Named project
[[projects]]
name = "Client Work"
path = "/home/user/projects/client-tasks"

# Named project with description (future enhancement)
[[projects]]
name = "Development"
path = "/home/user/projects/dev"
```

## Frontend Configuration

The frontend will read from `~/.config/md-ticket/config.toml` to:

1. **Populate Project Dropdown**: Show list of available projects in the top-left corner
2. **Filter Tasks**: When a project is selected, show only tasks from that project's path
3. **Apply UI Preferences**: Use `autoRefresh` and `refreshInterval` settings

### UI Implementation

```typescript
// Project dropdown component (top-left corner)
interface Project {
  name: string;
  path: string;
  displayName: string; // Derived from name or directory
}

// Configuration state
interface AppConfig {
  projects: Project[];
  tickets: {
    defaultStatus: string;
    codePattern: string;
  };
  ui: {
    autoRefresh: boolean;
    refreshInterval: number;
  };
}
```

## How Project Paths Work

When a user selects a project from the dropdown:

1. **Frontend**: Stores the selected project path in local state/session storage
2. **Backend API**: All API calls include the selected project path as a query parameter
3. **File Operations**: The server reads/write tickets from the selected project's directory

### API Integration

```typescript
// Frontend API calls
const getTasks = async (projectPath: string) => {
  const response = await fetch(`/api/tasks?projectPath=${encodeURIComponent(projectPath)}`);
  return response.json();
};

// Backend route modification
app.get('/api/tasks', async (req, res) => {
  const projectPath = req.query.projectPath || defaultProjectPath;
  const ticketsDir = path.join(projectPath, 'tasks');
  // ... rest of logic
});
```

## Configuration Loading

### Frontend Configuration Loading

```typescript
const loadConfig = async (): Promise<AppConfig> => {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    
    // Apply project name fallback
    config.projects = config.projects.map(project => ({
      ...project,
      displayName: project.name || path.basename(project.path)
    }));
    
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    return getDefaultConfig();
  }
};
```

### Backend Configuration Loading

```typescript
const loadClientConfig = (): AppConfig => {
  const configPath = path.join(os.homedir(), '.config', 'md-ticket', 'config.toml');
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = toml.parse(configContent);
    
    // Validate and return config
    return validateConfig(config);
  } catch (error) {
    console.error('Failed to load client config:', error);
    return getDefaultConfig();
  }
};
```

## Default Configuration

```toml
# Default configuration if no config file exists
[tickets]
defaultStatus = "Proposed"
codePattern = "^[A-Z]{2,}-[A-Z]\\d{3}$"

[ui]
autoRefresh = true
refreshInterval = 30

# No projects by default - user must add them
[[projects]]
```

## Environment Variable Support

```toml
# Optional environment variable substitution
[server]
port = "${PORT:-3001}"
host = "${HOST:-localhost}"

[ui]
refreshInterval = "${REFRESH_INTERVAL:-30}"
```

## Configuration Validation

### Path Validation
- Must be an absolute path
- Must exist and be readable
- Must be a directory

### Pattern Validation
- `codePattern` must be a valid regex
- `refreshInterval` must be a positive number

### Project Validation
- No duplicate project paths
- Project names should be unique (if provided)

## Implementation Plan

### Phase 1: Configuration System
1. Add TOML dependencies to both frontend and backend
2. Create configuration loader for backend
3. Create configuration API endpoint
4. Add frontend configuration loading

### Phase 2: Project Management
1. Create project dropdown component (top-left)
2. Implement project selection state management
3. Modify API calls to include project path
4. Update file operations to use project-specific paths

### Phase 3: UI Preferences
1. Implement auto-refresh functionality
2. Apply refresh interval setting
3. Add configuration validation errors
4. Create configuration file creation wizard

## Migration Path

The current hardcoded configurations will be migrated:

1. **Server Settings**: Move from `server.js` to `[server]` section
2. **Ticket Attributes**: Keep in `src/config/` but make them overridable via `[tickets]`
3. **Status/Workflow**: Keep in `src/config/` but make them overridable via `[tickets]`
4. **UI Preferences**: Move from hardcoded values to `[ui]` section

## Example Configuration Files

### Basic Client Configuration (`~/.config/md-ticket/config.toml`)

```toml
# Project definitions
[[projects]]
path = "/home/user/projects/work-tickets"

[[projects]]
name = "Personal Projects"
path = "/home/user/projects/personal"

[[projects]]
name = "Client A"
path = "/home/user/projects/client-a"

# Ticket defaults
[tickets]
defaultStatus = "Proposed"
codePattern = "^[A-Z]{2,}-[A-Z]\\d{3}$"

# UI preferences
[ui]
autoRefresh = true
refreshInterval = 30
```

### Development Server Configuration (Optional)

```toml
# Server configuration (server-side only)
[server]
port = 3001
host = "localhost"
cors = { origin = ["http://localhost:5173", "http://localhost:3000"], credentials = true }