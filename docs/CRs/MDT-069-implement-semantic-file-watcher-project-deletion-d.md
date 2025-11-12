---
code: MDT-069
title: Implement Semantic File Watcher Project Deletion Detection
status: Implemented
dateCreated: 2025-10-14T23:45:31.614Z
type: Feature Enhancement
priority: High
dependsOn: MDT-067
---

# Implement Semantic File Watcher Project Deletion Detection

## 1. Description

Currently, project deletion events are inconsistently detected through HTTP 404 errors and controller-based event emission. This leads to duplicate and unreliable project deletion notifications.

## 2. Rationale

Reliable project management requires precise tracking of project lifecycle events. The current implementation:
- Relies on HTTP error handling for detecting deletions
- May emit multiple or inconsistent project deletion events
- Lacks a direct, semantic method for tracking project removal

## 3. Solution Analysis

### Proposed Approach: Direct File System Monitoring

1. **Backend File Watcher Enhancement**
   - Use `chokidar` to monitor project configuration directories
   - Directly detect `.mdt-config.toml` file deletions
   - Generate semantic `project:deleted` events with rich metadata

2. **Event Emission Strategy**
   - Emit events with structured data:
     ```typescript
     {
       type: 'project:deleted',
       data: {
         projectId: string,
         timestamp: number,
         reason: 'file_removed' | 'manual_deletion'
       }
     }
     ```

3. **Performance Considerations**
   - Minimal overhead from file system watching
   - Non-blocking event generation
   - Consistent event emission across different deletion scenarios

## 4. Implementation

### Chokidar File Watching
```typescript
const projectConfigWatcher = chokidar.watch('.mdt-config.toml', {
  persistent: true,
  ignoreInitial: true
});

projectConfigWatcher.on('unlink', (path) => {
  const projectId = extractProjectIdFromPath(path);
  sseService.broadcast({
    type: 'project:deleted',
    data: { 
      projectId, 
      timestamp: Date.now(),
      reason: 'file_removed'
    }
  });
});
```

### SSE Broadcast Service
- Implement non-blocking event emission
- Add semantic typing for project lifecycle events
- Ensure reliable event delivery

## 5. Acceptance Criteria

- [ ] File watcher detects `.mdt-config.toml` deletions
- [ ] Semantic `project:deleted` events are emitted
- [ ] No duplicate event generation
- [ ] Event includes rich metadata (projectId, timestamp)
- [ ] Backend file watching is non-blocking
- [ ] Frontend `useProjectManager` handles deletion events correctly
- [ ] Performance overhead is minimal (< 50ms)
