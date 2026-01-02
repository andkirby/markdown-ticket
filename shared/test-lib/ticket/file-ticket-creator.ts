/**
 * File-based Ticket Creator Implementation
 */

import * as fs from 'fs';
import { join as pathJoin } from 'path';
import { MarkdownService } from '../../services/MarkdownService.js';
import { CRService } from '../../services/CRService.js';
import { TemplateService } from '../../services/TemplateService.js';
import { BaseTicketCreator, type TicketCreationConfig, type TicketCreationResult } from './ticket-creator.js';
import { RetryHelper } from '../utils/retry-helper.js';
import type { TicketData } from '../../models/Ticket.js';
import type { CRType } from '../../models/Types.js';

/** File-based ticket creator */
export class FileTicketCreator extends BaseTicketCreator {
  private templateService: TemplateService;
  private retryHelper: RetryHelper;

  constructor() {
    super();
    this.templateService = new TemplateService(undefined, true);

    // Initialize retry helper for file operations
    this.retryHelper = new RetryHelper({
      maxAttempts: 3,
      initialDelay: 100,
      backoffMultiplier: 2.0,
      maxDelay: 1000,
      timeout: 5000,
      retryableErrors: ['EACCES', 'ENOENT', 'EEXIST', 'EBUSY', 'EMFILE', 'ENFILE', 'EIO'],
      logContext: 'FileTicketCreator'
    });
  }

  /** Generate next ticket code */
  protected generateTicketCode(projectCode: string, projectPath: string, ticketsPath?: string): string {
    const crsDir = pathJoin(projectPath, ticketsPath || 'docs', 'CRs');
    let maxNumber = 0;

    try {
      if (fs.existsSync(crsDir)) {
        const files = this.retryHelper.executeSync(
          () => fs.readdirSync(crsDir),
          { logContext: `FileTicketCreator.readDir(${projectCode})` }
        );

        const regex = new RegExp(`^${projectCode}-(\\d+)\\.md$`, 'i');
        for (const file of files) {
          const match = file.match(regex);
          if (match) maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
        }
      }
      return `${projectCode}-${String(maxNumber + 1).padStart(3, '0')}`;
    } catch (error) {
      console.error(`Failed to generate ticket code for ${projectCode}:`, error);
      return `${projectCode}-001`;
    }
  }

  /** Create a single ticket file */
  async createTicket(config: TicketCreationConfig, data: TicketData): Promise<TicketCreationResult> {
    try {
      // Validate content if requested
      if (config.validateContent !== false) {
        const validation = this.validateTicket(data);
        if (!validation.valid) {
          return { success: false, error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}` };
        }
      }

      // Generate ticket code
      const ticketCode = this.generateTicketCode(config.projectCode, config.projectPath, config.ticketsPath);
      const ticketsDir = pathJoin(config.projectPath, config.ticketsPath || 'docs', 'CRs');

      // Ensure CRs directory exists
      if (!fs.existsSync(ticketsDir)) {
        await this.retryHelper.execute(
          async () => fs.mkdirSync(ticketsDir, { recursive: true }),
          { logContext: `FileTicketCreator.createCRsDir(${config.projectCode})` }
        );
      }

      // Get or generate content
      let content = data.content;
      if (!content && data.type) {
        try {
          content = await this.retryHelper.execute(
            async () => {
              const template = this.templateService.getTemplate(data.type as CRType);
              return template ? template.template.replace('[Ticket Title]', data.title) : undefined;
            },
            { logContext: `FileTicketCreator.getTemplate(${data.type})`, timeout: 2000 }
          );
        } catch {
          content = undefined;
        }

        // Fallback to minimal content if template fails
        if (!content) {
          content = this.generateMinimalContent(data.title, data.type as CRType);
        }
      }

      // Create and write ticket with retry
      const ticketData = {
        title: data.title,
        type: data.type,
        content,
        priority: data.priority || 'Medium',
        phaseEpic: data.phaseEpic,
        relatedTickets: data.relatedTickets,
        dependsOn: data.dependsOn,
        blocks: data.blocks,
        assignee: data.assignee
      };

      const ticket = CRService.createTicket(ticketData, ticketCode, data.type, '');
      ticket.dateCreated = ticket.lastModified = new Date();

      const filePath = pathJoin(ticketsDir, `${ticketCode}.md`);

      // Write markdown file
      await this.retryHelper.execute(
        async () => MarkdownService.writeMarkdownFile(filePath, ticket),
        { logContext: `FileTicketCreator.writeMarkdownFile(${ticketCode})` }
      );

      return { success: true, ticketCode, ticket, filePath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /** Generate minimal content structure */
  private generateMinimalContent(title: string, type: CRType): string {
    const now = new Date().toISOString().split('T')[0];
    return `# ${title}

## 1. Description
Problem statement and context.

## 2. Rationale
Why this change is necessary.

## 3. Solution Analysis
Evaluated alternatives and selected approach.

## 4. Implementation Specification
Technical details and implementation plan.

## 5. Acceptance Criteria
- [ ] Measurable completion criteria
- [ ] Testing requirements

---
*CR created on ${now}*`;
  }

  getCreatorType(): string { return 'file'; }

  /** Check if ticket exists */
  ticketExists(projectPath: string, ticketCode: string, ticketsPath?: string): boolean {
    try {
      const filePath = pathJoin(projectPath, ticketsPath || 'docs', 'CRs', `${ticketCode}.md`);
      return this.retryHelper.executeSync(
        () => fs.existsSync(filePath),
        { logContext: `FileTicketCreator.ticketExists(${ticketCode})` }
      );
    } catch {
      return false;
    }
  }

  /** Read existing ticket */
  async readTicket(projectPath: string, ticketCode: string, ticketsPath?: string): Promise<TicketData | null> {
    try {
      const filePath = pathJoin(projectPath, ticketsPath || 'docs', 'CRs', `${ticketCode}.md`);

      // Check if file exists
      const exists = await this.retryHelper.execute(
        async () => fs.existsSync(filePath),
        { logContext: `FileTicketCreator.checkTicketExists(${ticketCode})` }
      );

      if (!exists) return null;

      // Parse markdown file
      const ticket = await this.retryHelper.execute(
        async () => await MarkdownService.parseMarkdownFile(filePath),
        { logContext: `FileTicketCreator.parseMarkdownFile(${ticketCode})`, timeout: 3000 }
      );

      return ticket ? {
        title: ticket.title,
        type: ticket.type,
        content: ticket.content,
        priority: ticket.priority,
        phaseEpic: ticket.phaseEpic,
        relatedTickets: ticket.relatedTickets.join(','),
        dependsOn: ticket.dependsOn.join(','),
        blocks: ticket.blocks.join(','),
        assignee: ticket.assignee
      } : null;
    } catch {
      return null;
    }
  }

  /** Update existing ticket */
  async updateTicket(config: TicketCreationConfig, ticketCode: string, data: Partial<TicketData>): Promise<TicketCreationResult> {
    try {
      // Read existing ticket with retry
      const existing = await this.readTicket(config.projectPath, ticketCode, config.ticketsPath);
      const mergedData: TicketData = {
        title: data.title || existing?.title || '',
        type: data.type || existing?.type || 'Feature Enhancement',
        content: data.content || existing?.content || '',
        priority: data.priority || existing?.priority || 'Medium',
        phaseEpic: data.phaseEpic || existing?.phaseEpic,
        relatedTickets: data.relatedTickets || existing?.relatedTickets,
        dependsOn: data.dependsOn || existing?.dependsOn,
        blocks: data.blocks || existing?.blocks,
        assignee: data.assignee || existing?.assignee
      };
      return await this.createTicketWithCode(config, ticketCode, mergedData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /** Create ticket with specific code */
  private async createTicketWithCode(config: TicketCreationConfig, ticketCode: string, data: TicketData): Promise<TicketCreationResult> {
    try {
      const crsDir = pathJoin(config.projectPath, config.ticketsPath || 'docs', 'CRs');

      // Ensure CRs directory exists
      if (!fs.existsSync(crsDir)) {
        await this.retryHelper.execute(
          async () => fs.mkdirSync(crsDir, { recursive: true }),
          { logContext: `FileTicketCreator.ensureCRsDirForUpdate(${config.projectCode})` }
        );
      }

      const ticketData = {
        title: data.title,
        type: data.type,
        content: data.content,
        priority: data.priority || 'Medium',
        phaseEpic: data.phaseEpic,
        relatedTickets: data.relatedTickets,
        dependsOn: data.dependsOn,
        blocks: data.blocks,
        assignee: data.assignee
      };

      const ticket = CRService.createTicket(ticketData, ticketCode, data.type, '');
      const now = new Date();
      ticket.lastModified = now;
      if (!ticket.dateCreated) ticket.dateCreated = now;

      const filePath = pathJoin(crsDir, `${ticketCode}.md`);

      // Write markdown file
      await this.retryHelper.execute(
        async () => MarkdownService.writeMarkdownFile(filePath, ticket),
        { logContext: `FileTicketCreator.updateMarkdownFile(${ticketCode})` }
      );

      return { success: true, ticketCode, ticket, filePath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Re-export types for convenience
export type { TicketCreationConfig, TicketCreationResult } from './ticket-creator.js';