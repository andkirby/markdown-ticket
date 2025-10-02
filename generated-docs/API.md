# API Reference

The Markdown Ticket Board API provides RESTful endpoints for managing projects, tickets, and real-time updates. All endpoints return JSON responses and follow standard HTTP conventions.

## Base URL

```
http://localhost:3001/api
```

## Endpoints

### Project Management

#### List All Projects
```http
GET /api/projects
```

**Description**: Retrieves all discovered projects with their configuration and metadata.

**Response**:
```json
{
  "projects": [
    {
      "id": "markdown-ticket",
      "project": {
        "name": "Markdown Ticket Board",
        "code": "MDT",
        "path": "docs/CRs",
        "configFile": ".mdt-config.toml",
        "counterFile": ".mdt-next",
        "startNumber": 1,
        "active": true,
        "description": "AI-powered Kanban board for developers",
        "repository": "https://github.com/user/markdown-ticket"
      },
      "metadata": {
        "dateRegistered": "2025-10-02",
        "lastAccessed": "2025-10-02",
        "version": "1.0.0"
      },
      "autoDiscovered": true,
      "configPath": "/path/to/project/.mdt-config.toml"
    }
  ]
}
```

#### Get Project Details
```http
GET /api/projects/:projectId
```

**Parameters**:
- `projectId` (string): Unique project identifier

**Response**:
```json
{
  "project": {
    "id": "markdown-ticket",
    "project": {
      "name": "Markdown Ticket Board",
      "code": "MDT",
      "path": "docs/CRs",
      "active": true,
      "description": "AI-powered Kanban board for developers"
    },
    "tickets": {
      "total": 25,
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

#### Create New Project
```http
POST /api/projects
```

**Request Body**:
```json
{
  "name": "New Project",
  "code": "NP",
  "path": "/path/to/project",
  "description": "Project description",
  "repository": "https://github.com/user/new-project"
}
```

**Response**:
```json
{
  "project": {
    "id": "new-project",
    "project": {
      "name": "New Project",
      "code": "NP",
      "path": "docs/CRs",
      "configFile": ".mdt-config.toml",
      "active": true,
      "description": "Project description"
    },
    "metadata": {
      "dateRegistered": "2025-10-02",
      "lastAccessed": "2025-10-02",
      "version": "1.0.0"
    }
  }
}
```

#### Update Project
```http
PUT /api/projects/:projectId
```

**Request Body**:
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "repository": "https://github.com/user/updated-repo"
}
```

**Response**:
```json
{
  "project": {
    "id": "project-id",
    "project": {
      "name": "Updated Project Name",
      "description": "Updated description",
      "repository": "https://github.com/user/updated-repo"
    }
  }
}
```

#### Delete Project
```http
DELETE /api/projects/:projectId
```

**Response**:
```json
{
  "message": "Project removed from registry",
  "projectId": "project-id"
}
```

### Ticket Management

#### List Project Tickets
```http
GET /api/projects/:projectId/tickets
```

**Query Parameters**:
- `status` (string, optional): Filter by status (Proposed, Approved, In Progress, Implemented)
- `type` (string, optional): Filter by type (Feature Enhancement, Bug Fix, etc.)
- `priority` (string, optional): Filter by priority (Low, Medium, High, Critical)
- `assignee` (string, optional): Filter by assignee
- `sort` (string, optional): Sort field (code, title, dateCreated, lastModified)
- `order` (string, optional): Sort order (asc, desc)

**Example Request**:
```http
GET /api/projects/mdt/tickets?status=In Progress&sort=lastModified&order=desc
```

**Response**:
```json
{
  "tickets": [
    {
      "code": "MDT-001",
      "title": "Multi-project CR dashboard",
      "status": "In Progress",
      "type": "Feature Enhancement",
      "priority": "High",
      "dateCreated": "2025-09-07T10:00:00.000Z",
      "lastModified": "2025-10-02T09:20:02.492Z",
      "content": "# Description\n\nImplement multi-project dashboard...",
      "filePath": "/path/to/MDT-001-multi-project-cr-dashboard.md",
      "phaseEpic": "Phase A",
      "assignee": "developer@example.com",
      "dependsOn": ["MDT-002"],
      "blocks": ["MDT-005"],
      "relatedTickets": ["MDT-003", "MDT-004"]
    }
  ],
  "total": 1,
  "filtered": 1
}
```

#### Get Ticket Details
```http
GET /api/projects/:projectId/tickets/:ticketCode
```

**Parameters**:
- `projectId` (string): Project identifier
- `ticketCode` (string): Ticket code (e.g., "MDT-001")

**Response**:
```json
{
  "ticket": {
    "code": "MDT-001",
    "title": "Multi-project CR dashboard",
    "status": "In Progress",
    "type": "Feature Enhancement",
    "priority": "High",
    "dateCreated": "2025-09-07T10:00:00.000Z",
    "lastModified": "2025-10-02T09:20:02.492Z",
    "content": "# Description\n\nDetailed markdown content...",
    "filePath": "/path/to/ticket.md",
    "phaseEpic": "Phase A",
    "assignee": "developer@example.com"
  }
}
```

#### Create New Ticket
```http
POST /api/projects/:projectId/tickets
```

**Request Body**:
```json
{
  "title": "New Feature Request",
  "type": "Feature Enhancement",
  "priority": "Medium",
  "content": "# Description\n\nDetailed description of the feature...",
  "phaseEpic": "Phase B",
  "assignee": "developer@example.com"
}
```

**Response**:
```json
{
  "ticket": {
    "code": "MDT-025",
    "title": "New Feature Request",
    "status": "Proposed",
    "type": "Feature Enhancement",
    "priority": "Medium",
    "dateCreated": "2025-10-02T09:20:02.492Z",
    "lastModified": "2025-10-02T09:20:02.492Z",
    "content": "# Description\n\nDetailed description of the feature...",
    "filePath": "/path/to/MDT-025-new-feature-request.md"
  }
}
```

#### Update Ticket
```http
PATCH /api/projects/:projectId/tickets/:ticketCode
```

**Request Body** (partial update):
```json
{
  "status": "Approved",
  "priority": "High",
  "assignee": "senior-dev@example.com"
}
```

**Response**:
```json
{
  "ticket": {
    "code": "MDT-001",
    "title": "Multi-project CR dashboard",
    "status": "Approved",
    "priority": "High",
    "assignee": "senior-dev@example.com",
    "lastModified": "2025-10-02T09:25:00.000Z"
  }
}
```

#### Delete Ticket
```http
DELETE /api/projects/:projectId/tickets/:ticketCode
```

**Response**:
```json
{
  "message": "Ticket deleted successfully",
  "ticketCode": "MDT-001"
}
```

### Real-time Updates

#### Server-Sent Events Stream
```http
GET /api/events
```

**Description**: Establishes a Server-Sent Events connection for real-time updates.

**Headers**:
```
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Types**:

**Ticket Updated**:
```
event: ticket-updated
data: {"projectId": "mdt", "ticketCode": "MDT-001", "changes": {"status": "Approved"}}
```

**Ticket Created**:
```
event: ticket-created
data: {"projectId": "mdt", "ticket": {"code": "MDT-025", "title": "New Feature"}}
```

**Ticket Deleted**:
```
event: ticket-deleted
data: {"projectId": "mdt", "ticketCode": "MDT-001"}
```

**Project Updated**:
```
event: project-updated
data: {"projectId": "mdt", "changes": {"name": "Updated Name"}}
```

### Configuration Management

#### Get Application Configuration
```http
GET /api/config
```

**Response**:
```json
{
  "config": {
    "sorting": {
      "attributes": [
        {
          "name": "code",
          "label": "Key",
          "default_direction": "desc",
          "system": true
        },
        {
          "name": "title",
          "label": "Title",
          "default_direction": "asc",
          "system": true
        }
      ],
      "preferences": {
        "selected_attribute": "lastModified",
        "selected_direction": "desc"
      }
    },
    "statuses": ["Proposed", "Approved", "In Progress", "Implemented", "Rejected"],
    "types": ["Feature Enhancement", "Bug Fix", "Architecture", "Technical Debt", "Documentation"],
    "priorities": ["Low", "Medium", "High", "Critical"]
  }
}
```

#### Refresh Project Discovery
```http
POST /api/config/refresh
```

**Response**:
```json
{
  "message": "Project discovery refreshed",
  "discovered": 3,
  "updated": 1
}
```

#### Clear Configuration Cache
```http
DELETE /api/config/cache
```

**Response**:
```json
{
  "message": "Configuration cache cleared"
}
```

### Health Check

#### Application Health
```http
GET /api/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T09:20:02.492Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "fileWatcher": "active",
    "projectDiscovery": "active",
    "sseConnections": 2
  }
}
```

## Authentication

Currently, the API does not implement authentication. All endpoints are publicly accessible when running locally. For production deployments, consider implementing:

- **API Key Authentication**: Simple token-based authentication
- **JWT Tokens**: Stateless authentication with user sessions
- **OAuth Integration**: Third-party authentication providers
- **Role-based Access Control**: Different permission levels for users

## Error Handling

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data or parameters
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (duplicate ticket codes, etc.)
- `422 Unprocessable Entity` - Validation errors
- `500 Internal Server Error` - Server-side error

### Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific validation error",
    "value": "Invalid value provided"
  },
  "timestamp": "2025-10-02T09:20:02.492Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `FILE_SYSTEM_ERROR` - File system operation failed
- `CONFIGURATION_ERROR` - Configuration file error
- `PROJECT_NOT_CONFIGURED` - Project missing required configuration

### Example Error Responses

**Validation Error**:
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "title": "Title is required",
    "type": "Invalid ticket type"
  },
  "timestamp": "2025-10-02T09:20:02.492Z"
}
```

**Resource Not Found**:
```json
{
  "error": "Ticket not found",
  "code": "RESOURCE_NOT_FOUND",
  "details": {
    "ticketCode": "MDT-999",
    "projectId": "mdt"
  },
  "timestamp": "2025-10-02T09:20:02.492Z"
}
```

**File System Error**:
```json
{
  "error": "Unable to write ticket file",
  "code": "FILE_SYSTEM_ERROR",
  "details": {
    "path": "/path/to/ticket.md",
    "reason": "Permission denied"
  },
  "timestamp": "2025-10-02T09:20:02.492Z"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. For production use, consider:

- **Request Rate Limiting**: Limit requests per IP/user per time window
- **File Operation Throttling**: Prevent excessive file system operations
- **SSE Connection Limits**: Limit concurrent SSE connections per client

## CORS Configuration

The API is configured to accept requests from any origin during development:

```javascript
app.use(cors({
  origin: true,
  credentials: true
}));
```

For production, configure specific allowed origins:

```javascript
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true
}));
```
