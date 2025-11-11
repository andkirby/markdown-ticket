import fs from 'fs/promises';
import { Command } from './Command.js';
/**
 * Command to extract file metadata (title, dates)
 * Note: Cache has no size limit - could grow large with many files
 */
export class ExtractMetadataCommand extends Command {
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
            const [content, stats] = await Promise.all([
                fs.readFile(filePath, 'utf8'),
                fs.stat(filePath)
            ]);
            const h1Match = content.match(/^#\s+(.+)$/m);
            const metadata = {
                title: h1Match ? h1Match[1].trim() : null,
                dateCreated: stats.birthtime || stats.ctime,
                lastModified: stats.mtime
            };
            // Cache with timestamp
            this.cache.set(filePath, {
                data: metadata,
                timestamp: Date.now()
            });
            return metadata;
        }
        catch {
            const fallback = {
                title: null,
                dateCreated: null,
                lastModified: null
            };
            this.cache.set(filePath, {
                data: fallback,
                timestamp: Date.now()
            });
            return fallback;
        }
    }
    invalidate(filePath) {
        this.cache.delete(filePath);
    }
    clearCache() {
        this.cache.clear();
    }
}
//# sourceMappingURL=ExtractMetadataCommand.js.map