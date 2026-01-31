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
} from '../models/Ticket.js'
import type { CRStatus } from '../models/Types.js'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { CRStatus as CRStatusEnum } from '@mdt/domain-contracts'
import * as fs from 'fs-extra'
import { getTicketsPath } from '../models/Project.js'
import {
  arrayToString,
  TICKET_UPDATE_ALLOWED_ATTRS,
} from '../models/Ticket.js'
import { CRService as SharedCRService } from './CRService.js'
import { ProjectService } from './ProjectService.js'
import { TemplateService } from './TemplateService.js'

/**
 * Unified Ticket Service for CRUD Operations
 * Provides ticket management functionality for both MCP and web servers
 */
export class TicketService {
  private projectService: ProjectService
  private templateService: TemplateService

  constructor(quiet: boolean = false) {
    this.projectService = new ProjectService(quiet)
    this.templateService = new TemplateService(undefined, quiet)
  }

  /**
   * Get the correct CR path for a project with backward compatibility
   */
  public async getCRPath(project: Project): Promise<string> {
    try {
      const config = this.projectService.getProjectConfig(project.project.path)
      if (!config || !config.project) {
        return path.resolve(project.project.path, 'docs/CRs')
      }

      // Use helper function with backward compatibility
      const crPath = getTicketsPath(config, 'docs/CRs')
      return path.resolve(project.project.path, crPath)
    }
    catch (error) {
      console.warn(`Failed to get CR path config for project ${project.id}, using default:`, error)
      return path.resolve(project.project.path, 'docs/CRs')
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
    catch (error) {
      console.error(`Failed to list CRs for project ${project.id}:`, error)
      return []
    }
  }

  /**
   * Get a specific CR by key
   */
  async getCR(project: Project, key: string): Promise<Ticket | null> {
    try {
      // Use shared ProjectService to get all CRs with correct path resolution
      const crs = await this.projectService.getProjectCRs(project.project.path)

      // Find the CR matching the key (case-insensitive)
      const targetCR = crs.find(cr =>
        cr.code.toUpperCase() === key.toUpperCase(),
      )

      if (!targetCR) {
        console.warn(`CR ${key} not found among ${crs.length} CRs in project ${project.id}`)
        return null
      }

      return targetCR
    }
    catch (error) {
      console.error(`Failed to get CR ${key} for project ${project.id}:`, error)
      return null
    }
  }

  /**
   * Create a new CR in a project
   */
  async createCR(project: Project, crType: string, data: TicketData): Promise<Ticket> {
    try {
      // Generate next CR number
      const nextNumber = await this.getNextCRNumber(project)
      const crKey = `${project.project.code}-${String(nextNumber).padStart(3, '0')}`

      // Get the correct CR path from config
      const crPath = await this.getCRPath(project)

      // Create filename slug from title
      const titleSlug = this.createSlug(data.title)
      const filename = `${crKey}-${titleSlug}.md`
      const filePath = path.join(crPath, filename)

      // Ensure CR directory exists
      await fs.ensureDir(crPath)

      // Create ticket object using shared service
      const ticket = SharedCRService.createTicket(data, crKey, crType, filePath)

      // Generate markdown content
      const markdownContent = this.formatCRAsMarkdown(ticket, data)

      // Write file (fs-extra uses outputFile for creating files with directory creation)
      await fs.outputFile(filePath, markdownContent, 'utf-8')

      console.error(`✅ Created CR ${crKey}: ${data.title}`)
      return ticket
    }
    catch (error) {
      console.error(`Failed to create CR for project ${project.id}:`, error)
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

      console.error(`✅ Updated CR ${key} status to ${status}`)
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
        field => !TICKET_UPDATE_ALLOWED_ATTRS.has(field as any),
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

      console.error(`✅ Updated CR ${key} attributes`)
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
      console.error(`🗑️ Deleted CR ${key}`)
      return true
    }
    catch (error) {
      console.error(`Failed to delete CR ${key}:`, error)
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
    catch (error) {
      console.warn(`Failed to get next CR number: ${(error as Error).message}`)
      return project.project.startNumber || 1
    }
  }

  /**
   * Filter tickets based on criteria
   */
  private matchesFilters(ticket: Ticket, filters?: TicketFilters): boolean {
    if (!filters)
      return true

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      if (!statuses.includes(ticket.status))
        return false
    }

    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type]
      if (!types.includes(ticket.type))
        return false
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      if (!priorities.includes(ticket.priority))
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
