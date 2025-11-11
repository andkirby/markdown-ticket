/**
 * Controller layer for document-related HTTP endpoints
 */
export class DocumentController {
    constructor(documentService) {
        this.documentService = documentService;
    }
    /**
     * Discover documents for a project
     */
    async getDocuments(req, res) {
        try {
            const { projectId } = req.query;
            if (!projectId) {
                res.status(400).json({ error: 'Project ID is required' });
                return;
            }
            console.log(`🔍 Documents API called for project: ${projectId}`);
            const documents = await this.documentService.discoverDocuments(projectId);
            console.log(`✅ Documents found: ${documents.length}`);
            res.json(documents);
        }
        catch (error) {
            console.error('Error discovering documents:', error.message);
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else if (error.message === 'No document configuration found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to discover documents' });
            }
        }
    }
    /**
     * Get document content
     */
    async getDocumentContent(req, res) {
        try {
            const { projectId, filePath } = req.query;
            if (!projectId || !filePath) {
                res.status(400).json({ error: 'Project ID and file path are required' });
                return;
            }
            console.log(`📄 Loading document for project ${projectId}: ${filePath}`);
            const content = await this.documentService.getDocumentContent(projectId, filePath);
            res.send(content);
        }
        catch (error) {
            console.error('Error reading document:', error);
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else if (error.message === 'Invalid file path') {
                res.status(403).json({ error: error.message });
            }
            else if (error.message === 'Only markdown files are allowed') {
                res.status(400).json({ error: error.message });
            }
            else if (error.message === 'Access denied') {
                res.status(403).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to read document' });
            }
        }
    }
}
//# sourceMappingURL=DocumentController.js.map