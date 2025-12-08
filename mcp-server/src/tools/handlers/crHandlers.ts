/**
 * CR Handlers Module
 * Extracted CR operation handlers from tools/index.ts
 *
 * This module implements all CR-related MCP tool handlers with:
 * - Dependency injection for services
 * - Anti-duplication through shared service imports
 * - Consistent error handling and response formatting
 */

import { Project } from '@mdt/shared/models/Project.js';
import { Ticket, TicketFilters, TicketData } from '@mdt/shared/models/Ticket.js';
import { CRStatus } from '@mdt/shared/models/Types.js';
import { CRService } from '../../services/crService.js';
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js';
import { TemplateService } from '@mdt/shared/services/TemplateService.js';
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { SimpleContentProcessor } from '../../utils/simpleContentProcessor.js';
import { SimpleSectionValidator } from '../../utils/simpleSectionValidator.js';
import { validateCRKey, validateRequired, validateString, validateOperation } from '../../utils/validation.js';

/**
 * CR Handlers Class
 *
 * Encapsulates all CR-related MCP tool handlers with injected dependencies
 * to prevent code duplication and enable proper testing.
 */
export class CRHandlers {
  constructor(
    private crService: CRService,
    private markdownService: MarkdownService,
    private titleExtractionService: TitleExtractionService,
    private templateService: TemplateService
  ) {}

  /**
   * Handler for list_crs tool
   */
  async handleListCRs(project: Project, filters?: TicketFilters): Promise<string> {
    const crs = await this.crService.listCRs(project, filters);

    if (crs.length === 0) {
      if (filters) {
        return `🎫 No CRs found matching the specified filters in project ${project.project.code || project.id}.`;
      }
      return `🎫 No CRs found in project ${project.project.code || project.id}.`;
    }

    const lines = [`🎫 Found ${crs.length} CR${crs.length === 1 ? '' : 's'}${filters ? ' matching filters' : ''}:`, ''];

    for (const ticket of crs) {
      lines.push(`**${ticket.code}** - ${ticket.title}`);
      lines.push(`- Status: ${ticket.status}`);
      lines.push(`- Type: ${ticket.type}`);
      lines.push(`- Priority: ${ticket.priority}`);
      lines.push(`- Created: ${ticket.dateCreated ? ticket.dateCreated.toISOString().split('T')[0] : 'N/A'}`);
      if (ticket.phaseEpic) {
        lines.push(`- Phase: ${ticket.phaseEpic}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Handler for get_cr tool
   */
  async handleGetCR(project: Project, key: string, mode: string = 'full'): Promise<string> {
    // Validate CR key format
    const keyValidation = validateCRKey(key);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.message);
    }

    // Validate mode parameter
    const modeValidation = validateOperation(mode, ['full', 'attributes', 'metadata'], 'mode');
    if (!modeValidation.valid) {
      throw new Error(modeValidation.message);
    }

    const ticket = await this.crService.getCR(project, keyValidation.value);
    if (!ticket) {
      throw new Error(`CR '${keyValidation.value}' not found in project '${project.project.code || project.id}'`);
    }

    switch (modeValidation.value) {
      case 'full':
        // Return just the plain ticket content
        return ticket.content || '';

      case 'attributes': {
        // Extract YAML frontmatter and return attributes
        const fs = await import('fs/promises');
        try {
          const fileContent = await fs.readFile(ticket.filePath, 'utf-8');

          // Extract YAML frontmatter
          const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/);
          if (!frontmatterMatch) {
            throw new Error(`Invalid CR file format for ${key}: No YAML frontmatter found`);
          }

          const yamlContent = frontmatterMatch[1];

          // Use MarkdownService to parse YAML (anti-duplication)
          const parsedTicket = await MarkdownService.parseMarkdownContent(fileContent);
          if (!parsedTicket) {
            throw new Error(`Failed to parse CR file for ${key}`);
          }

          // Build attributes object from parsed ticket
          const attributes: any = {
            code: parsedTicket.code || key,
            title: ticket.title || parsedTicket.title || 'Untitled',
            status: parsedTicket.status || 'Unknown',
            type: parsedTicket.type || 'Unknown',
            priority: parsedTicket.priority || 'Medium'
          };

          // Add optional fields if present
          const optionalFields = [
            'dateCreated', 'lastModified', 'phaseEpic', 'assignee',
            'dependsOn', 'blocks', 'relatedTickets', 'impactAreas',
            'implementationDate', 'implementationNotes'
          ];

          for (const field of optionalFields) {
            if ((parsedTicket as any)[field] !== undefined) {
              attributes[field] = (parsedTicket as any)[field];
            }
          }

          // Return formatted JSON output
          return JSON.stringify(attributes, null, 2);

        } catch (fileError) {
          throw new Error(`Failed to read CR file for ${key}: ${(fileError as Error).message}`);
        }
      }

      case 'metadata':
        // Return just the key metadata without full YAML parsing
        const metadata = {
          code: ticket.code,
          title: ticket.title,
          status: ticket.status,
          type: ticket.type,
          priority: ticket.priority,
          dateCreated: ticket.dateCreated?.toISOString(),
          lastModified: ticket.lastModified?.toISOString(),
          phaseEpic: ticket.phaseEpic,
          filePath: ticket.filePath
        };

        return JSON.stringify(metadata, null, 2);

      default:
        throw new Error(`Invalid mode '${mode}'. Must be: full, attributes, or metadata`);
    }
  }

  /**
   * Handler for create_cr tool
   */
  async handleCreateCR(project: Project, type: string, data: TicketData): Promise<string> {
    // Validate type parameter
    const typeValidation = validateOperation(type, [
      'Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'
    ], 'type');
    if (!typeValidation.valid) {
      throw new Error(typeValidation.message);
    }

    // Validate data first
    const validation = this.templateService.validateTicketData(data, typeValidation.value);
    if (!validation.valid) {
      const errors = validation.errors.map(e => `- ❌ ${e.field}: ${e.message}`).join('\n');
      throw new Error(`CR data validation failed:\n${errors}`);
    }

    // Process content if provided
    let processedData = { ...data };
    let contentProcessingResult: any = null;

    if (data.content) {
      contentProcessingResult = SimpleContentProcessor.processContent(data.content, {
        operation: 'replace',
        maxLength: 1000000 // 1MB limit for full CR content
      });

      // Check for content processing errors (SimpleContentProcessor throws exceptions directly)
      // No need to check .errors field as SimpleContentProcessor throws on errors

      // Show warnings if any
      if (contentProcessingResult.warnings.length > 0) {
        console.warn(`Content processing warnings for new CR:`, contentProcessingResult.warnings);
      }

      // Use processed content
      processedData.content = contentProcessingResult.content;
    }

    const ticket = await this.crService.createCR(project, typeValidation.value, processedData);

    const lines = [
      `✅ **Created CR ${ticket.code}**: ${ticket.title}`,
      '',
      '**Details:**',
      `- Key: ${ticket.code}`,
      `- Status: ${ticket.status}`,
      `- Type: ${ticket.type}`,
      `- Priority: ${ticket.priority}`,
    ];

    if (ticket.phaseEpic) lines.push(`- Phase: ${ticket.phaseEpic}`);
    lines.push(`- Created: ${ticket.dateCreated ? ticket.dateCreated.toISOString() : 'N/A'}`);
    lines.push('');
    lines.push(`**File Created:** ${ticket.filePath}`);

    // Add processing information if content was provided and processed
    if (data.content && processedData.content !== data.content) {
      lines.push('');
      lines.push('**Content Processing:**');
      lines.push('- Applied content sanitization and formatting');
      if (contentProcessingResult.warnings.length > 0) {
        lines.push(`- ${contentProcessingResult.warnings.length} warning(s) logged to console`);
      }
    }

    if (!data.content) {
      lines.push('');
      lines.push('The CR has been created with a complete template including:');
      lines.push('- Problem statement and description');
      if (data.impactAreas) {
        lines.push(`- Impact areas (${data.impactAreas.join(', ')})`);
      }
      lines.push('- Standard CR sections ready for completion');
      lines.push('- YAML frontmatter with all metadata');
      lines.push('');
      lines.push('Next step: Update the CR with detailed implementation specifications.');
    }

    return lines.join('\n');
  }

  /**
   * Handler for update_cr_status tool
   */
  async handleUpdateCRStatus(project: Project, key: string, status: CRStatus): Promise<string> {
    // Validate CR key format
    const keyValidation = validateCRKey(key);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.message);
    }

    // Validate status parameter
    const statusValidation = validateOperation(status, [
      'Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected'
    ], 'status');
    if (!statusValidation.valid) {
      throw new Error(statusValidation.message);
    }

    // Get current CR to show old status
    const ticket = await this.crService.getCR(project, keyValidation.value);
    if (!ticket) {
      throw new Error(`CR '${keyValidation.value}' not found in project '${project.project.code || project.id}'`);
    }

    const oldStatus = ticket.status;

    // The service now throws specific errors instead of returning false
    await this.crService.updateCRStatus(project, keyValidation.value, statusValidation.value);

    const lines = [
      `✅ **Updated CR ${keyValidation.value}** status`,
      '',
      `**Change:** ${oldStatus} → ${statusValidation.value}`,
      `- Title: ${ticket.title}`,
      `- Updated: ${new Date().toISOString()}`,
      '- File: Updated YAML frontmatter and lastModified timestamp'
    ];

    if (statusValidation.value === 'Approved') {
      lines.push('', 'The CR is now approved and ready for implementation.');
    } else if (statusValidation.value === 'Implemented') {
      lines.push('', 'The CR has been marked as implemented.');
      if (ticket.type === 'Bug Fix') {
        lines.push('Consider deleting this bug fix CR after verification period.');
      }
    }

    return lines.join('\n');
  }

  /**
   * Handler for update_cr_attrs tool
   */
  async handleUpdateCRAttrs(project: Project, key: string, attributes: any): Promise<string> {
    // Validate CR key format
    const keyValidation = validateCRKey(key);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.message);
    }

    // Validate attributes parameter
    const attrsValidation = validateRequired(attributes, 'attributes');
    if (!attrsValidation.valid) {
      throw new Error(attrsValidation.message);
    }

    // Get current CR info
    const ticket = await this.crService.getCR(project, keyValidation.value);
    if (!ticket) {
      throw new Error(`CR '${keyValidation.value}' not found in project '${project.project.code || project.id}'`);
    }

    const success = await this.crService.updateCRAttrs(project, keyValidation.value, attributes);
    if (!success) {
      throw new Error(`Failed to update CR '${keyValidation.value}' attributes`);
    }

    const lines = [
      `✅ **Updated CR ${keyValidation.value} Attributes**`,
      '',
      `- Title: ${ticket.title}`,
      `- Status: ${ticket.status}`,
      '',
      '**Updated Fields:**'
    ];

    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        lines.push(`- ${field}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Handler for delete_cr tool
   */
  async handleDeleteCR(project: Project, key: string): Promise<string> {
    // Validate CR key format
    const keyValidation = validateCRKey(key);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.message);
    }

    // Get CR info before deletion
    const ticket = await this.crService.getCR(project, keyValidation.value);
    if (!ticket) {
      throw new Error(`CR '${keyValidation.value}' not found in project '${project.project.code || project.id}'`);
    }

    const success = await this.crService.deleteCR(project, keyValidation.value);
    if (!success) {
      throw new Error(`Failed to delete CR '${keyValidation.value}'`);
    }

    const lines = [
      `🗑️ **Deleted CR ${keyValidation.value}**`,
      '',
      `- Title: ${ticket.title}`,
      `- Type: ${ticket.type}`,
      `- Status: ${ticket.status}`
    ];

    if (ticket.type === 'Bug Fix') {
      lines.push('', 'The bug fix CR has been deleted as it was implemented and verified. Bug CRs are typically removed after successful implementation to reduce clutter, as documented in the CR lifecycle.');
    }

    return lines.join('\n');
  }

  /**
   * Handler for suggest_cr_improvements tool
   */
  async handleSuggestCRImprovements(project: Project, key: string): Promise<string> {
    // Validate CR key format
    const keyValidation = validateCRKey(key);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.message);
    }

    const ticket = await this.crService.getCR(project, keyValidation.value);
    if (!ticket) {
      throw new Error(`CR '${keyValidation.value}' not found in project '${project.project.code || project.id}'`);
    }

    const suggestions = this.templateService.suggestImprovements(ticket);

    return [
      `💡 **CR Improvement Suggestions for ${keyValidation.value}**`,
      '',
      `**Current CR:** ${ticket.title}`,
      '',
      ...suggestions.map((suggestion, index) => {
        const priority = index < 3 ? 'High-Priority' : index < 6 ? 'Medium-Priority' : 'Low-Priority';
        return [
          `**${priority} Improvement:**`,
          '',
          `${index + 1}. **${suggestion.title}**`,
          `   ${suggestion.description}`,
          `   *Actionable:* ${suggestion.actionable ? 'Yes' : 'No'}`,
          ''
        ].join('\n');
      })
    ].join('\n');
  }
}