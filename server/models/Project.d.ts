/**
 * Shared Project Model for Frontend, Backend, and MCP
 * Ensures consistent project structure across all systems
 */
export interface Project {
    id: string;
    project: {
        id?: string;
        name: string;
        code?: string;
        path: string;
        configFile: string;
        counterFile?: string;
        startNumber?: number;
        active: boolean;
        description: string;
        repository?: string;
    };
    metadata: {
        dateRegistered: string;
        lastAccessed: string;
        version: string;
    };
    tickets?: {
        codePattern?: string;
    };
    autoDiscovered?: boolean;
    configPath?: string;
}
export interface ProjectConfig {
    project: {
        id?: string;
        name: string;
        code: string;
        path: string;
        startNumber: number;
        counterFile: string;
        description?: string;
        repository?: string;
    };
}
/**
 * Project status enumeration
 */
export declare enum ProjectStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    ARCHIVED = "archived"
}
/**
 * Helper function to generate ticket codes based on project configuration
 */
export declare function generateTicketCode(project: Project, projectConfig: ProjectConfig | null, existingTicketCount: number): string;
/**
 * Validate project configuration
 */
export declare function validateProjectConfig(config: any): config is ProjectConfig;
//# sourceMappingURL=Project.d.ts.map