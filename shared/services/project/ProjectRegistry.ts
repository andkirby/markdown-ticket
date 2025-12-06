import { Project } from '../../models/Project.js';
import { CONFIG_FILES, DEFAULT_PATHS } from '../../utils/constants.js';
import { logQuiet } from '../../utils/logger.js';
import { stringify, parse } from '../../utils/toml.js';
import {
  directoryExists,
  createDirectory,
  writeFile,
  listFiles,
  readFile
} from '../../utils/file-utils.js';
import {
  joinPaths,
  buildConfigFilePath,
  buildRegistryFilePath
} from '../../utils/path-resolver.js';

/**
 * Utility class for handling project registry operations
 * Extracted from ProjectDiscoveryService to reduce file size
 */
export class ProjectRegistry {
  private projectsDir: string;
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
    this.projectsDir = DEFAULT_PATHS.PROJECTS_REGISTRY;
  }

  /**
   * Get all registered projects from the global registry
   * Returns minimal metadata for each registered project
   */
  getRegisteredProjects(): Array<{ file: string; data: any }> {
    const registered: Array<{ file: string; data: any }> = [];

    try {
      if (!directoryExists(this.projectsDir)) {
        return [];
      }

      const files = this.listRegistryFiles();

      for (const file of files) {
        try {
          const registryPath = joinPaths(this.projectsDir, file);
          const content = this.readRegistryFile(registryPath);
          const registryData = this.parseRegistryContent(content);

          // Validate that the registry entry has the required project path
          if (registryData?.project?.path) {
            registered.push({ file, data: registryData });
          } else {
            logQuiet(this.quiet, `Skipping registry file ${file}: missing project path`);
          }
        } catch (error) {
          logQuiet(this.quiet, `Error parsing registry file ${file}:`, error);
        }
      }
    } catch (error) {
      logQuiet(this.quiet, 'Error reading registry directory:', error);
    }

    return registered;
  }

  /**
   * Register a project in the global registry (Project-First Strategy)
   * Stores minimal reference: path for discovery, metadata for tracking
   * Complete project definition remains in local config
   */
  registerProject(project: Project): void {
    try {
      // Ensure projects directory exists
      if (!directoryExists(this.projectsDir)) {
        createDirectory(this.projectsDir);
      }

      const projectFile = buildRegistryFilePath(this.projectsDir, project.id);

      // Project-First Strategy: Store minimal reference in global registry
      // Complete definition stays in local config for portability and team collaboration
      const projectData = {
        project: {
          path: project.project.path  // Only store path for discovery
        },
        metadata: {
          dateRegistered: project.metadata.dateRegistered,
          lastAccessed: new Date().toISOString().split('T')[0],
          version: project.metadata.version
        }
      };

      const tomlContent = stringify(projectData);
      writeFile(projectFile, tomlContent);

      logQuiet(this.quiet, `Registered project ${project.id} in global registry (minimal reference)`);
    } catch (error) {
      logQuiet(this.quiet, 'Error registering project:', error);
      throw error;
    }
  }

  /**
   * List all TOML files in the registry directory
   */
  private listRegistryFiles(): string[] {
    return listFiles(this.projectsDir, (file: string) => file.endsWith('.toml'));
  }

  /**
   * Read a registry file safely
   */
  private readRegistryFile(filePath: string): string {
    return readFile(filePath);
  }

  /**
   * Parse TOML content from registry file
   */
  private parseRegistryContent(content: string): any {
    return parse(content);
  }
}