import { PathSelectionStrategy } from './PathSelectionStrategy';
import { TreeNode } from './TreeBuildingStrategy';
import { FileOperationInvoker } from '../invokers/FileOperationInvoker';
import { FileMetadata } from '../commands/ExtractMetadataCommand';

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