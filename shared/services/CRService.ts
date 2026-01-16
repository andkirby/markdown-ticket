import type { TicketData } from '../models/Ticket.js'
import { TitleExtractionService } from './TitleExtractionService.js'

export class CRService {
  static titleService = new TitleExtractionService()

  /**
   * Create a new ticket object from input data
   */
  static createTicket(data: TicketData, ticketCode: string, ticketType: string, filePath: string) {
    const now = new Date()
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
      blocks: this.parseArrayField(data.blocks),
    }
  }

  /**
   * Extract title from H1 header with fallback to filename
   * Implements MDT-064: H1 as Single Source of Truth
   *
   * @param projectPath Project root path
   * @param filePath File path
   * @param content Optional file content
   * @returns Extracted title
   */
  static async extractTitle(projectPath: string, filePath: string, content?: string): Promise<string> {
    return await this.titleService.extractTitle(projectPath, filePath, content)
  }

  /**
   * Process content to hide additional H1 headers (keep only first)
   * Used for UI display to prevent title duplication
   *
   * @param content Markdown content
   * @returns Processed content
   */
  static processContentForDisplay(content: string): string {
    return this.titleService.processContentForDisplay(content)
  }

  /**
   * Invalidate title cache for specific file
   *
   * @param projectPath Project root path
   * @param filePath File path
   */
  static invalidateTitleCache(projectPath: string, filePath: string): void {
    this.titleService.invalidateCache(projectPath, filePath)
  }

  /**
   * Parse comma-separated string or array into array
   */
  static parseArrayField(field: string | string[] | undefined): string[] {
    if (Array.isArray(field))
      return field.filter((item: string) => !/^(?:none|n\/a|null|undefined)$/i.test(item.trim()))
    if (typeof field === 'string' && field.trim()) {
      return field.split(',').map(item => item.trim()).filter(Boolean).filter((item: string) => !/^(?:none|n\/a|null|undefined)$/i.test(item))
    }
    return []
  }
}
