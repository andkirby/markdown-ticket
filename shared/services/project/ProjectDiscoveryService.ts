import { Project } from '../../models/Project.js';
import { ProjectValidator } from '../../tools/ProjectValidator.js';
import { CONFIG_FILES, DEFAULT_PATHS } from '../../utils/constants.js';
import { logQuiet } from '../../utils/logger.js';
import {
  joinPaths,
  getBaseName,
  buildConfigFilePath
} from '../../utils/path-resolver.js';
import { IProjectDiscoveryService } from './types.js';
import { ProjectConfigLoader } from './ProjectConfigLoader.js';
import { ProjectScanner } from './ProjectScanner.js';
import { ProjectRegistry } from './ProjectRegistry.js';

/**
 * Project Discovery Service
 * Handles project scanning, registration, and discovery operations
 * Extracted from ProjectService to separate concerns
 * Refactored to use utilities for better separation of concerns
 */
export class ProjectDiscoveryService implements IProjectDiscoveryService {
  private quiet: boolean;
  private configLoader: ProjectConfigLoader;
  private scanner: ProjectScanner;
  private registry: ProjectRegistry;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
    this.configLoader = new ProjectConfigLoader(quiet);
    this.scanner = new ProjectScanner(quiet);
    this.registry = new ProjectRegistry(quiet);
  }

  /**
   * Get all registered projects (Project-First Strategy)
   * Reads minimal references from global registry and merges with local project configs
   * Global provides: path location + metadata
   * Local provides: complete project definition (name, code, settings)
   */
  getRegisteredProjects(): Project[] {
    const projects: Project[] = [];
    const registeredProjects = this.registry.getRegisteredProjects();

    for (const { file, data: registryData } of registeredProjects) {
      try {
        // Global registry provides only project path and metadata
        const projectPath = registryData.project.path;
        const registryPath = joinPaths(DEFAULT_PATHS.PROJECTS_REGISTRY, file);

        // Read complete project definition from local config
        const localConfig = this.configLoader.getProjectConfig(projectPath);

        // Validate local config exists and is valid
        if (!localConfig) {
          logQuiet(this.quiet, `Warning: Project ${getBaseName(projectPath)} has global registry but no valid local config at ${projectPath}`);
          // Still include project but with minimal data for recovery scenarios
        }

        // Project-First Strategy: Local config is primary source, global provides metadata only
        const projectId = getBaseName(projectPath);
        const project: Project = {
          id: projectId,
          project: {
            name: localConfig?.project?.name || projectId, // Local priority, fallback to directory name
            code: localConfig?.project?.code || (() => {
              // Generate valid code from projectId using proper validation
              const generatedCode = ProjectValidator.generateCodeFromName(projectId);
              const validationResult = ProjectValidator.validateCode(generatedCode);
              if (validationResult.valid) {
                return validationResult.normalized!;
              } else {
                // Fallback to first 5 chars of uppercase projectId
                let fallbackCode = projectId.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
                // Ensure minimum 2 chars
                if (fallbackCode.length < 2) {
                  fallbackCode = projectId.toUpperCase().substring(0, 5);
                }
                return fallbackCode;
              }
            })(), // Local priority, fallback to validated code
            path: projectPath, // From global registry
            configFile: buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG),
            startNumber: localConfig?.project?.startNumber || 1, // Local priority
            counterFile: localConfig?.project?.counterFile || CONFIG_FILES.COUNTER_FILE, // Local priority
            active: localConfig?.project?.active !== false, // Local priority, default true
            description: localConfig?.project?.description || '', // Local priority
            repository: localConfig?.project?.repository || '' // Local priority
          },
          metadata: {
            dateRegistered: registryData.metadata?.dateRegistered || new Date().toISOString().split('T')[0],
            lastAccessed: registryData.metadata?.lastAccessed || new Date().toISOString().split('T')[0],
            version: registryData.metadata?.version || '1.0.0'
          },
          registryFile: registryPath // Store exact registry file path for CLI operations
        };

        projects.push(project);
      } catch (error) {
        logQuiet(this.quiet, `Error processing registry entry for ${file}:`, error);
      }
    }

    return projects;
  }

  
  /**
   * Auto-discover projects by scanning for .mdt-config.toml files
   */
  autoDiscoverProjects(searchPaths: string[] = []): Project[] {
    return this.scanner.autoDiscoverProjects(searchPaths);
  }

  /**
   * Register a project in the global registry (Project-First Strategy)
   * Stores minimal reference: path for discovery, metadata for tracking
   * Complete project definition remains in local config
   */
  registerProject(project: Project): void {
    this.registry.registerProject(project);
  }
}