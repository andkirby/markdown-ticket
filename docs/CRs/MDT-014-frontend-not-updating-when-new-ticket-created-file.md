---
code: MDT-014
title: Frontend not updating when new ticket created - file-change event not handled
status: Implemented
dateCreated: 2025-09-06T12:31:12.335Z
type: Bug Fix
priority: High
lastModified: 2025-09-06T13:28:42.876Z
---

# Frontend not updating when new ticket created - file-change event not handled

## 1. Description

### Problem Statement
Backend broadcasts file-change events when new ticket is created but frontend doesn't react and new ticket doesn't appear in UI

### Current State
SSE clients were being incorrectly marked as stale and removed due to invalid `client.readyState !== 'open'` check in `fileWatcherService.js:117`. HTTP response objects don't have a `readyState` property (that's a WebSocket property).

### Desired State
SSE clients should remain connected and receive file-change events when tickets are created, updated, or deleted.

### Rationale
Critical UI synchronization issue preventing users from seeing newly created tickets

## 2. Solution Analysis

### Root Cause
The stale client detection logic in `fileWatcherService.js` used WebSocket properties (`readyState`) instead of HTTP response object properties.

### Chosen Approach
Replace incorrect `client.readyState !== 'open'` check with proper HTTP response properties `client.destroyed || client.closed`.

## 3. Implementation Specification

### Technical Requirements
- Fix stale client detection logic in `server/fileWatcherService.js:117`
- Use appropriate HTTP response object properties for connection state checking

## 4. Acceptance Criteria
- [x] New tickets appear in UI immediately when created via file system
- [x] SSE clients remain connected and don't get marked as stale incorrectly
- [x] Real-time updates work for add, change, and delete operations

## 5. Implementation Notes
**Fixed on 2025-09-06:**
- Changed `client.readyState !== 'open'` to `client.destroyed || client.closed` in `fileWatcherService.js:117`
- Verified fix works with test script `./test-deb-ticket-appear.sh`
- SSE clients now properly receive file-change events

## 6. References

### Code Changes
- Fixed file: `server/fileWatcherService.js:117`