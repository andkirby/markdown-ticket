import { Request, Response } from 'express';
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
export declare class DocumentController {
    private documentService;
    constructor(documentService: DocumentService);
    /**
     * Discover documents for a project
     */
    getDocuments(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get document content
     */
    getDocumentContent(req: AuthenticatedRequest, res: Response): Promise<void>;
}
export {};
