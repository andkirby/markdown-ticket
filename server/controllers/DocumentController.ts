import { Request, Response } from 'express';

// Type definitions
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  size?: number;
  lastModified?: Date;
  metadata?: Record<string, any>;
}

interface DocumentService {
  discoverDocuments(projectId: string): Promise<TreeNode[]>;
  getDocumentContent(projectId: string, filePath: string): Promise<string>;
}

interface AuthenticatedRequest extends Request {
  query: {
    projectId?: string;
    filePath?: string;
  };
}

/**
 * Controller layer for document-related HTTP endpoints
 */
export class DocumentController {
  private documentService: DocumentService;

  constructor(documentService: DocumentService) {
    this.documentService = documentService;
  }

  /**
   * Discover documents for a project
   */
  async getDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.query;

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' });
        return;
      }

      console.log(`🔍 Documents API called for project: ${projectId}`);

      const documents = await this.documentService.discoverDocuments(projectId);
      console.log(`✅ Documents found: ${documents.length}`);
      res.json(documents);
    } catch (error: any) {
      console.error('Error discovering documents:', error.message);

      if (error.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
      } else if (error.message === 'No document configuration found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to discover documents' });
      }
    }
  }

  /**
   * Get document content
   */
  async getDocumentContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, filePath } = req.query;

      if (!projectId || !filePath) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and file path are required' });
        return;
      }

      console.log(`📄 Loading document for project ${projectId}: ${filePath}`);

      const content = await this.documentService.getDocumentContent(projectId, filePath);
      res.send(content);
    } catch (error: any) {
      console.error('Error reading document:', error);

      if (error.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
      } else if (error.message === 'Invalid file path') {
        res.status(403).json({ error: 'Forbidden', message: error.message });
      } else if (error.message === 'Only markdown files are allowed') {
        res.status(400).json({ error: 'Bad Request', message: error.message });
      } else if (error.message === 'Access denied') {
        res.status(403).json({ error: 'Forbidden', message: error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to read document' });
      }
    }
  }
}