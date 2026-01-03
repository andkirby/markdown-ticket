/**
 * SectionEditor - Write Operations for CR Sections
 *
 * Phase 3 Extraction: Extracted from handlers/operations/ModifyOperation.ts (219 lines)
 *
 * Responsibilities:
 * - Replace section content
 * - Append content to section
 * - Prepend content to section
 * - Write updated document back to file
 * - Handle header renaming when content includes new header
 *
 * Anti-duplication:
 * - Imports from MarkdownSectionService for section modification
 * - Imports from SectionRepository for section finding and file reading
 * - Imports from ContentProcessor for content processing
 * - Imports from MarkdownService for file writing
 * - Imports from CRService for YAML operations
 * - No copying of modification logic
 */

import type { Project } from '@mdt/shared/models/Project.js';
import type { SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js';
import type { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import type { CRService } from '../../services/crService.js';
import { ToolError } from '../../utils/toolError.js';
import { SectionRepository } from './SectionRepository.js';
import { ContentProcessor, type HeaderExtractionResult } from './ContentProcessor.js';

export type ModifyOperation = 'replace' | 'append' | 'prepend';

export interface ModifyResult {
  success: boolean;
  key: string;
  sectionPath: string;
  operation: ModifyOperation;
  contentLength: number;
  title: string;
  filePath: string;
  timestamp: string;
  contentModified: boolean;
  warningsCount: number;
}

/**
 * SectionEditor - Handles write operations for CR sections
 */
export class SectionEditor {
  private sectionRepository: SectionRepository;
  private markdownSectionService: typeof MarkdownSectionService;
  private markdownService: typeof MarkdownService;
  private crService: CRService;

  constructor(
    crService: CRService,
    markdownSectionService: typeof MarkdownSectionService
  ) {
    this.crService = crService;
    this.markdownSectionService = markdownSectionService;
    this.markdownService = MarkdownService;
    this.sectionRepository = new SectionRepository(crService, markdownSectionService);
  }

  /**
   * Replace section content
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @param section - Section path to replace
   * @param content - New content for the section
   * @returns Result with metadata
   */
  async replace(
    project: Project,
    key: string,
    section: string,
    content: string
  ): Promise<ModifyResult> {
    return this.modify(project, key, section, content, 'replace');
  }

  /**
   * Append content to section
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @param section - Section path to append to
   * @param content - Content to append
   * @returns Result with metadata
   */
  async append(
    project: Project,
    key: string,
    section: string,
    content: string
  ): Promise<ModifyResult> {
    return this.modify(project, key, section, content, 'append');
  }

  /**
   * Prepend content to section
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @param section - Section path to prepend to
   * @param content - Content to prepend
   * @returns Result with metadata
   */
  async prepend(
    project: Project,
    key: string,
    section: string,
    content: string
  ): Promise<ModifyResult> {
    return this.modify(project, key, section, content, 'prepend');
  }

  /**
   * Core modify operation - handles replace, append, and prepend
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @param sectionPath - Section path
   * @param content - Content to apply
   * @param operation - Operation type (replace, append, prepend)
   * @returns Result with metadata
   */
  private async modify(
    project: Project,
    key: string,
    sectionPath: string,
    content: string,
    operation: ModifyOperation
  ): Promise<ModifyResult> {
    // Step 1: Read CR file
    const { filePath, title, yamlBody, markdownBody } = await this.sectionRepository.readCR(project, key);

    // Step 2: Find section
    const matchedSection = await this.sectionRepository.find(project, key, sectionPath);

    // Step 3: Process content
    const contentResult = ContentProcessor.processContent(content, { operation });

    // Show warnings if any
    if (contentResult.warnings.length > 0) {
      console.warn(`Content processing warnings for ${key}:`, contentResult.warnings);
    }

    // Step 4: Handle header renaming logic
    // If content starts with a header at the same level as the section, use it as the new section header
    const headerResult = ContentProcessor.extractNewHeader(contentResult.content);
    let newSectionHeader: string | null = null;
    let sectionBody = contentResult.content;

    if (headerResult.hasHeader && headerResult.newHeader) {
      // Check if header is at same level as target section
      const headerLevelMatch = headerResult.newHeader.match(/^(#+)\s/);
      const sectionHeaderLevel = matchedSection.headerLevel;

      if (headerLevelMatch && headerLevelMatch[1].length === sectionHeaderLevel) {
        // Found a header at the same level - use it as new section header
        newSectionHeader = headerResult.newHeader;
        sectionBody = headerResult.remainingContent;

        console.warn(
          `ℹ️ Section "${matchedSection.headerText}" is being renamed to "${headerResult.newHeader}". ` +
          `This is intentional since you provided the new header in the content.`
        );
      }
    }

    // Step 5: Perform replace/append/prepend with MarkdownSectionService
    let updatedBody: string;

    switch (operation) {
      case 'replace':
        // CRITICAL BUG FIX: replaceSection keeps the old header from matchedSection
        // and adds the body we provide. So we MUST NOT include a header in the content!
        // If a new header was detected, we'll replace it after calling replaceSection.
        const replaceContent = newSectionHeader ? sectionBody : contentResult.content;
        updatedBody = this.markdownSectionService.replaceSection(markdownBody, matchedSection, replaceContent);

        // If header changed, replace the old header with the new one
        if (newSectionHeader) {
          // matchedSection.headerText includes the markdown prefix (e.g., "## 2. Solution Analysis")
          const escapedOldHeader = matchedSection.headerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const oldHeaderRegex = new RegExp(`^${escapedOldHeader}$`, 'm');
          updatedBody = updatedBody.replace(oldHeaderRegex, newSectionHeader);
        }
        break;
      case 'append':
        // For append, use sectionBody only (don't append the header)
        updatedBody = this.markdownSectionService.appendToSection(markdownBody, matchedSection, sectionBody);
        break;
      case 'prepend':
        // For prepend, use sectionBody only (don't prepend the header)
        updatedBody = this.markdownSectionService.prependToSection(markdownBody, matchedSection, sectionBody);
        break;
      default:
        throw ToolError.toolExecution(`Invalid operation '${operation}'. Must be: replace, append, or prepend`);
    }

    // Step 6: Update YAML lastModified timestamp
    const now = new Date().toISOString();
    const updatedYaml = yamlBody.replace(
      /lastModified:.*$/m,
      `lastModified: ${now}`
    );

    // Step 7: Reconstruct full document
    const updatedContent = `---\n${updatedYaml}\n---\n${updatedBody}`;

    // Step 8: Write file
    await this.write(project, key, updatedContent);

    return {
      success: true,
      key,
      sectionPath: matchedSection.hierarchicalPath,
      operation,
      contentLength: contentResult.content.length,
      title,
      filePath,
      timestamp: now,
      contentModified: contentResult.modified,
      warningsCount: contentResult.warnings.length
    };
  }

  /**
   * Write updated CR content to file
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @param content - Full updated document content
   */
  private async write(project: Project, key: string, content: string): Promise<void> {
    // Get ticket info to get file path
    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${key}' not found in project`);
    }

    await this.markdownService.writeFile(ticket.filePath, content);

    // Clear cache after write
    this.sectionRepository.clearCache();
  }

  /**
   * Get the section repository instance
   * Useful for testing or advanced operations
   */
  getRepository(): SectionRepository {
    return this.sectionRepository;
  }
}
