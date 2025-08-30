const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const TICKETS_DIR = path.join(__dirname, 'tasks');
const DEFAULT_TICKETS_DIR = './tasks';

// Ensure tasks directory exists
async function ensureTasksDirectory() {
  try {
    await fs.access(TICKETS_DIR);
  } catch (error) {
    console.log(`Creating tasks directory at: ${TICKETS_DIR}`);
    await fs.mkdir(TICKETS_DIR, { recursive: true });
  }
}

// Initialize server
async function initializeServer() {
  await ensureTasksDirectory();
  
  // Create some sample tickets if directory is empty
  try {
    const files = await fs.readdir(TICKETS_DIR);
    if (files.length === 0) {
      console.log('Creating sample tickets...');
      await createSampleTickets();
    }
  } catch (error) {
    console.error('Error checking tasks directory:', error);
  }
}

// Create sample tickets for demonstration
async function createSampleTickets() {
  const sampleTickets = [
    {
      filename: 'CR-A001.md',
      content: `---
code: CR-A001
title: Implement user authentication system
status: In Progress
dateCreated: 2024-01-15T00:00:00.000Z
type: Feature Enhancement
priority: High
phaseEpic: Phase A (Foundation)
source: User Request
impact: Major
effort: High
relatedTickets: 
supersedes: 
dependsOn: 
blocks: 
relatedDocuments: 
implementationDate: 
implementationNotes: 
lastModified: 2024-01-20T00:00:00.000Z
---

# Change Request: CR-A001

## Description
Implement a comprehensive user authentication system for the application.

## Requirements
- User registration and login
- JWT token-based authentication
- Password reset functionality
- Role-based access control
- Session management

## Implementation Notes
Authentication system implemented with JWT tokens.

## Acceptance Criteria
- [ ] Users can register with email and password
- [ ] Users can log in and receive JWT tokens
- [ ] Password reset functionality works
- [ ] Role-based access control is implemented
- [ ] Sessions are properly managed`
    },
    {
      filename: 'CR-A002.md',
      content: `---
code: CR-A002
title: Fix responsive design issues on mobile
status: Proposed
dateCreated: 2024-01-18T00:00:00.000Z
type: Bug Fix
priority: Medium
phaseEpic: Phase A (Foundation)
source: User Feedback
impact: Minor
effort: Low
relatedTickets: 
supersedes: 
dependsOn: 
blocks: 
relatedDocuments: 
implementationDate: 
implementationNotes: 
lastModified: 2024-01-18T00:00:00.000Z
---

# Change Request: CR-A002

## Description
Fix responsive design issues that occur on mobile devices.

## Issues Found
- Navigation menu overlaps with content on small screens
- Form fields are too close together
- Buttons are not touch-friendly
- Text is too small to read on mobile

## Implementation Notes
`
    },
    {
      filename: 'CR-A003.md',
      content: `---
code: CR-A003
title: Add comprehensive error handling
status: Approved
dateCreated: 2024-01-10T00:00:00.000Z
type: Technical Debt
priority: Medium
phaseEpic: Phase A (Foundation)
source: Development Team
impact: Major
effort: Medium
relatedTickets: 
supersedes: 
dependsOn: 
blocks: 
relatedDocuments: 
implementationDate: 
implementationNotes: 
lastModified: 2024-01-10T00:00:00.000Z
---

# Change Request: CR-A003

## Description
Add comprehensive error handling throughout the application to improve user experience and system reliability.

## Areas to Improve
- API error responses
- Form validation errors
- File upload errors
- Network connection errors
- Database connection errors

## Implementation Notes
`
    },
    {
      filename: 'CR-B001.md',
      content: `---
code: CR-B001
title: Implement dark mode support
status: Implemented
dateCreated: 2023-12-20T00:00:00.000Z
type: Feature Enhancement
priority: Low
phaseEpic: Phase B (Enhancement)
source: User Request
impact: Minor
effort: Low
relatedTickets: 
supersedes: 
dependsOn: 
blocks: 
relatedDocuments: 
implementationDate: 2024-01-05T00:00:00.000Z
implementationNotes: Dark mode implemented with CSS variables
lastModified: 2024-01-05T00:00:00.000Z
---

# Change Request: CR-B001

## Description
Implement dark mode support for the application to improve user experience in low-light environments.

## Features
- Dark/light theme toggle
- System preference detection
- Smooth theme transitions
- Consistent dark mode across all components

## Implementation Notes
Dark mode implemented with CSS variables.

## Acceptance Criteria
- [ ] Theme toggle button works
- [ ] System preference is respected
- [ ] All components have dark mode styles
- [ ] Theme transitions are smooth`
    }
  ];

  for (const ticket of sampleTickets) {
    try {
      const filePath = path.join(TICKETS_DIR, ticket.filename);
      await fs.writeFile(filePath, ticket.content, 'utf8');
      console.log(`Created sample ticket: ${ticket.filename}`);
    } catch (error) {
      console.error(`Error creating sample ticket ${ticket.filename}:`, error);
    }
  }
}

// API Routes

// Get all task files
app.get('/api/tasks', async (req, res) => {
  try {
    const files = await fs.readdir(TICKETS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    res.json(mdFiles);
  } catch (error) {
    console.error('Error loading tasks:', error);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// Get individual task file
app.get('/api/tasks/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(TICKETS_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (accessError) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    res.send(content);
  } catch (error) {
    console.error('Error loading task:', error);
    res.status(500).json({ error: 'Failed to load task' });
  }
});

// Save task file
app.post('/api/tasks/save', async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }
    
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(TICKETS_DIR, safeFilename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content, 'utf8');
    
    console.log(`Saved ticket: ${safeFilename}`);
    res.json({ success: true, message: 'Task saved successfully', filename: safeFilename });
  } catch (error) {
    console.error('Error saving task:', error);
    res.status(500).json({ error: 'Failed to save task' });
  }
});

// Delete task file
app.delete('/api/tasks/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(TICKETS_DIR, safeFilename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (accessError) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Delete file
    await fs.unlink(filePath);
    
    console.log(`Deleted ticket: ${safeFilename}`);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get server status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Ticket board server is running',
    tasksDir: TICKETS_DIR,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ticket board server running on port ${PORT}`);
  console.log(`📁 Tasks directory: ${TICKETS_DIR}`);
  console.log(`🌐 API endpoints:`);
  console.log(`   GET  /api/tasks - List all task files`);
  console.log(`   GET  /api/tasks/:filename - Get specific task`);
  console.log(`   POST /api/tasks/save - Save task file`);
  console.log(`   DELETE /api/tasks/:filename - Delete task file`);
  console.log(`   GET  /api/status - Server status`);
  
  // Initialize the server
  initializeServer().catch(console.error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});