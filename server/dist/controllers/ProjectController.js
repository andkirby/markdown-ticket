/**
 * Controller layer for project-related HTTP endpoints
 */
export class ProjectController {
    constructor(projectService, ticketService, fileSystemService, fileWatcher) {
        this.projectService = projectService;
        this.ticketService = ticketService;
        this.fileSystemService = fileSystemService;
        this.fileWatcher = fileWatcher;
    }
    /**
     * Get all projects
     */
    async getAllProjects(req, res) {
        try {
            const projects = await this.projectService.getAllProjects();
            res.json(projects);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get projects' });
        }
    }
    /**
     * Get project configuration
     */
    async getProjectConfig(req, res) {
        const { projectId } = req.params;
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }
        try {
            const result = await this.projectService.getProjectConfig(projectId);
            res.json(result);
        }
        catch (error) {
            console.error('Error getting project config:', error);
            if (error.message === 'Project not found' || error.message === 'Project configuration not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get project configuration' });
            }
        }
    }
    /**
     * Get CRs for a project
     */
    async getProjectCRs(req, res) {
        const { projectId } = req.params;
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }
        try {
            const crs = await this.ticketService.getProjectCRs(projectId);
            res.json(crs);
        }
        catch (error) {
            console.error('Error getting project CRs:', error);
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get project CRs' });
            }
        }
    }
    /**
     * Get specific CR
     */
    async getCR(req, res) {
        try {
            const { projectId, crId } = req.params;
            if (!projectId || !crId) {
                res.status(400).json({ error: 'Project ID and CR ID are required' });
                return;
            }
            const cr = await this.ticketService.getCR(projectId, crId);
            res.json(cr);
        }
        catch (error) {
            console.error('Error getting CR:', error);
            if (error.message === 'Project not found' || error.message === 'CR not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get CR' });
            }
        }
    }
    /**
     * Create new CR
     */
    async createCR(req, res) {
        try {
            const { projectId } = req.params;
            if (!projectId) {
                res.status(400).json({ error: 'Project ID is required' });
                return;
            }
            const result = await this.ticketService.createCR(projectId, req.body);
            console.log(`Created CR: ${result.filename} in project ${projectId}`);
            res.json(result);
        }
        catch (error) {
            console.error('Error creating CR:', error);
            if (error.message.includes('required')) {
                res.status(400).json({ error: error.message });
            }
            else if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to create CR' });
            }
        }
    }
    /**
     * Partially update CR
     */
    async patchCR(req, res) {
        try {
            const { projectId, crId } = req.params;
            if (!projectId || !crId) {
                res.status(400).json({ error: 'Project ID and CR ID are required' });
                return;
            }
            const result = await this.ticketService.updateCRPartial(projectId, crId, req.body);
            console.log(`Successfully updated CR: ${crId} in project ${projectId}`);
            res.json(result);
        }
        catch (error) {
            console.error('Error updating CR partially:', error);
            if (error.message === 'No fields provided for update') {
                res.status(400).json({ error: error.message });
            }
            else if (error.message === 'Project not found' || error.message === 'CR not found') {
                res.status(404).json({ error: error.message });
            }
            else if (error.message.includes('Invalid ticket format')) {
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to update CR' });
            }
        }
    }
    /**
     * Update CR completely
     */
    async updateCR(req, res) {
        try {
            const { projectId, crId } = req.params;
            const { content } = req.body;
            if (!projectId || !crId) {
                res.status(400).json({ error: 'Project ID and CR ID are required' });
                return;
            }
            console.log(`PUT /api/projects/${projectId}/crs/${crId} - Received update request`);
            console.log('Request body content length:', content ? content.length : 0);
            const result = await this.ticketService.updateCR(projectId, crId, content);
            console.log(`Updated CR: ${result.filename} in project ${projectId}`);
            res.json(result);
        }
        catch (error) {
            console.error('Error updating CR:', error);
            if (error.message === 'Content is required') {
                res.status(400).json({ error: error.message });
            }
            else if (error.message === 'Project not found' || error.message === 'CR not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to update CR' });
            }
        }
    }
    /**
     * Delete CR
     */
    async deleteCR(req, res) {
        try {
            const { projectId, crId } = req.params;
            if (!projectId || !crId) {
                res.status(400).json({ error: 'Project ID and CR ID are required' });
                return;
            }
            const result = await this.ticketService.deleteCR(projectId, crId);
            console.log(`Deleted CR: ${result.filename} from project ${projectId}`);
            res.json(result);
        }
        catch (error) {
            console.error('Error deleting CR:', error);
            if (error.message === 'Project not found' || error.message === 'CR not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to delete CR' });
            }
        }
    }
    /**
     * Create new project
     */
    async createProject(req, res) {
        try {
            const result = await this.projectService.createProject(req.body);
            // File watcher will automatically detect the new .toml file
            // and emit the 'project-created' event - no manual emission needed
            res.json(result);
        }
        catch (error) {
            console.error('Error creating project:', {
                message: error.message,
                stack: error.stack,
                code: error.code,
                errno: error.errno,
                path: error.path
            });
            if (error.message.includes('required') || error.message.includes('already exists')) {
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to create project', details: error.message });
            }
        }
    }
    /**
     * Update existing project
     */
    async updateProject(req, res) {
        try {
            const { code } = req.params;
            if (!code) {
                res.status(400).json({ error: 'Project code is required' });
                return;
            }
            console.log(`Updating project ${code} with data:`, req.body);
            const result = await this.projectService.updateProject(code, req.body);
            res.json(result);
        }
        catch (error) {
            console.error('Error updating project:', error);
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to update project' });
            }
        }
    }
    /**
     * Get system directories
     */
    async getSystemDirectories(req, res) {
        try {
            const { path: requestPath } = req.query;
            const result = await this.projectService.getSystemDirectories(requestPath);
            res.json(result);
        }
        catch (error) {
            console.error('Error listing directories:', error);
            if (error.message.includes('Access denied')) {
                res.status(403).json({ error: error.message });
            }
            else if (error.message.includes('not found') || error.message.includes('not accessible')) {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to list directories' });
            }
        }
    }
    /**
     * Get file system tree
     */
    async getFileSystemTree(req, res) {
        try {
            const { projectId } = req.query;
            console.log(`🗂️ Filesystem API called for project: ${projectId}`);
            if (!projectId) {
                res.status(400).json({ error: 'Project ID is required' });
                return;
            }
            const items = await this.fileSystemService.buildProjectFileSystemTree(projectId, this.projectService.projectDiscovery);
            console.log(`🗂️ Found ${items.length} items`);
            res.json(items);
        }
        catch (error) {
            console.error('Error loading file system:', error);
            if (error.message === 'Project not found' || error.message === 'Path not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to load file system' });
            }
        }
    }
    /**
     * Configure document paths
     */
    async configureDocuments(req, res) {
        const { projectId, documentPaths } = req.body;
        console.log(`📝 Configure documents for project: ${projectId}`);
        console.log(`📝 Document paths: ${JSON.stringify(documentPaths)}`);
        if (!projectId || !Array.isArray(documentPaths)) {
            res.status(400).json({ error: 'Project ID and document paths are required' });
            return;
        }
        try {
            await this.projectService.configureDocuments(projectId, documentPaths);
            console.log(`✅ Document paths configured successfully`);
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error configuring documents:', error);
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else if (error.message.includes('must be an array')) {
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to configure documents' });
            }
        }
    }
}
//# sourceMappingURL=ProjectController.js.map