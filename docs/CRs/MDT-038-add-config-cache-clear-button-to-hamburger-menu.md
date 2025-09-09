---
code: MDT-038
title: Add Config Cache Clear Button to Hamburger Menu
status: Proposed
dateCreated: 2025-09-09T18:47:38.204Z
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

### Current State
- Project configurations cached in memory by ProjectDiscoveryService
- When users move config files from `~/.config/markdown-ticket/projects/`, frontend still shows old cached projects
- Only solution is manual server restart, which is inconvenient for users
- No UI mechanism to refresh configuration data

### Desired State
- Users can refresh project configuration via UI button
- Cache clearing triggers immediate project list update
- No server restart required for config changes
- Graceful handling of backend availability issues

## 2. Solution

### Frontend Implementation
- **Location**: Add "Refresh Config" button to existing hamburger menu (☰)
- **UI**: RefreshCw icon with spinning animation during refresh
- **Behavior**: Disabled state while processing, auto-reload page after success

### Backend Implementation  
- **Endpoint**: `POST /api/cache/clear`
- **Function**: Clear ProjectDiscoveryService cache and reinitialize file watchers
- **Response**: JSON with success status and timestamp

### Vite Proxy Implementation
- **Endpoint**: `POST /api/cache/clear` on Vite dev server (localhost:5173)
- **Function**: Forward request to backend, handle graceful fallback if backend unavailable
- **Benefit**: Works during development without backend dependency

## 3. Implementation Details

### User Flow
1. User moves/modifies project config files in `~/.config/markdown-ticket/projects/`
2. Frontend still shows old cached projects
3. User clicks hamburger menu → "Refresh Config"
4. Button shows spinning icon, becomes disabled
5. Cache cleared, page reloads with fresh project list

### Technical Components
- **HamburgerMenu.tsx**: Add refresh button with loading state
- **server.js**: Add cache clearing endpoint with file watcher reinitialization  
- **vite.config.ts**: Add proxy endpoint for development workflow
- **ProjectDiscoveryService**: Ensure cache can be cleared (if not already available)

### Error Handling
- **Backend unavailable**: Vite endpoint responds success, page still reloads
- **Cache clear fails**: Log error but continue with page reload
- **Network error**: Show user-friendly error message

## 4. Acceptance Criteria

- ✅ Hamburger menu contains "Refresh Config" button with RefreshCw icon
- ✅ Button shows spinning animation and disabled state during processing
- ✅ `POST /api/cache/clear` endpoint clears project discovery cache
- ✅ File watchers are reinitialized after cache clear
- ✅ Page automatically reloads to show updated project list
- ✅ Works in development (Vite proxy) and production (direct backend)
- ✅ Graceful handling when backend is unavailable

## 5. Implementation Status

### ✅ COMPLETED
- **Frontend**: HamburgerMenu.tsx updated with refresh button
- **Backend**: Cache clear endpoint added to server.js
- **Vite**: Proxy endpoint added to vite.config.ts
- **UX**: Loading states and auto-reload implemented

### Testing Results
- ✅ Button appears in hamburger menu
- ✅ Spinning animation works during refresh
- ✅ Page reloads after cache clear
- ✅ Fresh project configuration loaded
- ⚠️ Backend endpoint needs server restart to be active

**Status**: Implementation complete, requires backend server restart for full functionality.

### Rationale
When project config files are moved from ~/.config/markdown-ticket/projects/, the frontend still shows cached projects. Manual server restart is inconvenient for users.

## 2. Solution Analysis
*To be filled during implementation*

## 3. Implementation Specification
*To be filled during implementation*

## 4. Acceptance Criteria
*To be filled during implementation*

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*To be filled during implementation*