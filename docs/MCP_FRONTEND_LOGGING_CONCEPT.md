# MCP Frontend Logging Concept

## Overview

The MCP Frontend Logging system provides AI assistants with real-time access to frontend development logs through a Model Context Protocol (MCP) server. This enables LLMs to monitor frontend application state, debug issues, and provide context-aware assistance during development.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant  │◄──►│   MCP Server    │◄──►│  Backend API    │
│   (Claude/Q)    │    │  (Dev Tools)    │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        ▲
                                                        │
                                               ┌─────────────────┐
                                               │  Frontend App   │
                                               │   (React/Vite)  │
                                               └─────────────────┘
```

## Components

### 1. Frontend Application (React/Vite)
- **Current State**: Uses standard `console.log()`, `console.error()`, etc.
- **Log Generation**: Natural console output from React components
- **No Instrumentation**: Currently relies on browser's native console

### 2. Backend API (Node.js Express)
- **Log Storage**: In-memory buffer (`frontendLogs[]`) with 1000 entry limit
- **Session Management**: 30-minute timeout for logging sessions
- **API Endpoints**:
  - `GET /api/frontend/logs/status` - Check session status
  - `POST /api/frontend/logs/start` - Start logging session
  - `POST /api/frontend/logs/stop` - Stop logging session
  - `POST /api/frontend/logs` - Receive logs from frontend
  - `GET /api/frontend/logs` - Retrieve filtered logs

### 3. MCP Development Tools Server
- **Tool Interface**: Exposes logging capabilities to AI assistants
- **Smart Filtering**: Text-based log filtering and line limits
- **Auto-Session**: Automatically starts logging sessions when needed
- **Real-time Access**: Provides immediate log access to LLMs

## Current Implementation Gap

**Missing Component**: Frontend log capture mechanism

The system currently has:
- ✅ Backend API endpoints for receiving logs
- ✅ MCP server for AI assistant access
- ❌ Frontend instrumentation to capture and send logs

## Proposed Frontend Log Capture

### Option 1: Console Override (Recommended)
```typescript
// src/utils/logging.ts
class FrontendLogger {
  private originalConsole = { ...console };
  private sessionActive = false;
  private logBuffer: LogEntry[] = [];

  async startSession() {
    const response = await fetch('/api/frontend/logs/start', { method: 'POST' });
    if (response.ok) {
      this.sessionActive = true;
      this.overrideConsole();
    }
  }

  private overrideConsole() {
    ['log', 'error', 'warn', 'info'].forEach(level => {
      console[level] = (...args) => {
        this.originalConsole[level](...args);
        if (this.sessionActive) {
          this.captureLog(level, args);
        }
      };
    });
  }

  private captureLog(level: string, args: any[]) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      url: window.location.href
    };
    
    this.logBuffer.push(entry);
    this.flushLogs();
  }

  private async flushLogs() {
    if (this.logBuffer.length > 0) {
      const logs = [...this.logBuffer];
      this.logBuffer = [];
      
      await fetch('/api/frontend/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });
    }
  }
}
```

### Option 2: React Error Boundary Integration
```typescript
// src/components/LoggingErrorBoundary.tsx
class LoggingErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.sendErrorLog(error, errorInfo);
  }

  private async sendErrorLog(error: Error, errorInfo: ErrorInfo) {
    await fetch('/api/frontend/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logs: [{
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `${error.message}\n${errorInfo.componentStack}`,
          url: window.location.href
        }]
      })
    });
  }
}
```

## Data Flow

### 1. Session Initialization
```
AI Assistant → MCP Server → Backend API
                ↓
        Start logging session
                ↓
        Frontend begins capturing
```

### 2. Log Capture
```
Frontend Console → Log Capture → Buffer → Backend API
                                            ↓
                                    Store in memory
```

### 3. Log Retrieval
```
AI Assistant → MCP Server → Backend API → Filtered Logs
                ↓
        Format and return
```

## MCP Tools Available

### `get_frontend_logs`
- **Purpose**: Retrieve recent frontend logs with filtering
- **Parameters**: `lines`, `filter`, `frontend_host`
- **Auto-start**: Automatically starts logging session if inactive

### `get_frontend_session_status`
- **Purpose**: Check if logging session is active
- **Returns**: Session state, timing, and configuration

### `stop_frontend_logging`
- **Purpose**: Terminate logging session and cleanup
- **Effect**: Stops log capture and clears session

### `stream_frontend_url`
- **Purpose**: Get SSE endpoint for real-time log streaming
- **Use Case**: Continuous monitoring during development

## Use Cases

### Development Debugging
```
Developer: "Check if there are any React errors in the frontend"
AI: Uses get_frontend_logs to check for error-level messages
```

### Build Monitoring
```
Developer: "Monitor the frontend while I test this feature"
AI: Uses stream_frontend_url to watch logs in real-time
```

### Error Investigation
```
Developer: "Something's wrong with the ticket creation"
AI: Filters logs for "ticket" or "create" to find relevant errors
```

## Implementation Status

### ✅ Completed
- Backend API endpoints for log management
- MCP server with frontend logging tools
- Session management and timeout handling
- Log filtering and retrieval

### ❌ Missing
- Frontend log capture mechanism
- Console override implementation
- Automatic session management in frontend
- Error boundary integration

### 🔄 Proposed Next Steps
1. Implement console override in frontend
2. Add automatic session detection
3. Integrate with React error boundaries
4. Add performance logging capabilities

## Configuration

### Environment Variables
- `FRONTEND_URL`: Frontend server URL (default: http://localhost:5173)
- `BACKEND_URL`: Backend server URL (default: http://localhost:3001)

### Session Settings
- **Timeout**: 30 minutes of inactivity
- **Buffer Size**: 1000 log entries maximum
- **Auto-start**: MCP tools can start sessions automatically

## Security Considerations

### Log Sanitization
- Remove sensitive data from logs before sending
- Filter out authentication tokens or API keys
- Limit log message size to prevent abuse

### Session Management
- Automatic timeout prevents indefinite logging
- Manual stop capability for immediate cleanup
- Memory limits prevent excessive resource usage

## Future Enhancements

### Advanced Filtering
- Log level filtering (error, warn, info, debug)
- Component-based filtering
- Time-range filtering

### Performance Monitoring
- Capture React render times
- Monitor API call performance
- Track user interaction metrics

### Integration Improvements
- WebSocket-based real-time streaming
- Persistent log storage options
- Integration with browser DevTools

## Troubleshooting

### Common Issues
1. **No logs captured**: Frontend logging not implemented
2. **Session timeout**: Restart session via MCP tools
3. **Missing logs**: Check if session is active
4. **Performance impact**: Monitor buffer size and flush frequency

### Debug Commands
```bash
# Check session status
curl http://localhost:5173/api/frontend/logs/status

# Start session manually
curl -X POST http://localhost:5173/api/frontend/logs/start

# Get recent logs
curl "http://localhost:5173/api/frontend/logs?lines=10"
```
