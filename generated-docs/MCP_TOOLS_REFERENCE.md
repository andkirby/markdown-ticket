# MCP Tools Reference

Complete technical reference for all available MCP tools with detailed parameters and response formats.

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

**Response Format**:
```json
{
  "projects": [
    {
      "id": "project-id",
      "project": {
        "name": "Project Name",
        "code": "PROJ",
        "path": "docs/CRs",
        "active": true,
        "description": "Project description"
      },
      "metadata": {
        "dateRegistered": "2025-10-02",
        "lastAccessed": "2025-10-02",
        "version": "1.0.0"
      }
    }
  ]
}
```

### `get_project_info`
**Description**: Get detailed information about a specific project

**Parameters**:
- `key` (string, required): Project key (e.g., "MDT", "API")

**Response Format**:
```json
{
  "project": {
    "id": "mdt",
    "project": {
      "name": "Markdown Ticket Board",
      "code": "MDT",
      "path": "docs/CRs",
      "active": true
    },
    "stats": {
      "totalCRs": 25,
      "byStatus": {
        "Proposed": 8,
        "Approved": 5,
        "In Progress": 7,
        "Implemented": 5
      }
    }
  }
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

**Example Request**:
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

**Response Format**:
```json
{
  "crs": [
    {
      "code": "MDT-001",
      "title": "Multi-project CR dashboard",
      "status": "In Progress",
      "type": "Feature Enhancement",
      "priority": "High",
      "dateCreated": "2025-09-07T10:00:00.000Z",
      "lastModified": "2025-10-02T09:20:02.492Z",
      "assignee": "developer@example.com",
      "phaseEpic": "Phase A"
    }
  ],
  "total": 1,
  "filtered": 1
}
```

### `get_cr`
**Description**: Get detailed information about a specific CR

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key (e.g., "MDT-001")

**Response Format**:
```json
{
  "cr": {
    "code": "MDT-001",
    "title": "Multi-project CR dashboard",
    "status": "In Progress",
    "type": "Feature Enhancement",
    "priority": "High",
    "dateCreated": "2025-09-07T10:00:00.000Z",
    "lastModified": "2025-10-02T09:20:02.492Z",
    "content": "# Description\n\nDetailed markdown content...",
    "filePath": "/path/to/MDT-001-multi-project-cr-dashboard.md",
    "assignee": "developer@example.com",
    "phaseEpic": "Phase A",
    "dependsOn": ["MDT-002"],
    "blocks": ["MDT-005"],
    "relatedTickets": ["MDT-003", "MDT-004"]
  }
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
  - `priority` (string, optional): CR priority (defaults to "Medium")
  - `phaseEpic` (string, optional): Phase or epic this CR belongs to
  - `assignee` (string, optional): Person responsible for implementation
  - `relatedTickets` (string, optional): Comma-separated list of related CR codes
  - `dependsOn` (string, optional): Comma-separated list of CR keys this depends on
  - `blocks` (string, optional): Comma-separated list of CR keys this blocks
  - `content` (string, optional): Full markdown content (overrides template if provided)

**Example Request**:
```json
{
  "project": "MDT",
  "type": "Feature Enhancement",
  "data": {
    "title": "Add user authentication system",
    "priority": "High",
    "assignee": "senior-dev@example.com",
    "phaseEpic": "Phase 2",
    "dependsOn": "MDT-010,MDT-015"
  }
}
```

**Response Format**:
```json
{
  "cr": {
    "code": "MDT-025",
    "title": "Add user authentication system",
    "status": "Proposed",
    "type": "Feature Enhancement",
    "priority": "High",
    "dateCreated": "2025-10-02T09:20:02.492Z",
    "lastModified": "2025-10-02T09:20:02.492Z",
    "filePath": "/path/to/MDT-025-add-user-authentication-system.md",
    "assignee": "senior-dev@example.com",
    "phaseEpic": "Phase 2"
  }
}
```

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

**Example Request**:
```json
{
  "project": "MDT",
  "key": "MDT-001",
  "attributes": {
    "priority": "Critical",
    "assignee": "lead-dev@example.com",
    "blocks": "MDT-010,MDT-015"
  }
}
```

### `update_cr_status`
**Description**: Update the status of an existing CR with workflow validation

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key
- `status` (string, required): New status ("Proposed", "Approved", "In Progress", "Implemented", "Rejected", "On Hold")

**Example Request**:
```json
{
  "project": "MDT",
  "key": "MDT-001",
  "status": "Approved"
}
```

### `delete_cr`
**Description**: Delete a CR (typically used for implemented bug fixes)

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key

**Response Format**:
```json
{
  "message": "CR MDT-001 deleted successfully",
  "deletedFile": "/path/to/deleted/file.md"
}
```

## Section-Based Content Tools

**Token Efficiency**: 84-94% savings compared to full document operations

### `list_cr_sections`
**Description**: List all sections in a CR document with hierarchical tree structure. Use this to discover available sections before reading or updating.

**Parameters**:
- `project` (string, required): Project key (e.g., "MDT", "SEB")
- `key` (string, required): CR key (e.g., "MDT-001", "SEB-010")

**Response Format**:
```json
{
  "sections": [
    {
      "title": "Description",
      "level": 2,
      "path": "## Description",
      "hasContent": true
    },
    {
      "title": "Problem Statement",
      "level": 3,
      "path": "## Description / ### Problem Statement",
      "hasContent": true
    },
    {
      "title": "Implementation",
      "level": 2,
      "path": "## Implementation",
      "hasContent": true
    }
  ],
  "totalSections": 3
}
```

### `get_cr_section`
**Description**: Read specific section content without loading full document. Use `list_cr_sections` first to discover available sections.

**Parameters**:
- `project` (string, required): Project key (e.g., "MDT", "SEB")
- `key` (string, required): CR key (e.g., "MDT-001", "SEB-010")
- `section` (string, required): Section to read. Can be:
  - Simple name: "Problem Statement" or "Requirements"
  - Markdown header: "### Problem Statement" or "## 2. Solution Analysis"
  - Hierarchical path for duplicates: "## Feature AA / ### Requirements"

**Example Request**:
```json
{
  "project": "MDT",
  "key": "MDT-001",
  "section": "## Implementation"
}
```

**Response Format**:
```json
{
  "section": {
    "title": "Implementation",
    "level": 2,
    "content": "Detailed implementation content...",
    "path": "## Implementation"
  }
}
```

### `update_cr_section`
**Description**: Update a specific section efficiently. Supports replace, append, and prepend operations.

**Parameters**:
- `project` (string, required): Project key (e.g., "MDT", "SEB")
- `key` (string, required): CR key (e.g., "MDT-001", "SEB-010")
- `section` (string, required): Section to update (same format as `get_cr_section`)
- `operation` (string, required): Operation type: `"replace"`, `"append"`, or `"prepend"`
- `content` (string, required): Content to apply

**Example Request**:
```json
{
  "project": "MDT",
  "key": "MDT-001",
  "section": "## Implementation",
  "operation": "append",
  "content": "\n\n### Additional Technical Notes\n\nNew implementation details..."
}
```

**Response Format**:
```json
{
  "message": "Section updated successfully",
  "section": "## Implementation",
  "operation": "append",
  "bytesChanged": 156
}
```

## Template Tools

### `list_cr_templates`
**Description**: List all available CR template types

**Parameters**: None

**Response Format**:
```json
{
  "templates": [
    {
      "type": "Architecture",
      "description": "System design and architectural decisions",
      "sections": ["Description", "Rationale", "Solution Analysis", "Implementation", "Acceptance Criteria"]
    },
    {
      "type": "Feature Enhancement",
      "description": "New features and capabilities",
      "sections": ["Description", "Rationale", "Solution Analysis", "Implementation", "Acceptance Criteria"]
    },
    {
      "type": "Bug Fix",
      "description": "Issue resolution and fixes",
      "sections": ["Problem Statement", "Root Cause Analysis", "Solution", "Testing", "Acceptance Criteria"]
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
  "template": {
    "type": "Feature Enhancement",
    "structure": {
      "sections": [
        {
          "title": "Description",
          "level": 2,
          "required": true,
          "subsections": [
            {
              "title": "Problem Statement",
              "level": 3,
              "required": true
            },
            {
              "title": "Current State",
              "level": 3,
              "required": false
            }
          ]
        }
      ]
    },
    "content": "# Full template markdown content..."
  }
}
```

## Analysis Tools

### `suggest_cr_improvements`
**Description**: Get suggestions for improving an existing CR

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key to analyze

**Response Format**:
```json
{
  "suggestions": [
    {
      "category": "Content",
      "priority": "High",
      "suggestion": "Add more detailed acceptance criteria",
      "reason": "Current acceptance criteria are too vague for implementation"
    },
    {
      "category": "Structure",
      "priority": "Medium",
      "suggestion": "Include risk assessment section",
      "reason": "High-priority features should include risk analysis"
    }
  ],
  "overallScore": 7.5,
  "strengths": [
    "Clear problem statement",
    "Well-defined implementation approach"
  ],
  "weaknesses": [
    "Missing acceptance criteria details",
    "No risk assessment included"
  ]
}
```

## Error Handling

### Standard Error Format
All MCP tools return errors in a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context",
    "value": "Problematic value"
  }
}
```

### Common Error Codes

- `PROJECT_NOT_FOUND` - Specified project doesn't exist
- `CR_NOT_FOUND` - Specified CR doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `FILE_SYSTEM_ERROR` - File operation failed
- `TEMPLATE_ERROR` - Template processing failed
- `SECTION_NOT_FOUND` - Specified section doesn't exist
- `DUPLICATE_CR` - CR with same code already exists

### Example Error Responses

**Project Not Found**:
```json
{
  "error": "Project not found",
  "code": "PROJECT_NOT_FOUND",
  "details": {
    "project": "INVALID",
    "availableProjects": ["MDT", "API", "WEB"]
  }
}
```

**Validation Error**:
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "title": "Title is required",
    "type": "Invalid CR type: 'InvalidType'"
  }
}
```

**Section Not Found**:
```json
{
  "error": "Section not found in document",
  "code": "SECTION_NOT_FOUND",
  "details": {
    "section": "## Invalid Section",
    "availableSections": ["## Description", "## Implementation", "## Acceptance Criteria"]
  }
}
```

## Configuration

The MCP server uses shared configuration from:
- **Global Config**: `~/.config/markdown-ticket/mcp-server.toml`
- **Templates**: `shared/templates/` directory
- **Shared Services**: Unified project discovery, markdown parsing, and template management

### Environment Variables

- `MCP_PROJECT_FILTER` - Limit to specific project code
- `MCP_SCAN_PATHS` - Comma-separated paths to scan
- `MCP_CONFIG_PATH` - Custom configuration file path
- `MCP_LOG_LEVEL` - Logging level (error, warn, info, debug)

## Performance Considerations

### Token Efficiency
- **Section Operations**: 84-94% token savings vs full document operations
- **Filtered Queries**: Use `list_crs` filters to reduce response size
- **Targeted Updates**: Use `update_cr_attrs` for attribute-only changes

### Rate Limiting
- File system operations are throttled to prevent conflicts
- Concurrent operations on same CR are queued
- Large batch operations are processed incrementally

### Caching
- Project configurations are cached for performance
- Template content is cached after first load
- Section parsing results are cached per document
