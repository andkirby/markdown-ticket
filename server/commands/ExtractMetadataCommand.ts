import { promises as fs } from 'fs';
import { Command } from './Command';

export interface FileMetadata {
  title: string | null;
  dateCreated: Date | null;
  lastModified: Date | null;
}

interface CacheEntry {
  data: FileMetadata;
  timestamp: number;
}

/**
 * Command to extract file metadata (title, dates)
 * Note: Cache has no size limit - could grow large with many files
 */
export class ExtractMetadataCommand extends Command {
  private cache: Map<string, CacheEntry>;
  private TTL: number;

  constructor(ttlSeconds: number = 3600) {
    super();
    this.cache = new Map();
    this.TTL = ttlSeconds * 1000; // Convert to milliseconds
  }

  async execute(...args: unknown[]): Promise<unknown> {
    const [filePath] = args as [string];
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

      const metadata: FileMetadata = {
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
    } catch {
      const fallback: FileMetadata = {
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

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  clearCache(): void {
    this.cache.clear();
  }
}