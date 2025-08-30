# Ticket Move Integration Guide

This document explains exactly what happens when a user moves a ticket from one column to another in the md-ticket-board application.

## Overview

When a user drags and drops a ticket from one column to another, the system goes through a complete integration flow that updates both the UI state and the backend file system.

## What Should Happen When a User Moves a Ticket

### 1. User Interaction Flow

```
User drags ticket → Drops on new column → Visual feedback → Backend update → UI refresh
```

### 2. Technical Flow

```
Drag & Drop Event → Column.onDrop() → Board.handleDrop() → moveTicket() → updateTicket() → File System Update
```

## Detailed Integration Steps

### Step 1: Drag and Drop Initialization

**Component**: `DraggableTicketCard` in `Column.tsx`
**Action**: User starts dragging a ticket
**Implementation**:
```tsx
const [{ isDragging }, drag] = useDrag(() => ({
  type: 'ticket',
  item: { ticket },
  collect: (monitor) => ({
    isDragging: !!monitor.isDragging(),
  }),
}));
```

### Step 2: Drop Event Handling

**Component**: `Column` in `Column.tsx`
**Action**: User drops ticket on target column
**Implementation**:
```tsx
const [{ isOver }, drop] = useDrop(() => ({
  accept: 'ticket',
  drop: (item: any) => {
    console.log('Dropped ticket:', item.ticket, 'on column:', column.status);
    onDrop(column.status, item.ticket);  // Call parent handler
  },
  collect: (monitor) => ({
    isOver: !!monitor.isOver(),
  }),
}));
```

### Step 3: Board-Level Processing

**Component**: `BoardContent` in `Board.tsx`
**Action**: Process the drop and initiate backend update
**Implementation**:
```tsx
const handleDrop = useCallback(async (status: Status, ticket: Ticket) => {
  console.log('Board: handleDrop called with:', { status, ticketCode: ticket.code, ticketStatus: ticket.status });
  try {
    await moveTicket(ticket.code, status);  // Call backend service
    console.log('Board: Ticket moved successfully');
  } catch (error) {
    console.error('Board: Failed to move ticket:', error);
  }
}, [moveTicket]);
```

### Step 4: Backend Service Call

**Hook**: `useTicketStatusAutomation` in `useTicketData.ts`
**Action**: Update ticket status with automation logic
**Implementation**:
```tsx
const moveTicket = useCallback(async (ticketCode: string, newStatus: Status): Promise<void> => {
  console.log('useTicketStatusAutomation: moveTicket called with:', { ticketCode, newStatus });
  try {
    await updateTicket(ticketCode, { status: newStatus });
    console.log('useTicketStatusAutomation: Ticket status updated successfully');
    
    // Auto-set implementation date when status changes to "Implemented"
    if (newStatus === 'Implemented' || newStatus === 'Partially Implemented') {
      await updateTicket(ticketCode, {
        implementationDate: new Date(),
        implementationNotes: `Status changed to ${newStatus} on ${new Date().toLocaleDateString()}`
      });
      console.log('useTicketStatusAutomation: Implementation date set');
    }
  } catch (error) {
    console.error('useTicketStatusAutomation: Failed to move ticket:', error);
    throw error;
  }
}, [updateTicket]);
```

### Step 5: File System Update

**Service**: `FileService` in `fileService.ts`
**Action**: Save ticket to both localStorage and markdown file
**Implementation**:
```tsx
async updateTicket(ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> {
  // ... existing code to create updated ticket
  
  // Save to localStorage first
  await this.saveTicket(updatedTicket);
  
  // Try to save to actual markdown file if it exists
  try {
    await this.saveTicketToFile(updatedTicket);
    console.log('FileService: Ticket saved to file successfully');
  } catch (fileError) {
    console.warn('FileService: Failed to save ticket to file, using localStorage fallback:', fileError);
  }
  
  return updatedTicket;
}
```

### Step 6: File Persistence

**Service**: `FileService.saveTicketToFile()`
**Action**: Generate markdown content and save to file system
**Implementation**:
```tsx
private async saveTicketToFile(ticket: Ticket): Promise<void> {
  try {
    // Generate markdown content
    const markdownContent = this.generateMarkdownContent(ticket);
    
    // Make API call to save the file
    const response = await fetch('/api/tasks/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: ticket.filePath,
        content: markdownContent
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save ticket file: ${response.statusText}`);
    }

    console.log(`FileService: Ticket ${ticket.code} saved to file: ${ticket.filePath}`);
  } catch (error) {
    console.error(`FileService: Failed to save ticket ${ticket.code} to file:`, error);
    throw error;
  }
}
```

## Backend API Integration

### Required API Endpoints

For the ticket move functionality to work completely, you need these API endpoints:

#### 1. Save Ticket File
```http
POST /api/tasks/save
Content-Type: application/json

{
  "filename": "./tickets/CR-A001.md",
  "content": "---\ncode: CR-A001\nstatus: In Progress\n---\n# Change Request: CR-A001\n..."
}
```

#### 2. Load Tasks Directory
```http
GET /api/tasks
```

#### 3. Load Individual Task File
```http
GET /api/tasks/{filename}
```

### Backend Implementation Example (Node.js/Express)

```javascript
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

app.use(express.json());

// Get all task files
app.get('/api/tasks', async (req, res) => {
  try {
    const tasksDir = path.join(__dirname, 'tasks');
    const files = await fs.readdir(tasksDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    res.json(mdFiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// Get individual task file
app.get('/api/tasks/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'tasks', filename);
    const content = await fs.readFile(filePath, 'utf8');
    res.send(content);
  } catch (error) {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Save task file
app.post('/api/tasks/save', async (req, res) => {
  try {
    const { filename, content } = req.body;
    const filePath = path.join(__dirname, 'tasks', filename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content, 'utf8');
    
    res.json({ success: true, message: 'Task saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save task' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Error Handling and Fallbacks

### 1. File System Errors
- **Issue**: Cannot save to markdown file
- **Fallback**: Save to localStorage
- **User Impact**: Ticket move still works, changes persist in browser

### 2. Network Errors
- **Issue**: Cannot reach backend API
- **Fallback**: Use localStorage
- **User Impact**: Ticket move works, changes sync when network is restored

### 3. Validation Errors
- **Issue**: Invalid ticket data
- **Action**: Show error message to user
- **User Impact**: Cannot complete move operation

## Debugging and Troubleshooting

### Console Log Sequence

When a ticket is moved successfully, you should see this sequence:

```
Column.tsx: Dropped ticket: {code: "CR-A001", ...} on column: "In Progress"
Board.tsx: Board: handleDrop called with: {status: "In Progress", ticketCode: "CR-A001", ticketStatus: "Proposed"}
useTicketData.ts: useTicketStatusAutomation: moveTicket called with: {ticketCode: "CR-A001", newStatus: "In Progress"}
useTicketData.ts: useTicketStatusAutomation: Ticket status updated successfully
fileService.ts: FileService: updateTicket called with: {ticketCode: "CR-A001", updates: {status: "In Progress"}}
fileService.ts: FileService: Updated ticket created: {code: "CR-A001", status: "In Progress", ...}
fileService.ts: FileService: Ticket saved to localStorage
fileService.ts: FileService: Ticket saved to file successfully
Board.tsx: Board: Ticket moved successfully
```

### Common Issues

#### 1. Ticket Doesn't Move
- **Check**: Console for drag/drop events
- **Check**: `onDrop` function is called
- **Check**: `moveTicket` function is called
- **Check**: `updateTicket` function is called

#### 2. Ticket Moves But Doesn't Persist
- **Check**: File system permissions
- **Check**: Backend API is running
- **Check**: Network connectivity
- **Check**: Browser console for errors

#### 3. Backend API Not Responding
- **Check**: Server is running
- **Check**: API endpoints are correct
- **Check**: CORS settings
- **Check**: Request/response format

## Testing the Integration

### Manual Testing Steps

1. **Start Backend Server**
   ```bash
   node server.js
   ```

2. **Start Frontend Application**
   ```bash
   npm start
   ```

3. **Test Ticket Move**
   - Drag a ticket from "Proposed" to "In Progress"
   - Check console logs for expected sequence
   - Verify ticket appears in new column
   - Check backend file system for updated file

4. **Verify File Content**
   ```bash
   cat ./tasks/CR-A001.md
   ```
   Should show updated status in front matter.

### Automated Testing

```javascript
// Test ticket move functionality
describe('Ticket Move Integration', () => {
  it('should update ticket status when moved between columns', async () => {
    // Mock API calls
    fetch.mockResponseOnce(JSON.stringify(['CR-A001.md']));
    fetch.mockResponseOnce('---\ncode: CR-A001\nstatus: Proposed\n---\n# Test');
    
    // Create ticket and move it
    const { moveTicket } = useTicketStatusAutomation();
    await moveTicket('CR-A001', 'In Progress');
    
    // Verify API was called with correct data
    expect(fetch).toHaveBeenCalledWith('/api/tasks/save', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('status: In Progress')
    }));
  });
});
```

## Performance Considerations

### 1. File System Operations
- **Optimization**: Batch multiple ticket updates
- **Fallback**: Use localStorage for offline support
- **Cache**: Cache ticket data to reduce file system calls

### 2. Network Operations
- **Optimization**: Debounce rapid moves
- **Fallback**: Queue operations for offline sync
- **Compression**: Compress file content for large tickets

### 3. UI Performance
- **Optimization**: Virtualize long columns
- **Feedback**: Show loading state during save
- **Animation**: Smooth transitions between columns

## Security Considerations

### 1. File System Security
- **Validation**: Sanitize file paths
- **Permissions**: Restrict file system access
- **Backup**: Regular backups of ticket files

### 2. API Security
- **Authentication**: Secure API endpoints
- **Authorization**: Validate user permissions
- **Input Validation**: Sanitize all inputs

### 3. Data Integrity
- **Transactions**: Ensure atomic file operations
- **Validation**: Validate ticket data structure
- **Logging**: Audit all ticket changes

## Future Enhancements

### 1. Real-time Collaboration
- **WebSocket**: Real-time updates across users
- **Conflict Resolution**: Handle concurrent edits
- **Presence**: Show who is viewing/editing tickets

### 2. Advanced Automation
- **Webhooks**: Notify external systems of changes
- **Rules Engine**: Automated status transitions
- **AI Suggestions**: Smart ticket routing

### 3. Enhanced File Management
- **Version Control**: Track ticket changes
- **Diff Viewer**: Show what changed between versions
- **Restore**: Rollback to previous versions

## Summary

The ticket move integration is a complete end-to-end flow that:

1. **Captures user interaction** through drag-and-drop
2. **Processes the request** through React components and hooks
3. **Updates the backend** through API calls
4. **Persists changes** to both localStorage and markdown files
5. **Provides feedback** to the user through UI updates
6. **Handles errors** gracefully with fallback mechanisms

This ensures that ticket status changes are properly tracked, persisted, and synchronized across the application.