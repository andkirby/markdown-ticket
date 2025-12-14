/**
 * MCP Tools Main Class
 * Refactored to use extracted handlers and centralized tool configuration
 *
 * This file serves as the central router for MCP tools,
 * importing tool definitions from the centralized configuration
 * and delegating all business logic to specialized handlers.
 */

import { ProjectService } from '@mdt/shared/services/ProjectService.js';
import { CRService } from '../services/crService.js';
import { TemplateService } from '@mdt/shared/services/TemplateService.js';
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js';
import { ProjectHandlers } from './handlers/projectHandlers.js';
import { CRHandlers } from './handlers/crHandlers.js';
import { SectionHandlers } from './handlers/sectionHandlers.js';
import { ALL_TOOLS, TOOL_NAMES } from './config/allTools.js';
import { Sanitizer } from '../utils/sanitizer.js';

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
  private projectHandlers: ProjectHandlers;
  private crHandlers: CRHandlers;
  private sectionHandlers: SectionHandlers;

  constructor(
    projectService: ProjectService,
    crService: CRService,
    templateService: TemplateService,
    markdownService: MarkdownService,
    titleExtractionService: TitleExtractionService
  ) {
    // Initialize handlers with injected services
    this.projectHandlers = new ProjectHandlers(projectService);
    this.crHandlers = new CRHandlers(
      crService,
      markdownService,
      titleExtractionService,
      templateService
    );
    this.sectionHandlers = new SectionHandlers(crService, MarkdownSectionService);
  }

  /**
   * Get all available tool definitions
   * Imported from centralized configuration
   */
  getTools() {
    return ALL_TOOLS;
  }

  /**
   * Route tool calls to appropriate handlers
   * Delegates all business logic to specialized handlers
   */
  async handleToolCall(name: string, args: any): Promise<string> {
    try {
      // Route to project handlers
      if ([TOOL_NAMES.LIST_PROJECTS, TOOL_NAMES.GET_PROJECT_INFO].includes(name as any)) {
        return await this.projectHandlers.handleToolCall(name, args);
      }

      // Route to CR handlers
      if ([
        TOOL_NAMES.LIST_CRS,
        TOOL_NAMES.GET_CR,
        TOOL_NAMES.CREATE_CR,
        TOOL_NAMES.UPDATE_CR_STATUS,
        TOOL_NAMES.UPDATE_CR_ATTRS,
        TOOL_NAMES.DELETE_CR,
        TOOL_NAMES.SUGGEST_CR_IMPROVEMENTS
      ].includes(name as any)) {
        const project = await this.projectHandlers.validateProject(args.project);

        switch (name) {
          case TOOL_NAMES.LIST_CRS:
            return await this.crHandlers.handleListCRs(project, args.filters);

          case TOOL_NAMES.GET_CR:
            return await this.crHandlers.handleGetCR(project, args.key, args.mode);

          case TOOL_NAMES.CREATE_CR:
            return await this.crHandlers.handleCreateCR(project, args.type, args.data);

          case TOOL_NAMES.UPDATE_CR_STATUS:
            return await this.crHandlers.handleUpdateCRStatus(project, args.key, args.status);

          case TOOL_NAMES.UPDATE_CR_ATTRS:
            return await this.crHandlers.handleUpdateCRAttrs(project, args.key, args.attributes);

          case TOOL_NAMES.DELETE_CR:
            return await this.crHandlers.handleDeleteCR(project, args.key);

          case TOOL_NAMES.SUGGEST_CR_IMPROVEMENTS:
            return await this.crHandlers.handleSuggestCRImprovements(project, args.key);
        }
      }

      // Route to section handlers
      if (name === TOOL_NAMES.MANAGE_CR_SECTIONS) {
        const project = await this.projectHandlers.validateProject(args.project);
        return await this.sectionHandlers.handleManageCRSections(
          project,
          args.key,
          args.operation,
          args.section,
          args.content
        );
      }

      // Unknown tool - sanitize tool name in error
      const availableTools = Object.values(TOOL_NAMES);
      const sanitizedName = Sanitizer.sanitizeText(name);
      throw new Error(`Unknown tool '${sanitizedName}'. Available tools: ${availableTools.join(', ')}`);

    } catch (error) {
      console.error(`Error handling tool ${name}:`, error);

      // Sanitize error message before re-throwing
      if (error instanceof Error) {
        const sanitizedMessage = Sanitizer.sanitizeError(error.message);
        const sanitizedError = new Error(sanitizedMessage);
        sanitizedError.stack = error.stack; // Preserve stack trace for debugging
        throw sanitizedError;
      } else {
        throw new Error(Sanitizer.sanitizeError(String(error)));
      }
    }
  }
}