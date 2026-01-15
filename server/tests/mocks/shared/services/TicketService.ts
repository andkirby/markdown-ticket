/**
 * Mock of @mdt/shared/services/TicketService for testing
 * Provides a functional mock that mimics the real TicketService behavior
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { ProjectService } from './ProjectService'

export interface Ticket {
  code: string
  title: string
  status: string
  type: string
  priority: string
  filename?: string
  filePath?: string // Changed from 'path' to 'filePath' to match real service
  content?: string
  description?: string
  phaseEpic?: string
  assignee?: string
  relatedTickets?: string[]
  dependsOn?: string[]
  blocks?: string[]
  implementationDate?: string
  implementationNotes?: string
}

export interface TicketFilters {
  status?: string | string[]
  type?: string | string[]
  priority?: string | string[]
  assignee?: string
}

export class TicketService {
  private projectService: any

  constructor(quiet: boolean = false) {
    this.projectService = new ProjectService(quiet)
  }

  /**
   * Get the correct CR path for a project with backward compatibility
   */
  public async getCRPath(project: any): Promise<string> {
    // project.project.path might be a short name like "API" or a full path
    // Try to get the full path from projectService
    const config = this.projectService.getProjectConfig(project.project.path)

    // Use the full path from config if available, otherwise fall back to project.project.path
    const projectBasePath = config?.path || project.project.path

    const crPath = config?.ticketsPath || 'docs/CRs'
    return path.resolve(projectBasePath, crPath)
  }

  /**
   * List all CRs for a project
   */
  async listCRs(project: any, filters?: TicketFilters): Promise<Ticket[]> {
    const crs = await this.projectService.getProjectCRs(project.project.path)

    if (!filters) {
      return crs
    }

    // Apply filters
    let filtered = crs
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      filtered = filtered.filter((cr: Ticket) => statuses.includes(cr.status))
    }
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type]
      filtered = filtered.filter((cr: Ticket) => types.includes(cr.type))
    }
    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      filtered = filtered.filter((cr: Ticket) => priorities.includes(cr.priority))
    }
    if (filters.assignee) {
      filtered = filtered.filter((cr: Ticket) => cr.assignee === filters.assignee)
    }

    return filtered
  }

  /**
   * Get a specific CR by ID
   */
  async getCR(project: any, crId: string): Promise<Ticket> {
    const crPath = await this.getCRPath(project)
    const crDir = path.join(crPath, crId)

    let mdPath: string
    let files: string[]

    if (fs.existsSync(crDir)) {
      // Subdirectory pattern: docs/CRs/API-001/API-001.md
      files = fs.readdirSync(crDir).filter(f => f.endsWith('.md'))
      if (files.length === 0) {
        throw new Error('CR not found')
      }
      mdPath = path.join(crDir, files[0])
    }
    else {
      // Flat file pattern: docs/CRs/API-001-test-cr-for-api-testing.md
      files = fs.readdirSync(crPath).filter(f => f.startsWith(crId) && f.endsWith('.md'))
      if (files.length === 0) {
        throw new Error('CR not found')
      }
      mdPath = path.join(crPath, files[0])
    }

    const content = fs.readFileSync(mdPath, 'utf-8')

    // Parse YAML frontmatter
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!yamlMatch) {
      throw new Error('Invalid CR format')
    }

    const yaml = yamlMatch[1]
    const titleMatch = yaml.match(/title:\s*["']?([^"'\n]+)["']?/)
    const statusMatch = yaml.match(/status:\s*["']?([^"'\n]+)["']?/)
    const typeMatch = yaml.match(/type:\s*["']?([^"'\n]+)["']?/)
    const priorityMatch = yaml.match(/priority:\s*["']?([^"'\n]+)["']?/)
    const descriptionMatch = yaml.match(/description:\s*(.+)/)

    return {
      code: crId,
      title: titleMatch ? titleMatch[1].trim() : crId,
      status: statusMatch ? statusMatch[1].trim() : 'Proposed',
      type: typeMatch ? typeMatch[1].trim() : 'Feature Enhancement',
      priority: priorityMatch ? priorityMatch[1].trim() : 'Medium',
      description: descriptionMatch ? descriptionMatch[1].trim() : '',
      filename: files[0],
      filePath: mdPath, // Changed from 'path' to 'filePath' to match real service
      content,
    }
  }

  /**
   * Create a new CR
   */
  async createCR(project: any, type: string, data: Partial<Ticket>): Promise<Ticket> {
    const crPath = await this.getCRPath(project)

    // Get next CR number
    const existingDirs = fs.existsSync(crPath)
      ? fs.readdirSync(crPath).filter(f => /^[\w-]+-\d+$/.test(f))
      : []

    let nextNum = 1
    if (existingDirs.length > 0) {
      const nums = existingDirs.map((d) => {
        const match = d.match(/-(\d+)$/)
        return match ? Number.parseInt(match[1], 10) : 0
      })
      nextNum = Math.max(...nums) + 1
    }

    const crId = `${project.id}-${nextNum.toString().padStart(3, '0')}`
    const crDir = path.join(crPath, crId)
    fs.mkdirSync(crDir, { recursive: true })

    // Create markdown file
    const filename = `${crId}.md`
    const mdPath = path.join(crDir, filename)

    const yaml = [
      '---',
      `title: ${data.title || 'New CR'}`,
      `status: ${data.status || 'Proposed'}`,
      `type: ${type}`,
      `priority: ${data.priority || 'Medium'}`,
      data.description ? `description: ${data.description}` : '',
      data.phaseEpic ? `phaseEpic: ${data.phaseEpic}` : '',
      data.assignee ? `assignee: ${data.assignee}` : '',
      data.relatedTickets ? `relatedTickets: ${data.relatedTickets.join(',')}` : '',
      data.dependsOn ? `dependsOn: ${data.dependsOn}` : '',
      data.blocks ? `blocks: ${data.blocks}` : '',
      '---',
      '',
      data.description || '',
    ].filter(Boolean).join('\n')

    fs.writeFileSync(mdPath, yaml, 'utf-8')

    return {
      code: crId,
      title: data.title || 'New CR',
      status: data.status || 'Proposed',
      type,
      priority: data.priority || 'Medium',
      description: data.description,
      phaseEpic: data.phaseEpic,
      assignee: data.assignee,
      relatedTickets: data.relatedTickets,
      dependsOn: data.dependsOn,
      blocks: data.blocks,
      filename,
      filePath: mdPath, // Changed from 'path' to 'filePath' to match real service
      content: yaml,
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

    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      'Proposed': ['Approved', 'Rejected', 'In Progress', 'On Hold', 'Implemented', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'],
      'Approved': ['In Progress', 'Rejected', 'On Hold', 'Implemented', 'Proposed', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'],
      'In Progress': ['Implemented', 'Approved', 'On Hold', 'Rejected', 'Proposed', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'],
      'Implemented': ['In Progress', 'Approved', 'Rejected', 'Proposed', 'On Hold', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'],
      'Rejected': ['Proposed', 'Approved', 'Implemented', 'On Hold', 'In Progress', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'],
      'On Hold': ['In Progress', 'Approved', 'Rejected', 'Proposed', 'Implemented', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'],
      'Superseded': ['Proposed', 'Approved', 'In Progress', 'Implemented', 'On Hold', 'Rejected', 'Deprecated', 'Duplicate', 'Partially Implemented'],
      'Deprecated': ['Superseded', 'Proposed'],
      'Duplicate': ['Superseded', 'Rejected'],
      'Partially Implemented': ['Implemented', 'In Progress', 'On Hold', 'Superseded', 'Rejected', 'Proposed'],
    }

    const allowedTransitions = validTransitions[currentStatus] || []

    if (!allowedTransitions.includes(newStatus)) {
      const validOptions = allowedTransitions.join(', ')
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Valid transitions from '${currentStatus}': ${validOptions}`)
    }
  }

  /**
   * Update CR status
   */
  async updateCRStatus(project: any, crId: string, status: string): Promise<void> {
    const cr = await this.getCR(project, crId)
    if (!cr.filePath) {
      throw new Error('CR file not found')
    }

    // Validate status transition
    this.validateStatusTransition(cr.status, status)

    let content = fs.readFileSync(cr.filePath, 'utf-8')
    content = content.replace(/status:\s*\S+/, `status: ${status}`)
    fs.writeFileSync(cr.filePath, content, 'utf-8')
  }

  /**
   * Update CR attributes
   */
  async updateCRAttrs(project: any, crId: string, updates: Partial<Ticket>): Promise<void> {
    const cr = await this.getCR(project, crId)
    if (!cr.filePath) {
      throw new Error('CR file not found')
    }

    let content = fs.readFileSync(cr.filePath, 'utf-8')
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!yamlMatch) {
      throw new Error('Invalid CR format')
    }

    let yaml = yamlMatch[1]

    // Update each attribute
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || key === 'code' || key === 'filename' || key === 'filePath') {
        continue
      }

      const regex = new RegExp(`${key}:\\s*\\S+`)
      if (regex.test(yaml)) {
        // Update existing
        if (Array.isArray(value)) {
          yaml = yaml.replace(regex, `${key}: ${value.join(',')}`)
        }
        else {
          yaml = yaml.replace(regex, `${key}: ${value}`)
        }
      }
      else {
        // Add new
        if (Array.isArray(value)) {
          yaml += `\n${key}: ${value.join(',')}`
        }
        else {
          yaml += `\n${key}: ${value}`
        }
      }
    }

    content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${yaml}\n---`)
    fs.writeFileSync(cr.filePath, content, 'utf-8')
  }

  /**
   * Delete a CR
   */
  async deleteCR(project: any, crId: string): Promise<void> {
    const crPath = await this.getCRPath(project)
    const crDir = path.join(crPath, crId)

    if (fs.existsSync(crDir)) {
      // Subdirectory pattern: docs/CRs/API-001/
      fs.rmSync(crDir, { recursive: true, force: true })
    }
    else {
      // Flat file pattern: docs/CRs/API-001-title.md
      const files = fs.readdirSync(crPath).filter(f => f.startsWith(crId) && f.endsWith('.md'))
      if (files.length === 0) {
        throw new Error('CR not found')
      }
      for (const file of files) {
        fs.unlinkSync(path.join(crPath, file))
      }
    }
  }
}
