import fs from 'fs/promises';
import { Command } from './Command.js';
/**
 * Command to read file content
 * Note: Cache has no size limit - could grow large with many files
 */
export class ReadFileCommand extends Command {
    constructor(ttlSeconds = 3600) {
        super();
        this.cache = new Map();
        this.TTL = ttlSeconds * 1000; // Convert to milliseconds
    }
    async execute(filePath) {
        // Check cache first
        const cached = this.cache.get(filePath);
        if (cached && Date.now() - cached.timestamp < this.TTL) {
            return cached.data;
        }
        try {
            const content = await fs.readFile(filePath, 'utf8');
            this.cache.set(filePath, {
                data: content,
                timestamp: Date.now()
            });
            return content;
        }
        catch {
            throw new Error(`Failed to read file: ${filePath}`);
        }
    }
    invalidate(filePath) {
        this.cache.delete(filePath);
    }
    clearCache() {
        this.cache.clear();
    }
}
//# sourceMappingURL=ReadFileCommand.js.map