/**
 * Ticket Creator Interface and Base Classes.
 */

import type { CRPriorityValue, CRTypeValue } from '@mdt/domain-contracts'
import type { TicketData } from '../../models/Ticket.js'
import type { CRStatus, ValidationResult } from '../../models/Types.js'

/** Configuration for ticket creation */
export interface TicketCreationConfig {
  projectCode: string
  projectPath: string
  ticketsPath?: string
  validateContent?: boolean
}

/** Result of ticket creation operation */
export interface TicketCreationResult {
  success: boolean
  ticketCode?: string
  ticket?: any
  filePath?: string
  error?: string
}

/** Interface for creating CRs/tickets */
export interface ITicketCreator {
  createTicket: (config: TicketCreationConfig, data: TicketData) => Promise<TicketCreationResult>
  createMultipleTickets: (config: TicketCreationConfig, ticketsData: TicketData[]) => Promise<TicketCreationResult[]>
  validateTicket: (data: TicketData) => ValidationResult
  getCreatorType: () => string
}

/** Abstract base class for ticket creators */
export abstract class BaseTicketCreator implements ITicketCreator {
  protected readonly validTypes: CRTypeValue[] = ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation', 'Research']
  protected readonly validStatuses: CRStatus[] = ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected']
  protected readonly validPriorities: CRPriorityValue[] = ['Low', 'Medium', 'High', 'Critical']

  /** Generate next ticket code */
  protected abstract generateTicketCode(projectCode: string, projectPath: string, ticketsPath?: string): string | Promise<string>

  /** Create a single ticket/CR */
  abstract createTicket(config: TicketCreationConfig, data: TicketData): Promise<TicketCreationResult>

  /** Create multiple tickets */
  async createMultipleTickets(config: TicketCreationConfig, ticketsData: TicketData[]): Promise<TicketCreationResult[]> {
    const results: TicketCreationResult[] = []

    for (const data of ticketsData) {
      const result = await this.createTicket(config, data)

      results.push(result)
    }

    return results
  }

  /** Validate ticket data */
  validateTicket(data: TicketData): ValidationResult {
    const errors: { field: string, message: string }[] = []
    const warnings: { field: string, message: string }[] = []

    if (!data.title.trim()) {
      errors.push({ field: 'title', message: 'Title is required' })
    }
    else if (data.title.length > 100) {
      warnings.push({ field: 'title', message: 'Title longer than 100 characters' })
    }

    if (!data.type.trim()) {
      errors.push({ field: 'type', message: 'Type is required' })
    }
    else if (!this.validTypes.includes(data.type as CRTypeValue)) {
      errors.push({ field: 'type', message: `Type must be one of: ${this.validTypes.join(', ')}` })
    }

    if (!data.content?.trim()) {
      errors.push({ field: 'content', message: 'Content is required' })
    }

    if (data.priority && !this.validPriorities.includes(data.priority as CRPriorityValue)) {
      errors.push({ field: 'priority', message: `Priority must be one of: ${this.validPriorities.join(', ')}` })
    }

    if (data.content) {
      const requiredSections = ['## 1. Description', '## 2. Rationale', '## 3. Solution Analysis', '## 4. Implementation Specification', '## 5. Acceptance Criteria']

      requiredSections.forEach((section) => {
        if (!data.content?.includes(section)) {
          errors.push({ field: 'content', message: `Missing required section: ${section}` })
        }
      })
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  /** Get creator type identifier. */
  abstract getCreatorType(): string
}
