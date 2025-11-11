import * as fs from 'fs-extra';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as toml from 'toml';
import { ProjectInfo } from '@mdt/shared/models/Types.js';
import { Project } from '@mdt/shared/models/Project.js';
import { ServerConfig } from '@mdt/shared/models/Config.js';

export class ProjectDiscoveryService {
  private projects: Map<string, Project> = new Map();
  private lastScan: Date | null = null;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
  }

  async discoverProjects(): Promise<Project[]> {
    const now = new Date();

    // Check if cache is still valid
    if (this.lastScan &&
        (now.getTime() - this.lastScan.getTime()) < this.config.discovery.cacheTimeout * 1000) {
      return Array.from(this.projects.values());
    }

    console.error('🔍 Starting dual project discovery...');
    this.projects.clear();

    // 1. Discover from global registry (new approach)
    await this.discoverFromRegistry();

    // 2. Discover from legacy scanPaths (old approach)
    await this.discoverFromScanPaths();

    this.lastScan = now;
    console.error(`📁 Total discovered: ${this.projects.size} project(s)`);

    return Array.from(this.projects.values());
  }

  /**
   * Discover projects from the global registry
   */
  private async discoverFromRegistry(): Promise<void> {
    console.error('🗂️  Discovering from global registry...');
    console.error(`   Registry path: ${this.config.discovery.registryPath}`);

    try {
      // Ensure registry directory exists
      await fs.ensureDir(this.config.discovery.registryPath);

      // Read all .toml files from the registry directory
      const registryFiles = await glob('*.toml', {
        cwd: this.config.discovery.registryPath,
        absolute: true
      });

      console.error(`   Found ${registryFiles.length} registry file(s)`);

      for (const registryFile of registryFiles) {
        try {
          const project = await this.loadProjectFromRegistry(registryFile);
          if (project) {
            console.error(`   ✅ ${project.id} - ${project.project.name}`);
            this.projects.set(project.id, project);
          }
        } catch (error) {
          console.warn(`Failed to load registry file ${registryFile}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to read registry directory: ${(error as Error).message}`);
    }
  }

  /**
   * Discover projects from legacy scanPaths
   */
  private async discoverFromScanPaths(): Promise<void> {
    if (!this.config.discovery.scanPaths || this.config.discovery.scanPaths.length === 0) {
      console.error('ℹ️  No legacy scanPaths configured');
      return;
    }

    console.error(`🔎 Discovering from ${this.config.discovery.scanPaths.length} legacy scan path(s)...`);

    for (const scanPath of this.config.discovery.scanPaths) {
      try {
        const stats = await stat(scanPath);
        if (!stats.isDirectory()) {
          console.warn(`   ⚠️  Scan path is not a directory: ${scanPath}`);
          continue;
        }

        // Find all config files: both .mdt-config.toml and *-config.toml patterns
        const patterns = [
          '.mdt-config.toml',          // Root level new format
          '**/.mdt-config.toml',       // Nested new format
          '*-config.toml',             // Root level legacy format
          '**/*-config.toml'           // Nested legacy format
        ];

        const allConfigFiles: string[] = [];
        for (const pattern of patterns) {
          const files = await glob(pattern, {
            cwd: scanPath,
            absolute: true,
            ignore: this.config.discovery.excludePaths.map(p => `**/${p}/**`)
          });
          allConfigFiles.push(...files);
        }

        // Deduplicate config files
        const configFiles = [...new Set(allConfigFiles)];

        console.error(`   Found ${configFiles.length} config file(s) in ${scanPath}`);

        for (const configFile of configFiles) {
          try {
            const project = await this.loadProjectFromConfigFile(configFile);
            if (project && !this.projects.has(project.id)) {
              // Only add if not already discovered via registry
              console.error(`   ✅ ${project.id} - ${project.project.name} (legacy)`);
              this.projects.set(project.id, project);
            }
          } catch (error) {
            console.warn(`Failed to load config file ${configFile}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to scan path ${scanPath}:`, error);
      }
    }
  }

  getCachedProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * Load a project directly from a *-config.toml file (legacy approach)
   */
  private async loadProjectFromConfigFile(configPath: string): Promise<Project | null> {
    try {
      const configContent = await readFile(configPath, 'utf-8');
      const config = toml.parse(configContent);

      if (!config.project) {
        console.warn(`Config file missing [project] section: ${configPath}`);
        return null;
      }

      const projectRoot = path.dirname(configPath);
      const crDir = path.resolve(projectRoot, config.project.path || 'docs/CRs');

      // Use project code from config, fallback to filename-derived ID
      const configFilename = path.basename(configPath, '.toml');
      const fallbackId = configFilename.replace('-config', '').toUpperCase();
      const projectId = config.project.code || fallbackId;

      const project: Project = {
        id: projectId,
        project: {
          name: config.project.name || projectId,
          code: config.project.code || projectId,
          path: crDir,
          configFile: configPath,
          startNumber: config.project.startNumber || 1,
          counterFile: config.project.counterFile || '.mdt-next',
          active: true,
          description: config.project.description,
          repository: config.project.repository,
        },
        metadata: {
          dateRegistered: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          version: '1.0.0'
        },
        autoDiscovered: true,  // Discovered via scanPaths, not explicit registry
        configPath
      };

      return project;
    } catch (error) {
      console.warn(`Failed to load project from config ${configPath}:`, error);
      return null;
    }
  }

  /**
   * Load a project from a global registry file.
   * Registry files point to the actual project location.
   *
   * Supports two formats:
   * 1. New format: projectPath at root level
   * 2. Legacy format: [project] section with path field
   */
  private async loadProjectFromRegistry(registryPath: string): Promise<Project | null> {
    try {
      const registryContent = await readFile(registryPath, 'utf-8');
      const registry = toml.parse(registryContent);

      // Support both new (projectPath) and legacy ([project].path) formats
      let projectPath: string;
      if (registry.projectPath) {
        projectPath = registry.projectPath;
      } else if (registry.project?.path) {
        projectPath = registry.project.path;
      } else {
        console.warn(`Registry file missing projectPath or project.path: ${registryPath}`);
        return null;
      }

      // Expand ~ in projectPath
      projectPath = this.expandPath(projectPath);

      // Find the project's config file
      const configFiles = await glob('*-config.toml', {
        cwd: projectPath,
        absolute: true,
        dot: true
      });

      if (configFiles.length === 0) {
        console.warn(`No config file found in project: ${projectPath}`);
        return null;
      }

      // Load the actual project config
      const configPath = configFiles[0];
      const configContent = await readFile(configPath, 'utf-8');
      const config = toml.parse(configContent);

      if (!config.project) {
        console.warn(`Config file missing [project] section: ${configPath}`);
        return null;
      }

      const crDir = path.resolve(projectPath, config.project.path || 'docs/CRs');

      // Use project code from config, fallback to filename-derived ID
      const configFilename = path.basename(configPath, '.toml');
      const fallbackId = configFilename.replace('-config', '').toUpperCase();
      const projectId = config.project.code || fallbackId;

      const project: Project = {
        id: projectId,
        project: {
          name: config.project.name || projectId,
          code: config.project.code || projectId,
          path: crDir,
          configFile: configPath,
          startNumber: config.project.startNumber || 1,
          counterFile: config.project.counterFile || '.mdt-next',
          active: registry.active !== false,  // Default to true unless explicitly false
          description: config.project.description,
          repository: config.project.repository,
        },
        metadata: {
          dateRegistered: registry.dateRegistered || new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          version: '1.0.0'
        },
        autoDiscovered: false,  // Came from registry, not auto-discovered
        configPath
      };

      return project;
    } catch (error) {
      console.warn(`Failed to load project from registry ${registryPath}:`, error);
      return null;
    }
  }

  async getProjectInfo(key: string): Promise<ProjectInfo | null> {
    const project = this.projects.get(key.toUpperCase());
    if (!project) {
      return null;
    }

    try {
      // Count CRs in project
      const crFiles = await glob('*.md', { cwd: project.project.path });
      
      return {
        key: project.id,
        name: project.project.name,
        description: project.project.description,
        path: project.project.path,
        crCount: crFiles.length,
        lastAccessed: project.metadata.lastAccessed
      };
    } catch (error) {
      console.warn(`Failed to get project info for ${key}:`, error);
      return {
        key: project.id,
        name: project.project.name,
        description: project.project.description,
        path: project.project.path,
        crCount: 0,
        lastAccessed: project.metadata.lastAccessed
      };
    }
  }

  getProject(key: string): Project | null {
    return this.projects.get(key.toUpperCase()) || null;
  }

  private expandPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.join(process.env.HOME || '', inputPath.slice(2));
    }
    return path.resolve(inputPath);
  }

  async invalidateCache(): Promise<void> {
    this.lastScan = null;
    this.projects.clear();
  }
}