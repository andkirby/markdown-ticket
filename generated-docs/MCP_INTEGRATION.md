# MCP Integration Guide

Complete guide for integrating Markdown Ticket Board with AI assistants using Model Context Protocol (MCP) servers.

## Overview

The Markdown Ticket Board project includes multiple MCP servers that enable AI assistants to interact with your project management workflow:

1. **Main MCP Server** (`mcp-server/`) - Full CR/ticket management
2. **MCP Development Tools** (`server/mcp-dev-tools/`) - Development logging and debugging
3. **AWS Code Documentation Integration** - Automated documentation generation

## Main MCP Server

### Available Tools

#### Project Management
- `list_projects` - List all discovered projects
- `get_project_info` - Get detailed project information

#### CR/Ticket Management
- `list_crs` - List CRs with filtering options
- `get_cr_full_content` - Get complete CR details including full markdown content
- `get_cr_attributes` - Get only YAML frontmatter attributes (90-95% more efficient for metadata-only operations)
- `create_cr` - Create new change requests
- `update_cr_attrs` - Update CR attributes
- `update_cr_status` - Update CR workflow status
- `delete_cr` - Delete CRs

#### Section-Based Operations (84-94% token savings)
- `list_cr_sections` - List document sections
- `get_cr_section` - Read specific sections
- `update_cr_section` - Update sections efficiently

#### Templates & Analysis
- `list_cr_templates` - List available templates
- `get_cr_template` - Get template structure
- `suggest_cr_improvements` - AI-powered CR analysis

### Setup Instructions

#### Prerequisites
```bash
cd mcp-server
npm install
npm run build
```

#### Amazon Q CLI Integration

**Global Access** (recommended):
```bash
q mcp add --name mdt-all \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --scope global --force
```

**Project-Specific Access**:
```bash
# From your project directory
q mcp add --name mdt-project \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --env MCP_PROJECT_FILTER=YOUR_PROJECT_CODE \
  --env MCP_SCAN_PATHS="$(pwd)" \
  --scope workspace --force
```

#### Claude Code Integration

**Global Access**:
```bash
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js
```

**Project-Specific Access**:
```bash
# From your project directory
claude mcp add mdt-project node $HOME/markdown-ticket/mcp-server/dist/index.js \
  --env MCP_PROJECT_FILTER=YOUR_PROJECT_CODE \
  --env MCP_SCAN_PATHS=$(pwd)
```

### Environment Variables

- `MCP_PROJECT_FILTER` - Limit MCP to specific project code (e.g., "MDT", "API")
- `MCP_SCAN_PATHS` - Comma-separated paths to scan for projects
- `MCP_CONFIG_PATH` - Custom path to MCP configuration file

### Usage Examples

#### Creating a New CR
```
Create a new feature enhancement CR for project MDT with title "Add user authentication" and high priority
```

The AI assistant will use:
```json
{
  "tool": "create_cr",
  "parameters": {
    "project": "MDT",
    "type": "Feature Enhancement",
    "data": {
      "title": "Add user authentication",
      "priority": "High"
    }
  }
}
```

#### Updating CR Status
```
Move MDT-001 to In Progress status
```

The AI assistant will use:
```json
{
  "tool": "update_cr_status",
  "parameters": {
    "project": "MDT",
    "key": "MDT-001",
    "status": "In Progress"
  }
}
```

#### Section-Based Updates
```
Update the Implementation section of MDT-001 with the new technical approach
```

The AI assistant will:
1. Use `list_cr_sections` to find available sections
2. Use `update_cr_section` to update specific content

## MCP Development Tools

### Purpose
Provides real-time logging and debugging capabilities during development.

### Available Tools
- `get_frontend_logs` - Retrieve frontend console logs
- `stream_frontend_url` - Get SSE endpoint for real-time log streaming
- `get_frontend_session_status` - Check logging session status
- `stop_frontend_logging` - Stop logging session
- `get_logs` - Get backend application logs
- `stream_url` - Get backend log streaming endpoint

### Setup
```bash
cd server/mcp-dev-tools
npm install
npm run build
```

### Integration
```bash
# Amazon Q CLI
q mcp add --name mdt-dev-tools \
  --command "node" \
  --args $HOME/markdown-ticket/server/mcp-dev-tools/dist/index.js \
  --scope global --force

# Claude Code
claude mcp add mdt-dev-tools node $HOME/markdown-ticket/server/mcp-dev-tools/dist/index.js
```

### Usage Examples
```
Show me the latest frontend logs
Get real-time log stream for debugging
Check if there are any errors in the backend logs
```

## AWS Code Documentation MCP

### Purpose
Automated documentation generation using AWS Labs' code-doc-gen MCP server.

### Setup
```bash
# Install uv package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Amazon Q CLI
q mcp add --name aws-code-doc-gen \
  --command "uvx" \
  --args "awslabs.code-doc-gen-mcp-server@latest" \
  --env FASTMCP_LOG_LEVEL=ERROR \
  --scope global --force

# Claude Code
claude mcp add aws-code-doc-gen uvx awslabs.code-doc-gen-mcp-server@latest \
  --env FASTMCP_LOG_LEVEL=ERROR
```

### Usage Examples
```
Generate documentation for this project
Create API documentation for the backend
Analyze the project structure and create comprehensive docs
```

## MCP Tool Reference

### Core CR Management Tools

#### `list_projects`
Lists all discovered projects with metadata.

**Parameters**: None

**Response**: Array of project objects with configuration and metadata.

#### `create_cr`
Creates a new change request using templates.

**Parameters**:
- `project` (required): Project key
- `type` (required): CR type (Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation)
- `data` (required): CR data object
  - `title` (required): CR title
  - `priority` (optional): Low, Medium, High, Critical
  - `assignee` (optional): Person responsible
  - `phaseEpic` (optional): Phase or epic
  - `content` (optional): Full markdown content

**Response**: Created CR object with generated code and file path.

#### `update_cr_section`
Efficiently updates specific sections of CR documents.

**Parameters**:
- `project` (required): Project key
- `key` (required): CR key (e.g., "MDT-001")
- `section` (required): Section identifier
- `operation` (required): "replace", "append", or "prepend"
- `content` (required): Content to apply

**Token Savings**: 84-94% compared to full document updates.

### Filtering and Search

#### `list_crs` with Filters
```json
{
  "project": "MDT",
  "filters": {
    "status": ["In Progress", "Approved"],
    "type": "Feature Enhancement",
    "priority": ["High", "Critical"]
  }
}
```

### Template System

#### Available Templates
- **Architecture**: System design and architectural decisions
- **Feature Enhancement**: New features and capabilities
- **Bug Fix**: Issue resolution and fixes
- **Technical Debt**: Code quality improvements
- **Documentation**: Documentation updates and additions

Each template includes:
- Structured sections (Description, Rationale, Solution Analysis, Implementation, Acceptance Criteria)
- Type-specific guidance and prompts
- Consistent formatting and organization

## Best Practices

### Project Organization
1. **Use Project Codes**: Consistent 2-4 letter codes (MDT, API, WEB)
2. **Configure Projects**: Ensure `.mdt-config.toml` exists in project root
3. **Organize CRs**: Use descriptive titles and proper categorization

### MCP Integration
1. **Scope Selection**: Use project-specific scope for focused work
2. **Environment Variables**: Set `MCP_PROJECT_FILTER` for single-project workflows
3. **Regular Updates**: Keep MCP servers updated with `npm run build`

### AI Assistant Workflows
1. **Start with Discovery**: Use `list_projects` to understand available projects
2. **Use Filtering**: Leverage `list_crs` filters for targeted queries
3. **Section Updates**: Use section-based tools for efficient content updates
4. **Template Consistency**: Use `get_cr_template` to understand expected structure

## Troubleshooting

### Common Issues

**MCP Server Not Found**:
```bash
# Verify build
cd mcp-server && npm run build

# Check file exists
ls -la $HOME/markdown-ticket/mcp-server/dist/index.js
```

**Project Not Discovered**:
```bash
# Check configuration
cat .mdt-config.toml

# Verify global registry
ls -la ~/.config/markdown-ticket/projects/
```

**Permission Errors**:
```bash
# Fix permissions
chmod +x $HOME/markdown-ticket/mcp-server/dist/index.js
```

### Debug Commands
```bash
# Test MCP server directly
node $HOME/markdown-ticket/mcp-server/dist/index.js

# Check MCP configuration
q mcp list
# or
claude mcp list

# View MCP logs
tail -f ~/.local/share/q/logs/mcp.log
```

### Environment Validation
```bash
# Check Node.js version
node --version  # Should be 16.0.0+

# Verify npm packages
cd mcp-server && npm list

# Test project discovery
node -e "
const { ProjectDiscoveryService } = require('./dist/services/projectDiscovery.js');
const service = new ProjectDiscoveryService();
console.log(service.discoverProjects());
"
```

## Advanced Configuration

### Custom MCP Configuration
Create `~/.config/markdown-ticket/mcp-server.toml`:

```toml
[server]
port = 3002
log_level = "info"

[projects]
scan_paths = ["/path/to/projects", "/another/path"]
auto_discovery = true

[templates]
custom_path = "/path/to/custom/templates"
```

### Multiple Project Workflows
```bash
# Different MCP servers for different project types
q mcp add --name mdt-backend \
  --env MCP_PROJECT_FILTER=API \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js

q mcp add --name mdt-frontend \
  --env MCP_PROJECT_FILTER=WEB \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js
```

This comprehensive MCP integration enables seamless AI-assisted project management workflows while maintaining full control over your markdown-based ticket system.
