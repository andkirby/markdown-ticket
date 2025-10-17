import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ProjectDiscoveryService } from '../services/projectDiscovery.js';
import { CRService } from '../services/crService.js';
import { TemplateService } from '../../../dist/services/TemplateService.js';
import { MarkdownSectionService } from '../../../dist/services/MarkdownSectionService.js';
import { MarkdownService } from '../../../dist/services/MarkdownService.js';
import { TicketFilters, TicketData } from '../../../dist/models/Ticket.js';
import { CRStatus } from '../../../dist/models/Types.js';
import { SimpleContentProcessor } from '../utils/simpleContentProcessor.js';
import { SimpleSectionValidator } from '../utils/simpleSectionValidator.js';

export class MCPTools {
  constructor(
    private projectDiscovery: ProjectDiscoveryService,
    private crService: CRService,
    private templateService: TemplateService
  ) {}

  getTools(): Tool[] {
    return [
      // Project Management
      {
        name: 'list_projects',
        description: 'List all discovered projects',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_project_info',
        description: 'Get detailed project information',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Project key (e.g., MDT, API, WEB)'
            }
          },
          required: ['key']
        }
      },

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
        description: 'Update CR attributes (status excluded)',
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
              properties: {
                title: { type: 'string', description: 'CR title/summary' },
                priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'], description: 'CR priority' },
                phaseEpic: { type: 'string', description: 'Phase or epic' },
                relatedTickets: { type: 'string', description: 'Related CR codes' },
                dependsOn: { type: 'string', description: 'CR dependencies' },
                blocks: { type: 'string', description: 'CRs blocked by this' },
                assignee: { type: 'string', description: 'Implementation assignee' }
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
        description: 'Manage CR sections (consolidated - replaces list/get/update sections)',
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
              enum: ['list', 'get', 'update'],
              description: 'Operation: list=get all sections, get=read one section, update=modify section'
            },
            section: {
              type: 'string',
              description: 'Section identifier (required for get/update operations)'
            },
            updateMode: {
              type: 'string',
              enum: ['replace', 'append', 'prepend'],
              description: 'Update mode (required for update operation)'
            },
            content: {
              type: 'string',
              description: 'Content to apply (required for update operation)'
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
  }

  async handleToolCall(name: string, args: any): Promise<string> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.handleListProjects();
        
        case 'get_project_info':
          return await this.handleGetProjectInfo(args.key);
        
        case 'list_crs':
          return await this.handleListCRs(args.project, args.filters);
        
        case 'create_cr':
          return await this.handleCreateCR(args.project, args.type, args.data);
        
        case 'update_cr_status':
          return await this.handleUpdateCRStatus(args.project, args.key, args.status);
        
        case 'update_cr_attrs':
          return await this.handleUpdateCRAttrs(args.project, args.key, args.attributes);
        
        case 'delete_cr':
          return await this.handleDeleteCR(args.project, args.key);

        case 'get_cr':
          return await this.handleGetCRConsolidated(args.project, args.key, args.mode);

        case 'manage_cr_sections':
          return await this.handleManageCRSections(args.project, args.key, args.operation, args.section, args.updateMode, args.content);

        case 'suggest_cr_improvements':
          return await this.handleSuggestCRImprovements(args.project, args.key);
        
        default:
          const availableTools = ['list_projects', 'get_project_info', 'list_crs', 'get_cr', 'create_cr', 'update_cr_attrs', 'update_cr_status', 'delete_cr', 'manage_cr_sections', 'suggest_cr_improvements'];
          throw new Error(`Unknown tool '${name}'. Available tools: ${availableTools.join(', ')}`);
      }
    } catch (error) {
      console.error(`Error handling tool ${name}:`, error);
      throw error;
    }
  }

  private async validateProject(projectKey: string): Promise<any> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      const projects = await this.projectDiscovery.discoverProjects();
      const availableKeys = projects.map(p => p.id).join(', ');
      throw new Error(`Project '${projectKey}' not found. Available projects: ${availableKeys}`);
    }
    return project;
  }

  private async handleListProjects(): Promise<string> {
    // First try cached projects, fallback to discovery
    let projects = this.projectDiscovery.getCachedProjects();
    if (projects.length === 0) {
      projects = await this.projectDiscovery.discoverProjects();
    }
    
    if (projects.length === 0) {
      return '📁 No projects found. Make sure you have *-config.toml files in the configured scan paths.';
    }

    const lines = [`📁 Found ${projects.length} project${projects.length === 1 ? '' : 's'}:`, ''];
    
    for (const project of projects) {
      const info = await this.projectDiscovery.getProjectInfo(project.id);
      lines.push(`• **${project.id}** - ${project.project.name}`);
      if (project.project.description) {
        lines.push(`  Description: ${project.project.description}`);
      }
      lines.push(`  Path: ${project.project.path}`);
      lines.push(`  CRs: ${info?.crCount || 0}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private async handleGetProjectInfo(key: string): Promise<string> {
    const project = await this.validateProject(key);

    const info = await this.projectDiscovery.getProjectInfo(key);
    if (!info) {
      throw new Error(`Failed to get project info for '${key}'`);
    }

    const lines = [
      `📋 Project: **${info.key}** - ${info.name}`,
      '',
      '**Details:**',
      `- Key: ${info.key}`,
      `- Description: ${info.description || 'No description'}`,
      `- Path: ${info.path}`,
      `- Total CRs: ${info.crCount}`,
      `- Last Accessed: ${info.lastAccessed}`,
      '',
      '**Configuration:**',
      `- Start Number: ${project.project.startNumber}`,
      `- Counter File: ${project.project.counterFile}`,
    ];

    if (project.project.repository) {
      lines.push(`- Repository: ${project.project.repository}`);
    }

    return lines.join('\n');
  }

  private async handleListCRs(projectKey: string, filters?: TicketFilters): Promise<string> {
    const project = await this.validateProject(projectKey);

    const crs = await this.crService.listCRs(project, filters);
    
    if (crs.length === 0) {
      if (filters) {
        return `🎫 No CRs found matching the specified filters in project ${projectKey}.`;
      }
      return `🎫 No CRs found in project ${projectKey}.`;
    }

    const lines = [`🎫 Found ${crs.length} CR${crs.length === 1 ? '' : 's'}${filters ? ' matching filters' : ''}:`, ''];

    for (const ticket of crs) {
      lines.push(`**${ticket.code}** - ${ticket.title}`);
      lines.push(`- Status: ${ticket.status}`);
      lines.push(`- Type: ${ticket.type}`);
      lines.push(`- Priority: ${ticket.priority}`);
      lines.push(`- Created: ${ticket.dateCreated ? ticket.dateCreated.toISOString().split('T')[0] : 'N/A'}`);
      if (ticket.phaseEpic) {
        lines.push(`- Phase: ${ticket.phaseEpic}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

      
  private async handleGetCRConsolidated(projectKey: string, key: string, mode: string = 'full'): Promise<string> {
    const project = await this.validateProject(projectKey);

    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw new Error(`CR '${key}' not found in project '${projectKey}'`);
    }

    switch (mode) {
      case 'full':
        // Return just the plain ticket content
        return ticket.content || '';

      case 'attributes': {
        // Extract YAML frontmatter and return attributes
        const fs = await import('fs/promises');
        try {
          const fileContent = await fs.readFile(ticket.filePath, 'utf-8');

          // Extract YAML frontmatter
          const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/);
          if (!frontmatterMatch) {
            throw new Error(`Invalid CR file format for ${key}: No YAML frontmatter found`);
          }

          const yamlContent = frontmatterMatch[1];

          // Parse YAML with simple parser
          let yaml: any = {};
          try {
            yaml = this.parseYamlFrontmatter(yamlContent) || {};
          } catch (yamlError) {
            throw new Error(`Failed to parse YAML frontmatter for ${key}: ${(yamlError as Error).message}`);
          }

          // Build attributes object with common fields
          const attributes: any = {
            code: yaml.code || key,
            title: yaml.title || 'Untitled',
            status: yaml.status || 'Unknown',
            type: yaml.type || 'Unknown',
            priority: yaml.priority || 'Medium'
          };

          // Add optional fields if present
          const optionalFields = [
            'dateCreated', 'lastModified', 'phaseEpic', 'assignee',
            'dependsOn', 'blocks', 'relatedTickets', 'impactAreas',
            'description', 'rationale' // Common custom fields
          ];

          for (const field of optionalFields) {
            if (yaml[field] !== undefined) {
              attributes[field] = yaml[field];
            }
          }

          // Include any additional custom fields not in the standard set
          const standardFields = new Set([
            'code', 'title', 'status', 'type', 'priority', 'dateCreated',
            'lastModified', 'phaseEpic', 'assignee', 'dependsOn', 'blocks',
            'relatedTickets', 'impactAreas', 'description', 'rationale'
          ]);

          for (const [field, value] of Object.entries(yaml)) {
            if (!standardFields.has(field)) {
              attributes[field] = value;
            }
          }

          // Return formatted JSON output
          return JSON.stringify(attributes, null, 2);

        } catch (fileError) {
          throw new Error(`Failed to read CR file for ${key}: ${(fileError as Error).message}`);
        }
      }

      case 'metadata':
        // Return just the key metadata without full YAML parsing
        const metadata = {
          code: ticket.code,
          title: ticket.title,
          status: ticket.status,
          type: ticket.type,
          priority: ticket.priority,
          dateCreated: ticket.dateCreated?.toISOString(),
          lastModified: ticket.lastModified?.toISOString(),
          phaseEpic: ticket.phaseEpic,
          filePath: ticket.filePath
        };

        return JSON.stringify(metadata, null, 2);

      default:
        throw new Error(`Invalid mode '${mode}'. Must be: full, attributes, or metadata`);
    }
  }

  private async handleCreateCR(projectKey: string, type: string, data: TicketData): Promise<string> {
    const project = await this.validateProject(projectKey);

    // Validate data first
    const validation = this.templateService.validateTicketData(data, type);
    if (!validation.valid) {
      const errors = validation.errors.map(e => `- ❌ ${e.field}: ${e.message}`).join('\n');
      throw new Error(`CR data validation failed:\n${errors}`);
    }

    // Process content if provided
    let processedData = { ...data };
    let contentProcessingResult: any = null;

    if (data.content) {
      contentProcessingResult = SimpleContentProcessor.processContent(data.content, {
        operation: 'replace',
        maxLength: 1000000 // 1MB limit for full CR content
      });

      // Check for content processing errors (SimpleContentProcessor throws exceptions directly)
      // No need to check .errors field as SimpleContentProcessor throws on errors

      // Show warnings if any
      if (contentProcessingResult.warnings.length > 0) {
        console.warn(`Content processing warnings for new CR:`, contentProcessingResult.warnings);
      }

      // Use processed content
      processedData.content = contentProcessingResult.content;
    }

    const ticket = await this.crService.createCR(project, type, processedData);

    const lines = [
      `✅ **Created CR ${ticket.code}**: ${ticket.title}`,
      '',
      '**Details:**',
      `- Key: ${ticket.code}`,
      `- Status: ${ticket.status}`,
      `- Type: ${ticket.type}`,
      `- Priority: ${ticket.priority}`,
    ];

    if (ticket.phaseEpic) lines.push(`- Phase: ${ticket.phaseEpic}`);
    lines.push(`- Created: ${ticket.dateCreated ? ticket.dateCreated.toISOString() : 'N/A'}`);
    lines.push('');
    lines.push(`**File Created:** ${ticket.filePath}`);

    // Add processing information if content was provided and processed
    if (data.content && processedData.content !== data.content) {
      lines.push('');
      lines.push('**Content Processing:**');
      lines.push('- Applied content sanitization and formatting');
      if (contentProcessingResult.warnings.length > 0) {
        lines.push(`- ${contentProcessingResult.warnings.length} warning(s) logged to console`);
      }
    }

    if (!data.content) {
      lines.push('');
      lines.push('The CR has been created with a complete template including:');
      lines.push('- Problem statement and description');
      if (data.impactAreas) {
        lines.push(`- Impact areas (${data.impactAreas.join(', ')})`);
      }
      lines.push('- Standard CR sections ready for completion');
      lines.push('- YAML frontmatter with all metadata');
      lines.push('');
      lines.push('Next step: Update the CR with detailed implementation specifications.');
    }

    return lines.join('\n');
  }

  private async handleUpdateCRStatus(projectKey: string, key: string, status: CRStatus): Promise<string> {
    const project = await this.validateProject(projectKey);

    // Get current CR to show old status
    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw new Error(`CR '${key}' not found in project '${projectKey}'`);
    }

    const oldStatus = ticket.status;

    // The service now throws specific errors instead of returning false
    await this.crService.updateCRStatus(project, key, status);

    const lines = [
      `✅ **Updated CR ${key}** status`,
      '',
      `**Change:** ${oldStatus} → ${status}`,
      `- Title: ${ticket.title}`,
      `- Updated: ${new Date().toISOString()}`,
      '- File: Updated YAML frontmatter and lastModified timestamp'
    ];

    if (status === 'Approved') {
      lines.push('', 'The CR is now approved and ready for implementation.');
    } else if (status === 'Implemented') {
      lines.push('', 'The CR has been marked as implemented.');
      if (ticket.type === 'Bug Fix') {
        lines.push('Consider deleting this bug fix CR after verification period.');
      }
    }

    return lines.join('\n');
  }

  private async handleUpdateCRAttrs(projectKey: string, key: string, attributes: any): Promise<string> {
    const project = await this.validateProject(projectKey);

    // Get current CR info
    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw new Error(`CR '${key}' not found in project '${projectKey}'`);
    }

    const success = await this.crService.updateCRAttrs(project, key, attributes);
    if (!success) {
      throw new Error(`Failed to update CR '${key}' attributes`);
    }

    const lines = [
      `✅ **Updated CR ${key} Attributes**`,
      '',
      `- Title: ${ticket.title}`,
      `- Status: ${ticket.status}`,
      '',
      '**Updated Fields:**'
    ];

    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        lines.push(`- ${field}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  private async handleDeleteCR(projectKey: string, key: string): Promise<string> {
    const project = await this.validateProject(projectKey);

    // Get CR info before deletion
    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw new Error(`CR '${key}' not found in project '${projectKey}'`);
    }

    const success = await this.crService.deleteCR(project, key);
    if (!success) {
      throw new Error(`Failed to delete CR '${key}'`);
    }

    const lines = [
      `🗑️ **Deleted CR ${key}**`,
      '',
      `- Title: ${ticket.title}`,
      `- Type: ${ticket.type}`,
      `- Status: ${ticket.status}`
    ];

    if (ticket.type === 'Bug Fix') {
      lines.push('', 'The bug fix CR has been deleted as it was implemented and verified. Bug CRs are typically removed after successful implementation to reduce clutter, as documented in the CR lifecycle.');
    }

    return lines.join('\n');
  }

  
  
  
  private async handleManageCRSections(projectKey: string, key: string, operation: string, section?: string, updateMode?: string, content?: string): Promise<string> {
    const project = await this.validateProject(projectKey);

    switch (operation) {
      case 'list': {
        // List all sections in the CR
        const ticket = await this.crService.getCR(project, key);
        if (!ticket) {
          throw new Error(`CR '${key}' not found in project '${projectKey}'`);
        }

        // Read file content
        const fs = await import('fs/promises');
        const fileContent = await fs.readFile(ticket.filePath, 'utf-8');

        // Extract markdown body (after YAML frontmatter)
        const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
          throw new Error(`Invalid CR file format for ${key}: No YAML frontmatter found`);
        }

        const markdownBody = frontmatterMatch[2];

        // Get all sections
        const allSections = MarkdownSectionService.findSection(markdownBody, '');

        if (allSections.length === 0) {
          return [
            `📑 **Sections in CR ${key}**`,
            '',
            `- Title: ${ticket.title}`,
            '',
            '*(No sections found - document may be empty or improperly formatted)*'
          ].join('\n');
        }

        const lines = [
          `📑 **Sections in CR ${key}** - ${ticket.title}`,
          '',
          `Found ${allSections.length} section${allSections.length === 1 ? '' : 's'}:`,
          ''
        ];

        // Build tree structure based on header levels
        for (const section of allSections) {
          // Calculate indentation based on header level (# = 0, ## = 1, ### = 2, etc.)
          const indent = '  '.repeat(Math.max(0, section.headerLevel - 1));

          const contentPreview = section.content.trim() ?
            ` (${section.content.length} chars)` :
            ' (empty)';

          lines.push(`${indent}- ${section.headerText}${contentPreview}`);
        }

        lines.push('');
        lines.push('**Usage:**');
        lines.push('To read or update a section, use the **exact header text** shown above (with # symbols).');
        lines.push('');
        lines.push('**Examples:**');
        lines.push('- `section: "## 1. Feature Description"` - reads/updates that section');
        lines.push('- `section: "### Key Features"` - reads/updates the subsection');

        return lines.join('\n');
      }

      case 'get': {
        if (!section) {
          throw new Error(`Section parameter is required for 'get' operation`);
        }

        // Get CR
        const ticket = await this.crService.getCR(project, key);
        if (!ticket) {
          throw new Error(`CR '${key}' not found in project '${projectKey}'`);
        }

        // Read file content
        const fs = await import('fs/promises');
        const fileContent = await fs.readFile(ticket.filePath, 'utf-8');

        // Extract markdown body (after YAML frontmatter)
        const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
          throw new Error(`Invalid CR file format for ${key}: No YAML frontmatter found`);
        }

        const markdownBody = frontmatterMatch[2];

        // Find section
        const matches = MarkdownSectionService.findSection(markdownBody, section);

        if (matches.length === 0) {
          throw new Error(`Section "${section}" not found in CR ${key}. Use manage_cr_sections with operation="list" to see available sections.`);
        }

        if (matches.length > 1) {
          const paths = matches.map(m => m.hierarchicalPath).join('\n  - ');
          throw new Error(
            `Multiple sections match "${section}". Please use a hierarchical path:\n  - ${paths}`
          );
        }

        const matchedSection = matches[0];

        return [
          `📖 **Section Content from CR ${key}**`,
          '',
          `**Section:** ${matchedSection.hierarchicalPath}`,
          `**Content Length:** ${matchedSection.content.length} characters`,
          '',
          '---',
          '',
          matchedSection.content,
          '',
          '---',
          '',
          `Use \`manage_cr_sections\` with operation="update" to modify this section.`
        ].join('\n');
      }

      case 'update': {
        if (!section) {
          throw new Error(`Section parameter is required for 'update' operation`);
        }
        if (!updateMode) {
          throw new Error(`UpdateMode parameter is required for 'update' operation`);
        }
        if (!content) {
          throw new Error(`Content parameter is required for 'update' operation`);
        }

        // Get CR
        const ticket = await this.crService.getCR(project, key);
        if (!ticket) {
          throw new Error(`CR '${key}' not found in project '${projectKey}'`);
        }

        // Read file content
        const fs = await import('fs/promises');
        const fileContent = await fs.readFile(ticket.filePath, 'utf-8');

        // Extract markdown body (after YAML frontmatter)
        const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
          throw new Error(`Invalid CR file format for ${key}: No YAML frontmatter found`);
        }

        const yamlFrontmatter = frontmatterMatch[1];
        const markdownBody = frontmatterMatch[2];

        // Simple section validation
        const availableSections = SimpleSectionValidator.extractSections(markdownBody);
        const sectionValidation = SimpleSectionValidator.validateSection(section, availableSections);

        if (!sectionValidation.valid) {
          const errorMessage = [
            `❌ **Section validation failed**`,
            '',
            `**Errors:**`,
            ...sectionValidation.errors.map(error => `- ${error}`),
            ''
          ];

          if (sectionValidation.suggestions.length > 0) {
            errorMessage.push('**Suggestions:**');
            errorMessage.push(...sectionValidation.suggestions.map(suggestion => `- ${suggestion}`));
            errorMessage.push('');
          }

          errorMessage.push(`Use \`manage_cr_sections\` with operation="list" to see all available sections in CR ${key}.`);
          throw new Error(errorMessage.join('\n'));
        }

        // Find section using normalized identifier
        const matches = MarkdownSectionService.findSection(markdownBody, sectionValidation.normalized || section);

        if (matches.length === 0) {
          // Section not found - list available sections
          const sectionList = availableSections
            .map(s => `  - "${s}"`)
            .join('\n');

          throw new Error(
            `Section '${section}' not found in CR ${key}.\n\n` +
            `Available sections:\n${sectionList || '  (none)'}`
          );
        }

        if (matches.length > 1) {
          // Multiple matches - require hierarchical path
          const paths = matches.map(m => `  - "${m.hierarchicalPath}"`).join('\n');
          throw new Error(
            `Multiple sections found matching '${section}'.\n\n` +
            `Please specify which one using hierarchical path:\n${paths}`
          );
        }

        // Process content with simple sanitization
        const contentProcessingResult = SimpleContentProcessor.processContent(content, {
          operation: updateMode as 'replace' | 'append' | 'prepend',
          maxLength: 500000 // 500KB limit for section content
        });

        // Show warnings if any
        if (contentProcessingResult.warnings.length > 0) {
          console.warn(`Content processing warnings for ${key}:`, contentProcessingResult.warnings);
        }

        // Use processed content
        const processedContent = contentProcessingResult.content;

        // Single match - proceed with update
        const matchedSection = matches[0];
        let updatedBody: string;

        switch (updateMode) {
          case 'replace':
            updatedBody = MarkdownSectionService.replaceSection(markdownBody, matchedSection, processedContent);
            break;
          case 'append':
            updatedBody = MarkdownSectionService.appendToSection(markdownBody, matchedSection, processedContent);
            break;
          case 'prepend':
            updatedBody = MarkdownSectionService.prependToSection(markdownBody, matchedSection, processedContent);
            break;
          default:
            throw new Error(`Invalid updateMode '${updateMode}'. Must be: replace, append, or prepend`);
        }

        // Update lastModified in YAML
        const now = new Date().toISOString();
        const updatedYaml = yamlFrontmatter.replace(
          /lastModified:.*$/m,
          `lastModified: ${now}`
        );

        // Reconstruct full document
        const updatedContent = `---\n${updatedYaml}\n---\n${updatedBody}`;

        // Write back to file
        await fs.writeFile(ticket.filePath, updatedContent, 'utf-8');

        const lines = [
          `✅ **Updated Section in CR ${key}**`,
          '',
          `**Section:** ${matchedSection.hierarchicalPath}`,
          `**Operation:** ${updateMode}`,
          `**Content Length:** ${processedContent.length} characters`,
          '',
          `- Title: ${ticket.title}`,
          `- Updated: ${now}`,
          `- File: ${ticket.filePath}`
        ];

        // Add processing information
        if (contentProcessingResult.modified) {
          lines.push('');
          lines.push('**Content Processing:**');
          if (contentProcessingResult.warnings.length > 0) {
            lines.push('- Applied content sanitization and formatting');
            lines.push(`- ${contentProcessingResult.warnings.length} warning(s) logged to console`);
          } else {
            lines.push('- Content processed successfully');
          }
        }

        // Add helpful message based on operation
        if (updateMode === 'replace') {
          lines.push('', `The section content has been completely replaced.`);
        } else if (updateMode === 'append') {
          lines.push('', `Content has been added to the end of the section.`);
        } else if (updateMode === 'prepend') {
          lines.push('', `Content has been added to the beginning of the section.`);
        }

        return lines.join('\n');
      }

      default:
        throw new Error(`Invalid operation '${operation}'. Must be: list, get, or update`);
    }
  }

  
  
  
  
  private async handleSuggestCRImprovements(projectKey: string, key: string): Promise<string> {
    const project = await this.validateProject(projectKey);

    const ticket = await this.crService.getCR(project, key);
    if (!ticket) {
      throw new Error(`CR '${key}' not found in project '${projectKey}'`);
    }

    const suggestions = this.templateService.suggestImprovements(ticket);

    return [
      `💡 **CR Improvement Suggestions for ${key}**`,
      '',
      `**Current CR:** ${ticket.title}`,
      '',
      ...suggestions.map((suggestion, index) => {
        const priority = index < 3 ? 'High-Priority' : index < 6 ? 'Medium-Priority' : 'Low-Priority';
        return [
          `**${priority} Improvement:**`,
          '',
          `${index + 1}. **${suggestion.title}**`,
          `   ${suggestion.description}`,
          `   *Actionable:* ${suggestion.actionable ? 'Yes' : 'No'}`,
          ''
        ].join('\n');
      })
    ].join('\n');
  }

  
  /**
   * Simple YAML frontmatter parser for extracting CR attributes
   */
  private parseYamlFrontmatter(yamlContent: string): Record<string, any> | null {
    try {
      const result: Record<string, any> = {};
      const lines = yamlContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;

        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Handle arrays (comma-separated values)
        if (value.includes(',') && !value.startsWith('"') && !value.startsWith("'")) {
          const arrayValue = value.split(',').map(v => v.trim()).filter(v => v);
          result[key] = arrayValue;
        } else {
          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      return null;
    }
  }
}