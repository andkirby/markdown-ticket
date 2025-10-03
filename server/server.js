import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import FileWatcherService from './fileWatcherService.js';
import ProjectDiscoveryService from './projectDiscovery.js';
import counterRoutes from './routes/counter.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Counter API routes
app.use('/api/counter', counterRoutes);

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

        // For auto-discovered projects, use the directory containing the config file
        let configPath;
        if (project.autoDiscovered && project.configPath) {
          configPath = path.dirname(project.configPath);
        } else {
          configPath = project.project.path;
        }
        
        const config = projectDiscovery.getProjectConfig(configPath);
        
        if (!config || !config.project) {
          console.log(`No config found for project: ${project.project.name}`);
          continue;
        }

        // Construct the full path to the CRs directory
        const crPath = config.project.path || 'docs/CRs';
        const fullCRPath = path.resolve(configPath, crPath);
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

// New endpoint for file system browsing
app.get('/api/filesystem', async (req, res) => {
  try {
    const { path: requestPath } = req.query;
    
    console.log(`🗂️ Filesystem API called for: ${requestPath}`);
    
    if (!requestPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const fullPath = path.resolve(requestPath);
    console.log(`🗂️ Resolved path: ${fullPath}`);
    
    try {
      await fs.access(fullPath);
    } catch {
      console.log(`🗂️ Path not found: ${fullPath}`);
      return res.status(404).json({ error: 'Path not found' });
    }

    const items = await buildFileSystemTree(fullPath);
    console.log(`🗂️ Found ${items.length} items`);
    res.json(items);
  } catch (error) {
    console.error('Error loading file system:', error);
    res.status(500).json({ error: 'Failed to load file system' });
  }
});

// New endpoint for configuring document paths
app.post('/api/documents/configure', async (req, res) => {
  try {
    const { projectPath, documentPaths } = req.body;
    
    console.log(`📝 Configure documents for: ${projectPath}`);
    console.log(`📝 Document paths: ${JSON.stringify(documentPaths)}`);
    
    if (!projectPath || !Array.isArray(documentPaths)) {
      return res.status(400).json({ error: 'Project path and document paths are required' });
    }

    const configPath = path.join(projectPath, '.mdt-config.toml');
    
    // Create or update config file
    let configContent = '';
    
    try {
      configContent = await fs.readFile(configPath, 'utf8');
    } catch {
      // Config doesn't exist, start with empty content
    }

    // Remove existing document configuration section entirely
    configContent = configContent.replace(/\n*# Documentation Configuration[\s\S]*?(?=\n\n|\n$|$)/g, '');
    configContent = configContent.replace(/\n*document_paths\s*=\s*\[[\s\S]*?\]/g, '');
    configContent = configContent.replace(/\n*max_depth\s*=.*$/gm, '');
    
    // Clean up extra newlines
    configContent = configContent.replace(/\n{3,}/g, '\n\n').trim();
    
    // Add new document_paths (convert absolute paths to relative, keep relative paths as-is)
    const relativePaths = documentPaths.map(p => {
      // If path is already relative, keep it as-is
      if (!path.isAbsolute(p)) {
        return p;
      }
      // Convert absolute path to relative
      return path.relative(projectPath, p);
    });
    const pathsString = relativePaths.map(p => `    "${p}"`).join(',\n');
    
    // Add to config content
    if (!configContent.includes('[project]')) {
      configContent = '[project]\n' + configContent;
    }
    
    // Add document configuration section
    configContent += `\n\n# Documentation Configuration\ndocument_paths = [\n${pathsString}\n]\nmax_depth = 3             # Maximum directory depth for scanning`;
    
    await fs.writeFile(configPath, configContent + '\n', 'utf8');
    
    console.log(`✅ Document paths configured successfully`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error configuring documents:', error);
    res.status(500).json({ error: 'Failed to configure documents' });
  }
});

// Helper function to get next ticket number
async function getNextTicketNumber(projectPath, projectCode) {
  try {
    // Load all existing tickets to find the highest number
    const tickets = await loadTickets(projectPath);
    let maxNumber = 0;
    
    // Find the highest existing ticket number for this project code
    tickets.forEach(ticket => {
      if (ticket.code.startsWith(projectCode + '-')) {
        const numberPart = ticket.code.split('-')[1];
        const number = parseInt(numberPart);
        if (!isNaN(number) && number > maxNumber) {
          maxNumber = number;
        }
      }
    });
    
    // Also check the counter file  
    const counterFile = path.join(projectPath, '.mdt-next');
    let counterNumber = 0;
    try {
      const content = await fs.readFile(counterFile, 'utf8');
      counterNumber = parseInt(content.trim()) || 0;
    } catch {
      // Counter file doesn't exist
    }
    
    const nextNumber = Math.max(maxNumber + 1, counterNumber);
    return nextNumber;
  } catch (error) {
    console.error('Error getting next ticket number:', error);
    return 1;
  }
}

// Helper function to update ticket counter
async function updateTicketCounter(projectPath, nextNumber) {
  try {
    const counterFile = path.join(projectPath, '.mdt-next');
    await fs.writeFile(counterFile, nextNumber.toString(), 'utf8');
  } catch (error) {
    console.error('Error updating ticket counter:', error);
  }
}

// Helper function to load tickets from a project directory
async function loadTickets(projectPath) {
  const tickets = [];
  
  try {
    const files = await fs.readdir(projectPath);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    for (const filename of mdFiles) {
      const filePath = path.join(projectPath, filename);
      const content = await fs.readFile(filePath, 'utf8');
      
      let code = null;
      let title = '';
      
      // Try YAML frontmatter first
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const lines = frontmatterMatch[1].split('\n');
        
        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            if (match[1] === 'code') {
              code = match[2].trim();
            } else if (match[1] === 'title') {
              title = match[2].trim();
            }
          }
        }
      } else {
        // Try markdown format (- **Code**: DEB-016)
        const codeMatch = content.match(/^-\s*\*\*Code\*\*:\s*(.+)$/m);
        if (codeMatch) {
          code = codeMatch[1].trim();
        }
        
        const titleMatch = content.match(/^-\s*\*\*Title\/Summary\*\*:\s*(.+)$/m);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
      }
      
      if (code) {
        tickets.push({
          code,
          title,
          filename: filePath
        });
      }
    }
  } catch (error) {
    console.error(`Error loading tickets from ${projectPath}:`, error);
  }
  
  return tickets;
}

// Duplicate detection and resolution endpoint
app.get('/api/duplicates/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Map project IDs to paths (simplified for now)
    const projectPaths = {
      'debug-tasks': '/Users/kirby/home/markdown-ticket/debug-tasks',
      'markdown-ticket': '/Users/kirby/home/markdown-ticket/docs/CRs'
    };
    
    const projectPath = projectPaths[projectId];
    if (!projectPath) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const tickets = await loadTickets(projectPath);
    const duplicates = {};
    
    // Group tickets by code to find duplicates
    tickets.forEach(ticket => {
      if (!duplicates[ticket.code]) {
        duplicates[ticket.code] = [];
      }
      duplicates[ticket.code].push({
        filename: path.basename(ticket.filename),
        filepath: ticket.filename,
        title: ticket.title,
        code: ticket.code
      });
    });
    
    // Filter to only duplicates (more than 1 ticket per code)
    const duplicateGroups = Object.entries(duplicates)
      .filter(([code, tickets]) => tickets.length > 1)
      .map(([code, tickets]) => ({ code, tickets }));
    
    res.json({ duplicates: duplicateGroups });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({ error: 'Failed to check duplicates' });
  }
});

// Preview rename changes
app.post('/api/duplicates/preview', async (req, res) => {
  try {
    const { projectId, filepath } = req.body;
    
    // Map project IDs to paths and codes
    const projectInfo = {
      'debug-tasks': { path: '/Users/kirby/home/markdown-ticket/debug-tasks', code: 'DEB' },
      'markdown-ticket': { path: '/Users/kirby/home/markdown-ticket/docs/CRs', code: 'MDT' }
    };
    
    const project = projectInfo[projectId];
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get next available ticket number
    const nextNumber = await getNextTicketNumber(project.path, project.code);
    const newCode = `${project.code}-${String(nextNumber).padStart(3, '0')}`;
    
    // Read current file to get old code
    const content = await fs.readFile(filepath, 'utf8');
    const codeMatch = content.match(/^code:\s*(.+)$/m) || content.match(/^-\s*\*\*Code\*\*:\s*(.+)$/m);
    const oldCode = codeMatch ? codeMatch[1].trim() : '';
    
    // Generate new filename
    const oldFilename = path.basename(filepath);
    const newFilename = oldFilename.replace(oldCode, newCode);
    
    res.json({
      newCode,
      newFilename,
      oldCode,
      oldFilename
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Resolve duplicate by renaming
app.post('/api/duplicates/resolve', async (req, res) => {
  try {
    const { projectId, oldFilepath, action } = req.body; // action: 'rename' or 'delete'
    
    // Map project IDs to paths and codes
    const projectInfo = {
      'debug-tasks': { path: '/Users/kirby/home/markdown-ticket/debug-tasks', code: 'DEB' },
      'markdown-ticket': { path: '/Users/kirby/home/markdown-ticket/docs/CRs', code: 'MDT' }
    };
    
    const project = projectInfo[projectId];
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (action === 'delete') {
      await fs.unlink(oldFilepath);
      res.json({ success: true, action: 'deleted' });
      return;
    }

    if (action === 'rename') {
      // Get next available ticket number
      const nextNumber = await getNextTicketNumber(project.path, project.code);
      const newCode = `${project.code}-${String(nextNumber).padStart(3, '0')}`;
      
      // Read current file content
      const content = await fs.readFile(oldFilepath, 'utf8');
      
      // Extract current code from content
      const codeMatch = content.match(/^code:\s*(.+)$/m);
      const oldCode = codeMatch ? codeMatch[1].trim() : '';
      
      // Replace code in content
      const newContent = content.replace(/^code:\s*.+$/m, `code: ${newCode}`);
      
      // Generate new filename
      const oldFilename = path.basename(oldFilepath);
      const newFilename = oldFilename.replace(oldCode, newCode);
      const newFilepath = path.join(path.dirname(oldFilepath), newFilename);
      
      // Write new file and delete old one
      await fs.writeFile(newFilepath, newContent, 'utf8');
      await fs.unlink(oldFilepath);
      
      // Update counter
      await updateTicketCounter(project.path, nextNumber + 1);
      
      res.json({ 
        success: true, 
        action: 'renamed',
        oldCode,
        newCode,
        oldFilename,
        newFilename
      });
    }
  } catch (error) {
    console.error('Error resolving duplicate:', error);
    res.status(500).json({ error: 'Failed to resolve duplicate' });
  }
});
// ========================================

// Get all registered projects
app.get('/api/projects', async (req, res) => {
  try {
    console.log('🔍 DEBUG: /api/projects endpoint called');
    const projects = await projectDiscovery.getAllProjects();
    console.log('🔍 DEBUG: projectDiscovery.getAllProjects() returned:', projects.length, 'projects');
    console.log('🔍 DEBUG: Project IDs:', projects.map(p => p.id));
    res.json(projects);
  } catch (error) {
    console.error('🔍 DEBUG: Error getting projects:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Get specific project configuration
app.get('/api/projects/:projectId/config', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🔍 DEBUG: Looking for project config for ID:', projectId);
    
    const projects = await projectDiscovery.getAllProjects();
    console.log('🔍 DEBUG: Available project IDs:', projects.map(p => p.id));
    
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      console.log('🔍 DEBUG: Project not found for ID:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    // For auto-discovered projects, use the directory containing the config file
    let configPath;
    if (project.autoDiscovered && project.configPath) {
      configPath = path.dirname(project.configPath);
    } else {
      configPath = project.project.path;
    }
    
    console.log('🔍 DEBUG: Using config path:', configPath);
    const config = projectDiscovery.getProjectConfig(configPath);
    if (!config) {
      console.log('🔍 DEBUG: Project config not found for path:', configPath);
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
    const cr = crs.find(c => c.code === crId || (c.filePath && c.filePath.includes(crId)));
    
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

    // Get next CR number using smart logic
    const nextNumber = await getNextTicketNumber(project.project.path, config.code);

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
    
    const cr = crs.find(c => c.code === crId || (c.filePath && c.filePath.includes(crId)));
    
    if (!cr) {
      console.log(`ERROR: CR not found: ${crId}`);
      console.log(`Available CRs:`, crs.map(c => `${c.code} (${c.filePath})`));
      return res.status(404).json({ error: 'CR not found' });
    }
    
    console.log(`Found CR: ${cr.code} in file ${cr.filePath}`);

    // Read current content
    const currentContent = await fs.readFile(cr.filePath, 'utf8');
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
    await fs.writeFile(cr.filePath, updatedContent, 'utf8');
    
    // Verify the file was written by reading it back
    try {
      const writtenContent = await fs.readFile(cr.filePath, 'utf8');
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
    
    const cr = crs.find(c => c.code === crId || (c.filePath && c.filePath.includes(crId)));
    
    if (!cr) {
      console.log(`ERROR: CR not found: ${crId}`);
      console.log(`Available CRs:`, crs.map(c => `${c.code} (${c.filePath})`));
      return res.status(404).json({ error: 'CR not found' });
    }
    
    console.log(`Found CR: ${cr.code} in file ${cr.filePath}`);
    console.log('Content preview (first 200 chars):', content.substring(0, 200) + '...');

    // Update CR file
    await fs.writeFile(cr.filePath, content, 'utf8');
    console.log(`SUCCESS: File written to ${cr.filePath}`);
    
    // Verify the file was written by reading it back
    try {
      const writtenContent = await fs.readFile(cr.filePath, 'utf8');
      console.log(`VERIFY: File length after write: ${writtenContent.length}`);
      console.log('VERIFY: Content preview (first 200 chars):', writtenContent.substring(0, 200) + '...');
    } catch (verifyError) {
      console.log('ERROR: Could not verify file write:', verifyError);
    }

    console.log(`Updated CR: ${path.basename(cr.filePath)} in project ${projectId}`);
    res.json({ 
      success: true, 
      message: 'CR updated successfully',
      filename: path.basename(cr.filePath),
      path: cr.filePath
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
    const cr = crs.find(c => c.code === crId || (c.filePath && c.filePath.includes(crId)));
    
    if (!cr) {
      return res.status(404).json({ error: 'CR not found' });
    }

    // Delete CR file
    await fs.unlink(cr.filePath);

    console.log(`Deleted CR: ${path.basename(cr.filePath)} from project ${projectId}`);
    res.json({ 
      success: true, 
      message: 'CR deleted successfully',
      filename: path.basename(cr.filePath)
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

    // Project is automatically discovered by the discovery service
    // No need to manually register since it scans for .mdt-config.toml files
    
    res.json({ success: true, message: 'Project registered successfully', project: projectInfo });
  } catch (error) {
    console.error('Error registering project:', error);
    res.status(500).json({ error: 'Failed to register project' });
  }
});

// Create new project with UI form data
app.post('/api/projects/create', async (req, res) => {
  try {
    const { name, code, path: projectPath, crsPath = 'docs/CRs', description, repositoryUrl } = req.body;
    
    if (!name || !projectPath) {
      return res.status(400).json({ error: 'Name and path are required' });
    }

    // Verify project path exists
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Project path must be a directory' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Project path does not exist' });
    }

    // Generate project code if not provided
    const projectCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    
    // Create project config directory
    const configDir = path.join(process.env.HOME || os.homedir(), '.config', 'markdown-ticket', 'projects');
    await fs.mkdir(configDir, { recursive: true });
    
    // Create project config file using directory name, fallback to project code
    const projectDirName = path.basename(projectPath);
    const configFileName = `${projectDirName}.toml`;
    const configFilePath = path.join(configDir, configFileName);
    
    // Check if project already exists
    try {
      await fs.access(configFilePath);
      return res.status(400).json({ error: 'Project with this directory name already exists' });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error; // Re-throw non-file-not-found errors
      }
      // File doesn't exist, check fallback with project code
      try {
        const fallbackConfigFileName = `${projectCode.toLowerCase()}.toml`;
        const fallbackConfigFilePath = path.join(configDir, fallbackConfigFileName);
        await fs.access(fallbackConfigFilePath);
        return res.status(400).json({ error: 'Project with this code already exists' });
      } catch (fallbackError) {
        if (fallbackError.code !== 'ENOENT') {
          throw fallbackError; // Re-throw non-file-not-found errors
        }
        // Neither file exists, proceed with creation
      }
    }

    // Create CRs directory if it doesn't exist
    const crsDir = path.join(projectPath, crsPath);
    await fs.mkdir(crsDir, { recursive: true });

    // Create minimal global config content
    const globalConfigContent = `[project]
path = "${projectPath}"
active = true

[metadata]
dateRegistered = "${new Date().toISOString().split('T')[0]}"
lastAccessed = "${new Date().toISOString().split('T')[0]}"
`;

    // Write global config file
    await fs.writeFile(configFilePath, globalConfigContent, 'utf8');

    // Create local project config content
    const localConfigContent = `[project]
name = "${name}"
code = "${projectCode}"
path = "${crsPath}"
startNumber = 1
counterFile = ".mdt-next"
description = "${description || ''}"
${repositoryUrl ? `repository = "${repositoryUrl}"` : 'repository = ""'}
`;

    // Write local config file
    const localConfigPath = path.join(projectPath, '.mdt-config.toml');
    await fs.writeFile(localConfigPath, localConfigContent, 'utf8');

    // Create counter file
    const counterFile = path.join(projectPath, '.mdt-next');
    await fs.writeFile(counterFile, '1', 'utf8');

    // Project is automatically discovered by the discovery service
    // No need to manually register since it scans for .mdt-config.toml files

    // Broadcast project creation event to all SSE clients
    const projectCreatedEvent = {
      type: 'project-created',
      data: {
        projectId: projectCode,
        projectPath: projectPath,
        timestamp: Date.now()
      }
    };
    
    // Use fileWatcher to broadcast the event
    fileWatcher.clients.forEach(client => {
      try {
        fileWatcher.sendSSEEvent(client, projectCreatedEvent);
      } catch (error) {
        console.error('Failed to broadcast project creation event:', error);
      }
    });

    res.json({ 
      success: true, 
      message: 'Project created successfully', 
      project: {
        id: projectCode,
        path: projectPath,
        configFile: '.mdt-config.toml',
        active: true
      },
      configPath: configFilePath
    });
  } catch (error) {
    console.error('Error creating project:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      path: error.path
    });
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

// Update existing project
app.put('/api/projects/:code/update', async (req, res) => {
  try {
    const { code } = req.params;
    const { name, crsPath, description, repositoryUrl } = req.body;
    
    console.log(`Updating project ${code} with data:`, { name, crsPath, description, repositoryUrl });
    
    // Find project by code - need to map code back to project ID
    const projects = await projectDiscovery.getAllProjects();
    console.log(`Available projects:`, projects.map(p => ({ id: p.id, name: p.project.name })));
    
    // Map known project codes to IDs (reverse of getProjectCode logic)
    const codeToIdMap = {
      'DEB': 'debug',
      'MDT': 'markdown-ticket', 
      'CR': 'LlmTranslator',
      'GT': 'goto_dir',
      'SB': 'sentence-breakdown'
    };
    
    const projectId = codeToIdMap[code] || code.toLowerCase();
    console.log(`Looking for project with code ${code}, mapped to ID: ${projectId}`);
    
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      console.log(`Project ${code} not found in discovered projects:`, projects.map(p => p.id));
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`Found project:`, project);

    // Read current local config
    const localConfigPath = path.join(project.project.path, '.mdt-config.toml');
    console.log(`Reading config from: ${localConfigPath}`);
    
    let configContent = await fs.readFile(localConfigPath, 'utf8');
    console.log(`Current config content:`, configContent);
    
    // Update editable fields
    if (name) {
      configContent = configContent.replace(/^name = ".*"$/m, `name = "${name}"`);
    }
    if (crsPath) {
      configContent = configContent.replace(/^path = ".*"$/m, `path = "${crsPath}"`);
    }
    if (description !== undefined) {
      configContent = configContent.replace(/^description = ".*"$/m, `description = "${description}"`);
    }
    if (repositoryUrl !== undefined) {
      configContent = configContent.replace(/^repository = ".*"$/m, `repository = "${repositoryUrl}"`);
    }
    
    console.log(`Updated config content:`, configContent);
    
    // Write updated config
    await fs.writeFile(localConfigPath, configContent, 'utf8');
    console.log(`Config written successfully`);
    
    res.json({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Get system directories for project path selection
app.get('/api/system/directories', async (req, res) => {
  try {
    const { path: requestPath } = req.query;
    const basePath = requestPath || process.env.HOME || os.homedir();
    
    // Security check - only allow paths under home directory
    const homedir = process.env.HOME || os.homedir();
    const resolvedPath = path.resolve(basePath);
    if (!resolvedPath.startsWith(homedir)) {
      return res.status(403).json({ error: 'Access denied to path outside home directory' });
    }

    try {
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory())
        .filter(entry => !entry.name.startsWith('.') || entry.name === '.config')
        .map(entry => ({
          name: entry.name,
          path: path.join(resolvedPath, entry.name),
          isDirectory: true
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        currentPath: resolvedPath,
        parentPath: path.dirname(resolvedPath),
        directories
      });
    } catch (error) {
      res.status(404).json({ error: 'Directory not found or not accessible' });
    }
  } catch (error) {
    console.error('Error listing directories:', error);
    res.status(500).json({ error: 'Failed to list directories' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Helper function to build file system tree for path selection using glob
async function buildFileSystemTree(dirPath, maxDepth = 3) {
  try {
    // Read project config to get tickets path for ignoring
    const configPath = path.join(dirPath, '.mdt-config.toml');
    let ticketsPath = null;
    
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      const pathMatch = configContent.match(/path\s*=\s*["']?([^"'\n\r]+)["']?/);
      if (pathMatch) {
        ticketsPath = pathMatch[1].trim();
      }
    } catch {
      // Config doesn't exist or can't be read, continue without tickets path
    }

    // Build ignore patterns
    const ignorePatterns = [
      '**/.*/**',           // Hidden folders (.git, .vscode, etc.)
      '**/node_modules/**', // Node.js dependencies
      '**/dist/**',         // Build output
      '**/build/**',        // Build output
      '**/target/**',       // Rust/Java build output
      '**/bin/**',          // Binary output
      '**/obj/**',          // C#/C++ object files
      '**/out/**',          // General output folder
      '**/tmp/**',          // Temporary files
      '**/temp/**',         // Temporary files
      '**/cache/**',        // Cache folders
      '**/test*/**',        // Test folders (tests, test-data, etc.)
      '**/spec*/**',        // Spec folders
      '**/coverage/**',     // Test coverage
      '**/vendor/**',       // Third-party dependencies
      '**/packages/**',     // Package managers
      '**/DerivedData/**',  // Xcode build data
      '**/__pycache__/**',  // Python cache
      '**/venv/**',         // Python virtual env
      '**/.env/**'          // Environment folders
    ];

    // Add tickets path to ignore list if found
    if (ticketsPath && ticketsPath !== '.') {
      ignorePatterns.push(`**/${ticketsPath}/**`);
      console.log(`🚫 Ignoring tickets path: ${ticketsPath}`);
    } else if (ticketsPath === '.') {
      // When tickets are in root directory, ignore ticket files by pattern
      ignorePatterns.push('**/*-[0-9][0-9][0-9]-*.md');
      console.log(`🚫 Ignoring ticket files in root directory`);
    }

    // Find all .md files up to maxDepth levels
    const pattern = path.join(dirPath, '**/*.md');
    let mdFiles = await glob(pattern, { 
      maxDepth,
      ignore: ignorePatterns
    });

    // Additional filtering to remove files in tickets path (in case glob didn't catch it)
    if (ticketsPath && ticketsPath !== '.') {
      const ticketsFullPath = path.join(dirPath, ticketsPath);
      mdFiles = mdFiles.filter(filePath => !filePath.startsWith(ticketsFullPath));
      console.log(`🚫 Filtered out ${ticketsPath} files, remaining: ${mdFiles.length}`);
    } else if (ticketsPath === '.') {
      // Filter out ticket files by pattern when in root directory
      mdFiles = mdFiles.filter(filePath => {
        const fileName = path.basename(filePath);
        return !fileName.match(/^[A-Z]+-\d{3}-.*\.md$/);
      });
      console.log(`🚫 Filtered out ticket files from root, remaining: ${mdFiles.length}`);
    }
    
    // Build tree structure from file paths
    const tree = {};
    
    for (const filePath of mdFiles) {
      const relativePath = path.relative(dirPath, filePath);
      const parts = relativePath.split(path.sep);
      
      let current = tree;
      
      // Build nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = { type: 'folder', children: {}, path: path.join(dirPath, ...parts.slice(0, i + 1)) };
        }
        current = current[part].children;
      }
      
      // Add the file
      const fileName = parts[parts.length - 1];
      current[fileName] = {
        type: 'file',
        path: filePath
      };
    }
    
    // Convert tree object to array format
    function treeToArray(obj, basePath = '') {
      const items = [];
      
      for (const [name, item] of Object.entries(obj)) {
        if (item.type === 'folder') {
          const children = treeToArray(item.children);
          if (children.length > 0) { // Only include folders with .md files
            items.push({
              name,
              path: item.path,
              type: 'folder',
              children
            });
          }
        } else {
          items.push({
            name,
            path: item.path,
            type: 'file'
          });
        }
      }
      
      return items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    }
    
    return treeToArray(tree);
  } catch (error) {
    console.error(`Error building file system tree for ${dirPath}:`, error);
    return [];
  }
}

// Documents API endpoints
app.get('/api/documents', async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    console.log(`🔍 Documents API called for project: ${projectId}`);

    // Get project from projectDiscovery service
    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectPath = project.project.path;
    console.log(`📂 Resolved project path: ${projectPath}`);

    // Check if config exists and has document_paths
    const configPath = path.join(projectPath, '.mdt-config.toml');
    try {
      await fs.access(configPath);
      const configContent = await fs.readFile(configPath, 'utf8');
      const pathsMatch = configContent.match(/document_paths\s*=\s*\[(.*?)\]/s);
      
      if (!pathsMatch || pathsMatch[1].trim().length === 0) {
        console.log(`🚫 No document_paths found, returning 404`);
        return res.status(404).json({ error: 'No document configuration found' });
      }
    } catch {
      console.log(`🚫 No config file found, returning 404`);
      return res.status(404).json({ error: 'No document configuration found' });
    }
    
    const documents = await discoverDocuments(projectPath);
    console.log(`✅ Documents found: ${documents.length}`);
    res.json(documents);
  } catch (error) {
    console.error('Error discovering documents:', error.message);
    res.status(500).json({ error: 'Failed to discover documents' });
  }
});

app.get('/api/documents/content', async (req, res) => {
  try {
    const { projectId, filePath } = req.query;
    if (!projectId || !filePath) {
      return res.status(400).json({ error: 'Project ID and file path are required' });
    }

    // Security: Block path traversal attempts in filePath
    if (filePath.includes('..')) {
      console.warn('⚠️ Path traversal attempt blocked:', filePath);
      return res.status(403).json({ error: 'Invalid file path' });
    }

    // Security: Only allow markdown files
    if (!filePath.endsWith('.md')) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    console.log(`📄 Loading document for project ${projectId}: ${filePath}`);

    // Get project from projectDiscovery service
    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Resolve file path relative to project root
    const projectPath = project.project.path;
    const resolvedPath = path.join(projectPath, filePath);

    // Security: Ensure resolved path is within project directory
    if (!resolvedPath.startsWith(projectPath)) {
      console.warn('⚠️ Path outside project directory blocked:', resolvedPath);
      return res.status(403).json({ error: 'Access denied' });
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
    
    // Check if config exists
    try {
      await fs.access(configPath);
    } catch {
      throw new Error('CONFIG_NOT_FOUND');
    }
    
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
      
      // If no document paths configured, throw error
      if (documentPaths.length === 0) {
        throw new Error('NO_DOCUMENT_PATHS');
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
      // Only catch file reading errors, not our intentional errors
      if (configError.message === 'NO_DOCUMENT_PATHS') {
        throw configError; // Re-throw our intentional error
      }
      // Config file doesn't exist or can't be read
      console.log(`❌ No .mdt-config.toml found in ${projectPath}`);
      throw new Error('CONFIG_NOT_FOUND');
    }

    // documentPaths should have content at this point due to earlier error check
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
          const fileStats = await fs.stat(fullPath);
          documents.push({
            name: path.basename(docPath),
            title: h1Title,
            path: docPath, // Relative path
            type: 'file',
            dateCreated: fileStats.birthtime || fileStats.ctime,
            lastModified: fileStats.mtime
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
          path: entryRelativePath, // Relative path
          type: 'folder',
          children
        });
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Extract H1 title for files
      const h1Title = await extractH1Title(fullPath);
      const fileStats = await fs.stat(fullPath);
      documents.push({
        name: entry.name,
        title: h1Title,
        path: entryRelativePath, // Relative path
        type: 'file',
        dateCreated: fileStats.birthtime || fileStats.ctime,
        lastModified: fileStats.mtime
      });
    }
  }

  return documents;
}

// =============================================================================
// DEV TOOLS: Log Buffer and MCP API Endpoints
// =============================================================================

// In-memory log buffer for development
const logBuffer = [];
const MAX_LOG_ENTRIES = 100;

// Intercept console.log to capture logs
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addToLogBuffer(level, ...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  logBuffer.push({
    timestamp: Date.now(),
    level,
    message
  });
  
  // Keep only last MAX_LOG_ENTRIES
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }
}

console.log = (...args) => {
  addToLogBuffer('info', ...args);
  originalLog(...args);
};

console.error = (...args) => {
  addToLogBuffer('error', ...args);
  originalError(...args);
};

console.warn = (...args) => {
  addToLogBuffer('warn', ...args);
  originalWarn(...args);
};

// API endpoint for getting logs (polling)
app.get('/api/logs', (req, res) => {
  const lines = Math.min(parseInt(req.query.lines) || 20, MAX_LOG_ENTRIES);
  const filter = req.query.filter;
  
  let logs = logBuffer.slice(-lines);
  
  if (filter) {
    logs = logs.filter(log => 
      log.message.toLowerCase().includes(filter.toLowerCase())
    );
  }
  
  res.json(logs);
});

// SSE endpoint for log streaming (extra feature)
app.get('/api/logs/stream', (req, res) => {
  const filter = req.query.filter;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Log stream connected',
    filter: filter || null
  })}\n\n`);
  
  // Store original console functions for this connection
  const streamLog = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    // Apply filter if specified
    if (filter && !message.toLowerCase().includes(filter.toLowerCase())) {
      return;
    }
    
    const logEntry = {
      timestamp: Date.now(),
      level: 'info',
      message
    };
    
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  };
  
  // Override console for this connection (simplified for demo)
  // In production, you'd want a proper event emitter system
  
  // Handle client disconnect
  req.on('close', () => {
    console.log('SSE client disconnected');
  });
  
  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now()
    })}\n\n`);
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Global configuration endpoint
app.get('/api/config/global', async (req, res) => {
  try {
    const configDir = path.join(process.env.HOME || os.homedir(), '.config', 'markdown-ticket');
    const configPath = path.join(configDir, 'config.toml');

    console.log(`Reading global config from: ${configPath}`);

    try {
      const configContent = await fs.readFile(configPath, 'utf8');

      // Basic TOML parsing for all sections
      const config = {};

      // Parse dashboard section
      const dashboardMatch = configContent.match(/\[dashboard\]([\s\S]*?)(?=\[|$)/);
      if (dashboardMatch) {
        const section = dashboardMatch[1];
        config.dashboard = {
          port: parseInt(section.match(/port\s*=\s*(\d+)/)?.[1] || '3002'),
          autoRefresh: section.match(/autoRefresh\s*=\s*(true|false)/)?.[1] === 'true',
          refreshInterval: parseInt(section.match(/refreshInterval\s*=\s*(\d+)/)?.[1] || '5000')
        };
      }

      // Parse discovery section
      const discoveryMatch = configContent.match(/\[discovery\]([\s\S]*?)(?=\[|$)/);
      if (discoveryMatch) {
        const section = discoveryMatch[1];
        config.discovery = {
          autoDiscover: section.match(/autoDiscover\s*=\s*(true|false)/)?.[1] === 'true',
          searchPaths: []
        };

        // Parse search paths array
        const pathsMatch = section.match(/searchPaths\s*=\s*\[([\s\S]*?)\]/);
        if (pathsMatch) {
          const pathsStr = pathsMatch[1];
          const paths = pathsStr.match(/"([^"]+)"/g);
          if (paths) {
            config.discovery.searchPaths = paths.map(p => p.replace(/"/g, ''));
          }
        }
      }

      // Parse counter_api section
      const counterApiMatch = configContent.match(/\[counter_api\]([\s\S]*?)(?=\[|$)/);
      if (counterApiMatch) {
        const section = counterApiMatch[1];
        config.counter_api = {
          enabled: section.match(/enabled\s*=\s*(true|false)/)?.[1] === 'true',
          endpoint: section.match(/endpoint\s*=\s*"([^"]+)"/)?.[1] || '',
          api_key: section.match(/api_key\s*=\s*"([^"]+)"/)?.[1] || ''
        };
      }

      res.json(config);
    } catch (error) {
      // Config file doesn't exist, return default config
      res.json({
        dashboard: {
          port: 3002,
          autoRefresh: true,
          refreshInterval: 5000
        },
        discovery: {
          autoDiscover: true,
          searchPaths: []
        },
        counter_api: {
          enabled: false,
          endpoint: '',
          api_key: ''
        }
      });
    }
  } catch (error) {
    console.error('Error reading global config:', error);
    res.status(500).json({ error: 'Failed to read global config' });
  }
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
  console.log(`   POST /api/projects/create - Create new project with UI`);
  console.log(`   PUT  /api/projects/:code/update - Update existing project`);
  console.log(`   GET  /api/system/directories - List directories for project selection`);
  
  // Initialize the server
  initializeServer()
    .then(async () => {
      // Initialize multi-project file watchers
      await initializeMultiProjectWatchers();
      fileWatcher.startHeartbeat();
    })
    .catch(console.error);
});

// Frontend logging session management
let frontendSessionActive = false;
let frontendSessionStart = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const frontendLogs = [];
const MAX_FRONTEND_LOGS = 1000;

// DEV mode logging state management
let devModeActive = false;
let devModeStart = null;
const DEV_MODE_TIMEOUT = 60 * 60 * 1000; // 1 hour
const devModeLogs = [];
const MAX_DEV_MODE_LOGS = 1000;
const DEV_MODE_RATE_LIMIT = 300; // 300 logs per minute
let devModeLogCount = 0;
let devModeRateLimitStart = Date.now();

// Frontend session status
app.get('/api/frontend/logs/status', (req, res) => {
  res.json({ 
    active: frontendSessionActive,
    sessionStart: frontendSessionStart,
    timeRemaining: frontendSessionActive ? (SESSION_TIMEOUT - (Date.now() - frontendSessionStart)) : null
  });
});

// Start frontend logging session
app.post('/api/frontend/logs/start', (req, res) => {
  frontendSessionActive = true;
  frontendSessionStart = Date.now();
  console.log('🔍 Frontend logging session started');
  res.json({ status: 'started', sessionStart: frontendSessionStart });
});

// Stop frontend logging session
app.post('/api/frontend/logs/stop', (req, res) => {
  frontendSessionActive = false;
  frontendSessionStart = null;
  console.log('🔍 Frontend logging session stopped');
  res.json({ status: 'stopped' });
});

// Receive frontend logs
app.post('/api/frontend/logs', (req, res) => {
  const { logs } = req.body;
  if (logs && Array.isArray(logs)) {
    frontendLogs.push(...logs);
    // Trim buffer if too large
    if (frontendLogs.length > MAX_FRONTEND_LOGS) {
      frontendLogs.splice(0, frontendLogs.length - MAX_FRONTEND_LOGS);
    }
    console.log(`📝 Received ${logs.length} frontend log entries`);
  }
  res.json({ received: logs?.length || 0 });
});

// Get frontend logs
app.get('/api/frontend/logs', (req, res) => {
  const lines = Math.min(parseInt(req.query.lines) || 20, MAX_FRONTEND_LOGS);
  const filter = req.query.filter;

  let filteredLogs = frontendLogs;
  if (filter) {
    filteredLogs = frontendLogs.filter(log =>
      log.message.toLowerCase().includes(filter.toLowerCase())
    );
  }

  const recentLogs = filteredLogs.slice(-lines);
  res.json({ logs: recentLogs, total: filteredLogs.length });
});

// =============================================================================
// DEV MODE LOGGING ENDPOINTS
// =============================================================================

// Rate limiting middleware for DEV endpoints
function devModeRateLimit(req, res, next) {
  const now = Date.now();

  // Reset counter every minute
  if (now - devModeRateLimitStart > 60000) {
    devModeLogCount = 0;
    devModeRateLimitStart = now;
  }

  // Check rate limit
  if (devModeLogCount >= DEV_MODE_RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'DEV mode logging rate limit of 300 logs per minute exceeded'
    });
  }

  next();
}

// DEV mode logging status
app.get('/api/frontend/dev-logs/status', (req, res) => {
  const now = Date.now();

  // Auto-disable after timeout
  if (devModeActive && devModeStart && (now - devModeStart) > DEV_MODE_TIMEOUT) {
    devModeActive = false;
    devModeStart = null;
    console.log('🔍 DEV mode logging auto-disabled after 1 hour timeout');
  }

  res.json({
    active: devModeActive,
    sessionStart: devModeStart,
    timeRemaining: devModeActive && devModeStart ? (DEV_MODE_TIMEOUT - (now - devModeStart)) : null,
    rateLimit: {
      limit: DEV_MODE_RATE_LIMIT,
      current: devModeLogCount,
      resetTime: devModeRateLimitStart + 60000
    }
  });
});

// Receive DEV mode frontend logs
app.post('/api/frontend/dev-logs', devModeRateLimit, (req, res) => {
  const { logs } = req.body;

  if (!devModeActive) {
    return res.status(403).json({
      error: 'DEV mode not active',
      message: 'DEV mode logging is not currently active'
    });
  }

  if (logs && Array.isArray(logs)) {
    devModeLogs.push(...logs);
    devModeLogCount += logs.length;

    // Trim buffer if too large
    if (devModeLogs.length > MAX_DEV_MODE_LOGS) {
      devModeLogs.splice(0, devModeLogs.length - MAX_DEV_MODE_LOGS);
    }

    console.log(`🛠️ DEV: Received ${logs.length} frontend log entries`);
  }

  res.json({
    received: logs?.length || 0,
    rateLimit: {
      remaining: DEV_MODE_RATE_LIMIT - devModeLogCount,
      resetTime: devModeRateLimitStart + 60000
    }
  });
});

// Get DEV mode frontend logs
app.get('/api/frontend/dev-logs', (req, res) => {
  if (!devModeActive) {
    return res.status(403).json({
      error: 'DEV mode not active',
      message: 'DEV mode logging is not currently active'
    });
  }

  const lines = Math.min(parseInt(req.query.lines) || 20, MAX_DEV_MODE_LOGS);
  const filter = req.query.filter;

  let filteredLogs = devModeLogs;
  if (filter) {
    filteredLogs = devModeLogs.filter(log =>
      log.message.toLowerCase().includes(filter.toLowerCase())
    );
  }

  const recentLogs = filteredLogs.slice(-lines);
  res.json({
    logs: recentLogs,
    total: filteredLogs.length,
    devMode: true,
    timeRemaining: devModeStart ? (DEV_MODE_TIMEOUT - (Date.now() - devModeStart)) : null
  });
});

// Clear config cache
app.post('/api/cache/clear', async (req, res) => {
  try {
    // Clear project discovery cache if it has one
    if (projectDiscovery.clearCache) {
      await projectDiscovery.clearCache();
    }

    // Reinitialize file watchers with fresh config
    await initializeMultiProjectWatchers();

    console.log('🔄 Config cache cleared and file watchers reinitialized');
    res.json({
      success: true,
      message: 'Config cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing config cache:', error);
    res.status(500).json({ error: 'Failed to clear config cache' });
  }
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