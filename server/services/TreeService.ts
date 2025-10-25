import { TreeBuilder } from '../builders/TreeBuilder';
import { TreeStrategyFactory } from '../factories/TreeStrategyFactory';
import { ConfigRepository } from '../repositories/ConfigRepository';

// Type definitions
interface Project {
  id: string;
  project: {
    name: string;
    path: string;
    active: boolean;
  };
  autoDiscovered?: boolean;
  configPath?: string;
}

interface _Config {
  documentPaths: string[];
  ticketsPath?: string | null | undefined;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  size?: number;
  lastModified?: Date;
  metadata?: Record<string, any>;
}

interface ProjectDiscovery {
  getAllProjects(): Promise<Project[]>;
}

/**
 * Facade service for all tree building operations
 */
export class TreeService {
  private projectDiscovery: ProjectDiscovery;
  private configRepository: ConfigRepository;

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery;
    this.configRepository = new ConfigRepository();
  }

  /**
   * Get document navigation tree with metadata
   */
  async getDocumentTree(projectId: string): Promise<TreeNode[]> {
    const project = await this._getProject(projectId);
    const config = await this.configRepository.getConfig(project.project.path);

    if ((config as any).documentPaths.length === 0) {
      throw new Error('No document configuration found');
    }

    const strategy = TreeStrategyFactory.createDocumentNavigationStrategy();
    const builder = new TreeBuilder(strategy);
    const allFiles = await builder.build(project.project.path, config as any) as any;

    return this._filterByDocumentPaths(allFiles, (config as any).documentPaths);
  }

  /**
   * Get path selection tree (basic, no metadata)
   */
  async getPathSelectionTree(projectId: string): Promise<TreeNode[]> {
    const project = await this._getProject(projectId);
    const config = await this.configRepository.getConfig(project.project.path);

    const strategy = TreeStrategyFactory.createPathSelectionStrategy();
    const builder = new TreeBuilder(strategy);

    return await builder.build(project.project.path, config as any) as any;
  }

  private async _getProject(projectId: string): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    return project;
  }

  private _filterByDocumentPaths(allFiles: TreeNode[], documentPaths: string[]): TreeNode[] {
    const results: TreeNode[] = [];
    for (const docPath of documentPaths) {
      const matches = this._findMatches(allFiles, docPath);
      results.push(...matches);
    }
    return results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  private _findMatches(files: TreeNode[], targetPath: string): TreeNode[] {
    const results: TreeNode[] = [];
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