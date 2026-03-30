/**
 * OpenAPI 3.0 Schema Definitions - Single source of truth for all API schemas
 * Route JSDoc annotations should use $ref: '#/components/schemas/{Name}'.
 */

import type { TicketUpdateAttrs } from '@mdt/domain-contracts'
import {
  CR_CODE_PATTERN,
  CreateTicketInputSchema,
  CRPrioritySchema,
  CRStatusSchema,
  CRTypeSchema,
  LocalProjectConfigSchema,
  ProjectSchema,
  SubDocumentSchema,
  TICKET_UPDATE_ATTRS,
  TicketSchema,
  UpdateTicketInputSchema,
} from '@mdt/domain-contracts'

/**
 * CR code pattern for OpenAPI schemas (string format)
 * Converted from domain-contracts CR_CODE_PATTERN regex
 */
const CR_CODE_PATTERN_STRING = CR_CODE_PATTERN.source

type OpenApiSchema = Record<string, unknown>
type OpenApiObjectSchema = OpenApiSchema & {
  type: 'object'
  properties: Record<string, OpenApiSchema>
  required?: string[]
}

interface ZodLikeSchema {
  _def: {
    typeName: string
    innerType?: ZodLikeSchema
    schema?: ZodLikeSchema
    getter?: () => ZodLikeSchema
    type?: ZodLikeSchema
    shape?: (() => Record<string, ZodLikeSchema>) | Record<string, ZodLikeSchema>
    options?: ZodLikeSchema[]
    values?: readonly unknown[]
    checks?: Array<Record<string, unknown>>
    value?: unknown
  }
  isOptional?: () => boolean
}

const schemaRefs = new Map<ZodLikeSchema, string>([
  [CRStatusSchema as unknown as ZodLikeSchema, '#/components/schemas/CRStatus'],
  [CRTypeSchema as unknown as ZodLikeSchema, '#/components/schemas/CRType'],
  [CRPrioritySchema as unknown as ZodLikeSchema, '#/components/schemas/CRPriority'],
  [SubDocumentSchema as unknown as ZodLikeSchema, '#/components/schemas/SubDocument'],
])

function unwrapZodSchema(schema: ZodLikeSchema): { schema: ZodLikeSchema, nullable: boolean, optional: boolean } {
  let current = schema
  let nullable = false
  let optional = false

  while (true) {
    switch (current._def.typeName) {
      case 'ZodOptional':
        optional = true
        current = current._def.innerType!
        continue
      case 'ZodNullable':
        nullable = true
        current = current._def.innerType!
        continue
      case 'ZodDefault':
      case 'ZodCatch':
        optional = true
        current = current._def.innerType!
        continue
      case 'ZodEffects':
        current = current._def.schema!
        continue
      case 'ZodBranded':
      case 'ZodReadonly':
        current = current._def.innerType!
        continue
      default:
        return { schema: current, nullable, optional }
    }
  }
}

function getObjectShape(schema: ZodLikeSchema): Record<string, ZodLikeSchema> {
  const { shape } = schema._def
  if (!shape) {
    return {}
  }

  return typeof shape === 'function' ? shape() : shape
}

function applyOpenApiDocs(schema: OpenApiSchema, docs?: OpenApiSchema): OpenApiSchema {
  if (!docs) {
    return schema
  }

  if ('$ref' in docs) {
    return docs
  }

  return { ...schema, ...docs }
}

function stringSchemaFromChecks(schema: ZodLikeSchema): OpenApiSchema {
  const result: OpenApiSchema = { type: 'string' }
  const checks = Array.isArray(schema._def.checks) ? schema._def.checks : []

  for (const check of checks) {
    switch (check.kind) {
      case 'email':
        result.format = 'email'
        break
      case 'url':
        result.format = 'uri'
        break
      case 'uuid':
        result.format = 'uuid'
        break
      case 'regex':
        if (check.regex instanceof RegExp) {
          result.pattern = check.regex.source
        }
        break
      case 'min':
        if (typeof check.value === 'number') {
          result.minLength = check.value
        }
        break
      case 'max':
        if (typeof check.value === 'number') {
          result.maxLength = check.value
        }
        break
    }
  }

  return result
}

function numberSchemaFromChecks(schema: ZodLikeSchema): OpenApiSchema {
  const result: OpenApiSchema = { type: 'number' }
  const checks = Array.isArray(schema._def.checks) ? schema._def.checks : []

  for (const check of checks) {
    switch (check.kind) {
      case 'int':
        result.type = 'integer'
        break
      case 'min':
        if (typeof check.value === 'number') {
          result.minimum = check.value
        }
        break
      case 'max':
        if (typeof check.value === 'number') {
          result.maximum = check.value
        }
        break
    }
  }

  return result
}

function zodSchemaToOpenApi(schema: ZodLikeSchema, options: { ignoreRef?: boolean } = {}): OpenApiSchema {
  const unwrapped = unwrapZodSchema(schema)
  const ref = options.ignoreRef ? undefined : (schemaRefs.get(schema) ?? schemaRefs.get(unwrapped.schema))
  if (ref) {
    return { $ref: ref }
  }

  let result: OpenApiSchema

  switch (unwrapped.schema._def.typeName) {
    case 'ZodString':
      result = stringSchemaFromChecks(unwrapped.schema)
      break
    case 'ZodDate':
      result = { type: 'string', format: 'date-time' }
      break
    case 'ZodBoolean':
      result = { type: 'boolean' }
      break
    case 'ZodNumber':
      result = numberSchemaFromChecks(unwrapped.schema)
      break
    case 'ZodArray':
      result = {
        type: 'array',
        items: zodSchemaToOpenApi(unwrapped.schema._def.type!),
      }
      break
    case 'ZodEnum':
      result = {
        type: 'string',
        enum: Array.isArray(unwrapped.schema._def.values) ? [...unwrapped.schema._def.values] : [],
      }
      break
    case 'ZodLiteral': {
      const value = unwrapped.schema._def.value
      result = {
        type: typeof value,
        enum: [value],
      }
      break
    }
    case 'ZodUnion':
      result = {
        oneOf: (unwrapped.schema._def.options ?? []).map(option => zodSchemaToOpenApi(option)),
      }
      break
    case 'ZodLazy': {
      const lazyTarget = unwrapped.schema._def.getter!()
      const lazyRef = schemaRefs.get(lazyTarget)
      result = lazyRef ? { $ref: lazyRef } : zodSchemaToOpenApi(lazyTarget)
      break
    }
    case 'ZodObject':
      result = zodObjectToOpenApi(unwrapped.schema)
      break
    default:
      result = {}
      break
  }

  if (unwrapped.nullable && !('$ref' in result)) {
    return { ...result, nullable: true }
  }

  return result
}

function resolveObjectSchema(schema: ZodLikeSchema): ZodLikeSchema {
  let current = unwrapZodSchema(schema).schema

  while (current._def.typeName === 'ZodLazy') {
    current = current._def.getter!()
  }

  return current
}

function zodObjectToOpenApi(
  schema: ZodLikeSchema,
  propertyDocs: Record<string, OpenApiSchema> = {},
): OpenApiObjectSchema {
  const objectSchema = resolveObjectSchema(schema)
  const shape = getObjectShape(objectSchema)
  const properties: Record<string, OpenApiSchema> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shape)) {
    properties[key] = applyOpenApiDocs(zodSchemaToOpenApi(value), propertyDocs[key])
    const isOptional = value.isOptional?.() ?? unwrapZodSchema(value).optional
    if (!isOptional) {
      required.push(key)
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }
}

const ticketPropertyDocs: Record<string, OpenApiSchema> = {
  code: { description: 'Unique CR identifier', example: 'MDT-001', pattern: CR_CODE_PATTERN_STRING },
  title: { description: 'CR title', example: 'Implement user authentication' },
  status: { $ref: '#/components/schemas/CRStatus' },
  type: { $ref: '#/components/schemas/CRType' },
  priority: { $ref: '#/components/schemas/CRPriority' },
  content: { description: 'Full markdown content of the CR' },
  filePath: { description: 'Absolute path to the CR markdown file' },
  dateCreated: { description: 'File creation date' },
  lastModified: { description: 'File last modified date' },
  phaseEpic: { description: 'Phase or epic this CR belongs to', example: 'Phase 1' },
  description: { description: 'Short CR description' },
  rationale: { description: 'Rationale for the CR' },
  dependsOn: { description: 'CR codes this depends on', example: ['MDT-001', 'MDT-002'] },
  blocks: { description: 'CR codes blocked by this', example: ['MDT-010'] },
  assignee: { description: 'Person assigned to implement this CR', example: 'john.doe@example.com' },
  relatedTickets: { description: 'Related CR codes', example: ['MDT-003'] },
  impactAreas: { description: 'System areas impacted', example: ['backend', 'api'] },
  implementationDate: { description: 'Date implementation completed (ISO 8601)', format: 'date', example: '2025-09-20' },
  implementationNotes: { description: 'Notes about the implementation' },
  inWorktree: { description: 'Whether this CR is being read from a worktree' },
  worktreePath: { description: 'Resolved worktree path when the CR is in a worktree' },
  subdocuments: { description: 'Ticket-owned sub-documents' },
}

const ticketInputPropertyDocs: Record<string, OpenApiSchema> = {
  title: { description: 'CR title', example: 'Implement user authentication' },
  type: { $ref: '#/components/schemas/CRType' },
  priority: { $ref: '#/components/schemas/CRPriority' },
  content: { description: 'Full markdown content (template auto-generated if omitted)' },
  phaseEpic: { description: 'Phase or epic this CR belongs to', example: 'Phase 1' },
  description: { description: 'Short CR description' },
  rationale: { description: 'Rationale for the CR' },
  dependsOn: { description: 'CR dependencies' },
  blocks: { description: 'CRs blocked by this ticket' },
  assignee: { description: 'Person assigned to implement this CR', example: 'john.doe@example.com' },
  relatedTickets: { description: 'Related CR codes' },
  impactAreas: { description: 'System areas impacted', example: ['backend', 'api'] },
}

const ticketUpdatePropertyDocs: Record<string, OpenApiSchema> = {
  priority: { $ref: '#/components/schemas/CRPriority' },
  phaseEpic: { description: 'Phase or epic this CR belongs to', example: 'Phase 1' },
  relatedTickets: { description: 'Related CR codes' },
  dependsOn: { description: 'CR dependencies' },
  blocks: { description: 'CRs blocked by this ticket' },
  assignee: { description: 'Person assigned to implement this CR', example: 'john.doe@example.com' },
  implementationDate: { description: 'Date implementation completed (ISO 8601)', format: 'date', example: '2025-09-20' },
  implementationNotes: { description: 'Notes about the implementation' },
}

const subDocumentPropertyDocs: Record<string, OpenApiSchema> = {
  name: { description: 'Sub-document identifier (name without extension)', example: 'requirements' },
  kind: { description: 'Entry kind' },
  children: { description: 'Nested entries (populated for folders)' },
  isVirtual: { description: 'Whether the folder is virtual and derived from namespaced files' },
  filePath: { description: 'Relative path to the represented markdown file' },
}

const projectPropertyDocs: Record<string, OpenApiSchema> = {
  id: { description: 'Project identifier', example: 'markdown-ticket' },
  project: { description: 'Normalized runtime project fields' },
  metadata: { description: 'Project registry metadata' },
  tickets: { description: 'Ticket-related project settings' },
  document: { description: 'Project-level document discovery settings' },
  autoDiscovered: { description: 'Whether the project was found by auto-discovery', example: false },
  configPath: { description: 'Path to the local project config file, if available' },
  registryFile: { description: 'Path to the global registry file, if registered' },
}

const localProjectConfigPropertyDocs: Record<string, OpenApiSchema> = {
  project: { description: 'Local project configuration stored in `.mdt-config.toml`' },
  worktree: { description: 'Optional worktree settings for the project' },
}

const ticketSchema = zodObjectToOpenApi(TicketSchema as unknown as ZodLikeSchema, ticketPropertyDocs)
const ticketInputSchema = zodObjectToOpenApi(CreateTicketInputSchema as unknown as ZodLikeSchema, ticketInputPropertyDocs)
const ticketUpdateSchema = zodObjectToOpenApi(UpdateTicketInputSchema as unknown as ZodLikeSchema, ticketUpdatePropertyDocs)
const subDocumentSchema = zodObjectToOpenApi(SubDocumentSchema as unknown as ZodLikeSchema, subDocumentPropertyDocs)
const projectSchema = zodObjectToOpenApi(ProjectSchema as unknown as ZodLikeSchema, projectPropertyDocs)
const localProjectConfigSchema = zodObjectToOpenApi(LocalProjectConfigSchema as unknown as ZodLikeSchema, localProjectConfigPropertyDocs)

export const crPatchProperties = TICKET_UPDATE_ATTRS.reduce<Record<string, unknown>>(
  (properties: Record<string, unknown>, field: keyof TicketUpdateAttrs) => {
    const fieldName = field as string
    properties[fieldName] = ticketUpdateSchema.properties[fieldName]
    return properties
  },
  {},
)

export const schemas = {
  CRStatus: {
    ...zodSchemaToOpenApi(CRStatusSchema as unknown as ZodLikeSchema, { ignoreRef: true }),
    description: 'Change Request status',
    example: 'Proposed',
  },
  CRType: {
    ...zodSchemaToOpenApi(CRTypeSchema as unknown as ZodLikeSchema, { ignoreRef: true }),
    description: 'Change Request type',
    example: 'Feature Enhancement',
  },
  CRPriority: {
    ...zodSchemaToOpenApi(CRPrioritySchema as unknown as ZodLikeSchema, { ignoreRef: true }),
    description: 'Change Request priority level',
    example: 'Medium',
  },

  CR: ticketSchema,

  CRInput: ticketInputSchema,

  Project: projectSchema,

  Document: {
    type: 'object',
    required: ['path', 'name'],
    properties: {
      path: { type: 'string', description: 'Relative path from project root', example: 'docs/architecture.md' },
      name: { type: 'string', description: 'Document filename', example: 'architecture.md' },
      content: { type: 'string', description: 'Document content (when requested)' },
    },
  },

  SubDocument: subDocumentSchema,

  SubDocumentDetail: {
    type: 'object',
    required: ['code', 'content', 'dateCreated', 'lastModified'],
    properties: {
      code: { type: 'string', description: 'Sub-document identifier (name without extension)', example: 'requirements' },
      content: { type: 'string', description: 'Markdown content' },
      dateCreated: { type: 'string', format: 'date-time', nullable: true, description: 'File creation date' },
      lastModified: { type: 'string', format: 'date-time', nullable: true, description: 'File last modified date' },
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
    description: 'Project plus local configuration from `.mdt-config.toml`',
    required: ['project', 'config'],
    properties: {
      project: applyOpenApiDocs(projectSchema, { description: 'Normalized runtime project' }),
      config: applyOpenApiDocs(localProjectConfigSchema, { description: 'Project-local configuration file' }),
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
    schema: { type: 'string', pattern: CR_CODE_PATTERN_STRING },
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
