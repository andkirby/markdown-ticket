import { PathSelectionStrategy } from './PathSelectionStrategy.js';
import { TreeNode } from './TreeBuildingStrategy.js';
import { FileOperationInvoker } from '../invokers/FileOperationInvoker.js';
import { FileMetadata } from '../commands/ExtractMetadataCommand.js';

/**
 * Strategy for building trees for document navigation (with metadata)
 */
export class DocumentNavigationStrategy extends PathSelectionStrategy {
  private fileInvoker: FileOperationInvoker;

  constructor() {
    super();
    this.fileInvoker = new FileOperationInvoker();
  }

  async processFile(filePath: string, relativePath: string): Promise<TreeNode & FileMetadata> {
    const baseFile = await super.processFile(filePath, relativePath);
    const metadata = await this.fileInvoker.getMetadata(filePath);

    return {
      ...baseFile,
      ...metadata
    };
  }
}