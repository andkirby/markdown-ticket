import * as fs from 'fs-extra';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as toml from 'toml';
import { Project, ProjectInfo, ServerConfig } from '../types/index.js';

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

    console.error('🔍 Starting project discovery...');
    this.projects.clear();

    for (const scanPath of this.config.discovery.scanPaths) {
      try {
        const expandedPath = this.expandPath(scanPath);
        console.error(`🔍 Scanning path: ${scanPath} -> ${expandedPath}`);
        await this.scanDirectory(expandedPath, 0);
      } catch (error) {
        console.warn(`Failed to scan path ${scanPath}:`, error);
      }
    }

    this.lastScan = now;
    console.error(`📁 Discovered ${this.projects.size} projects`);
    
    return Array.from(this.projects.values());
  }

  getCachedProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  private async scanDirectory(dirPath: string, currentDepth: number): Promise<void> {
    if (currentDepth >= this.config.discovery.maxDepth) {
      return;
    }

    if (!await fs.pathExists(dirPath)) {
      return;
    }

    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      return;
    }

    // Check if this directory should be excluded
    const dirName = path.basename(dirPath);
    if (this.config.discovery.excludePaths.includes(dirName)) {
      return;
    }

    try {
      // Look for config files matching *-config.toml pattern
      const configFiles = await glob('*-config.toml', { 
        cwd: dirPath,
        absolute: true,
        dot: true  // Include hidden files starting with dot
      });
      
      if (configFiles.length > 0) {
        console.error(`🔍 Found ${configFiles.length} config files in ${dirPath}:`, configFiles);
      }

      for (const configFile of configFiles) {
        try {
          console.error(`🔍 Loading project from: ${configFile}`);
          const project = await this.loadProject(configFile);
          if (project) {
            console.error(`✅ Successfully loaded project: ${project.id} - ${project.project.name}`);
            this.projects.set(project.id, project);
          } else {
            console.error(`❌ Project loading returned null for: ${configFile}`);
          }
        } catch (error) {
          console.warn(`Failed to load project config ${configFile}:`, error);
        }
      }

      // Recursively scan subdirectories
      const entries = await fs.readdir(dirPath);
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory() && !this.config.discovery.excludePaths.includes(entry)) {
          await this.scanDirectory(fullPath, currentDepth + 1);
        }
      }
    } catch (error) {
      // Directory might not be accessible, skip silently
    }
  }

  private async loadProject(configPath: string): Promise<Project | null> {
    try {
      const configContent = await readFile(configPath, 'utf-8');
      const config = toml.parse(configContent);

      if (!config.project) {
        return null;
      }

      const projectDir = path.dirname(configPath);
      const crDir = path.resolve(projectDir, config.project.path || 'docs/CRs');
      
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
          startNumber: config.project.startNumber || 1,
          counterFile: config.project.counterFile || '.mdt-next',
          description: config.project.description,
          repository: config.project.repository,
        },
        metadata: {
          dateRegistered: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          version: '1.0.0'
        },
        autoDiscovered: true,
        configPath
      };

      return project;
    } catch (error) {
      console.warn(`Failed to parse config file ${configPath}:`, error);
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