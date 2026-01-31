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
import type { Status, Ticket } from '../types'
import { CRStatus, CRType } from '@mdt/domain-contracts'

interface CreateTicketData {
  code?: string
  title: string
  type: string
  status?: Status
  priority?: string
  [key: string]: any
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
      const ticket = this.normalizeTicket(data)

      console.warn(`[DataLayer] ✅ Fetched ticket: ${ticketCode} (content length: ${ticket.content?.length || 0})`)

      return ticket
    }
    catch (error) {
      console.error(`[DataLayer] ❌ Error fetching ticket:`, error)
      throw error
    }
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
      const ticket = this.normalizeTicket(createdTicket)

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
      // Prepare update data (convert dates to ISO strings)
      const updateData: Record<string, any> = {}
      for (const [key, value] of Object.entries(updates)) {
        if (value instanceof Date) {
          updateData[key] = value.toISOString()
        }
        else if (value !== undefined) {
          updateData[key] = value
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
  private normalizeTickets(data: any[]): Ticket[] {
    return data.map(item => this.normalizeTicket(item))
  }

  /**
   * Normalize a single ticket from API response
   */
  private normalizeTicket(item: any): Ticket {
    // Helper to normalize arrays
    const normalizeArray = (value: any): string[] => {
      if (Array.isArray(value))
        return value.filter(Boolean)
      if (typeof value === 'string' && value.trim()) {
        return value.split(',').map(s => s.trim()).filter(Boolean)
      }
      return []
    }

    // Helper to parse dates
    const parseDate = (dateValue: any): Date | null => {
      if (!dateValue)
        return null
      if (dateValue instanceof Date)
        return dateValue
      if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue)
        return Number.isNaN(parsed.getTime()) ? null : parsed
      }
      return null
    }

    return {
      // Core fields
      code: item.code || item.key || '',
      title: item.title || '',
      status: item.status || CRStatus.PROPOSED,
      type: item.type || CRType.FEATURE_ENHANCEMENT,
      priority: item.priority || 'Medium',
      content: item.content || '',
      filePath: item.filePath || item.path || '',

      // Dates
      dateCreated: parseDate(item.dateCreated),
      lastModified: parseDate(item.lastModified),
      implementationDate: parseDate(item.implementationDate),

      // Optional fields
      phaseEpic: item.phaseEpic || '',
      description: item.description || '',
      rationale: item.rationale || '',
      assignee: item.assignee || '',
      implementationNotes: item.implementationNotes || '',

      // Relationship fields (normalize to arrays)
      relatedTickets: normalizeArray(item.relatedTickets),
      dependsOn: normalizeArray(item.dependsOn),
      blocks: normalizeArray(item.blocks),
    }
  }
}

// Export singleton instance
export const dataLayer = new DataLayer()

// Export class for testing
