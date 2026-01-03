/**
 * CR File Reader Utility
 * Extracts common CR file reading logic from section handlers
 */

import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import { Project } from '@mdt/shared/models/Project.js';
import { CRService } from '../../services/crService.js';
import { ToolError } from '../toolError.js';

export interface CRFileContent {
  filePath: string;
  title: string;
  yamlBody: string;
  markdownBody: string;
}

/**
 * CRFileReader - Handles reading and parsing CR files
 */
export class CRFileReader {
  private crService: CRService;
  private fileCache: Map<string, CRFileContent>;

  constructor(crService: CRService) {
    this.crService = crService;
    this.fileCache = new Map();
  }

  /**
   * Read CR file and extract components
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @returns Object with filePath, title, yamlBody, markdownBody
   * @throws ToolError if ticket not found or file format invalid
   */
  async readCRFile(project: Project, key: string): Promise<CRFileContent> {
    // Check cache first
    const cacheKey = `${project.project.code || project.id}-${key}`;
    const cached = this.fileCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get ticket info from CR service
    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${key}' not found in project`);
    }

    // Read file content
    const fileContent = await MarkdownService.readFile(ticket.filePath);

    // Extract YAML frontmatter and markdown body
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      throw ToolError.toolExecution(`Invalid CR file format for ${key}: No YAML frontmatter found`);
    }

    const result: CRFileContent = {
      filePath: ticket.filePath,
      title: ticket.title,
      yamlBody: frontmatterMatch[1],
      markdownBody: frontmatterMatch[2]
    };

    // Cache the result
    this.fileCache.set(cacheKey, result);

    return result;
  }

  /**
   * Clear the file cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.fileCache.clear();
  }

  /**
   * Get cache size (for debugging/monitoring)
   */
  getCacheSize(): number {
    return this.fileCache.size;
  }
}
