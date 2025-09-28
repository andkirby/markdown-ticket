/**
 * Shared Core Module
 * Main exports for Frontend, Backend, and MCP systems
 */

// Models
export * from './models/Ticket';
export * from './models/Project';
export * from './models/Config';
export * from './models/Counter';

// Types
export type {
  CRStatus,
  CRType, 
  CRPriority,
  CR,
  CRFilters,
  CRData,
  ProjectInfo,
  Template,
  TemplateSection,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Suggestion
} from './models/Types';

// Services
export * from './services/ProjectService';
export * from './services/MarkdownService';
export * from './services/TemplateService';
export * from './services/CRService';
export * from './services/CounterService';

// Constants
export * from './utils/constants';
