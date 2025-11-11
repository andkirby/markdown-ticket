import fs from 'fs/promises';
import path from 'path';
import { TreeService } from './TreeService.js';
/**
 * Service layer for file system operations
 */
export class FileSystemService {
    constructor(tasksDir) {
        this.tasksDir = tasksDir;
    }
    /**
     * Get all task files from tasks directory
     */
    async getAllTasks() {
        const files = await fs.readdir(this.tasksDir);
        return files.filter(file => file.endsWith('.md'));
    }
    /**
     * Get individual task file content
     */
    async getTask(filename) {
        const filePath = path.join(this.tasksDir, filename);
        try {
            await fs.access(filePath);
        }
        catch {
            throw new Error('Task not found');
        }
        return await fs.readFile(filePath, 'utf8');
    }
    /**
     * Save task file
     */
    async saveTask(filename, content) {
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
    async deleteTask(filename) {
        const safeFilename = path.basename(filename);
        const filePath = path.join(this.tasksDir, safeFilename);
        try {
            await fs.access(filePath);
        }
        catch {
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
    async buildProjectFileSystemTree(projectId, projectDiscovery) {
        const projects = await projectDiscovery.getAllProjects();
        const project = projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error('Project not found');
        }
        try {
            await fs.access(project.project.path);
        }
        catch {
            throw new Error('Path not found');
        }
        const treeService = new TreeService(projectDiscovery);
        return await treeService.getPathSelectionTree(projectId);
    }
    /**
     * Ensure tasks directory exists
     */
    async ensureTasksDirectory() {
        try {
            await fs.access(this.tasksDir);
        }
        catch {
            console.log(`Creating sample-tasks directory at: ${this.tasksDir}`);
            await fs.mkdir(this.tasksDir, { recursive: true });
        }
    }
}
//# sourceMappingURL=FileSystemService.js.map