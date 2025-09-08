# MCP Tools Documentation

Complete reference for all available MCP tools with input parameters, response formats, and examples.

## Core Tools

### `list_projects`
**Description**: List all discovered projects with their basic information

**Parameters**: None

**Response Format**:
```json
{
  "projects": [
    {
      "id": "MDT",
      "project": {
        "name": "Markdown Ticket Board",
        "path": "/path/to/project",
        "configFile": ".mdt-config.toml",
        "active": true,
        "description": "Project description"
      },
      "metadata": {
        "dateRegistered": "2025-09-07",
        "lastAccessed": "2025-09-07"
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
  "id": "MDT",
  "project": {
    "name": "Markdown Ticket Board",
    "code": "MDT",
    "path": "docs/CRs",
    "startNumber": 1,
    "counterFile": ".mdt-next"
  },
  "tickets": {
    "codePattern": "MDT-###"
  }
}
```

## CR Management

### `list_crs`
**Description**: List CRs for a project with optional filtering

**Parameters**:
- `project` (string, required): Project key
- `filters` (object, optional):
  - `status`: Single status or array (Proposed, Approved, In Progress, Implemented, Rejected)
  - `type`: Single type or array (Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation)
  - `priority`: Single priority or array (Low, Medium, High, Critical)

**Response Format**:
```json
{
  "crs": [
    {
      "code": "MDT-001",
      "title": "Example Ticket",
      "status": "Proposed",
      "type": "Feature Enhancement",
      "priority": "Medium",
      "dateCreated": "2025-09-06T10:00:00.000Z",
      "lastModified": "2025-09-06T15:30:00.000Z"
    }
  ],
  "total": 1,
  "filtered": true
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
  "code": "MDT-001",
  "title": "Example Ticket",
  "status": "Proposed",
  "type": "Feature Enhancement",
  "priority": "Medium",
  "dateCreated": "2025-09-06T10:00:00.000Z",
  "lastModified": "2025-09-06T15:30:00.000Z",
  "content": "Full markdown content...",
  "filePath": "/path/to/MDT-001-example-ticket.md"
}
```

### `create_cr`
**Description**: Create a new CR in the specified project

**Parameters**:
- `project` (string, required): Project key
- `type` (string, required): CR type (Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation)
- `data` (object, required):
  - `title` (string, required): CR title/summary
  - `description` (string, optional): Problem statement
  - `priority` (string, optional): Priority (Low, Medium, High, Critical) - defaults to Medium
  - `rationale` (string, optional): Rationale for this CR
  - `impactAreas` (array, optional): Areas of the system impacted
  - `phaseEpic` (string, optional): Phase or epic this CR belongs to
  - `content` (string, optional): Full markdown content (overrides template)

**Response Format**:
```json
{
  "success": true,
  "cr": {
    "code": "MDT-028",
    "title": "New Feature",
    "status": "Proposed",
    "filePath": "/path/to/MDT-028-new-feature.md"
  },
  "message": "CR created successfully"
}
```

### `update_cr_status`
**Description**: Update the status of an existing CR

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key
- `status` (string, required): New status (Proposed, Approved, In Progress, Implemented, Rejected)

**Response Format**:
```json
{
  "success": true,
  "oldStatus": "Proposed",
  "newStatus": "Approved",
  "message": "Status updated successfully"
}
```

**Status Transitions**:
- From Proposed: → Approved, Rejected
- From Approved: → In Progress, Rejected
- From In Progress: → Implemented, Approved
- From Implemented: → In Progress
- From Rejected: → Proposed

### `delete_cr`
**Description**: Delete a CR (typically used for implemented bug fixes)

**Parameters**:
- `project` (string, required): Project key
- `key` (string, required): CR key

**Response Format**:
```json
{
  "success": true,
  "deletedCR": {
    "code": "MDT-001",
    "title": "Deleted Ticket",
    "type": "Bug Fix"
  },
  "message": "CR deleted successfully"
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
    "Architecture",
    "Feature Enhancement", 
    "Bug Fix",
    "Technical Debt",
    "Documentation"
  ]
}
```

### `get_cr_template`
**Description**: Get the template structure for a specific CR type

**Parameters**:
- `type` (string, required): CR type

**Response Format**:
```json
{
  "type": "Feature Enhancement",
  "template": "# Problem Statement\n\n## Proposed Solution\n\n## Implementation Details\n\n## Testing Strategy\n\n## Acceptance Criteria"
}
```

## Utility Tools

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
      "suggestion": "Add acceptance criteria section",
      "reason": "Missing clear success metrics"
    },
    {
      "category": "Structure", 
      "priority": "Medium",
      "suggestion": "Break down implementation into smaller tasks",
      "reason": "Large scope may be difficult to track"
    }
  ],
  "overallScore": 7.5,
  "strengths": ["Clear problem statement", "Good technical detail"],
  "weaknesses": ["Missing acceptance criteria", "No testing strategy"]
}
```

## Error Handling

All tools return errors in this format:
```json
{
  "error": true,
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `PROJECT_NOT_FOUND`: Project doesn't exist
- `CR_NOT_FOUND`: CR doesn't exist  
- `INVALID_STATUS_TRANSITION`: Status change not allowed
- `VALIDATION_ERROR`: Input validation failed
- `FILE_ERROR`: File system operation failed
