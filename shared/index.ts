/**
 * Shared Core Module
 * Main exports for Frontend, Backend, and MCP systems
 */

export * from './models/Config.js'
export * from './models/Project.js'
// Models
export * from './models/Ticket.js'

// Types
export type {
  CRPriority,
  CRStatus,
  CRType,
  ProjectInfo,
  Suggestion,
  Template,
  TemplateSection,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from './models/Types.js'

export * from './services/CRService.js'
export * from './services/MarkdownService.js'
export type { GlobalConfig } from './services/project/types.js'
// Services
export * from './services/ProjectService.js'
export * from './services/TemplateService.js'

// Tools
export * from './tools/ProjectManager.js'

// Constants
export * from './utils/constants.js'
