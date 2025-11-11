import { Router } from 'express';
/**
 * Intercept console methods to capture logs
 */
export declare function setupLogInterception(): void;
/**
 * Router for development tools and logging endpoints
 * @returns Express router
 */
export declare function createDevToolsRouter(): Router;
