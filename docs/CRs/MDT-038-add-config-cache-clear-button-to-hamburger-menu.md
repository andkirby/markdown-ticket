---
code: MDT-038
title: Add Config Cache Clear Button to Hamburger Menu
status: Rejected
dateCreated: 2025-09-09T18:47:38.204Z
lastModified: 2025-09-09T20:53:41.727Z
type: Feature Enhancement
priority: Medium
description: Users need ability to refresh project configuration without server restart when config files are moved or modified
rationale: When project config files are moved from ~/.config/markdown-ticket/projects/, the frontend still shows cached projects. Manual server restart is inconvenient for users.
assignee: Development Team
---

# Add Config Cache Clear Button to Hamburger Menu

## 1. Description

### Problem Statement
Users need ability to refresh project configuration without server restart when config files are moved or modified

### Current State - INVESTIGATION RESULTS
- **NO CACHING EXISTS**: ProjectDiscoveryService reads config files fresh from disk on every request
- **Auto-discovery**: System scans configured search paths for `.mdt-config.toml` files on each API call
- **Page refresh**: Already refreshes all config data automatically
- **Cache clear endpoint**: Exists but `projectDiscovery.clearCache()` method doesn't exist (dead code)

### Root Cause Analysis
The original problem was based on incorrect assumption about caching. Investigation revealed:
- No server-side caching mechanism implemented
- Config files read fresh on every `/api/projects` request
- Auto-discovery scans directories on every request (performance overhead)
- Page refresh already provides the desired functionality

## 2. Implementation History

### ✅ COMPLETED (2025-09-09)
- **Frontend**: HamburgerMenu.tsx updated with refresh button
- **Backend**: Cache clear endpoint added to server.js
- **Vite**: Proxy endpoint added to vite.config.ts
- **UX**: Loading states and auto-reload implemented

### 🔄 REVERTED (2025-09-09)
**Reason**: Feature unnecessary due to no caching implementation

**Changes Made**:
- **Removed**: "Refresh Config" button from HamburgerMenu.tsx
- **Removed**: RefreshCw import and related state management
- **Kept**: Backend `/api/cache/clear` endpoint (only reinitializes file watchers)
- **Simplified**: Menu now only shows "Add Project" option

## 3. Technical Findings

### Config Data Flow
1. **Frontend**: `useMultiProjectData` hook calls `fetchProjects()` on mount
2. **API**: `GET /api/projects` → `projectDiscovery.getAllProjects()`
3. **Discovery**: Reads all config files + runs auto-discovery scan
4. **No Caching**: Fresh disk reads on every request

### Performance Impact
- Auto-discovery scans directories up to 3 levels deep on every request
- File I/O overhead on every API call
- Immediate config changes reflected after page refresh

## 4. Final Resolution

**Solution**: Page refresh already provides the required functionality
**User Workflow**:
1. Modify config files (move/edit projects)
2. Refresh browser page
3. Updated project list loads immediately

**Benefits**:
- Simpler UI (no unnecessary button)
- No additional API calls
- Leverages existing no-cache architecture
- Standard web behavior (refresh to reload)

## 5. Commits

### Implementation Commits
- `feat: add config cache clear button to hamburger menu`
- `feat: add cache clear API endpoint with file watcher reinitialization`
- `feat: add vite proxy for cache clear endpoint`

### Removal Commits
- `refactor: remove cache clear button - no caching implemented`
- `docs: add comments explaining current no-cache architecture`
- `refactor: remove comments, update ticket with findings`

## 6. Lessons Learned

- **Investigate before implementing**: Assumed caching existed without verification
- **Architecture understanding**: No-cache design was intentional for immediate config updates
- **User needs**: Page refresh already solved the original problem
- **Dead code**: Backend endpoint exists but underlying method doesn't (defensive programming artifact)

**Status**: Ticket resolved - feature unnecessary due to architecture design.
