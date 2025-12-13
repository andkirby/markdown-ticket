import { promises as fs } from 'fs';
import { Command } from './Command';

interface CacheEntry {
  data: string;
  timestamp: number;
}

/**
 * Command to read file content
 * Note: Cache has no size limit - could grow large with many files
 */
export class ReadFileCommand extends Command {
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
      const content = await fs.readFile(filePath, 'utf8');
      this.cache.set(filePath, {
        data: content,
        timestamp: Date.now()
      });
      return content;
    } catch {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  clearCache(): void {
    this.cache.clear();
  }
}