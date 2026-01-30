---
code: MDT-022
title: Duplicate ticket detection and resolution system with smart numbering
status: Implemented
dateCreated: 2025-09-07T00:25:57.000Z
type: Feature Enhancement
priority: High
phaseEpic: Data Integrity & User Experience
lastModified: 2025-09-07T00:25:57.000Z
---

# Duplicate Ticket Detection and Resolution System with Smart Numbering

## Problem Statement

Users encountered React warnings about duplicate keys (e.g., DEB-016) which indicated multiple tickets with the same code. This causes:

- **UI Issues**: Visual glitches, components appearing/disappearing
- **Drag & Drop Problems**: Incorrect ticket movement behavior
- **State Management Issues**: React reconciliation failures
- **Data Integrity**: Multiple files with same ticket code

Additionally, the ticket numbering system used inconsistent logic across different components, leading to potential number conflicts.

## Solution Implemented

### 1. Automatic Duplicate Detection
- **Real-time scanning** when loading tickets in SingleProjectView
- **API endpoint** `/api/duplicates/:projectId` to detect duplicates
- **Support for multiple formats**: YAML frontmatter and markdown format
- **Automatic modal trigger** when duplicates are found

### 2. User-Friendly Resolution Interface
- **DuplicateResolver component** with modal overlay
- **Clear error messaging** explaining the issue and impact
- **Action buttons** for each duplicate ticket:
  - **Rename to Next #** - assigns next available number
  - **Delete** - removes the duplicate file
- **Preview functionality** showing new ticket key and filename
- **Confirmation dialogs** to prevent accidental actions

### 3. Smart Numbering System
Replaced inconsistent counter-only logic with intelligent numbering:

**Old Logic (Dumb):**
```javascript
// Only read counter file
const nextNumber = parseInt(counterContent) || 1;
```

**New Logic (Smart):**
```javascript
// Scan existing tickets + check counter, use higher value
const maxFromTickets = findHighestTicketNumber();
const counterValue = readCounterFile();
const nextNumber = Math.max(maxFromTickets + 1, counterValue);
```

**Benefits:**
- ✅ **Conflict prevention** - never reuses existing numbers
- ✅ **Handles outdated counters** - scans actual files
- ✅ **Manual ticket creation safe** - detects externally created tickets
- ✅ **File system resilience** - works even if counter is wrong

### 4. System-Wide Implementation
Applied smart numbering to all ticket creation points:

- ✅ **REST API** (`/api/projects/:id/crs`) - Multi-project endpoint
- ✅ **MCP Server** (`getNextCRNumber`) - Already had smart logic
- ✅ **Duplicate Resolver** (`getNextTicketNumber`) - New implementation
- ✅ **Preview System** (`/api/duplicates/preview`) - Shows future numbers

## Technical Implementation

### Components Added
- `DuplicateResolver.tsx` - Main resolution interface
- `PreviewInfo` interface - Type definitions for rename preview

### API Endpoints Added
- `GET /api/duplicates/:projectId` - Detect duplicate tickets
- `POST /api/duplicates/resolve` - Rename or delete duplicates
- `POST /api/duplicates/preview` - Preview rename changes

### Helper Functions
- `loadTickets(projectPath)` - Load tickets from directory (supports both formats)
- `getNextTicketNumber(projectPath, projectCode)` - Smart numbering logic
- `updateTicketCounter(projectPath, nextNumber)` - Update counter file

## User Experience

### Before
- ❌ Silent React warnings in console
- ❌ Unpredictable UI behavior with duplicates
- ❌ Risk of number conflicts from inconsistent logic
- ❌ No way to resolve duplicates easily

### After
- ✅ **Automatic detection** with clear error modal
- ✅ **One-click resolution** with preview
- ✅ **Intelligent numbering** prevents all conflicts
- ✅ **User education** about what's happening and why

## Impact Areas
- **Frontend**: React component stability, user interface
- **Backend**: API consistency, file system operations
- **MCP Integration**: Consistent numbering across all creation methods
- **Data Integrity**: Prevention of duplicate keys and number conflicts

## Future Considerations

The `.mdt-next` counter file is now primarily a performance hint rather than the source of truth. Consider:
- **Option A**: Keep as performance optimization for large projects
- **Option B**: Remove entirely and rely on file scanning only

Current implementation works perfectly with or without the counter file, making this a low-priority optimization decision.

## Testing Completed
- ✅ Duplicate detection with mixed YAML/markdown formats
- ✅ Rename functionality with preview
- ✅ Smart numbering across all creation methods
- ✅ UI modal behavior and confirmation dialogs
- ✅ API endpoint functionality and error handling

## Status: Implemented ✅

All functionality is complete and tested. The system now provides robust duplicate detection and resolution with intelligent numbering that prevents conflicts across all ticket creation methods.
