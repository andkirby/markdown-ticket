/**
 * GetOperation Strategy
 *
 * Gets a specific section from a CR document.
 * Strategy Pattern: encapsulates get operation logic.
 */

import type { SectionOperation } from './index.js';
import type { Project } from '@mdt/shared/models/Project.js';
import { CRFileReader } from '../../../utils/section/CRFileReader.js';
import { SectionResolver } from '../../../utils/section/SectionResolver.js';
import { ValidationFormatter } from '../../../utils/section/ValidationFormatter.js';
import { Sanitizer } from '../../../utils/sanitizer.js';

/**
 * Strategy for getting a specific section from a CR
 */
export class GetOperation implements SectionOperation {
  /**
   * @param crFileReader - File reading utility
   * @param sectionResolver - Section resolution utility
   * @param validationFormatter - Output formatting utility
   * @param sanitizer - Content sanitization utility
   */
  constructor(
    private crFileReader: CRFileReader,
    private sectionResolver: SectionResolver,
    private validationFormatter: typeof ValidationFormatter,
    private sanitizer: typeof Sanitizer
  ) {}

  /**
   * Execute the get operation
   * Returns formatted content of a specific section from the CR
   *
   * @param project - Project configuration
   * @param key - CR key (e.g., "MDT-001")
   * @param section - Section identifier (required)
   * @param content
   * @param options
   * @returns Formatted section content
   */
  async execute(
    project: Project,
    key: string,
    section?: string,
    content?: string,
    options?: Record<string, unknown>
  ): Promise<string> {
    const fileData = await this.crFileReader.readCRFile(project, key);
    const matchedSection = this.sectionResolver.resolve(
      fileData.markdownBody,
      section!,
      key
    );

    // Sanitize the section content for output
    const sanitizedContent = this.sanitizer.sanitizeMarkdown(matchedSection.content);

    return this.validationFormatter.formatGetSectionOutput(
      key,
      matchedSection,
      sanitizedContent
    );
  }
}
