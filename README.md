# Markdown Ticket Board

A Kanban-style ticket board system that uses markdown files for storage, providing a lightweight and version-control-friendly approach to project management.

## Features

- **Kanban Board Interface**: Visual drag-and-drop ticket management
- **Multi-Project Support**: Manage multiple projects from a single dashboard
- **Markdown Storage**: All tickets stored as markdown files with YAML frontmatter
- **Real-time Updates**: File system watching for live updates
- **Sortable Tickets**: Sort by Key, Title, Created Date, or Update Date
- **MCP Integration**: Model Context Protocol server for AI assistant integration
- **Project Discovery**: Automatic detection of project configurations

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Open http://localhost:5173 in your browser
   - Choose between Single Project or Multi Project view

## Project Structure

```
docs/CRs/           # Change Request files for this project
debug-tasks/        # Debug ticket files
src/                # Frontend React application
server/             # Backend Node.js server
mcp-server/         # MCP server for AI integration
```

## Ticket Management

### Creating Tickets
- Use the "Create" button in the UI
- Or create markdown files directly in the project's CR directory
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

## MCP Server Integration

The project includes an MCP (Model Context Protocol) server for AI assistant integration:

```bash
# Start MCP server
cd mcp-server
npm run build
npm start
```

### Available MCP Tools
- `list_projects` - List all discovered projects
- `list_crs` - List CRs for a project with filtering
- `get_cr` - Get detailed CR information
- `create_cr` - Create new change requests
- `update_cr_status` - Update CR status
- `delete_cr` - Delete CRs (for implemented bug fixes)

## Project Configuration

Projects are automatically discovered from:
- `docs/CRs/` directories
- Custom paths defined in `~/.config/markdown-ticket/config.toml`

### Manual Project Configuration
```toml
# ~/.config/markdown-ticket/config.toml
[[projects]]
id = "MYPROJ"
name = "My Project"
path = "/path/to/project/docs/CRs"
description = "Project description"
```

## Development

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Development
```bash
cd server
node server.js       # Start backend server
```

### Testing
```bash
npm run test         # Run tests
npm run test:e2e     # Run end-to-end tests
```

## File System Integration

- **Automatic Timestamps**: `dateCreated` and `lastModified` are automatically managed from file system timestamps
- **Real-time Updates**: File changes are detected and reflected in the UI immediately
- **Version Control Friendly**: All data stored in markdown files, perfect for Git workflows

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
