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

// Initialize multi-project file watchers
async function initializeMultiProjectWatchers() {
  try {
    console.log('🔍 Discovering projects for file watching...');
    
    // Get all projects from the discovery service
    const projects = await projectDiscovery.getAllProjects();
    console.log(`Found ${projects.length} projects for file watching`);
    
    const projectPaths = [];
    
    // Add default/legacy project (sample-tasks)
    projectPaths.push({
      id: 'sample-tasks',
      path: path.join(TICKETS_DIR, '*.md')
    });
    
    // Add configured projects
    for (const project of projects) {
      try {
        if (!project.project.active) {
          console.log(`Skipping inactive project: ${project.project.name}`);
          continue;
        }

        const projectPath = project.project.path;
        const config = projectDiscovery.getProjectConfig(projectPath);
        
        if (!config || !config.project) {
          console.log(`No config found for project: ${project.project.name}`);
          continue;
        }

        // Construct the full path to the CRs directory
        const crPath = config.project.path || 'docs/CRs';
        const fullCRPath = path.resolve(projectPath, crPath);
        const watchPath = path.join(fullCRPath, '*.md');
        
        // Check if the directory exists
        try {
          await fs.access(fullCRPath);
          projectPaths.push({
            id: project.id,
            path: watchPath
          });
          console.log(`✅ Will watch project ${project.project.name} at: ${watchPath}`);
        } catch (accessError) {
          console.log(`⚠️  CR directory not found for project ${project.project.name}: ${fullCRPath}`);
        }
      } catch (error) {
        console.error(`Error setting up watcher for project ${project.project.name}:`, error);
      }
    }

    if (projectPaths.length === 0) {
      console.log('⚠️  No valid project paths found, falling back to single watcher');
      const watchPath = path.join(TICKETS_DIR, '*.md');
      fileWatcher.initFileWatcher(watchPath);
      console.log(`📡 Single file watcher initialized for: ${watchPath}`);
    } else {
      // Initialize multi-project watchers
      fileWatcher.initMultiProjectWatcher(projectPaths);
      console.log(`📡 Multi-project file watchers initialized for ${projectPaths.length} directories`);
      
      // Log all watched paths
      projectPaths.forEach(project => {
        console.log(`   📂 ${project.id}: ${project.path}`);
      });
    }
  } catch (error) {
    console.error('Error initializing multi-project watchers:', error);
    // Fallback to single watcher
    const watchPath = path.join(TICKETS_DIR, '*.md');
    fileWatcher.initFileWatcher(watchPath);
    console.log(`📡 Fallback file watcher initialized for: ${watchPath}`);
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

  // Send initial connection event
  res.write('data: {"type":"connection","data":{"status":"connected","timestamp":' + Date.now() + '}}\n\n');

  // Add client to file watcher service
  fileWatcher.addClient(res);

  console.log(`SSE client connected. Total clients: ${fileWatcher.getClientCount()}`);

  // Handle client disconnect
  req.on('close', () => {
    console.log('SSE client disconnected');
    fileWatcher.removeClient(res);
  });

  req.on('aborted', () => {
    console.log('SSE client aborted');
    fileWatcher.removeClient(res);
  });
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

// Partially update CR fields in a project (PATCH for specific fields)
app.patch('/api/projects/:projectId/crs/:crId', async (req, res) => {
  try {
    const { projectId, crId } = req.params;
    const updates = req.body;
    
    console.log(`PATCH /api/projects/${projectId}/crs/${crId} - Partial update request`);
    console.log('Updates received:', Object.keys(updates));

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      console.log(`ERROR: Project not found: ${projectId}`);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    console.log(`Found project: ${project.project.name} at ${project.project.path}`);

    const crs = projectDiscovery.getProjectCRs(project.project.path);
    console.log(`Found ${crs.length} CRs in project`);
    
    const cr = crs.find(c => c.code === crId || c.filename.includes(crId));
    
    if (!cr) {
      console.log(`ERROR: CR not found: ${crId}`);
      console.log(`Available CRs:`, crs.map(c => `${c.code} (${c.filename})`));
      return res.status(404).json({ error: 'CR not found' });
    }
    
    console.log(`Found CR: ${cr.code} in file ${cr.path}`);

    // Read current content
    const currentContent = await fs.readFile(cr.path, 'utf8');
    console.log('Current content length:', currentContent.length);
    
    // Parse YAML frontmatter
    const lines = currentContent.split('\n');
    
    // Find the frontmatter boundaries more carefully
    let frontmatterStart = -1;
    let frontmatterEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        if (frontmatterStart === -1) {
          frontmatterStart = i;
        } else if (frontmatterEnd === -1) {
          frontmatterEnd = i;
          break;
        }
      }
    }
    
    console.log('Frontmatter parsing:', { frontmatterStart, frontmatterEnd, lines: lines.length });
    
    if (frontmatterStart === -1 || frontmatterEnd === -1) {
      console.log('ERROR: Invalid ticket format - no YAML frontmatter found');
      return res.status(400).json({ error: 'Invalid ticket format' });
    }
    
    // Extract and update frontmatter
    const frontmatterLines = lines.slice(1, frontmatterEnd);
    const updatedFrontmatter = [...frontmatterLines];
    
    // Auto-add implementation fields when status changes to Implemented/Partially Implemented
    if (updates.status === 'Implemented' || updates.status === 'Partially Implemented') {
      if (!updates.implementationDate) {
        updates.implementationDate = new Date().toISOString();
        console.log(`Auto-set implementationDate for status: ${updates.status}`);
      }
      if (!updates.implementationNotes) {
        updates.implementationNotes = `Status changed to ${updates.status} on ${new Date().toLocaleDateString()}`;
        console.log(`Auto-set implementationNotes for status: ${updates.status}`);
      }
    }
    
    // Update only the specified fields
    let updatedFields = [];
    for (const [key, value] of Object.entries(updates)) {
      // Special handling for date fields
      let processedValue = value;
      if (key.includes('Date') && typeof value === 'string' && !value.includes('T')) {
        // Convert simple date string to ISO format
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          processedValue = date.toISOString();
          console.log(`Converted date ${key} from ${value} to ${processedValue}`);
        }
      } else if (key === 'lastModified') {
        // Skip manual lastModified - will be derived from file modification time
        console.log(`Skipping manual ${key} - using file modification time instead`);
        continue;
      }
      
      const existingIndex = updatedFrontmatter.findIndex(line => 
        line.trim().startsWith(key + ':')
      );
      
      if (existingIndex >= 0) {
        updatedFrontmatter[existingIndex] = `${key}: ${processedValue}`;
        console.log(`Updated existing field: ${key}`);
      } else {
        updatedFrontmatter.push(`${key}: ${processedValue}`);
        console.log(`Added new field: ${key}`);
      }
      updatedFields.push(key);
    }

    // Reconstruct the file content
    const updatedContent = [
      '---',
      ...updatedFrontmatter,
      '---',
      '',
      ...lines.slice(frontmatterEnd + 1)
    ].join('\n');

    console.log(`Updated content length: ${updatedContent.length}`);
    console.log('Updated fields:', updatedFields);

    // Write back to file
    await fs.writeFile(cr.path, updatedContent, 'utf8');
    
    // Verify the file was written by reading it back
    try {
      const writtenContent = await fs.readFile(cr.path, 'utf8');
      console.log(`VERIFY: File length after write: ${writtenContent.length}`);
      console.log('VERIFY: Content preview (first 200 chars):', writtenContent.substring(0, 200) + '...');
    } catch (verifyError) {
      console.log('ERROR: Could not verify file write:', verifyError);
    }

    console.log(`Successfully updated CR: ${cr.filename} in project ${projectId}`);
    res.json({ 
      success: true, 
      message: 'CR updated successfully',
      updatedFields,
      projectId,
      crId
    });
  } catch (error) {
    console.error('Error updating CR partially:', error);
    res.status(500).json({ error: 'Failed to update CR' });
  }
});

// Update CR in a project
app.put('/api/projects/:projectId/crs/:crId', async (req, res) => {
  try {
    const { projectId, crId } = req.params;
    const { content } = req.body;
    
    console.log(`PUT /api/projects/${projectId}/crs/${crId} - Received update request`);
    console.log('Request body content length:', content ? content.length : 0);
    
    if (!content) {
      console.log('ERROR: No content provided in request body');
      return res.status(400).json({ error: 'Content is required' });
    }

    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      console.log(`ERROR: Project not found: ${projectId}`);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    console.log(`Found project: ${project.project.name} at ${project.project.path}`);

    const crs = projectDiscovery.getProjectCRs(project.project.path);
    console.log(`Found ${crs.length} CRs in project`);
    
    const cr = crs.find(c => c.code === crId || c.filename.includes(crId));
    
    if (!cr) {
      console.log(`ERROR: CR not found: ${crId}`);
      console.log(`Available CRs:`, crs.map(c => `${c.code} (${c.filename})`));
      return res.status(404).json({ error: 'CR not found' });
    }
    
    console.log(`Found CR: ${cr.code} in file ${cr.path}`);
    console.log('Content preview (first 200 chars):', content.substring(0, 200) + '...');

    // Update CR file
    await fs.writeFile(cr.path, content, 'utf8');
    console.log(`SUCCESS: File written to ${cr.path}`);
    
    // Verify the file was written by reading it back
    try {
      const writtenContent = await fs.readFile(cr.path, 'utf8');
      console.log(`VERIFY: File length after write: ${writtenContent.length}`);
      console.log('VERIFY: Content preview (first 200 chars):', writtenContent.substring(0, 200) + '...');
    } catch (verifyError) {
      console.log('ERROR: Could not verify file write:', verifyError);
    }

    console.log(`Updated CR: ${cr.filename} in project ${projectId}`);
    res.json({ 
      success: true, 
      message: 'CR updated successfully',
      filename: cr.filename,
      path: cr.path
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

// Documents API endpoints
app.get('/api/documents', async (req, res) => {
  try {
    const { projectPath } = req.query;
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const documents = await discoverDocuments(projectPath);
    res.json(documents);
  } catch (error) {
    console.error('Error discovering documents:', error);
    res.status(500).json({ error: 'Failed to discover documents' });
  }
});

app.get('/api/documents/content', async (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Security check - ensure file is within allowed paths and is markdown
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.endsWith('.md')) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    const content = await fs.readFile(resolvedPath, 'utf8');
    res.send(content);
  } catch (error) {
    console.error('Error reading document:', error);
    res.status(500).json({ error: 'Failed to read document' });
  }
});

async function discoverDocuments(projectPath, currentDepth = 0, maxDepth = 3) {
  try {
    console.log(`🔍 Discovering documents in: ${projectPath}`);
    
    // Read document paths from .mdt-config.toml
    const configPath = path.join(projectPath, '.mdt-config.toml');
    let documentPaths = [];
    let excludeFolders = ['docs/CRs', 'node_modules', '.git'];
    
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      console.log(`📄 Config content: ${configContent.substring(0, 200)}...`);
      
      // Parse document_paths (now under [project] section)
      const pathsMatch = configContent.match(/document_paths\s*=\s*\[(.*?)\]/s);
      if (pathsMatch) {
        documentPaths = pathsMatch[1]
          .split(/[,\n]/)
          .map(s => s.trim().replace(/['"]/g, '').replace(/#.*$/, '').trim())
          .filter(s => s.length > 0);
        console.log(`📁 Found document paths: ${JSON.stringify(documentPaths)}`);
      }
      
      // Parse exclude_folders (still used for folder exclusions)
      const excludeMatch = configContent.match(/exclude_folders\s*=\s*\[(.*?)\]/s);
      if (excludeMatch) {
        excludeFolders = excludeMatch[1]
          .split(/[,\n]/)
          .map(s => s.trim().replace(/['"]/g, '').replace(/#.*$/, '').trim())
          .filter(s => s.length > 0);
        console.log(`🚫 Exclude folders: ${JSON.stringify(excludeFolders)}`);
      }
    } catch (configError) {
      // Config file doesn't exist or no document_paths defined
      console.log(`❌ No .mdt-config.toml or document_paths found in ${projectPath}`);
      return [];
    }

    if (documentPaths.length === 0) {
      console.log(`❌ No document paths configured`);
      return [];
    }

    const documents = [];

    for (const docPath of documentPaths) {
      const fullPath = path.resolve(projectPath, docPath);
      console.log(`🔍 Checking path: ${docPath} -> ${fullPath}`);
      
      try {
        const stats = await fs.stat(fullPath);
        
        if (stats.isFile() && docPath.endsWith('.md')) {
          console.log(`📄 Adding file: ${docPath}`);
          // Single file - extract H1 title
          const h1Title = await extractH1Title(fullPath);
          documents.push({
            name: path.basename(docPath),
            title: h1Title,
            path: fullPath,
            type: 'file'
          });
        } else if (stats.isDirectory()) {
          console.log(`📁 Scanning directory: ${docPath}`);
          // Directory - scan for .md files and preserve folder structure
          const dirDocs = await scanDirectory(fullPath, docPath, excludeFolders, 0, maxDepth);
          if (dirDocs.length > 0) {
            // Create folder node with children
            documents.push({
              name: path.basename(docPath),
              path: fullPath,
              type: 'folder',
              children: dirDocs
            });
          }
          console.log(`📁 Found ${dirDocs.length} documents in ${docPath}`);
        }
      } catch (error) {
        console.warn(`⚠️  Document path not found: ${fullPath}`);
      }
    }

    console.log(`✅ Total documents found: ${documents.length}`);
    return documents.sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error discovering documents in ${projectPath}:`, error);
    return [];
  }
}

async function extractH1Title(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    // Look for first H1 (# Title)
    const h1Match = content.match(/^#\s+(.+)$/m);
    return h1Match ? h1Match[1].trim() : null;
  } catch (error) {
    return null;
  }
}

async function scanDirectory(dirPath, relativePath, excludeFolders, currentDepth, maxDepth) {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const documents = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const entryRelativePath = path.join(relativePath, entry.name);

    // Skip excluded folders
    if (excludeFolders.some(exclude => entryRelativePath.startsWith(exclude))) {
      continue;
    }

    if (entry.isDirectory()) {
      const children = await scanDirectory(fullPath, entryRelativePath, excludeFolders, currentDepth + 1, maxDepth);
      if (children.length > 0) {
        documents.push({
          name: entry.name,
          path: fullPath,
          type: 'folder',
          children
        });
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Extract H1 title for files
      const h1Title = await extractH1Title(fullPath);
      documents.push({
        name: entry.name,
        title: h1Title,
        path: fullPath,
        type: 'file'
      });
    }
  }

  return documents;
}

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
  console.log(`   GET  /api/documents - Discover project documents`);
  console.log(`   GET  /api/documents/content - Get document content`);
  console.log(`🌐 Multi-Project API endpoints:`);
  console.log(`   GET  /api/projects - List all registered projects`);
  console.log(`   GET  /api/projects/:id/config - Get project configuration`);
  console.log(`   GET  /api/projects/:id/crs - List CRs for project`);
  console.log(`   GET  /api/projects/:id/crs/:crId - Get specific CR`);
  console.log(`   POST /api/projects/:id/crs - Create new CR`);
  console.log(`   PATCH  /api/projects/:id/crs/:crId - Partial update CR (NEW!)`);
  console.log(`   PUT  /api/projects/:id/crs/:crId - Update CR`);
  console.log(`   DELETE /api/projects/:id/crs/:crId - Delete CR`);
  console.log(`   POST /api/projects/register - Register new project`);
  
  // Initialize the server
  initializeServer()
    .then(async () => {
      // Initialize multi-project file watchers
      await initializeMultiProjectWatchers();
      fileWatcher.startHeartbeat();
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