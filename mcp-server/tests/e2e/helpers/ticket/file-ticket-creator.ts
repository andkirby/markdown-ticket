/**
 * File-based Ticket Creator - wrapper around shared services
 */
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import { CRService } from '@mdt/shared/services/CRService.js';
import type { TestCRData, MCPResponse, ValidationResult, ValidationError, ValidationWarning } from '../types/project-factory-types.js';
import type { TicketCreator } from './ticket-creator.js';

export class FileTicketCreator implements TicketCreator {
  constructor(private projectPath: string) {}

  private generateTicketCode(projectCode: string): string {
    const crsDir = path.join(this.projectPath, 'docs', 'CRs');
    let maxNumber = 0;

    if (fs.existsSync(crsDir)) {
      const files = fs.readdirSync(crsDir);
      for (const file of files) {
        const match = file.match(new RegExp(`^${projectCode}-(\\d+)\\.md$`));
        if (match) {
          maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
        }
      }
    }

    return `${projectCode}-${String(maxNumber + 1).padStart(3, '0')}`;
  }

  async createTicket(projectCode: string, data: TestCRData): Promise<MCPResponse> {
    try {
      const ticketCode = this.generateTicketCode(projectCode);
      const ticketData = {
        title: data.title,
        type: data.type,
        content: data.content,
        priority: data.priority || 'Medium',
        phaseEpic: data.phaseEpic,
        relatedTickets: undefined,
        dependsOn: data.dependsOn,
        blocks: data.blocks,
        assignee: data.assignee
      };

      const ticket = CRService.createTicket(ticketData, ticketCode, data.type, '');
      const now = new Date();
      ticket.dateCreated = now;
      ticket.lastModified = now;

      const crFilePath = path.join(this.projectPath, 'docs', 'CRs', `${ticketCode}.md`);
      MarkdownService.writeMarkdownFile(crFilePath, ticket);

      return { success: true, key: ticketCode, data: { ticket: { code: ticketCode, title: data.title, path: crFilePath } } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async createMultipleTickets(projectCode: string, ticketsData: TestCRData[]): Promise<MCPResponse[]> {
    return Promise.all(ticketsData.map(data => this.createTicket(projectCode, data)));
  }

  validateTicket(data: TestCRData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data.title?.trim()) errors.push({ code: 'MISSING_TITLE', message: 'Title is required', field: 'title' });
    if (!data.type?.trim()) errors.push({ code: 'MISSING_TYPE', message: 'Type is required', field: 'type' });
    if (!data.content?.trim()) errors.push({ code: 'MISSING_CONTENT', message: 'Content is required', field: 'content' });

    const requiredSections = ['## 1. Description', '## 2. Rationale', '## 3. Solution Analysis', '## 4. Implementation Specification', '## 5. Acceptance Criteria'];
    requiredSections.forEach(section => {
      if (!data.content.includes(section)) {
        errors.push({ code: 'MISSING_SECTION', message: `Missing required section: ${section}`, field: 'content' });
      }
    });

    const validTypes = ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'];
    const validStatuses = ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected'];
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

    if (data.type && !validTypes.includes(data.type)) errors.push({ code: 'INVALID_TYPE', message: `Type must be one of: ${validTypes.join(', ')}`, field: 'type' });
    if (data.status && !validStatuses.includes(data.status)) errors.push({ code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}`, field: 'status' });
    if (data.priority && !validPriorities.includes(data.priority)) errors.push({ code: 'INVALID_PRIORITY', message: `Priority must be one of: ${validPriorities.join(', ')}`, field: 'priority' });

    if (data.title && data.title.length > 100) warnings.push({ code: 'TITLE_TOO_LONG', message: 'Title is longer than 100 characters', field: 'title' });

    return { valid: errors.length === 0, errors, warnings };
  }

  getCreatorType(): string {
    return 'file';
  }
}