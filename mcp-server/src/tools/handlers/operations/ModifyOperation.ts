/**
 * ModifyOperation Strategy
 *
 * Handles section modification operations (replace, append, prepend).
 * Strategy Pattern: encapsulates complex modification logic with header renaming support.
 *
 * This is the COMPLEX strategy - handles three operations:
 * - replace: Completely replace section content
 * - append: Add content to end of section
 * - prepend: Add content to beginning of section
 *
 * Special feature: Intelligent header renaming when content includes
 * a new header at the same level as the target section.
 */

import type { SectionOperation } from './index.js';
import type { Project } from '@mdt/shared/models/Project.js';
import { CRFileReader } from '../../../utils/section/CRFileReader.js';
import { SectionResolver } from '../../../utils/section/SectionResolver.js';
import { ValidationFormatter } from '../../../utils/section/ValidationFormatter.js';
import { SimpleContentProcessor } from '../../../utils/simpleContentProcessor.js';
import { SimpleSectionValidator } from '../../../utils/simpleSectionValidator.js';
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import { Sanitizer } from '../../../utils/sanitizer.js';
import { CRService } from '../../../services/crService.js';
import { ToolError } from '../../../utils/toolError.js';

/**
 * Strategy for modifying sections in a CR
 */
export class ModifyOperation implements SectionOperation {
  // Instance properties to hold static class references
  private markdownSectionService: typeof MarkdownSectionService;
  private markdownService: typeof MarkdownService;
  private sanitizer: typeof Sanitizer;

  /**
   * @param crFileReader - File reading utility
   * @param sectionResolver - Section resolution utility
   * @param validationFormatter - Output formatting utility
   * @param simpleContentProcessor - Content processing utility
   * @param simpleSectionValidator - Section validation utility
   * @param markdownSectionService - Markdown section manipulation service (static class)
   * @param markdownService - Markdown file I/O service (static class)
   * @param crService - CR service for YAML operations
   * @param sanitizer - Content sanitization utility
   */
  constructor(
    private crFileReader: CRFileReader,
    private sectionResolver: SectionResolver,
    private validationFormatter: typeof ValidationFormatter,
    private simpleContentProcessor: typeof SimpleContentProcessor,
    private simpleSectionValidator: typeof SimpleSectionValidator,
    markdownSectionService: typeof MarkdownSectionService,
    markdownService: typeof MarkdownService,
    private crService: CRService,
    sanitizer: typeof Sanitizer
  ) {
    // Store references to static classes
    this.markdownSectionService = markdownSectionService;
    this.markdownService = markdownService;
    this.sanitizer = sanitizer;
  }

  /**
   * Execute the modify operation (replace, append, or prepend)
   *
   * @param project - Project configuration
   * @param key - CR key (e.g., "MDT-001")
   * @param section - Section identifier (required)
   * @param content - Content to apply (required)
   * @param options - Operation type ('replace', 'append', 'prepend')
   * @returns Formatted operation result
   */
  async execute(
    project: Project,
    key: string,
    section?: string,
    content?: string,
    options?: Record<string, unknown>
  ): Promise<string> {
    const operation = options?.operation as 'replace' | 'append' | 'prepend';

    if (!section) {
      throw ToolError.toolExecution('Section identifier is required for modify operations');
    }

    if (!content) {
      throw ToolError.toolExecution('Content is required for modify operations');
    }

    if (!operation || !['replace', 'append', 'prepend'].includes(operation)) {
      throw ToolError.toolExecution(`Invalid operation '${operation}'. Must be: replace, append, or prepend`);
    }

    // Step 1: Read file with CRFileReader
    const fileData = await this.crFileReader.readCRFile(project, key);
    const yamlFrontmatter = fileData.yamlBody;
    const markdownBody = fileData.markdownBody;

    // Step 2: Validate section with SimpleSectionValidator
    const availableSections = this.simpleSectionValidator.extractSections(markdownBody);
    const sectionValidation = this.simpleSectionValidator.validateSection(section, availableSections);

    if (!sectionValidation.valid) {
      const errorMessage = this.validationFormatter.formatSectionValidationError(
        section,
        sectionValidation.errors,
        sectionValidation.suggestions,
        key
      );
      throw ToolError.toolExecution(errorMessage);
    }

    // Step 3: Resolve section with SectionResolver
    const matchedSection = this.sectionResolver.resolve(
      markdownBody,
      sectionValidation.normalized || section,
      key
    );

    // Step 4: Process content with SimpleContentProcessor
    const contentProcessingResult = this.simpleContentProcessor.processContent(content, {
      operation,
      maxLength: 500000 // 500KB limit for section content
    });

    // Show warnings if any
    if (contentProcessingResult.warnings.length > 0) {
      console.warn(`Content processing warnings for ${key}:`, contentProcessingResult.warnings);
    }

    // Step 5: Handle header renaming logic
    // If content starts with a header at the same level as the section, use it as the new section header
    // This allows restructuring/renaming while keeping headers explicit and intentional
    const sectionHeaderLevel = matchedSection.headerLevel;
    const headerPrefix = '#'.repeat(sectionHeaderLevel);
    const firstHeaderPattern = new RegExp(`^${headerPrefix} (.+?)$`, 'm');
    const firstHeaderMatch = contentProcessingResult.content.match(firstHeaderPattern);

    let newSectionHeader: string | null = null;
    let sectionBody = contentProcessingResult.content;

    if (firstHeaderMatch) {
      // Found a header at the same level - use it as new section header
      newSectionHeader = firstHeaderMatch[0]; // Full header line "## New Name"
      const newHeaderText = firstHeaderMatch[1]; // Just the text "New Name"

      // Extract body (everything after the first header)
      const headerIndex = contentProcessingResult.content.indexOf(firstHeaderMatch[0]);
      sectionBody = contentProcessingResult.content
        .substring(headerIndex + firstHeaderMatch[0].length)
        .trim();

      console.warn(
        `ℹ️ Section "${matchedSection.headerText}" is being renamed to "${newHeaderText}". ` +
        `This is intentional since you provided the new header in the content.`
      );
    }

    // Step 6: Perform replace/append/prepend with MarkdownSectionService
    let updatedBody: string;

    switch (operation) {
      case 'replace':
        // CRITICAL BUG FIX: replaceSection keeps the old header from matchedSection
        // and adds the body we provide. So we MUST NOT include a header in the content!
        // If a new header was detected, we'll replace it after calling replaceSection.
        const replaceContent = newSectionHeader ? sectionBody : contentProcessingResult.content;
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

    // Step 7: Update YAML lastModified timestamp
    const now = new Date().toISOString();
    const updatedYaml = yamlFrontmatter.replace(
      /lastModified:.*$/m,
      `lastModified: ${now}`
    );

    // Step 8: Reconstruct full document
    const updatedContent = `---\n${updatedYaml}\n---\n${updatedBody}`;

    // Step 9: Write file with MarkdownService
    await this.markdownService.writeFile(fileData.filePath, updatedContent);

    // Step 10: Return formatted output with ValidationFormatter
    return this.validationFormatter.formatModifyOutput(
      key,
      matchedSection.hierarchicalPath,
      operation,
      contentProcessingResult.content.length,
      fileData.title,
      fileData.filePath,
      now,
      contentProcessingResult.modified,
      contentProcessingResult.warnings.length
    );
  }
}
