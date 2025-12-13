import { promises as fs } from 'fs';
import * as path from 'path';
import * as toml from 'toml';
import { DEFAULTS } from '@mdt/shared/utils/constants.js';

export interface ProjectConfiguration {
  documentPaths: string[];
  excludeFolders: string[];
  ticketsPath: string | null;
}

/**
 * Repository for project configuration access
 */
export class ConfigRepository {
  /**
   * Get project configuration
   */
  async getConfig(projectPath: string): Promise<ProjectConfiguration> {
    const configPath = path.join(projectPath, '.mdt-config.toml');

    try {
      const content = await fs.readFile(configPath, 'utf8');
      return this._parseConfig(content);
    } catch {
      return this._getDefaultConfig();
    }
  }

  private _parseConfig(content: string): ProjectConfiguration {
    const config = this._getDefaultConfig();

    try {
      // Parse TOML content properly using TOML library
      const parsed = toml.parse(content);

      // Parse document_paths (check both top-level and under project section)
      const docPaths = parsed.document_paths || parsed.project?.document_paths;
      if (docPaths && Array.isArray(docPaths)) {
        config.documentPaths = docPaths.filter(path => typeof path === 'string');
      }

      // Parse exclude_folders (check both top-level and under project section)
      const exclFolders = parsed.exclude_folders || parsed.project?.exclude_folders;
      if (exclFolders && Array.isArray(exclFolders)) {
        config.excludeFolders = exclFolders.filter(folder => typeof folder === 'string');
      }

      // Parse tickets path from project section
      if (parsed.project) {
        // New format: project.ticketsPath
        if (parsed.project.ticketsPath && typeof parsed.project.ticketsPath === 'string') {
          config.ticketsPath = parsed.project.ticketsPath.trim();
        }
        // Legacy format: project.path
        else if (parsed.project.path && typeof parsed.project.path === 'string') {
          config.ticketsPath = parsed.project.path.trim();
        }
      }
    } catch (error) {
      console.error('Failed to parse TOML configuration:', error);
      // Return default config if parsing fails - TOML files should be valid
    }

    return config;
  }

  
  private _getDefaultConfig(): ProjectConfiguration {
    return {
      documentPaths: [],
      excludeFolders: [DEFAULTS.TICKETS_PATH, 'node_modules', '.git'],
      ticketsPath: null
    };
  }
}