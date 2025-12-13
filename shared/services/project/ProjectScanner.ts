import { Project } from '../../models/Project';
import { CONFIG_FILES } from '../../utils/constants';
import { logQuiet } from '../../utils/logger';
import {
  joinPaths,
  getBaseName,
  buildConfigFilePath
} from '../../utils/path-resolver';
import { fileExists, readDirectory } from '../../utils/file-utils';
import { ProjectConfigLoader } from './ProjectConfigLoader';

/**
 * Utility class for handling project auto-discovery and scanning operations
 * Extracted from ProjectDiscoveryService to reduce file size
 */
export class ProjectScanner {
  private quiet: boolean;
  private configLoader: ProjectConfigLoader;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
    this.configLoader = new ProjectConfigLoader(quiet);
  }

  /**
   * Auto-discover projects by scanning for .mdt-config.toml files
   */
  autoDiscoverProjects(searchPaths: string[] = []): Project[] {
    const discovered: Project[] = [];

    const pathsToSearch = Array.from(new Set(searchPaths));
    logQuiet(this.quiet, '🔍 Auto-discovery scanning paths:', pathsToSearch);

    for (const searchPath of pathsToSearch) {
      try {
        logQuiet(this.quiet, `🔍 Checking path: ${searchPath}, exists: ${fileExists(searchPath)}`);
        if (fileExists(searchPath)) {
          logQuiet(this.quiet, `🔍 Scanning ${searchPath} for projects...`);
          this.scanDirectoryForProjects(searchPath, discovered, 3); // Max depth 3
        }
      } catch (error) {
        logQuiet(this.quiet, `Error scanning ${searchPath}:`, error);
      }
    }
    logQuiet(this.quiet, `🔍 Auto-discovery complete. Found ${discovered.length} projects:`);

    return discovered;
  }

  /**
   * Recursively scan directory for project configurations
   */
  private scanDirectoryForProjects(dirPath: string, discovered: Project[], maxDepth: number): void {
    if (maxDepth <= 0) return;

    try {
      const configPath = buildConfigFilePath(dirPath, CONFIG_FILES.PROJECT_CONFIG);

      if (fileExists(configPath)) {
        const config = this.configLoader.getProjectConfig(dirPath);
        if (config) {
          const directoryName = getBaseName(dirPath);

          // Determine project ID: use config.id if available, otherwise use directory name
          const projectId = config.project.id || directoryName;

          // Track projects by code to handle duplicates without proper IDs
          if (!config.project.id && config.project.code) {
            // Check if we already found a project with this code but no ID
            const existingProject = discovered.find(p =>
              p.project.code === config.project.code &&
              !p.project.id
            );
            if (existingProject) {
              logQuiet(this.quiet, `Ignoring duplicate project ${directoryName} with code "${config.project.code}" (no ID in config)`);
              return; // Skip duplicate
            }
          }

          const project: Project = {
            id: projectId,
            project: {
              name: config.project.name,
              code: config.project.code,
              path: dirPath,
              configFile: configPath,
              active: true,
              description: config.project.description || ''
            },
            metadata: {
              dateRegistered: new Date().toISOString().split('T')[0],
              lastAccessed: new Date().toISOString().split('T')[0],
              version: '1.0.0'
            },
            autoDiscovered: true
          };

          discovered.push(project);
        }
      }

      // Continue scanning subdirectories
      const entries = readDirectory(dirPath);
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.scanDirectoryForProjects(joinPaths(dirPath, entry.name), discovered, maxDepth - 1);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }
}