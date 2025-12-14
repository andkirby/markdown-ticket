/**
 * Section handlers for MCP tools
 * Handles all section-related operations for CRs
 */

import { MarkdownSectionService, SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js';
import { SimpleContentProcessor } from '../../utils/simpleContentProcessor.js';
import { SimpleSectionValidator } from '../../utils/simpleSectionValidator.js';
import { Project } from '@mdt/shared/models/Project.js';
import { CRService } from '../../services/crService.js';
import { validateCRKey, validateRequired, validateString, validateOperation } from '../../utils/validation.js';
import { Sanitizer } from '../../utils/sanitizer.js';
import { ToolError, JsonRpcErrorCode } from '../../utils/toolError.js';

export interface SectionOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

export class SectionHandlers {
  constructor(
    private crService: CRService,
    private markdownSectionService: typeof MarkdownSectionService
  ) {}

  /**
   * Handle manage_cr_sections tool calls
   */
  async handleManageCRSections(
    project: Project,
    key: string,
    operation: string,
    section?: string,
    content?: string
  ): Promise<string> {
    
    // Validate CR key format
    const keyValidation = validateCRKey(key);
    if (!keyValidation.valid) {
      throw ToolError.protocol(keyValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
    }

    // Backward compatibility: map legacy 'update' operation to 'replace'
    if (operation === 'update') {
      operation = 'replace';
    }

    // Validate operation parameter
    const operationValidation = validateOperation(operation, ['list', 'get', 'replace', 'append', 'prepend']);
    if (!operationValidation.valid) {
      throw ToolError.protocol(operationValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
    }

    switch (operationValidation.value) {
      case 'list':
        return await this.handleListSections(project, keyValidation.value);

      case 'get':
        const sectionValidation1 = validateRequired(section, 'section');
        if (!sectionValidation1.valid) {
          throw ToolError.protocol(sectionValidation1.message || "Validation error", JsonRpcErrorCode.InvalidParams);
        }
        return await this.handleGetSection(project, keyValidation.value, sectionValidation1.value);

      case 'replace':
      case 'append':
      case 'prepend':
        const sectionValidation2 = validateRequired(section, 'section');
        if (!sectionValidation2.valid) {
          throw ToolError.protocol(sectionValidation2.message || "Validation error", JsonRpcErrorCode.InvalidParams);
        }

        const contentValidation = validateRequired(content, 'content');
        if (!contentValidation.valid) {
          throw ToolError.protocol(contentValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
        }

        return await this.handleModifySection(
          project,
          keyValidation.value,
          operationValidation.value,
          sectionValidation2.value,
          contentValidation.value
        );

      default:
        throw ToolError.protocol(`Invalid operation '${operation}'. Must be: list, get, replace, append, or prepend`, JsonRpcErrorCode.InvalidParams);
    }
  }

  /**
   * List all sections in a CR
   */
  private async handleListSections(project: Project, key: string): Promise<string> {
    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${key}' not found in project`);
    }

    // Read file content
    const fs = await import('fs/promises');
    const fileContent = await fs.readFile(ticket.filePath, 'utf-8');

    // Extract markdown body (after YAML frontmatter)
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      throw ToolError.toolExecution(`Invalid CR file format for ${key}: No YAML frontmatter found`);
    }

    const markdownBody = frontmatterMatch[2];

    // Get all sections
    const allSections = this.markdownSectionService.findSection(markdownBody, '');

    if (allSections.length === 0) {
      return Sanitizer.sanitizeText([
        `📑 **Sections in CR ${key}**`,
        '',
        `- Title: ${Sanitizer.sanitizeText(ticket.title)}`,
        '',
        '*(No sections found - document may be empty or improperly formatted)*'
      ].join('\n'));
    }

    const lines = [
      `📑 **Sections in CR ${key}** - ${Sanitizer.sanitizeText(ticket.title)}`,
      '',
      `Found ${allSections.length} section${allSections.length === 1 ? '' : 's'}:`,
      ''
    ];

    // Build tree structure based on header levels
    for (const section of allSections) {
      // Calculate indentation based on header level (# = 0, ## = 1, ### = 2, etc.)
      const indent = '  '.repeat(Math.max(0, section.headerLevel - 1));

      const contentPreview = section.content.trim() ?
        ` (${section.content.length} chars)` :
        ' (empty)';

      lines.push(`${indent}- ${Sanitizer.sanitizeText(section.headerText)}${contentPreview}`);
    }

    lines.push('');
    lines.push('**Usage:**');
    lines.push('To read or update a section, you can use flexible formats:');
    lines.push('- User-friendly: `section: "1. Description"` or `section: "Description"`');
    lines.push('- Exact format: `section: "## 1. Description"`');
    lines.push('');
    lines.push('**Examples:**');
    lines.push('- `section: "1. Feature Description"` - matches "## 1. Feature Description"');
    lines.push('- `section: "Feature Description"` - matches "## 1. Feature Description"');
    lines.push('- `section: "### Key Features"` - exact match for subsection');

    return Sanitizer.sanitizeText(lines.join('\n'));
  }

  /**
   * Get a specific section from a CR
   */
  private async handleGetSection(project: Project, key: string, section: string): Promise<string> {
    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${key}' not found in project`);
    }

    // Read file content
    const fs = await import('fs/promises');
    const fileContent = await fs.readFile(ticket.filePath, 'utf-8');

    // Extract markdown body (after YAML frontmatter)
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      throw ToolError.toolExecution(`Invalid CR file format for ${key}: No YAML frontmatter found`);
    }

    const markdownBody = frontmatterMatch[2];

    // Find section
    const matches = this.markdownSectionService.findSection(markdownBody, section);

    if (matches.length === 0) {
      throw ToolError.toolExecution(`Section "${Sanitizer.sanitizeText(section)}" not found in CR ${key}. Use manage_cr_sections with operation="list" to see available sections.`);
    }

    if (matches.length > 1) {
      const paths = matches.map(m => m.hierarchicalPath).join('\n  - ');
      throw ToolError.toolExecution(
        `Multiple sections match "${section}". Please use a hierarchical path:\n  - ${paths}`
      );
    }

    const matchedSection = matches[0];

    // Sanitize the section content for output
    const sanitizedContent = Sanitizer.sanitizeMarkdown(matchedSection.content);

    return Sanitizer.sanitizeText([
      `📖 **Section Content from CR ${key}**`,
      '',
      `**Section:** ${Sanitizer.sanitizeText(matchedSection.hierarchicalPath)}`,
      `**Content Length:** ${matchedSection.content.length} characters`,
      '',
      '---',
      '',
      sanitizedContent,
      '',
      '---',
      '',
      `Use \`manage_cr_sections\` with operation="replace", "append", or "prepend" to modify this section.`
    ].join('\n'));
  }

  /**
   * Modify a section in a CR (replace, append, or prepend)
   */
  private async handleModifySection(
    project: Project,
    key: string,
    operation: 'replace' | 'append' | 'prepend',
    section: string,
    content: string
  ): Promise<string> {
    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${key}' not found in project`);
    }

    // Read file content
    const fs = await import('fs/promises');
    const fileContent = await fs.readFile(ticket.filePath, 'utf-8');

    // Extract markdown body (after YAML frontmatter)
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      throw ToolError.toolExecution(`Invalid CR file format for ${key}: No YAML frontmatter found`);
    }

    const yamlFrontmatter = frontmatterMatch[1];
    const markdownBody = frontmatterMatch[2];

    // Simple section validation
    const availableSections = SimpleSectionValidator.extractSections(markdownBody);
    const sectionValidation = SimpleSectionValidator.validateSection(section, availableSections);

    if (!sectionValidation.valid) {
      const errorMessage = [
        `❌ **Section validation failed**`,
        '',
        `**Errors:**`,
        ...sectionValidation.errors.map(error => `- ${error}`),
        ''
      ];

      if (sectionValidation.suggestions.length > 0) {
        errorMessage.push('**Suggestions:**');
        errorMessage.push(...sectionValidation.suggestions.map(suggestion => `- ${suggestion}`));
        errorMessage.push('');
      }

      errorMessage.push(`Use \`manage_cr_sections\` with operation="list" to see all available sections in CR ${key}.`);
      throw ToolError.toolExecution(errorMessage.join('\n'));
    }

    // Find section using normalized identifier
    const matches = this.markdownSectionService.findSection(markdownBody, sectionValidation.normalized || section);

    if (matches.length === 0) {
      // Section not found - list available sections
      const sectionList = availableSections
        .map(s => `  - "${s}"`)
        .join('\n');

      throw ToolError.toolExecution(
        `Section '${Sanitizer.sanitizeText(section)}' not found in CR ${key}.\n\n` +
        `Available sections:\n${sectionList || '  (none)'}`
      );
    }

    if (matches.length > 1) {
      // Multiple matches - require hierarchical path
      const paths = matches.map(m => `  - "${m.hierarchicalPath}"`).join('\n');
      throw ToolError.toolExecution(
        `Multiple sections found matching '${Sanitizer.sanitizeText(section)}'.\n\n` +
        `Please specify which one using hierarchical path:\n${paths}`
      );
    }

    // Process content with simple sanitization
    const contentProcessingResult = SimpleContentProcessor.processContent(content, {
      operation,
      maxLength: 500000 // 500KB limit for section content
    });

    // Show warnings if any
    if (contentProcessingResult.warnings.length > 0) {
      console.warn(`Content processing warnings for ${key}:`, contentProcessingResult.warnings);
    }

    // Use processed content
    let processedContent = contentProcessingResult.content;

    // Single match - proceed with update
    const matchedSection = matches[0];

    // Handle section header updates intelligently
    // If content starts with a header at the same level as the section, use it as the new section header
    // This allows restructuring/renaming while keeping headers explicit and intentional
    const sectionHeaderLevel = matchedSection.headerLevel;
    const headerPrefix = '#'.repeat(sectionHeaderLevel);
    const firstHeaderPattern = new RegExp(`^${headerPrefix} (.+?)$`, 'm');
    const firstHeaderMatch = processedContent.match(firstHeaderPattern);

    let newSectionHeader: string | null = null;
    let sectionBody = processedContent;

    if (firstHeaderMatch) {
      // Found a header at the same level - use it as new section header
      newSectionHeader = firstHeaderMatch[0]; // Full header line "## New Name"
      const newHeaderText = firstHeaderMatch[1]; // Just the text "New Name"

      // Extract body (everything after the first header)
      const headerIndex = processedContent.indexOf(firstHeaderMatch[0]);
      sectionBody = processedContent
        .substring(headerIndex + firstHeaderMatch[0].length)
        .trim();

      console.warn(
        `ℹ️ Section "${matchedSection.headerText}" is being renamed to "${newHeaderText}". ` +
        `This is intentional since you provided the new header in the content.`
      );
    }

    let updatedBody: string;

    switch (operation) {
      case 'replace':
        // CRITICAL BUG FIX: replaceSection keeps the old header from matchedSection
        // and adds the body we provide. So we MUST NOT include a header in the content!
        // If a new header was detected, we'll replace it after calling replaceSection.
        const replaceContent = newSectionHeader ? sectionBody : processedContent;
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
        throw ToolError.toolExecution(`Invalid operation '${operation}'. Must be: list, get, replace, append, or prepend`);
    }

    // Update lastModified in YAML
    const now = new Date().toISOString();
    const updatedYaml = yamlFrontmatter.replace(
      /lastModified:.*$/m,
      `lastModified: ${now}`
    );

    // Reconstruct full document
    const updatedContent = `---\n${updatedYaml}\n---\n${updatedBody}`;

    // Write back to file
    await fs.writeFile(ticket.filePath, updatedContent, 'utf-8');

    const lines = [
      `✅ **Updated Section in CR ${key}**`,
      '',
      `**Section:** ${Sanitizer.sanitizeText(matchedSection.hierarchicalPath)}`,
      `**Operation:** ${operation}`,
      `**Content Length:** ${processedContent.length} characters`,
      '',
      `- Title: ${Sanitizer.sanitizeText(ticket.title)}`,
      `- Updated: ${now}`,
      `- File: ${ticket.filePath}`
    ];

    // Add processing information
    if (contentProcessingResult.modified) {
      lines.push('');
      lines.push('**Content Processing:**');
      if (contentProcessingResult.warnings.length > 0) {
        lines.push('- Applied content sanitization and formatting');
        lines.push(`- ${contentProcessingResult.warnings.length} warning(s) logged to console`);
      } else {
        lines.push('- Content processed successfully');
      }
    }

    // Add helpful message based on operation
    if (operation === 'replace') {
      lines.push('', `The section content has been completely replaced.`);
    } else if (operation === 'append') {
      lines.push('', `Content has been added to the end of the section.`);
    } else if (operation === 'prepend') {
      lines.push('', `Content has been added to the beginning of the section.`);
    }

    return Sanitizer.sanitizeText(lines.join('\n'));
  }
}