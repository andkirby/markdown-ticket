---
code: MDT-036
title: MCP Control Server for Development Log Access
status: Implemented
dateCreated: 2025-09-09T11:27:58.672Z
type: Feature Enhancement
priority: Medium
description: Create an MCP server that provides LLMs with filtered access to application logs during development. The server should integrate with the existing application via API endpoints rather than external process management. Key features: log filtering (last N lines, text patterns), application status checking, and future internal restart capabilities. This enables LLMs to monitor development output for code assistance without being overwhelmed by verbose logs.
rationale: Enable LLMs to monitor application output in real-time during development, providing context for code changes and error detection without overwhelming the LLM with verbose output
---

# MCP Control Server for Development Log Access

## 1. Description

### Problem Statement
Create an MCP server that allows LLMs to read application logs during development to assist with code changes and debugging

### Current State
- Developers run frontend/backend manually via quick-start.sh or separate commands
- LLMs have no visibility into application logs during development
- No programmatic way to monitor build errors, runtime issues, or application status
- Development debugging requires manual log inspection

### Desired State
- LLMs can access filtered application logs through MCP tools
- Smart log filtering prevents information overload (last N lines, text patterns)
- Application status monitoring for health checks
- Future capability for internal application restart triggers

### Rationale
Enable LLMs to monitor application output in real-time during development, providing context for code changes and error detection without overwhelming the LLM with verbose output

## 2. Solution Analysis

### Standalone Package Opportunity
This implementation could serve as a prototype for a generic `@mcp/dev-monitor` package:

**Generic Dev Monitor + MCP Server:**
- Universal log interception (console, winston, pino)
- Process management for any Node.js development setup
- File change monitoring and health checks
- MCP server providing development tools to any LLM assistant

**Potential Market:**
- Developers using AI assistants for coding
- Teams wanting LLM integration with development workflows
- Generic alternative to complex monitoring solutions for dev environments

**Implementation Strategy:**
1. Build project-specific solution first (this ticket)
2. Extract generic patterns and interfaces
3. Create standalone package if proven valuable
4. Maintain project-specific integration as reference implementation

*Note: Focus on current project needs first, package extraction is future opportunity.*

## 3. Implementation Specification

### Technical Architecture
- **Integration Method**: API endpoints in existing backend (not external process management)
- **MCP Server Location**: `server/mcp-dev-tools/` (development-only tool)
- **Log Storage**: In-memory circular buffer for recent logs (100 entries max)
- **Log Capture**: Console.log interception to populate buffer

### Log Sources
- **Backend logs**: Node.js console output via interception
- **Vite dev server logs**: Process output capture
- **Browser logs**: Not accessible (limitation - browser devtools only)

### Backend API Endpoints
```javascript
GET /api/logs?lines=20&filter=error    // Filtered log retrieval (polling)
GET /api/logs/stream?filter=error      // SSE filtered log streaming (extra)
POST /api/restart                      // Internal restart trigger (Phase 2)
```

### Log Buffer Implementation
```javascript
// Console interception in server.js
const logBuffer = [];
const originalLog = console.log;
console.log = (...args) => {
  logBuffer.push({timestamp: Date.now(), message: args.join(' ')});
  if (logBuffer.length > 100) logBuffer.shift();
  originalLog(...args);
};
```

### Backend API Endpoints
```javascript
GET /api/logs?lines=20&filter=error    // Filtered log retrieval (polling)
GET /api/logs/stream?filter=error      // SSE filtered log streaming (extra)
POST /api/restart                      // Future: internal restart trigger
```

### MCP Tools
```javascript
get_logs(lines?, filter?)              // Get recent logs with filtering
stream_logs(filter?)                   // Get SSE endpoint URL for real-time logs
```

### Log Filtering Capabilities
- **Line Limit**: Last N lines (default 20, max 100)
- **Text Filtering**: Pattern matching for specific keywords
- **All Log Levels**: Include info, warnings, errors (no level filtering)
- **Noise Reduction**: Smart defaults to exclude verbose HMR updates

## 4. Acceptance Criteria

### Phase 1: Log Access
- [ ] Backend exposes `/api/logs` endpoint with filtering (polling)
- [ ] Console.log interception captures logs to in-memory buffer
- [ ] MCP server in `server/mcp-dev-tools/` provides `get_logs()` tool
- [ ] Log filtering works for line count and text patterns
- [ ] **Extra**: SSE endpoint `/api/logs/stream` with filtering
- [ ] **Extra**: MCP `stream_logs()` tool returns SSE URL
- [ ] LLM can retrieve development logs without overwhelming output
- [ ] Setup/installation instructions for MCP server

### Phase 2: Application Control (Future)
- [ ] Internal restart mechanism via `/api/restart`
- [ ] Graceful shutdown and restart without process killing
- [ ] MCP tool for triggering application restart

## 5. Implementation Notes

### ✅ Completed Features

**Phase 1: Log Access - IMPLEMENTED**
- ✅ Backend exposes `/api/logs` endpoint with filtering (polling)
- ✅ Console.log interception captures logs to in-memory buffer (100 entries)
- ✅ MCP server in `server/mcp-dev-tools/` provides `get_logs()` tool
- ✅ Log filtering works for line count and text patterns
- ✅ **Extra**: SSE endpoint `/api/logs/stream` with filtering
- ✅ **Extra**: MCP `stream_logs()` tool returns SSE URL
- ✅ LLM can retrieve development logs without overwhelming output
- ✅ Setup/installation instructions for MCP server

### Implementation Details

**Log Buffer System:**
- Intercepts `console.log`, `console.error`, `console.warn`
- Circular buffer with 100 entry limit
- Timestamps and log levels captured
- Added to existing `server/server.js` without breaking changes

**MCP Server:**
- TypeScript implementation in `server/mcp-dev-tools/`
- Two tools: `get_logs()` and `stream_logs()`
- Calls backend API endpoints via HTTP
- Proper error handling for offline backend

**API Endpoints:**
- `GET /api/logs?lines=20&filter=text` - Polling interface
- `GET /api/logs/stream?filter=text` - SSE streaming interface
- Both support text filtering and line limits

### Testing Results
- ✅ MCP tools respond correctly
- ✅ Log filtering works (text and line count)
- ✅ SSE streaming functional
- ✅ Error handling when backend offline
- ✅ Console interception captures all log levels

### Setup Instructions
Complete setup guide provided in `server/mcp-dev-tools/README.md`

### Future Enhancements (Phase 2)
- Internal restart mechanism via `/api/restart`
- Graceful shutdown and restart without process killing
- MCP tool for triggering application restart

## 6. References
*To be filled during implementation*