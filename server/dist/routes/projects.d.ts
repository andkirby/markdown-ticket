import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController.js';
/**
 * Router for project-related endpoints
 * @param projectController - Project controller instance
 * @returns Express router
 */
export declare function createProjectRouter(projectController: ProjectController): Router;
