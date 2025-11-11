import { Router } from 'express';
import FileWatcherService from '../fileWatcherService.js';
import { ProjectController } from '../controllers/ProjectController.js';
interface FileInvoker {
    clearCache(): void;
    invalidateFile(filePath: string): void;
}
interface ProjectDiscovery {
    clearCache?(): void | Promise<void>;
}
/**
 * Router for system-related endpoints (status, directories, filesystem, config)
 * @param fileWatcher - File watcher service instance
 * @param projectController - Project controller instance
 * @param projectDiscovery - Project discovery service
 * @param fileInvoker - File operation invoker for cache management
 * @returns Express router
 */
export declare function createSystemRouter(fileWatcher: FileWatcherService, projectController: ProjectController, projectDiscovery: ProjectDiscovery, fileInvoker: FileInvoker): Router;
export {};
