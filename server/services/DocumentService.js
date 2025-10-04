import path from 'path';
import { TreeService } from './TreeService.js';
import { FileOperationInvoker } from '../invokers/FileOperationInvoker.js';

/**
 * Service layer for document discovery and management
 */
export class DocumentService {
  constructor(projectDiscovery) {
    this.projectDiscovery = projectDiscovery;
    this.treeService = new TreeService(projectDiscovery);
    this.fileInvoker = new FileOperationInvoker();
  }

  /**
   * Discover documents for a project
   */
  async discoverDocuments(projectId) {
    return await this.treeService.getDocumentTree(projectId);
  }

  /**
   * Get document content
   */
  async getDocumentContent(projectId, filePath) {
    if (filePath.includes('..')) {
      throw new Error('Invalid file path');
    }

    if (!filePath.endsWith('.md')) {
      throw new Error('Only markdown files are allowed');
    }

    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const projectPath = project.project.path;
    const resolvedPath = path.join(projectPath, filePath);

    if (!resolvedPath.startsWith(projectPath)) {
      throw new Error('Access denied');
    }

    return await this.fileInvoker.readFile(resolvedPath);
  }
}
