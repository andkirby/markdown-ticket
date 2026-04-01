/**
 * Shared Ticket Service - Consolidated CRUD Operations
 * Single source of truth for ticket/CR management across MCP server and web server
 * Migrated from mcp-server/src/services/crService.ts per MDT-082
 */

import type { Project } from '../models/Project.js'
import type {
  Ticket,
  TicketData,
  TicketFilters,
  TicketUpdateAttrs,
} from '../models/Ticket.js'
import type { CRStatus } from '../models/Types.js'
import type { ReadResult } from './project/types.js'
import type {
  AttrOperation,
  GetTicketRequest,
  ListTicketsRequest,
  TicketReadResult,
  TicketWriteResult,
  UpdateTicketAttributesRequest,
} from './ticket/types.js'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { CRStatus as CRStatusEnum } from '@mdt/domain-contracts'
import * as fs from 'fs-extra'
import { getTicketsPath } from '../models/Project.js'
import {
  arrayToString,
  TICKET_UPDATE_ALLOWED_ATTRS,
} from '../models/Ticket.js'
import { DEFAULTS } from '../utils/constants.js'
import { CRService as SharedCRService } from './CRService.js'
import { ProjectService } from './ProjectService.js'
import { ServiceError } from './ServiceError.js'
import { TemplateService } from './TemplateService.js'
import { TicketLocationResolver } from './ticket/TicketLocationResolver.js'

/**
 * Case-insensitive substring match for fuzzy filtering.
 * An empty pattern matches everything.
 */
function fuzzyMatch(haystack: string, needle: string): boolean {
  if (!needle)
    return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

const RELATION_FIELDS = ['relatedTickets', 'dependsOn', 'blocks'] as const

function normalizeValue(value: string | string[]): string | string[] {
  if (Array.isArray(value)) {
    return value.map(v => v.trim())
  }
  return value.trim()
}

/**
 * Unified Ticket Service for CRUD Operations
 * Provides ticket management functionality for both MCP and web servers
 *
 * MDT-095: Enhanced with worktree support - TicketService is now the single
 * source of truth for worktree path resolution, replacing the workaround in
 * mcp-server/src/tools/handlers/crHandlers.ts
 */
export class TicketService {
  private projectService: ProjectService
  private templateService: TemplateService
  private readonly ticketLocationResolver: TicketLocationResolver

  constructor(quiet: boolean = false) {
    this.projectService = new ProjectService(quiet)
    this.templateService = new TemplateService(undefined, quiet)
    this.ticketLocationResolver = new TicketLocationResolver(this.projectService)
  }

  async listTickets(request: ListTicketsRequest): Promise<ReadResult<Ticket[]>> {
    const project = await this.requireProject(request.projectRef)
    let tickets = await this.listCRs(project, request.filters)

    // Apply sorting (default: dateModified newest-first)
    const sortField = request.sort || 'dateModified'
    tickets = this.sortTickets(tickets, sortField)

    // Apply pagination
    const offset = request.offset ?? 0
    const limit = request.limit
    if (limit !== undefined || offset > 0) {
      tickets = tickets.slice(offset, limit !== undefined ? offset + limit : undefined)
    }

    return { data: tickets }
  }

  async getTicket(request: GetTicketRequest): Promise<TicketReadResult> {
    const project = await this.requireProject(request.projectRef)
    const ticket = await this.getCR(project, request.ticketKey)

    if (!ticket) {
      throw ServiceError.ticketNotFound(request.ticketKey)
    }

    return { data: ticket }
  }

  async updateTicketAttributes(request: UpdateTicketAttributesRequest): Promise<TicketWriteResult<AttrOperation[]>> {
    const project = await this.requireProject(request.projectRef)
    const currentTicket = await this.getCR(project, request.ticketKey)

    if (!currentTicket) {
      throw ServiceError.ticketNotFound(request.ticketKey)
    }

    const normalizedOperations = request.operations.map(operation => ({
      ...operation,
      value: normalizeValue(operation.value),
    }))

    this.validateAttrOperations(normalizedOperations)

    const changedFields: string[] = []
    const updates: Record<string, string | string[]> = {}

    for (const operation of normalizedOperations) {
      const currentValue = this.getTicketField(currentTicket, operation.field)

      if (operation.op === 'replace') {
        if (this.isRelationField(operation.field)) {
          const nextValue = Array.isArray(operation.value)
            ? operation.value
            : (operation.value ? [operation.value] : [])
          const currentRelationValue = this.getRelationField(currentTicket, operation.field)

          if (JSON.stringify(currentRelationValue) !== JSON.stringify(nextValue)) {
            updates[operation.field] = nextValue
            changedFields.push(operation.field)
          }
          continue
        }

        const nextValue = Array.isArray(operation.value) ? operation.value.join(',') : operation.value
        if (currentValue !== nextValue) {
          updates[operation.field] = nextValue
          changedFields.push(operation.field)
        }
        continue
      }

      const currentRelationValue = this.getRelationField(currentTicket, operation.field)
      const normalizedValues = Array.isArray(operation.value) ? operation.value : [operation.value]

      if (operation.op === 'add') {
        const nextValue = [...new Set([...currentRelationValue, ...normalizedValues])]
        if (JSON.stringify(currentRelationValue) !== JSON.stringify(nextValue)) {
          updates[operation.field] = nextValue
          changedFields.push(operation.field)
        }
        continue
      }

      const valuesToRemove = new Set(normalizedValues)
      const nextValue = currentRelationValue.filter(value => !valuesToRemove.has(value))
      if (JSON.stringify(currentRelationValue) !== JSON.stringify(nextValue)) {
        updates[operation.field] = nextValue
        changedFields.push(operation.field)
      }
    }

    if (Object.keys(updates).length > 0) {
      const persistUpdates = Object.fromEntries(
        Object.entries(updates).map(([field, value]) => [
          field,
          Array.isArray(value) ? value.join(',') : value,
        ]),
      ) as Partial<TicketData>

      await this.updateCRAttrs(project, request.ticketKey, persistUpdates)
    }

    const updatedTicket = await this.getCR(project, request.ticketKey)
    if (!updatedTicket) {
      throw ServiceError.persistenceError(`Ticket ${request.ticketKey} disappeared after update`)
    }

    return {
      ticket: updatedTicket,
      target: {
        projectId: project.id,
        projectCode: project.project.code,
        ticketKey: request.ticketKey,
      },
      normalizedInputs: normalizedOperations,
      changedFields,
      path: updatedTicket.filePath,
    }
  }

  /**
   * Get the correct CR path for a project with backward compatibility
   */
  public async getCRPath(project: Project): Promise<string> {
    try {
      const config = this.projectService.getProjectConfig(project.project.path)
      if (!config || !config.project) {
        return path.resolve(project.project.path, DEFAULTS.TICKETS_PATH)
      }

      // Use helper function with backward compatibility
      const crPath = getTicketsPath(config, DEFAULTS.TICKETS_PATH)
      return path.resolve(project.project.path, crPath)
    }
    catch {
      // Fallback to default path on error
      return path.resolve(project.project.path, DEFAULTS.TICKETS_PATH)
    }
  }

  /**
   * List all CRs for a project with optional filtering
   */
  async listCRs(project: Project, filters?: TicketFilters): Promise<Ticket[]> {
    try {
      // Use shared ProjectService to get CRs with correct path resolution
      const crs = await this.projectService.getProjectCRs(project.project.path)

      // Apply filters if provided
      let filteredCRs = crs
      if (filters) {
        filteredCRs = crs.filter(cr => this.matchesFilters(cr, filters))
      }

      // Sort by ticket code (natural sort, DESC - newest/highest numbers first)
      return filteredCRs.sort((a, b) => {
        // Extract the numeric part for proper sorting (e.g., CR-A001 vs CR-A010)
        const extractNumber = (code: string) => {
          const match = code.match(/(\d+)/)
          return match ? Number.parseInt(match[1], 10) : 0
        }

        const aNum = extractNumber(a.code)
        const bNum = extractNumber(b.code)

        if (aNum !== bNum) {
          return bNum - aNum // DESC: higher numbers first
        }

        // Fallback to reverse string comparison if numbers are equal
        return b.code.localeCompare(a.code)
      })
    }
    catch {
      return []
    }
  }

  /**
   * Get a specific CR by key
   * MDT-095: Enhanced with worktree support - resolves path for specific ticket
   */
  async getCR(project: Project, key: string): Promise<Ticket | null> {
    try {
      const location = await this.ticketLocationResolver.resolve(project, key)

      // Get config and scan only resolved directory
      const fullCRPath = path.join(location.projectRoot, location.ticketsPath)

      // Check if directory exists
      try {
        await readdir(fullCRPath)
      }
      catch {
        return null
      }

      // Use MarkdownService to scan only the resolved directory
      const { MarkdownService } = await import('./MarkdownService.js')
      const tickets = await MarkdownService.scanMarkdownFiles(fullCRPath, location.projectRoot)

      const targetCR = tickets.find(cr =>
        cr.code.toUpperCase() === key.toUpperCase(),
      )

      if (!targetCR) {
        return null
      }

      // Add worktree metadata
      return {
        ...targetCR,
        inWorktree: location.isWorktree,
        worktreePath: location.isWorktree ? location.projectRoot : undefined,
      }
    }
    catch {
      return null
    }
  }

  /**
   * Create a new CR in a project
   * MDT-095: Enhanced with worktree support - creates in worktree if branch exists
   */
  async createCR(project: Project, crType: string, data: TicketData): Promise<Ticket> {
    try {
      const nextNumber = await this.getNextCRNumber(project)
      const crKey = `${project.project.code}-${String(nextNumber).padStart(3, '0')}`

      const location = await this.ticketLocationResolver.resolve(project, crKey)
      const crPath = path.join(location.projectRoot, location.ticketsPath)

      const titleSlug = data.slug ?? this.createSlug(data.title)
      const filename = `${crKey}-${titleSlug}.md`
      const filePath = path.join(crPath, filename)

      await fs.ensureDir(crPath)
      const ticket = SharedCRService.createTicket(data, crKey, crType, filePath)
      const markdownContent = this.formatCRAsMarkdown(ticket, data)
      ticket.content = markdownContent
      await fs.outputFile(filePath, markdownContent, 'utf-8')

      return {
        ...ticket,
        inWorktree: location.isWorktree,
        worktreePath: location.isWorktree ? location.projectRoot : undefined,
      }
    }
    catch (error) {
      throw new Error(`Failed to create CR: ${(error as Error).message}`)
    }
  }

  /**
   * Update CR status with validation
   */
  async updateCRStatus(project: Project, key: string, status: CRStatus): Promise<boolean> {
    try {
      const cr = await this.getCR(project, key)
      if (!cr) {
        throw new Error(`CR '${key}' not found in project '${project.id}'`)
      }

      // Validate status transition
      this.validateStatusTransition(cr.status, status)

      // Read current file content
      const content = await readFile(cr.filePath, 'utf-8')

      // Update status in YAML frontmatter
      const updatedContent = this.updateYAMLField(content, 'status', status)
      // lastModified will be automatically set from file modification time

      // Write back to file
      await fs.outputFile(cr.filePath, updatedContent, 'utf-8')

      return true
    }
    catch (error) {
      // Enhanced error handling with specific failure types
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Failed to update CR '${key}': File not found or deleted`)
        }
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new Error(`Failed to update CR '${key}': Permission denied. Check file permissions`)
        }
        if (error.message.includes('EBUSY') || error.message.includes('EMFILE')) {
          throw new Error(`Failed to update CR '${key}': File locked or in use by another process`)
        }
        if (error.message.includes('Invalid status transition')) {
          throw error // Re-throw validation errors as-is
        }
        if (error.message.includes('not found')) {
          throw error // Re-throw CR not found errors as-is
        }
        // Generic file system or parsing errors
        throw new Error(`Failed to update CR '${key}': ${error.message}`)
      }
      throw new Error(`Failed to update CR '${key}': Unknown error occurred`)
    }
  }

  /**
   * Update CR attributes (partial update)
   */
  async updateCRAttrs(project: Project, key: string, attributes: Partial<TicketData>): Promise<boolean> {
    try {
      const cr = await this.getCR(project, key)
      if (!cr) {
        throw new Error(`CR '${key}' not found in project '${project.id}'`)
      }

      // Validate that only allowed attributes are being updated
      const invalidAttributes = Object.keys(attributes).filter(
        field => !TICKET_UPDATE_ALLOWED_ATTRS.has(field as keyof TicketUpdateAttrs),
      )

      if (invalidAttributes.length > 0) {
        const allowed = Array.from(TICKET_UPDATE_ALLOWED_ATTRS).join(', ')
        throw new Error(
          `Invalid attributes: ${invalidAttributes.join(', ')}. `
          + `Allowed attributes for update_cr_attrs are: ${allowed}`,
        )
      }

      // Read current file content
      const content = await readFile(cr.filePath, 'utf-8')
      let updatedContent = content

      // Update each attribute in YAML frontmatter
      for (const [field, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null) {
          // Convert arrays to comma-separated strings for YAML
          const stringValue = Array.isArray(value) ? value.join(',') : String(value)
          updatedContent = this.updateYAMLField(updatedContent, field, stringValue)
        }
      }

      // Write back to file
      await fs.outputFile(cr.filePath, updatedContent, 'utf-8')

      return true
    }
    catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Failed to update CR '${key}': File not found or deleted`)
        }
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new Error(`Failed to update CR '${key}': Permission denied. Check file permissions`)
        }
        if (error.message.includes('not found')) {
          throw error // Re-throw CR not found errors as-is
        }
        throw new Error(`Failed to update CR '${key}': ${error.message}`)
      }
      throw new Error(`Failed to update CR '${key}': Unknown error occurred`)
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    // Allow same status (no-op updates)
    if (currentStatus === newStatus) {
      return
    }

    // Define valid status transitions using documented 7 statuses
    const validTransitions: Record<string, string[]> = {
      [CRStatusEnum.PROPOSED]: [
        CRStatusEnum.APPROVED,
        CRStatusEnum.REJECTED,
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.APPROVED]: [
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.REJECTED,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.IN_PROGRESS]: [
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.APPROVED,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.REJECTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.IMPLEMENTED]: [
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.APPROVED,
        CRStatusEnum.REJECTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.REJECTED]: [
        CRStatusEnum.PROPOSED,
        CRStatusEnum.APPROVED,
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.ON_HOLD]: [
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.APPROVED,
        CRStatusEnum.REJECTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.PARTIALLY_IMPLEMENTED]: [
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.APPROVED,
        CRStatusEnum.REJECTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.ON_HOLD,
      ],
    }

    const allowedTransitions = validTransitions[currentStatus] || []

    if (!allowedTransitions.includes(newStatus)) {
      const validOptions = allowedTransitions.join(', ')
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Valid transitions from '${currentStatus}': ${validOptions}`)
    }
  }

  private async requireProject(projectRef: string): Promise<Project> {
    const result = await this.projectService.getProject(projectRef)
    return result.data
  }

  private isRelationField(field: string): boolean {
    return RELATION_FIELDS.includes(field as typeof RELATION_FIELDS[number])
  }

  private validateAttrOperations(operations: AttrOperation[]): void {
    for (const operation of operations) {
      if ((operation.op === 'add' || operation.op === 'remove') && !this.isRelationField(operation.field)) {
        throw ServiceError.invalidOperation(
          `Cannot use '${operation.op}' operation on non-relation field '${operation.field}'. Only relation fields (${RELATION_FIELDS.join(', ')}) support add/remove operations.`,
          { field: operation.field, op: operation.op },
        )
      }
    }
  }

  private getRelationField(ticket: Ticket, field: string): string[] {
    const value = (ticket as unknown as Record<string, unknown>)[field]
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }
    if (typeof value === 'string' && value) {
      return value.split(',').map(item => item.trim()).filter(Boolean)
    }
    return []
  }

  private getTicketField(ticket: Ticket, field: string): string {
    const value = (ticket as unknown as Record<string, unknown>)[field]
    if (typeof value === 'string') {
      return value
    }
    if (Array.isArray(value)) {
      return value.join(',')
    }
    return ''
  }

  /**
   * Delete a CR from a project
   */
  async deleteCR(project: Project, key: string): Promise<boolean> {
    try {
      const cr = await this.getCR(project, key)
      if (!cr) {
        return false
      }

      await fs.remove(cr.filePath)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Get the next CR number for a project
   * Uses file scanning only (counter file dependency removed per MDT-071)
   */
  async getNextCRNumber(project: Project): Promise<number> {
    try {
      // Get the correct CR directory path
      const crPath = await this.getCRPath(project)

      // Scan existing CR files to find the highest number
      const allFiles = await readdir(crPath)
      const crFiles = allFiles.filter(file => file.endsWith('.md'))
      let highestExistingNumber = 0

      for (const filename of crFiles) {
        const match = filename.match(new RegExp(`${project.project.code}-(\\d+)-`, 'i'))
        if (match) {
          const number = Number.parseInt(match[1], 10)
          if (!Number.isNaN(number) && number > highestExistingNumber) {
            highestExistingNumber = number
          }
        }
      }

      // Use file scanning only (counter file dependency removed per MDT-071)
      const nextNumber = Math.max(highestExistingNumber + 1, project.project.startNumber || 1)

      return nextNumber
    }
    catch {
      return project.project.startNumber || 1
    }
  }

  /**
   * Filter tickets based on criteria with fuzzy matching support
   *
   * For each filter field:
   * - Multiple values are OR'ed (match any)
   * - Each value is matched as a case-insensitive substring (fuzzy)
   * - Empty/null values on the ticket are treated as non-matching
   */
  private matchesFilters(ticket: Ticket, filters?: TicketFilters): boolean {
    if (!filters)
      return true

    if (filters.status) {
      const values = Array.isArray(filters.status) ? filters.status : [filters.status]
      if (!values.some(v => fuzzyMatch(ticket.status, v)))
        return false
    }

    if (filters.type) {
      const values = Array.isArray(filters.type) ? filters.type : [filters.type]
      if (!values.some(v => fuzzyMatch(ticket.type, v)))
        return false
    }

    if (filters.priority) {
      const values = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      if (!values.some(v => fuzzyMatch(ticket.priority, v)))
        return false
    }

    if (filters.assignee) {
      const values = Array.isArray(filters.assignee) ? filters.assignee : [filters.assignee]
      if (!values.some(v => fuzzyMatch(ticket.assignee || '', v)))
        return false
    }

    if (filters.phaseEpic) {
      const values = Array.isArray(filters.phaseEpic) ? filters.phaseEpic : [filters.phaseEpic]
      if (!values.some(v => fuzzyMatch(ticket.phaseEpic || '', v)))
        return false
    }

    if (filters.dateRange) {
      if (filters.dateRange.start && ticket.dateCreated && ticket.dateCreated < filters.dateRange.start)
        return false
      if (filters.dateRange.end && ticket.dateCreated && ticket.dateCreated > filters.dateRange.end)
        return false
    }

    return true
  }

  /**
   * Sort tickets by the given field (descending by default for dates, ascending for code)
   */
  private sortTickets(tickets: Ticket[], sortField: string): Ticket[] {
    return [...tickets].sort((a, b) => {
      switch (sortField) {
        case 'dateModified': {
          const aDate = a.lastModified?.getTime() ?? 0
          const bDate = b.lastModified?.getTime() ?? 0
          return bDate - aDate // newest first
        }
        case 'dateCreated': {
          const aDate = a.dateCreated?.getTime() ?? 0
          const bDate = b.dateCreated?.getTime() ?? 0
          return bDate - aDate // newest first
        }
        case 'code': {
          return a.code.localeCompare(b.code)
        }
        default:
          return 0
      }
    })
  }

  /**
   * Format CR as markdown with YAML frontmatter
   */
  private formatCRAsMarkdown(ticket: Ticket, data: TicketData): string {
    const sections: string[] = []

    // YAML frontmatter - only mandatory fields + optional fields with values
    sections.push('---')
    sections.push(`code: ${ticket.code}`)
    sections.push(`status: ${ticket.status}`)
    sections.push(`dateCreated: ${ticket.dateCreated?.toISOString() || new Date().toISOString()}`)
    sections.push(`type: ${ticket.type}`)
    sections.push(`priority: ${ticket.priority}`)

    // Optional fields - only include if they have values
    if (ticket.phaseEpic)
      sections.push(`phaseEpic: ${ticket.phaseEpic}`)
    if (ticket.relatedTickets && ticket.relatedTickets.length > 0)
      sections.push(`relatedTickets: ${arrayToString(ticket.relatedTickets)}`)
    if (ticket.dependsOn && ticket.dependsOn.length > 0)
      sections.push(`dependsOn: ${arrayToString(ticket.dependsOn)}`)
    if (ticket.blocks && ticket.blocks.length > 0)
      sections.push(`blocks: ${arrayToString(ticket.blocks)}`)
    if (ticket.assignee)
      sections.push(`assignee: ${ticket.assignee}`)
    if (ticket.implementationDate)
      sections.push(`implementationDate: ${ticket.implementationDate.toISOString()}`)
    if (ticket.implementationNotes)
      sections.push(`implementationNotes: ${ticket.implementationNotes}`)

    sections.push('---')
    sections.push('')

    // Content
    if (data.content) {
      // MDT-064: Auto-generate H1 from title parameter if content doesn't start with H1
      if (!data.content.trim().startsWith('# ')) {
        sections.push(`# ${ticket.title}`)
        sections.push('')
        sections.push(data.content)
      }
      else {
        sections.push(data.content)
      }
    }
    else {
      // Use type-specific template from TemplateService
      const template = this.templateService.getTemplate(ticket.type)

      // Replace placeholder title in template
      const templateContent = template.template.replace('[Research Title]', ticket.title)
        .replace('[Bug Title]', ticket.title)
        .replace('[Feature Title]', ticket.title)
        .replace('[Architecture Title]', ticket.title)
        .replace('[Technical Debt Title]', ticket.title)
        .replace('[Documentation Title]', ticket.title)

      // If template already has H1, use it as-is
      if (templateContent.trim().startsWith('# ')) {
        sections.push(templateContent)
      }
      else {
        // Add H1 if template doesn't have one
        sections.push(`# ${ticket.title}`)
        sections.push('')
        sections.push(templateContent)
      }
    }

    return sections.join('\n')
  }

  /**
   * Update a single YAML field in markdown content
   */
  private updateYAMLField(content: string, field: string, value: string): string {
    const lines = content.split('\n')

    // Find the YAML frontmatter section
    let inFrontmatter = false
    let frontmatterStart = -1
    let frontmatterEnd = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true
          frontmatterStart = i
        }
        else {
          frontmatterEnd = i
          break
        }
      }
      else if (inFrontmatter && lines[i]?.startsWith(`${field}:`)) {
        // Update existing field
        lines[i] = `${field}: ${value}`
        return lines.join('\n')
      }
    }

    // If field doesn't exist, add it before the closing ---
    if (frontmatterStart !== -1 && frontmatterEnd !== -1) {
      lines.splice(frontmatterEnd, 0, `${field}: ${value}`)
      return lines.join('\n')
    }

    return content
  }

  /**
   * Create URL-safe slug from title
   */
  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }
}
