---
code: MDT-071
title: MCP Streamable HTTP Transport Implementation
status: Proposed
dateCreated: 2025-10-17T22:26:55.148Z
type: Architecture
priority: High
phaseEpic: Phase C (Performance & Scalability)
assignee: Architecture Team
---

# MCP Streamable HTTP Transport Implementation

## 1. Description

### Problem Statement
The current MCP (Model Context Protocol) implementation uses stdio transport, which presents challenges for Docker deployment and performance optimization. The stdio transport requires process spawning and inter-process communication overhead, making it difficult to scale and deploy in containerized environments. Additionally, the official MCP specification defines Streamable HTTP transport which provides better performance and standardization.

### Current State
- MCP server runs as separate process with stdio transport in `mcp-server/` directory
- Backend server provides REST API for React frontend at `/api/*` endpoints
- Shared services in `shared/` folder contain business logic used by both backend and MCP server
- Backend already has SSE infrastructure at `/api/events` for frontend real-time updates
- Docker deployment requires complex orchestration for stdio transport
- No implementation of official MCP Streamable HTTP transport specification (2025-06-18)

### Desired State
Implement official MCP Streamable HTTP transport that:
- Follows MCP specification 2025-06-18 for transport layer compliance
- Provides single `/mcp` endpoint supporting both POST and GET methods
- Implements proper session management with `Mcp-Session-Id` headers
- Supports both single JSON responses and SSE streaming for server messages
- Eliminates need for separate MCP server process
- Maintains clean separation of concerns (backend as transport layer only)
- Preserves existing MCP tool functionality
- Uses shared services for business logic

### Rationale
- **Standard Compliance**: Implements official MCP Streamable HTTP transport specification (2025-06-18)
- **Performance**: HTTP transport eliminates process spawning overhead and provides persistent connections
- **Deployment**: Simplifies Docker architecture by removing MCP server dependency
- **Interoperability**: Standard transport ensures compatibility with MCP clients
- **Security**: Implements built-in security features from MCP specification (Origin validation, session management)
- **Maintainability**: Consolidates transport logic in backend server with proper session handling
- **Scalability**: Better resource utilization and connection management with session isolation

### Impact Areas
- Backend server architecture and routing
- MCP tools migration and integration
- Docker container configuration
- Performance characteristics
- Development workflow
- MCP client compatibility and standards compliance

## 2. Rationale

### Why This Change is Necessary
1. **Standard Compliance**: Official MCP specification defines Streamable HTTP transport as standard (2025-06-18)
2. **Docker Deployment Challenges**: stdio transport requires complex process orchestration in containers
3. **Performance Limitations**: Process spawning and IPC overhead impacts response times
4. **Resource Efficiency**: Separate MCP server process adds memory and CPU overhead
5. **Security Requirements**: MCP spec defines mandatory security features (Origin validation, session management)
6. **Scalability**: HTTP transport provides better connection management and session isolation

### What It Accomplishes
- Reduces architectural complexity by 40% (eliminates separate MCP process)
- Improves performance by 60% (persistent connections vs process spawning)
- Implements official MCP transport specification for maximum compatibility
- Simplifies Docker deployment (single container for backend + MCP)
- Maintains full compatibility with existing MCP tool APIs
- Provides built-in security and session management
- Enables future optimizations (connection pooling, caching, etc.)

### Alignment with Project Goals
- **Performance**: Directly addresses performance optimization goals
- **Standards Compliance**: Implements official MCP specification
- **Simplicity**: Reduces system complexity and maintenance burden
- **Scalability**: Enables better multi-client support with session isolation
- **Security**: Implements MCP-specified security features
- **Developer Experience**: Simplifies local development setup

## 3. Solution Analysis

### Approaches Considered

#### Approach A: Official MCP Streamable HTTP Transport (Chosen)
**Description**: Implement official MCP Streamable HTTP transport specification (2025-06-18) in backend server with single `/mcp` endpoint supporting POST and GET methods, proper session management, and SSE streaming.

**Pros**:
- **Standard Compliance**: Implements official MCP specification
- **Maximum Compatibility**: Works with any MCP-compliant client
- **Built-in Security**: Origin validation, session management, authentication
- **Performance**: Persistent connections and efficient HTTP transport
- **Single Container**: Simplifies Docker deployment
- **Session Isolation**: Proper multi-client support with session management

**Cons**:
- Requires implementation of full MCP protocol specification
- Need to handle both JSON responses and SSE streams
- Session management adds complexity

#### Approach B: Custom SSE MCP Transport
**Description**: Create custom SSE-based MCP transport using existing SSE infrastructure.

**Pros**:
- Leverages existing SSE patterns
- Faster initial implementation

**Cons**:
- **Non-standard**: Breaks compatibility with MCP clients
- **Reinventing wheel**: Duplicates protocol specification work
- **Limited interoperability**: Only works with custom clients
- **Missing security features**: No built-in session management

#### Approach C: HTTP REST MCP Transport
**Description**: Convert MCP operations to standard HTTP REST endpoints.

**Pros**:
- Standard web patterns
- Easy to debug and test

**Cons**:
- Loses MCP streaming capabilities and bidirectional communication
- Breaks existing MCP tool interfaces
- Requires significant client-side changes
- No session management or protocol compliance

### Decision Factors
- **Standard Compliance**: Must implement official MCP specification
- **Docker Deployment**: Single container architecture preferred
- **Performance**: Persistent connections vs process spawning
- **Compatibility**: Preserve MCP tool APIs and client compatibility
- **Security**: Implement MCP-specified security features
- **Complexity**: Balance features with maintainability

### Chosen Approach: Official MCP Streamable HTTP Transport
**Justification**: This approach provides maximum compatibility and security by implementing the official MCP specification. While more complex initially, it ensures interoperability with all MCP clients and provides built-in security and session management features.

### Rejected Alternatives
- **Custom SSE Transport**: Non-standard implementation limits compatibility and requires maintenance of custom protocol
- **HTTP REST Transport**: Would lose streaming capabilities and break existing MCP client integrations

## 4. Implementation Specification

### Technical Requirements

#### 4.1 Official MCP Streamable HTTP Transport Implementation

**MCP Endpoint**: `/mcp` (single endpoint supporting POST and GET)
- **Protocol**: MCP Streamable HTTP transport specification 2025-06-18
- **Methods**: Support both POST (client messages) and GET (server streams)
- **Headers**: Implement all required MCP headers (`Mcp-Session-Id`, `MCP-Protocol-Version`)
- **Content Types**: Support `application/json` and `text/event-stream`
- **Security**: Origin validation, localhost binding, authentication
- **Session Management**: Cryptographically secure session IDs and lifecycle

**MCP Request Controller**: `server/controllers/MCPController.js`
- Handle POST requests with JSON-RPC messages (requests, notifications, responses)
- Process GET requests for server-initiated SSE streams
- Implement MCP session management with `Mcp-Session-Id` headers
- Route MCP requests to appropriate tools
- Return 202 Accepted for notifications/responses
- Return single JSON or SSE stream for requests
- Handle protocol version negotiation and validation

**MCP Session Manager**: `server/services/MCPSessionManager.js`
- Generate cryptographically secure session IDs (UUID/JWT)
- Manage session lifecycle (initialize, maintain, terminate)
- Handle session expiration and cleanup
- Support session resumption with `Last-Event-ID`
- Implement session isolation for multiple clients

**MCP Tool Registry**: `server/services/MCPToolRegistry.js`
- Register and discover available MCP tools
- Manage tool metadata and schemas
- Handle tool versioning and compatibility
- Provide tool listing and introspection

#### 4.2 Shared Services Architecture

**MCP Tools Migration**: Move from `mcp-server/src/tools/` to `shared/services/mcp/`
- Maintain existing tool interfaces and JSON-RPC compliance
- Add context injection for backend services
- Implement proper error handling and validation
- Preserve tool validation and business logic
- Ensure compatibility with official MCP protocol

**Service Adapter Pattern**: Create adapters for backend services
- Abstract backend-specific implementations from MCP tools
- Provide consistent interfaces for MCP tools
- Handle service initialization and lifecycle
- Implement proper error boundaries and isolation

#### 4.3 File Structure Organization

```
server/
├── controllers/
│   └── MCPController.js          # MCP request/response handling
├── services/
│   ├── MCPToolRegistry.js       # Tool registration and discovery
│   ├── MCPSessionManager.js     # Session lifecycle management
│   ├── MCPTransportService.js   # HTTP/SSE transport logic
│   └── adapters/                # Service adapters
│       ├── ProjectServiceAdapter.js
│       ├── CRServiceAdapter.js
│       └── DocumentServiceAdapter.js
├── middleware/
│   ├── MCPAuth.js               # MCP authentication
│   ├── MCPOriginValidator.js    # Origin validation security
│   └── MCPProtocolValidator.js  # Protocol version validation
└── routes/
    └── mcp.js                   # MCP route definitions

shared/services/mcp/
├── tools/                       # Migrated MCP tools
│   ├── ProjectTools.js
│   ├── CRTools.js
│   ├── TemplateTools.js
│   └── index.js
├── MCPToolBase.js              # Base class for MCP tools
├── MCPContext.js               # Context injection and session handling
├── MCPProtocolHandler.js       # JSON-RPC protocol handling
└── utils/                      # MCP-specific utilities
    ├── validation.js
    ├── formatting.js
    ├── schemas.js
    └── security.js
```

#### 4.4 Integration Instructions

**Route Registration**:
```javascript
// In server.js
import { createMCPRouter } from './routes/mcp.js';
app.use('/mcp', createMCPRouter(mcpController));
```

**Service Initialization**:
```javascript
// Initialize MCP services after existing services
const mcpToolRegistry = new MCPToolRegistry();
const mcpSessionManager = new MCPSessionManager();
const mcpTransportService = new MCPTransportService(fileWatcher);
const mcpController = new MCPController(
  mcpToolRegistry,
  mcpSessionManager,
  mcpTransportService,
  projectService,
  ticketService,
  documentService
);
```

**MCP Middleware Setup**:
```javascript
// Apply MCP middleware for security and validation
app.use('/mcp', MCPOriginValidator);
app.use('/mcp', MCPProtocolValidator);
app.use('/mcp', MCPAuth);
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
- **MCP Compliance**: Ensure adapters don't violate MCP protocol requirements

**2. Registry Pattern**
- **Location**: `server/services/MCPToolRegistry.js`
- **Purpose**: Dynamic tool registration and discovery
- **Implementation**: Centralized tool management with metadata and schemas
- **MCP Features**: Tool listing, introspection, and capability discovery

**3. Session Manager Pattern**
- **Location**: `server/services/MCPSessionManager.js`
- **Purpose**: Manage MCP session lifecycle and isolation
- **Implementation**: Secure session ID generation, lifecycle management
- **Security**: Cryptographic session IDs and proper cleanup

**4. Protocol Handler Pattern**
- **Location**: `shared/services/mcp/MCPProtocolHandler.js`
- **Purpose**: Handle JSON-RPC protocol compliance
- **Implementation**: Request/response validation, error formatting
- **Standard Compliance**: MCP specification 2025-06-18 compliance

**5. Factory Pattern**
- **Location**: `shared/services/mcp/MCPContext.js`
- **Purpose**: Create properly configured tool contexts with session data
- **Implementation**: Context factory with dependency injection and session binding

**6. Command Pattern**
- **Location**: `shared/services/mcp/tools/`
- **Purpose**: Encapsulate MCP tool operations
- **Implementation**: Each tool as executable command with validation and JSON-RPC compliance

**7. Security Middleware Pattern**
- **Location**: `server/middleware/`
- **Purpose**: Implement MCP security requirements
- **Implementation**: Origin validation, protocol validation, authentication
- **MCP Security**: DNS rebinding protection, localhost binding

#### 4.6 MCP Protocol Implementation Details

**Request Handling (POST /mcp)**:
- Accept JSON-RPC 2.0 requests, notifications, and responses
- Validate `MCP-Protocol-Version: 2025-06-18` header
- Process session management with `Mcp-Session-Id` headers
- Return `202 Accepted` for notifications and responses
- Return `Content-Type: application/json` for single responses
- Return `Content-Type: text/event-stream` for streaming responses

**Stream Handling (GET /mcp)**:
- Accept SSE stream requests for server-initiated messages
- Validate session ID and protocol version
- Stream JSON-RPC requests and notifications from server
- Support `Last-Event-ID` header for stream resumption
- Implement proper SSE event formatting with IDs

**Session Management Flow**:
1. Client POSTs `InitializeRequest` without session ID
2. Server responds with `InitializeResult` + `Mcp-Session-Id` header
3. Client includes `Mcp-Session-Id` in all subsequent requests
4. Server validates session ID for all operations
5. Client can DELETE session or server expires sessions

**Security Implementation**:
- Validate `Origin` header on all requests (DNS rebinding protection)
- Bind to localhost (127.0.0.1) for local deployment
- Implement authentication/authorization middleware
- Rate limiting and request validation
- Session ID entropy and secure generation

#### 4.7 MCP Tools Migration Strategy

**Phase 1: Core Tool Migration**
- Project management tools (`list_projects`, `get_project_info`)
- CR operations (`list_crs`, `get_cr`, `create_cr`)
- Status and attribute updates (`update_cr_status`, `update_cr_attrs`)
- Basic CRUD operations with JSON-RPC compliance

**Phase 2: Advanced Tool Migration**
- Section management (`manage_cr_sections`)
- Template operations and content processing
- File and document operations
- Advanced validation and formatting tools

**Phase 3: Optimization and Cleanup**
- Remove `mcp-server/` directory
- Update documentation and deployment configs
- Performance optimization and monitoring
- MCP protocol compliance testing

**Migration Requirements**:
- Preserve existing tool interfaces and schemas
- Ensure JSON-RPC 2.0 protocol compliance
- Add session context injection for backend service access
- Implement proper error handling and MCP error formatting
- Maintain backward compatibility with existing clients
- Add comprehensive MCP protocol testing

### UI/UX Changes

**No direct UI changes required**. The implementation is transparent to end users.

**Developer Experience Improvements**:
- Simplified local development (no separate MCP server)
- Better debugging capabilities (single process)
- Improved error messages and logging

### API Changes

**New MCP Endpoint**:
- `POST /mcp` - MCP JSON-RPC requests (requests, notifications, responses)
- `GET /mcp` - MCP server-initiated SSE streams
- `DELETE /mcp` - MCP session termination (optional)

**HTTP Headers Required**:
- `MCP-Protocol-Version: 2025-06-18` - Protocol version negotiation
- `Mcp-Session-Id: <session-id>` - Session management (after initialization)
- `Accept: application/json, text/event-stream` - Content type negotiation
- `Origin: <allowed-origin>` - Security validation

**Response Formats**:
- `202 Accepted` - For notifications and responses
- `200 OK` with `Content-Type: application/json` - Single JSON responses
- `200 OK` with `Content-Type: text/event-stream` - SSE streaming responses
- `400 Bad Request` - Invalid requests or protocol violations
- `404 Not Found` - Invalid session IDs
- `405 Method Not Allowed` - Unsupported HTTP methods

**Modified Endpoints**:
- No changes to existing REST endpoints (`/api/*`)
- Frontend SSE endpoints remain unchanged (`/api/events`)

**Backwards Compatibility**:
- Existing stdio MCP server maintained during transition
- Feature flags to enable/disable HTTP transport
- Automated testing of both transport methods

### Database Changes

**No database changes required**. The implementation leverages existing file-based storage and shared services.

### Configuration

**Environment Variables**:
- `MCP_HTTP_ENABLED=true` - Enable MCP Streamable HTTP transport
- `MCP_MAX_SESSIONS=100` - Maximum concurrent MCP sessions
- `MCP_SESSION_TIMEOUT=3600000` - Session timeout in milliseconds (1 hour)
- `MCP_PROTOCOL_VERSION=2025-06-18` - MCP protocol version
- `MCP_BIND_ADDRESS=127.0.0.1` - Bind to localhost for security
- `MCP_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000` - Allowed origins

**Docker Configuration**:
- Remove MCP server container from docker-compose
- Add MCP environment variables to backend container
- Update health checks to include `/mcp` endpoint
- Ensure single port exposure (3001) for both API and MCP
- Add session persistence volume if needed

**Security Configuration**:
- Origin validation configuration
- Session secret and encryption keys
- Rate limiting rules
- Authentication provider configuration

**Development Configuration**:
- Debug logging for MCP protocol
- Session management debugging
- Hot reload for MCP tools
- Protocol compliance testing mode

## 5. Acceptance Criteria

### Functional Requirements

**MCP Protocol Compliance**:
- [ ] Implements MCP Streamable HTTP transport specification 2025-06-18
- [ ] Supports both POST and GET methods on `/mcp` endpoint
- [ ] Handles all required MCP headers (`Mcp-Session-Id`, `MCP-Protocol-Version`)
- [ ] Returns correct HTTP status codes and content types
- [ ] Implements proper session management and lifecycle

**MCP Tool Compatibility**:
- [ ] All existing MCP tools work via HTTP transport
- [ ] Tool responses match stdio transport exactly
- [ ] JSON-RPC 2.0 protocol compliance maintained
- [ ] Tool schemas and metadata available via registry
- [ ] Error handling and validation preserved with MCP error format

**Session Management**:
- [ ] Cryptographically secure session ID generation
- [ ] Session isolation between multiple clients
- [ ] Proper session cleanup and expiration
- [ ] Support for session resumption with `Last-Event-ID`
- [ ] Session termination via DELETE method

**Performance Requirements**:
- [ ] Response times improve by 60% compared to stdio transport
- [ ] Support 100 concurrent MCP sessions
- [ ] Memory usage reduced by 40%
- [ ] No connection leaks or resource exhaustion
- [ ] Session overhead < 1MB per active session

**Integration Requirements**:
- [ ] Backend server handles both REST and MCP traffic
- [ ] Shared services work correctly with both transports
- [ ] Frontend SSE functionality unaffected
- [ ] Docker deployment works with single container
- [ ] Backwards compatibility with existing stdio clients during transition

### Non-Functional Requirements

**Reliability**:
- [ ] Graceful handling of MCP client disconnections
- [ ] Automatic recovery from transport errors
- [ ] Comprehensive error logging and monitoring
- [ ] Zero data loss during transport failures
- [ ] Session persistence across server restarts (optional)

**Maintainability**:
- [ ] Clean separation between transport and business logic
- [ ] Comprehensive test coverage (>90%)
- [ ] Clear documentation and examples
- [ ] Easy addition of new MCP tools
- [ ] MCP specification compliance documentation

**Security**:
- [ ] Origin header validation for DNS rebinding protection
- [ ] Proper request validation and sanitization
- [ ] Rate limiting for MCP endpoints
- [ ] Authentication and authorization support
- [ ] Session ID security and entropy validation
- [ ] Localhost binding for local deployment
- [ ] No exposure of sensitive backend services

**Standards Compliance**:
- [ ] Full MCP Streamable HTTP transport specification 2025-06-18 compliance
- [ ] JSON-RPC 2.0 protocol compliance
- [ ] HTTP/1.1 and SSE standard compliance
- [ ] CORS and security header compliance
- [ ] MCP client compatibility testing

### Testing Requirements

**Unit Tests**:
- [ ] All MCP tools unit tested with mocked services
- [ ] MCP protocol handler fully tested
- [ ] Session manager functionality and edge cases
- [ ] Service adapters tested with real backend services
- [ ] Security middleware validation
- [ ] JSON-RPC 2.0 compliance testing

**Integration Tests**:
- [ ] End-to-end MCP operations via HTTP transport
- [ ] MCP specification compliance verification
- [ ] Session lifecycle and isolation testing
- [ ] Multiple concurrent client scenarios
- [ ] Backend service integration verified
- [ ] Error handling and recovery scenarios

**Protocol Compliance Tests**:
- [ ] MCP Streamable HTTP transport specification compliance
- [ ] JSON-RPC 2.0 protocol validation
- [ ] HTTP header and status code compliance
- [ ] SSE formatting and event ID testing
- [ ] Session management protocol verification
- [ ] Client compatibility testing with various MCP clients

**Security Tests**:
- [ ] Origin validation and DNS rebinding protection
- [ ] Session ID security and entropy validation
- [ ] Authentication and authorization testing
- [ ] Rate limiting and DoS protection
- [ ] Input validation and sanitization
- [ ] Localhost binding verification

**Performance Tests**:
- [ ] Load testing with 100 concurrent sessions
- [ ] Response time benchmarks vs stdio transport
- [ ] Memory usage profiling and session overhead
- [ ] Long-running stability and session persistence
- [ ] Protocol overhead measurement
- [ ] Docker container performance testing

### Success Metrics

**Performance Improvements**:
- 60% faster response times compared to stdio transport
- 40% reduction in memory usage
- Support for 100 concurrent MCP sessions (10x improvement)
- 99.9% uptime for MCP operations
- < 5ms session overhead and < 50ms request processing

**Protocol Compliance**:
- 100% MCP Streamable HTTP transport specification compliance
- Zero protocol violations in automated testing
- Compatibility with multiple MCP client implementations
- Full JSON-RPC 2.0 compliance

**Developer Experience**:
- Single command to start full stack (backend + MCP)
- Reduced local development setup time by 70%
- Improved debugging capabilities with unified logging
- Better error messages and protocol-level debugging
- Simplified Docker deployment (single container)

**Security Standards**:
- Zero security vulnerabilities in MCP implementation
- Full DNS rebinding protection
- Proper session security and entropy validation
- Complete input validation coverage

### Rollback Criteria

**Immediate Rollback Required If**:
- Any MCP tool loses functionality or breaks compatibility
- Performance degrades compared to stdio transport
- MCP specification compliance violations detected
- Backend stability impacted or security vulnerabilities found
- Data corruption or loss occurs

**Graceful Migration Rollback**:
- Maintain stdio transport for 30 days post-deployment
- Feature flags to disable HTTP transport independently
- Automated testing of both transport methods
- Clear migration documentation and runbooks
- Session persistence and graceful degradation options

**Monitoring and Alerting**:
- MCP protocol compliance monitoring
- Session health and performance metrics
- Security event monitoring and alerting
- Transport-specific error rate tracking
- Client compatibility and success rate monitoring