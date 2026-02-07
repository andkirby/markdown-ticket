/**
 * Web Server Ticket Service Adapter
 * Adapts shared/services/TicketService.ts for web server API use
 * Converts projectId strings to Project objects for shared service
 * Per MDT-082: Uses consolidated CRUD operations from shared layer.
 */

import type { Project } from '@mdt/shared/models/Project.js'
import type { Ticket, TicketData } from '@mdt/shared/models/Ticket.js'
import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'

export interface CRData {
  code?: string
  title: string
  type: string
  priority?: string
  description?: string
}

export interface CreateCRResult {
  success: boolean
  message: string
  crCode: string
  filename: string
  path: string
}

export interface UpdateCRResult {
  success: boolean
  message: string
  updatedFields: string[]
  projectId: string
  crId: string
}

export interface DeleteResult {
  success: boolean
  message: string
  filename: string
}

interface CRPartialUpdates {
  status?: string
  priority?: string
  phaseEpic?: string
  assignee?: string
  relatedTickets?: string
  dependsOn?: string
  blocks?: string
  [key: string]: unknown
}

interface ProjectDiscovery {
  getAllProjects: () => Promise<Project[]>
}

/**
 * Web Server Ticket Service
 * Adapts shared TicketService for web API use (string projectIds vs Project objects).
 */
export class TicketService {
  private projectDiscovery: ProjectDiscovery
  private sharedTicketService: SharedTicketService

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
    this.sharedTicketService = new SharedTicketService(false)
  }

  /**
   * Convert projectId to Project object.
   */
  private async getProject(projectId: string): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.id === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    return project
  }

  /**
   * Get CRs for a specific project.
   */
  async getProjectCRs(projectId: string): Promise<Ticket[]> {
    const project = await this.getProject(projectId)

    return await this.sharedTicketService.listCRs(project)
  }

  /**
   * Get specific CR from a project.
   */
  async getCR(projectId: string, crId: string): Promise<Ticket> {
    const project = await this.getProject(projectId)
    const cr = await this.sharedTicketService.getCR(project, crId)

    if (!cr) {
      throw new Error('CR not found')
    }

    return cr
  }

  /**
   * Create new CR in a project.
   */
  async createCR(projectId: string, crData: CRData): Promise<CreateCRResult> {
    const { title, type, priority, description } = crData

    if (!title || !type) {
      throw new Error('Title and type are required')
    }

    const project = await this.getProject(projectId)

    // Convert CRData to TicketData format
    const ticketData: TicketData = {
      title,
      type,
      priority: priority || 'Medium',
      content: description ? `## 1. Description\n\n${description}\n\n` : undefined,
    }

    // Use shared service to create CR
    const ticket = await this.sharedTicketService.createCR(project, type, ticketData)

    return {
      success: true,
      message: 'CR created successfully',
      crCode: ticket.code,
      filename: ticket.filePath.split('/').pop() || '',
      path: ticket.filePath,
    }
  }

  /**
   * Update CR partially (specific fields).
   */
  async updateCRPartial(projectId: string, crId: string, updates: CRPartialUpdates): Promise<UpdateCRResult> {
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No fields provided for update')
    }

    const project = await this.getProject(projectId)
    const updatedFields: string[] = []

    // Handle status update separately using the dedicated method
    if (updates.status !== undefined) {
      await this.sharedTicketService.updateCRStatus(project, crId, updates.status)
      updatedFields.push('status')
    }

    // Convert web server updates to TicketData format
    const ticketUpdates: Partial<TicketData> = {}

    // Map allowed fields (excluding status which is handled above)
    if (updates.priority !== undefined) {
      ticketUpdates.priority = updates.priority
    }
    if (updates.phaseEpic !== undefined) {
      ticketUpdates.phaseEpic = updates.phaseEpic
    }
    if (updates.assignee !== undefined) {
      ticketUpdates.assignee = updates.assignee
    }
    if (updates.relatedTickets !== undefined) {
      ticketUpdates.relatedTickets = updates.relatedTickets
    }
    if (updates.dependsOn !== undefined) {
      ticketUpdates.dependsOn = updates.dependsOn
    }
    if (updates.blocks !== undefined) {
      ticketUpdates.blocks = updates.blocks
    }

    // Use shared service to update attributes if there are any remaining fields
    if (Object.keys(ticketUpdates).length > 0) {
      await this.sharedTicketService.updateCRAttrs(project, crId, ticketUpdates)
      updatedFields.push(...Object.keys(ticketUpdates))
    }

    return {
      success: true,
      message: 'CR updated successfully',
      updatedFields,
      projectId,
      crId,
    }
  }

  /**
   * Delete CR from a project.
   */
  async deleteCR(projectId: string, crId: string): Promise<DeleteResult> {
    const project = await this.getProject(projectId)
    const cr = await this.sharedTicketService.getCR(project, crId)

    if (!cr) {
      throw new Error('CR not found')
    }

    await this.sharedTicketService.deleteCR(project, crId)

    return {
      success: true,
      message: 'CR deleted successfully',
      filename: cr.filePath.split('/').pop() || '',
    }
  }
}
