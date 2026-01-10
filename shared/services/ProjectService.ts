import {Project} from '../models/Project.js';
import {Ticket} from '../models/Ticket.js';
import {DEFAULTS, CONFIG_FILES} from '../utils/constants.js';
import {logQuiet} from '../utils/logger.js';
import {directoryExists, fileExists, deleteFile} from '../utils/file-utils.js';
import {resolvePath, buildConfigFilePath, buildProjectPath} from '../utils/path-resolver.js';
import {
    IProjectService,
    IProjectDiscoveryService,
    IProjectConfigService,
    IProjectCacheService,
    IProjectFileSystemService
} from './project/types.js';
import {ProjectDiscoveryService} from './project/ProjectDiscoveryService.js';
import {ProjectConfigService} from './project/ProjectConfigService.js';
import {ProjectCacheService} from './project/ProjectCacheService.js';


export class ProjectService implements IProjectService {
    private discovery: IProjectDiscoveryService;
    private config: IProjectConfigService;
    private cache: IProjectCacheService;
    private fs: IProjectFileSystemService;
    private quiet: boolean;

    constructor(quietOrDiscovery?: IProjectDiscoveryService | boolean, c?: IProjectConfigService, ca?: IProjectCacheService, f?: IProjectFileSystemService, quiet?: boolean) {
        // Handle legacy signature: new ProjectService(quiet: boolean)
        if (typeof quietOrDiscovery === 'boolean') {
            this.quiet = quietOrDiscovery;
            this.discovery = new ProjectDiscoveryService(quietOrDiscovery);
            this.config = new ProjectConfigService(quietOrDiscovery);
            this.cache = new ProjectCacheService(quietOrDiscovery, 30000);
            this.fs = new ProjectFileSystemService(quietOrDiscovery);
        } else {
            // New signature with dependency injection
            this.quiet = quiet || false;
            this.discovery = quietOrDiscovery || new ProjectDiscoveryService(this.quiet);
            this.config = c || new ProjectConfigService(this.quiet);
            this.cache = ca || new ProjectCacheService(this.quiet, 30000);
            this.fs = f || new ProjectFileSystemService(this.quiet);
        }
    }

    // Config
    getGlobalConfig() {
        return this.config.getGlobalConfig();
    }

    getProjectConfig(p: string) {
        return this.config.getProjectConfig(p);
    }

    createOrUpdateLocalConfig(projectId: string, projectPath: string,
                              name: string, code: string, description?: string,
                              repository?: string, globalOnly?: boolean, ticketsPath?: string) {
        return this.config.createOrUpdateLocalConfig(projectId, projectPath, name, code, description, repository, globalOnly, ticketsPath);
    }

    updateProject(id: string, u: any) {
        this.config.updateProject(id, u);
        this.clearCache();
    }

    async configureDocuments(id: string, p: string[]): Promise<void> {
        // Find project from registered or auto-discovered projects
        const allProjects = await this.getAllProjects();
        const project = allProjects.find(proj => proj.id === id);

        if (!project) {
            throw new Error('Project not found');
        }

        // Use project path directly instead of relying on registry
        return this.configureDocumentsByPath(id, project.project.path, p);
    }

    async configureDocumentsByPath(id: string, projectPath: string, p: string[]): Promise<void> {
        return this.config.configureDocumentsByPath(id, projectPath, p);
    }

    // Discovery
    getRegisteredProjects() {
        return this.discovery.getRegisteredProjects();
    }

    autoDiscoverProjects(p: string[]) {
        return this.discovery.autoDiscoverProjects(p);
    }

    registerProject(p: Project, documentDiscoverySettings?: {
        paths?: string[];
        maxDepth?: number;
    }) {
        return this.discovery.registerProject(p, documentDiscoverySettings);
    }

    // Cache
    async getAllProjects(bypassCache = false): Promise<Project[]> {
        if (!bypassCache) {
            const cached = await this.cache.getAllProjectsFromCache();
            if (cached) return cached;
        }

        const registered = this.getRegisteredProjects();
        const globalConfig = this.getGlobalConfig();
        let allProjects = registered;

        if (globalConfig.discovery?.autoDiscover) {
            const discovered = this.autoDiscoverProjects(globalConfig.discovery.searchPaths || []);
            const registeredPaths = new Set(registered.map(p => p.project.path));
            const registeredIds = new Set(registered.map(p => p.id));
            const uniqueDiscovered = discovered.filter(p => !registeredPaths.has(p.project.path) && !registeredIds.has(p.id));
            allProjects = [...registered, ...uniqueDiscovered];
            const seenIds = new Set<string>();
            allProjects = allProjects.filter(p => {
                if (seenIds.has(p.id)) return false;
                seenIds.add(p.id);
                return true;
            });
        }

        this.cache.setCachedProjects(allProjects);
        return allProjects;
    }

    clearCache() {
        this.cache.clearCache();
    }

    isCacheValid() {
        return this.cache.isCacheValid();
    }

    getCacheAge() {
        return this.cache.getCacheAge();
    }

    setCacheTTL(t: number) {
        this.cache.setCacheTTL(t);
    }

    getAllProjectsFromCache() {
        return this.cache.getAllProjectsFromCache();
    }

    setCachedProjects(p: Project[]) {
        this.cache.setCachedProjects(p);
    }

    // Operations
    async getProjectCRs(path: string): Promise<Ticket[]> {
        try {
            const config = this.getProjectConfig(path);
            if (!config?.project) return [];
            const ticketsPath = config.project.ticketsPath || DEFAULTS.TICKETS_PATH;
            const fullCRPath = resolvePath(path, ticketsPath);
            if (!directoryExists(fullCRPath)) return [];
            const {MarkdownService} = await import('./MarkdownService.js');
            return await MarkdownService.scanMarkdownFiles(fullCRPath, path);
        } catch (e) {
            logQuiet(this.quiet, `Error getting CRs for project ${path}:`, e);
            return [];
        }
    }

    async deleteProject(id: string, deleteLocal = true): Promise<void> {
        try {
            const allProjects = await this.getAllProjects();
            const project = allProjects.find(p => p.id === id || p.project.code === id);
            if (project?.project.path && deleteLocal) {
                const configPath = buildConfigFilePath(project.project.path, CONFIG_FILES.PROJECT_CONFIG);
                if (fileExists(configPath)) deleteFile(configPath);
                const counterFile = buildProjectPath(project.project.path, CONFIG_FILES.COUNTER_FILE);
                if (fileExists(counterFile)) deleteFile(counterFile);
            }
            this.clearCache();
        } catch (e) {
            logQuiet(this.quiet, 'Error deleting project:', e);
            throw e;
        }
    }

    async getProjectByCodeOrId(codeOrId: string): Promise<Project | null> {
        const allProjects = await this.getAllProjects();
        return allProjects.find(p => p.id === codeOrId || p.project.code === codeOrId) || null;
    }

    async generateProjectId(name: string): Promise<string> {
        let baseId = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (!baseId) baseId = 'project';
        const allProjects = await this.getAllProjects();
        const existingIds = new Set(allProjects.map(p => p.id));
        if (!existingIds.has(baseId)) return baseId;
        let counter = 2;
        while (existingIds.has(`${baseId}-${counter}`)) counter++;
        return `${baseId}-${counter}`;
    }

    // FS
    async getSystemDirectories(p?: string) {
        return this.fs.getSystemDirectories(p);
    }

    async checkDirectoryExists(p: string) {
        return this.fs.checkDirectoryExists(p);
    }
}

class ProjectFileSystemService implements IProjectFileSystemService {
    constructor(private quiet = false) {
    }

    async getSystemDirectories(p?: string) {
        const fs = await import('fs/promises'), path = await import('path'), os = await import('os'),
            targetPath = path.resolve(p || os.homedir());
        try {
            if (!(await fs.stat(targetPath)).isDirectory()) throw new Error('Not a directory');
        } catch {
            throw new Error('Directory not found');
        }
        const entries = await fs.readdir(targetPath),
            dirs: Array<{ name: string; path: string; isDirectory: boolean }> = [];
        for (const e of entries) {
            if (e.startsWith('.')) continue;
            try {
                const ep = path.join(targetPath, e);
                if ((await fs.stat(ep)).isDirectory()) dirs.push({name: e, path: ep, isDirectory: true});
            } catch {
            }
        }
        dirs.sort((a, b) => a.name.localeCompare(b.name));
        return {
            currentPath: targetPath,
            parentPath: path.dirname(targetPath) === targetPath ? '' : path.dirname(targetPath),
            directories: dirs
        };
    }

    async checkDirectoryExists(p: string): Promise<{ exists: boolean }> {
        if (!p || typeof p !== 'string') return {exists: false};
        try {
            const fs = await import('fs/promises'), path = await import('path'), os = await import('os'),
                rp = path.resolve(p), allowed = [os.homedir(), '/tmp', '/var/tmp', process.cwd(), '/Users'];
            if (!allowed.some(ap => rp.startsWith(ap) || rp === ap)) {
                logQuiet(this.quiet, `⚠️ Path denied: ${rp}`);
                return {exists: false};
            }
            return {exists: (await fs.stat(rp)).isDirectory()};
        } catch {
            return {exists: false};
        }
    }
}