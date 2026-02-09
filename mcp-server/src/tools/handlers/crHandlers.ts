/**
 * CR Handlers Module
 * Extracted CR operation handlers from tools/index.ts
 *
 * This module implements all CR-related MCP tool handlers with:
 * - Dependency injection for services
 * - Anti-duplication through shared service imports
 * - Consistent error handling and response formatting
 */

import type { Project } from '@mdt/shared/models/Project.js'
import type { TicketData, TicketFilters } from '@mdt/shared/models/Ticket.js'
import type { CRStatus } from '@mdt/shared/models/Types.js'
import type { TemplateService } from '@mdt/shared/services/TemplateService.js'
import type { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js'
import type { CRService } from '../../services/crService.js'
import { CRStatus as CRStatusEnum, CRTypes } from '@mdt/domain-contracts'
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import { ContentProcessor } from '../../services/SectionManagement/ContentProcessor.js'
import { normalizeKey } from '../../utils/keyNormalizer.js'
import { Sanitizer } from '../../utils/sanitizer.js'
import { JsonRpcErrorCode, ToolError } from '../../utils/toolError.js'
import { validateOperation, validateRequired } from '../../utils/validation.js'

/**
 * CR Handlers Class
 *
 * Encapsulates all CR-related MCP tool handlers with injected dependencies
 * to prevent code duplication and enable proper testing.
 */
export class CRHandlers {
  constructor(
    private crService: CRService,
    private markdownService: MarkdownService,
    private titleExtractionService: TitleExtractionService,
    private templateService: TemplateService,
  ) {}

  /**
   * Handler for list_crs tool
   */
  async handleListCRs(project: Project, filters?: TicketFilters): Promise<string> {
    const crs = await this.crService.listCRs(project, filters)

    if (crs.length === 0) {
      if (filters) {
        return Sanitizer.sanitizeText(`🎫 No CRs found matching the specified filters in project ${project.project.code || project.id}.`)
      }
      return Sanitizer.sanitizeText(`🎫 No CRs found in project ${project.project.code || project.id}.`)
    }

    const lines = [`🎫 Found ${crs.length} CR${crs.length === 1 ? '' : 's'}${filters ? ' matching filters' : ''}:`, '']

    for (const ticket of crs) {
      // Sanitize ticket data before output
      const safeTitle = Sanitizer.sanitizeText(ticket.title)
      const safePhase = ticket.phaseEpic ? Sanitizer.sanitizeText(ticket.phaseEpic) : null

      lines.push(`**${ticket.code}** - ${safeTitle}`)
      lines.push(`- Status: ${ticket.status}`)
      lines.push(`- Type: ${ticket.type}`)
      lines.push(`- Priority: ${ticket.priority}`)
      if (safePhase) {
        lines.push(`- Phase: ${safePhase}`)
      }
      lines.push('')
    }

    return Sanitizer.sanitizeText(lines.join('\n'))
  }

  /**
   * Handler for get_cr tool
   */
  async handleGetCR(project: Project, key: string, mode: string = 'full'): Promise<string> {
    // Normalize key (MDT-121: supports numeric shorthand and lowercase prefixes)
    const projectCode = project.project.code || project.id
    const normalizedKey = normalizeKey(key, projectCode)

    // Validate mode parameter - this is a protocol error (invalid parameter)
    const modeValidation = validateOperation(mode, ['full', 'attributes', 'metadata'], 'mode')
    if (!modeValidation.valid) {
      throw ToolError.protocol(modeValidation.message || 'Invalid mode parameter', JsonRpcErrorCode.InvalidParams)
    }

    const ticket = await this.crService.getCR(project, normalizedKey)
    if (!ticket) {
      // CR not found is a business logic failure (tool execution error)
      throw ToolError.toolExecution(`CR '${normalizedKey}' not found in project '${project.project.code || project.id}'`)
    }

    switch (modeValidation.value) {
      case 'full':
        // Return sanitized ticket content
        return Sanitizer.sanitizeCRContent(ticket.content || '', 'full')

      case 'attributes': {
        // Extract YAML frontmatter and return attributes
        try {
          const fileContent = await MarkdownService.readFile(ticket.filePath)

          // Extract YAML frontmatter
          const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/)
          if (!frontmatterMatch) {
            // Invalid file format is a business logic error (tool execution error)
            throw ToolError.toolExecution(`Invalid CR file format for ${normalizedKey}: No YAML frontmatter found`)
          }

          const _yamlContent = frontmatterMatch[1]

          // Use MarkdownService to parse YAML (anti-duplication)
          const parsedTicket = await MarkdownService.parseMarkdownContent(fileContent)
          if (!parsedTicket) {
            throw ToolError.toolExecution(`Failed to parse CR file for ${normalizedKey}`)
          }

          // Build attributes object from parsed ticket
          interface CRAttributes {
            code: string
            title: string
            status: string
            type: string
            priority: string
            phaseEpic?: string
            assignee?: string
            dependsOn?: string[]
            blocks?: string[]
            relatedTickets?: string
            impactAreas?: string[]
            implementationDate?: string
            implementationNotes?: string
          }

          const attributes: CRAttributes = {
            code: parsedTicket.code || normalizedKey,
            title: Sanitizer.sanitizeText(ticket.title || parsedTicket.title || 'Untitled'),
            status: parsedTicket.status || 'Unknown',
            type: parsedTicket.type || 'Unknown',
            priority: parsedTicket.priority || 'Medium',
          }

          // Add optional fields if present, sanitizing string values
          const optionalFields: (keyof CRAttributes)[] = [
            'phaseEpic',
            'assignee',
            'dependsOn',
            'blocks',
            'relatedTickets',
            'impactAreas',
            'implementationDate',
            'implementationNotes',
          ]

          for (const field of optionalFields) {
            const value = (parsedTicket as unknown as Record<string, unknown>)[field as string]
            if (value !== undefined && value !== null) {
              // Type-safe assignment based on the expected type
              if (typeof value === 'string') {
                (attributes as unknown as Record<string, unknown>)[field] = Sanitizer.sanitizeText(value)
              } else if (Array.isArray(value)) {
                (attributes as unknown as Record<string, unknown>)[field] = value as string[]
              } else {
                (attributes as unknown as Record<string, unknown>)[field] = value
              }
            }
          }

          // Return formatted JSON output
          return Sanitizer.sanitizeText(JSON.stringify(attributes, null, 2))
        }
        catch (fileError) {
          throw ToolError.toolExecution(`Failed to read CR file for ${normalizedKey}: ${(fileError as Error).message}`)
        }
      }

      case 'metadata':
        // Return just the key metadata without full YAML parsing
        try {
          const metadata = {
            code: ticket.code,
            title: Sanitizer.sanitizeText(ticket.title),
            status: ticket.status,
            type: ticket.type,
            priority: ticket.priority,
            phaseEpic: ticket.phaseEpic ? Sanitizer.sanitizeText(ticket.phaseEpic) : undefined,
            filePath: ticket.filePath,
          }

          return Sanitizer.sanitizeText(JSON.stringify(metadata, null, 2))
        }
        catch (fileError) {
          throw ToolError.toolExecution(`Failed to get metadata for ${normalizedKey}: ${(fileError as Error).message}`)
        }

      default:
        throw ToolError.protocol(`Invalid mode '${mode}'. Must be: full, attributes, or metadata`, JsonRpcErrorCode.InvalidParams)
    }
  }

  /**
   * Handler for create_cr tool
   */
  async handleCreateCR(project: Project, type: string, data: TicketData): Promise<string> {
    // Validate type parameter - this is a protocol error (invalid parameter)
    const typeValidation = validateOperation(type, CRTypes, 'type')
    if (!typeValidation.valid) {
      throw ToolError.protocol(typeValidation.message || 'Validation error', JsonRpcErrorCode.InvalidParams)
    }

    // Validate data first - this is a protocol error (invalid parameter)
    const validation = this.templateService.validateTicketData(data, typeValidation.value)
    if (!validation.valid) {
      const errors = validation.errors.map(e => `- ❌ ${e.field}: ${e.message}`).join('\n')
      throw ToolError.protocol(`CR data validation failed:\n${errors}`, JsonRpcErrorCode.InvalidParams)
    }

    // Process content if provided
    const processedData = { ...data }
    interface ContentProcessingResult {
      content: string
      warnings: string[]
    }
    let contentProcessingResult: ContentProcessingResult | null = null

    if (data.content) {
      contentProcessingResult = ContentProcessor.processContent(data.content, {
        operation: 'replace',
        maxLength: 1000000, // 1MB limit for full CR content
      })

      // Check for content processing errors (ContentProcessor throws exceptions directly)
      // No need to check .errors field as ContentProcessor throws on errors

      // Show warnings if any
      if (contentProcessingResult.warnings.length > 0) {
        console.warn(`Content processing warnings for new CR:`, contentProcessingResult.warnings)
      }

      // Use processed content
      processedData.content = contentProcessingResult.content
    }

    const ticket = await this.crService.createCR(project, typeValidation.value as string, processedData)

    const lines = [
      `✅ **Created CR ${ticket.code}**: ${ticket.title}`,
      '',
      '**Details:**',
      `- Key: ${ticket.code}`,
      `- Status: ${ticket.status}`,
      `- Type: ${ticket.type}`,
      `- Priority: ${ticket.priority}`,
    ]

    if (ticket.phaseEpic)
      lines.push(`- Phase: ${ticket.phaseEpic}`)
    lines.push(`- Created: ${new Date().toISOString()}`)

    // Get the file path from the created ticket
    if (ticket.filePath) {
      lines.push('')
      lines.push(`**File Created:** ${ticket.filePath}`)
    }

    // Add processing information if content was provided and processed
    if (data.content && processedData.content !== data.content && contentProcessingResult) {
      lines.push('')
      lines.push('**Content Processing:**')
      lines.push('- Applied content sanitization and formatting')
      if (contentProcessingResult.warnings.length > 0) {
        lines.push(`- ${contentProcessingResult.warnings.length} warning(s) logged to console`)
      }
    }

    if (!data.content) {
      lines.push('')
      lines.push('The CR has been created with a complete template including:')
      lines.push('- Problem statement and description')
      if (data.impactAreas) {
        lines.push(`- Impact areas (${data.impactAreas.join(', ')})`)
      }
      lines.push('- Standard CR sections ready for completion')
      lines.push('- YAML frontmatter with all metadata')
      lines.push('')
      lines.push('Next step: Update the CR with detailed implementation specifications.')
    }

    return lines.join('\n')
  }

  /**
   * Handler for update_cr_status tool
   */
  async handleUpdateCRStatus(project: Project, key: string, status: CRStatus): Promise<string> {
    // Normalize key (MDT-121: supports numeric shorthand and lowercase prefixes)
    const projectCode = project.project.code || project.id
    const normalizedKey = normalizeKey(key, projectCode)

    // Validate status parameter
    const statusValidation = validateOperation(status, [
      CRStatusEnum.PROPOSED,
      CRStatusEnum.APPROVED,
      CRStatusEnum.IN_PROGRESS,
      CRStatusEnum.IMPLEMENTED,
      CRStatusEnum.REJECTED,
      CRStatusEnum.ON_HOLD,
      CRStatusEnum.PARTIALLY_IMPLEMENTED,
    ] as string[], 'status')
    if (!statusValidation.valid) {
      throw ToolError.protocol(statusValidation.message || 'Validation error', JsonRpcErrorCode.InvalidParams)
    }

    // Get current CR to show old status
    const ticket = await this.crService.getCR(project, normalizedKey)
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${normalizedKey}' not found in project '${project.project.code || project.id}'`)
    }

    const oldStatus = ticket.status

    // The service now throws specific errors instead of returning false
    await this.crService.updateCRStatus(project, normalizedKey, statusValidation.value as CRStatus)

    const lines = [
      `✅ **Updated CR ${normalizedKey}** status`,
      '',
      `**Change:** ${oldStatus} → ${statusValidation.value}`,
      `- Title: ${ticket.title}`,
      `- Updated: ${new Date().toISOString()}`,
      '- File: Updated YAML frontmatter and lastModified timestamp',
    ]

    if (statusValidation.value === 'Approved') {
      lines.push('', 'The CR is now approved and ready for implementation.')
    }
    else if (statusValidation.value === 'Implemented') {
      lines.push('', 'The CR has been marked as implemented.')
      if (ticket.type === 'Bug Fix') {
        lines.push('Consider deleting this bug fix CR after verification period.')
      }
    }

    return lines.join('\n')
  }

  /**
   * Handler for update_cr_attrs tool
   */
  async handleUpdateCRAttrs(project: Project, key: string, attributes: Record<string, unknown>): Promise<string> {
    // Normalize key (MDT-121: supports numeric shorthand and lowercase prefixes)
    const projectCode = project.project.code || project.id
    const normalizedKey = normalizeKey(key, projectCode)

    // Validate attributes parameter
    const attrsValidation = validateRequired(attributes, 'attributes')
    if (!attrsValidation.valid) {
      throw ToolError.protocol(attrsValidation.message || 'Validation error', JsonRpcErrorCode.InvalidParams)
    }

    // Get current CR info
    const ticket = await this.crService.getCR(project, normalizedKey)
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${normalizedKey}' not found in project '${project.project.code || project.id}'`)
    }

    const success = await this.crService.updateCRAttrs(project, normalizedKey, attributes)
    if (!success) {
      throw ToolError.toolExecution(`Failed to update CR '${normalizedKey}' attributes`)
    }

    const lines = [
      `✅ **Updated CR ${normalizedKey} Attributes**`,
      '',
      `- Title: ${ticket.title}`,
      `- Status: ${ticket.status}`,
      '',
      '**Updated Fields:**',
    ]

    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        lines.push(`- ${field}: ${value}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Handler for delete_cr tool
   */
  async handleDeleteCR(project: Project, key: string): Promise<string> {
    // Normalize key (MDT-121: supports numeric shorthand and lowercase prefixes)
    const projectCode = project.project.code || project.id
    const normalizedKey = normalizeKey(key, projectCode)

    // Get CR info before deletion
    const ticket = await this.crService.getCR(project, normalizedKey)
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${normalizedKey}' not found in project '${project.project.code || project.id}'`)
    }

    const success = await this.crService.deleteCR(project, normalizedKey)
    if (!success) {
      throw ToolError.toolExecution(`Failed to delete CR '${normalizedKey}'`)
    }

    const lines = [
      `🗑️ **Deleted CR ${normalizedKey}**`,
      '',
      `- Title: ${ticket.title}`,
      `- Type: ${ticket.type}`,
      `- Status: ${ticket.status}`,
    ]

    if (ticket.type === 'Bug Fix') {
      lines.push('', 'The bug fix CR has been deleted as it was implemented and verified. Bug CRs are typically removed after successful implementation to reduce clutter, as documented in the CR lifecycle.')
    }

    return lines.join('\n')
  }

  /**
   * Handler for suggest_cr_improvements tool
   */
  async handleSuggestCRImprovements(project: Project, key: string): Promise<string> {
    // Normalize key (MDT-121: supports numeric shorthand and lowercase prefixes)
    const projectCode = project.project.code || project.id
    const normalizedKey = normalizeKey(key, projectCode)

    const ticket = await this.crService.getCR(project, normalizedKey)
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${normalizedKey}' not found in project '${project.project.code || project.id}'`)
    }

    const suggestions = this.templateService.suggestImprovements(ticket)

    return [
      `💡 **CR Improvement Suggestions for ${normalizedKey}**`,
      '',
      `**Current CR:** ${ticket.title}`,
      '',
      ...suggestions.map((suggestion, index) => {
        const priority = index < 3 ? 'High-Priority' : index < 6 ? 'Medium-Priority' : 'Low-Priority'
        return [
          `**${priority} Improvement:**`,
          '',
          `${index + 1}. **${suggestion.title}**`,
          `   ${suggestion.description}`,
          `   *Actionable:* ${suggestion.actionable ? 'Yes' : 'No'}`,
          '',
        ].join('\n')
      }),
    ].join('\n')
  }
}
