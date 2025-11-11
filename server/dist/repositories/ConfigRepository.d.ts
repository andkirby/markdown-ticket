export interface ProjectConfiguration {
    documentPaths: string[];
    excludeFolders: string[];
    ticketsPath: string | null;
}
/**
 * Repository for project configuration access
 */
export declare class ConfigRepository {
    /**
     * Get project configuration
     */
    getConfig(projectPath: string): Promise<ProjectConfiguration>;
    private _parseConfig;
    private _parseArray;
    private _getDefaultConfig;
}
