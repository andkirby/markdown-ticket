import { ExtractMetadataCommand, FileMetadata } from '../commands/ExtractMetadataCommand';
import { ReadFileCommand } from '../commands/ReadFileCommand';

/**
 * Invoker for file operations using command pattern
 */
export class FileOperationInvoker {
  private metadataCommand: ExtractMetadataCommand | null = null;
  private readCommand: ReadFileCommand | null = null;
  private initialized: boolean = false;

  constructor() {
    this.metadataCommand = null;
    this.readCommand = null;
    this.initialized = false;
  }

  private async _ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const ttl = await this._getCacheTTL();
      this.metadataCommand = new ExtractMetadataCommand(ttl);
      this.readCommand = new ReadFileCommand(ttl);
      this.initialized = true;
    }
  }

  private async _getCacheTTL(): Promise<number> {
    try {
      const response = await fetch('http://localhost:3001/api/config/global');
      if (response.ok) {
        const config = await response.json() as { cache?: { ttl?: number } };
        return config.cache?.ttl || 3600;
      }
    } catch (error) {
      console.warn('Failed to fetch cache TTL from config, using default:', (error as Error).message);
    }
    return 3600; // Default 1 hour
  }

  /**
   * Extract file metadata (title, dates)
   */
  async getMetadata(filePath: string): Promise<FileMetadata> {
    await this._ensureInitialized();
    if (!this.metadataCommand) {
      throw new Error('Metadata command not initialized');
    }
    return await this.metadataCommand.execute(filePath) as FileMetadata;
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    await this._ensureInitialized();
    if (!this.readCommand) {
      throw new Error('Read command not initialized');
    }
    return await this.readCommand.execute(filePath) as string;
  }

  /**
   * Invalidate cache for specific file
   */
  async invalidateFile(filePath: string): Promise<void> {
    await this._ensureInitialized();
    if (this.metadataCommand) {
      this.metadataCommand.invalidate(filePath);
    }
    if (this.readCommand) {
      this.readCommand.invalidate(filePath);
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await this._ensureInitialized();
    if (this.metadataCommand) {
      this.metadataCommand.clearCache();
    }
    if (this.readCommand) {
      this.readCommand.clearCache();
    }
  }
}