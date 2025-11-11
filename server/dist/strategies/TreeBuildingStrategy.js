import path from 'path';
export class TreeBuildingStrategy {
    /**
     * Build tree from file paths
     * @param filePaths - Array of file paths
     * @param projectPath - Project root path
     * @param config - Project configuration
     * @returns Tree structure
     */
    async buildTree(_filePaths, _projectPath, _config) {
        throw new Error('buildTree must be implemented by strategy');
    }
    /**
     * Process individual file for tree inclusion
     * @param filePath - File path
     * @param relativePath - Relative path from project root
     * @returns File object
     */
    async processFile(_filePath, relativePath) {
        return {
            name: path.basename(relativePath),
            path: relativePath,
            type: 'file'
        };
    }
}
//# sourceMappingURL=TreeBuildingStrategy.js.map