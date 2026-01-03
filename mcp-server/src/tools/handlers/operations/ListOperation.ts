/**
 * ListOperation Strategy
 *
 * Lists all sections in a CR document.
 * Strategy Pattern: encapsulates list operation logic.
 */

import type { SectionOperation } from './index.js';
import type { Project } from '@mdt/shared/models/Project.js';
import { CRFileReader } from '../../../utils/section/CRFileReader.js';
import { SectionResolver } from '../../../utils/section/SectionResolver.js';
import { ValidationFormatter } from '../../../utils/section/ValidationFormatter.js';

/**
 * Strategy for listing all sections in a CR
 */
export class ListOperation implements SectionOperation {
  /**
   * @param crFileReader - File reading utility
   * @param sectionResolver - Section resolution utility
   */
  constructor(
    private crFileReader: CRFileReader,
    private sectionResolver: SectionResolver
  ) {}

  /**
   * Execute the list operation
   * Returns formatted list of all sections in the CR
   *
   * @param project - Project configuration
   * @param key - CR key (e.g., "MDT-001")
   * @param section
   * @param content
   * @param options
   * @returns Formatted section list
   */
  async execute(
    project: Project,
    key: string,
    section?: string,
    content?: string,
    options?: Record<string, unknown>
  ): Promise<string> {
    const fileData = await this.crFileReader.readCRFile(project, key);
    const allSections = this.sectionResolver.resolveAll(fileData.markdownBody);
    return ValidationFormatter.formatSectionList(key, fileData.title, allSections);
  }
}
