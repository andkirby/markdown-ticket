/**
 * File-based Ticket Creator Implementation
 *
 * Refactored to use helper classes for code generation and data transformation.
 * Reuses existing shared services: MarkdownService, CRService, TemplateService.
 */

import type { TicketData } from '../../models/Ticket.js'
import type { CRType } from '../../models/Types.js'
import type { TicketCreationConfig, TicketCreationResult } from './ticket-creator.js'
import * as fs from 'node:fs'
import { join as pathJoin } from 'node:path'
import { MarkdownService } from '../../services/MarkdownService.js'
import { TemplateService } from '../../services/TemplateService.js'
import { RetryHelper } from '../utils/retry-helper.js'
import { TicketCodeHelper } from './helpers/TicketCodeHelper.js'
import { TicketDataHelper } from './helpers/TicketDataHelper.js'
import { BaseTicketCreator } from './ticket-creator.js'

/** File-based ticket creator */
export class FileTicketCreator extends BaseTicketCreator {
  private templateService: TemplateService
  private retryHelper: RetryHelper

  constructor() {
    super()
    this.templateService = new TemplateService(undefined, true)

    // Initialize retry helper for file operations
    this.retryHelper = new RetryHelper({
      maxAttempts: 3,
      initialDelay: 100,
      backoffMultiplier: 2.0,
      maxDelay: 1000,
      timeout: 5000,
      retryableErrors: ['EACCES', 'ENOENT', 'EEXIST', 'EBUSY', 'EMFILE', 'ENFILE', 'EIO'],
      logContext: 'FileTicketCreator',
    })
  }

  /** Generate next ticket code - uses TicketCodeHelper */
  protected async generateTicketCode(
    projectCode: string,
    projectPath: string,
    ticketsPath?: string,
  ): Promise<string> {
    const ticketsDir = pathJoin(projectPath, ticketsPath || 'docs', 'CRs')

    const nextNumber = await this.retryHelper.execute(
      async () => TicketCodeHelper.findNextNumber(projectCode, ticketsDir),
      { logContext: `FileTicketCreator.findNextNumber(${projectCode})` },
    )

    return TicketCodeHelper.generateCode(projectCode, nextNumber)
  }

  /** Create a single ticket file */
  async createTicket(config: TicketCreationConfig, data: TicketData): Promise<TicketCreationResult> {
    // Validate
    if (config.validateContent !== false) {
      const validation = this.validateTicket(data)
      if (!validation.valid) {
        return { success: false, error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}` }
      }
    }

    const ticketCode = await this.generateTicketCode(config.projectCode, config.projectPath, config.ticketsPath)
    const ticketsDir = pathJoin(config.projectPath, config.ticketsPath || 'docs', 'CRs')

    try {
      // Ensure directory
      await this.ensureCRsDirectory(ticketsDir, config.projectCode)

      // Get or generate content
      const content = await this.getTemplateContent(data.title, data.type as CRType, data.content)

      // Build ticket using helper
      const filePath = pathJoin(ticketsDir, `${ticketCode}.md`)
      const ticket = TicketDataHelper.buildTicket(
        { ...data, content: content ?? data.content },
        ticketCode,
        filePath,
      )

      // Write using MarkdownService (shared service)
      await this.retryHelper.execute(
        async () => MarkdownService.writeMarkdownFile(filePath, ticket),
        { logContext: `FileTicketCreator.writeMarkdownFile(${ticketCode})` },
      )

      return { success: true, ticketCode, ticket, filePath }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /** Read existing ticket - uses MarkdownService (shared) */
  async readTicket(projectPath: string, ticketCode: string, ticketsPath?: string): Promise<TicketData | null> {
    const filePath = pathJoin(projectPath, ticketsPath || 'docs', 'CRs', `${ticketCode}.md`)

    const ticket = await this.retryHelper.execute(
      async () => MarkdownService.parseMarkdownFile(filePath),
      { logContext: `FileTicketCreator.parseMarkdownFile(${ticketCode})`, timeout: 3000 },
    )

    return ticket ? TicketDataHelper.ticketToTicketData(ticket) : null
  }

  /** Update existing ticket - uses helper for merge */
  async updateTicket(
    config: TicketCreationConfig,
    ticketCode: string,
    data: Partial<TicketData>,
  ): Promise<TicketCreationResult> {
    try {
      const existing = await this.readTicket(config.projectPath, ticketCode, config.ticketsPath)
      const mergedData = TicketDataHelper.mergeTicketData(existing, data)
      return await this.createTicketWithCode(config, ticketCode, mergedData)
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /** Check if ticket exists */
  ticketExists(projectPath: string, ticketCode: string, ticketsPath?: string): boolean {
    const filePath = pathJoin(projectPath, ticketsPath || 'docs', 'CRs', `${ticketCode}.md`)
    return this.retryHelper.executeSync(
      () => fs.existsSync(filePath),
      { logContext: `FileTicketCreator.ticketExists(${ticketCode})` },
    )
  }

  // Private helpers

  private async ensureCRsDirectory(ticketsDir: string, projectCode: string): Promise<void> {
    if (fs.existsSync(ticketsDir))
      return

    await this.retryHelper.execute(
      async () => fs.mkdirSync(ticketsDir, { recursive: true }),
      { logContext: `FileTicketCreator.ensureCRsDir(${projectCode})` },
    )
  }

  private async getTemplateContent(
    title: string,
    type: CRType,
    existingContent?: string,
  ): Promise<string | undefined> {
    if (existingContent)
      return existingContent

    try {
      const template = await this.retryHelper.execute(
        async () => this.templateService.getTemplate(type),
        { logContext: `FileTicketCreator.getTemplate(${type})`, timeout: 2000 },
      )
      return template?.template.replace('[Ticket Title]', title)
    }
    catch {
      // Fall through to minimal content
    }

    return this.generateMinimalContent(title, type)
  }

  private generateMinimalContent(title: string, _type: CRType): string {
    const now = new Date().toISOString().split('T')[0]
    return `# ${title}

## 1. Description
Problem statement and context.

## 2. Rationale
Why this change is necessary.

## 3. Solution Analysis
Evaluated alternatives and selected approach.

## 4. Implementation Specification
Technical details and implementation plan.

## 5. Acceptance Criteria
- [ ] Measurable completion criteria
- [ ] Testing requirements

---
*CR created on ${now}*`
  }

  private async createTicketWithCode(
    config: TicketCreationConfig,
    ticketCode: string,
    data: TicketData,
  ): Promise<TicketCreationResult> {
    const ticketsDir = pathJoin(config.projectPath, config.ticketsPath || 'docs', 'CRs')
    await this.ensureCRsDirectory(ticketsDir, config.projectCode)

    const filePath = pathJoin(ticketsDir, `${ticketCode}.md`)
    const ticket = TicketDataHelper.buildTicket(data, ticketCode, filePath)

    await this.retryHelper.execute(
      async () => MarkdownService.writeMarkdownFile(filePath, ticket),
      { logContext: `FileTicketCreator.updateMarkdownFile(${ticketCode})` },
    )

    return { success: true, ticketCode, ticket, filePath }
  }

  getCreatorType(): string { return 'file' }
}

// Re-export types for convenience
export type { TicketCreationConfig, TicketCreationResult } from './ticket-creator.js'
