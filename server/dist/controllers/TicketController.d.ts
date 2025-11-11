import { Request, Response } from 'express';
interface TaskResult {
    success: boolean;
    message: string;
    filename?: string;
}
interface AuthenticatedRequest extends Request {
    params: {
        filename?: string;
        projectId?: string;
    };
    body: {
        filename?: string;
        content?: string;
        filepath?: string;
        oldFilepath?: string;
        action?: string;
    };
}
interface FileSystemService {
    getAllTasks(): Promise<string[]>;
    getTask(filename: string): Promise<string>;
    saveTask(filename: string, content: string): Promise<TaskResult>;
    deleteTask(filename: string): Promise<TaskResult>;
}
/**
 * Controller layer for ticket/task operations (legacy and duplicate detection)
 */
export declare class TicketController {
    private fileSystemService;
    constructor(fileSystemService: FileSystemService);
    /**
     * Get all task files (legacy)
     */
    getAllTasks(req: Request, res: Response): Promise<void>;
    /**
     * Get individual task file (legacy)
     */
    getTask(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Save task file (legacy)
     */
    saveTask(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Delete task file (legacy)
     */
    deleteTask(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Find duplicate tickets
     */
    getDuplicates(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Preview rename changes for duplicate
     */
    previewDuplicateRename(req: Request, res: Response): Promise<void>;
    /**
     * Resolve duplicate by renaming or deleting
     */
    resolveDuplicateTicket(req: Request, res: Response): Promise<void>;
}
export {};
