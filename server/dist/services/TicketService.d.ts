interface ProjectConfig {
    code: string;
    project?: {
        id?: string;
        name?: string;
        code?: string;
        path?: string;
        startNumber?: number;
        counterFile?: string;
        description?: string;
        repository?: string;
    };
}
interface Ticket {
    code: string;
    filePath: string;
}
interface CRData {
    code?: string;
    title: string;
    type: string;
    priority?: string;
    description?: string;
}
interface CreateCRResult {
    success: boolean;
    message: string;
    crCode: string;
    filename: string;
    path: string;
}
interface UpdateCRResult {
    success: boolean;
    message: string;
    updatedFields: string[];
    projectId: string;
    crId: string;
}
interface UpdateResult {
    success: boolean;
    message: string;
    filename?: string;
    path?: string;
}
interface DeleteResult {
    success: boolean;
    message: string;
    filename: string;
}
interface ProjectDiscovery {
    getAllProjects(): Promise<any[]>;
    getProjectConfig(projectPath: string): ProjectConfig | null;
    getProjectCRs(projectPath: string): Promise<Ticket[]>;
}
/**
 * Service layer for ticket/CR management operations
 */
export declare class TicketService {
    private projectDiscovery;
    constructor(projectDiscovery: ProjectDiscovery);
    /**
     * Get CRs for a specific project
     * @param projectId - Project ID
     * @returns Array of CR objects
     */
    getProjectCRs(projectId: string): Promise<Ticket[]>;
    /**
     * Get specific CR from a project
     * @param projectId - Project ID
     * @param crId - CR ID or code
     * @returns CR object
     */
    getCR(projectId: string, crId: string): Promise<Ticket>;
    /**
     * Create new CR in a project
     * @param projectId - Project ID
     * @param crData - CR data
     * @returns Created CR info
     */
    createCR(projectId: string, crData: CRData): Promise<CreateCRResult>;
    /**
     * Update CR partially (specific fields)
     * @param projectId - Project ID
     * @param crId - CR ID or code
     * @param updates - Fields to update
     * @returns Success status
     */
    updateCRPartial(projectId: string, crId: string, updates: Record<string, any>): Promise<UpdateCRResult>;
    /**
     * Update CR completely (full content)
     * @param projectId - Project ID
     * @param crId - CR ID or code
     * @param content - Full CR content
     * @returns Success status
     */
    updateCR(projectId: string, crId: string, content: string): Promise<UpdateResult>;
    /**
     * Delete CR from a project
     * @param projectId - Project ID
     * @param crId - CR ID or code
     * @returns Success status
     */
    deleteCR(projectId: string, crId: string): Promise<DeleteResult>;
}
export {};
