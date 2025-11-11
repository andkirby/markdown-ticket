interface ITreeBuildingStrategy {
    buildTree(filePaths: string[], projectPath: string, config: ProjectConfig): Promise<unknown[]>;
}
interface ProjectConfig {
    excludeFolders?: string[];
    ticketsPath?: string;
    [key: string]: unknown;
}
/**
 * TreeBuilder that uses different strategies for building trees
 */
export declare class TreeBuilder {
    private strategy;
    constructor(strategy: ITreeBuildingStrategy);
    /**
     * Build tree using current strategy
     * @param projectPath - Project root path
     * @param config - Project configuration
     * @param maxDepth - Maximum depth to scan
     * @returns Tree structure
     */
    build(projectPath: string, config: ProjectConfig, maxDepth?: number): Promise<unknown[]>;
    private _filterTicketFiles;
}
export {};
