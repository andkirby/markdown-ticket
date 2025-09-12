# Markdown Ticket Board

 > **🚀 The developer-friendly project management tool that speaks your language!**<br>
> AI powered Kanban board that stores tickets as markdown files, integrating project management with your existing Git workflow.

<img alt="Markdown Ticket - Board, support dark/light theme" src="https://github.com/user-attachments/assets/f682104e-0e74-45b7-a6d4-b72142441b39" width="500"> <img alt="Markdown Ticket - Board, support dark/light theme" src="https://github.com/user-attachments/assets/4440a05e-6ec8-40ca-a08d-6d2d833b9561" width="500">

**Key capabilities:**
- Store tickets as markdown files with YAML frontmatter
- Version control your project management alongside code
- Drag-and-drop Kanban interface with real-time updates
- MCP integration for AI assistant workflows
- Multi-project support from a single interface
- No external dependencies or cloud services required

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Getting Started](#getting-started)
  - [First Time Setup](#first-time-setup)
  - [Creating Tickets](#creating-tickets)
  - [Ticket Format](#ticket-format)
  - [Ticket Statuses](#ticket-statuses)
- [Sorting Configuration](#sorting-configuration)
  - [Default Sort Attributes](#default-sort-attributes)
  - [Custom Sorting Configuration](#custom-sorting-configuration)
  - [Configuration Options](#configuration-options)
  - [System Attributes Protection](#system-attributes-protection)
- [MCP Integration](#mcp-integration)
  - [Adding MCP to AI Assistants](#adding-mcp-to-ai-assistants)
  - [Available MCP Tools](#available-mcp-tools)
- [Project Management](#project-management)
  - [Creating Projects](#creating-projects)
  - [Editing Projects](#editing-projects)
  - [Project Configuration](#project-configuration)
- [Development](#development)
- [File System Integration](#file-system-integration)
- [Release Notes](#release-notes)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Kanban Board Interface**: Visual drag-and-drop ticket management with status toggle buttons
- **Multi-Project Support**: Manage multiple projects from a single dashboard with project editing capabilities
- **Enhanced Ticket Viewer**: Comprehensive attribute display with styled badges and structured layout
- **Ticket Relationships**: Full support for dependencies, blocks, and related tickets
- **Backlog Management**: Hide/show backlog tickets for cleaner board views
- **Markdown Storage**: All tickets stored as markdown files with YAML frontmatter
- **Real-time Updates**: SSE-based live updates with optimistic UI
- **Multiple View Modes**: Board, List, and Documents views with seamless switching
- **Sortable Tickets**: Sort by Key, Title, Created Date, or Update Date
- **MCP Integration**: Model Context Protocol server for AI assistant integration with development tools
- **Project Discovery**: Automatic detection of project configurations

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the backend server**:
   ```bash
   cd server
   node server.js
   ```

3. **Start the development server** (in another terminal):
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Open http://localhost:5173 in your browser
   - Use the "Add New Project" button to create your first project
   - Switch between Board, List, and Documents views using the icon switcher

## Getting Started

### First Time Setup
1. Create your first project using the "Add New Project" button in the UI
2. The system will create both global registry and local project configuration files
3. Start creating tickets using the UI or by following the guide in `docs/create_ticket.md`

### Creating Tickets
- **UI Method**: Use the "Create" button in the application interface
- **Manual Method**: Create markdown files directly in your project's ticket directory
- **Detailed Instructions**: See `docs/create_ticket.md` for comprehensive ticket creation guidelines
- Files follow the naming pattern: `PROJECT-###-title.md`

### Ticket Format
```yaml
---
code: MDT-001
title: Example Ticket
status: Proposed
type: Feature Enhancement
priority: Medium
dateCreated: 2025-09-06T10:00:00.000Z
lastModified: 2025-09-06T15:30:00.000Z
phaseEpic: Phase A
---

# Ticket Content

Markdown content goes here...
```

### Ticket Statuses
- **Proposed**: Initial state for new tickets
- **Approved**: Approved for implementation
- **In Progress**: Currently being worked on
- **Implemented**: Completed and deployed
- **Rejected**: Not approved for implementation

## Sorting Configuration

The application supports customizable sorting with persistent user preferences.

### Default Sort Attributes
- **Key** (desc) - Ticket identifier (e.g., MDT-001)
- **Title** (asc) - Ticket title
- **Created Date** (desc) - When the ticket was created
- **Update Date** (desc) - When the ticket was last modified

### Custom Sorting Configuration

Create a configuration file at `~/.config/markdown-ticket/user.toml`:

```toml
[sorting]
attributes = [
    { name = "code", label = "Key", default_direction = "desc", system = true },
    { name = "title", label = "Title", default_direction = "asc", system = true },
    { name = "dateCreated", label = "Created Date", default_direction = "desc", system = true },
    { name = "lastModified", label = "Update Date", default_direction = "desc", system = true },
    # Add custom attributes
    { name = "priority", label = "Priority", default_direction = "desc", system = false },
    { name = "type", label = "Type", default_direction = "asc", system = false }
]

[sorting.preferences]
selected_attribute = "lastModified"
selected_direction = "desc"
```

### Configuration Options

- **name**: Field name in the ticket data
- **label**: Display name in the sort dropdown
- **default_direction**: Default sort direction (`asc` or `desc`)
- **system**: If `true`, cannot be removed by users

### System Attributes Protection
System attributes (`code`, `title`, `dateCreated`, `lastModified`) cannot be removed from the configuration to ensure core functionality remains intact.

## MCP Integration

The project includes an MCP (Model Context Protocol) server for AI assistant integration:

```bash
# Start MCP server
cd mcp-server
npm run build
npm start
```

### Adding MCP to AI Assistants

**Pre-conditions:**
- Markdown-ticket project installed in `~/markdown-ticket`
- MCP server built (`npm run build` in mcp-server directory)
- Your project has a project code (e.g., "COD")

**Setup from your project directory:**
```bash
cd /path/to/my-project
```

#### Amazon Q CLI

**Local scope** (project-specific, **🔴 currently not working - keep for future**):
```bash
q mcp add --name mdt-tickets \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --env MCP_PROJECT_FILTER=COD \
  --env MCP_SCAN_PATHS="$(pwd)" \
  --scope workspace --force
```

**Global scope** (works, access all projects):
```bash
q mcp add --name mdt-all \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --scope global --force
```

#### Claude Code

**Local scope** (recommended, LLM sees only one project):
```bash
claude mcp add mdt-tickets node $HOME/markdown-ticket/mcp-server/dist/index.js \
  --env MCP_PROJECT_FILTER=COD \
  --env MCP_SCAN_PATHS=$(pwd)
```

**Global scope** (access any project from anywhere):
```bash
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js
```

**Environment Variables:**
- `MCP_PROJECT_FILTER=COD` - Limits MCP to specific project code
- `MCP_SCAN_PATHS=$(pwd)` - Sets project path for scanning

**Scopes Explained:**
- **Local/Workspace**: MCP only available in current project directory
- **Global**: MCP available from any directory, can access all configured projects

### Available MCP Tools
- `list_projects` - List all discovered projects
- `list_crs` - List CRs for a project with filtering
- `get_cr` - Get detailed CR information
- `create_cr` - Create new change requests
- `update_cr_attrs` - Update CR attributes (excludes status)
- `update_cr_status` - Update CR status
- `delete_cr` - Delete CRs (for implemented bug fixes)
- `get_project_info` - Get detailed project information
- `suggest_cr_improvements` - Get suggestions for improving CRs

**📖 Complete Documentation**: See `mcp-server/MCP_TOOLS.md` for detailed API reference including response formats, examples, and error handling.

## Project Management

### Creating Projects
- Use the "Add New Project" button in the UI to create new projects with automatic configuration setup

### Editing Projects
- Click the edit button (pencil icon) next to any project to modify name, description, CRs path, and repository URL

### Project Configuration
Projects use a dual-configuration approach:

**Global Registry** (`~/.config/markdown-ticket/projects/{project-dir}.toml`):
```toml
[project]
path = "/path/to/project"
active = true

[metadata]
dateRegistered = "2025-09-07"
lastAccessed = "2025-09-07"
```

**Local Configuration** (`{project}/.mdt-config.toml`):
```toml
[project]
name = "My Project"
code = "MYPROJ"
path = "docs/CRs"
startNumber = 1
counterFile = ".mdt-next"
description = "Project description"
repository = "https://github.com/user/repo"
```

The global registry provides minimal discovery information, while local configuration contains operational details.

## Development

### Quick Start
```bash
npm install                    # Install dependencies
cd server && node server.js   # Start backend (Terminal 1)
npm run dev                    # Start frontend (Terminal 2)
```

### MCP Development Tools
The project includes MCP servers for AI assistant integration:
- **CR Management**: `mcp-server/` - Full CR management via MCP tools
- **Development Logging**: `server/mcp-dev-tools/` - Real-time log access during development

### Complete Development Guide
See **[docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)** for:
- Full development environment setup
- MCP server configuration and usage
- Testing procedures and workflows
- Architecture overview and code organization
- Common development tasks and troubleshooting

## File System Integration

- **Automatic Timestamps**: `dateCreated` and `lastModified` are automatically managed from file system timestamps
- **Real-time Updates**: File changes are detected and reflected in the UI immediately
- **Version Control Friendly**: All data stored in markdown files, perfect for Git workflows

## Release Notes

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for detailed information about each version:

- **v0.3.0** (2025-09-11): Badge components, project editing, backlog management, MCP development tools
- **v0.2.0** (2025-09-09): Enhanced ticket viewer, relationship management, real-time updates
- **v0.1.0** (2025-09-07): Core Kanban board, multi-project support, MCP integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
