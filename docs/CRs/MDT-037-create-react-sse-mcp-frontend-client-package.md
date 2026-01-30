---
code: MDT-037
title: Create React SSE MCP Frontend Client Package
status: Implemented
dateCreated: 2025-09-09T13:34:48.291Z
type: Feature Enhancement
priority: Medium
phaseEpic: MCP Integration Phase 1
description: Develop a React package (@mcp/react-sse-client) that provides SSE-based communication with MCP servers for frontend log streaming and command handling. The package should enable LLM systems to interact with React applications in real-time through Server-Sent Events, supporting console log interception, context gathering, and bidirectional command execution.
rationale: Current MCP implementations lack standardized frontend integration. This package will provide a clean, reusable solution for React applications to participate in MCP workflows, enabling LLM-driven debugging, monitoring, and interactive development experiences.
assignee: Frontend Team
relatedTickets: MDT-036,MDT-035
---

# Create React SSE MCP Frontend Client Package

## 1. Description

### Problem Statement
Enable LLM debugging of frontend React applications by extending existing MCP infrastructure to capture and stream frontend console logs, errors, and context to LLM assistants.

### Current State
- MCP server (`server/mcp-dev-tools/`) only provides backend logs
- Frontend errors (e.g., "TicketView.js error") are invisible to LLM
- No way for LLM to debug React application issues
- Frontend console logs stay in browser, not accessible via MCP

### Desired State
- LLM can access frontend console logs via MCP tools
- Manual session activation prevents spam across all projects
- Real-time frontend log streaming when debugging active
- React hook `useMCPClient()` for easy integration
- Auto-cleanup with timeout safety

### Rationale
When users report frontend errors, LLMs need access to browser console logs to provide effective debugging assistance. Current MCP only sees backend logs, missing critical frontend debugging information.

## 2. Solution Analysis

### Technical Approach
- **Extend existing MCP server** (`server/mcp-dev-tools/`) with frontend tools
- **Manual session activation** to prevent spam across global MCP usage
- **Frontend log streaming** via HTTP POST batching + SSE for real-time delivery
- **React hook integration** in `src/hooks/useMCPClient.ts`
- **Auto-cleanup** with timeout safety (30min inactivity)

### Architecture Flow
```
User: "I see TicketView.js error"
LLM: calls start_frontend_logging() → Backend activates session
Frontend: detects active session → starts console interception
Frontend: batches logs → POST /api/frontend/logs → Backend
LLM: calls get_frontend_logs() → gets React errors
LLM: provides debugging help
LLM: calls stop_frontend_logging() → cleanup
```

### Components
1. **Backend Session Management**: Track active frontend debugging sessions
2. **MCP Tools Extension**: Add frontend-specific tools to existing MCP server
3. **React Hook**: `useMCPClient()` for console interception and log batching
4. **Backend Endpoints**: `/api/frontend/logs`, `/api/frontend/session/*`

## 3. Implementation Specification

### File Structure
```
server/mcp-dev-tools/src/
├── tools/
│   ├── frontend-session.ts    # start/stop_frontend_logging tools
│   └── frontend-logs.ts       # get_frontend_logs tool
└── index.ts                   # Register new tools

server/server.js
├── Frontend session management
├── POST /api/frontend/logs        # Receive batched logs
├── GET  /api/frontend/logs/stream # SSE session events
├── GET  /api/frontend/logs/status # Session status
├── POST /api/frontend/logs/start  # Start session
└── POST /api/frontend/logs/stop   # Stop session

src/hooks/
└── useMCPClient.ts           # React hook for console interception
```

### MCP Tools API
```typescript
// Manual session control
start_frontend_logging(): { status: 'started', sessionId: string }
stop_frontend_logging(): { status: 'stopped' }
get_frontend_session_status(): { active: boolean, duration?: number }

// Log access
get_frontend_logs(lines?: number, filter?: string): LogEntry[]
stream_frontend_logs(filter?: string): string // SSE endpoint URL
```

### React Hook API
```typescript
function useMCPClient() {
  const [isActive, setIsActive] = useState(false)

  // Polls session status every 5 seconds
  // Intercepts console only when active
  // Batches logs and sends via POST
  // Auto-cleanup on unmount

  return { isActive, sessionId }
}
```

### Backend Session Management
```javascript
let frontendSessionActive = false;
let sessionStartTime = null;
let sessionTimeout = null;

// Auto-cleanup after 30 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000;
```

## 4. Acceptance Criteria

### MCP Tools Integration
- [ ] `start_frontend_logging()` tool activates frontend log capture
- [ ] `stop_frontend_logging()` tool deactivates and cleans up session
- [ ] `get_frontend_logs(lines?, filter?)` tool returns frontend console logs
- [ ] `get_frontend_session_status()` tool shows current session state
- [ ] Auto-timeout after 30 minutes of inactivity

### Backend Session Management
- [ ] POST `/api/frontend/logs` endpoint receives batched log entries
- [ ] GET `/api/frontend/session/status` returns current session state
- [ ] Session activation/deactivation prevents spam when MCP is global
- [ ] Frontend logs stored in memory buffer (1000 entries max)
- [ ] Proper cleanup on session timeout or manual stop

### Frontend Integration
- [ ] `useMCPClient()` hook polls session status every 5 seconds
- [ ] Console interception only active during MCP debugging sessions
- [ ] Log batching (10 entries or 1 second intervals)
- [ ] Graceful degradation when backend unavailable
- [ ] Proper cleanup on component unmount

### User Experience
- [ ] LLM can debug frontend errors by calling `start_frontend_logging()`
- [ ] Frontend logs appear in MCP tools within seconds of console output
- [ ] No performance impact when MCP session inactive
- [ ] Clear session boundaries with manual start/stop control

### Security & Performance
- [ ] No sensitive data (passwords, tokens) in logs
- [ ] Memory usage stable during extended sessions
- [ ] No impact on production builds
- [ ] Session timeout prevents resource leaks

## 6. Implementation Status

### ✅ COMPLETED - All Components Implemented

**Frontend Console Interceptor:**
- ✅ `public/mcp-logger.js` - Early console interception (loads before React)
- ✅ Automatic session detection via polling
- ✅ Batched log transmission to reduce HTTP requests
- ✅ Works even when React app is broken

**Vite Server Integration:**
- ✅ `vite.config.ts` - Frontend logging endpoints via Vite plugin
- ✅ Session management: `/api/frontend/logs/status`, `/start`, `/stop`
- ✅ Log collection: `POST /api/frontend/logs`
- ✅ Log retrieval: `GET /api/frontend/logs?lines=20&filter=error`
- ✅ Real-time SSE streaming: `/api/frontend/logs/stream`

**MCP Tools (Final Set):**
- ✅ `get_frontend_logs(frontend_host?)` - Auto-starts session, retrieves logs
- ✅ `stop_frontend_logging(frontend_host?)` - Manual session cleanup
- ✅ `get_frontend_session_status(frontend_host?)` - Check session state
- ✅ `stream_frontend_url(frontend_host?, filter?)` - Get SSE endpoint URL
- ✅ `stream_url(filter?)` - Backend SSE endpoint URL (renamed from stream_logs)

**Key Design Decisions (Final):**
- **Auto-start on demand**: `get_frontend_logs()` automatically starts session
- **Removed manual start**: No need for `start_frontend_logging()` tool
- **Vite-hosted endpoints**: All frontend logging runs on Vite dev server (localhost:5173)
- **Consistent naming**: `stream_url` (backend) + `stream_frontend_url` (frontend)
- **Host flexibility**: All frontend tools accept optional `frontend_host` parameter

### Testing Results
- ✅ **Console interception works**: Captures error, log, warn, info, debug
- ✅ **Session management works**: Start/stop/status endpoints functional
- ✅ **Log transmission works**: Batched logs sent to Vite server
- ✅ **SSE streaming works**: Real-time log broadcasting to connected clients
- ✅ **MCP integration works**: Tools built and ready for new chat sessions

### Usage Example
```
User: "I see a React error in TicketView.js"
LLM: get_frontend_logs() → Auto-starts session → Shows captured frontend errors
LLM: "I see the error: Cannot read property 'map' of undefined. Here's the fix..."
```

**🎯 MDT-037 is COMPLETE and ready for production use!**

### Final Implementation Notes (September 15, 2025)

**✅ FRONTEND_LOGGING_AUTOSTART Feature Successfully Implemented:**

**Problem Solved:**
- **Before**: `get_frontend_logs()` only captured logs from the moment it was called, missing critical startup errors
- **After**: `VITE_FRONTEND_LOGGING_AUTOSTART=true` enables immediate session start on page load, capturing complete log history

**Implementation Details:**
- **Environment Variable Injection**: Modified `vite.config.ts` with `envInjectionPlugin()` to inject `VITE_FRONTEND_LOGGING_AUTOSTART` into HTML at build time
- **Auto-Start Logic**: Enhanced `public/mcp-logger.js` to detect environment variable and immediately start frontend logging session
- **Session Management**: Maintains backward compatibility with manual session control while providing automatic startup when enabled

**Configuration:**
```bash
# Enable auto-start (captures all logs from page load)
VITE_FRONTEND_LOGGING_AUTOSTART=true

# Disable auto-start (manual MCP control only)
VITE_FRONTEND_LOGGING_AUTOSTART=false
```

**Testing Results:**
- ✅ Environment variable correctly detected: `🔍 DEBUG: Auto-start enabled result: true`
- ✅ Session auto-starts immediately on page load
- ✅ Captures all startup logs including SSE connections, file watcher initialization
- ✅ Complete log history available via `get_frontend_logs()` including early startup messages
- ✅ Manual session control (`stop_frontend_logging()`) still functional
- ✅ Production-safe defaults (disabled unless explicitly enabled)

**Use Case Achieved:**
```
User: "I see an error on page load"
LLM: get_frontend_logs() → Gets complete log history including startup errors
LLM: "I see the startup error in the SSE connection. Here's the fix..."
```

The timing problem is completely solved - LLMs now have access to the full context of frontend issues from the very beginning of page load.

## 6. References

### Technical References
- [Existing MCP dev-tools](server/mcp-dev-tools/README.md)
- [Current backend SSE implementation](server/server.js#L1867)
- [Vite proxy configuration](vite.config.ts)

### Related Tickets
- MDT-036: MCP Server Backend Integration (implemented)
- MDT-035: Frontend Logging Architecture

### Architecture Context
- Frontend: Pure React (Vite dev server)
- Backend: Node.js with existing SSE support
- MCP: Global scope, requires manual activation for safety
