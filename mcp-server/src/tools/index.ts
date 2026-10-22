/**
 * MCP Tools Main Class
 * Refactored to use extracted handlers and centralized tool configuration
 *
 * This file serves as the central router for MCP tools,
 * importing tool definitions from the centralized configuration
 * and delegating all business logic to specialized handlers.
 */

import type { TicketData } from '@mdt/shared/models/Ticket.js'
import type { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import type { ProjectService } from '@mdt/shared/services/ProjectService.js'
import type { TemplateService } from '@mdt/shared/services/TemplateService.js'
import type { TicketService } from '@mdt/shared/services/TicketService.js'
import type { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js'
import type { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import type { CRService } from '../services/crService.js'
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js'
import { z } from 'zod'
import { Sanitizer } from '../utils/sanitizer.js'
import { JsonRpcErrorCode, ToolError } from '../utils/toolError.js'
import { ALL_TOOLS, TOOL_NAMES } from './config/allTools.js'
import { defineTool } from './defineTool.js'
import { CRHandlers } from './handlers/crHandlers.js'
import { ProjectHandlers } from './handlers/projectHandlers.js'
import { SectionHandlers } from './handlers/sectionHandlers.js'
import { AttributesArgsSchema, CreateArgsSchema, KeyArgsSchema, SectionArgsSchema, StatusArgsSchema } from './mutationSchemas.js'

/**
 * Main MCP Tools Class
 *
 * Responsibilities:
 * - Tool call routing to appropriate handlers
 * - Service injection and handler initialization
 * - Tool definitions imported from centralized configuration
 *
 * Anti-duplication: All business logic delegated to handlers
 */
export class MCPTools {
  private projectHandlers: ProjectHandlers
  private crHandlers: CRHandlers
  private sectionHandlers: SectionHandlers
  private detectedProject: string | null
  readonly registry: Record<string, { invoke: (raw: unknown) => Promise<string> }>

  constructor(
    projectService: ProjectService,
    crService: CRService,
    templateService: TemplateService,
    markdownService: MarkdownService,
    titleExtractionService: TitleExtractionService,
    worktreeService: WorktreeService, // Still injected but not passed to CRHandlers (MDT-095)
    detectedProject: string | null = null,
  ) {
    const ticketService: TicketService = crService.getTicketService()

    // Initialize handlers with injected services
    this.projectHandlers = new ProjectHandlers(projectService)

    this.crHandlers = new CRHandlers(
      crService,
      markdownService,
      titleExtractionService,
      templateService,
      ticketService,
    )
    this.sectionHandlers = new SectionHandlers(crService, MarkdownSectionService)
    this.detectedProject = detectedProject
    // Read envelopes remain explicit phase-5 legacy entries. Their existing
    // dispatch and validation are unchanged. Every advertised name is registered.
    this.registry = {
      [TOOL_NAMES.LIST_PROJECTS]: defineTool(z.unknown(), raw => this.handleLegacyRead(TOOL_NAMES.LIST_PROJECTS, raw)),
      [TOOL_NAMES.GET_PROJECT_INFO]: defineTool(z.unknown(), raw => this.handleLegacyRead(TOOL_NAMES.GET_PROJECT_INFO, raw)),
      [TOOL_NAMES.LIST_CRS]: defineTool(z.unknown(), raw => this.handleLegacyRead(TOOL_NAMES.LIST_CRS, raw)),
      [TOOL_NAMES.GET_CR]: defineTool(z.unknown(), raw => this.handleLegacyRead(TOOL_NAMES.GET_CR, raw)),
      [TOOL_NAMES.SUGGEST_CR_IMPROVEMENTS]: defineTool(z.unknown(), raw => this.handleLegacyRead(TOOL_NAMES.SUGGEST_CR_IMPROVEMENTS, raw)),
      [TOOL_NAMES.CREATE_CR]: defineTool(CreateArgsSchema, async (args) => {
        const project = await this.projectHandlers.resolveProject(args.project, this.detectedProject, args.key)
        // The positional legacy interface requires nested type although its
        // implementation explicitly falls back to the separate type argument.
        return this.crHandlers.handleCreateCR(project, args.type, args.data as TicketData)
      }),
      [TOOL_NAMES.UPDATE_CR_STATUS]: defineTool(StatusArgsSchema, async (args) => {
        const project = await this.projectHandlers.resolveProject(args.project, this.detectedProject, args.key)
        return this.crHandlers.handleUpdateCRStatus(project, args.key, args.status)
      }),
      [TOOL_NAMES.UPDATE_CR_ATTRS]: defineTool(AttributesArgsSchema, async (args) => {
        const project = await this.projectHandlers.resolveProject(args.project, this.detectedProject, args.key)
        return this.crHandlers.handleUpdateCRAttrs(project, args.key, args.attributes)
      }),
      [TOOL_NAMES.DELETE_CR]: defineTool(KeyArgsSchema, async (args) => {
        const project = await this.projectHandlers.resolveProject(args.project, this.detectedProject, args.key)
        return this.crHandlers.handleDeleteCR(project, args.key)
      }),
      [TOOL_NAMES.MANAGE_CR_SECTIONS]: defineTool(SectionArgsSchema, async (args) => {
        const project = await this.projectHandlers.resolveProject(args.project, this.detectedProject, args.key)
        return this.sectionHandlers.handleManageCRSections(project, args.key, args.operation, args.section, args.content)
      }),
    }
    if (Object.keys(this.registry).sort().join() !== Object.values(TOOL_NAMES).sort().join()) {
      throw new Error('Tool registry must match TOOL_NAMES')
    }
  }

  /**
   * Get all available tool definitions
   * Imported from centralized configuration
   */
  getTools() {
    return ALL_TOOLS
  }

  /**
   * Route tool calls to appropriate handlers
   * Delegates all business logic to specialized handlers
   */
  private async handleLegacyRead(name: string, raw: unknown): Promise<string> {
    const args = raw as Record<string, unknown>
    const projectTools = [TOOL_NAMES.LIST_PROJECTS, TOOL_NAMES.GET_PROJECT_INFO] as const
    if (projectTools.includes(name as typeof projectTools[number])) {
      return this.projectHandlers.handleToolCall(name, args)
    }
    const key = args.key as string | undefined
    const project = await this.projectHandlers.resolveProject(args.project as string | undefined, this.detectedProject, key)
    switch (name) {
      case TOOL_NAMES.LIST_CRS:
        return this.crHandlers.handleListCRs(project, args.filters as Record<string, unknown> | undefined)
      case TOOL_NAMES.GET_CR:
        return this.crHandlers.handleGetCR(project, key || '', args.mode as string | undefined)
      default:
        return this.crHandlers.handleSuggestCRImprovements(project, key || '')
    }
  }

  async handleToolCall(name: string, args: unknown = {}): Promise<string> {
    try {
      if (!Object.hasOwn(this.registry, name)) {
        const availableTools = Object.values(TOOL_NAMES)
        throw ToolError.protocol(
          `Method not found: Unknown tool '${Sanitizer.sanitizeText(name)}'. Available tools: ${availableTools.join(', ')}`,
          JsonRpcErrorCode.MethodNotFound,
        )
      }
      return await this.registry[name].invoke(args)
    }
    catch (error) {
      console.error(`Error handling tool ${name}:`, error)

      // Handle ToolError instances
      if (error instanceof ToolError) {
        // Protocol errors should be thrown as-is to be handled by the transport layer
        if (error.isProtocolError()) {
          throw error
        }

        // Tool execution errors should be thrown as-is to be handled by the transport layer
        // The transport will convert these to { result: { content: [...], isError: true } }
        throw error
      }

      // Convert regular errors to ToolError
      // Determine if it's a protocol error or tool execution error based on the message
      const errorMessage = error instanceof Error ? error.message : String(error)
      const sanitizedMessage = Sanitizer.sanitizeError(errorMessage)

      // Protocol errors
      if (sanitizedMessage.includes('not found') && sanitizedMessage.includes('tool')) {
        throw ToolError.protocol(sanitizedMessage, JsonRpcErrorCode.MethodNotFound)
      }

      // Parameter validation errors
      if (sanitizedMessage.includes('required')
        || sanitizedMessage.includes('invalid')
        || sanitizedMessage.includes('validation')
        || sanitizedMessage.includes('must be')) {
        throw ToolError.protocol(sanitizedMessage, JsonRpcErrorCode.InvalidParams)
      }

      // All other errors are tool execution errors
      const toolError = ToolError.toolExecution(sanitizedMessage)

      // Preserve stack trace if available
      if (error instanceof Error && error.stack) {
        toolError.stack = error.stack
      }

      throw toolError
    }
  }
}
