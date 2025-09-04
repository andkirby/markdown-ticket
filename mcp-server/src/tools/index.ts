import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ProjectDiscoveryService } from '../services/projectDiscovery.js';
import { CRService } from '../services/crService.js';
import { TemplateService } from '../services/templateService.js';
import { CRFilters, CRData, CRType, CRStatus } from '../types/index.js';

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
        description: 'List all discovered projects with their basic information',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_project_info',
        description: 'Get detailed information about a specific project',
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
        description: 'List CRs for a project with optional filtering',
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
                  description: 'Filter by status (single value or array)'
                },
                type: {
                  oneOf: [
                    { type: 'string', enum: ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'] },
                    { type: 'array', items: { type: 'string', enum: ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'] } }
                  ],
                  description: 'Filter by type (single value or array)'
                },
                priority: {
                  oneOf: [
                    { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
                    { type: 'array', items: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] } }
                  ],
                  description: 'Filter by priority (single value or array)'
                }
              }
            }
          },
          required: ['project']
        }
      },
      {
        name: 'get_cr',
        description: 'Get detailed information about a specific CR',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            crKey: {
              type: 'string',
              description: 'CR key (e.g., MDT-004, API-123)'
            }
          },
          required: ['project', 'crKey']
        }
      },
      {
        name: 'create_cr',
        description: 'Create a new CR in the specified project',
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
              description: 'Type of CR to create'
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
                  description: 'CR priority (defaults to Medium)'
                },
                phaseEpic: {
                  type: 'string',
                  description: 'Phase or epic this CR belongs to'
                },
                description: {
                  type: 'string',
                  description: 'Problem statement or description'
                },
                rationale: {
                  type: 'string',
                  description: 'Rationale for this CR'
                },
                impactAreas: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Areas of the system that will be impacted'
                },
                content: {
                  type: 'string',
                  description: 'Full markdown content (overrides template if provided)'
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
        description: 'Update the status of an existing CR',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            crKey: {
              type: 'string',
              description: 'CR key'
            },
            status: {
              type: 'string',
              enum: ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected'],
              description: 'New status for the CR'
            }
          },
          required: ['project', 'crKey', 'status']
        }
      },
      {
        name: 'delete_cr',
        description: 'Delete a CR (typically used for implemented bug fixes)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            crKey: {
              type: 'string',
              description: 'CR key'
            }
          },
          required: ['project', 'crKey']
        }
      },

      // Template System
      {
        name: 'get_cr_template',
        description: 'Get the template structure for a specific CR type',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'],
              description: 'CR type to get template for'
            }
          },
          required: ['type']
        }
      },
      {
        name: 'validate_cr_data',
        description: 'Validate CR data before creation',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            data: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                type: { type: 'string' },
                priority: { type: 'string' },
                description: { type: 'string' }
              },
              required: ['title', 'type']
            }
          },
          required: ['project', 'data']
        }
      },
      {
        name: 'get_next_cr_number',
        description: 'Get the next available CR number for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            }
          },
          required: ['project']
        }
      },

      // Advanced Operations
      {
        name: 'find_related_crs',
        description: 'Find CRs related to given keywords',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords to search for'
            }
          },
          required: ['project', 'keywords']
        }
      },
      {
        name: 'suggest_cr_improvements',
        description: 'Get suggestions for improving an existing CR',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key'
            },
            crKey: {
              type: 'string',
              description: 'CR key to analyze'
            }
          },
          required: ['project', 'crKey']
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
        
        case 'get_cr':
          return await this.handleGetCR(args.project, args.crKey);
        
        case 'create_cr':
          return await this.handleCreateCR(args.project, args.type, args.data);
        
        case 'update_cr_status':
          return await this.handleUpdateCRStatus(args.project, args.crKey, args.status);
        
        case 'delete_cr':
          return await this.handleDeleteCR(args.project, args.crKey);
        
        case 'get_cr_template':
          return await this.handleGetCRTemplate(args.type);
        
        case 'validate_cr_data':
          return await this.handleValidateCRData(args.project, args.data);
        
        case 'get_next_cr_number':
          return await this.handleGetNextCRNumber(args.project);
        
        case 'find_related_crs':
          return await this.handleFindRelatedCRs(args.project, args.keywords);
        
        case 'suggest_cr_improvements':
          return await this.handleSuggestCRImprovements(args.project, args.crKey);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error handling tool ${name}:`, error);
      throw error;
    }
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
    const project = this.projectDiscovery.getProject(key);
    if (!project) {
      const projects = await this.projectDiscovery.discoverProjects();
      const availableKeys = projects.map(p => p.id).join(', ');
      throw new Error(`Project '${key}' not found. Available projects: ${availableKeys}`);
    }

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

  private async handleListCRs(projectKey: string, filters?: CRFilters): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    const crs = await this.crService.listCRs(project, filters);
    
    if (crs.length === 0) {
      if (filters) {
        return `🎫 No CRs found matching the specified filters in project ${projectKey}.`;
      }
      return `🎫 No CRs found in project ${projectKey}.`;
    }

    const lines = [`🎫 Found ${crs.length} CR${crs.length === 1 ? '' : 's'}${filters ? ' matching filters' : ''}:`, ''];

    for (const cr of crs) {
      lines.push(`**${cr.key}** - ${cr.title}`);
      lines.push(`- Status: ${cr.status}`);
      lines.push(`- Type: ${cr.type}`);
      lines.push(`- Priority: ${cr.priority}`);
      lines.push(`- Created: ${cr.dateCreated.toISOString().split('T')[0]}`);
      if (cr.phaseEpic) {
        lines.push(`- Phase: ${cr.phaseEpic}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private async handleGetCR(projectKey: string, crKey: string): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    const cr = await this.crService.getCR(project, crKey);
    if (!cr) {
      throw new Error(`CR '${crKey}' not found in project '${projectKey}'`);
    }

    const lines = [
      `📄 **${cr.key}** - ${cr.title}`,
      '',
      '**Metadata:**',
      `- Status: ${cr.status}`,
      `- Type: ${cr.type}`,
      `- Priority: ${cr.priority}`,
      `- Created: ${cr.dateCreated.toISOString()}`,
      `- Modified: ${cr.lastModified.toISOString()}`,
    ];

    if (cr.phaseEpic) lines.push(`- Phase: ${cr.phaseEpic}`);
    if (cr.source) lines.push(`- Source: ${cr.source}`);
    if (cr.impact) lines.push(`- Impact: ${cr.impact}`);
    if (cr.effort) lines.push(`- Effort: ${cr.effort}`);

    if (cr.content) {
      lines.push('', '**Content:**', cr.content.substring(0, 500) + (cr.content.length > 500 ? '...' : ''));
    }

    lines.push('', `**File:** ${cr.filePath}`);

    return lines.join('\n');
  }

  private async handleCreateCR(projectKey: string, type: CRType, data: CRData): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    // Validate data first
    const validation = this.templateService.validateCRData(data, type);
    if (!validation.valid) {
      const errors = validation.errors.map(e => `- ❌ ${e.field}: ${e.message}`).join('\n');
      throw new Error(`CR data validation failed:\n${errors}`);
    }

    const cr = await this.crService.createCR(project, type, data);

    const lines = [
      `✅ **Created CR ${cr.key}**: ${cr.title}`,
      '',
      '**Details:**',
      `- Key: ${cr.key}`,
      `- Status: ${cr.status}`,
      `- Type: ${cr.type}`,
      `- Priority: ${cr.priority}`,
    ];

    if (cr.phaseEpic) lines.push(`- Phase: ${cr.phaseEpic}`);
    lines.push(`- Created: ${cr.dateCreated.toISOString()}`);
    lines.push('');
    lines.push(`**File Created:** ${cr.filePath}`);

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

  private async handleUpdateCRStatus(projectKey: string, crKey: string, status: CRStatus): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    // Get current CR to show old status
    const cr = await this.crService.getCR(project, crKey);
    if (!cr) {
      throw new Error(`CR '${crKey}' not found in project '${projectKey}'`);
    }

    const oldStatus = cr.status;
    const success = await this.crService.updateCRStatus(project, crKey, status);

    if (!success) {
      throw new Error(`Failed to update CR '${crKey}' status`);
    }

    const lines = [
      `✅ **Updated CR ${crKey}** status`,
      '',
      `**Change:** ${oldStatus} → ${status}`,
      `- Title: ${cr.title}`,
      `- Updated: ${new Date().toISOString()}`,
      '- File: Updated YAML frontmatter and lastModified timestamp'
    ];

    if (status === 'Approved') {
      lines.push('', 'The CR is now approved and ready for implementation.');
    } else if (status === 'Implemented') {
      lines.push('', 'The CR has been marked as implemented.');
      if (cr.type === 'Bug Fix') {
        lines.push('Consider deleting this bug fix CR after verification period.');
      }
    }

    return lines.join('\n');
  }

  private async handleDeleteCR(projectKey: string, crKey: string): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    // Get CR info before deletion
    const cr = await this.crService.getCR(project, crKey);
    if (!cr) {
      throw new Error(`CR '${crKey}' not found in project '${projectKey}'`);
    }

    const success = await this.crService.deleteCR(project, crKey);
    if (!success) {
      throw new Error(`Failed to delete CR '${crKey}'`);
    }

    const lines = [
      `🗑️ **Deleted CR ${crKey}**`,
      '',
      `- Title: ${cr.title}`,
      `- Type: ${cr.type}`,
      `- Status: ${cr.status}`
    ];

    if (cr.type === 'Bug Fix') {
      lines.push('', 'The bug fix CR has been deleted as it was implemented and verified. Bug CRs are typically removed after successful implementation to reduce clutter, as documented in the CR lifecycle.');
    }

    return lines.join('\n');
  }

  private async handleGetCRTemplate(type: CRType): Promise<string> {
    const template = this.templateService.getTemplate(type);
    
    return [
      `📋 **${type} CR Template**`,
      '',
      '**Required Fields:**',
      ...template.requiredFields.map(field => `- ${field}`),
      '',
      '**Template Structure:**',
      '```markdown',
      template.template,
      '```'
    ].join('\n');
  }

  private async handleValidateCRData(projectKey: string, data: any): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    const validation = this.templateService.validateCRData(data, data.type);
    
    const lines = [
      '✅ **CR Data Validation Results**',
      '',
      `**Status:** ${validation.valid ? 'Valid ✅' : 'Invalid ❌'}`,
      ''
    ];

    if (validation.valid) {
      lines.push('**Validation Details:**');
      lines.push('- ✅ Title: Present and descriptive');
      lines.push(`- ✅ Type: Valid ${data.type} type`);
      if (data.priority) lines.push(`- ✅ Priority: Valid ${data.priority} priority`);
      if (data.description) lines.push('- ✅ Description: Present with problem context');
    } else {
      lines.push('**Errors:**');
      validation.errors.forEach(error => {
        lines.push(`- ❌ ${error.field}: ${error.message}`);
      });
    }

    if (validation.warnings.length > 0) {
      lines.push('', '**Warnings:**');
      validation.warnings.forEach(warning => {
        lines.push(`- ⚠️ ${warning.field}: ${warning.message}`);
      });
    }

    if (validation.valid) {
      lines.push('', '**Next Steps:**');
      lines.push('1. Add any additional details based on warnings above');
      lines.push('2. Create the CR using create_cr tool');
      if (data.type === 'Bug Fix') {
        lines.push('3. Investigate root cause for proper analysis section');
      }
    } else {
      lines.push('', '**Fix Required:** Please correct the errors above before creating the CR.');
    }

    return lines.join('\n');
  }

  private async handleGetNextCRNumber(projectKey: string): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    const nextNumber = await this.crService.getNextCRNumber(project);
    const nextKey = `${project.project.code}-${String(nextNumber).padStart(3, '0')}`;

    return [
      `🔢 **Next CR Number for ${projectKey} Project**`,
      '',
      `**Next Available:** ${nextKey}`,
      '',
      '**Details:**',
      `- Project Code: ${project.project.code}`,
      `- Current Counter: ${nextNumber}`,
      `- Counter File: ${project.project.counterFile}`,
      `- Start Number: ${project.project.startNumber}`,
      `- Format: ${project.project.code}-XXX (3-digit zero-padded)`,
      '',
      `The next CR created will automatically use ${nextKey}.`
    ].join('\n');
  }

  private async handleFindRelatedCRs(projectKey: string, keywords: string[]): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    const allCRs = await this.crService.listCRs(project);
    const related = this.findRelatedCRs(allCRs, keywords);

    const lines = [
      `🔍 **Related CRs Found**`,
      '',
      `Searched for: ${keywords.join(', ')}`,
      ''
    ];

    if (related.length === 0) {
      lines.push('No related CRs found with the specified keywords.');
      return lines.join('\n');
    }

    lines.push(`**Results (${related.length}):**`, '');

    related.forEach(({ cr, score, matchedKeywords }) => {
      lines.push(`**${cr.key}** - ${cr.title}`);
      lines.push(`- Status: ${cr.status}`);
      lines.push(`- Type: ${cr.type}`);
      lines.push(`- Keywords: ${matchedKeywords.join(', ')}`);
      lines.push(`- Relevance: ${Math.round(score * 100)}%`);
      lines.push('');
    });

    return lines.join('\n');
  }

  private async handleSuggestCRImprovements(projectKey: string, crKey: string): Promise<string> {
    const project = this.projectDiscovery.getProject(projectKey);
    if (!project) {
      throw new Error(`Project '${projectKey}' not found`);
    }

    const cr = await this.crService.getCR(project, crKey);
    if (!cr) {
      throw new Error(`CR '${crKey}' not found in project '${projectKey}'`);
    }

    const suggestions = this.templateService.suggestImprovements(cr);

    return [
      `💡 **CR Improvement Suggestions for ${crKey}**`,
      '',
      `**Current CR:** ${cr.title}`,
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

  private findRelatedCRs(crs: any[], keywords: string[]): Array<{cr: any, score: number, matchedKeywords: string[]}> {
    const results: Array<{cr: any, score: number, matchedKeywords: string[]}> = [];

    for (const cr of crs) {
      const text = `${cr.title} ${cr.content}`.toLowerCase();
      const matchedKeywords: string[] = [];
      let score = 0;

      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        if (text.includes(keywordLower)) {
          matchedKeywords.push(keyword);
          
          // Title matches are worth more
          if (cr.title.toLowerCase().includes(keywordLower)) {
            score += 0.5;
          } else {
            score += 0.2;
          }
        }
      }

      if (matchedKeywords.length > 0) {
        results.push({
          cr,
          score: score / keywords.length, // Normalize by keyword count
          matchedKeywords
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10 results
  }
}