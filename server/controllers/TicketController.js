import { findDuplicates, previewRename, resolveDuplicate } from '../utils/duplicateDetection.js';

/**
 * Controller layer for ticket/task operations (legacy and duplicate detection)
 */
export class TicketController {
  constructor(fileSystemService) {
    this.fileSystemService = fileSystemService;
  }

  /**
   * Get all task files (legacy)
   */
  async getAllTasks(req, res) {
    try {
      const mdFiles = await this.fileSystemService.getAllTasks();
      res.json(mdFiles);
    } catch (error) {
      console.error('Error loading tasks:', error);
      res.status(500).json({ error: 'Failed to load tasks' });
    }
  }

  /**
   * Get individual task file (legacy)
   */
  async getTask(req, res) {
    try {
      const { filename } = req.params;
      const content = await this.fileSystemService.getTask(filename);
      res.send(content);
    } catch (error) {
      console.error('Error loading task:', error);
      if (error.message === 'Task not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to load task' });
      }
    }
  }

  /**
   * Save task file (legacy)
   */
  async saveTask(req, res) {
    try {
      const { filename, content } = req.body;
      const result = await this.fileSystemService.saveTask(filename, content);
      console.log(`Saved ticket: ${result.filename}`);
      res.json(result);
    } catch (error) {
      console.error('Error saving task:', error);
      if (error.message.includes('required')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to save task' });
      }
    }
  }

  /**
   * Delete task file (legacy)
   */
  async deleteTask(req, res) {
    try {
      const { filename } = req.params;
      const result = await this.fileSystemService.deleteTask(filename);
      console.log(`Deleted ticket: ${filename}`);
      res.json(result);
    } catch (error) {
      console.error('Error deleting task:', error);
      if (error.message === 'Task not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete task' });
      }
    }
  }

  /**
   * Find duplicate tickets
   */
  async getDuplicates(req, res) {
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

      const result = await findDuplicates(projectPath);
      res.json(result);
    } catch (error) {
      console.error('Error checking duplicates:', error);
      res.status(500).json({ error: 'Failed to check duplicates' });
    }
  }

  /**
   * Preview rename changes for duplicate
   */
  async previewDuplicateRename(req, res) {
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

      const result = await previewRename(filepath, project.path, project.code);
      res.json(result);
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  }

  /**
   * Resolve duplicate by renaming or deleting
   */
  async resolveDuplicateTicket(req, res) {
    try {
      const { projectId, oldFilepath, action } = req.body;

      // Map project IDs to paths and codes
      const projectInfo = {
        'debug-tasks': { path: '/Users/kirby/home/markdown-ticket/debug-tasks', code: 'DEB' },
        'markdown-ticket': { path: '/Users/kirby/home/markdown-ticket/docs/CRs', code: 'MDT' }
      };

      const project = projectInfo[projectId];
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const result = await resolveDuplicate(action, oldFilepath, project.path, project.code);
      res.json(result);
    } catch (error) {
      console.error('Error resolving duplicate:', error);
      res.status(500).json({ error: 'Failed to resolve duplicate' });
    }
  }
}
