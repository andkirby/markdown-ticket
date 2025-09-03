import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import FileWatcherService from './fileWatcherService.js';
import ProjectDiscoveryService from './projectDiscovery.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TICKETS_DIR = path.join(__dirname, 'sample-tasks');
const DEFAULT_TICKETS_DIR = './sample-tasks';

// Initialize file watcher service
const fileWatcher = new FileWatcherService();

// Initialize project discovery service
const projectDiscovery = new ProjectDiscoveryService();

// Helper function to generate project-specific ticket codes
function generateProjectSpecificCode(project, config, nextNumber) {
  const projectCode = config.project.code || project.id.toUpperCase();
  
  // Check if project has specific code pattern requirements
  if (project.tickets?.codePattern && project.tickets.codePattern.includes('[A-Z]')) {
    // For patterns like "^CR-[A-Z]\\d{3}$", generate CR-A001, CR-A002, etc.
    const letterIndex = Math.floor((nextNumber - 1) / 999); // Every 999 tickets, increment letter
    const numberPart = ((nextNumber - 1) % 999) + 1;
    const letter = String.fromCharCode(65 + letterIndex); // A, B, C, etc.
    return `${projectCode}-${letter}${String(numberPart).padStart(3, '0')}`;
  }
  
  // Default format: PROJECT-001, PROJECT-002, etc.
  return `${projectCode}-${String(nextNumber).padStart(3, '0')}`;
}

// Ensure sample-tasks directory exists
async function ensureTasksDirectory() {
  try {
    await fs.access(TICKETS_DIR);
  } catch (error) {
    console.log(`Creating sample-tasks directory at: ${TICKETS_DIR}`);
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

// Server-Sent Events endpoint for real-time file updates
app.get('/api/events', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add client to file watcher service
  fileWatcher.addClient(res);

  console.log(`SSE client connected. Total clients: ${fileWatcher.getClientCount()}`);
});

// Get server status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Ticket board server is running',
    tasksDir: TICKETS_DIR,
    timestamp: new Date().toISOString(),
    sseClients: fileWatcher.getClientCount()
  });
});

// ========================================
// Multi-Project API Routes
// ========================================

// Get all registered projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await projectDiscovery.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Get specific project configuration
app.get('/api/projects/:projectId/config', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const config = projectDiscovery.getProjectConfig(project.project.path);
    if (!config) {
      return res.status(404).json({ error: 'Project configuration not found' });
    }

    res.json({ project, config });
  } catch (error) {
    console.error('Error getting project config:', error);
    res.status(500).json({ error: 'Failed to get project configuration' });
  }
});

// Get CRs for a specific project
app.get('/api/projects/:projectId/crs', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const crs = projectDiscovery.getProjectCRs(project.project.path);
    res.json(crs);
  } catch (error) {
    console.error('Error getting project CRs:', error);
    res.status(500).json({ error: 'Failed to get project CRs' });
  }
});

// Get specific CR from a project
app.get('/api/projects/:projectId/crs/:crId', async (req, res) => {
  try {
    const { projectId, crId } = req.params;
    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const crs = projectDiscovery.getProjectCRs(project.project.path);
    const cr = crs.find(c => c.code === crId || c.filename.includes(crId));
    
    if (!cr) {
      return res.status(404).json({ error: 'CR not found' });
    }

    res.json(cr);
  } catch (error) {
    console.error('Error getting CR:', error);
    res.status(500).json({ error: 'Failed to get CR' });
  }
});

// Create new CR in a project
app.post('/api/projects/:projectId/crs', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { code, title, type, priority, description } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const config = projectDiscovery.getProjectConfig(project.project.path);
    if (!config) {
      return res.status(400).json({ error: 'Project configuration not found' });
    }

    // Get next CR number
    const counterPath = path.join(project.project.path, '.mdt-next');
    let nextNumber = 1;
    
    try {
      const counterContent = await fs.readFile(counterPath, 'utf8');
      nextNumber = parseInt(counterContent.trim()) || 1;
    } catch (error) {
      // Counter file doesn't exist, start with 1
    }

    // Generate CR code based on project configuration or use provided code
    let crCode;
    if (code) {
      // Use provided code
      crCode = code;
    } else {
      // Generate code based on project pattern
      crCode = generateProjectSpecificCode(project, config, nextNumber);
    }
    const titleSlug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `${crCode}-${titleSlug}.md`;

    const crContent = `- **Code**: ${crCode}
- **Title/Summary**: ${title}
- **Status**: Proposed
- **Date Created**: ${new Date().toISOString().split('T')[0]}
- **Type**: ${type}
- **Priority**: ${priority || 'Medium'}
- **Phase/Epic**: Phase A (Foundation)

# ${title}

## 1. Description

### Problem Statement
${description || 'Please provide a detailed problem statement.'}

### Current State
Please describe the current behavior/implementation.

### Desired State
Please describe what the new behavior/implementation should be.

### Rationale
Please explain why this change is important and why now.

### Impact Areas
Please list what parts of the system will be affected.

## 2. Solution Analysis

### Approaches Considered
Please list alternative solutions that were evaluated.

### Trade-offs Analysis
Please provide pros/cons of different approaches.

### Decision Factors
Please list technical constraints, timeline, resources, user impact.

### Chosen Approach
Please explain why this solution was selected.

### Rejected Alternatives
Please explain why other approaches were not chosen.

## 3. Implementation Specification

### Technical Requirements
Please list specific technical changes needed.

### UI/UX Changes
Please describe user interface modifications (if applicable).

### API Changes
Please describe new endpoints, modified responses, breaking changes (if applicable).

### Database Changes
Please describe schema modifications, data migrations (if applicable).

### Configuration
Please describe new settings, environment variables, deployment changes (if applicable).

## 4. Acceptance Criteria

Please list specific, testable conditions that must be met for completion:
- [ ] Condition 1
- [ ] Condition 2
- [ ] Condition 3

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References

### Related Tasks
- Link to specific implementation tasks

### Code Changes
- Reference commits, pull requests, or branches

### Documentation Updates
- Links to updated documentation sections

### Related CRs
- Cross-references to dependent or related change requests
`;

    // Write CR file
    const crPath = path.join(project.project.path, config.project.path || 'docs/CRs');
    await fs.mkdir(crPath, { recursive: true });
    const crFilePath = path.join(crPath, filename);
    await fs.writeFile(crFilePath, crContent, 'utf8');

    // Update counter
    await fs.writeFile(counterPath, String(nextNumber + 1), 'utf8');

    console.log(`Created CR: ${filename} in project ${projectId}`);
    res.json({ 
      success: true, 
      message: 'CR created successfully',
      crCode,
      filename,
      path: crFilePath
    });
  } catch (error) {
    console.error('Error creating CR:', error);
    res.status(500).json({ error: 'Failed to create CR' });
  }
});

// Update CR in a project
app.put('/api/projects/:projectId/crs/:crId', async (req, res) => {
  try {
    const { projectId, crId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const crs = projectDiscovery.getProjectCRs(project.project.path);
    const cr = crs.find(c => c.code === crId || c.filename.includes(crId));
    
    if (!cr) {
      return res.status(404).json({ error: 'CR not found' });
    }

    // Update CR file
    await fs.writeFile(cr.path, content, 'utf8');

    console.log(`Updated CR: ${cr.filename} in project ${projectId}`);
    res.json({ 
      success: true, 
      message: 'CR updated successfully',
      filename: cr.filename
    });
  } catch (error) {
    console.error('Error updating CR:', error);
    res.status(500).json({ error: 'Failed to update CR' });
  }
});

// Delete CR from a project
app.delete('/api/projects/:projectId/crs/:crId', async (req, res) => {
  try {
    const { projectId, crId } = req.params;
    
    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const crs = projectDiscovery.getProjectCRs(project.project.path);
    const cr = crs.find(c => c.code === crId || c.filename.includes(crId));
    
    if (!cr) {
      return res.status(404).json({ error: 'CR not found' });
    }

    // Delete CR file
    await fs.unlink(cr.path);

    console.log(`Deleted CR: ${cr.filename} from project ${projectId}`);
    res.json({ 
      success: true, 
      message: 'CR deleted successfully',
      filename: cr.filename
    });
  } catch (error) {
    console.error('Error deleting CR:', error);
    res.status(500).json({ error: 'Failed to delete CR' });
  }
});

// Register a new project
app.post('/api/projects/register', async (req, res) => {
  try {
    const { name, path: projectPath, description, configFile } = req.body;
    
    if (!name || !projectPath) {
      return res.status(400).json({ error: 'Name and path are required' });
    }

    // Verify project path exists and has .mdt-config.toml
    const configPath = path.join(projectPath, configFile || '.mdt-config.toml');
    try {
      await fs.access(configPath);
    } catch (error) {
      return res.status(400).json({ error: 'Project path does not contain .mdt-config.toml' });
    }

    const projectInfo = {
      id: path.basename(projectPath),
      name,
      path: projectPath,
      description: description || '',
      configFile: configFile || '.mdt-config.toml',
      active: true
    };

    const success = projectDiscovery.registerProject(projectInfo);
    if (success) {
      res.json({ success: true, message: 'Project registered successfully', project: projectInfo });
    } else {
      res.status(500).json({ error: 'Failed to register project' });
    }
  } catch (error) {
    console.error('Error registering project:', error);
    res.status(500).json({ error: 'Failed to register project' });
  }
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
  console.log(`🌐 Single Project API endpoints:`);
  console.log(`   GET  /api/tasks - List all task files`);
  console.log(`   GET  /api/tasks/:filename - Get specific task`);
  console.log(`   POST /api/tasks/save - Save task file`);
  console.log(`   DELETE /api/tasks/:filename - Delete task file`);
  console.log(`   GET  /api/events - Server-Sent Events for real-time updates`);
  console.log(`   GET  /api/status - Server status`);
  console.log(`🌐 Multi-Project API endpoints:`);
  console.log(`   GET  /api/projects - List all registered projects`);
  console.log(`   GET  /api/projects/:id/config - Get project configuration`);
  console.log(`   GET  /api/projects/:id/crs - List CRs for project`);
  console.log(`   GET  /api/projects/:id/crs/:crId - Get specific CR`);
  console.log(`   POST /api/projects/:id/crs - Create new CR`);
  console.log(`   PUT  /api/projects/:id/crs/:crId - Update CR`);
  console.log(`   DELETE /api/projects/:id/crs/:crId - Delete CR`);
  console.log(`   POST /api/projects/register - Register new project`);
  
  // Initialize the server
  initializeServer()
    .then(() => {
      // Initialize file watcher after server is ready
      const watchPath = path.join(TICKETS_DIR, '*.md');
      fileWatcher.initFileWatcher(watchPath);
      fileWatcher.startHeartbeat();
      console.log(`📡 File watcher initialized for: ${watchPath}`);
    })
    .catch(console.error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  fileWatcher.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  fileWatcher.stop();
  process.exit(0);
});