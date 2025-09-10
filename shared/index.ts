/**
 * Shared Core Module
 * Main exports for Frontend, Backend, and MCP systems
 */

// Models
export * from './models/Ticket';
export * from './models/Project';

// Services
export * from './services/ProjectService';
export * from './services/MarkdownService';

// Constants and Types
export * from './utils/constants';

// Re-export legacy names for backward compatibility
export { Ticket as TicketDTO } from './models/Ticket';
