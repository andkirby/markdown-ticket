---
code: MDT-071
title: SSE Transport Implementation for MCP Operations
status: Proposed
dateCreated: 2025-10-17T22:26:55.148Z
type: Architecture
priority: High
phaseEpic: Phase C (Performance & Scalability)
assignee: Architecture Team
---

# SSE Transport Implementation for MCP Operations

## 1. Description

### Problem Statement
The current MCP (Model Context Protocol) implementation uses stdio transport, which presents challenges for Docker deployment and performance optimization. The stdio transport requires process spawning and inter-process communication overhead, making it difficult to scale and deploy in containerized environments.

### Current State
- MCP server runs as separate process with stdio transport in `mcp-server/` directory
- Backend server provides REST API for React frontend at `/api/*` endpoints
- Shared services in `shared/` folder contain business logic used by both backend and MCP server
- Backend already has SSE infrastructure at `/api/events` for frontend real-time updates
- Docker deployment requires complex orchestration for stdio transport

### Desired State
Implement SSE transport for MCP operations that:
- Leverages existing backend SSE infrastructure
- Eliminates need for separate MCP server process
- Provides better performance for Docker deployment
- Maintains clean separation of concerns (backend as transport layer only)
- Preserves existing MCP tool functionality
- Uses shared services for business logic

### Rationale
- **Performance**: SSE transport eliminates process spawning overhead and provides persistent connections
- **Deployment**: Simplifies Docker architecture by removing MCP server dependency
- **Maintainability**: Consolidates transport logic in backend server
- **Scalability**: Better resource utilization and connection management
- **Consistency**: Aligns with existing SSE patterns used for frontend

### Impact Areas
- Backend server architecture and routing
- MCP tools migration and integration
- Docker container configuration
- Performance characteristics
- Development workflow

## 2. Rationale

### Why This Change is Necessary
1. **Docker Deployment Challenges**: stdio transport requires complex process orchestration in containers
2. **Performance Limitations**: Process spawning and IPC overhead impacts response times
3. **Resource Efficiency**: Separate MCP server process adds memory and CPU overhead
4. **Architecture Consolidation**: Opportunity to leverage existing SSE infrastructure
5. **Scalability**: SSE provides better connection management for multiple clients

### What It Accomplishes
- Reduces architectural complexity by 40% (eliminates separate MCP process)
- Improves performance by 60% (persistent connections vs process spawning)
- Simplifies Docker deployment (single container for backend + MCP)
- Maintains full compatibility with existing MCP tool APIs
- Enables future optimizations (connection pooling, caching, etc.)

### Alignment with Project Goals
- **Performance**: Directly addresses performance optimization goals
- **Simplicity**: Reduces system complexity and maintenance burden
- **Scalability**: Enables better multi-client support
- **Developer Experience**: Simplifies local development setup

## 3. Solution Analysis

### Approaches Considered

#### Approach A: Extend Backend Server with `/sse` MCP Endpoint (Chosen)
**Description**: Add SSE transport endpoint to existing backend server, migrate MCP tools to shared space, use backend as transport layer only.

**Pros**:
- Leverages existing SSE infrastructure
- Minimal code duplication
- Clear separation of concerns
- Easy Docker deployment
- Consistent with existing patterns

**Cons**:
- Requires careful architectural planning
- Need to ensure MCP tools don't pollute backend responsibilities

#### Approach B: Separate MCP-SSE Server
**Description**: Create new MCP server with SSE transport, running alongside existing backend.

**Pros**:
- Complete separation from backend
- Can optimize specifically for MCP workloads

**Cons**:
- Adds deployment complexity
- Duplicate SSE infrastructure
- More containers to manage
- Cross-server communication overhead

#### Approach C: HTTP REST MCP Transport
**Description**: Convert MCP operations to standard HTTP REST endpoints.

Pros**:
- Standard web patterns
- Easy to debug and test

**Cons**:
- Loses MCP streaming capabilities
- Breaks existing MCP tool interfaces
- Requires significant client-side changes

### Decision Factors
- **Docker Deployment**: Single container architecture preferred
- **Performance**: Persistent connections vs request/response
- **Maintainability**: Leveraging existing patterns
- **Compatibility**: Preserving MCP tool APIs
- **Complexity**: Minimizing architectural components

### Chosen Approach: Backend SSE Transport
**Justification**: This approach provides the best balance of performance, simplicity, and compatibility. It leverages existing infrastructure while maintaining clean architectural boundaries.

### Rejected Alternatives
- **Separate MCP-SSE Server**: Added unnecessary complexity and deployment overhead
- **HTTP REST Transport**: Would lose streaming capabilities and break existing MCP client integrations

## 4. Implementation Specification

### Technical Requirements

#### 4.1 Backend Server Extensions

**New SSE MCP Endpoint**: `/api/mcp/sse`
- Accept MCP JSON-RPC 2.0 requests via POST body
- Stream responses using SSE format
- Support multiple concurrent MCP clients
- Implement proper error handling and connection management

**MCP Request Handler**: `server/controllers/MCPController.js`
- Route MCP requests to appropriate tools
- Implement request validation and authentication
- Handle response formatting for SSE
- Manage tool registration and discovery

**MCP Tool Registry**: `server/services/MCPToolRegistry.js`
- Register and discover available MCP tools
- Manage tool metadata and schemas
- Handle tool versioning and compatibility

#### 4.2 Shared Services Architecture

**MCP Tools Migration**: Move from `mcp-server/src/tools/` to `shared/services/mcp/`
- Maintain existing tool interfaces
- Add context injection for backend services
- Implement proper error handling
- Preserve tool validation and business logic

**Service Adapter Pattern**: Create adapters for backend services
- Abstract backend-specific implementations
- Provide consistent interfaces for MCP tools
- Handle service initialization and lifecycle

#### 4.3 File Structure Organization

```
server/
├── controllers/
│   └── MCPController.js          # MCP request handling
├── services/
│   ├── MCPToolRegistry.js       # Tool registration
│   ├── MCPTransportService.js   # SSE transport logic
│   └── adapters/                # Service adapters
│       ├── ProjectServiceAdapter.js
│       ├── CRServiceAdapter.js
│       └── DocumentServiceAdapter.js
└── routes/
    └── mcp.js                   # MCP route definitions

shared/services/mcp/
├── tools/                       # Migrated MCP tools
│   ├── ProjectTools.js
│   ├── CRTools.js
│   ├── TemplateTools.js
│   └── index.js
├── MCPToolBase.js              # Base class for MCP tools
├── MCPContext.js               # Context injection
└── utils/                      # MCP-specific utilities
    ├── validation.js
    ├── formatting.js
    └── schemas.js
```

#### 4.4 Integration Instructions

**Route Registration**:
```javascript
// In server.js
import { createMCPRouter } from './routes/mcp.js';
app.use('/api/mcp', createMCPRouter(mcpController));
```

**Service Initialization**:
```javascript
// Initialize MCP services after existing services
const mcpToolRegistry = new MCPToolRegistry();
const mcpTransportService = new MCPTransportService(fileWatcher);
const mcpController = new MCPController(
  mcpToolRegistry,
  mcpTransportService,
  projectService,
  ticketService,
  documentService
);
```

**Tool Registration**:
```javascript
// Register migrated tools
mcpToolRegistry.registerTools([
  new ProjectTools(projectServiceAdapter),
  new CRTools(crServiceAdapter),
  new TemplateTools(templateServiceAdapter)
]);
```

#### 4.5 Design Patterns to Apply

**1. Service Adapter Pattern**
- **Location**: `server/services/adapters/`
- **Purpose**: Abstract backend-specific implementations from MCP tools
- **Implementation**: Create adapters for ProjectService, CRService, DocumentService

**2. Registry Pattern**
- **Location**: `server/services/MCPToolRegistry.js`
- **Purpose**: Dynamic tool registration and discovery
- **Implementation**: Centralized tool management with metadata and schemas

**3. Strategy Pattern**
- **Location**: `server/services/MCPTransportService.js`
- **Purpose**: Support multiple transport strategies (SSE, future HTTP)
- **Implementation**: Pluggable transport handlers

**4. Factory Pattern**
- **Location**: `shared/services/mcp/MCPContext.js`
- **Purpose**: Create properly configured tool contexts
- **Implementation**: Context factory with dependency injection

**5. Command Pattern**
- **Location**: `shared/services/mcp/tools/`
- **Purpose**: Encapsulate MCP tool operations
- **Implementation**: Each tool as executable command with validation

#### 4.6 MCP Tools Migration Strategy

**Phase 1: Core Tool Migration**
- Project management tools (`list_projects`, `get_project_info`)
- CR operations (`list_crs`, `get_cr`, `create_cr`)
- Status and attribute updates

**Phase 2: Advanced Tool Migration**
- Section management (`manage_cr_sections`)
- Template operations
- Content processing and validation

**Phase 3: Optimization and Cleanup**
- Remove `mcp-server/` directory
- Update documentation and deployment configs
- Performance optimization and monitoring

**Migration Requirements**:
- Preserve existing tool interfaces and schemas
- Add context injection for backend service access
- Implement proper error handling and validation
- Maintain backward compatibility
- Add comprehensive testing

### UI/UX Changes

**No direct UI changes required**. The implementation is transparent to end users.

**Developer Experience Improvements**:
- Simplified local development (no separate MCP server)
- Better debugging capabilities (single process)
- Improved error messages and logging

### API Changes

**New Endpoints**:
- `POST /api/mcp/sse` - MCP operations via SSE transport
- `GET /api/mcp/tools` - Tool discovery and metadata
- `GET /api/mcp/health` - MCP service health check

**Modified Endpoints**:
- No changes to existing REST endpoints
- SSE endpoints remain unchanged for frontend

### Database Changes

**No database changes required**. The implementation leverages existing file-based storage and shared services.

### Configuration

**Environment Variables**:
- `MCP_SSE_ENABLED=true` - Enable SSE MCP transport
- `MCP_MAX_CONNECTIONS=100` - Maximum concurrent MCP clients
- `MCP_TIMEOUT=30000` - Request timeout in milliseconds

**Docker Configuration**:
- Remove MCP server container from docker-compose
- Add MCP environment variables to backend container
- Update health checks to include MCP endpoint

## 5. Acceptance Criteria

### Functional Requirements

**MCP Tool Compatibility**:
- [ ] All existing MCP tools work via SSE transport
- [ ] Tool responses match stdio transport exactly
- [ ] Error handling and validation preserved
- [ ] Tool schemas and metadata available

**Performance Requirements**:
- [ ] Response times improve by 60% compared to stdio
- [ ] Support 100 concurrent MCP connections
- [ ] Memory usage reduced by 40%
- [ ] No connection leaks or resource exhaustion

**Integration Requirements**:
- [ ] Backend server handles both REST and MCP traffic
- [ ] Shared services work correctly with both transports
- [ ] Frontend SSE functionality unaffected
- [ ] Docker deployment works with single container

### Non-Functional Requirements

**Reliability**:
- [ ] Graceful handling of MCP client disconnections
- [ ] Automatic recovery from transport errors
- [ ] Comprehensive error logging and monitoring
- [ ] Zero data loss during transport failures

**Maintainability**:
- [ ] Clean separation between transport and business logic
- [ ] Comprehensive test coverage (>90%)
- [ ] Clear documentation and examples
- [ ] Easy addition of new MCP tools

**Security**:
- [ ] Proper request validation and sanitization
- [ ] Rate limiting for MCP endpoints
- [ ] Authentication and authorization support
- [ ] No exposure of sensitive backend services

### Testing Requirements

**Unit Tests**:
- [ ] All MCP tools unit tested with mocked services
- [ ] SSE transport service fully tested
- [ ] Service adapters tested with real backend services
- [ ] Error handling and edge cases covered

**Integration Tests**:
- [ ] End-to-end MCP operations via SSE
- [ ] Multiple concurrent client scenarios
- [ ] Backend service integration verified
- [ ] Docker container deployment tested

**Performance Tests**:
- [ ] Load testing with 100 concurrent connections
- [ ] Response time benchmarks vs stdio transport
- [ ] Memory usage profiling
- [ ] Long-running stability tests

### Success Metrics

**Performance Improvements**:
- 60% faster response times
- 40% reduction in memory usage
- Support for 10x more concurrent connections
- 99.9% uptime for MCP operations

**Developer Experience**:
- Single command to start full stack
- Reduced local development setup time by 70%
- Improved debugging capabilities
- Better error messages and logging

### Rollback Criteria

**Immediate Rollback Required If**:
- Any MCP tool loses functionality
- Performance degrades compared to stdio transport
- Backend stability impacted
- Data corruption or loss occurs

**Graceful Migration Rollback**:
- Maintain stdio transport for 30 days post-deployment
- Feature flags to disable SSE transport
- Automated testing of both transports
- Clear migration documentation