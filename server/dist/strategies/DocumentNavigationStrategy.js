import { PathSelectionStrategy } from './PathSelectionStrategy.js';
import { FileOperationInvoker } from '../invokers/FileOperationInvoker.js';
/**
 * Strategy for building trees for document navigation (with metadata)
 */
export class DocumentNavigationStrategy extends PathSelectionStrategy {
    constructor() {
        super();
        this.fileInvoker = new FileOperationInvoker();
    }
    async processFile(filePath, relativePath) {
        const baseFile = await super.processFile(filePath, relativePath);
        const metadata = await this.fileInvoker.getMetadata(filePath);
        return {
            ...baseFile,
            ...metadata
        };
    }
}
//# sourceMappingURL=DocumentNavigationStrategy.js.map