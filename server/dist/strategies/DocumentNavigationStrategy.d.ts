import { PathSelectionStrategy } from './PathSelectionStrategy.js';
import { TreeNode } from './TreeBuildingStrategy.js';
import { FileMetadata } from '../commands/ExtractMetadataCommand.js';
/**
 * Strategy for building trees for document navigation (with metadata)
 */
export declare class DocumentNavigationStrategy extends PathSelectionStrategy {
    private fileInvoker;
    constructor();
    processFile(filePath: string, relativePath: string): Promise<TreeNode & FileMetadata>;
}
