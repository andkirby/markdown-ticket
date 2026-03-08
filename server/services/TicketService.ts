/**
 * Web Server Ticket Service Adapter
 * Adapts shared/services/TicketService.ts for web server API use
 * Converts projectId strings to Project objects for shared service
 * Per MDT-082: Uses consolidated CRUD operations from shared layer.
 */

import type { Project } from '@mdt/shared/models/Project.js'
import type { SubDocument } from '@mdt/shared/models/SubDocument.js'
import type { Ticket, TicketData } from '@mdt/shared/models/Ticket.js'
import type { CRStatus } from '@mdt/shared/models/Types.js'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SUBDOCUMENT_ORDER } from '@mdt/shared/models/SubDocument.js'
import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'

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
  private readonly worktreeService: WorktreeService

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
    this.sharedTicketService = new SharedTicketService(false)
    this.worktreeService = new WorktreeService()
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

    // MDT-093: Await discoverSubDocuments now that it's async
    cr.subdocuments = await this.discoverSubDocuments(project, crId)
    return cr
  }

  /**
   * Discover sub-documents for a CR, ordered by default order then alphabetically.
   * MDT-093: Enhanced with worktree support - resolves path for sub-document discovery.
   */
  private async discoverSubDocuments(project: Project, crId: string): Promise<SubDocument[]> {
    const ticketsPath = project.project.ticketsPath ?? 'docs/CRs'
    const projectCode = project.project.code

    // MDT-093: Resolve path using WorktreeService for worktree support
    // If project code is undefined, skip worktree resolution and use main project path
    const resolvedPath = projectCode
      ? await this.worktreeService.resolvePath(
          project.project.path,
          crId,
          ticketsPath,
          projectCode,
        )
      : project.project.path

    const subdocDir = join(resolvedPath, ticketsPath, crId)

    if (!existsSync(subdocDir)) {
      return []
    }

    let entries: string[]
    try {
      entries = readdirSync(subdocDir)
    }
    catch {
      return []
    }

    const result: SubDocument[] = []
    const unordered: SubDocument[] = []

    const nameOf = (entry: string): string => entry.replace(/\.md$/, '')
    const isMarkdownFile = (entry: string): boolean => entry.endsWith('.md')

    const discoverChildren = (dirPath: string): SubDocument[] => {
      let childEntries: string[]
      try {
        childEntries = readdirSync(dirPath)
      }
      catch {
        return []
      }
      return childEntries
        .filter(e => isMarkdownFile(e))
        .sort()
        .map(e => ({ name: nameOf(e), kind: 'file' as const, children: [] }))
    }

    const buildEntry = (entry: string): SubDocument | null => {
      const fullPath = join(subdocDir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        return { name: entry, kind: 'folder', children: discoverChildren(fullPath) }
      }
      if (isMarkdownFile(entry)) {
        return { name: nameOf(entry), kind: 'file', children: [] }
      }
      return null
    }

    const entryMap = new Map<string, SubDocument>()
    for (const entry of entries) {
      const doc = buildEntry(entry)
      if (doc) {
        entryMap.set(doc.name, doc)
      }
    }

    // Add ordered entries first
    for (const name of DEFAULT_SUBDOCUMENT_ORDER) {
      if (entryMap.has(name)) {
        result.push(entryMap.get(name)!)
        entryMap.delete(name)
      }
    }

    // Append remaining entries alphabetically
    for (const name of [...entryMap.keys()].sort()) {
      unordered.push(entryMap.get(name)!)
    }

    return [...result, ...unordered]
  }

  /**
   * Get individual sub-document content for a CR.
   * MDT-093: Enhanced with worktree support - resolves path for sub-document retrieval.
   */
  async getSubDocument(
    projectId: string,
    crId: string,
    subDocName: string,
  ): Promise<{ code: string, content: string, dateCreated: Date | null, lastModified: Date | null }> {
    const project = await this.getProject(projectId)
    const ticketsPath = project.project.ticketsPath ?? 'docs/CRs'
    const projectCode = project.project.code

    // MDT-093: Resolve path using WorktreeService for worktree support
    // If project code is undefined, skip worktree resolution and use main project path
    const resolvedPath = projectCode
      ? await this.worktreeService.resolvePath(
          project.project.path,
          crId,
          ticketsPath,
          projectCode,
        )
      : project.project.path

    const filePath = join(resolvedPath, ticketsPath, crId, `${subDocName}.md`)

    if (!existsSync(filePath)) {
      throw new Error('SubDocument not found')
    }

    const stat = statSync(filePath)
    const content = readFileSync(filePath, 'utf-8')

    return {
      code: subDocName,
      content,
      dateCreated: stat.birthtime,
      lastModified: stat.mtime,
    }
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
