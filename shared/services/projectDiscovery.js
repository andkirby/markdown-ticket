import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import toml from 'toml';

export class SharedProjectDiscoveryService {
  constructor() {
    this.globalConfigDir = path.join(os.homedir(), '.config', 'markdown-ticket');
    this.projectsDir = path.join(this.globalConfigDir, 'projects');
    this.globalConfigPath = path.join(this.globalConfigDir, 'config.toml');
  }

  /**
   * Auto-discover projects by scanning for .mdt-config.toml files
   */
  autoDiscoverProjects(searchPaths = []) {
    console.log('🔍 DEBUG: autoDiscoverProjects() called with paths:', searchPaths);
    const discovered = [];
    const defaultPaths = [
      path.join(os.homedir(), 'home'),
      path.join(os.homedir(), 'Documents'),
      path.join(os.homedir(), 'Projects'),
      path.join(os.homedir(), 'Development'),
      path.join(os.homedir(), 'dev'),
      path.join(os.homedir(), 'workspace')
    ];

    // Handle both string and array inputs
    let pathsToScan = [];
    if (typeof searchPaths === 'string') {
      pathsToScan = [searchPaths];
    } else if (Array.isArray(searchPaths) && searchPaths.length > 0) {
      pathsToScan = searchPaths;
    } else {
      pathsToScan = defaultPaths;
    }
    
    console.log('🔍 DEBUG: Scanning paths:', pathsToScan);

    for (const searchPath of pathsToScan) {
      try {
        const expandedPath = this.expandPath(searchPath);
        console.log('🔍 DEBUG: Scanning expanded path:', expandedPath);
        if (fs.existsSync(expandedPath)) {
          this.scanDirectoryForProjects(expandedPath, discovered, 0, 3);
        }
      } catch (error) {
        console.warn(`Failed to scan path ${searchPath}:`, error);
      }
    }

    console.log('🔍 DEBUG: Auto-discovered projects:', discovered.length);
    return discovered;
  }

  scanDirectoryForProjects(dirPath, discovered, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) return;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      // Look for .mdt-config.toml files
      const configFile = entries.find(entry => 
        entry.isFile() && entry.name === '.mdt-config.toml'
      );

      if (configFile) {
        console.log('🔍 DEBUG: Found .mdt-config.toml in:', dirPath);
        const project = this.loadProjectFromConfig(path.join(dirPath, '.mdt-config.toml'), dirPath);
        if (project) {
          console.log('🔍 DEBUG: Successfully loaded project:', project.id);
          discovered.push(project);
        }
      }

      // Recursively scan subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldExcludeDirectory(entry.name)) {
          this.scanDirectoryForProjects(
            path.join(dirPath, entry.name), 
            discovered, 
            currentDepth + 1, 
            maxDepth
          );
        }
      }
    } catch (error) {
      // Directory might not be accessible, skip silently
    }
  }

  loadProjectFromConfig(configPath, projectDir) {
    try {
      console.log('🔍 DEBUG: Loading config from:', configPath);
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = toml.parse(configContent);
      console.log('🔍 DEBUG: Parsed config:', config);

      if (!config.project) {
        console.log('🔍 DEBUG: No project section in config');
        return null;
      }

      const projectId = path.basename(projectDir);
      const crPath = path.resolve(projectDir, config.project.path || 'docs/CRs');

      const project = {
        id: projectId,
        project: {
          name: config.project.name || projectId,
          code: config.project.code || projectId.toUpperCase(),
          path: projectDir,
          configFile: configPath,
          startNumber: config.project.startNumber || 1,
          counterFile: config.project.counterFile || '.mdt-next',
          active: true,
          description: config.project.description || '',
          repository: config.project.repository || '',
          crsPath: config.project.path || 'docs/CRs'
        },
        metadata: {
          dateRegistered: new Date().toISOString().split('T')[0],
          lastAccessed: new Date().toISOString().split('T')[0],
          version: '1.0.0'
        },
        autoDiscovered: true,
        configPath
      };

      console.log('🔍 DEBUG: Created project object:', project);
      return project;
    } catch (error) {
      console.warn(`Failed to load project config ${configPath}:`, error);
      return null;
    }
  }

  shouldExcludeDirectory(dirName) {
    const excludePatterns = [
      'node_modules', '.git', '.svn', '.hg',
      'build', 'dist', 'target', 'bin',
      '.vscode', '.idea', '.DS_Store',
      'coverage', 'test-results'
    ];
    return excludePatterns.includes(dirName) || dirName.startsWith('.');
  }

  expandPath(inputPath) {
    if (inputPath.startsWith('~/')) {
      return path.join(os.homedir(), inputPath.slice(2));
    }
    return path.resolve(inputPath);
  }
}
