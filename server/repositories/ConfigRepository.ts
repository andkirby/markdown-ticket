import fs from 'fs/promises';
import path from 'path';

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

    // Parse document_paths
    const pathsMatch = content.match(/document_paths\s*=\s*\[(.*?)\]/s);
    if (pathsMatch) {
      config.documentPaths = this._parseArray(pathsMatch[1]);
    }

    // Parse exclude_folders
    const excludeMatch = content.match(/exclude_folders\s*=\s*\[(.*?)\]/s);
    if (excludeMatch) {
      config.excludeFolders = this._parseArray(excludeMatch[1]);
    }

    // Parse tickets path
    const ticketsMatch = content.match(/path\s*=\s*["']?([^"'\n\r]+)["']?/);
    if (ticketsMatch) {
      config.ticketsPath = ticketsMatch[1].trim();
    }

    return config;
  }

  private _parseArray(arrayString: string): string[] {
    return arrayString
      .split(/[,\n]/)
      .map(s => s.trim().replace(/['"]/g, '').replace(/#.*$/, '').trim())
      .filter(s => s.length > 0);
  }

  private _getDefaultConfig(): ProjectConfiguration {
    return {
      documentPaths: [],
      excludeFolders: ['docs/CRs', 'node_modules', '.git'],
      ticketsPath: null
    };
  }
}