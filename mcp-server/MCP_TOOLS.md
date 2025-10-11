# MCP Tools Documentation

Complete reference for all available MCP tools with input parameters and descriptions.

**Note:** For interactive testing and viewing request/response payloads, use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector).

## Architecture

The MCP server uses the **shared core architecture** with unified types, services, and templates:
- **Types**: `shared/models/Types.ts` - CR, CRStatus, CRType, CRPriority, etc.
- **Services**: `shared/services/` - ProjectService, MarkdownService, TemplateService, CRService
- **Templates**: `shared/templates/` - File-based templates for all CR types
- **Configuration**: `shared/models/Config.ts` - Unified configuration interfaces

## Core Tools

### `list_projects`
**Description**: List all discovered projects with their basic information

**Parameters**: None

### `get_project_info`
**Description**: Get detailed information about a specific project

**Parameters**:
- `key` (string, required): Project key (e.g., "MDT", "API")

### `list_crs`
**Description**: List CRs for a project with optional filtering

**Parameters**:
- `project` (string, required): Project key
- `filters` (object, optional): Filter criteria
  - `status` (string|array): Filter by status ("Proposed", "Approved", "In Progress", "Implemented", "Rejected", "On Hold")
  - `type` (string|array): Filter by type ("Architecture", "Feature Enhancement", "Bug Fix", "Technical Debt", "Documentation")
  - `priority` (string|array): Filter by priority ("Low", "Medium", "High", "Critical")

### `get_cr_full_content`
**Description**: Get complete CR details including full markdown content

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key (e.g., "MDT-001")

### `get_cr_attributes`
**Description**: Get only YAML frontmatter attributes from a CR (efficient for metadata-only operations). Returns 90-95% less data than `get_cr_full_content` when you only need metadata.

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key (e.g., "MDT-001")

## CR Management Tools

### `create_cr`
**Description**: Create a new CR in the specified project using shared templates

**Parameters**:
- `project` (string, required): Project key
- `type` (string, required): CR type ("Architecture", "Feature Enhancement", "Bug Fix", "Technical Debt", "Documentation")
- `data` (object, required): CR data
  - `title` (string, required): CR title/summary
  - `priority` (string, optional): CR priority (defaults to "Medium")
  - `phaseEpic` (string, optional): Phase or epic this CR belongs to
  - `assignee` (string, optional): Person responsible for implementation
  - `relatedTickets` (string, optional): Comma-separated list of related CR codes
  - `dependsOn` (string, optional): Comma-separated list of CR keys this depends on
  - `blocks` (string, optional): Comma-separated list of CR keys this blocks
  - `content` (string, optional): Full markdown content (overrides template if provided)

### `update_cr_attrs`
**Description**: Update attributes of an existing CR (excludes status - use update_cr_status for workflow)

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key
- `attributes` (object, required): Attributes to update
  - `title` (string, optional): CR title/summary
  - `priority` (string, optional): CR priority
  - `phaseEpic` (string, optional): Phase or epic this CR belongs to
  - `assignee` (string, optional): Person responsible for implementation
  - `relatedTickets` (string, optional): Comma-separated list of related CR codes
  - `dependsOn` (string, optional): Comma-separated list of CR keys this depends on
  - `blocks` (string, optional): Comma-separated list of CR keys this blocks

### `update_cr_status`
**Description**: Update the status of an existing CR with workflow validation

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key
- `status` (string, required): New status ("Proposed", "Approved", "In Progress", "Implemented", "Rejected", "On Hold")

### `delete_cr`
**Description**: Delete a CR (typically used for implemented bug fixes)

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key

## Section-Based Content Tools

**Token Efficiency**: 84-94% savings compared to full document operations

### `list_cr_sections`
**Description**: List all sections in a CR document with hierarchical tree structure. Use this to discover available sections before reading or updating.

**Parameters**:
- `project` (string, required): Project key (e.g., "MDT", "SEB")
- `key` (string, required): CR key (e.g., "MDT-001", "SEB-010")

### `get_cr_section`
**Description**: Read specific section content without loading full document. Use `list_cr_sections` first to discover available sections.

**Parameters**:
- `project` (string, required): Project key (e.g., "MDT", "SEB")
- `key` (string, required): CR key (e.g., "MDT-001", "SEB-010")
- `section` (string, required): Section to read. Can be:
  - Simple name: "Problem Statement" or "Requirements"
  - Markdown header: "### Problem Statement" or "## 2. Solution Analysis"
  - Hierarchical path for duplicates: "## Feature AA / ### Requirements"

### `update_cr_section`
**Description**: Update a specific section efficiently. Supports replace, append, and prepend operations.

**Parameters**:
- `project` (string, required): Project key (e.g., "MDT", "SEB")
- `key` (string, required): CR key (e.g., "MDT-001", "SEB-010")
- `section` (string, required): Section to update (same format as `get_cr_section`)
- `operation` (string, required): Operation type: `"replace"`, `"append"`, or `"prepend"`
- `content` (string, required): Content to apply

## Template Tools

### `list_cr_templates`
**Description**: List all available CR template types

**Parameters**: None

### `get_cr_template`
**Description**: Get the template structure for a specific CR type

**Parameters**:
- `type` (string, required): CR type ("Architecture", "Feature Enhancement", "Bug Fix", "Technical Debt", "Documentation")

## Analysis Tools

### `suggest_cr_improvements`
**Description**: Get suggestions for improving an existing CR

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key to analyze

## Configuration

The MCP server uses shared configuration from:
- **Global Config**: `~/.config/markdown-ticket/mcp-server.toml`
- **Templates**: `shared/templates/` directory
- **Shared Services**: Unified project discovery, markdown parsing, and template management

## Integration Examples

### Amazon Q CLI
```bash
q mcp add --name mdt-all \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --scope global --force
```

### Claude Code  
```bash
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js
```

For project-specific access, use environment variables:
- `MCP_PROJECT_FILTER=MDT` - Limit to specific project
- `MCP_SCAN_PATHS=/path/to/project` - Set project path
