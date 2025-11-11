import { Command } from './Command.js';
export interface FileMetadata {
    title: string | null;
    dateCreated: Date | null;
    lastModified: Date | null;
}
/**
 * Command to extract file metadata (title, dates)
 * Note: Cache has no size limit - could grow large with many files
 */
export declare class ExtractMetadataCommand extends Command {
    private cache;
    private TTL;
    constructor(ttlSeconds?: number);
    execute(filePath: string): Promise<FileMetadata>;
    invalidate(filePath: string): void;
    clearCache(): void;
}
