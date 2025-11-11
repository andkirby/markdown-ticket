import { Router } from 'express';
import FileWatcherService from '../fileWatcherService.js';
/**
 * Router for Server-Sent Events endpoints
 * @param fileWatcher - File watcher service instance
 * @returns Express router
 */
export declare function createSSERouter(fileWatcher: FileWatcherService): Router;
