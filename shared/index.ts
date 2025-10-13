/**
 * Shared Core Module
 * Main exports for Frontend, Backend, and MCP systems
 */

// Models
export * from './models/Ticket.js';
export * from './models/Project.js';
export * from './models/Config.js';
export * from './models/Counter.js';

// Types
export type {
  CRStatus,
  CRType,
  CRPriority,
  ProjectInfo,
  Template,
  TemplateSection,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Suggestion
} from './models/Types.js';

// Services
export * from './services/ProjectService.js';
export * from './services/MarkdownService.js';
export * from './services/TemplateService.js';
export * from './services/CRService.js';
export * from './services/CounterService.js';

// Constants
export * from './utils/constants.js';
