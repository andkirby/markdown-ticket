import fs from 'fs';
import path from 'path';
import toml from 'toml';
import os from 'os';

class ProjectDiscoveryService {
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
          const projectPath = path.join(this.projectsDir, file);
          const content = fs.readFileSync(projectPath, 'utf8');
          const config = toml.parse(content);
          
          // Add the project ID from filename
          config.id = path.basename(file, '.toml');
          
          // Verify project still exists and has valid config
          if (this.validateProject(config)) {
            projects.push(config);
          }
        } catch (error) {
          console.error(`Error reading project config ${file}:`, error);
        }
      }

      return projects.filter(p => p.project.active !== false);
    } catch (error) {
      console.error('Error getting registered projects:', error);
      return [];
    }
  }

  /**
   * Validate that a project configuration is valid and accessible
   */
  validateProject(projectConfig) {
    try {
      if (!projectConfig.project || !projectConfig.project.path) {
        return false;
      }

      const projectPath = projectConfig.project.path;
      const configFile = projectConfig.project.configFile || '.mdt-config.toml';
      const localConfigPath = path.join(projectPath, configFile);

      // Check if project directory exists
      if (!fs.existsSync(projectPath)) {
        return false;
      }

      // Check if local config exists
      if (!fs.existsSync(localConfigPath)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get local project configuration from a project directory
   */
  getProjectConfig(projectPath) {
    try {
      const configPath = path.join(projectPath, '.mdt-config.toml');
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const content = fs.readFileSync(configPath, 'utf8');
      return toml.parse(content);
    } catch (error) {
      console.error(`Error reading project config at ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Get CRs for a specific project
   */
  getProjectCRs(projectPath) {
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

      const crFiles = fs.readdirSync(fullCRPath)
        .filter(file => file.endsWith('.md') && file.match(/^[A-Z]+-([A-Z]\d{3}|\d{3})-/));

      const crs = [];
      for (const file of crFiles) {
        try {
          const filePath = path.join(fullCRPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Parse YAML frontmatter
          const lines = content.split('\n');
          const header = {};
          let contentStart = 0;
          
          // Check if file starts with YAML frontmatter
          if (lines[0] && lines[0].trim() === '---') {
            // Find the closing ---
            let frontmatterEnd = -1;
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim() === '---') {
                frontmatterEnd = i;
                break;
              }
            }
            
            if (frontmatterEnd > 0) {
              // Parse YAML frontmatter
              const frontmatterLines = lines.slice(1, frontmatterEnd);
              for (const line of frontmatterLines) {
                const trimmed = line.trim();
                if (trimmed && trimmed.includes(':')) {
                  const colonIndex = trimmed.indexOf(':');
                  const key = trimmed.substring(0, colonIndex).trim();
                  const value = trimmed.substring(colonIndex + 1).trim();
                  if (key && value) {
                    header[key] = value;
                  }
                }
              }
              contentStart = frontmatterEnd + 1;
            }
          } else {
            // Fallback to old markdown-style parsing
            for (let i = 0; i < Math.min(20, lines.length); i++) {
              const line = lines[i].trim();
              if (line.startsWith('- **') && line.includes('**:')) {
                const match = line.match(/- \*\*([^*]+)\*\*:\s*(.+)/);
                if (match) {
                  const key = match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
                  header[key] = match[2].trim();
                }
              } else if (line.startsWith('#') && !line.startsWith('- **')) {
                contentStart = i;
                break;
              }
            }
          }

          crs.push({
            filename: file,
            path: filePath,
            header,
            title: header.titlesummary || header.title || file,
            code: header.code || file.split('-')[0] + '-' + file.split('-')[1],
            status: header.status || 'Unknown',
            priority: header.priority || 'Medium',
            type: header.type || 'Feature Enhancement',
            dateCreated: header.datecreated || null,
            content: lines.slice(contentStart).join('\n').trim()
          });
        } catch (error) {
          console.error(`Error parsing CR file ${file}:`, error);
        }
      }

      return crs.sort((a, b) => {
        const aNum = parseInt(a.code.split('-')[1]) || 0;
        const bNum = parseInt(b.code.split('-')[1]) || 0;
        return aNum - bNum;
      });
    } catch (error) {
      console.error(`Error getting CRs for project ${projectPath}:`, error);
      return [];
    }
  }

  /**
   * Auto-discover projects in specified search paths
   */
  async autoDiscoverProjects() {
    const globalConfig = this.getGlobalConfig();
    const searchPaths = globalConfig.discovery?.searchPaths || [];
    const discovered = [];

    for (const searchPath of searchPaths) {
      try {
        if (!fs.existsSync(searchPath)) {
          continue;
        }

        await this.scanDirectory(searchPath, discovered, 3); // max depth 3
      } catch (error) {
        console.error(`Error scanning ${searchPath}:`, error);
      }
    }

    return discovered;
  }

  /**
   * Recursively scan directory for .mdt-config.toml files
   */
  async scanDirectory(dirPath, discovered, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return;
    }

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      // Check if this directory has a .mdt-config.toml
      if (entries.some(entry => entry.name === '.mdt-config.toml')) {
        const config = this.getProjectConfig(dirPath);
        if (config && config.project) {
          discovered.push({
            path: dirPath,
            config,
            name: config.project.name || path.basename(dirPath),
            code: config.project.code || 'UNKNOWN'
          });
        }
      }

      // Recursively scan subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
          const subPath = path.join(dirPath, entry.name);
          await this.scanDirectory(subPath, discovered, maxDepth, currentDepth + 1);
        }
      }
    } catch (error) {
      // Ignore permission errors and continue
      if (error.code !== 'EACCES' && error.code !== 'EPERM') {
        console.error(`Error scanning directory ${dirPath}:`, error);
      }
    }
  }

  /**
   * Register a new project
   */
  registerProject(projectInfo) {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true });
      }

      const projectId = projectInfo.id || path.basename(projectInfo.path);
      const registrationPath = path.join(this.projectsDir, `${projectId}.toml`);
      
      const registration = {
        project: {
          name: projectInfo.name,
          path: projectInfo.path,
          configFile: projectInfo.configFile || '.mdt-config.toml',
          active: projectInfo.active !== false,
          description: projectInfo.description || ''
        },
        metadata: {
          dateRegistered: new Date().toISOString().split('T')[0],
          lastAccessed: new Date().toISOString().split('T')[0],
          version: projectInfo.version || '1.0.0'
        }
      };

      // Convert to TOML format manually (simple approach)
      let tomlContent = '[project]\n';
      tomlContent += `name = "${registration.project.name}"\n`;
      tomlContent += `path = "${registration.project.path}"\n`;
      tomlContent += `configFile = "${registration.project.configFile}"\n`;
      tomlContent += `active = ${registration.project.active}\n`;
      tomlContent += `description = "${registration.project.description}"\n\n`;
      tomlContent += '[metadata]\n';
      tomlContent += `dateRegistered = "${registration.metadata.dateRegistered}"\n`;
      tomlContent += `lastAccessed = "${registration.metadata.lastAccessed}"\n`;
      tomlContent += `version = "${registration.metadata.version}"\n`;

      fs.writeFileSync(registrationPath, tomlContent, 'utf8');
      return true;
    } catch (error) {
      console.error('Error registering project:', error);
      return false;
    }
  }

  /**
   * Get combined project list (registered + discovered)
   */
  async getAllProjects() {
    const registered = this.getRegisteredProjects();
    const globalConfig = this.getGlobalConfig();

    let allProjects = [...registered];

    // Add auto-discovered projects if enabled
    if (globalConfig.discovery?.autoDiscover) {
      const discovered = await this.autoDiscoverProjects();
      const registeredPaths = new Set(registered.map(p => p.project.path));
      
      // Add discovered projects that aren't already registered
      for (const disc of discovered) {
        if (!registeredPaths.has(disc.path)) {
          allProjects.push({
            id: path.basename(disc.path),
            project: {
              name: disc.name,
              path: disc.path,
              configFile: '.mdt-config.toml',
              active: true,
              description: 'Auto-discovered project'
            },
            metadata: {
              dateRegistered: 'auto-discovered',
              lastAccessed: new Date().toISOString().split('T')[0],
              version: disc.config.project.version || '1.0.0'
            },
            config: disc.config,
            autoDiscovered: true
          });
        }
      }
    }

    return allProjects;
  }
}

export default ProjectDiscoveryService;