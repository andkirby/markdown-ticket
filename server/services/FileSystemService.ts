import { promises as fs } from 'fs';
import * as path from 'path';
import { TreeService } from './TreeService.js';

// Type definitions
interface Task {
  success: boolean;
  message: string;
  filename?: string;
}

interface ProjectDiscovery {
  getAllProjects(): Promise<Project[]>;
}

interface Project {
  id: string;
  project: {
    name: string;
    path: string;
    active: boolean;
  };
}

interface FileSystemTree {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileSystemTree[];
}

/**
 * Service layer for file system operations
 */
export class FileSystemService {
  private tasksDir: string;

  constructor(tasksDir: string) {
    this.tasksDir = tasksDir;
  }

  /**
   * Get all task files from tasks directory
   */
  async getAllTasks(): Promise<string[]> {
    const files = await fs.readdir(this.tasksDir);
    return files.filter(file => file.endsWith('.md'));
  }

  /**
   * Get individual task file content
   */
  async getTask(filename: string): Promise<string> {
    const filePath = path.join(this.tasksDir, filename);
    try {
      await fs.access(filePath);
    } catch {
      throw new Error('Task not found');
    }
    return await fs.readFile(filePath, 'utf8');
  }

  /**
   * Save task file
   */
  async saveTask(filename: string, content: string): Promise<Task> {
    if (!filename || !content) {
      throw new Error('Filename and content are required');
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(this.tasksDir, safeFilename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');

    return {
      success: true,
      message: 'Task saved successfully',
      filename: safeFilename
    };
  }

  /**
   * Delete task file
   */
  async deleteTask(filename: string): Promise<Task> {
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.tasksDir, safeFilename);

    try {
      await fs.access(filePath);
    } catch {
      throw new Error('Task not found');
    }

    await fs.unlink(filePath);
    return {
      success: true,
      message: 'Task deleted successfully'
    };
  }

  /**
   * Build file system tree for path selection
   */
  async buildProjectFileSystemTree(projectId: string, projectDiscovery: ProjectDiscovery): Promise<FileSystemTree[]> {
    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    try {
      await fs.access(project.project.path);
    } catch {
      throw new Error('Path not found');
    }

    const treeService = new TreeService(projectDiscovery);
    return await treeService.getPathSelectionTree(projectId);
  }

  /**
   * Ensure tasks directory exists
   */
  async ensureTasksDirectory(): Promise<void> {
    try {
      await fs.access(this.tasksDir);
    } catch {
      console.log(`Creating sample-tasks directory at: ${this.tasksDir}`);
      await fs.mkdir(this.tasksDir, { recursive: true });
    }
  }
}