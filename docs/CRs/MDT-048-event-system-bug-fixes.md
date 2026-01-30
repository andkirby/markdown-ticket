---
code: MDT-048
title: Event System Bug Fixes - Project Creation SSE Events
status: Implemented
type: Bug Fix
priority: High
dateCreated: 2025-09-26T15:39:00.000Z
lastModified: 2025-09-26T15:39:00.000Z
phaseEpic: Core Infrastructure
assignee: Q Assistant
relatedTickets:
dependsOn:
blocks:
---

# Event System Bug Fixes - Project Creation SSE Events

## Problem Statement

Multiple critical bugs were discovered in the project creation workflow that prevented proper real-time UI updates:

1. **Missing registerProject Method**: Backend called non-existent `projectDiscovery.registerProject()` causing 500 errors
2. **Poor Error Logging**: Error objects logged as empty `{}` making debugging impossible
3. **Missing SSE Event Handler**: Frontend didn't recognize `project-created` SSE events
4. **Missing Callback**: Project creation modal didn't trigger projects list refresh
5. **Missing React Import**: `useEffect` not imported causing app crashes

## Root Cause Analysis

### Backend Issues
- **500 Error**: `projectDiscovery.registerProject is not a function`
  - Code attempted to call method that doesn't exist in ProjectDiscoveryService
  - Project discovery works via file scanning, not manual registration

- **Poor Error Logging**:
  ```javascript
  console.error('Error creating project:', error); // Logged as {}
  ```
  - Error object serialization failed to show actual error details

### Frontend Issues
- **Unknown SSE Event**: `Unknown SSE event type: project-created`
  - SSE handler had no case for `project-created` events
  - Events were received but ignored

- **Missing Refresh**: Projects list not updated after creation
  - Modal didn't call `onProjectCreated()` callback
  - No mechanism to refresh projects without page reload

- **Import Error**: `useEffect is not defined`
  - Added useEffect usage without importing from React

## Solution Implemented

### 1. Fixed Backend Project Creation
```javascript
// REMOVED: Non-existent method call
// projectDiscovery.registerProject(projectInfo);

// ADDED: Proper SSE event broadcasting
const projectCreatedEvent = {
  type: 'project-created',
  data: {
    projectId: projectCode,
    projectPath: projectPath,
    timestamp: Date.now()
  }
};

fileWatcher.clients.forEach(client => {
  fileWatcher.sendSSEEvent(client, projectCreatedEvent);
});
```

### 2. Enhanced Error Logging
```javascript
// BEFORE
console.error('Error creating project:', error);

// AFTER
console.error('Error creating project:', {
  message: error.message,
  stack: error.stack,
  code: error.code,
  errno: error.errno,
  path: error.path
});
```

### 3. Added SSE Event Handler
```javascript
// Frontend: realtimeFileWatcher.ts
case 'project-created':
  console.log('Project created event received:', event.data);
  window.dispatchEvent(new CustomEvent('projectCreated', {
    detail: event.data
  }));
  break;
```

### 4. Added Project Refresh Callback
```javascript
// AddProjectModal.tsx - After successful creation
setShowSuccess(true);
onProjectCreated(); // ADDED: Trigger refresh
```

### 5. Added Custom Event Listener
```javascript
// App.tsx
import { useState, useEffect } from 'react'; // ADDED: useEffect

useEffect(() => {
  const handleProjectCreated = () => {
    console.log('Project created event received, refreshing projects...');
    refreshProjects();
  };

  window.addEventListener('projectCreated', handleProjectCreated);
  return () => window.removeEventListener('projectCreated', handleProjectCreated);
}, [refreshProjects]);
```

## Testing Results

### Before Fix
- ❌ Project creation failed with 500 error
- ❌ Error logs showed empty objects `{}`
- ❌ Frontend crashed with `useEffect is not defined`
- ❌ Projects list required manual page refresh

### After Fix
- ✅ Project creation succeeds (200 response)
- ✅ Detailed error logging for debugging
- ✅ Real-time SSE events properly handled
- ✅ Projects list auto-refreshes without page reload
- ✅ App remains stable during project creation

## Event Flow (Fixed)

```
1. User submits project form
2. Backend creates project files successfully
3. Backend broadcasts project-created SSE event
4. Frontend SSE handler receives event
5. Frontend dispatches projectCreated custom event
6. App component calls refreshProjects()
7. Projects list updates in real-time
```

## Files Modified

### Backend
- `server/server.js`: Fixed registerProject calls, enhanced error logging, added SSE broadcasting
- `server/projectDiscovery.js`: Confirmed auto-discovery works without manual registration

### Frontend
- `src/services/realtimeFileWatcher.ts`: Added project-created event handler
- `src/components/AddProjectModal.tsx`: Added onProjectCreated callback
- `src/App.tsx`: Added useEffect import and custom event listener

## Impact

- **User Experience**: Seamless project creation with instant UI updates
- **Developer Experience**: Proper error logging enables faster debugging
- **System Reliability**: Eliminated 500 errors and app crashes
- **Real-time Features**: Foundation for future SSE event types

## Documentation

Created comprehensive event system documentation: `docs/EVENT_SYSTEM.md`

## Future Considerations

- Add project deletion SSE events
- Implement ticket status change events
- Add error boundary for better error handling
- Consider WebSocket upgrade for bidirectional communication
