import fs from 'fs';
import path from 'path';
import toml from 'toml';
import os from 'os';
// Temporarily unused until shared services are migrated
// interface ProjectService {
//   autoDiscoverProjects(searchPaths: string[]): Project[];
// }
// interface MarkdownService {
//   scanMarkdownFiles(fullCRPath: string, projectPath: string): Promise<Ticket[]>;
// }
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
        this.projectServiceInitialized = false;
        this.globalConfigDir = path.join(os.homedir(), '.config', 'markdown-ticket');
        this.projectsDir = path.join(this.globalConfigDir, 'projects');
        this.globalConfigPath = path.join(this.globalConfigDir, 'config.toml');
        // Will be initialized with dynamic import
        this.sharedProjectService = null;
        // Initialize the shared ProjectService asynchronously
        this.initializeProjectService();
        // Cache for project discovery results
        this.cache = {
            projects: null,
            timestamp: 0,
            ttl: 30000 // 30 seconds cache TTL
        };
    }
    /**
     * Initialize the shared ProjectService asynchronously
     */
    async initializeProjectService() {
        try {
            // For now, implement simple auto-discovery directly here
            // to avoid dependency issues with shared services
            this.sharedProjectService = {
                autoDiscoverProjects: (searchPaths) => this.simpleAutoDiscover(searchPaths)
            };
            this.projectServiceInitialized = true;
            console.log('✅ Simple auto-discovery initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize auto-discovery:', error);
            // Fallback to stub
            this.sharedProjectService = {
                autoDiscoverProjects: (_searchPaths) => []
            };
            this.projectServiceInitialized = true;
        }
    }
    /**
     * Simple auto-discovery implementation without external dependencies
     */
    simpleAutoDiscover(searchPaths) {
        const discovered = [];
        console.log('🔍 Auto-discovery scanning for .mdt-config.toml files in configured paths:', searchPaths);
        for (const searchPath of searchPaths) {
            try {
                console.log(`🔍 Checking path: ${searchPath}, exists: ${fs.existsSync(searchPath)}`);
                if (fs.existsSync(searchPath)) {
                    this.scanDirectoryForProjectsSimple(searchPath, discovered, 2); // Max depth 2 for performance
                }
            }
            catch (error) {
                console.error(`Error scanning ${searchPath}:`, error);
            }
        }
        console.log(`🔍 Auto-discovery complete. Found ${discovered.length} projects with .mdt-config.toml:`);
        discovered.forEach(p => console.log(`  - ${p.project.name} (${p.project.code}) at ${p.project.path}`));
        return discovered;
    }
    /**
     * Simple recursive scan for project configurations
     */
    scanDirectoryForProjectsSimple(dirPath, discovered, maxDepth) {
        if (maxDepth <= 0)
            return;
        try {
            const configPath = path.join(dirPath, CONFIG_FILES.PROJECT_CONFIG);
            if (fs.existsSync(configPath)) {
                try {
                    const content = fs.readFileSync(configPath, 'utf8');
                    const config = toml.parse(content);
                    if (config.project &&
                        typeof config.project.name === 'string' &&
                        typeof config.project.code === 'string') {
                        const directoryName = path.basename(dirPath);
                        const projectId = config.project.id || directoryName;
                        const project = {
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
                            }
                        };
                        discovered.push(project);
                        console.log(`✅ Found project: ${config.project.name} (${config.project.code}) at ${dirPath}`);
                    }
                }
                catch (error) {
                    console.error(`Error parsing config at ${configPath}:`, error);
                }
            }
            // Continue scanning subdirectories
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    this.scanDirectoryForProjectsSimple(path.join(dirPath, entry.name), discovered, maxDepth - 1);
                }
            }
        }
        catch (error) {
            // Silently skip directories we can't read
        }
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
        }
        catch (error) {
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
                    const projectData = toml.parse(content);
                    // Read the actual project data from local config file
                    const localConfig = this.getProjectConfig(projectData.project?.path || '');
                    const project = {
                        id: path.basename(file, '.toml'),
                        project: {
                            name: localConfig?.project?.name || projectData.project?.name || 'Unknown Project',
                            path: projectData.project?.path || '',
                            configFile: path.join(projectData.project?.path || '', CONFIG_FILES.PROJECT_CONFIG),
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
                }
                catch (error) {
                    console.error(`Error parsing project file ${file}:`, error);
                }
            }
            return projects;
        }
        catch (error) {
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
        }
        catch (error) {
            console.error(`Error reading project config from ${projectPath}:`, error);
            return null;
        }
    }
    /**
     * Get all projects (registered + auto-discovered)
     */
    async getAllProjects() {
        const now = Date.now();
        // Wait for ProjectService to be initialized
        let attempts = 0;
        while (!this.projectServiceInitialized && attempts < 50) { // 5 seconds max
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        // Temporarily disable cache for debugging
        if (this.cache.projects && (now - this.cache.timestamp) < this.cache.ttl) {
            return this.cache.projects;
        }
        const registered = this.getRegisteredProjects();
        const globalConfig = this.getGlobalConfig();
        console.log('🔧 Global config:', JSON.stringify(globalConfig, null, 2));
        if (globalConfig.discovery?.autoDiscover) {
            const searchPaths = globalConfig.discovery?.searchPaths || [];
            console.log('🔧 Auto-discovery enabled with searchPaths:', searchPaths);
            const discovered = this.sharedProjectService?.autoDiscoverProjects?.(searchPaths) || [];
            console.log('🔧 > Discovered projects:', discovered.length);
            // Create sets for both path and id to avoid duplicates
            const registeredPaths = new Set(registered.map(p => p.project.path));
            const registeredIds = new Set(registered.map(p => p.id));
            const uniqueDiscovered = discovered.filter((p) => !registeredPaths.has(p.project.path) && !registeredIds.has(p.id));
            // Combine and deduplicate by id (in case of any remaining duplicates)
            const allProjects = [...registered, ...uniqueDiscovered];
            const seenIds = new Set();
            const result = allProjects.filter(project => {
                if (seenIds.has(project.id)) {
                    return false;
                }
                seenIds.add(project.id);
                return true;
            });
            // Cache the result
            this.cache.projects = result;
            this.cache.timestamp = now;
            return result;
        }
        else {
            console.log('‼️Projects auto discover disabled..');
        }
        // Cache registered projects too
        this.cache.projects = registered;
        this.cache.timestamp = now;
        return registered;
    }
    /**
     * Clear the project cache
     */
    clearCache() {
        this.cache.projects = null;
        this.cache.timestamp = 0;
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
            // Import shared service - use dynamic import to avoid bundling issues
            const sharedModule = await import('../shared/services/MarkdownService');
            const { MarkdownService } = sharedModule;
            return await MarkdownService.scanMarkdownFiles(fullCRPath, projectPath);
        }
        catch (error) {
            console.error(`Error getting CRs for project ${projectPath}:`, error);
            return [];
        }
    }
}
export default ProjectDiscoveryService;
//# sourceMappingURL=projectDiscovery.js.map