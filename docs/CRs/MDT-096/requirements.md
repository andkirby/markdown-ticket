# Requirements: MDT-096

**Source**: [MDT-096](../../../docs/CRs/MDT-096.md)
**Generated**: 2025-12-15
**CR Type**: Architecture

## Introduction

The FileWatcherService provides real-time file monitoring and event broadcasting capabilities that enable immediate UI updates for end users when ticket files are modified. This document captures the current working behavior experienced by end users on the website, focusing on the real-time synchronization of ticket changes across the Kanban board, list view, and document browser.

## Requirements

### Requirement 1: Real-time Ticket Updates

**Objective**: As a user collaborating on a project, I want to see ticket changes made by others immediately without manual refresh, so that I always have the current view of project status.

#### Acceptance Criteria

1. WHEN another user adds a new ticket file (e.g., MDT-100.md), the `FileWatcherService` shall broadcast a `file-change` event within 100ms of file creation.
2. WHEN the SSE event is received, the `SSEClient` shall emit a `ticket:created` event with parsed ticket frontmatter data.
3. WHEN the `ticket:created` event is processed, the `useSSEEvents` hook shall trigger a debounced refresh within 100ms.
4. WHILE the browser tab is active, the `Board` component shall display the new ticket within 200ms of file creation.

### Requirement 2: Optimistic UI Updates

**Objective**: As a user dragging a ticket to a new column, I want to see the change immediately while the system saves it in the background, so that the interface feels responsive.

#### Acceptance Criteria

1. WHEN a user drops a ticket in a new column, the `Column` component shall update the ticket's status locally without waiting for server response.
2. WHEN the optimistic update is applied, the `Board` component shall show the ticket in the new column within 50ms of drop completion.
3. WHEN the corresponding SSE `ticket:updated` event arrives within 5 seconds, the `useSSEEvents` hook shall ignore it to prevent duplicate updates.
4. IF the SSE event doesn't arrive within 5 seconds, the `useSSEEvents` hook shall clean up the optimistic update tracking.

### Requirement 3: Project Management Real-time Updates

**Objective**: As a user managing multiple projects, I want to see when projects are added or removed from the system, so that I can access new workspaces immediately.

#### Acceptance Criteria

1. WHEN a new project .toml file is added to the global registry directory, the `FileWatcherService` shall detect the change within 100ms.
2. WHEN the registry file change is detected, the `FileWatcherService` shall broadcast a `project-created` event to all connected SSE clients.
3. WHEN the `project-created` event is received, the `useProjectManager` hook shall trigger a project list refresh.
4. WHILE the project selector dropdown is visible, it shall include the newly added project within 500ms of file creation.

### Requirement 4: Multi-user Conflict Handling

**Objective**: As multiple users working on the same tickets, I want to see the latest version of any ticket being edited, so that we don't overwrite each other's changes.

#### Acceptance Criteria

1. WHEN two users edit the same ticket file simultaneously, the `FileWatcherService` shall broadcast changes from each save operation.
2. WHEN the SSE `ticket:updated` event contains ticket data, the `useSSEEvents` hook shall update the ticket state directly without a full refresh.
3. IF the ticket data is missing from the SSE event, the `useSSEEvents` hook shall perform a full ticket list refresh within 100ms.
4. WHILE multiple updates are in progress, each update shall include a timestamp to determine the latest version.

### Requirement 5: Connection Reliability

**Objective**: As a user with an unstable internet connection, I want the application to automatically reconnect and sync any missed changes, so that I can continue working without manual intervention.

#### Acceptance Criteria

1. WHEN the SSE connection is lost, the `SSEClient` shall detect the disconnection within 30 seconds.
2. WHEN disconnection is detected, the `SSEClient` shall attempt reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s).
3. WHEN reconnection is successful, the `SSEClient` shall emit an `sse:reconnected` event.
4. WHEN the `sse:reconnected` event is received, the application shall perform a full sync of the current project's tickets.

### Requirement 6: File Watching Performance

**Objective**: As a user working with large projects, I want the file watching to not impact application performance, so that the UI remains responsive even with many tickets.

#### Acceptance Criteria

1. WHEN multiple files are changed rapidly (batch operations), the `FileWatcherService` shall debounce events with a 100ms delay.
2. WHILE debouncing, the `FileWatcherService` shall group changes by eventType:filename:projectId to prevent duplicate broadcasts.
3. WHEN debouncing completes, the `FileWatcherService` shall broadcast a single event for each unique file change.
4. IF more than 50 events are queued, the `FileWatcherService` shall keep only the most recent 50 events to prevent memory issues.

---

## Artifact Mapping

> **Note**: This mapping shows the post-refactoring artifact structure from the architecture design.

| Req ID | Requirement Summary | Primary Artifact | Integration Points |
|--------|---------------------|------------------|-------------------|
| R1.1 | Real-time ticket creation detection | `server/services/fileWatcher/PathWatcherService.ts` | `PathWatcher.ts`, `SSEBroadcaster.ts` |
| R1.2 | SSE event emission for new tickets | `server/services/fileWatcher/SSEBroadcaster.ts` | `ClientManager.ts`, SSE client connections |
| R1.3 | Debounced refresh on ticket creation | `src/hooks/useSSEEvents.ts` | `src/hooks/useProjectManager.ts` |
| R1.4 | UI update within 200ms | `src/components/Board.tsx` | `src/components/Column.tsx` |
| R2.1 | Optimistic status updates | `src/components/Column.tsx` | `src/hooks/useProjectManager.ts` |
| R2.2 | Immediate UI feedback (50ms) | `src/components/Board.tsx` | React state management |
| R2.3 | SSE event deduplication | `src/hooks/useSSEEvents.ts` | `src/services/sseClient.ts` |
| R2.4 | 5-second cleanup timeout | `src/hooks/useSSEEvents.ts` | None |
| R3.1 | Registry file monitoring | `server/services/fileWatcher/PathWatcherService.ts` | `PathWatcher.ts` (registry instance) |
| R3.2 | Project creation events | `server/services/fileWatcher/SSEBroadcaster.ts` | `ClientManager.ts` |
| R3.3 | Project list refresh | `src/hooks/useProjectManager.ts` | `src/hooks/useSSEEvents.ts` |
| R3.4 | Dropdown update within 500ms | `src/components/ProjectSelector.tsx` | React state |
| R4.1 | Concurrent change handling | `server/services/fileWatcher/PathWatcherService.ts` | Multiple `PathWatcher` instances |
| R4.2 | Direct ticket updates with data | `src/hooks/useSSEEvents.ts` | `src/types/index.ts` |
| R4.3 | Fallback refresh without data | `src/hooks/useSSEEvents.ts` | `src/hooks/useProjectManager.ts` |
| R4.4 | Timestamp-based ordering | `server/services/fileWatcher/SSEBroadcaster.ts` | Date.now() |
| R5.1 | Disconnection detection (30s) | `src/services/sseClient.ts` | EventSource readyState |
| R5.2 | Exponential backoff reconnection | `src/services/sseClient.ts` | setTimeout |
| R5.3 | Reconnection event emission | `src/services/sseClient.ts` | `src/services/eventBus.ts` |
| R5.4 | Full sync on reconnect | `src/hooks/useSSEEvents.ts` | `src/hooks/useProjectManager.ts` |
| R6.1 | 100ms debouncing for rapid changes | `server/services/fileWatcher/PathWatcherService.ts` | clearTimeout/setTimeout |
| R6.2 | Event grouping by key | `server/services/fileWatcher/PathWatcherService.ts` | Map data structure |
| R6.3 | Single broadcast per file | `server/services/fileWatcher/SSEBroadcaster.ts` | Event queue |
| R6.4 | Event queue limit (50) | `server/services/fileWatcher/SSEBroadcaster.ts` | Array.slice |

## Traceability

| Req ID | CR Section | Acceptance Criteria |
|--------|------------|---------------------|
| R1.1-R1.4 | Problem | Real-time collaboration needs |
| R2.1-R2.4 | Problem | Responsive UI requirements |
| R3.1-R3.4 | Problem | Multi-project management |
| R4.1-R4.4 | Problem | Concurrent editing scenarios |
| R5.1-R5.4 | Problem | Connection reliability |
| R6.1-R6.4 | Constraints | Performance requirements |

## Non-Functional Requirements

### Performance
- WHEN a file change occurs, the `FileWatcherService` shall broadcast the SSE event within 100ms.
- WHEN an SSE event is received, the UI shall update within 200ms for optimal user experience.
- WHILE monitoring files, the system shall not exceed 1% CPU usage on a typical development machine.

### Reliability
- IF the SSE connection drops, the system shall automatically reconnect with up to 5 retry attempts.
- WHILE reconnection is in progress, the system shall queue locally initiated updates for synchronization.
- IF file parsing fails, the `FileWatcherService` shall continue monitoring and broadcast the event without ticket data.

### Consistency
- WHEN multiple rapid changes occur to the same file, only the latest state shall be broadcast.
- WHILE processing SSE events, duplicate events with the same ID shall be ignored within a 5-second window.
- WHEN optimistic updates are applied, they shall be reconciled with server state within 5 seconds.

---
*Generated from MDT-096 by /mdt:requirements*