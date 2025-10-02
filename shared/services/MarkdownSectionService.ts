/**
 * Service for parsing and manipulating markdown document sections
 * Enables efficient section-level updates instead of full document replacement
 */

export interface SectionMatch {
  headerText: string;        // e.g., "### Problem Statement"
  headerLevel: number;       // e.g., 3 for ###
  startLine: number;         // Line number where section starts (0-indexed)
  endLine: number;           // Line number where section ends (exclusive)
  content: string;           // Current section content (excluding header)
  hierarchicalPath: string;  // e.g., "## Description / ### Problem Statement"
}

export class MarkdownSectionService {
  /**
   * Find section(s) matching the given path
   * Returns array of matches with hierarchical context
   *
   * @param content - Full markdown document content
   * @param sectionPath - Section name, markdown header, or hierarchical path
   * @returns Array of matching sections
   */
  static findSection(content: string, sectionPath: string): SectionMatch[] {
    // Check if hierarchical path (contains " / ")
    if (sectionPath.includes(' / ')) {
      const match = this.findHierarchicalSection(content, sectionPath);
      return match ? [match] : [];
    }

    // Parse document into sections
    const sections = this.parseAllSections(content);

    // Normalize search term (remove markdown prefix, trim, lowercase)
    const normalizedSearch = this.normalizeHeaderText(sectionPath);

    // Find all matches
    return sections.filter(section => {
      const normalizedHeader = this.normalizeHeaderText(section.headerText);
      // Match if normalized header contains the search term
      return normalizedHeader.includes(normalizedSearch);
    });
  }

  /**
   * Find section using hierarchical path (e.g., "## Parent / ### Child")
   *
   * @param content - Full markdown document content
   * @param path - Hierarchical path with " / " separators
   * @returns Single matching section or null
   */
  static findHierarchicalSection(content: string, path: string): SectionMatch | null {
    const pathParts = path.split(' / ').map(p => p.trim());
    const sections = this.parseAllSections(content);

    // Build hierarchical structure
    for (const section of sections) {
      const hierarchyParts = section.hierarchicalPath.split(' / ');

      // Check if this section matches the path
      if (pathParts.length !== hierarchyParts.length) {
        continue;
      }

      let matches = true;
      for (let i = 0; i < pathParts.length; i++) {
        const normalizedPath = this.normalizeHeaderText(pathParts[i]);
        const normalizedHierarchy = this.normalizeHeaderText(hierarchyParts[i]);

        if (!normalizedHierarchy.includes(normalizedPath)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return section;
      }
    }

    return null;
  }

  /**
   * Replace entire section content
   *
   * @param content - Full markdown document content
   * @param section - Section to replace
   * @param newContent - New content for the section (excluding header)
   * @returns Updated document content
   */
  static replaceSection(content: string, section: SectionMatch, newContent: string): string {
    const lines = content.split('\n');

    // Keep lines before section
    const before = lines.slice(0, section.startLine + 1); // +1 to include header

    // Add new content (ensure it doesn't start with newline if not empty)
    const contentLines = newContent.trim() ? [newContent.trim()] : [];

    // Keep lines after section
    const after = lines.slice(section.endLine);

    return [...before, ...contentLines, ...after].join('\n');
  }

  /**
   * Append content to end of section
   *
   * @param content - Full markdown document content
   * @param section - Section to append to
   * @param additionalContent - Content to add at the end
   * @returns Updated document content
   */
  static appendToSection(content: string, section: SectionMatch, additionalContent: string): string {
    const currentContent = section.content.trim();
    const newContent = currentContent
      ? `${currentContent}\n\n${additionalContent.trim()}`
      : additionalContent.trim();

    return this.replaceSection(content, section, newContent);
  }

  /**
   * Prepend content to beginning of section
   *
   * @param content - Full markdown document content
   * @param section - Section to prepend to
   * @param additionalContent - Content to add at the beginning
   * @returns Updated document content
   */
  static prependToSection(content: string, section: SectionMatch, additionalContent: string): string {
    const currentContent = section.content.trim();
    const newContent = currentContent
      ? `${additionalContent.trim()}\n\n${currentContent}`
      : additionalContent.trim();

    return this.replaceSection(content, section, newContent);
  }

  /**
   * Parse entire document into sections with hierarchical context
   *
   * @param content - Full markdown document content
   * @returns Array of all sections in document
   */
  private static parseAllSections(content: string): SectionMatch[] {
    const lines = content.split('\n');
    const sections: SectionMatch[] = [];
    const headerStack: Array<{ text: string; level: number; line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2].trim();
        const fullHeader = `${'#'.repeat(level)} ${text}`;

        // Close any sections at this level or deeper
        while (headerStack.length > 0 && headerStack[headerStack.length - 1].level >= level) {
          const prevHeader = headerStack.pop()!;

          // Calculate section content (from header+1 to current line)
          const sectionContent = lines
            .slice(prevHeader.line + 1, i)
            .join('\n')
            .trim();

          // Build hierarchical path
          const hierarchicalPath = [...headerStack.map(h => h.text), prevHeader.text]
            .map(h => h)
            .join(' / ');

          sections.push({
            headerText: prevHeader.text,
            headerLevel: prevHeader.level,
            startLine: prevHeader.line,
            endLine: i,
            content: sectionContent,
            hierarchicalPath
          });
        }

        // Add current header to stack
        headerStack.push({ text: fullHeader, level, line: i });
      }
    }

    // Close remaining sections
    while (headerStack.length > 0) {
      const header = headerStack.pop()!;

      const sectionContent = lines
        .slice(header.line + 1)
        .join('\n')
        .trim();

      const hierarchicalPath = [...headerStack.map(h => h.text), header.text]
        .map(h => h)
        .join(' / ');

      sections.push({
        headerText: header.text,
        headerLevel: header.level,
        startLine: header.line,
        endLine: lines.length,
        content: sectionContent,
        hierarchicalPath
      });
    }

    return sections;
  }

  /**
   * Normalize header text for comparison
   * Removes markdown prefix (###), trims, and lowercases
   *
   * @param headerText - Header text to normalize
   * @returns Normalized text
   */
  private static normalizeHeaderText(headerText: string): string {
    return headerText
      .replace(/^#+\s*/, '') // Remove leading # characters
      .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
      .trim()
      .toLowerCase();
  }
}
