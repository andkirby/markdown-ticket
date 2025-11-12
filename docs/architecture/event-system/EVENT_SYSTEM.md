# Event System Architecture

The Markdown Ticket project uses **Server-Sent Events (SSE)** for real-time communication between backend and frontend, providing live updates without polling.

## Overview

```
Backend → SSE Stream → Frontend Handler → Custom DOM Events → React Components
```

## SSE Event Types

### 1. Connection Event
```javascript
{
  type: "connection",
  data: {
    status: "connected",
    timestamp: 1758900073623
  }
}
```
- **Purpose**: Confirms SSE connection establishment
- **Sent**: When client connects to `/api/events`
- **Frontend Action**: Logs connection confirmation

### 2. File Change Event
```javascript
{
  type: "file-change", 
  data: {
    eventType: "add" | "change" | "unlink",
    filename: "MDT-001-example-ticket.md",
    projectId: "markdown-ticket",
    timestamp: 1758900073623
  }
}
```
- **Purpose**: Real-time file system changes
- **Triggers**: File add/modify/delete in project directories
- **Frontend Action**: Refreshes ticket lists for affected project

### 3. Project Created Event
```javascript
{
  type: "project-created",
  data: {
    projectId: "OPU",
    projectPath: "~/home/OPUS-training", 
    timestamp: 1758900073623
  }
}
```
- **Purpose**: Notifies when new project is created
- **Triggers**: Successful project creation via `/api/projects/create`
- **Frontend Action**: Triggers `refreshProjects()` without page reload

### 4. Heartbeat Event
```javascript
{
  type: "heartbeat",
  data: { ... }
}
```
- **Purpose**: Keep-alive mechanism
- **Frontend Action**: Silent acknowledgment

## Implementation Details

### Backend (Server-Side)

#### SSE Endpoint
- **Route**: `GET /api/events`
- **Headers**: `text/event-stream`, CORS enabled
- **Client Management**: FileWatcherService handles client connections

#### Event Broadcasting
```javascript
// File changes
fileWatcher.broadcastFileChange(eventType, filename, projectId);

// Project creation
fileWatcher.clients.forEach(client => {
  fileWatcher.sendSSEEvent(client, projectCreatedEvent);
});
```

#### File Watching
- Uses `chokidar` for file system monitoring
- Watches `docs/CRs/*.md` patterns for each project
- Debounced events (100ms) to prevent spam

### Frontend (Client-Side)

#### SSE Handler
- **Service**: `RealtimeFileWatcher`
- **Connection**: Auto-reconnect on failure
- **Event Queue**: Stores last 50 events for new connections

#### Custom DOM Events
```javascript
// SSE → Custom Event
window.dispatchEvent(new CustomEvent('projectCreated', { 
  detail: event.data 
}));

// React Component Listener
useEffect(() => {
  const handleProjectCreated = () => refreshProjects();
  window.addEventListener('projectCreated', handleProjectCreated);
  return () => window.removeEventListener('projectCreated', handleProjectCreated);
}, [refreshProjects]);
```

## Event Flow Examples

### Project Creation Flow
1. User submits project form
2. Backend creates project files
3. Backend broadcasts `project-created` SSE event
4. Frontend SSE handler receives event
5. Frontend dispatches `projectCreated` custom event
6. App component calls `refreshProjects()`
7. Projects list updates without page reload

### File Change Flow
1. User modifies ticket file
2. File watcher detects change
3. Backend broadcasts `file-change` SSE event
4. Frontend receives event and refreshes ticket list
5. UI updates to show changes

## Error Handling

### Connection Issues
- Auto-reconnect with exponential backoff
- Event queue replay for missed events
- Graceful degradation (manual refresh fallback)

### Client Management
- Automatic cleanup of stale connections
- Connection state tracking
- Memory management (50 event limit)

## Configuration

### Backend
```javascript
// File watcher debounce
const DEBOUNCE_DELAY = 100; // ms

// Event queue size
const MAX_EVENTS = 50;
```

### Frontend
```javascript
// SSE endpoint
const SSE_ENDPOINT = '/api/events';

// Reconnection settings
const RECONNECT_DELAY = 1000; // ms
```

## Debugging

### Backend Logs
```
📡 Event happened: change - MDT-001.md in project markdown-ticket
📤 Broadcasting to 1 SSE clients: {...}
✅ SSE pushed to client #1
```

### Frontend Logs
```
📨 Received SSE event: {"type":"file-change",...}
Project created event received: {...}
```

### Common Issues
- **"Unknown SSE event type"**: Add handler in `realtimeFileWatcher.ts`
- **Events not received**: Check SSE connection status
- **UI not updating**: Verify custom event listeners are registered

## Future Enhancements

- **Project deletion events**
- **Ticket status change events** 
- **User presence indicators**
- **Collaborative editing notifications**
