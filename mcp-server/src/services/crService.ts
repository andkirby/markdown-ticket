import type { Project } from '@mdt/shared/models/Project.js'
/**
 * MCP CR Service - Wrapper around Shared TicketService
 * Delegates all CRUD operations to shared/services/TicketService.ts
 * Consolidated per MDT-082
 */
import type { Ticket, TicketData, TicketFilters } from '@mdt/shared/models/Ticket.js'
import type { CRStatus } from '@mdt/shared/models/Types.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'

/**
 * CRService - Thin wrapper around shared TicketService
 * Maintains backward compatibility with existing MCP tools
 */
export class CRService {
  private ticketService: TicketService

  constructor() {
    this.ticketService = new TicketService(false) // Not quiet, enable logging
  }

  async listCRs(project: Project, filters?: TicketFilters): Promise<Ticket[]> {
    return this.ticketService.listCRs(project, filters)
  }

  async getCR(project: Project, key: string): Promise<Ticket | null> {
    return this.ticketService.getCR(project, key)
  }

  async createCR(project: Project, crType: string, data: TicketData): Promise<Ticket> {
    return this.ticketService.createCR(project, crType, data)
  }

  async updateCRStatus(project: Project, key: string, status: CRStatus): Promise<boolean> {
    return this.ticketService.updateCRStatus(project, key, status)
  }

  async updateCRAttrs(project: Project, key: string, attributes: Partial<TicketData>): Promise<boolean> {
    return this.ticketService.updateCRAttrs(project, key, attributes)
  }

  async deleteCR(project: Project, key: string): Promise<boolean> {
    return this.ticketService.deleteCR(project, key)
  }

  async getNextCRNumber(project: Project): Promise<number> {
    return this.ticketService.getNextCRNumber(project)
  }
}
