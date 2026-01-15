import type { Request, Response } from 'express'
// NOTE: Duplicate detection functionality deprecated per MDT-082
// These functions now return empty results or throw deprecation errors
import { findDuplicates, previewRename, resolveDuplicate } from '../utils/duplicateDetection.js'

// Type definitions
interface TaskResult {
  success: boolean
  message: string
  filename?: string
}

interface _DuplicateResult {
  duplicates: {
    title: string
    files: {
      filepath: string
      content: string
    }[]
  }[]
  totalDuplicates: number
}

interface _RenamePreview {
  originalFilepath: string
  newFilepath: string
  oldCode: string
  newCode: string
  changesPreview: string
}

interface _ResolveDuplicateResult {
  success: boolean
  message: string
  action?: string
  originalFilepath?: string
  newFilepath?: string
}

interface AuthenticatedRequest extends Request {
  params: {
    filename?: string
    projectId?: string
  }
  body: {
    filename?: string
    content?: string
    filepath?: string
    oldFilepath?: string
    action?: string
  }
}

interface FileSystemService {
  getAllTasks: () => Promise<string[]>
  getTask: (filename: string) => Promise<string>
  saveTask: (filename: string, content: string) => Promise<TaskResult>
  deleteTask: (filename: string) => Promise<TaskResult>
}

/**
 * Controller layer for ticket/task operations (legacy and duplicate detection).
 */
export class TicketController {
  private fileSystemService: FileSystemService

  constructor(fileSystemService: FileSystemService) {
    this.fileSystemService = fileSystemService
  }

  /**
   * Get all task files (legacy).
   */
  async getAllTasks(req: Request, res: Response): Promise<void> {
    try {
      const mdFiles = await this.fileSystemService.getAllTasks()

      res.json(mdFiles)
    }
    catch (error) {
      console.error('Error loading tasks:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load tasks' })
    }
  }

  /**
   * Get individual task file (legacy).
   */
  async getTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { filename } = req.params

      if (!filename) {
        res.status(400).json({ error: 'Bad Request', message: 'Filename is required' })

        return
      }

      const content = await this.fileSystemService.getTask(filename)

      res.send(content)
    }
    catch (error: any) {
      console.error('Error loading task:', error)
      if (error.message === 'Task not found') {
        res.status(404).json({ error: 'Not Found', message: error.message })
      }
      else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load task' })
      }
    }
  }

  /**
   * Save task file (legacy).
   */
  async saveTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { filename, content } = req.body

      if (!filename || !content) {
        res.status(400).json({ error: 'Bad Request', message: 'Filename and content are required' })

        return
      }

      const result = await this.fileSystemService.saveTask(filename, content)

      console.warn(`Saved ticket: ${result.filename}`)
      res.json(result)
    }
    catch (error: any) {
      console.error('Error saving task:', error)
      if (error.message.includes('required')) {
        res.status(400).json({ error: 'Bad Request', message: error.message })
      }
      else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to save task' })
      }
    }
  }

  /**
   * Delete task file (legacy).
   */
  async deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { filename } = req.params

      if (!filename) {
        res.status(400).json({ error: 'Bad Request', message: 'Filename is required' })

        return
      }

      const result = await this.fileSystemService.deleteTask(filename)

      console.warn(`Deleted ticket: ${filename}`)
      res.json(result)
    }
    catch (error: any) {
      console.error('Error deleting task:', error)
      if (error.message === 'Task not found') {
        res.status(404).json({ error: 'Not Found', message: error.message })
      }
      else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete task' })
      }
    }
  }

  /**
   * Find duplicate tickets.
   */
  async getDuplicates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })

        return
      }

      // Map project IDs to paths (simplified for now)
      const projectPaths: Record<string, string> = {
      }

      const projectPath = projectPaths[projectId]

      if (!projectPath) {
        res.status(404).json({ error: 'Not Found', message: 'Project not found' })

        return
      }

      const result = await findDuplicates(projectPath)

      res.json(result)
    }
    catch (error) {
      console.error('Error checking duplicates:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to check duplicates' })
    }
  }

  /**
   * Preview rename changes for duplicate.
   */
  async previewDuplicateRename(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, filepath } = req.body

      if (!projectId || !filepath) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and filepath are required' })

        return
      }

      // Map project IDs to paths and codes
      const projectInfo: Record<string, { path: string, code: string }> = {
      }

      const project = projectInfo[projectId]

      if (!project) {
        res.status(404).json({ error: 'Not Found', message: 'Project not found' })

        return
      }

      const result = await previewRename(filepath, project.path, project.code)

      res.json(result)
    }
    catch (error) {
      console.error('Error generating preview:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate preview' })
    }
  }

  /**
   * Resolve duplicate by renaming or deleting.
   */
  async resolveDuplicateTicket(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, oldFilepath, action } = req.body

      if (!projectId || !oldFilepath || !action) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID, old filepath, and action are required' })

        return
      }

      // Map project IDs to paths and codes
      const projectInfo: Record<string, { path: string, code: string }> = {
      }

      const project = projectInfo[projectId]

      if (!project) {
        res.status(404).json({ error: 'Not Found', message: 'Project not found' })

        return
      }

      const result = await resolveDuplicate(action, oldFilepath, project.path, project.code)

      res.json(result)
    }
    catch (error) {
      console.error('Error resolving duplicate:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to resolve duplicate' })
    }
  }
}
