# MCP Tools Documentation

Complete reference for all available MCP tools with input parameters, response formats, and examples.

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

**Response Format**:
```json
[
  {
    "id": "MDT",
    "project": {
      "name": "Markdown Ticket Board",
      "code": "MDT", 
      "path": "/Users/kirby/home/markdown-ticket",
      "startNumber": 1,
      "counterFile": ".mdt-next",
      "description": "Kanban-style ticket board system"
    },
    "metadata": {
      "dateRegistered": "2025-09-07",
      "lastAccessed": "2025-09-10",
      "version": "1.0.0"
    },
    "autoDiscovered": false,
    "configPath": "/Users/kirby/home/markdown-ticket/.mdt-config.toml"
  }
]
```

### `get_project_info`
**Description**: Get detailed information about a specific project

**Parameters**:
- `key` (string, required): Project key (e.g., "MDT", "API")

**Response Format**:
```json
{
  "key": "MDT",
  "name": "Markdown Ticket Board",
  "description": "Kanban-style ticket board system",
  "path": "/Users/kirby/home/markdown-ticket",
  "crCount": 6,
  "lastAccessed": "2025-09-10"
}
```

### `list_crs`
**Description**: List CRs for a project with optional filtering

**Parameters**:
- `project` (string, required): Project key
- `filters` (object, optional): Filter criteria
  - `status` (string|array): Filter by status ("Proposed", "Approved", "In Progress", "Implemented", "Rejected", "On Hold")
  - `type` (string|array): Filter by type ("Architecture", "Feature Enhancement", "Bug Fix", "Technical Debt", "Documentation")
  - `priority` (string|array): Filter by priority ("Low", "Medium", "High", "Critical")

**Response Format**:
```json
[
  {
    "key": "MDT-001",
    "title": "Multi-Project CR Management Dashboard",
    "status": "Implemented",
    "type": "Feature Enhancement",
    "priority": "High",
    "dateCreated": "2025-09-04T00:00:00.000Z",
    "lastModified": "2025-09-04T12:34:56.618Z",
    "filePath": "/Users/kirby/home/markdown-ticket/docs/CRs/MDT-001-multi-project-dashboard.md",
    "phaseEpic": "Phase A (Foundation)",
    "assignee": "Development Team"
  }
]
```

### `get_cr`
**Description**: Get detailed information about a specific CR

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key (e.g., "MDT-001")

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "📄 **MDT-001** - Multi-Project CR Management Dashboard\n\n**Metadata:**\n- Status: Implemented\n- Type: Feature Enhancement\n- Priority: High\n- Created: 2025-09-04T00:00:00.000Z\n- Modified: 2025-09-04T12:34:56.618Z\n- Phase: Phase A (Foundation)\n\n**Content (5234 chars, showing first 500):**\n# Multi-Project CR Management Dashboard\n\n## 1. Description\n\n### Problem Statement\nThe current system lacks the ability to manage multiple projects...\n\n**File:** /Users/kirby/home/markdown-ticket/docs/CRs/MDT-001-multi-project-dashboard.md"
    }
  ]
}
```

## CR Management Tools

### `create_cr`
**Description**: Create a new CR in the specified project using shared templates

**Parameters**:
- `project` (string, required): Project key
- `type` (string, required): CR type ("Architecture", "Feature Enhancement", "Bug Fix", "Technical Debt", "Documentation")
- `data` (object, required): CR data
  - `title` (string, required): CR title/summary
  - `description` (string, optional): Problem statement or description
  - `priority` (string, optional): CR priority (defaults to "Medium")
  - `phaseEpic` (string, optional): Phase or epic this CR belongs to
  - `rationale` (string, optional): Rationale for this CR
  - `assignee` (string, optional): Person responsible for implementation
  - `relatedTickets` (string, optional): Comma-separated list of related CR codes
  - `dependsOn` (string, optional): Comma-separated list of CR keys this depends on
  - `blocks` (string, optional): Comma-separated list of CR keys this blocks
  - `content` (string, optional): Full markdown content (overrides template if provided)

**Response Format**:
```json
{
  "content": [
    {
      "type": "text", 
      "text": "✅ **Created CR MDT-007** - New Feature Implementation\n\n**Details:**\n- Project: MDT (Markdown Ticket Board)\n- Type: Feature Enhancement\n- Priority: Medium\n- File: /Users/kirby/home/markdown-ticket/docs/CRs/MDT-007-new-feature-implementation.md\n\n**Template Applied:** Feature Enhancement template with structured sections\n\n**Next Steps:**\n1. Review and refine the CR content\n2. Update status when ready to proceed\n3. Assign team members if needed"
    }
  ]
}
```

### `update_cr_attrs`
**Description**: Update attributes of an existing CR (excludes status - use update_cr_status for workflow)

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key
- `attributes` (object, required): Attributes to update
  - `title` (string, optional): CR title/summary
  - `description` (string, optional): Problem statement or description
  - `priority` (string, optional): CR priority
  - `phaseEpic` (string, optional): Phase or epic this CR belongs to
  - `rationale` (string, optional): Rationale for this CR
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

## Template Tools

### `list_cr_templates`
**Description**: List all available CR template types

**Parameters**: None

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "📋 **Available CR Templates**\n\n**Template Types:**\n- Architecture: System design and architectural decisions\n- Feature Enhancement: New functionality and improvements\n- Bug Fix: Issue resolution and fixes\n- Technical Debt: Code quality and maintenance improvements\n- Documentation: Documentation creation and updates\n\n**Template Location:** shared/templates/\n**Configuration:** shared/templates/templates.json"
    }
  ]
}
```

### `get_cr_template`
**Description**: Get the template structure for a specific CR type

**Parameters**:
- `type` (string, required): CR type ("Architecture", "Feature Enhancement", "Bug Fix", "Technical Debt", "Documentation")

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "📋 **Bug Fix Template Structure**\n\n**Required Fields:** title, description, priority\n\n**Template Sections:**\n1. Problem Statement (required) - Describe the bug with clear reproduction steps\n2. Current Behavior (required) - What's actually happening (wrong behavior)\n3. Expected Behavior (required) - What should happen instead\n4. Root Cause Analysis (optional) - Why this bug exists - fill after investigation\n5. Impact Assessment (required) - User impact, system stability, data integrity\n\n**Template File:** shared/templates/bug-fix.md"
    }
  ]
}
```

## Analysis Tools

### `suggest_cr_improvements`
**Description**: Get suggestions for improving an existing CR using shared TemplateService

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key to analyze

**Response Format**:
```json
{
  "suggestions": [
    {
      "category": "completeness",
      "priority": "high", 
      "suggestion": "Add implementation timeline",
      "reason": "Missing estimated completion date helps with project planning"
    }
  ],
  "overallScore": 7,
  "strengths": [
    "Clear problem statement",
    "Well-defined acceptance criteria"
  ],
  "weaknesses": [
    "Missing implementation timeline",
    "No risk assessment provided"
  ]
}
```

## Error Handling

All tools return structured error responses:

```json
{
  "content": [
    {
      "type": "text",
      "text": "❌ **Error in tool_name**\n\nError description with specific details\n\nPlease check your input parameters and try again."
    }
  ]
}
```

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
