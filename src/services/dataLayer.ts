/**
 * DataLayer - API Abstraction Layer
 *
 * Responsibilities:
 * - Centralize all API calls
 * - Normalize API responses
 * - Handle errors consistently
 * - Provide typed interfaces for data operations
 */

import type { Project, ProjectConfig } from '@mdt/shared/models/Project'
import type { TicketData, TicketMetadata } from '@mdt/shared/models/Ticket'
import type { Status, Ticket } from '../types'
import {
  normalizeTicket as normalizeSharedTicket,
  normalizeTicketMetadata as normalizeSharedTicketMetadata,
} from '@mdt/shared/models/Ticket'

type CreateTicketData = TicketData & {
  status?: Status
}

type ApiTicketItem = Partial<Omit<Ticket, 'dateCreated' | 'lastModified' | 'implementationDate'>> & {
  key?: string
  path?: string
  dateCreated?: string | Date | null
  lastModified?: string | Date | null
  implementationDate?: string | Date | null
  [key: string]: unknown
}

/**
 * DataLayer class for API operations
 */
class DataLayer {
  private baseUrl = '/api'

  /**
   * Fetch all projects
   */
  async fetchProjects(): Promise<Project[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`)

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`)
      }

      const projects = await response.json()

      return projects
    }
    catch (error) {
      console.error('[DataLayer] ❌ Error fetching projects:', error)
      throw error
    }
  }

  /**
   * Fetch project configuration
   */
  async fetchProjectConfig(projectId: string): Promise<ProjectConfig | null> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/config`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch project config: ${response.statusText}`)
      }

      const data = await response.json()

      return data.config
    }
    catch (error) {
      console.error(`[DataLayer] ❌ Error fetching project config:`, error)
      // Only return null for 404s, throw for real errors
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Fetch tickets for a specific project
   */
  async fetchTickets(projectId: string): Promise<Ticket[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/crs`)

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`)
      }

      const data = await response.json()
      const tickets = this.normalizeTickets(data)

      return tickets
    }
    catch (error) {
      console.error(`[DataLayer] ❌ Error fetching tickets:`, error)
      throw error
    }
  }

  /**
   * MDT-094: Fetch ticket metadata only (without content) for list views.
   *
   * This method is optimized for list/card views that don't need the full content.
   * The API returns TicketMetadata[] which excludes the content field.
   *
   * @param projectId - Project ID or code
   * @returns Array of TicketMetadata (no content field)
   */
  async fetchTicketsMetadata(projectId: string): Promise<TicketMetadata[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/crs`)

      if (!response.ok) {
        throw new Error(`Failed to fetch ticket metadata: ${response.statusText}`)
      }

      const data = await response.json()
      const metadata = this.normalizeTicketsMetadata(data)

      return metadata
    }
    catch (error) {
      console.error(`[DataLayer] ❌ Error fetching ticket metadata:`, error)
      throw error
    }
  }

  /**
   * Fetch a specific ticket
   */
  async fetchTicket(projectId: string, ticketCode: string): Promise<Ticket | null> {
    try {
      console.warn(`[DataLayer] 🔍 Fetching ticket: ${ticketCode} from project: ${projectId}`)

      const response = await fetch(`${this.baseUrl}/projects/${projectId}/crs/${ticketCode}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch ticket: ${response.statusText}`)
      }

      const data = await response.json()
      const ticket = normalizeSharedTicket(data)

      console.warn(`[DataLayer] ✅ Fetched ticket: ${ticketCode} (content length: ${ticket.content?.length || 0})`)

      return ticket
    }
    catch (error) {
      console.error(`[DataLayer] ❌ Error fetching ticket:`, error)
      throw error
    }
  }

  /**
   * MDT-093: Fetch sub-document content for a specific ticket.
   *
   * @param projectId - Project ID or code
   * @param ticketCode - Ticket/CR code (e.g. MDT-001)
   * @param subDocName - Sub-document name without .md extension
   */
  async fetchSubDocument(
    projectId: string,
    ticketCode: string,
    subDocName: string,
  ): Promise<{ code: string, content: string, dateCreated: string | null, lastModified: string | null }> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/crs/${ticketCode}/subdocuments/${encodeURIComponent(subDocName)}`,
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch sub-document ${subDocName}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Create a new ticket
   */
  async createTicket(projectId: string, data: CreateTicketData): Promise<Ticket> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/crs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to create ticket: ${response.statusText}`)
      }

      const createdTicket = await response.json()
      const ticket = normalizeSharedTicket(createdTicket)

      return ticket
    }
    catch (error) {
      console.error(`[DataLayer] ❌ Error creating ticket:`, error)
      throw error
    }
  }

  /**
   * Update a ticket (partial update)
   */
  async updateTicket(
    projectId: string,
    ticketCode: string,
    updates: Partial<Ticket>,
  ): Promise<void> {
    try {
      // Prepare update data (convert dates to ISO strings, handle all Ticket field types)
      const updateData: Record<string, string | string[] | Date | boolean> = {}
      for (const [key, value] of Object.entries(updates)) {
        if (value instanceof Date) {
          updateData[key] = value.toISOString()
        }
        else if (typeof value === 'boolean') {
          updateData[key] = value
        }
        else if (value !== undefined && value !== null && !Array.isArray(value) || (Array.isArray(value) && typeof value[0] === 'string')) {
          updateData[key] = value as string | string[]
        }
      }

      const response = await fetch(`${this.baseUrl}/projects/${projectId}/crs/${ticketCode}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update ticket: ${response.statusText}`)
      }
    }
    catch (error) {
      console.error(`[DataLayer] ❌ Error updating ticket:`, error)
      throw error
    }
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(projectId: string, ticketCode: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/crs/${ticketCode}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to delete ticket: ${response.statusText}`)
      }
    }
    catch (error) {
      console.error(`[DataLayer] ❌ Error deleting ticket:`, error)
      throw error
    }
  }

  /**
   * Normalize tickets from API response
   */
  private normalizeTickets(data: ApiTicketItem[]): Ticket[] {
    return data.map(item => normalizeSharedTicket(item))
  }

  /**
   * MDT-094: Normalize metadata array from API response.
   * Returns TicketMetadata[] without content field.
   */
  private normalizeTicketsMetadata(data: ApiTicketItem[]): TicketMetadata[] {
    return data.map(item => normalizeSharedTicketMetadata(item))
  }
}

// Export singleton instance
export const dataLayer = new DataLayer()

// Export class for testing
