import { TreeBuildingStrategy, TreeNode, ProjectConfig } from './TreeBuildingStrategy.js';
/**
 * Strategy for building trees for path selection (no metadata)
 */
export declare class PathSelectionStrategy extends TreeBuildingStrategy {
    buildTree(filePaths: string[], projectPath: string, _config: ProjectConfig): Promise<TreeNode[]>;
    private _treeToArray;
}
