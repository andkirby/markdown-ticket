import fs from 'fs/promises';
import path from 'path';
import { buildFileSystemTree } from '../utils/fileSystemTree.js';

/**
 * Service layer for file system operations (legacy tasks support)
 */
export class FileSystemService {
  constructor(tasksDir) {
    this.tasksDir = tasksDir;
  }

  /**
   * Get all task files from tasks directory
   * @returns {Promise<Array<string>>} Array of markdown filenames
   */
  async getAllTasks() {
    const files = await fs.readdir(this.tasksDir);
    return files.filter(file => file.endsWith('.md'));
  }

  /**
   * Get individual task file content
   * @param {string} filename - Task filename
   * @returns {Promise<string>} Task content
   */
  async getTask(filename) {
    const filePath = path.join(this.tasksDir, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (accessError) {
      throw new Error('Task not found');
    }

    return await fs.readFile(filePath, 'utf8');
  }

  /**
   * Save task file
   * @param {string} filename - Task filename
   * @param {string} content - Task content
   * @returns {Promise<Object>} Success status and filename
   */
  async saveTask(filename, content) {
    if (!filename || !content) {
      throw new Error('Filename and content are required');
    }

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.tasksDir, safeFilename);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, 'utf8');

    return {
      success: true,
      message: 'Task saved successfully',
      filename: safeFilename
    };
  }

  /**
   * Delete task file
   * @param {string} filename - Task filename
   * @returns {Promise<Object>} Success status
   */
  async deleteTask(filename) {
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.tasksDir, safeFilename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (accessError) {
      throw new Error('Task not found');
    }

    // Delete file
    await fs.unlink(filePath);

    return {
      success: true,
      message: 'Task deleted successfully'
    };
  }

  /**
   * Build file system tree for a project
   * @param {string} projectId - Project ID
   * @param {Object} projectDiscovery - ProjectDiscovery instance
   * @returns {Promise<Array>} File system tree
   */
  async buildProjectFileSystemTree(projectId, projectDiscovery) {
    const projects = await projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const projectPath = project.project.path;

    try {
      await fs.access(projectPath);
    } catch {
      throw new Error('Path not found');
    }

    return await buildFileSystemTree(projectPath);
  }

  /**
   * Ensure tasks directory exists
   * @returns {Promise<void>}
   */
  async ensureTasksDirectory() {
    try {
      await fs.access(this.tasksDir);
    } catch (error) {
      console.log(`Creating sample-tasks directory at: ${this.tasksDir}`);
      await fs.mkdir(this.tasksDir, { recursive: true });
    }
  }
}
