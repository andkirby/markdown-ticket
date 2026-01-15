/**
 * OpenAPI 3.0 Schema Definitions - Single source of truth for all API schemas
 * Route JSDoc annotations should use $ref: '#/components/schemas/{Name}'.
 */

// Enums
const CRStatusEnum = ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected', 'On Hold'] as const
const CRTypeEnum = ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'] as const
const CRPriorityEnum = ['Low', 'Medium', 'High', 'Critical'] as const

export const schemas = {
  CRStatus: {
    type: 'string',
    enum: CRStatusEnum,
    description: 'Change Request status',
    example: 'Proposed',
  },
  CRType: {
    type: 'string',
    enum: CRTypeEnum,
    description: 'Change Request type',
    example: 'Feature Enhancement',
  },
  CRPriority: {
    type: 'string',
    enum: CRPriorityEnum,
    description: 'Change Request priority level',
    example: 'Medium',
  },

  CR: {
    type: 'object',
    required: ['code', 'title', 'status', 'type', 'priority'],
    properties: {
      code: { type: 'string', description: 'Unique CR identifier', example: 'MDT-001', pattern: '^[A-Z]+-\\d{3,}$' },
      title: { type: 'string', description: 'CR title', example: 'Implement user authentication' },
      status: { $ref: '#/components/schemas/CRStatus' },
      type: { $ref: '#/components/schemas/CRType' },
      priority: { $ref: '#/components/schemas/CRPriority' },
      content: { type: 'string', description: 'Full markdown content of the CR' },
      phaseEpic: { type: 'string', description: 'Phase or epic this CR belongs to', example: 'Phase 1' },
      dependsOn: { type: 'string', description: 'Comma-separated CR codes this depends on', example: 'MDT-001, MDT-002' },
      blocks: { type: 'string', description: 'Comma-separated CR codes blocked by this', example: 'MDT-010' },
      assignee: { type: 'string', description: 'Person assigned to implement this CR', example: 'john.doe' },
      relatedTickets: { type: 'string', description: 'Comma-separated related CR codes', example: 'MDT-003' },
      impactAreas: { type: 'array', items: { type: 'string' }, description: 'System areas impacted', example: ['backend', 'api'] },
      implementationDate: { type: 'string', format: 'date', description: 'Date implementation completed (ISO 8601)', example: '2025-09-20' },
      implementationNotes: { type: 'string', description: 'Notes about the implementation' },
    },
  },

  CRInput: {
    type: 'object',
    required: ['title', 'type'],
    properties: {
      title: { type: 'string', description: 'CR title', example: 'Implement user authentication' },
      type: { $ref: '#/components/schemas/CRType' },
      priority: { $ref: '#/components/schemas/CRPriority' },
      content: { type: 'string', description: 'Full markdown content (template auto-generated if omitted)' },
      phaseEpic: { type: 'string' },
      dependsOn: { type: 'string' },
      blocks: { type: 'string' },
      assignee: { type: 'string' },
      relatedTickets: { type: 'string' },
      impactAreas: { type: 'array', items: { type: 'string' } },
    },
  },

  Project: {
    type: 'object',
    required: ['id', 'name', 'code', 'path', 'enabled'],
    properties: {
      id: { type: 'string', description: 'Unique project identifier', example: 'mdt' },
      name: { type: 'string', description: 'Project display name', example: 'Markdown Ticket' },
      code: { type: 'string', description: 'Project code used in CR identifiers', example: 'MDT' },
      path: { type: 'string', description: 'Absolute path to project directory', example: '/Users/dev/project' },
      enabled: { type: 'boolean', description: 'Whether the project is active', example: true },
      crPath: { type: 'string', description: 'Path to CR directory relative to project root', example: 'docs/CRs' },
      documentPaths: { type: 'array', items: { type: 'string' }, description: 'Paths for document discovery', example: ['docs'] },
      excludeFolders: { type: 'array', items: { type: 'string' }, description: 'Folders to exclude', example: ['node_modules'] },
    },
  },

  Document: {
    type: 'object',
    required: ['path', 'name'],
    properties: {
      path: { type: 'string', description: 'Relative path from project root', example: 'docs/architecture.md' },
      name: { type: 'string', description: 'Document filename', example: 'architecture.md' },
      content: { type: 'string', description: 'Document content (when requested)' },
    },
  },

  Error400: {
    type: 'object',
    required: ['error', 'message'],
    properties: {
      error: { type: 'string', example: 'Bad Request' },
      message: { type: 'string', example: 'Invalid request parameters' },
      details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
    },
  },

  Error404: {
    type: 'object',
    required: ['error', 'message'],
    properties: {
      error: { type: 'string', example: 'Not Found' },
      message: { type: 'string', example: 'Resource not found' },
    },
  },

  Error500: {
    type: 'object',
    required: ['error', 'message'],
    properties: {
      error: { type: 'string', example: 'Internal Server Error' },
      message: { type: 'string', example: 'An unexpected error occurred' },
    },
  },

  Error: {
    type: 'object',
    required: ['error', 'message'],
    properties: {
      error: { type: 'string', example: 'Error' },
      message: { type: 'string', example: 'An error occurred' },
    },
  },

  ProjectConfig: {
    type: 'object',
    description: 'Project configuration from .mdt-config.toml',
    properties: {
      project: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Markdown Ticket' },
          code: { type: 'string', example: 'MDT' },
          crPath: { type: 'string', example: 'docs/CRs' },
        },
      },
      documentPaths: { type: 'array', items: { type: 'string' }, example: ['docs'] },
      excludeFolders: { type: 'array', items: { type: 'string' }, example: ['node_modules'] },
    },
  },

  // DevTools schemas
  LogEntry: {
    type: 'object',
    properties: {
      timestamp: { type: 'integer', example: 1701234567890 },
      level: { type: 'string', enum: ['info', 'warn', 'error'], example: 'info' },
      message: { type: 'string', example: 'Server started on port 3001' },
    },
  },

  FrontendLogEntry: {
    type: 'object',
    properties: {
      timestamp: { type: 'integer', example: 1701234567890 },
      level: { type: 'string', example: 'info' },
      message: { type: 'string', example: 'Component mounted' },
      source: { type: 'string', example: 'console' },
      type: { type: 'string', example: 'log' },
      url: { type: 'string', example: 'http://localhost:5173/board' },
      line: { type: 'integer', example: 42 },
      column: { type: 'integer', example: 15 },
    },
  },

  FrontendSessionStatus: {
    type: 'object',
    properties: {
      active: { type: 'boolean', example: true },
      sessionStart: { type: 'integer', nullable: true, example: 1701234567890 },
      timeRemaining: { type: 'integer', nullable: true, example: 1800000 },
    },
  },

  FrontendLogsResponse: {
    type: 'object',
    properties: {
      logs: { type: 'array', items: { $ref: '#/components/schemas/FrontendLogEntry' } },
      total: { type: 'integer', example: 150 },
    },
  },

  DevModeStatus: {
    type: 'object',
    properties: {
      active: { type: 'boolean', example: true },
      sessionStart: { type: 'integer', nullable: true, example: 1701234567890 },
      timeRemaining: { type: 'integer', nullable: true, example: 3600000 },
      rateLimit: {
        type: 'object',
        properties: {
          limit: { type: 'integer', example: 300 },
          current: { type: 'integer', example: 42 },
          resetTime: { type: 'integer', example: 1701234627890 },
        },
      },
    },
  },

  DevModeLogResponse: {
    type: 'object',
    properties: {
      received: { type: 'integer', example: 5 },
      rateLimit: {
        type: 'object',
        properties: {
          remaining: { type: 'integer', example: 258 },
          resetTime: { type: 'integer', example: 1701234627890 },
        },
      },
    },
  },

  DevModeLogsResponse: {
    type: 'object',
    properties: {
      logs: { type: 'array', items: { $ref: '#/components/schemas/FrontendLogEntry' } },
      total: { type: 'integer', example: 150 },
      devMode: { type: 'boolean', example: true },
      timeRemaining: { type: 'integer', nullable: true, example: 3600000 },
    },
  },
}

// Common Parameters for reuse in route definitions
export const parameters = {
  projectId: {
    name: 'projectId',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: 'Project identifier',
    example: 'mdt',
  },
  crId: {
    name: 'crId',
    in: 'path',
    required: true,
    schema: { type: 'string', pattern: '^[A-Z]+-\\d{3,}$' },
    description: 'CR identifier',
    example: 'MDT-001',
  },
  projectCode: {
    name: 'code',
    in: 'path',
    required: true,
    schema: { type: 'string', pattern: '^[A-Z]+$' },
    description: 'Project code',
    example: 'MDT',
  },
}

// Export enums for TypeScript usage
