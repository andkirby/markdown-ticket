import { TreeBuilder } from '../builders/TreeBuilder.js';
import { TreeStrategyFactory } from '../factories/TreeStrategyFactory.js';
import { ConfigRepository } from '../repositories/ConfigRepository.js';

/**
 * Facade service for all tree building operations
 */
export class TreeService {
  constructor(projectDiscovery) {
    this.projectDiscovery = projectDiscovery;
    this.configRepository = new ConfigRepository();
  }

  /**
   * Get document navigation tree with metadata
   */
  async getDocumentTree(projectId) {
    const project = await this._getProject(projectId);
    const config = await this.configRepository.getConfig(project.project.path);
    
    if (config.documentPaths.length === 0) {
      throw new Error('No document configuration found');
    }

    const strategy = TreeStrategyFactory.createDocumentNavigationStrategy();
    const builder = new TreeBuilder(strategy);
    const allFiles = await builder.build(project.project.path, config);

    return this._filterByDocumentPaths(allFiles, config.documentPaths);
  }

  /**
   * Get path selection tree (basic, no metadata)
   */
  async getPathSelectionTree(projectId) {
    const project = await this._getProject(projectId);
    const config = await this.configRepository.getConfig(project.project.path);

    const strategy = TreeStrategyFactory.createPathSelectionStrategy();
    const builder = new TreeBuilder(strategy);

    return await builder.build(project.project.path, config);
  }

  async _getProject(projectId) {
    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    return project;
  }

  _filterByDocumentPaths(allFiles, documentPaths) {
    const results = [];
    for (const docPath of documentPaths) {
      const matches = this._findMatches(allFiles, docPath);
      results.push(...matches);
    }
    return results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  _findMatches(files, targetPath) {
    const results = [];
    for (const file of files) {
      if (file.path === targetPath) {
        results.push(file);
      } else if (file.type === 'folder' && file.children) {
        if (targetPath.startsWith(file.path + '/')) {
          const filteredChildren = this._findMatches(file.children, targetPath);
          if (filteredChildren.length > 0) {
            results.push({ ...file, children: filteredChildren });
          }
        } else {
          results.push(...this._findMatches(file.children, targetPath));
        }
      }
    }
    return results;
  }
}
