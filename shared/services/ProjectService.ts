import fs from 'fs';
import path from 'path';
import toml from 'toml';
import os from 'os';
import { Project, ProjectConfig, validateProjectConfig } from '../models/Project.js';
import { CONFIG_FILES } from '../utils/constants.js';

/**
 * Unified Project Discovery Service
 * Handles project scanning, configuration, and management
 */
export class ProjectService {
  private globalConfigDir: string;
  private projectsDir: string;
  private globalConfigPath: string;

  constructor() {
    this.globalConfigDir = path.join(os.homedir(), '.config', 'markdown-ticket');
    this.projectsDir = path.join(this.globalConfigDir, 'projects');
    this.globalConfigPath = path.join(this.globalConfigDir, 'config.toml');
  }

  /**
   * Get global dashboard configuration
   */
  getGlobalConfig() {
    try {
      if (!fs.existsSync(this.globalConfigPath)) {
        return {
          dashboard: { port: 3002, autoRefresh: true, refreshInterval: 5000 },
          discovery: { autoDiscover: true, searchPaths: [] }
        };
      }
      
      const configContent = fs.readFileSync(this.globalConfigPath, 'utf8');
      return toml.parse(configContent);
    } catch (error) {
      console.error('Error reading global config:', error);
      return {
        dashboard: { port: 3002, autoRefresh: true, refreshInterval: 5000 },
        discovery: { autoDiscover: true, searchPaths: [] }
      };
    }
  }

  /**
   * Get all registered projects
   */
  getRegisteredProjects(): Project[] {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return [];
      }

      const projects: Project[] = [];
      const projectFiles = fs.readdirSync(this.projectsDir)
        .filter(file => file.endsWith('.toml'));

      for (const file of projectFiles) {
        try {
          const projectPath = path.join(this.projectsDir, file);
          const content = fs.readFileSync(projectPath, 'utf8');
          const projectData = toml.parse(content);
          
          // Convert to Project interface
          const project: Project = {
            id: path.basename(file, '.toml'),
            project: {
              name: projectData.project?.name || 'Unknown Project',
              path: projectData.project?.path || '',
              configFile: path.join(projectData.project?.path || '', CONFIG_FILES.PROJECT_CONFIG),
              active: projectData.project?.active !== false,
              description: projectData.project?.description || ''
            },
            metadata: {
              dateRegistered: projectData.metadata?.dateRegistered || new Date().toISOString().split('T')[0],
              lastAccessed: projectData.metadata?.lastAccessed || new Date().toISOString().split('T')[0],
              version: projectData.metadata?.version || '1.0.0'
            }
          };

          projects.push(project);
        } catch (error) {
          console.error(`Error parsing project file ${file}:`, error);
        }
      }

      return projects;
    } catch (error) {
      console.error('Error reading registered projects:', error);
      return [];
    }
  }

  /**
   * Get project configuration from local .mdt-config.toml
   */
  getProjectConfig(projectPath: string): ProjectConfig | null {
    try {
      const configPath = path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG);
      
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const content = fs.readFileSync(configPath, 'utf8');
      const config = toml.parse(content);
      
      if (validateProjectConfig(config)) {
        return config;
      }
      
      return null;
    } catch (error) {
      console.error(`Error reading project config from ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Auto-discover projects by scanning for .mdt-config.toml files
   */
  autoDiscoverProjects(searchPaths: string[] = []): Project[] {
    const discovered: Project[] = [];
    const defaultPaths = [
      os.homedir(),
      path.join(os.homedir(), 'Documents'),
      path.join(os.homedir(), 'Projects'),
      process.cwd()
    ];

    const pathsToSearch = [...new Set([...defaultPaths, ...searchPaths])];

    for (const searchPath of pathsToSearch) {
      try {
        if (fs.existsSync(searchPath)) {
          this.scanDirectoryForProjects(searchPath, discovered, 3); // Max depth 3
        }
      } catch (error) {
        console.error(`Error scanning ${searchPath}:`, error);
      }
    }

    return discovered;
  }

  /**
   * Recursively scan directory for project configurations
   */
  private scanDirectoryForProjects(dirPath: string, discovered: Project[], maxDepth: number): void {
    if (maxDepth <= 0) return;

    try {
      const configPath = path.join(dirPath, CONFIG_FILES.PROJECT_CONFIG);
      
      if (fs.existsSync(configPath)) {
        const config = this.getProjectConfig(dirPath);
        if (config) {
          const directoryName = path.basename(dirPath);

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
              console.warn(`Ignoring duplicate project ${directoryName} with code "${config.project.code}" (no ID in config)`);
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
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.scanDirectoryForProjects(path.join(dirPath, entry.name), discovered, maxDepth - 1);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }

  /**
   * Register a project in the global registry
   */
  registerProject(project: Project): void {
    try {
      // Ensure projects directory exists
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true });
      }

      const projectFile = path.join(this.projectsDir, `${project.id}.toml`);
      const projectData = {
        project: {
          name: project.project.name,
          path: project.project.path,
          active: project.project.active,
          description: project.project.description
        },
        metadata: {
          dateRegistered: project.metadata.dateRegistered,
          lastAccessed: new Date().toISOString().split('T')[0],
          version: project.metadata.version
        }
      };

      const tomlContent = this.objectToToml(projectData);
      fs.writeFileSync(projectFile, tomlContent, 'utf8');
    } catch (error) {
      console.error('Error registering project:', error);
      throw error;
    }
  }

  /**
   * Create or update local .mdt-config.toml file with proper ID field
   */
  createOrUpdateLocalConfig(projectId: string, projectPath: string, name: string, code: string, description?: string): void {
    try {
      const configPath = path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG);

      let config: any;
      if (fs.existsSync(configPath)) {
        // Read existing config
        const content = fs.readFileSync(configPath, 'utf8');
        config = toml.parse(content);
      } else {
        // Create new config structure
        config = { project: {} };
      }

      // Update project section with proper ID
      config.project = {
        ...config.project,
        id: projectId,
        name: name,
        code: code,
        description: description || config.project.description || ''
      };

      // Write updated config
      const tomlContent = this.objectToToml(config);
      fs.writeFileSync(configPath, tomlContent, 'utf8');

      console.log(`Updated local config for ${projectId} at ${configPath}`);
    } catch (error) {
      console.error('Error creating/updating local config:', error);
      throw error;
    }
  }

  /**
   * Simple TOML serializer for project data
   */
  private objectToToml(obj: any): string {
    let toml = '';
    
    for (const [section, data] of Object.entries(obj)) {
      toml += `[${section}]\n`;
      for (const [key, value] of Object.entries(data as any)) {
        if (typeof value === 'string') {
          toml += `${key} = "${value}"\n`;
        } else if (typeof value === 'boolean') {
          toml += `${key} = ${value}\n`;
        } else {
          toml += `${key} = "${value}"\n`;
        }
      }
      toml += '\n';
    }
    
    return toml;
  }
}
