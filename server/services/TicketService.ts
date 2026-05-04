/**
 * Web Server Ticket Service Adapter
 * Adapts shared/services/TicketService.ts for web server API use
 * Converts projectId strings to Project objects for shared service
 * Per MDT-082: Uses consolidated CRUD operations from shared layer.
 */

import type { TicketUpdateAttrs } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project.js'
import type { Ticket, TicketData } from '@mdt/shared/models/Ticket.js'
import type { CRStatus } from '@mdt/shared/models/Types.js'
import { groupNamespacedFiles, parseNamespace } from '@mdt/shared/services/ticket/subdocuments/namespace.js'
import { SubdocumentService } from '@mdt/shared/services/ticket/SubdocumentService.js'
import { normalizeKey } from '@mdt/shared/utils/keyNormalizer.js'
import { TicketLocationResolver } from '@mdt/shared/services/ticket/TicketLocationResolver.js'
import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'

export type CRData = Pick<TicketData, 'title' | 'type' | 'priority' | 'description'> & {
  code?: string
}

/** Search result item with ticket and project context */
export interface SearchResultItem {
  ticket: { code: string, title: string }
  project: { code: string, name: string }
}

/** Search response shape */
export interface SearchResponse {
  results: SearchResultItem[]
  total: number
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

export { groupNamespacedFiles, parseNamespace }

type CRPartialUpdates = TicketUpdateAttrs & {
  status?: CRStatus
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
  private readonly projectDiscovery: ProjectDiscovery
  private readonly sharedTicketService: SharedTicketService
  private readonly ticketLocationResolver: TicketLocationResolver
  private readonly subdocumentService: SubdocumentService

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
    this.sharedTicketService = new SharedTicketService(false)
    this.ticketLocationResolver = new TicketLocationResolver()
    this.subdocumentService = new SubdocumentService()
  }

  /**
   * Convert projectId to Project object.
   * Supports lookup by both project.id and project.project.code.
   */
  private async getProject(projectId: string): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.id === projectId || p.project.code === projectId)

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
   * Get specific CR from a project, including discovered sub-documents.
   */
  async getCR(projectId: string, crId: string): Promise<Ticket> {
    const project = await this.getProject(projectId)
    const cr = await this.sharedTicketService.getCR(project, crId)

    if (!cr) {
      throw new Error('CR not found')
    }

    const location = await this.ticketLocationResolver.resolve(project, crId)
    cr.subdocuments = this.subdocumentService.discover(location, crId)
    return cr
  }

  /**
   * Get individual sub-document content for a CR.
   * MDT-093: Enhanced with worktree support - resolves ticket location before retrieval.
   * MDT-138: Enhanced with namespace support - handles dot-notation files.
   */
  async getSubDocument(
    projectId: string,
    crId: string,
    subDocName: string,
  ): Promise<{ code: string, content: string, dateCreated: Date | null, lastModified: Date | null }> {
    const project = await this.getProject(projectId)
    const location = await this.ticketLocationResolver.resolve(project, crId)
    return this.subdocumentService.read(location, subDocName)
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
      await this.sharedTicketService.updateCRStatus(project, crId, updates.status as CRStatus)
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
   * Search for tickets across projects. MDT-152.
   *
   * ticket_key mode: resolve project from code prefix in the key, look up ticket.
   * project_scope mode: search within a specific project by code.
   */
  async searchTickets(
    mode: 'ticket_key' | 'project_scope',
    query: string,
    options: {
      projectCode?: string
      limitPerProject: number
      limitTotal: number
    },
  ): Promise<SearchResponse> {
    if (mode === 'ticket_key') {
      return this.searchByTicketKey(query, options.limitTotal)
    }
    return this.searchByProjectScope(query, options.projectCode!, options.limitPerProject, options.limitTotal)
  }

  /**
   * ticket_key mode: extract project code from ticket key prefix,
   * resolve project, look up ticket.
   */
  private async searchByTicketKey(query: string, limitTotal: number): Promise<SearchResponse> {
    // Extract project code from ticket key (e.g., "MDT-001" → "MDT")
    const match = query.match(/^([A-Za-z][A-Za-z0-9]*)-(\d+)$/i)
    if (!match) {
      return { results: [], total: 0 }
    }

    const projectCode = match[1].toUpperCase()
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.project.code === projectCode || p.id === projectCode)

    if (!project) {
      return { results: [], total: 0 }
    }

    // Normalize key to zero-padded format (MDT-1 → MDT-001)
    let normalizedKey: string
    try {
      normalizedKey = normalizeKey(query, projectCode)
    }
    catch {
      return { results: [], total: 0 }
    }

    const cr = await this.sharedTicketService.getCR(project, normalizedKey)
    if (!cr) {
      return { results: [], total: 0 }
    }

    return {
      results: [{
        ticket: { code: cr.code, title: cr.title },
        project: { code: project.project.code || project.id, name: project.project.name },
      }],
      total: 1,
    }
  }

  /**
   * project_scope mode: search within a specific project.
   * Throws 'Project not found' if projectCode is invalid.
   */
  private async searchByProjectScope(
    query: string,
    projectCode: string,
    limitPerProject: number,
    limitTotal: number,
  ): Promise<SearchResponse> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.project.code === projectCode || p.id === projectCode)

    if (!project) {
      throw new Error('Project not found')
    }

    const allCRs = await this.sharedTicketService.listCRs(project)

    // Filter by query — case-insensitive substring match on title or code
    const filtered = query
      ? allCRs.filter(cr =>
          cr.title.toLowerCase().includes(query.toLowerCase())
          || cr.code.toLowerCase().includes(query.toLowerCase()),
        )
      : allCRs

    const effectiveLimit = Math.min(limitPerProject, limitTotal)
    const limited = filtered.slice(0, effectiveLimit)

    return {
      results: limited.map(cr => ({
        ticket: { code: cr.code, title: cr.title },
        project: { code: project.project.code || project.id, name: project.project.name },
      })),
      total: limited.length,
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
