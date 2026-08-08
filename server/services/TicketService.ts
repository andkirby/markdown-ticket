/**
 * Web Server Ticket Service Adapter
 * Adapts shared/services/TicketService.ts for web server API use
 * Converts projectId strings to Project objects for shared service
 * Per MDT-082: Uses consolidated CRUD operations from shared layer.
 */

import type { TicketUpdateAttrs, UnifiedTicketItem } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project.js'
import type { Ticket, TicketData } from '@mdt/shared/models/Ticket.js'
import type { CRStatus } from '@mdt/shared/models/Types.js'
import { TICKET_KEY_INPUT_PATTERN } from '@mdt/domain-contracts'
import { resolveAttrValue } from '@mdt/shared/services/ticket/attrResolver.js'
import {
  groupNamespacedFiles,
  parseNamespace,
} from '@mdt/shared/services/ticket/subdocuments/namespace.js'
import { SubdocumentService } from '@mdt/shared/services/ticket/SubdocumentService.js'
import { TicketLocationResolver } from '@mdt/shared/services/ticket/TicketLocationResolver.js'
import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'
import { normalizeKey } from '@mdt/shared/utils/keyNormalizer.js'
import { TraceStoreService } from './TraceStoreService.js'

export type CRData = Pick<
  TicketData,
  'title' | 'type' | 'priority' | 'level' | 'description'
> & {
  code?: string
}

/** Search result item with ticket and project context */
interface SearchResultItem {
  ticket: { code: string, title: string, priority: string | null }
  project: { code: string, name: string }
}

/** Search response shape */
interface SearchResponse {
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
/**
 * Projection read-model entry for the unified ticket view (MDT-226). A minimal,
 * transport-free shape so the server TicketService does not import the stream
 * manager directly.
 */
export interface ProjectionReadModelEntry {
  ticketNumber: number
  projectionVersion: number
  projectRevision: number
  lifecycle: 'active' | 'deleted'
  header: {
    code: string
    title: string
    status: string
    type: string | null
    priority: string | null
    assignee: string | null
    date_created: string | null
    last_modified: string
  }
}

/**
 * Optional provider that returns the projection-only entries for a project from
 * the stream manager's read model. When absent, the unified ticket endpoint
 * returns canonical local tickets only (local-only behavior preserved).
 */
export type ProjectionReadModelProvider = (projectId: string) => {
  entries: (localCodes: Set<string>) => ProjectionReadModelEntry[]
  stale: boolean
} | undefined

export class TicketService {
  private readonly projectDiscovery: ProjectDiscovery
  private readonly sharedTicketService: SharedTicketService
  private readonly ticketLocationResolver: TicketLocationResolver
  private readonly subdocumentService: SubdocumentService
  private readonly traceStoreService: TraceStoreService
  private projectionProvider?: ProjectionReadModelProvider

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
    this.sharedTicketService = new SharedTicketService(false)
    this.ticketLocationResolver = new TicketLocationResolver()
    this.subdocumentService = new SubdocumentService()
    this.traceStoreService = new TraceStoreService()
  }

  /**
   * Wire the projection read-model provider (MDT-226). The server bootstrap
   * injects the stream manager's read model here. When unset, the unified ticket
   * endpoint returns canonical local tickets only.
   */
  setProjectionReadModelProvider(provider: ProjectionReadModelProvider): void {
    this.projectionProvider = provider
  }

  /**
   * Convert projectId to Project object.
   * Supports lookup by both project.id and project.project.code.
   */
  private async getProject(projectId: string): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(
      p => p.id === projectId || p.project.code === projectId,
    )

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
   * Get the unified ticket view for a project (MDT-226): canonical local
   * Markdown tickets plus projection-only read-only entries from the cloud
   * stream read model. Each item carries `kind`/`readOnly`/`stale` capability
   * metadata so the browser can render honestly (C-11, §Browser-facing ticket
   * contract). Local tickets win on duplicate ticket number (BR-1.9).
   *
   * When no projection provider is wired, returns canonical items only.
   */
  async getUnifiedTickets(projectId: string): Promise<UnifiedTicketItem[]> {
    const project = await this.getProject(projectId)
    const localTickets = await this.sharedTicketService.listCRs(project)

    const readModel = this.projectionProvider?.(projectId)
    const stale = readModel?.stale ?? false

    const canonical: UnifiedTicketItem[] = localTickets.map(t => ({
      kind: 'canonical',
      readOnly: false,
      stale: false,
      code: t.code,
      title: t.title,
      status: t.status,
      type: t.type,
      priority: t.priority,
      assignee: t.assignee ?? null,
      dateCreated: t.dateCreated ? t.dateCreated.toISOString() : null,
      lastModified: t.lastModified ? t.lastModified.toISOString() : null,
    }))

    if (!readModel) {
      return canonical
    }

    const localCodes = new Set(localTickets.map(t => t.code))
    const projectionOnly = readModel.entries(localCodes)
      .filter(entry => entry.lifecycle === 'active')
      .map<UnifiedTicketItem>(entry => ({
        kind: 'projected',
        readOnly: true,
        stale,
        code: entry.header.code,
        title: entry.header.title,
        status: entry.header.status,
        type: entry.header.type,
        priority: entry.header.priority,
        assignee: entry.header.assignee,
        dateCreated: entry.header.date_created,
        lastModified: entry.header.last_modified,
      }))

    return [...canonical, ...projectionOnly]
  }

  /**
   * Poll cloud-projected ticket headers for the project board.
   * Credentials and cloud configuration remain server-side; the browser only
   * receives the approved header projection.
   */
  async getCloudProjections(projectId: string, after = 0, limit = 100) {
    const project = await this.getProject(projectId)
    return this.sharedTicketService.pollCloudProjections(project, after, limit)
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
  ): Promise<{
    code: string
    content: string
    dateCreated: Date | null
    lastModified: Date | null
  }> {
    const project = await this.getProject(projectId)
    const location = await this.ticketLocationResolver.resolve(project, crId)
    return this.subdocumentService.read(location, subDocName)
  }

  async getTraceStoreMetadata(
    projectId: string,
    crId: string,
  ): Promise<{ exists: boolean, ticketCode: string, label: string }> {
    const project = await this.getProject(projectId)
    const cr = await this.sharedTicketService.getCR(project, crId)

    if (!cr) {
      throw new Error('CR not found')
    }

    const location = await this.ticketLocationResolver.resolve(project, crId)
    return this.traceStoreService.getMetadata(location, crId)
  }

  async getTraceStore(
    projectId: string,
    crId: string,
  ): Promise<{
    metadata: { exists: boolean, ticketCode: string, label: string }
    store: unknown
  }> {
    const project = await this.getProject(projectId)
    const cr = await this.sharedTicketService.getCR(project, crId)

    if (!cr) {
      throw new Error('CR not found')
    }

    const location = await this.ticketLocationResolver.resolve(project, crId)
    return this.traceStoreService.read(location, crId)
  }

  /**
   * Create new CR in a project.
   */
  async createCR(projectId: string, crData: CRData): Promise<CreateCRResult> {
    const { title, type, priority, level, description } = crData

    if (!title || !type) {
      throw new Error('Title and type are required')
    }

    const project = await this.getProject(projectId)

    // Convert CRData to TicketData format
    const ticketData: TicketData = {
      title,
      type,
      priority: priority || 'Medium',
      level: level || undefined,
      content: description
        ? `## 1. Description\n\n${description}\n\n`
        : undefined,
    }

    // Use shared service to create CR
    const ticket = await this.sharedTicketService.createCR(
      project,
      type,
      ticketData,
    )

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
  async updateCRPartial(
    projectId: string,
    crId: string,
    updates: CRPartialUpdates,
  ): Promise<UpdateCRResult> {
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No fields provided for update')
    }

    const project = await this.getProject(projectId)
    const updatedFields: string[] = []

    // Handle status update separately using the dedicated method
    if (updates.status !== undefined) {
      await this.sharedTicketService.updateCRStatus(
        project,
        crId,
        updates.status as CRStatus,
      )
      updatedFields.push('status')
    }

    // Convert web server updates to TicketData format
    const ticketUpdates: Partial<TicketData> = {}

    // Map allowed fields (excluding status which is handled above)
    if (updates.priority !== undefined) {
      ticketUpdates.priority = updates.priority
    }
    if (updates.level !== undefined) {
      // Resolve aliases (e→epic, t→ticket) through the shared gate so REST
      // accepts the same shorthand as the CLI (BR-2 / C-6).
      ticketUpdates.level = resolveAttrValue(
        'level',
        String(updates.level),
      ) as TicketUpdateAttrs['level']
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
      await this.sharedTicketService.updateCRAttrs(
        project,
        crId,
        ticketUpdates,
      )
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
    return this.searchByProjectScope(
      query,
      options.projectCode!,
      options.limitPerProject,
      options.limitTotal,
    )
  }

  /**
   * ticket_key mode: extract project code from ticket key prefix,
   * resolve project, look up ticket.
   */
  private async searchByTicketKey(
    query: string,
    limitTotal: number,
  ): Promise<SearchResponse> {
    if (limitTotal < 1) {
      return { results: [], total: 0 }
    }

    // Extract project code from ticket key (e.g., "MDT-001" → "MDT")
    const match = query.match(TICKET_KEY_INPUT_PATTERN)
    if (!match) {
      return { results: [], total: 0 }
    }

    const projectCode = match[1].toUpperCase()
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(
      p => p.project.code === projectCode || p.id === projectCode,
    )

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
      results: [
        {
          ticket: {
            code: cr.code,
            title: cr.title,
            priority: cr.priority ?? null,
          },
          project: {
            code: project.project.code || project.id,
            name: project.project.name,
          },
        },
      ],
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
    const project = projects.find(
      p => p.project.code === projectCode || p.id === projectCode,
    )

    if (!project) {
      throw new Error('Project not found')
    }

    const allCRs = await this.sharedTicketService.listCRs(project)

    // Filter by query — case-insensitive substring match on title or code
    const filtered = query
      ? allCRs.filter(
          cr =>
            cr.title.toLowerCase().includes(query.toLowerCase())
            || cr.code.toLowerCase().includes(query.toLowerCase()),
        )
      : allCRs

    const effectiveLimit = Math.min(limitPerProject, limitTotal)
    const limited = filtered.slice(0, effectiveLimit)

    return {
      results: limited.map(cr => ({
        ticket: {
          code: cr.code,
          title: cr.title,
          priority: cr.priority ?? null,
        },
        project: {
          code: project.project.code || project.id,
          name: project.project.name,
        },
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
