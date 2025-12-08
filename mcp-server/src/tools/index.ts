/**
 * MCP Tools Main Class
 * Refactored to use extracted handlers and services
 *
 * This file serves as the central registry and router for MCP tools,
 * delegating all business logic to specialized handlers and services.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ProjectService } from '@mdt/shared/services/ProjectService.js';
import { CRService } from '../services/crService.js';
import { TemplateService } from '@mdt/shared/services/TemplateService.js';
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js';
import { ProjectHandlers } from './handlers/projectHandlers.js';
import { CRHandlers } from './handlers/crHandlers.js';
import { SectionHandlers } from './handlers/sectionHandlers.js';

/**
 * Main MCP Tools Class
 *
 * Responsibilities:
 * - Tool registry and definition
 * - Tool call routing to appropriate handlers
 * - Service injection and handler initialization
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
   * Combines tool definitions from all handlers
   */
  getTools(): Tool[] {
    const projectTools = this.projectHandlers.getProjectTools();

    // CR and Section tools defined here for now
    // TODO: Move to respective handlers in Phase 2
    const crAndSectionTools: Tool[] = [
      // CR Operations
      {
        name: 'list_crs',
        description: 'List CRs with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            filters: {
              type: 'object',
              properties: {
                status: {
                  oneOf: [
                    { type: 'string', enum: ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected'] },
                    { type: 'array', items: { type: 'string', enum: ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected'] } }
                  ],
                  description: 'Filter by status'
                },
                type: {
                  oneOf: [
                    { type: 'string', enum: ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'] },
                    { type: 'array', items: { type: 'string', enum: ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'] } }
                  ],
                  description: 'Filter by type'
                },
                priority: {
                  oneOf: [
                    { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
                    { type: 'array', items: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] } }
                  ],
                  description: 'Filter by priority'
                }
              }
            }
          },
          required: ['project']
        }
      },
      {
        name: 'create_cr',
        description: 'Create a new CR. Available types: Architecture (system design), Feature Enhancement (new functionality), Bug Fix (defect resolution), Technical Debt (code quality), Documentation (project docs)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            type: {
              type: 'string',
              enum: ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'],
              description: 'CR type'
            },
            data: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'CR title/summary'
                },
                priority: {
                  type: 'string',
                  enum: ['Low', 'Medium', 'High', 'Critical'],
                  description: 'CR priority (default: Medium)'
                },
                phaseEpic: {
                  type: 'string',
                  description: 'Phase or epic'
                },
                impactAreas: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'System areas impacted'
                },
                relatedTickets: {
                  type: 'string',
                  description: 'Related CR codes (comma-separated)'
                },
                dependsOn: {
                  type: 'string',
                  description: 'CR dependencies (comma-separated)'
                },
                blocks: {
                  type: 'string',
                  description: 'CRs blocked by this (comma-separated)'
                },
                assignee: {
                  type: 'string',
                  description: 'Implementation assignee'
                },
                content: {
                  type: 'string',
                  description: `FULL markdown document with required sections:

  ## 1. Description
  - Problem statement with background context
  - Current state vs. desired state
  - Business or technical justification

  ## 2. Rationale
  - Why this change is necessary
  - What it accomplishes
  - Alignment with project goals

  ## 3. Solution Analysis
  - Evaluated alternatives with trade-offs
  - Selected approach with justification
  - Rejected options and why

  ## 4. Implementation Specification
  - Technical details and architecture changes
  - Step-by-step implementation plan
  - Testing requirements and success criteria

  ## 5. Acceptance Criteria
  - Measurable conditions for completion
  - Definition of "done"

  Template auto-generated if omitted. When providing content, include ALL sections above.`
                }
              },
              required: ['title']
            }
          },
          required: ['project', 'type', 'data']
        }
      },
      {
        name: 'update_cr_status',
        description: 'Update CR status',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            key: {
              type: 'string',
              description: 'CR key'
            },
            status: {
              type: 'string',
              enum: ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected', 'On Hold'],
              description: 'New CR status'
            }
          },
          required: ['project', 'key', 'status']
        }
      },
      {
        name: 'update_cr_attrs',
        description: 'Update CR attributes. Only the following attributes can be updated: priority, phaseEpic, assignee, relatedTickets, dependsOn, blocks, implementationDate, implementationNotes. To update CR title, use manage_cr_sections (edit the H1 header - MDT-064). To update CR status, use update_cr_status. To update CR content/sections, use manage_cr_sections.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            key: {
              type: 'string',
              description: 'CR key'
            },
            attributes: {
              type: 'object',
              description: 'Attributes to update. Only these fields are allowed: priority, phaseEpic, assignee, relatedTickets, dependsOn, blocks, implementationDate, implementationNotes. Do NOT update title directly - update the H1 header in the CR content using manage_cr_sections instead (MDT-064: H1 as Single Source of Truth).',
              properties: {
                priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'], description: 'CR priority' },
                phaseEpic: { type: 'string', description: 'Phase or epic' },
                relatedTickets: { type: 'string', description: 'Related CR codes (comma-separated)' },
                dependsOn: { type: 'string', description: 'CR dependencies (comma-separated)' },
                blocks: { type: 'string', description: 'CRs blocked by this (comma-separated)' },
                assignee: { type: 'string', description: 'Implementation assignee' },
                implementationDate: { type: 'string', description: 'Date when implementation was completed (ISO 8601 format, e.g., "2025-09-20")' },
                implementationNotes: { type: 'string', description: 'Notes about implementation completion' }
              }
            }
          },
          required: ['project', 'key', 'attributes']
        }
      },
      {
        name: 'delete_cr',
        description: 'Delete CR (for implemented bug fixes)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            key: {
              type: 'string',
              description: 'CR key'
            }
          },
          required: ['project', 'key']
        }
      },
      {
        name: 'get_cr',
        description: 'Get CR (consolidated - replaces get_cr_full_content + get_cr_attributes)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            key: {
              type: 'string',
              description: 'CR key (e.g., MDT-004, API-123)'
            },
            mode: {
              type: 'string',
              enum: ['full', 'attributes', 'metadata'],
              description: 'Return mode: full=CR+markdown, attributes=YAML only, metadata=key info only',
              default: 'full'
            }
          },
          required: ['project', 'key']
        }
      },
      {
        name: 'manage_cr_sections',
        description: `Manage CR sections with targeted operations. Operations: list (all sections), get (read one), replace (all content), append (add to end), prepend (add to beginning). Section matching supports: "Description", "## 1. Description", or hierarchical paths. Content with header renames section.`,
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key (e.g., "MDT", "SEB")'
            },
            key: {
              type: 'string',
              description: 'CR key (e.g., "MDT-001", "SEB-010")'
            },
            operation: {
              type: 'string',
              enum: ['list', 'get', 'replace', 'append', 'prepend'],
              description: 'Operation: list=all sections with structure, get=read specific section, replace=entire content, append=add to end, prepend=add to beginning'
            },
            section: {
              type: 'string',
              description: 'Section identifier (supports flexible formats: "1. Description", "Description", exact "## 1. Description", or hierarchical "## Parent / ### Child"). Required for get/replace/append/prepend operations.'
            },
            content: {
              type: 'string',
              description: 'Content to apply (required for replace/append/prepend operations). To rename/restructure: start with new header at same level. To preserve header: provide only body content.'
            }
          },
          required: ['project', 'key', 'operation']
        }
      },
      {
        name: 'suggest_cr_improvements',
        description: 'Get CR improvement suggestions (analyzes structure/completeness)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key (e.g., "MDT", "API")'
            },
            key: {
              type: 'string',
              description: 'CR key to analyze (e.g., "MDT-001")'
            }
          },
          required: ['project', 'key']
        }
      }
    ];

    return [...projectTools, ...crAndSectionTools];
  }

  /**
   * Route tool calls to appropriate handlers
   * Delegates all business logic to specialized handlers
   */
  async handleToolCall(name: string, args: any): Promise<string> {
    try {
      // Route to project handlers
      if (['list_projects', 'get_project_info'].includes(name)) {
        return await this.projectHandlers.handleToolCall(name, args);
      }

      // Route to CR handlers
      if (['list_crs', 'get_cr', 'create_cr', 'update_cr_status', 'update_cr_attrs', 'delete_cr', 'suggest_cr_improvements'].includes(name)) {
        const project = await this.projectHandlers.validateProject(args.project);

        switch (name) {
          case 'list_crs':
            return await this.crHandlers.handleListCRs(project, args.filters);

          case 'get_cr':
            return await this.crHandlers.handleGetCR(project, args.key, args.mode);

          case 'create_cr':
            return await this.crHandlers.handleCreateCR(project, args.type, args.data);

          case 'update_cr_status':
            return await this.crHandlers.handleUpdateCRStatus(project, args.key, args.status);

          case 'update_cr_attrs':
            return await this.crHandlers.handleUpdateCRAttrs(project, args.key, args.attributes);

          case 'delete_cr':
            return await this.crHandlers.handleDeleteCR(project, args.key);

          case 'suggest_cr_improvements':
            return await this.crHandlers.handleSuggestCRImprovements(project, args.key);
        }
      }

      // Route to section handlers
      if (name === 'manage_cr_sections') {
        const project = await this.projectHandlers.validateProject(args.project);
        return await this.sectionHandlers.handleManageCRSections(
          project,
          args.key,
          args.operation,
          args.section,
          args.updateMode,
          args.content
        );
      }

      // Unknown tool
      const availableTools = [
        'list_projects', 'get_project_info', 'list_crs', 'get_cr', 'create_cr',
        'update_cr_attrs', 'update_cr_status', 'delete_cr', 'manage_cr_sections',
        'suggest_cr_improvements'
      ];
      throw new Error(`Unknown tool '${name}'. Available tools: ${availableTools.join(', ')}`);

    } catch (error) {
      console.error(`Error handling tool ${name}:`, error);
      throw error;
    }
  }
}