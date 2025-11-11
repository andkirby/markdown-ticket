import { FileMetadata } from '../commands/ExtractMetadataCommand.js';
/**
 * Invoker for file operations using command pattern
 */
export declare class FileOperationInvoker {
    private metadataCommand;
    private readCommand;
    private initialized;
    constructor();
    private _ensureInitialized;
    private _getCacheTTL;
    /**
     * Extract file metadata (title, dates)
     */
    getMetadata(filePath: string): Promise<FileMetadata>;
    /**
     * Read file content
     */
    readFile(filePath: string): Promise<string>;
    /**
     * Invalidate cache for specific file
     */
    invalidateFile(filePath: string): Promise<void>;
    /**
     * Clear all caches
     */
    clearCache(): Promise<void>;
}
