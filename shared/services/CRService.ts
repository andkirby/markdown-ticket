import { Ticket, TicketData } from '../models/Ticket.js';

export class CRService {

  /**
   * Create a new ticket object from input data
   */
  static createTicket(data: TicketData, ticketCode: string, ticketType: string, filePath: string): Ticket {
    const now = new Date();

    return {
      code: ticketCode,
      title: data.title,
      status: 'Proposed',
      type: ticketType,
      priority: data.priority || 'Medium',
      dateCreated: now,
      lastModified: now,
      content: data.content || '',
      filePath,
      phaseEpic: data.phaseEpic,
      assignee: data.assignee,
      relatedTickets: this.parseArrayField(data.relatedTickets),
      dependsOn: this.parseArrayField(data.dependsOn),
      blocks: this.parseArrayField(data.blocks)
    };
  }

  /**
   * Parse comma-separated string or array into array
   */
  static parseArrayField(field?: string | string[]): string[] {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string' && field.trim()) {
      return field.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  }
}
