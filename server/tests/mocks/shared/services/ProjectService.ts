/**
 * Mock of @mdt/shared/services/ProjectService for testing
 * Provides a functional mock that mimics the real ProjectService behavior
 */

import * as path from 'path';
import * as fs from 'fs';
import { getConfigDir } from '../../utils/constants';

export class ProjectService {
  private projectsRegistry: Map<string, any>;
  private configDir: string;

  constructor(quiet: boolean = false) {
    this.configDir = getConfigDir();
    this.projectsRegistry = new Map();
    this.loadProjectsRegistry();
  }

  /**
   * Load projects from the registry directory
   */
  private loadProjectsRegistry(): void {
    const projectsRegistryDir = path.join(this.configDir, 'projects');
    if (!fs.existsSync(projectsRegistryDir)) {
      return;
    }

    const entries = fs.readdirSync(projectsRegistryDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const configPath = path.join(projectsRegistryDir, entry.name, '.mdt-config.toml');
        if (fs.existsSync(configPath)) {
          // Load project config
          try {
            const content = fs.readFileSync(configPath, 'utf-8');
            // Parse basic TOML (simplified for testing)
            const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
            const codeMatch = content.match(/code\s*=\s*["']([^"']+)["']/);
            const ticketsPathMatch = content.match(/ticketsPath\s*=\s*["']([^"']+)["']/);

            if (nameMatch && codeMatch) {
              this.projectsRegistry.set(entry.name, {
                name: nameMatch[1],
                code: codeMatch[1],
                ticketsPath: ticketsPathMatch ? ticketsPathMatch[1] : 'docs/CRs',
                path: entry.name,
                active: true,
              });
            }
          } catch (error) {
            // Skip invalid configs
          }
        }
      }
    }
  }

  /**
   * Get all projects
   * Accepts bypassCache parameter for compatibility with controller expectations
   */
  async getAllProjects(bypassCache?: boolean): Promise<any[]> {
    console.log('[MOCK ProjectService] getAllProjects called, projectsRegistry size:', this.projectsRegistry.size);
    const result = Array.from(this.projectsRegistry.values()).map(project => ({
      id: project.code,
      project: {
        name: project.name,
        path: project.path,
        active: project.active,
      },
      configPath: path.join(this.configDir, 'projects', project.path, '.mdt-config.toml'),
    }));
    console.log('[MOCK ProjectService] Returning projects:', result.length);
    return result;
  }

  /**
   * Get project configuration by path
   */
  getProjectConfig(projectPath: string): any {
    for (const [key, project] of this.projectsRegistry.entries()) {
      if (project.path === projectPath || key === projectPath) {
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

    const ticketsDir = path.join(projectPath, config.ticketsPath);
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
