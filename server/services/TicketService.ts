import type { CreationRecoveryInspection, CreationRecoveryOutcome, CreationRecoveryReconcileInput, CreationRecoveryResumeInput, PatchTicketInput, SearchResponse, TicketDiagnostic, TicketIdentityDiagnostic, TicketUpdateAttrs, UnifiedTicketItem } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project.js'
/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline: pre-existing casts, strip as they are rewritten */
/**
 * Web Server Ticket Service Adapter
 * Adapts shared/services/TicketService.ts for web server API use
 * Converts projectId strings to Project objects for shared service
 * Per MDT-082: Uses consolidated CRUD operations from shared layer.
 */

import type { Ticket, TicketData } from '@mdt/shared/models/Ticket.js'
import type { CloudRuntimeDependencies } from '@mdt/shared/services/TicketService.js'
import { CoordinatorError } from '@mdt/domain-contracts'
import { SearchService } from '@mdt/shared/services/search/SearchService.js'
import { resolveAttrValue } from '@mdt/shared/services/ticket/attrResolver.js'
import {
  groupNamespacedFiles,
  parseNamespace,
} from '@mdt/shared/services/ticket/subdocuments/namespace.js'
import { SubdocumentService } from '@mdt/shared/services/ticket/SubdocumentService.js'
import { TicketLocationResolver } from '@mdt/shared/services/ticket/TicketLocationResolver.js'
import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'
import { TraceStoreService } from './TraceStoreService.js'

export type CRData = Pick<
  TicketData,
  'title' | 'type' | 'priority' | 'level' | 'description' | 'refs'
> & {
  code?: string
}

export interface CreateCRResult {
  ticket: Ticket
  diagnostics: TicketDiagnostic[]
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

type CRPartialUpdates = PatchTicketInput

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
  readonly searchService: SearchService
  private readonly projectDiscovery: ProjectDiscovery
  private readonly sharedTicketService: SharedTicketService
  private readonly ticketLocationResolver: TicketLocationResolver
  private readonly subdocumentService: SubdocumentService
  private readonly traceStoreService: TraceStoreService
  private projectionProvider?: ProjectionReadModelProvider

  constructor(
    projectDiscovery: ProjectDiscovery,
    cloudRuntime: CloudRuntimeDependencies = {},
  ) {
    this.projectDiscovery = projectDiscovery
    this.sharedTicketService = new SharedTicketService(false, cloudRuntime)
    this.searchService = new SearchService(projectDiscovery, this.sharedTicketService)
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
  private async getProject(projectId: string, missingProjectError?: Error): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(
      p => p.id === projectId || p.project.code === projectId,
    )

    if (!project) {
      throw missingProjectError ?? new Error('Project not found')
    }

    return project
  }

  /** Shared classification resolves non-interactive credentials and never adopts files. */
  async observeTicketIdentities(projectId: string): Promise<TicketIdentityDiagnostic[]> {
    return this.sharedTicketService.observeTicketIdentities(await this.getProject(projectId))
  }

  async inspectCreationRecovery(projectId: string): Promise<CreationRecoveryInspection> {
    const project = await this.getProject(projectId, new CoordinatorError('project_not_found'))
    return this.sharedTicketService.inspectCreationRecovery(project)
  }

  async resumeCreationRecovery(projectId: string, input: CreationRecoveryResumeInput): Promise<CreationRecoveryOutcome> {
    const project = await this.getProject(projectId, new CoordinatorError('project_not_found'))
    return this.sharedTicketService.resumeCreationRecovery(project, input)
  }

  async reconcileCreationRecovery(projectId: string, input: CreationRecoveryReconcileInput): Promise<CreationRecoveryOutcome> {
    const project = await this.getProject(projectId, new CoordinatorError('project_not_found'))
    return this.sharedTicketService.reconcileCreationRecovery(project, input)
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
      ...(t.refs !== undefined ? { refs: t.refs, externalRefs: t.externalRefs } : {}),
      title: t.title,
      status: t.status,
      type: t.type,
      priority: t.priority,
      assignee: t.assignee ?? null,
      level: t.level ?? null,
      phaseEpic: t.phaseEpic ?? null,
      relatedTickets: t.relatedTickets ?? null,
      dependsOn: t.dependsOn ?? null,
      blocks: t.blocks ?? null,
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
        level: null,
        phaseEpic: null,
        relatedTickets: null,
        dependsOn: null,
        blocks: null,
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
    const { title, type, priority, level, description, refs } = crData

    if (!title || !type) {
      throw new Error('Title and type are required')
    }

    const project = await this.getProject(projectId)

    // Convert CRData to TicketData format
    const ticketData: TicketData = {
      ...(refs !== undefined ? { refs } : {}),
      title,
      type,
      priority: priority || 'Medium',
      level: level || undefined,
      content: description?.trim()
        ? `## 1. Description\n\n${description}\n\n`
        : undefined,
    }

    // Use shared service to create CR
    const { ticket, diagnostics } = await this.sharedTicketService.createCRWithDiagnostics(
      project,
      type,
      ticketData,
    )

    return {
      ticket,
      diagnostics,
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

    if (updates.status !== undefined) {
      updatedFields.push('status')
    }

    // Convert web server updates to TicketData format
    const ticketUpdates: Partial<TicketData> = {}
    if (updates.refs !== undefined)
      ticketUpdates.refs = updates.refs

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

    // One shared operation validates the entire candidate before persistence.
    if (updates.status !== undefined || Object.keys(ticketUpdates).length > 0) {
      try {
        await this.sharedTicketService.updateCRPartial(project, crId, {
          ...(updates.status !== undefined ? { status: updates.status } : {}),
          ...ticketUpdates,
        })
      }
      catch (error) {
        // Normalize only the shared domain's exact missing-ticket outcome.
        if (error instanceof Error && error.message === `CR '${crId}' not found in project '${project.id}'`)
          throw new Error('CR not found')
        throw error
      }
    }
    updatedFields.push(...Object.keys(ticketUpdates))

    return {
      success: true,
      message: 'CR updated successfully',
      updatedFields,
      projectId,
      crId,
    }
  }

  /** Search through the shared operation; retained server facade signature. */
  async searchTickets(...args: Parameters<SearchService['searchTickets']>): Promise<SearchResponse> { return this.searchService.searchTickets(...args) }

  /** Delete CR from a project. */
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
