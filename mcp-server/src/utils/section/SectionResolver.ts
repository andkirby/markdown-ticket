/**
 * SectionResolver utility for section path resolution
 * Consolidates section finding logic from sectionHandlers.ts
 */

import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js';
import { ToolError } from '../../utils/toolError.js';

export class SectionResolver {
  constructor(private markdownSectionService: typeof MarkdownSectionService) {}

  /**
   * Resolve a single section by path
   * @param content - Full markdown document content
   * @param section - Section path to resolve
   * @param key - CR key for error messages (optional)
   * @returns Single matching section
   * @throws ToolError if section not found or multiple matches
   */
  resolve(content: string, section: string, key?: string): SectionMatch {
    const matches = this.markdownSectionService.findSection(content, section);
    return this.validateUnique(matches, section, key);
  }

  /**
   * Resolve all sections in document
   * @param content - Full markdown document content
   * @returns All sections in document
   */
  resolveAll(content: string): SectionMatch[] {
    return this.markdownSectionService.findSection(content, '');
  }

  /**
   * Validate that section resolution is unique
   * @param matches - Array of matching sections
   * @param section - Original section path for error messages
   * @param key - CR key for error messages (optional)
   * @returns Single matching section
   * @throws ToolError if 0 matches or 2+ matches
   */
  validateUnique(matches: SectionMatch[], section: string, key?: string): SectionMatch {
    if (matches.length === 0) {
      const keyMsg = key ? ` in CR ${key}` : '';
      throw ToolError.toolExecution(`Section '${section}' not found${keyMsg}.`);
    }

    if (matches.length > 1) {
      const paths = matches.map(m => m.hierarchicalPath).join('\n  - ');
      throw ToolError.toolExecution(
        `Multiple sections match '${section}'. Please use hierarchical path:\n  - ${paths}`
      );
    }

    return matches[0];
  }
}
