import type { Request, Response } from 'express'

// Type definitions
interface TaskResult {
  success: boolean
  message: string
  filename?: string
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
 * Controller layer for legacy ticket/task operations.
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
}
