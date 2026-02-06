/**
 * MCP Tools Main Class
 * Refactored to use extracted handlers and centralized tool configuration
 *
 * This file serves as the central router for MCP tools,
 * importing tool definitions from the centralized configuration
 * and delegating all business logic to specialized handlers.
 */

import type { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import type { ProjectService } from '@mdt/shared/services/ProjectService.js'
import type { TemplateService } from '@mdt/shared/services/TemplateService.js'
import type { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js'
import type { CRService } from '../services/crService.js'
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js'
import { Sanitizer } from '../utils/sanitizer.js'
import { JsonRpcErrorCode, ToolError } from '../utils/toolError.js'
import { ALL_TOOLS, TOOL_NAMES } from './config/allTools.js'
import { CRHandlers } from './handlers/crHandlers.js'
import { ProjectHandlers } from './handlers/projectHandlers.js'
import { SectionHandlers } from './handlers/sectionHandlers.js'

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

  constructor(
    projectService: ProjectService,
    crService: CRService,
    templateService: TemplateService,
    markdownService: MarkdownService,
    titleExtractionService: TitleExtractionService,
    detectedProject: string | null = null,
  ) {
    // Initialize handlers with injected services
    this.projectHandlers = new ProjectHandlers(projectService)
    this.crHandlers = new CRHandlers(
      crService,
      markdownService,
      titleExtractionService,
      templateService,
    )
    this.sectionHandlers = new SectionHandlers(crService, MarkdownSectionService)
    this.detectedProject = detectedProject
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
  async handleToolCall(name: string, args: any): Promise<string> {
    try {
      // Route to project handlers
      if ([TOOL_NAMES.LIST_PROJECTS, TOOL_NAMES.GET_PROJECT_INFO].includes(name as any)) {
        return await this.projectHandlers.handleToolCall(name, args)
      }

      // Route to CR handlers
      if ([
        TOOL_NAMES.LIST_CRS,
        TOOL_NAMES.GET_CR,
        TOOL_NAMES.CREATE_CR,
        TOOL_NAMES.UPDATE_CR_STATUS,
        TOOL_NAMES.UPDATE_CR_ATTRS,
        TOOL_NAMES.DELETE_CR,
        TOOL_NAMES.SUGGEST_CR_IMPROVEMENTS,
      ].includes(name as any)) {
        const project = await this.projectHandlers.resolveProject(args.project, this.detectedProject)

        switch (name) {
          case TOOL_NAMES.LIST_CRS:
            return await this.crHandlers.handleListCRs(project, args.filters)

          case TOOL_NAMES.GET_CR:
            return await this.crHandlers.handleGetCR(project, args.key, args.mode)

          case TOOL_NAMES.CREATE_CR:
            return await this.crHandlers.handleCreateCR(project, args.type, args.data)

          case TOOL_NAMES.UPDATE_CR_STATUS:
            return await this.crHandlers.handleUpdateCRStatus(project, args.key, args.status)

          case TOOL_NAMES.UPDATE_CR_ATTRS:
            return await this.crHandlers.handleUpdateCRAttrs(project, args.key, args.attributes)

          case TOOL_NAMES.DELETE_CR:
            return await this.crHandlers.handleDeleteCR(project, args.key)

          case TOOL_NAMES.SUGGEST_CR_IMPROVEMENTS:
            return await this.crHandlers.handleSuggestCRImprovements(project, args.key)
        }
      }

      // Route to section handlers
      if (name === TOOL_NAMES.MANAGE_CR_SECTIONS) {
        const project = await this.projectHandlers.resolveProject(args.project, this.detectedProject)
        return await this.sectionHandlers.handleManageCRSections(
          project,
          args.key,
          args.operation,
          args.section,
          args.content,
        )
      }

      // Unknown tool - create protocol error
      const availableTools = Object.values(TOOL_NAMES)
      const sanitizedName = Sanitizer.sanitizeText(name)
      throw ToolError.protocol(
        `Method not found: Unknown tool '${sanitizedName}'. Available tools: ${availableTools.join(', ')}`,
        JsonRpcErrorCode.MethodNotFound,
      )
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
