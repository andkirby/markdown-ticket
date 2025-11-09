import fs from 'fs';
import path from 'path';
import toml from '@iarna/toml';
import os from 'os';
import { MarkdownService } from '/app/shared-dist/services/MarkdownService.js';
import { ProjectService } from '/app/shared-dist/services/ProjectService.js';

const CONFIG_FILES = {
  PROJECT_CONFIG: '.mdt-config.toml',
  COUNTER_FILE: '.mdt-next'
};

/**
 * Unified Project Discovery Service (Server Implementation)
 * Uses shared logic but with server dependencies
 */
class ProjectDiscoveryService {
  constructor() {
    this.globalConfigDir = path.join(os.homedir(), '.config', 'markdown-ticket');
    this.projectsDir = path.join(this.globalConfigDir, 'projects');

    // Check for nested path (temporary fix for path mismatch issue)
    const nestedProjectsDir = path.join(this.globalConfigDir, 'markdown-ticket', 'projects');
    if (!fs.existsSync(this.projectsDir) && fs.existsSync(nestedProjectsDir)) {
      console.log(`📁 Using nested projects directory: ${nestedProjectsDir}`);
      this.projectsDir = nestedProjectsDir;
      this.globalConfigDir = path.join(this.globalConfigDir, 'markdown-ticket');
    }

    this.globalConfigPath = path.join(this.globalConfigDir, 'config.toml');
    this.sharedProjectService = new ProjectService();
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
  getRegisteredProjects() {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return [];
      }

      const projects = [];
      const projectFiles = fs.readdirSync(this.projectsDir)
        .filter(file => file.endsWith('.toml'));

      for (const file of projectFiles) {
        try {
          const registryFilePath = path.join(this.projectsDir, file);
          const content = fs.readFileSync(registryFilePath, 'utf8');
          const projectData = toml.parse(content);

          // Read the actual project data from local config file
          // Handle both registry formats: projectData.projectPath (new) and projectData.project?.path (legacy)
          const projectPath = projectData.projectPath || projectData.project?.path || '';
          const localConfig = this.getProjectConfig(projectPath);
          
          const project = {
            id: path.basename(file, '.toml'),
            project: {
              name: localConfig?.project?.name || projectData.project?.name || 'Unknown Project',
              path: projectPath, // Use the resolved projectPath instead of the missing projectData.project.path
              configFile: path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG),
              active: projectData.project?.active !== false,
              description: localConfig?.project?.description || projectData.project?.description || '',
              code: localConfig?.project?.code || '',
              crsPath: localConfig?.project?.path || 'docs/CRs',
              repository: localConfig?.project?.repository || '',
              startNumber: localConfig?.project?.startNumber || 1,
              counterFile: localConfig?.project?.counterFile || '.mdt-next'
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
  getProjectConfig(projectPath) {
    try {
      const configPath = path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG);
      
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const content = fs.readFileSync(configPath, 'utf8');
      const config = toml.parse(content);
      
      if (config && config.project && 
          typeof config.project.name === 'string' &&
          typeof config.project.code === 'string') {
        return config;
      }
      
      return null;
    } catch (error) {
      console.error(`Error reading project config from ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Get all projects (registered + auto-discovered)
   */
  async getAllProjects() {
    const registered = this.getRegisteredProjects();
    
    const globalConfig = this.getGlobalConfig();
    
    if (globalConfig.discovery?.autoDiscover) {
      const searchPaths = globalConfig.discovery?.searchPaths || [];
      const discovered = this.sharedProjectService.autoDiscoverProjects(searchPaths);
      
      // Create sets for both path and id to avoid duplicates
      const registeredPaths = new Set(registered.map(p => p.project.path));
      const registeredIds = new Set(registered.map(p => p.id));
      
      const uniqueDiscovered = discovered.filter(p => 
        !registeredPaths.has(p.project.path) && !registeredIds.has(p.id)
      );
      
      // Combine and deduplicate by id (in case of any remaining duplicates)
      const allProjects = [...registered, ...uniqueDiscovered];
      const seenIds = new Set();
      
      return allProjects.filter(project => {
        if (seenIds.has(project.id)) {
          return false;
        }
        seenIds.add(project.id);
        return true;
      });
    }
    
    return registered;
  }

  /**
   * Get CRs for a specific project using shared MarkdownService
   */
  async getProjectCRs(projectPath) {
    try {
      const config = this.getProjectConfig(projectPath);
      if (!config || !config.project) {
        return [];
      }

      const crPath = config.project.path || 'docs/CRs';
      const fullCRPath = path.resolve(projectPath, crPath);

      if (!fs.existsSync(fullCRPath)) {
        return [];
      }

      // Use shared MarkdownService for consistent parsing
      return await MarkdownService.scanMarkdownFiles(fullCRPath, projectPath);
    } catch (error) {
      console.error(`Error getting CRs for project ${projectPath}:`, error);
      return [];
    }
  }
}

export default ProjectDiscoveryService;
