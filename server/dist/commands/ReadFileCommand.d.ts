import { Command } from './Command.js';
/**
 * Command to read file content
 * Note: Cache has no size limit - could grow large with many files
 */
export declare class ReadFileCommand extends Command {
    private cache;
    private TTL;
    constructor(ttlSeconds?: number);
    execute(filePath: string): Promise<string>;
    invalidate(filePath: string): void;
    clearCache(): void;
}
