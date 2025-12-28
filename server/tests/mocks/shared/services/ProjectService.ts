/**
 * Mock of @mdt/shared/services/ProjectService for testing
 * Provides a functional mock that mimics the real ProjectService behavior
 */

import * as path from 'path';
import * as fs from 'fs';

// Get CONFIG_DIR from environment, with fallback
function getConfigDir(): string {
  return process.env.CONFIG_DIR || path.join(process.env.HOME || '', '.config', 'markdown-ticket');
}

// Shared registry across all ProjectService instances
const sharedProjectsRegistry: Map<string, any> = new Map();

export class ProjectService {
  private projectsRegistry: Map<string, any>;
  private configDir: string;

  constructor(quiet: boolean = false) {
    this.configDir = getConfigDir();
    // Use shared registry so all instances see the same projects
    this.projectsRegistry = sharedProjectsRegistry;
    this.loadProjectsRegistry();
  }

  /**
   * Load projects from the registry directory
   * Also scans the projects directory created by ProjectFactory
   */
  private loadProjectsRegistry(): void {
    // Clear registry and reload
    this.projectsRegistry.clear();

    // Always get fresh configDir from environment in case TestEnvironment changed it
    const currentConfigDir = getConfigDir();

    // 1. Load from registry pattern: configDir/projects/ (symlinks to actual projects)
    const projectsRegistryDir = path.join(currentConfigDir, 'projects');
    if (fs.existsSync(projectsRegistryDir)) {
      const entries = fs.readdirSync(projectsRegistryDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(projectsRegistryDir, entry.name, '.mdt-config.toml');
          if (fs.existsSync(configPath)) {
            this.loadProjectFromConfig(configPath, entry.name);
          }
        }
      }
    }

    // 2. Load from ProjectFactory pattern: {tempDir}/projects/ (actual project directories)
    // The configDir is usually {tempDir}/config, so projects would be at {tempDir}/projects
    const tempDirProjects = path.join(path.dirname(currentConfigDir), 'projects');
    if (fs.existsSync(tempDirProjects) && tempDirProjects !== projectsRegistryDir) {
      const entries = fs.readdirSync(tempDirProjects, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(tempDirProjects, entry.name, '.mdt-config.toml');
          if (fs.existsSync(configPath)) {
            // Don't overwrite existing entries from registry
            if (!this.projectsRegistry.has(entry.name)) {
              this.loadProjectFromConfig(configPath, entry.name);
            }
          }
        }
      }
    }
  }

  /**
   * Load a single project from its config file
   */
  private loadProjectFromConfig(configPath: string, entryName: string): void {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      // Parse basic TOML (simplified for testing)
      const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
      const codeMatch = content.match(/code\s*=\s*["']([^"']+)["']/);
      const ticketsPathMatch = content.match(/ticketsPath\s*=\s*["']([^"']+)["']/);

      if (nameMatch && codeMatch) {
        // Store the project directory name as the path
        const projectDirName = path.basename(path.dirname(configPath));
        this.projectsRegistry.set(entryName, {
          name: nameMatch[1],
          code: codeMatch[1],
          ticketsPath: ticketsPathMatch ? ticketsPathMatch[1] : 'docs/CRs',
          path: path.dirname(configPath), // Full path for file operations
          projectDir: projectDirName, // Just the directory name for registry lookups
          active: true,
        });
      }
    } catch (error) {
      // Skip invalid configs
    }
  }

  /**
   * Refresh projects registry (call this after creating new projects)
   */
  public refreshRegistry(): void {
    this.loadProjectsRegistry();
  }

  /**
   * Get all projects
   * Accepts bypassCache parameter for compatibility with controller expectations
   * Always refreshes registry to pick up projects created dynamically
   */
  async getAllProjects(bypassCache?: boolean): Promise<any[]> {
    // Always refresh to pick up projects created by ProjectFactory
    this.loadProjectsRegistry();

    const currentConfigDir = getConfigDir();
    const result = Array.from(this.projectsRegistry.values()).map(project => ({
      id: project.code,
      project: {
        name: project.name,
        path: project.projectDir || project.path, // Use projectDir for registry style, full path for direct projects
        active: project.active,
      },
      configPath: path.join(currentConfigDir, 'projects', project.projectDir || path.basename(project.path), '.mdt-config.toml'),
    }));
    if (result.length > 0) {
    }
    return result;
  }

  /**
   * Get project configuration by path
   */
  getProjectConfig(projectPath: string): any {
    for (const [key, project] of this.projectsRegistry.entries()) {
      if (project.path === projectPath || key === projectPath || project.projectDir === projectPath || project.code === projectPath) {
        return {
          name: project.name,
          code: project.code,
          ticketsPath: project.ticketsPath,
          path: project.path,
        };
      }
    }
    return null;
  }

  /**
   * Get all CRs for a project
   */
  async getProjectCRs(projectPath: string): Promise<any[]> {
    const config = this.getProjectConfig(projectPath);
    if (!config) {
      return [];
    }

    // Use the full path from config, not the input projectPath which might be just "API"
    const ticketsDir = path.join(config.path, config.ticketsPath);
    if (!fs.existsSync(ticketsDir)) {
      return [];
    }

    const crs: any[] = [];
    const entries = fs.readdirSync(ticketsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const markdownFiles = fs.readdirSync(path.join(ticketsDir, entry.name))
          .filter(f => f.endsWith('.md'));

        for (const mdFile of markdownFiles) {
          const mdPath = path.join(ticketsDir, entry.name, mdFile);
          try {
            const content = fs.readFileSync(mdPath, 'utf-8');
            const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (yamlMatch) {
              const yaml = yamlMatch[1];
              const titleMatch = yaml.match(/title:\s*["']?([^"'\n]+)["']?/);
              const statusMatch = yaml.match(/status:\s*["']?([^"'\n]+)["']?/);
              const typeMatch = yaml.match(/type:\s*["']?([^"'\n]+)["']?/);
              const priorityMatch = yaml.match(/priority:\s*["']?([^"'\n]+)["']?/);

              crs.push({
                code: entry.name,
                title: titleMatch ? titleMatch[1].trim() : entry.name,
                status: statusMatch ? statusMatch[1].trim() : 'Proposed',
                type: typeMatch ? typeMatch[1].trim() : 'Feature Enhancement',
                priority: priorityMatch ? priorityMatch[1].trim() : 'Medium',
                filename: mdFile,
                path: mdPath,
              });
            }
          } catch (error) {
            // Skip invalid files
          }
        }
      }
    }

    return crs;
  }

  /**
   * Get system directories
   */
  async getSystemDirectories(rootPath?: string): Promise<string[]> {
    const dirs: string[] = [];
    const startPath = rootPath || process.cwd();

    try {
      const entries = fs.readdirSync(startPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          dirs.push(entry.name);
        }
      }
    } catch (error) {
      // Return empty array on error
    }

    return dirs;
  }

  /**
   * Configure documents for a project
   */
  async configureDocuments(projectId: string, documentPaths: string[]): Promise<any> {
    return { success: true, message: 'Documents configured' };
  }

  /**
   * Check if a directory exists
   */
  async checkDirectoryExists(dirPath: string): Promise<boolean> {
    return fs.existsSync(dirPath);
  }

  get projectDiscovery() {
    return this;
  }
}

export const GlobalConfig = {};
export const Project = class {};
