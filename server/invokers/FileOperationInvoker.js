import { ExtractMetadataCommand } from '../commands/ExtractMetadataCommand.js';
import { ReadFileCommand } from '../commands/ReadFileCommand.js';

/**
 * Invoker for file operations using command pattern
 */
export class FileOperationInvoker {
  constructor() {
    this.metadataCommand = null;
    this.readCommand = null;
    this.initialized = false;
  }

  async _ensureInitialized() {
    if (!this.initialized) {
      const ttl = await this._getCacheTTL();
      this.metadataCommand = new ExtractMetadataCommand(ttl);
      this.readCommand = new ReadFileCommand(ttl);
      this.initialized = true;
    }
  }

  async _getCacheTTL() {
    try {
      const response = await fetch('http://localhost:3001/api/config/global');
      if (response.ok) {
        const config = await response.json();
        return config.cache?.ttl || 3600;
      }
    } catch (error) {
      console.warn('Failed to fetch cache TTL from config, using default:', error.message);
    }
    return 3600; // Default 1 hour
  }

  /**
   * Extract file metadata (title, dates)
   */
  async getMetadata(filePath) {
    await this._ensureInitialized();
    return await this.metadataCommand.execute(filePath);
  }

  /**
   * Read file content
   */
  async readFile(filePath) {
    await this._ensureInitialized();
    return await this.readCommand.execute(filePath);
  }

  /**
   * Invalidate cache for specific file
   */
  async invalidateFile(filePath) {
    await this._ensureInitialized();
    this.metadataCommand.invalidate(filePath);
    this.readCommand.invalidate(filePath);
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    await this._ensureInitialized();
    this.metadataCommand.clearCache();
    this.readCommand.clearCache();
  }
}
