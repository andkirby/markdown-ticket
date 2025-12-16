import { MCPClient } from '../mcp-client';
import { TicketCreator, TicketData, TicketResult, ValidationResult, ValidationError, ValidationWarning } from '../types/project-factory-types';

export class McpTicketCreator implements TicketCreator {
  constructor(private readonly mcpClient: MCPClient) {}

  async create(projectCode: string, data: TicketData): Promise<TicketResult> {
    const startTime = Date.now();
    const attempts = 1;

    try {
      const response = await this.mcpClient.callTool('create_cr', {
        project: projectCode,
        type: data.type,
        data: {
          title: data.title,
          status: data.status || 'Proposed',
          priority: data.priority || 'Medium',
          phaseEpic: data.phaseEpic,
          dependsOn: data.dependsOn?.join(', '),
          blocks: data.blocks?.join(', '),
          assignee: data.assignee,
          content: data.content,
          ...data.attributes
        }
      });

      return {
        success: response.success,
        ticketId: this.extractTicketId(response),
        ticket: response.success ? data : undefined,
        error: response.error ? { code: `MCP_${response.error.code}`, message: response.error.message } : undefined,
        metadata: { creator: 'mcp', duration: Date.now() - startTime, attempts, warnings: response.success ? [] : ['MCP creation failed'] }
      };
    } catch (error) {
      return {
        success: false,
        error: { code: 'MCP_ERROR', message: error instanceof Error ? error.message : String(error), details: error },
        metadata: { creator: 'mcp', duration: Date.now() - startTime, attempts }
      };
    }
  }

  validate(data: TicketData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data.title?.trim()) errors.push({ code: 'MISSING_TITLE', message: 'Title is required', field: 'title' });
    if (!data.type?.trim()) errors.push({ code: 'MISSING_TYPE', message: 'Type is required', field: 'type' });
    if (!data.content?.trim()) errors.push({ code: 'MISSING_CONTENT', message: 'Content is required', field: 'content' });
    if (data.title?.length > 100) warnings.push({ code: 'LONG_TITLE', message: 'Title longer than 100 characters', field: 'title' });

    return { valid: errors.length === 0, errors, warnings };
  }

  getType(): string {
    return 'mcp';
  }

  private extractTicketId(response: any): string | undefined {
    if (!response.success || !response.data) return undefined;
    const titleMatch = response.data.match(/✅ \*\*Created CR (.+?)\*\*:/);
    return titleMatch?.[1] || response.data.match(/- Key: (.+)$/m)?.[1];
  }
}