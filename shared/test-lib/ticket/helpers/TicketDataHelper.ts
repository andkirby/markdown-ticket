/**
 * Ticket Data Transformation Helper
 *
 * Purpose: Handle ticket data transformation and merging
 * Reuses: CRService from shared/services/
 */

import type { Ticket, TicketData } from '../../../models/Ticket.js'
import { CRService } from '../../../services/CRService.js'

export class TicketDataHelper {
  /**
   * Merge update data with existing ticket data
   * Extracted from FileTicketCreator.mergeTicketData()
   *
   * @param existing - Existing ticket data (or null for new tickets)
   * @param updates - Partial update data
   * @returns Merged ticket data with defaults
   */
  static mergeTicketData(
    existing: TicketData | null,
    updates: Partial<TicketData>,
  ): TicketData {
    return {
      title: updates.title || existing?.title || '',
      type: updates.type || existing?.type || 'Feature Enhancement',
      content: updates.content || existing?.content || '',
      priority: updates.priority || existing?.priority || 'Medium',
      phaseEpic: updates.phaseEpic || existing?.phaseEpic,
      relatedTickets: updates.relatedTickets || existing?.relatedTickets,
      dependsOn: updates.dependsOn || existing?.dependsOn,
      blocks: updates.blocks || existing?.blocks,
      assignee: updates.assignee || existing?.assignee,
    }
  }

  /**
   * Build Ticket object from data
   * Uses CRService.createTicket() - shared service
   *
   * @param data - Ticket data
   * @param ticketCode - Ticket code (e.g., "MDT-001")
   * @param filePath - File path for the ticket
   * @returns Ticket object with timestamps
   */
  static buildTicket(
    data: TicketData,
    ticketCode: string,
    filePath: string,
  ): Ticket {
    const ticket = CRService.createTicket(data, ticketCode, data.type, filePath)
    const now = new Date()
    ticket.dateCreated = ticket.dateCreated || now
    ticket.lastModified = now
    return ticket
  }

  /**
   * Transform Ticket to TicketData for updates
   * Handles array <-> string conversions
   *
   * @param ticket - Ticket object from file
   * @returns TicketData with comma-separated values
   */
  static ticketToTicketData(ticket: Ticket): TicketData {
    return {
      title: ticket.title,
      type: ticket.type,
      content: ticket.content,
      priority: ticket.priority,
      phaseEpic: ticket.phaseEpic,
      relatedTickets: ticket.relatedTickets.join(','),
      dependsOn: ticket.dependsOn.join(','),
      blocks: ticket.blocks.join(','),
      assignee: ticket.assignee,
    }
  }
}
