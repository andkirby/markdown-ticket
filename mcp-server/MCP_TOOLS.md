# MCP Tools Documentation

Complete reference for all available MCP tools with input parameters and descriptions.

**🎯 Recent Optimization Update**: This MCP server has been optimized for 40% token reduction through tool consolidation:
- ✅ **Consolidated Tools**: `get_cr` replaces `get_cr_full_content` + `get_cr_attributes`
- ✅ **Consolidated Tools**: `manage_cr_sections` replaces `list_cr_sections` + `get_cr_section` + `update_cr_section`
- ✅ **Enhanced Tool**: `create_cr` now includes embedded template guidance
- ✅ **Removed Tools**: Template tools (`list_cr_templates`, `get_cr_template`) removed for YAGNI compliance

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

### `get_cr` (Consolidated)
**Description**: Get CR with flexible return modes (consolidated tool replacing get_cr_full_content and get_cr_attributes)

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key (e.g., "MDT-004", "API-123")
- `mode` (string, optional): Return mode (default: "full")
  - `"full"`: Plain markdown content only (no metadata or formatting)
  - `"attributes"`: YAML frontmatter only (90-95% less data than full)
  - `"metadata"`: Basic key metadata without full YAML parsing

## CR Management Tools

### `create_cr` (Enhanced)
**Description**: Create a new CR with embedded template guidance. Auto-generates complete template if content omitted.

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
  - `content` (string, optional): Full markdown content with required sections (auto-generated if omitted):
    - `## 1. Description` - Problem statement and context
    - `## 2. Rationale` - Why this change is necessary
    - `## 3. Solution Analysis` - Alternatives and selected approach
    - `## 4. Implementation Specification` - Technical details and plan
    - `## 5. Acceptance Criteria` - Measurable completion conditions

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

## Section Management Tools

**Token Efficiency**: 84-94% savings compared to full document operations

### `manage_cr_sections` (Consolidated)
**Description**: Manage CR sections with multiple operations (consolidated tool replacing list_cr_sections, get_cr_section, and update_cr_section)

**🆕 Flexible Section Matching**: Supports user-friendly formats - no need for exact markdown syntax!

**Parameters**:
- `project` (string, required): Project key (e.g., "MDT", "SEB")
- `key` (string, required): CR key (e.g., "MDT-001", "SEB-010")
- `operation` (string, required): Operation type
  - `"list"`: List all sections with hierarchical tree structure
  - `"get"`: Read specific section content
  - `"update"`: Modify section content
- `section` (string, optional): Section identifier (required for get/update operations). **Flexible formats supported**:
  - **User-friendly**: `"1. Description"` or `"Description"` (recommended)
  - **Exact format**: `"## 1. Description"` or `"### Key Features"` (backwards compatible)
  - **Hierarchical path**: `"## Parent / ### Child"` (for disambiguation)
  - **Case-insensitive**: `"description"` matches `"## 1. Description"`
- `updateMode` (string, optional): Update mode (required for update operation): `"replace"`, `"append"`, or `"prepend"`
- `content` (string, optional): Content to apply (required for update operation)

**Section Matching Examples**:
```typescript
// All of these work:
section: "Description"           // Simple and natural
section: "1. Description"        // With numbered prefix
section: "## 1. Description"     // Exact markdown format

// All match the same section: "## 1. Description"
```

**Error Handling**:
- **Not found**: Provides list of available sections with suggestions
- **Ambiguous**: Lists all matching sections and requires exact format or hierarchical path
- **Partial matches**: Suggests similar section names

See `/mcp-server/docs/FLEXIBLE_SECTION_MATCHING.md` for complete guide.


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
